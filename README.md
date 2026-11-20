# Catálogo de productos — Frontend

SPA Angular 22 que gestiona el catálogo de la API del Ejercicio 1: listar con
paginación, crear, editar y eliminar productos.

- Enunciado original: [`docs/ENUNCIADO.md`](./docs/ENUNCIADO.md)
- Arquitectura y decisiones: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 22 · standalone, zoneless, signals, `@if`/`@for` |
| Lenguaje | TypeScript 6 · `strict` + `exactOptionalPropertyTypes` |
| Estado | NgRx Signals (`@ngrx/signals`), un store por feature |
| HTTP | `HttpClient` + interceptores funcionales |
| Formularios | Reactive Forms tipados |
| UI | Tailwind 4 · `@spartan-ng/brain` + primitivas propias sobre CDK |
| Iconos y avisos | `ng-icons` (Lucide) · sonner de spartan |
| Hero del login | three.js (carga diferida, solo `/login`) |
| Tests / calidad | Vitest · ESLint (angular-eslint) · Prettier |

Bun es el gestor de paquetes y el lanzador de scripts; **`ng` corre sobre Node**.

## Requisitos

- Node `^22.22.3`, `^24.15.0` o `^26` — ver `.nvmrc`
- Bun 1.3+
- La API del Ejercicio 1 corriendo

## Puesta en marcha

```bash
bun install
bun run start        # http://localhost:4200
```

El dev server proxya `/api` (`proxy.conf.mjs`), así que no hay CORS y la base de la
API es relativa. El destino se elige sin tocar código:

| Cómo corre la API | Comando |
|---|---|
| Docker (`docker compose up`) → 3001 | `bun run start` |
| Bun local (`bun run start`) → 3000 | `API_TARGET=http://localhost:3000 bun run start` |

Necesitas una cuenta: `/login` → *Crear cuenta*.

## Scripts

```bash
bun run start         # ng serve
bun run build         # producción
bun run test          # Vitest
bun run test:watch
bun run lint          # incluye las reglas de arquitectura
bun run typecheck
bun run format
```

## Estructura

```text
src/app/
├── products/        # dominio del ejercicio: domain · application · infrastructure · presentation
├── auth/            # sesión (el backend exige JWT)
├── core/            # transversal: AppError, base URL, interceptor, notifier
└── shared/ui/       # primitivas de UI agnósticas de dominio
```

Detalle y reglas de dependencia en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Tests

45 tests en 4 archivos: reglas de producto, mapper del contrato, `ProductsStore` y
mapeo de errores. Sin tests de plantillas ni de componentes sin lógica.

## Documentación

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — diseño, contrato, decisiones y límites
- [`docs/ENUNCIADO.md`](./docs/ENUNCIADO.md) — enunciado original
- [`odd/tasks/products-frontend.md`](./odd/tasks/products-frontend.md) — bitácora de trabajo y verificación
