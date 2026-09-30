// Rutas con el prefijo de publicación (p. ej. /iecross en GitHub Pages). <Link> lo añade solo;
// esto es para <img>, location y history.
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const withBase = (path: string) => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
