/**
 * Proxy del dev server: evita CORS y deja la `apiBaseUrl` relativa (`/api/v1`).
 *
 * El backend corre en 3000 con `bun run start`; Docker solo levanta MongoDB.
 * Para apuntar a otro destino sin tocar código:
 *
 *   API_TARGET=http://localhost:3001 bun run start
 */
const target = process.env['API_TARGET'] ?? 'http://localhost:3000';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
};
