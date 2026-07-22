import { base44 } from '@/api/base44Client';

// Toggling a song's heart flips the shared is_favorite flag (used for
// fill state and the Library "favorite songs" list) and, when a user is
// signed in, also records/removes a per-user like via UserFavorite while
// bumping the song's own likes counter. is_favorite alone can only ever
// be true/false — it can't rank songs by how many people liked them,
// which is what HAUSS HITS' Curtidas chart needs.
export async function toggleSongLike(song, userEmail) {
  const newFavoriteState = !song.is_favorite;
  const updates = { is_favorite: newFavoriteState };

  if (userEmail) {
    const mine = await base44.entities.UserFavorite.filter({ item_id: song.id, item_type: 'song', created_by: userEmail });
    const existing = mine[0];
    if (newFavoriteState && !existing) {
      await base44.entities.UserFavorite.create({ item_id: song.id, item_type: 'song' });
      updates.likes = (song.likes || 0) + 1;
    } else if (!newFavoriteState && existing) {
      await base44.entities.UserFavorite.delete(existing.id);
      updates.likes = Math.max((song.likes || 0) - 1, 0);
    }
  }

  await base44.entities.Song.update(song.id, updates);
  return newFavoriteState;
}
