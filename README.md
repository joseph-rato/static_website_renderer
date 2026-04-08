# Static Website Renderer

JSON-schema-driven static website renderer for the Pagoda website builder. This system replaces the legacy Jinja2 template pipeline with a single source of truth (JSON `PageDocument`) rendered by a shared TypeScript/React package.

## Packages

| Package | Description |
|---------|-------------|
| `@pagoda/schema` | Canonical JSON page schema — TypeScript types, JSON Schema, and Ajv validator |
| `@pagoda/transform` | Converts legacy `preview_input` + `database_data` into a `PageDocument` |

## Quick Start

```bash
pnpm install
pnpm run typecheck   # Type-check all packages
pnpm run test        # Run all tests
```

## Architecture

See the [docs/](./docs/) directory for detailed architecture documentation:

- [JSON Schema Spec](./docs/01-JSON-SCHEMA-SPEC.md) — Schema design, types, validation
- [Backend + Lambda Architecture](./docs/02-BACKEND-LAMBDA-ARCHITECTURE.md) — System flow from editor to CDN
- [Shared Renderer](./docs/03-SHARED-RENDERER.md) — Component registry, SSR, live preview
- [Image-to-JSON Pipeline](./docs/04-IMAGE-TO-JSON-PIPELINE.md) — Vision AI to PageDocument conversion
- [Data Transformation Spec](./docs/DATA-TRANSFORMATION-SPEC.md) — Field-by-field mapping from legacy data
- [Migration Guide](./docs/MIGRATION-GUIDE.md) — Phased migration plan

## Schema Overview

The `PageDocument` is the single source of truth for a webpage:

```
PageDocument
├── schemaVersion   # Semver, must match renderer
├── metadata        # SEO, fonts, analytics
├── theme           # Design tokens (colors, fonts)
├── symbols?        # Reusable component definitions
└── body[]          # Ordered array of SRNode sections
    └── SRNode
        ├── type    # Component discriminator (e.g. "hero", "navigation")
        ├── id?     # Stable unique identifier
        ├── props?  # Component-specific data
        ├── styles? # Base CSS-in-JS styles
        ├── responsiveStyles?  # Breakpoint overrides
        └── children?          # Nested nodes
```

## Examples

- [Full salon landing page](./packages/schema/examples/salon-landing-page.json)
- [Minimal valid page](./packages/schema/examples/minimal-page.json)
