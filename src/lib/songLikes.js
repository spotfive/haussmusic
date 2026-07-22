import { base44 } from '@/api/base44Client';

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
