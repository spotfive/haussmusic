import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const { action } = await req.json();
        const base44 = createClientFromRequest(req);

        // API pública - não requer autenticação
        if (action === 'getSongs') {
            const songs = await base44.asServiceRole.entities.Song.list('-created_date', 50);
            
            // Retorna dados públicos das músicas
            const publicSongs = songs.map(song => ({
                id: song.id,
                title: song.title,
                artist: song.artist,
                featuring: song.featuring,
                album: song.album,
                type: song.type,
                cover_url: song.cover_url,
                audio_url: song.audio_url,
                duration: song.duration,
                genre: song.genre,
                plays: song.plays,
                rating: song.rating,
                rating_count: song.rating_count,
                created_date: song.created_date
            }));

            return Response.json({
                success: true,
                data: publicSongs,
                count: publicSongs.length
            });
        }

        if (action === 'getReleases') {
            const posts = await base44.asServiceRole.entities.Post.list('-created_date', 50);
            const now = new Date();
            
            // Filtra apenas lançamentos publicados e disponíveis
            const availablePosts = posts.filter(p => 
                p.status === 'published' && 
                (!p.premiere_datetime || new Date(p.premiere_datetime) <= now)
            );

            const publicReleases = availablePosts.map(post => ({
                id: post.id,
                title: post.title,
                artist: post.artist,
                featuring: post.featuring,
                description: post.description,
                cover_url: post.cover_url,
                type: post.type,
                genre: post.genre,
                release_date: post.release_date,
                likes: post.likes,
                plays: post.plays,
                rating: post.rating,
                rating_count: post.rating_count,
                created_date: post.created_date
            }));

            return Response.json({
                success: true,
                data: publicReleases,
                count: publicReleases.length
            });
        }

        if (action === 'getSongById') {
            const { songId } = await req.json();
            if (!songId) {
                return Response.json({ success: false, error: 'songId is required' }, { status: 400 });
            }

            const songs = await base44.asServiceRole.entities.Song.list();
            const song = songs.find(s => s.id === songId);

            if (!song) {
                return Response.json({ success: false, error: 'Song not found' }, { status: 404 });
            }

            return Response.json({
                success: true,
                data: {
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    featuring: song.featuring,
                    album: song.album,
                    type: song.type,
                    cover_url: song.cover_url,
                    audio_url: song.audio_url,
                    duration: song.duration,
                    genre: song.genre,
                    plays: song.plays,
                    rating: song.rating,
                    rating_count: song.rating_count,
                    created_date: song.created_date
                }
            });
        }

        if (action === 'getReleaseById') {
            const { releaseId } = await req.json();
            if (!releaseId) {
                return Response.json({ success: false, error: 'releaseId is required' }, { status: 400 });
            }

            const posts = await base44.asServiceRole.entities.Post.list();
            const post = posts.find(p => p.id === releaseId);

            if (!post || post.status !== 'published') {
                return Response.json({ success: false, error: 'Release not found' }, { status: 404 });
            }

            // Busca as músicas do lançamento
            const songs = await base44.asServiceRole.entities.Song.list();
            const releaseSongs = songs.filter(s => s.album === post.title);

            return Response.json({
                success: true,
                data: {
                    id: post.id,
                    title: post.title,
                    artist: post.artist,
                    featuring: post.featuring,
                    description: post.description,
                    cover_url: post.cover_url,
                    type: post.type,
                    genre: post.genre,
                    release_date: post.release_date,
                    likes: post.likes,
                    plays: post.plays,
                    rating: post.rating,
                    rating_count: post.rating_count,
                    created_date: post.created_date,
                    tracks: releaseSongs.map(s => ({
                        id: s.id,
                        title: s.title,
                        duration: s.duration,
                        audio_url: s.audio_url
                    }))
                }
            });
        }

        if (action === 'search') {
            const { query, type } = await req.json();
            if (!query) {
                return Response.json({ success: false, error: 'query is required' }, { status: 400 });
            }

            const searchLower = query.toLowerCase();
            const results = { songs: [], releases: [] };

            if (!type || type === 'songs') {
                const songs = await base44.asServiceRole.entities.Song.list('-plays');
                results.songs = songs
                    .filter(s => 
                        s.title?.toLowerCase().includes(searchLower) ||
                        s.artist?.toLowerCase().includes(searchLower) ||
                        s.album?.toLowerCase().includes(searchLower)
                    )
                    .slice(0, 20)
                    .map(song => ({
                        id: song.id,
                        title: song.title,
                        artist: song.artist,
                        featuring: song.featuring,
                        album: song.album,
                        cover_url: song.cover_url,
                        audio_url: song.audio_url,
                        duration: song.duration,
                        genre: song.genre,
                        plays: song.plays
                    }));
            }

            if (!type || type === 'releases') {
                const posts = await base44.asServiceRole.entities.Post.list('-created_date');
                const now = new Date();
                results.releases = posts
                    .filter(p => 
                        p.status === 'published' &&
                        (!p.premiere_datetime || new Date(p.premiere_datetime) <= now) &&
                        (p.title?.toLowerCase().includes(searchLower) ||
                         p.artist?.toLowerCase().includes(searchLower))
                    )
                    .slice(0, 20)
                    .map(post => ({
                        id: post.id,
                        title: post.title,
                        artist: post.artist,
                        featuring: post.featuring,
                        cover_url: post.cover_url,
                        type: post.type,
                        genre: post.genre,
                        likes: post.likes
                    }));
            }

            return Response.json({
                success: true,
                data: results,
                count: results.songs.length + results.releases.length
            });
        }

        return Response.json({
            success: false,
            error: 'Invalid action. Available actions: getSongs, getReleases, getSongById, getReleaseById, search'
        }, { status: 400 });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});