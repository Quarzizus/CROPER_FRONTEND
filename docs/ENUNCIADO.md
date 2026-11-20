# Ejercicio 2: Frontend de Productos (Angular)

Interfaz que consume la API REST del Ejercicio 1 para gestionar productos.

## 1. Alcance

- Listar, crear, editar y eliminar productos.
- Tabla con paginación.
- Manejo de errores con mensajes amigables.
- State management.
- Diseño responsive.

## 2. Stack


| Capa            | Tecnología                                                    | Nota                                                                        |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Framework       | Angular 22 (última estable)                                   | Standalone, zoneless, signals, control flow `@if/@for`                      |
| Lenguaje        | TypeScript (strict)                                           | `strict`, `noImplicitOverride`, `exactOptionalPropertyTypes`                |
| Runtime         | Node `^22.22.3`, `^24.15.0` o `^26`                           | Requisito del CLI de Angular 22. El CLI corre sobre Node, no sobre Bun      |
| Package manager | Bun                                                           | Solo instala dependencias y lanza scripts; `ng` sigue ejecutándose con Node |
| State           | NgRx Signals Store (`@ngrx/signals`)                          | Un store por feature                                                        |
| HTTP            | `HttpClient` + `provideHttpClient(withInterceptors(...))`     | Interceptor de errores                                                      |
| Formularios     | Reactive Forms tipados                                        | Validación en el formulario, reglas de negocio en dominio                   |
| UI              | spartan/ui (equivalente a shadcn para Angular) + Tailwind CSS | Primitivas `brain` + estilos `helm`, sobre Angular CDK                      |
| Iconos          | `ng-icon` (Lucide)                                            | Mismo set que shadcn                                                        |
| Notificaciones  | Toast (sonner de spartan)                                     | Feedback de éxito y error                                                   |
| Tests           | Vitest                                                        | Runner por defecto de Angular                                               |
| Calidad         | ESLint (angular-eslint) + Prettier                            |                                                                             |


## 3. Reglas de arquitectura

1. **Lógica de negocio separada de la UI.** Los componentes solo pintan estado y emiten intenciones. Cero reglas de negocio ni llamadas HTTP dentro de componentes.
2. **Screaming architecture.** La estructura grita el dominio (`products`), no el framework (`components`, `services`).
3. **Solo tests unitarios que generen valor**, con Vitest. Sin tests triviales ni de plantilla.
4. **UI con shadcn y similares** (spartan/ui + Tailwind). Sin librería de componentes pesada adicional.

## 4. Estructura de carpetas

```
src/
├── main.ts
├── app/
│   ├── app.config.ts            # providers globales (router, http, interceptors)
│   ├── app.routes.ts            # rutas raíz con lazy loading por feature
│   ├── app.ts                   # shell (layout + router-outlet)
│   │
│   ├── products/                # FEATURE: el dominio "grita" aquí
│   │   ├── domain/              # TypeScript puro, sin Angular
│   │   │   ├── product.ts               # entidad / tipos
│   │   │   ├── product-draft.ts         # datos para crear/editar
│   │   │   ├── product-rules.ts         # reglas de negocio (precio, stock, etc.)
│   │   │   ├── page.ts                  # Page<T> y PageRequest
│   │   │   └── product.repository.ts    # PUERTO (clase abstracta / token)
│   │   │
│   │   ├── application/         # casos de uso y estado
│   │   │   ├── products.store.ts        # NgRx Signals Store
│   │   │   └── products.store.spec.ts
│   │   │
│   │   ├── infrastructure/      # adaptadores a la API
│   │   │   ├── product.http-repository.ts   # implementa el puerto
│   │   │   ├── product.dto.ts               # contrato crudo de la API
│   │   │   ├── product.mapper.ts            # DTO <-> dominio
│   │   │   └── product.mapper.spec.ts
│   │   │
│   │   ├── presentation/        # UI (dumb + smart)
│   │   │   ├── pages/
│   │   │   │   ├── product-list.page.ts     # smart: conecta store y UI
│   │   │   │   └── product-form.page.ts     # crear / editar
│   │   │   ├── components/
│   │   │   │   ├── products-table.ts        # dumb: tabla + paginación
│   │   │   │   ├── product-form.ts          # dumb: formulario
│   │   │   │   └── confirm-delete-dialog.ts
│   │   │   └── product-form.mapper.ts       # form value <-> ProductDraft
│   │   │
│   │   └── products.routes.ts
│   │
│   ├── core/                    # transversal, sin dominio de negocio
│   │   ├── http/
│   │   │   ├── api-base-url.token.ts
│   │   │   ├── error.interceptor.ts
│   │   │   └── app-error.ts             # AppError + mapeo status -> mensaje
│   │   ├── notifications/
│   │   │   └── notifier.ts              # fachada sobre el toast
│   │   └── config/
│   │       └── environment.ts
│   │
│   └── shared/                  # UI reutilizable agnóstica de dominio
│       └── ui/                  # componentes spartan/helm generados
│           ├── button/ input/ table/ dialog/ pagination/ toast/ ...
│
├── styles.css                   # Tailwind + tokens de tema
└── environments/

```

### Regla de dependencias

```
presentation -> application -> domain <- infrastructure

```

- `domain` no importa nada de Angular ni de otras capas.
- `application` depende solo de `domain` (usa el puerto `ProductRepository`).
- `infrastructure` implementa el puerto y se inyecta por DI en `app.config.ts` / `products.routes.ts`.
- `presentation` consume el store; nunca el repositorio ni `HttpClient`.

## 5. Estado (NgRx Signals Store)

`ProductsStore` (provisto a nivel de ruta de la feature).

**State**

```ts
{
  items: Product[];
  page: number;        // base 1
  pageSize: number;
  total: number;
  status: 'idle' | 'loading' | 'saving' | 'error';
  error: AppError | null;
}

```

**Computed:** `totalPages`, `isEmpty`, `isLoading`, `hasError`.

**Métodos:** `load()`, `goToPage(n)`, `setPageSize(n)`, `create(draft)`, `update(id, draft)`, `remove(id)`.

Decisiones:

- La página actual vive en la **URL** (`?page=2&size=10`). El store reacciona a los query params, así el estado es compartible y sobrevive al refresh.
- Tras crear, editar o eliminar, se **recarga la página actual**. Si queda vacía (por borrado) se retrocede una página.
- `rxMethod` para efectos asíncronos; los errores se convierten en `AppError` dentro del store.

## 6. Capa HTTP

- `ApiBaseUrl` como `InjectionToken` (se configura por entorno).
- El repositorio HTTP traduce el contrato de la API del Ejercicio 1 a modelos de dominio mediante `product.mapper.ts`. Si la API cambia, solo se toca `infrastructure`.
- Endpoints esperados (ajustar al contrato real del Ejercicio 1):


| Acción            | Método    | Ruta                    |
| ----------------- | --------- | ----------------------- |
| Listar (paginado) | GET       | `/products?page=&size=` |
| Detalle           | GET       | `/products/:id`         |
| Crear             | POST      | `/products`             |
| Editar            | PUT/PATCH | `/products/:id`         |
| Eliminar          | DELETE    | `/products/:id`         |


## 7. Manejo de errores

Flujo: `HttpErrorResponse` -&gt; `error.interceptor` -&gt; `AppError` -&gt; store -&gt; UI.


| Origen                  | Mensaje al usuario                                        |
| ----------------------- | --------------------------------------------------------- |
| Sin conexión / status 0 | "No hay conexión. Revisa tu internet e intenta de nuevo." |
| 400 / 422               | Errores de campo mostrados en el formulario               |
| 404                     | "El producto ya no existe."                               |
| 409                     | "Ya existe un producto con esos datos."                   |
| 5xx                     | "Algo salió mal de nuestro lado. Intenta más tarde."      |


- Errores de carga: estado vacío con botón **Reintentar**.
- Errores de acción (guardar, eliminar): toast.
- Nunca se muestra el mensaje técnico crudo del backend.
- Eliminar siempre pasa por un diálogo de confirmación.

## 8. UI y responsive

- Tailwind mobile-first, con tokens de tema (CSS variables) al estilo shadcn.
- **Desktop:** tabla completa con acciones por fila.
- **Móvil:** las filas se renderizan como tarjetas apiladas, la paginación se compacta (anterior/siguiente + indicador).
- Estados cubiertos: cargando (skeleton), vacío, error, éxito.
- Accesibilidad: foco gestionado en diálogos, `aria-label` en acciones de icono, contraste AA.

## 9. Estrategia de testing (Vitest)

Se prueba solo lo que protege comportamiento de valor:


| Qué                                      | Por qué                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `product-rules` (dominio)                | Reglas de negocio puras, alto riesgo de regresión                              |
| `product.mapper`                         | Protege el contrato con la API                                                 |
| `ProductsStore`                          | Paginación, recarga tras mutaciones, manejo de errores (con repositorio falso) |
| `app-error` (mapeo status -&gt; mensaje) | Mensajes amigables correctos                                                   |


No se escriben tests de: plantillas, componentes dumb sin lógica, getters triviales, wrappers de librería ni snapshots.

## 10. Convenciones

- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()` en lugar de constructor.
- Signals para estado local; sin `any`.
- Una responsabilidad por archivo; nombres por rol (`*.page.ts`, `*.store.ts`, `*.mapper.ts`).
- Lazy loading de la feature `products` desde `app.routes.ts`.
- Commits convencionales.

## 11. Scripts

```
bun install        # instalar dependencias (genera bun.lock)
bun run start      # ng serve
bun run build      # ng build
bun run test       # ng test (Vitest)
bun run lint       # ng lint

```

Notas sobre Bun:

- Bun se usa como **package manager**. El runtime del CLI y de los tests es **Node**.
- No se usa `bun --bun` para correr `ng`: no está soportado oficialmente por Angular.
- Mantener un solo lockfile (`bun.lock`) y no mezclar con `package-lock.json`.
- Fijar la versión de Node con `.nvmrc` o el campo `engines` de `package.json`.
- Si algún comando falla solo con Bun, el fallback es `npm` sin cambiar nada más del proyecto.

## 12. Supuestos a validar con el Ejercicio 1

- Forma exacta de la paginación (`page/size` vs `offset/limit`) y del envoltorio de respuesta.
- Campos del producto y reglas de validación del backend.
- Formato de errores de validación (para mapearlos a campos del formulario).