# JSON Schema Specification

## Design Philosophy

The PageDocument JSON schema is the **single source of truth** for every salon website. It replaces the Python/Jinja2 template system with a declarative, AST-like tree of type-discriminated nodes.

Core principles:

- **JSON is the contract.** No HTML is stored, parsed, or manipulated. The renderer converts JSON to HTML at render time.
- **Type-discriminated nodes.** Every node carries a `type` string that maps to a component in the renderer's registry.
- **Portable.** The same JSON renders identically on the server (Lambda SSR) and in the browser (live preview).
- **Validatable.** The schema is enforced at runtime via Ajv before any rendering occurs.

---

## PageDocument Structure

The root object has five top-level fields:

```ts
interface PageDocument {
  schemaVersion: string;     // semver, e.g. "1.0.0"
  metadata:      PageMetadata;
  theme:         ThemeTokens;
  symbols?:      Record<string, SRNode>;
  body:          SRNode[];   // ordered top-level section nodes
}
```

| Field           | Required | Purpose                                              |
|-----------------|----------|------------------------------------------------------|
| `schemaVersion` | Yes      | Semver string. Renderer rejects unknown versions.    |
| `metadata`      | Yes      | SEO, analytics, fonts, favicon, Open Graph, Twitter. |
| `theme`         | Yes      | Design tokens applied as CSS custom properties.      |
| `symbols`       | No       | Reusable component definitions keyed by symbol ID.   |
| `body`          | Yes      | Ordered array of section nodes (min 1 item).         |

---

## SRNode Anatomy

Every element in the page tree is an `SRNode` (Static Renderer Node):

```ts
interface SRNode {
  type:             string;                        // component discriminator
  id?:              string;                        // stable unique key
  props?:           Record<string, unknown>;        // component-specific data
  styles?:          StyleObject;                   // base inline styles (all viewports)
  responsiveStyles?: ResponsiveStyles;             // per-breakpoint overrides
  className?:       string;                        // CSS utility classes
  children?:        SRNode[];                      // child subtree
  visible?:         boolean;                       // false = skip entire subtree
}
```

- `type` is the only required field. It determines which component the renderer uses.
- `id` is used for React keys, anchor targets (`#home`, `#services`), and test selectors.
- `props` shape varies by component type (see Component Types below).
- `visible` defaults to `true` when omitted.

---

## Component Types

### Salon Domain Components (11)

| Type                  | Props Interface          | Always Rendered | Anchor ID            |
|-----------------------|--------------------------|-----------------|----------------------|
| `navigation`          | `NavigationProps`        | Yes             | `navigation`         |
| `hero`                | `HeroProps`              | Yes             | `home`               |
| `services-menu`       | `ServicesMenuProps`      | Yes             | `services`           |
| `service-highlights`  | `ServiceHighlightsProps` | No              | `highlights`         |
| `team`                | `TeamProps`              | No              | `about`              |
| `testimonials`        | `TestimonialsProps`      | No              | `testimonials`       |
| `gallery`             | `GalleryProps`           | No              | `gallery`            |
| `find-us`             | `FindUsProps`            | Yes             | `find-us`            |
| `footer`              | `FooterProps`            | Yes             | `footer`             |
| `banner`              | `BannerProps`            | No              | `banner`             |
| `announcement-modal`  | `AnnouncementModalProps` | No              | `announcement-modal` |

### Primitives (9)

| Type        | Props Interface  | Description                                    |
|-------------|------------------|------------------------------------------------|
| `div`       | generic          | Generic block container                        |
| `section`   | generic          | Semantic section element                       |
| `span`      | generic          | Inline container                               |
| `heading`   | `HeadingProps`   | `level` (1-6) + `text`                         |
| `text`      | `TextProps`      | Plain text node                                |
| `rich-text` | `RichTextProps`  | Sanitized HTML via `dangerouslySetInnerHTML`    |
| `image`     | `ImageProps`     | `src`, `alt`, `width`, `height`, `loading`     |
| `link`      | `LinkProps`      | `href`, `target`, `rel`                        |
| `icon`      | `IconProps`      | Tabler icon by `name`, `size`, `color`         |

### Layout (3)

| Type              | Props Interface       | Description                   |
|-------------------|-----------------------|-------------------------------|
| `flex-container`  | `FlexContainerProps`  | Flexbox: direction, gap, etc. |
| `grid-container`  | `GridContainerProps`  | CSS Grid: columns, rows, gap  |
| `container`       | `ContainerProps`      | Max-width centered wrapper    |

### Special (1)

| Type         | Props Interface  | Description                              |
|--------------|------------------|------------------------------------------|
| `symbol-ref` | `SymbolRefProps` | References a reusable symbol by ID       |

---

## Style System

### Base Styles

The `styles` field accepts camelCase CSS properties mapped to string or number values:

```json
{
  "styles": {
    "backgroundColor": "#f5f5f5",
    "padding": "24px",
    "fontSize": "16px"
  }
}
```

These apply at **all viewport widths** and map directly to React `CSSProperties`.

### Responsive Overrides

The `responsiveStyles` field provides per-breakpoint overrides that merge on top of `styles`:

```json
{
  "styles": { "padding": "48px", "fontSize": "18px" },
  "responsiveStyles": {
    "mobile":  { "padding": "16px", "fontSize": "14px" },
    "tablet":  { "padding": "32px" }
  }
}
```

| Breakpoint | Viewport Range | Media Query                                      |
|------------|----------------|--------------------------------------------------|
| `mobile`   | <= 768px       | `@media (max-width: 768px)`                      |
| `tablet`   | 769 - 1024px   | `@media (min-width: 769px) and (max-width: 1024px)` |
| `desktop`  | >= 1025px      | `@media (min-width: 1025px)`                     |

For SSR, base `styles` are treated as desktop defaults and media queries are emitted for tablet and mobile overrides.

---

## Theme / Design Tokens

```ts
interface ThemeTokens {
  colors: {
    primary:       string;   // required - brand color (hex)
    secondary:     string;   // required - accent color (hex)
    primaryText?:  string;   // text on primary backgrounds
    secondaryText?: string;  // text on secondary backgrounds
    background?:   string;   // page background
    surface?:      string;   // card/surface background
  };
  fonts: {
    primary:   string;       // required - headings font family
    secondary: string;       // required - body font family
  };
  custom?: Record<string, string>;  // extensible tokens
}
```

The renderer injects these as CSS custom properties on `:root`:

```css
:root {
  --color-primary: #8B5CF6;
  --color-secondary: #EC4899;
  --font-primary: "Playfair Display";
  --font-secondary: "Inter";
}
```

The `custom` map allows future tokens (e.g., `"border-radius": "8px"`) without schema changes.

---

## Symbol System

Symbols enable component reuse. Define a node tree once in `symbols`, reference it anywhere in `body`:

```json
{
  "symbols": {
    "cta-button": {
      "type": "link",
      "props": { "href": "/book", "target": "_self" },
      "styles": { "backgroundColor": "var(--color-primary)", "padding": "12px 24px" },
      "children": [{ "type": "text", "props": { "text": "Book Now" } }]
    }
  },
  "body": [
    {
      "type": "symbol-ref",
      "props": { "symbolId": "cta-button", "overrides": { "href": "/book-consultation" } }
    }
  ]
}
```

The renderer resolves `symbol-ref` nodes by looking up the symbol tree and merging `overrides` into the root node's props.

---

## Versioning

- The `schemaVersion` field follows semver (currently `"1.0.0"`).
- The renderer checks `schemaVersion` and refuses documents with unrecognized versions.
- **Patch** bumps: backward-compatible fixes (no prop changes).
- **Minor** bumps: new optional fields or component types.
- **Major** bumps: breaking changes to existing prop shapes or removed components.

---

## Validation

Validation uses Ajv (JSON Schema draft-2020-12 compatible) compiled at module load time:

```ts
import { validatePageDocument } from "@pagoda/schema";

const result = validatePageDocument(doc);
// { valid: true }
// { valid: false, errors: ["/ is missing required property \"body\"", ...] }
```

The schema is defined inline in `packages/schema/src/validators/validate.ts` for bundler compatibility. Key constraints:

- `body` must have at least 1 item (`minItems: 1`).
- `SRNode.type` is the only required node field.
- `additionalProperties: false` at every level catches typos early.
- Error messages are human-readable with JSON pointer paths.

---

## Source Files

| File | Description |
|------|-------------|
| `packages/schema/src/types/page.ts` | `PageDocument` interface |
| `packages/schema/src/types/node.ts` | `SRNode` interface |
| `packages/schema/src/types/styles.ts` | `StyleObject`, `ResponsiveStyles`, `Breakpoint` |
| `packages/schema/src/types/metadata.ts` | `PageMetadata`, `ThemeTokens` |
| `packages/schema/src/types/components.ts` | All component prop interfaces |
| `packages/schema/src/types/layout.ts` | Layout container prop interfaces |
| `packages/schema/src/types/symbols.ts` | `SymbolRefProps` |
| `packages/schema/src/constants.ts` | `SCHEMA_VERSION`, `BREAKPOINTS`, `COMPONENT_TYPES`, `CONSTRAINTS` |
| `packages/schema/src/validators/validate.ts` | Ajv-based runtime validation |
