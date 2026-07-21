import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Decodes (without verifying) the payload of a Google Identity Services ID token (JWT).
// Safe here because there is no server: the decoded claims are only used to
// look up/create the matching local user, never as a trust boundary.
// "Background video" fields also accept animated GIFs (image, not video).
// Data-URL uploads carry their real mime type; fall back to the extension
// for plain URLs.
export function isImageBackground(url) {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('data:video/')) return false;
  return /\.(gif|png|jpe?g|webp)(\?|#|$)/i.test(url);
}

// user_type now holds an array of cargos (a person can be e.g. both
// "artista" and "gravadora"), but stays backward-compatible with older
// records that still have a single string value.
export function hasUserType(user, type) {
  const value = user?.user_type;
  if (Array.isArray(value)) return value.includes(type);
  return value === type;
}

export function userTypeList(user) {
  const value = user?.user_type;
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function withUserType(user, type) {
  const current = userTypeList(user);
  return current.includes(type) ? current : [...current, type];
}

export function withoutUserType(user, type) {
  const current = userTypeList(user);
  const next = current.filter((t) => t !== type);
  return next.length > 0 ? next : ['ouvinte'];
}

export function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  return JSON.parse(json);
}
