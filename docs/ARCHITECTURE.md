# Arquitectura — Catálogo de productos (frontend)

SPA Angular 22 que consume la API del Ejercicio 1. Dos restricciones mandan sobre el
resto: **el contrato real del backend** (no el supuesto del enunciado) y **el JWT
obligatorio**, que el enunciado no menciona.

## Decisiones

| Decisión | Por qué |
|---|---|
| Screaming architecture por feature (`products/`, `auth/`) | La estructura dice qué hace el sistema, no con qué framework. El cambio de contrato se absorbe en una sola capa. |
| Capas `domain · application · infrastructure · presentation` | `domain` es TypeScript puro y se testea sin Angular; `presentation` no conoce HTTP. |
| La regla de capas la ejecuta ESLint | Una convención que no rompe el build se erosiona. Si `domain` importa Angular, falla el lint. |
| La URL es la fuente de verdad de la paginación | `?page=&size=` es compartible y sobrevive al refresh. Una sola dirección (URL → store) evita el eco del router. |
| `size` en dominio, `limit` en la frontera | El dominio habla el vocabulario de la UI; la API queda aislada en `infrastructure`. |
| Un interceptor normaliza el error a `AppError` | La UI no adivina el sobre del backend y el mensaje técnico nunca se renderiza. |
| Store por feature provisto en la ruta | El estado muere al salir de `products`: sin fugas entre visitas. |
| Primitivas propias sobre `@spartan-ng/brain` y CDK | Modelo shadcn: el código es nuestro; brain y CDK aportan overlay, foco y teclado. |
| `three.js` solo en el hero del login | Coste declarado (~116 kB gzip) y aislado en la ruta lazy, con fallback sin WebGL. |
| `auth` como feature propia | El backend exige `Bearer` en todo `/products`; sin sesión no hay producto que evaluar. |

## Estructura

```text
src/app/
├── products/
│   ├── domain/           # Product, ProductDraft, reglas, Page<T>, puerto del repositorio
│   ├── application/      # ProductsStore (NgRx Signals)
│   ├── infrastructure/   # DTOs, mapper del contrato, adaptador HTTP
│   └── presentation/     # páginas smart, componentes dumb, mapper de formulario
├── auth/                 # misma división: sesión, adaptadores, login
├── core/                 # transversal sin dominio: AppError, base URL, interceptor, notifier
└── shared/ui/            # primitivas agnósticas: button, field, table, dialog, pagination, toast
```

```text
presentation → application → domain ← infrastructure
```

`domain` no importa Angular, NgRx, RxJS ni UI. `presentation` consume el store, nunca
el repositorio ni `HttpClient`. `core` es la única dependencia transversal que
`application` puede usar (es un tipo, no una capa de negocio).

## Contrato consumido

Base `/api/v1`, JSON, `Bearer` en `Authorization`. El enunciado (§12) dejaba supuestos
abiertos; manda el backend:

| El enunciado asumía | La API real | Dónde se absorbe |
|---|---|---|
| `GET /products?page=&size=` | `page` + **`limit`** | `product.mapper.toListQuery` |
| `PUT` / `PATCH` | **solo `PATCH`** parcial | `HttpProductRepository.update` |
| `/products` | prefijo `/api/v1` | `API_BASE_URL` |
| Sin autenticación | **JWT obligatorio** | feature `auth` + interceptor |

| Acción | Método y ruta | Respuesta |
|---|---|---|
| Listar | `GET /products?page&limit` | `{ data: Product[], meta: { page, limit, total, totalPages } }` |
| Detalle | `GET /products/:id` | `Product` |
| Crear | `POST /products` | `201 Product` |
| Editar | `PATCH /products/:id` | `200 Product` |
| Eliminar | `DELETE /products/:id` | `204` (borrado lógico) |
| Sesión | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` | usuario · `{ accessToken, tokenType, expiresIn }` · usuario |

El mapper también cubre dos bordes del contrato: `description` y `category` se
**omiten** cuando están vacíos (la API es estricta y no acepta `null`), y
`totalPages: 0` del catálogo vacío se normaliza a 1.

## Estado

```ts
{ items, page, pageSize, total, status: 'idle' | 'loading' | 'saving' | 'error', error }
```

Computed: `totalPages`, `isEmpty`, `isLoading`, `isSaving`, `hasError`. Extensión
documentada: `selected` + `loadOne()` para la página de edición, de modo que
`presentation` no toque el repositorio.

- La página y el tamaño viven en la URL; la tabla navega y el store solo reacciona.
- Tras crear, editar o eliminar se recarga la página actual. Si el borrado la deja
  fuera de rango, se salta a la última página real en un solo paso.
- `normalizePageSize` solo acepta 10/20/50: un `?size=37` dejaría al selector sin
  opción y mostraría un valor distinto al que devuelve la API.

## Errores

```text
HttpErrorResponse → errorInterceptor → AppError → store → UI
```

| Origen | Lo que ve la persona |
|---|---|
| status `0` | "No hay conexión. Revisa tu internet e intenta de nuevo." + **Reintentar** |
| `400` / `422` | El mensaje junto a cada campo del formulario |
| `404` | "El producto ya no existe." |
| `409` | "Ya existe un producto con esos datos." |
| `401` | Cierra sesión y redirige a `/login` |
| `5xx` | "Algo salió mal de nuestro lado. Intenta más tarde." |

El interceptor **convierte y relanza**: si silenciara, el store no sabría que falló.
`AppError` conserva `status` para no perder información al traducir. El orden importa:
`authToken → sessionExpiry → error`; al volver, el error se normaliza primero y el de
sesión ya recibe un `AppError`. Un `401` de `/auth/*` son credenciales, no sesión
expirada, y no cierra sesión.

Tres contextos, tres tratamientos: error de carga → estado vacío con *Reintentar*;
error de acción → toast; validación → campo.

## UI

- **Desktop**: tabla con cabecera sticky dentro de su propia área de scroll y alto
  fijo, así cambiar de página no mueve la paginación.
- **Móvil**: cada fila es una tarjeta y la paginación se compacta a
  anterior/siguiente + indicador.
- **Acciones**: menú de tres puntos por fila (`@angular/cdk/menu`) con *Editar* y
  *Eliminar*; el borrado siempre pasa por un diálogo de confirmación.
- **Carga**: skeleton solo en la primera carga; al recargar se atenúa el contenido
  anterior para no descuadrar la página.
- **Accesibilidad**: `aria-label` en acciones de icono, foco atrapado y restaurado en
  el diálogo, menú operable por teclado, contraste AA y `prefers-reduced-motion`.

## Testing

Cuatro archivos, elegidos por riesgo:

| Archivo | Qué protege |
|---|---|
| `domain/product-rules.spec.ts` | SKU, precio (2 decimales), stock, opcionales y normalización |
| `infrastructure/product.mapper.spec.ts` | Contrato: `size`→`limit`, `meta`, opcionales omitidos |
| `application/products.store.spec.ts` | Paginación, recarga tras mutaciones, retroceso, errores |
| `core/http/app-error.spec.ts` | Mapeo status → mensaje y errores de campo |

El store se prueba con un repositorio falso: sin `HttpClient` ni red. **No** se
prueban plantillas, componentes sin lógica, getters triviales ni wrappers. El
repositorio HTTP y el wiring se verifican a mano en el navegador contra la API real
(login, CRUD, 404, sin conexión, móvil).

## Límites conocidos

| Límite | Disparador para resolverlo |
|---|---|
| La UI no expone búsqueda, filtros ni orden (la API los soporta) | Cuando el catálogo crezca y la paginación no alcance |
| Paginación por offset, heredada de la API | Volumen o páginas profundas → keyset en el backend |
| Token en `localStorage` | Si se exige mitigar XSS → cookie `httpOnly` (cambio en ambos lados) |
| `three.js` (~116 kB gzip) en `/login` | Si el peso importa: retirar la escena y quedarse el degradado |
| Sin e2e ni CI | Antes de publicar |
| Sin SSR | Si se necesita SEO o mejorar el arranque en frío |
