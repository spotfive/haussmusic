Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/javascript',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const appUrl = url.origin;

    const widgetCode = `
(function() {
    const AtlantixWidget = {
        config: {
            apiUrl: '${appUrl}/api/functions/getMusic',
            limit: 10,
            type: 'songs', // 'songs', 'releases', 'all'
            autoplay: false,
            theme: 'dark' // 'dark' or 'light'
        },

        init: function(containerId, options = {}) {
            this.config = { ...this.config, ...options };
            this.container = document.getElementById(containerId);
            
            if (!this.container) {
                console.error('Atlantix Widget: Container not found');
                return;
            }

            this.container.setAttribute('data-atlantix-widget', 'true');
            this.loadMusic();
        },

        async loadMusic() {
            try {
                const params = new URLSearchParams({
                    type: this.config.type,
                    limit: this.config.limit
                });

                if (this.config.search) params.append('search', this.config.search);
                if (this.config.genre) params.append('genre', this.config.genre);
                if (this.config.artist) params.append('artist', this.config.artist);

                const response = await fetch(this.config.apiUrl + '?' + params.toString());
                const data = await response.json();
                
                this.render(data);
            } catch (error) {
                console.error('Atlantix Widget Error:', error);
                this.container.innerHTML = '<p style="color: red;">Erro ao carregar músicas do Atlantix</p>';
            }
        },

        render(data) {
            const isDark = this.config.theme === 'dark';
            const bgColor = isDark ? '#18181b' : '#ffffff';
            const textColor = isDark ? '#ffffff' : '#000000';
            const secondaryColor = isDark ? '#71717a' : '#52525b';
            const hoverColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

            let html = \`
                <div style="
                    background: \${bgColor};
                    border-radius: 16px;
                    padding: 20px;
                    font-family: system-ui, -apple-system, sans-serif;
                    color: \${textColor};
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 20px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    ">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: linear-gradient(135deg, #8b5cf6, #d946ef);
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                        ">🎵</div>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: bold;">
                                Do Atlantix
                            </h3>
                            <p style="margin: 0; font-size: 12px; color: \${secondaryColor};">
                                Plataforma de música
                            </p>
                        </div>
                    </div>
                    <div id="atlantix-music-list"></div>
                    <div style="
                        margin-top: 16px;
                        padding-top: 16px;
                        border-top: 1px solid rgba(255,255,255,0.1);
                        text-align: center;
                    ">
                        <a href="${appUrl}" target="_blank" style="
                            color: #8b5cf6;
                            text-decoration: none;
                            font-size: 13px;
                            font-weight: 500;
                        ">
                            Visitar Atlantix →
                        </a>
                    </div>
                </div>
            \`;

            this.container.innerHTML = html;
            const listContainer = this.container.querySelector('#atlantix-music-list');

            const items = data.songs || data.releases || [];
            
            items.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = \`
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                \`;
                
                itemDiv.onmouseover = () => itemDiv.style.background = hoverColor;
                itemDiv.onmouseout = () => itemDiv.style.background = 'transparent';

                itemDiv.innerHTML = \`
                    <img src="\${item.cover_url || ''}" 
                         alt="\${item.title}"
                         style="
                            width: 48px;
                            height: 48px;
                            border-radius: 6px;
                            object-fit: cover;
                            background: linear-gradient(135deg, #8b5cf6, #d946ef);
                         "
                         onerror="this.style.display='none'"
                    />
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-weight: 600;
                            font-size: 14px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        ">\${item.title}</div>
                        <div style="
                            font-size: 12px;
                            color: \${secondaryColor};
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        ">\${item.artist}\${item.featuring ? ' feat. ' + item.featuring : ''}</div>
                    </div>
                    \${item.audio_url ? \`
                        <button onclick="AtlantixWidget.playAudio('\${item.audio_url}', this)" style="
                            background: #8b5cf6;
                            border: none;
                            border-radius: 50%;
                            width: 36px;
                            height: 36px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                        ">▶️</button>
                    \` : ''}
                \`;

                listContainer.appendChild(itemDiv);
            });

            if (items.length === 0) {
                listContainer.innerHTML = '<p style="text-align: center; color: ' + secondaryColor + ';">Nenhuma música encontrada</p>';
            }
        },

        currentAudio: null,
        playAudio(url, button) {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            this.currentAudio = new Audio(url);
            this.currentAudio.play();
            button.innerHTML = '⏸️';

            this.currentAudio.onended = () => {
                button.innerHTML = '▶️';
            };
        }
    };

    window.AtlantixWidget = AtlantixWidget;
})();
`;

    return new Response(widgetCode, {
        status: 200,
        headers: corsHeaders,
    });
});