// HAUSS MUSIC runs fully client-side: no connection to any external backend.
// `base44` here is a local, localStorage-backed stand-in with the same
// shape (auth / entities / functions / integrations) the app already used,
// so every page keeps working without a hosted server.
import { localBackend, seedDemoData } from './localBackend';

seedDemoData();

export const base44 = localBackend;
