# Shared Renderer (`@pagoda/renderer`)

## Overview

`@pagoda/renderer` is an npm package that converts a `PageDocument` JSON into HTML. It is imported by **two consumers**:

1. **Frontend app** -- renders PageDocument as live React components for the in-browser editor preview.
2. **Lambda** -- calls `renderToString` to produce static HTML for S3/CloudFront.

Both consumers use the same component implementations, guaranteeing that the preview matches the published site.

---

## Package Structure

```
packages/renderer/
  src/
    index.ts                  # Public API: renderToString, RenderNode, registry
    registry.ts               # Component registry (Map<string, ComponentType>)
    RenderNode.tsx             # Recursive node renderer
    ThemeProvider.tsx          # CSS custom property injection
    StyleEngine.ts            # Inline styles + responsive media queries
    components/
      primitives/
        Div.tsx
        Heading.tsx
        Text.tsx
        RichText.tsx
        Image.tsx
        Link.tsx
        Icon.tsx
        Span.tsx
        Section.tsx
      layout/
        FlexContainer.tsx
        GridContainer.tsx
        Container.tsx
      salon/
        Navigation.tsx
        Hero.tsx
        ServicesMenu.tsx
        ServiceHighlights.tsx
        Team.tsx
        Testimonials.tsx
        Gallery.tsx
        FindUs.tsx
        Footer.tsx
        Banner.tsx
        AnnouncementModal.tsx
      special/
        SymbolRef.tsx
    server.ts                 # Server-only: renderToString wrapper
  package.json
  tsconfig.json
```

---

## Component Registry

The registry maps `SRNode.type` strings to React component implementations:

```ts
// registry.ts
import type { ComponentType } from "react";

const registry = new Map<string, ComponentType<any>>();

// Primitives
registry.set("div", Div);
registry.set("heading", Heading);
registry.set("text", Text);
registry.set("rich-text", RichText);
registry.set("image", ImageComponent);
registry.set("link", LinkComponent);
registry.set("icon", Icon);
registry.set("span", Span);
registry.set("section", SectionComponent);

// Layout
registry.set("flex-container", FlexContainer);
registry.set("grid-container", GridContainer);
registry.set("container", Container);

// Salon domain
registry.set("navigation", Navigation);
registry.set("hero", Hero);
registry.set("services-menu", ServicesMenu);
registry.set("service-highlights", ServiceHighlights);
registry.set("team", Team);
registry.set("testimonials", Testimonials);
registry.set("gallery", Gallery);
registry.set("find-us", FindUs);
registry.set("footer", Footer);
registry.set("banner", Banner);
registry.set("announcement-modal", AnnouncementModal);

// Special
registry.set("symbol-ref", SymbolRef);

export { registry };
```

Unknown types log a warning and render nothing (no crash).

---

## Recursive `RenderNode` Component

`RenderNode` is the core recursive component. It looks up the type in the registry, applies styles, and recurses into children:

```tsx
// RenderNode.tsx
import React from "react";
import { registry } from "./registry";
import { resolveStyles } from "./StyleEngine";

interface RenderNodeProps {
  node: SRNode;
  symbols?: Record<string, SRNode>;
}

export const RenderNode = React.memo(function RenderNode({ node, symbols }: RenderNodeProps) {
  // Skip invisible nodes
  if (node.visible === false) return null;

  // Resolve symbol references
  if (node.type === "symbol-ref") {
    const symbolId = (node.props as any)?.symbolId;
    const symbolNode = symbols?.[symbolId];
    if (!symbolNode) return null;
    const merged = applyOverrides(symbolNode, (node.props as any)?.overrides);
    return <RenderNode node={merged} symbols={symbols} />;
  }

  const Component = registry.get(node.type);
  if (!Component) {
    console.warn(`Unknown node type: "${node.type}"`);
    return null;
  }

  const style = resolveStyles(node.styles);
  const children = node.children?.map((child, i) => (
    <RenderNode key={child.id ?? i} node={child} symbols={symbols} />
  ));

  return (
    <Component
      id={node.id}
      className={node.className}
      style={style}
      {...node.props}
    >
      {children}
    </Component>
  );
});
```

Key details:

- `React.memo` prevents re-renders when the node reference is stable.
- `key` uses `node.id` when available, falling back to array index.
- Symbol references are resolved inline before delegation to the registry.

---

## Two Rendering Modes

### Client Mode (Live Preview)

The frontend app imports `RenderNode` and `ThemeProvider` directly:

```tsx
import { RenderNode, ThemeProvider } from "@pagoda/renderer";

function LivePreview({ pageDocument }: { pageDocument: PageDocument }) {
  return (
    <ThemeProvider theme={pageDocument.theme}>
      {pageDocument.body.map((node) => (
        <RenderNode key={node.id} node={node} symbols={pageDocument.symbols} />
      ))}
    </ThemeProvider>
  );
}
```

Responsive styles work natively because media queries are injected into the document head.

### Server Mode (Lambda SSR)

The Lambda imports `renderToString` which wraps React 18's `renderToString`:

```ts
import { renderToString } from "@pagoda/renderer/server";

const { html, css } = renderToString(pageDocument);
// html = rendered component tree as an HTML string
// css  = critical CSS (theme variables + responsive media queries)
```

The `css` output includes:

- `:root` CSS custom properties from `ThemeTokens`
- Media query blocks for all responsive style overrides
- Any component-level critical CSS

---

## Style Handling

### Inline Styles

Base `styles` from an SRNode are passed directly as React `style` props (camelCase properties).

### Responsive Styles as Media Queries

Responsive overrides cannot be expressed as inline styles. The `StyleEngine` generates scoped CSS rules:

```ts
// For a node with id "hero" and responsiveStyles.mobile = { padding: "16px" }
// Generates:
// @media (max-width: 768px) { [data-sr-id="hero"] { padding: 16px; } }
```

In client mode, these rules are injected into a `<style>` tag in the document head. In server mode, they are collected and returned as the `css` string.

---

## ThemeProvider

`ThemeProvider` is a React context provider that injects design tokens as CSS custom properties:

```tsx
function ThemeProvider({ theme, children }: { theme: ThemeTokens; children: React.ReactNode }) {
  const cssVars = {
    "--color-primary": theme.colors.primary,
    "--color-secondary": theme.colors.secondary,
    "--color-primary-text": theme.colors.primaryText,
    "--color-secondary-text": theme.colors.secondaryText,
    "--font-primary": theme.fonts.primary,
    "--font-secondary": theme.fonts.secondary,
    ...Object.fromEntries(
      Object.entries(theme.custom ?? {}).map(([k, v]) => [`--${k}`, v])
    ),
  } as React.CSSProperties;

  return <div style={cssVars}>{children}</div>;
}
```

Components reference tokens via `var(--color-primary)` in their styles, ensuring consistent theming.

---

## Rich Text Handling

The `rich-text` component renders trusted HTML from the salon's text editor:

```tsx
function RichText({ html, style, className }: RichTextProps & BaseProps) {
  const sanitized = sanitizeHtml(html); // DOMPurify or similar
  return <div style={style} className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

HTML is sanitized before rendering to prevent XSS. The sanitizer allows standard formatting tags (`<p>`, `<strong>`, `<em>`, `<a>`, `<ul>`, `<li>`) and strips scripts/event handlers.

---

## Deterministic Rendering

The renderer guarantees: **same PageDocument JSON produces identical HTML output.**

This is achieved by:

- No random values (keys are derived from `node.id` or stable indices).
- No date/time-dependent logic in components.
- CSS custom property order is deterministic (object key insertion order).
- `React.renderToString` is deterministic for the same component tree.

This property enables content-hash-based cache invalidation and visual regression testing.

---

## Plugin System (Future)

The registry pattern supports future custom component registration:

```ts
import { registry } from "@pagoda/renderer";

// Salon-specific custom component
registry.set("custom-booking-widget", MyBookingWidget);
```

This is not exposed in v1 but the architecture is ready for it.

---

## Performance

- **`React.memo`** on `RenderNode` prevents unnecessary subtree re-renders.
- **Stable keys** from `node.id` enable efficient React reconciliation.
- **Lazy image loading** -- `ImageComponent` defaults to `loading="lazy"` for below-the-fold images.
- **CSS custom properties** avoid inline style duplication for themed values.
- **Server render time** for a typical salon page: < 200ms.
