import React, { useEffect, useRef, useState } from 'react';
import { decodeJwtPayload } from '@/lib/utils';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptLoadingPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o script do Google'));
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

export default function GoogleSignInButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            try {
              const profile = decodeJwtPayload(response.credential);
              onSuccess({
                sub: profile.sub,
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
              });
            } catch (err) {
              onError?.(err);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 336,
        });
        setStatus('ready');
      })
      .catch((err) => {
        setStatus('error');
        onError?.(err);
      });

    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError]);

  if (!CLIENT_ID) {
    return (
      <div className="w-full rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-zinc-500">
        Login com Google não configurado. Defina VITE_GOOGLE_CLIENT_ID (veja .env.example).
      </div>
    );
  }

  return (
    <div>
      <div ref={buttonRef} className="flex justify-center" />
      {status === 'error' && (
        <p className="mt-2 text-center text-xs text-red-400">
          Não foi possível carregar o login do Google. Verifique sua conexão.
        </p>
      )}
    </div>
  );
}
