import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Atlantix-API-Key',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // Validar API Key
        const apiKey = req.headers.get('X-Atlantix-API-Key');
        const validApiKey = Deno.env.get('ATLANTIX_API_KEY');
        
        if (!apiKey || apiKey !== validApiKey) {
            return Response.json({
                error: 'API Key inválida ou ausente',
                message: 'Inclua o header X-Atlantix-API-Key com sua chave'
            }, { status: 401, headers: corsHeaders });
        }

        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        const action = url.searchParams.get('action') || 'songs';
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search');
        const genre = url.searchParams.get('genre');
        const artist = url.searchParams.get('artist');

        let result = {};

        // Buscar músicas
        if (action === 'songs' || action === 'all') {
            const allSongs = await base44.asServiceRole.entities.Song.list('-plays');
            let songs = allSongs;

            if (search) {
                const searchLower = search.toLowerCase();
                songs = songs.filter(s => 
                    s.title?.toLowerCase().includes(searchLower) ||
                    s.artist?.toLowerCase().includes(searchLower) ||
                    s.album?.toLowerCase().includes(searchLower)
                );
            }
            if (genre) songs = songs.filter(s => s.genre === genre);
            if (artist) {
                const artistLower = artist.toLowerCase();
                songs = songs.filter(s => s.artist?.toLowerCase().includes(artistLower));
            }

            result.songs = songs.slice(0, limit).map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist,
                featuring: s.featuring,
                album: s.album,
                type: s.type,
                cover_url: s.cover_url,
                audio_url: s.audio_url,
                duration: s.duration,
                genre: s.genre,
                plays: s.plays,
                rating: s.rating,
                rating_count: s.rating_count
            }));
        }

        // Buscar lançamentos
        if (action === 'releases' || action === 'all') {
            const allPosts = await base44.asServiceRole.entities.Post.list('-created_date');
            let releases = allPosts.filter(p => 
                (p.status === 'published' || p.status === 'draft') &&
                (p.type === 'album' || p.type === 'ep') &&
                (!p.premiere_datetime || new Date(p.premiere_datetime) <= new Date())
            );

            if (search) {
                const searchLower = search.toLowerCase();
                releases = releases.filter(r =>
                    r.title?.toLowerCase().includes(searchLower) ||
                    r.artist?.toLowerCase().includes(searchLower)
                );
            }
            if (genre) releases = releases.filter(r => r.genre === genre);
            if (artist) {
                const artistLower = artist.toLowerCase();
                releases = releases.filter(r => r.artist?.toLowerCase().includes(artistLower));
            }

            result.releases = releases.slice(0, limit).map(r => ({
                id: r.id,
                title: r.title,
                artist: r.artist,
                featuring: r.featuring,
                type: r.type,
                cover_url: r.cover_url,
                genre: r.genre,
                release_date: r.release_date,
                likes: r.likes,
                plays: r.plays
            }));
        }

        return Response.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        }, { status: 200, headers: corsHeaders });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500, headers: corsHeaders });
    }
});