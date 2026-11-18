/**
 * Proxy del dev server: evita CORS y deja la `apiBaseUrl` relativa (`/api/v1`).
 *
 * El backend publica en 3001 cuando corre con `docker compose up` y en 3000
 * cuando corre con `bun run start`. El destino se elige sin tocar código:
 *
 *   API_TARGET=http://localhost:3000 bun run start
 */
const target = process.env['API_TARGET'] ?? 'http://localhost:3001';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
};
