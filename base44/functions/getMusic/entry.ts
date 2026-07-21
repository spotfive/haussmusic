import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        // CORS headers para permitir requisições de qualquer origem
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json',
        };

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        const type = url.searchParams.get('type') || 'all'; // 'songs', 'releases', 'all'
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search') || '';
        const genre = url.searchParams.get('genre') || '';
        const artist = url.searchParams.get('artist') || '';

        let response = {};

        // Buscar músicas
        if (type === 'songs' || type === 'all') {
            let songs = await base44.asServiceRole.entities.Song.list('-created_date', limit * 2);
            
            // Filtros
            if (search) {
                const searchLower = search.toLowerCase();
                songs = songs.filter(s => 
                    s.title?.toLowerCase().includes(searchLower) ||
                    s.artist?.toLowerCase().includes(searchLower) ||
                    s.album?.toLowerCase().includes(searchLower)
                );
            }
            if (genre) {
                songs = songs.filter(s => s.genre === genre);
            }
            if (artist) {
                const artistLower = artist.toLowerCase();
                songs = songs.filter(s => s.artist?.toLowerCase().includes(artistLower));
            }

            response.songs = songs.slice(0, limit).map(s => ({
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
                plays: s.plays || 0,
                rating: s.rating || 0,
                rating_count: s.rating_count || 0,
                created_date: s.created_date,
            }));
        }

        // Buscar lançamentos (álbuns/EPs)
        if (type === 'releases' || type === 'all') {
            let releases = await base44.asServiceRole.entities.Post.list('-created_date', limit * 2);
            releases = releases.filter(r => r.status === 'published');
            
            const now = new Date();
            releases = releases.filter(r => !r.premiere_datetime || new Date(r.premiere_datetime) <= now);

            // Filtros
            if (search) {
                const searchLower = search.toLowerCase();
                releases = releases.filter(r => 
                    r.title?.toLowerCase().includes(searchLower) ||
                    r.artist?.toLowerCase().includes(searchLower)
                );
            }
            if (genre) {
                releases = releases.filter(r => r.genre === genre);
            }
            if (artist) {
                const artistLower = artist.toLowerCase();
                releases = releases.filter(r => r.artist?.toLowerCase().includes(artistLower));
            }

            response.releases = releases.slice(0, limit).map(r => ({
                id: r.id,
                title: r.title,
                artist: r.artist,
                featuring: r.featuring,
                description: r.description,
                cover_url: r.cover_url,
                type: r.type,
                genre: r.genre,
                release_date: r.release_date,
                likes: r.likes || 0,
                plays: r.plays || 0,
                rating: r.rating || 0,
                rating_count: r.rating_count || 0,
                tracks: r.tracks || [],
                created_date: r.created_date,
            }));
        }

        // Adicionar metadados
        response.metadata = {
            type,
            limit,
            filters: {
                search: search || null,
                genre: genre || null,
                artist: artist || null,
            },
            timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response, null, 2), {
            status: 200,
            headers: corsHeaders,
        });

    } catch (error) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        };
        
        return new Response(JSON.stringify({ 
            error: error.message,
            timestamp: new Date().toISOString(),
        }), { 
            status: 500,
            headers: corsHeaders,
        });
    }
});