# Catálogo de productos — Frontend

SPA Angular 22 que gestiona el catálogo de la API de CROPER (Ejercicio 1):
listar con paginación, crear, editar y eliminar productos.

El diseño de referencia está en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
Las decisiones de implementación y el plan por tareas están en
[`odd/tasks/products-frontend.md`](./odd/tasks/products-frontend.md).

## Stack

- **Angular 22** standalone, zoneless, signals, control flow `@if`/`@for`
- **TypeScript** `strict` + `noImplicitOverride` + `exactOptionalPropertyTypes`
- **NgRx Signals Store** (`@ngrx/signals`) para el estado de cada feature
- **HttpClient** con interceptores funcionales (`authToken`, `sessionExpiry`, `error`)
- **Reactive Forms** tipados
- **Tailwind CSS 4** + primitivas propias estilo shadcn/helm sobre Angular CDK y `@spartan-ng/brain`
- **ng-icon** (Lucide) y toaster de spartan (sonner)
- **three.js** solo en el hero del login (escena decorativa, carga diferida)
- **Vitest** para tests, **ESLint** (angular-eslint) + **Prettier**

Bun se usa solo como gestor de paquetes y lanzador de scripts: `ng` corre sobre Node.
Node requerido: `^22.22.3`, `^24.15.0` o `^26` (ver `.nvmrc` y `engines`).

## Puesta en marcha

```bash
bun install
bun run start        # ng serve en http://localhost:4200
```

La API debe estar corriendo. El dev server usa `proxy.conf.mjs` para evitar CORS y
mantener la base de la API relativa (`/api/v1`).

| Cómo corre el backend | Destino por defecto | Comando |
| --- | --- | --- |
| Docker (`docker compose up`) | `http://localhost:3001` | `bun run start` |
| Bun local (`bun run start`) | `http://localhost:3000` | `API_TARGET=http://localhost:3000 bun run start` |

Necesitas una cuenta: la app tiene pantalla de registro (`/login` → *Crear cuenta*).

## Scripts

```bash
bun run start         # ng serve
bun run build         # ng build (production)
bun run test          # ng test (Vitest)
bun run test:watch    # Vitest en watch
bun run lint          # ng lint (incluye reglas de arquitectura)
bun run typecheck     # tsc -p tsconfig.app.json --noEmit
bun run format        # Prettier
```

## Arquitectura

```
src/app/
├── app.config.ts        # providers globales: router, HttpClient, interceptores, auth
├── app.routes.ts        # rutas raíz con lazy loading por feature
├── app.ts               # shell: cabecera, router-outlet, toaster
├── auth/                # feature de sesión (la API exige JWT)
│   ├── domain/          # Session, AuthenticatedUser, reglas de credenciales, puertos
│   ├── application/     # SessionStore (NgRx signals)
│   ├── infrastructure/  # adaptador HTTP, localStorage, interceptores
│   └── presentation/    # página de login / registro
├── products/            # feature de catálogo
│   ├── domain/          # Product, ProductDraft, reglas, Page<T>, puerto
│   ├── application/     # ProductsStore
│   ├── infrastructure/  # DTOs, mapper, adaptador HTTP
│   └── presentation/    # páginas smart, componentes dumb, mapper de formulario
├── core/                # transversal: AppError, base URL, interceptor, notifier
└── shared/ui/           # primitivas de UI agnósticas de dominio
```

Regla de dependencias, verificada también por ESLint:

```
presentation -> application -> domain <- infrastructure
```

- `domain` es TypeScript puro: no importa Angular, NgRx, RxJS ni UI.
- `application` usa el puerto `ProductRepository` y no conoce `HttpClient` ni el router.
- `infrastructure` implementa el puerto y se registra por DI en `products.routes.ts`.
- `presentation` consume el store: nunca el repositorio ni `HttpClient`.

La excepción deliberada es `core/http/app-error.ts`: es transversal y sin dominio,
así que `application` puede usarlo para tipar el error que llega a la UI.

### Flujo de una petición

```
componente -> store -> ProductRepository (puerto) -> HttpProductRepository
                                   -> HttpClient -> proxy /api -> API
respuesta  -> mapper (DTO -> dominio) -> store -> signals -> plantilla
error      -> errorInterceptor (AppError) -> store -> UI (formulario, toast o Reintentar)
```

## Decisiones que se apartan del supuesto del doc

El contrato real del Ejercicio 1 se validó contra `CROPER_BACKEND`; manda el backend.

| Supuesto del doc | Contrato real | Dónde se absorbe |
| --- | --- | --- |
| `GET /products?page=&size=` | `page` + `limit` (más `search`, `sort`, filtros) | `infrastructure/product.mapper.ts` (`toListQuery`) |
| `PUT/PATCH` | solo `PATCH` parcial | `HttpProductRepository.update` |
| `/products` | prefijo `/api/v1` | `API_BASE_URL` en `app.config.ts` |
| — | **JWT obligatorio** | feature `auth` + `authTokenInterceptor` |
| — | respuesta `{ data, meta }` | `product.mapper.ts` (`toPage`) |
| — | error `{ statusCode, code, message, details }` | `core/http/app-error.ts` |

### Estado y URL

La página y el tamaño viven en la URL (`?page=2&size=10`) y son la fuente de verdad:
la lista reacciona a los query params y navega al paginar. Así el estado es
compartible y sobrevive al refresh. El store usa `size` (dominio) y el mapper lo
traduce a `limit` (API).

Tras crear, editar o eliminar se recarga la página actual; si un borrado deja la
página vacía, el store retrocede y la URL se sincroniza.

`goToPage(n)` y `setPageSize(n)` siguen formando parte de la API del store como
operaciones programáticas (las cubren los tests); la UI pagina navegando, para que
exista una sola dirección entre URL y estado.

### Manejo de errores

`HttpErrorResponse` → `errorInterceptor` → `AppError` → store/UI.

| Origen | Comportamiento |
| --- | --- |
| status `0` | "No hay conexión. Revisa tu internet e intenta de nuevo." + **Reintentar** |
| `400` / `422` | se muestran junto a cada campo del formulario |
| `404` | "El producto ya no existe." |
| `409` | "Ya existe un producto con esos datos." |
| `401` | cierra sesión y redirige a `/login` |
| `5xx` | "Algo salió mal de nuestro lado. Intenta más tarde." |

El mensaje técnico del backend nunca se renderiza.

## Tests

Se prueba lo que protege comportamiento de valor:

| Archivo | Qué protege |
| --- | --- |
| `products/domain/product-rules.spec.ts` | SKU, nombre, precio (2 decimales), stock, descripción y normalización |
| `products/infrastructure/product.mapper.spec.ts` | Contrato con la API: `size`→`limit`, `meta`, opcionales omitidos, `totalPages` |
| `products/application/products.store.spec.ts` | Paginación, retroceso tras borrado, recarga tras mutaciones, errores |
| `core/http/app-error.spec.ts` | Mapeo status → mensaje amigable y errores de campo |

No hay tests de plantillas, componentes dumb, getters triviales ni snapshots.

## UI

### Login

Split editorial: a la izquierda un hero con una escena 3D de un almacén isométrico
(three.js) sobre un degradado de marca; a la derecha el formulario. En pantallas
menores el hero ocupa todo el alto libre y el formulario entra como una tarjeta
redondeada que se superpone: sin espacio muerto al final de la página.

La escena es ambiental, no funcional:

- `aria-hidden`, sin interacción, y pausada cuando la pestaña está oculta.
- Con `prefers-reduced-motion` se renderiza un único frame estático.
- Si WebGL falla, se queda el degradado CSS: nada se rompe.
- La cámara retrocede según el aspecto del hero para que el diorama entre completo.

`three` viaja en el chunk de `login-page` (≈116 kB gzip). El bundle inicial no
cambia porque la ruta es lazy. Para eliminarlo: borra
`auth/presentation/components/catalog-scene.ts`, su import en `login.page.ts` y la
dependencia; el hero conserva el degradado.

### Catálogo

Desktop: tabla con acciones por fila en un menú de tres puntos (`@angular/cdk/menu`:
teclado, `role=menu`, cierre con Esc y foco devuelto al disparador). Móvil: cada fila es una tarjeta y la
paginación se compacta a anterior/siguiente + indicador. Estados cubiertos:
skeleton, vacío, error con Reintentar y éxito. Los iconos llevan `aria-label` y el
diálogo de borrado usa Angular CDK (foco atrapado, `aria-modal`, foco restaurado).
