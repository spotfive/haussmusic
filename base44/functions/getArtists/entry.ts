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
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search') || '';
        const verified = url.searchParams.get('verified') === 'true';

        // Buscar artistas
        let artists = await base44.asServiceRole.entities.User.list();
        
        // Filtrar apenas artistas
        artists = artists.filter(u => u.user_type === 'artista' || u.user_type === 'staff');

        // Filtros
        if (search) {
            const searchLower = search.toLowerCase();
            artists = artists.filter(a => 
                (a.display_name || a.full_name || '').toLowerCase().includes(searchLower)
            );
        }

        if (verified) {
            artists = artists.filter(a => a.verified === true);
        }

        // Buscar seguidores de cada artista
        const follows = await base44.asServiceRole.entities.Follow.list();

        const response = {
            artists: artists.slice(0, limit).map(a => {
                const followerCount = follows.filter(f => f.following_id === a.id).length;
                return {
                    id: a.id,
                    name: a.display_name || a.full_name,
                    profile_picture: a.profile_picture,
                    bio: a.bio,
                    verified: a.verified || false,
                    user_type: a.user_type,
                    followers: followerCount,
                    created_date: a.created_date,
                };
            }),
            metadata: {
                limit,
                filters: {
                    search: search || null,
                    verified: verified || null,
                },
                timestamp: new Date().toISOString(),
            }
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