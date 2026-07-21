import React from 'react';

// Lucide doesn't ship TikTok/Spotify marks, so these are small hand-rolled
// SVGs matching the same "w-4 h-4"-style usage as the rest of the icon set.
export function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82c-.94-.83-1.53-1.99-1.6-3.27h-3.14v13.44c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1 0-5.8c.27 0 .53.04.78.1V9.9a6.1 6.1 0 0 0-.78-.05A6.15 6.15 0 0 0 3 15.99 6.15 6.15 0 0 0 8.96 22a6.15 6.15 0 0 0 5.96-6.02V9.15a9.3 9.3 0 0 0 5.06 1.5V7.5c-1.24 0-2.4-.42-3.38-1.68Z" />
    </svg>
  );
}

export function SpotifyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.32-1.32 9.72-.66 13.44 1.62.36.18.54.78.3 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
    </svg>
  );
}
