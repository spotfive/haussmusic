import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Toggling a song's heart is decided by whether THIS user already has a
// UserFavorite row for it — not by the shared is_favorite flag, which is
// only a global "liked by someone" flag and can drift out of sync with
// any one user's own action (e.g. it can be true from someone else's like,
// or from legacy data with no favorite row backing it at all). Deciding
// off is_favorite meant an unlike could silently no-op — nothing to find
// and delete — and a later like would then double-count on top of a
// count that was never actually decremented. likes is re-read from the
// server right before adjusting it so the +1/-1 lands on the current
// value instead of whatever was in scope when the button was clicked.
export async function toggleSongLike(song, userEmail) {
  if (!userEmail) {
    const newFavoriteState = !song.is_favorite;
    await base44.entities.Song.update(song.id, { is_favorite: newFavoriteState });
    return newFavoriteState;
  }

  const mine = await base44.entities.UserFavorite.filter({ item_id: song.id, item_type: 'song', created_by: userEmail });
  const existing = mine[0];
  const fresh = await base44.entities.Song.get(song.id);
  const currentLikes = fresh?.likes || 0;

  if (existing) {
    await base44.entities.UserFavorite.delete(existing.id);
    const likes = Math.max(currentLikes - 1, 0);
    await base44.entities.Song.update(song.id, { is_favorite: likes > 0, likes });
    return false;
  }

  await base44.entities.UserFavorite.create({ item_id: song.id, item_type: 'song' });
  const likes = currentLikes + 1;
  await base44.entities.Song.update(song.id, { is_favorite: true, likes });
  return true;
}

// Whether a heart shows filled must track the CURRENT user's own favorite
// row, never the global is_favorite flag — otherwise a song still liked by
// someone else reads as "liked by me", an unlike leaves the heart filled,
// and the next click creates a second favorite row and double-counts. This
// hook is the single source of that per-user state: every page drives its
// hearts (and its "Curtidas" lists) off `likedSongIds` and calls `toggle`,
// which flips the UI optimistically before the server round-trips.
export function useSongLikes(userEmail) {
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['user-favorites', userEmail],
    queryFn: async () => {
      const all = await base44.entities.UserFavorite.list();
      return all.filter(f => f.created_by === userEmail);
    },
    enabled: !!userEmail,
    refetchInterval: 3000,
  });

  const likedSongIds = new Set(
    favorites.filter(f => f.item_type === 'song').map(f => f.item_id)
  );

  // Anonymous users have no favorite rows, so fall back to the global flag
  // for them — it's the only signal available without a logged-in identity.
  const isLiked = (song) => userEmail ? likedSongIds.has(song.id) : !!song?.is_favorite;

  const toggle = (song) => {
    if (!userEmail) {
      queryClient.setQueryData(['songs'], old =>
        old?.map(s => s.id === song.id ? { ...s, is_favorite: !s.is_favorite } : s));
      toggleSongLike(song, userEmail).catch(() => {
        queryClient.invalidateQueries({ queryKey: ['songs'] });
      });
      return;
    }

    const key = ['user-favorites', userEmail];
    const currentlyLiked = likedSongIds.has(song.id);

    // Flip the heart and the visible like count immediately; the 3s poll and
    // the real mutation below reconcile these back to server truth.
    queryClient.setQueryData(key, (old = []) =>
      currentlyLiked
        ? old.filter(f => !(f.item_id === song.id && f.item_type === 'song'))
        : [...old, { id: `optimistic-${song.id}`, item_id: song.id, item_type: 'song', created_by: userEmail }]
    );
    queryClient.setQueryData(['songs'], old =>
      old?.map(s => s.id === song.id
        ? { ...s, likes: Math.max((s.likes || 0) + (currentlyLiked ? -1 : 1), 0) }
        : s));

    toggleSongLike(song, userEmail).catch(() => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    });
  };

  return { favorites, likedSongIds, isLiked, toggle };
}
