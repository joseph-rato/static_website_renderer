import type { SRNode } from "./node.js";
import type { PageMetadata, ThemeTokens } from "./metadata.js";

/**
 * PageDocument — the root of the JSON page schema.
 *
 * This is the single source of truth for one webpage in the Pagoda
 * website builder. It contains everything needed to render the page:
 * metadata, design tokens, optional reusable symbols, and the page
 * content tree.
 */
export interface PageDocument {
  /**
   * Schema version (semver). Must match the renderer version to produce
   * valid output. The renderer will refuse documents with unknown versions.
   */
  schemaVersion: string;

  /** Page-level metadata: SEO, analytics, fonts, favicon */
  metadata: PageMetadata;

  /** Design tokens applied as CSS custom properties */
  theme: ThemeTokens;

  /**
   * Reusable component definitions (symbols).
   *
   * Key is a symbol ID (e.g. "cta-button").
   * Value is a full SRNode tree.
   *
   * Referenced in the body via:
   *   { type: "symbol-ref", props: { symbolId: "cta-button" } }
   */
  symbols?: Record<string, SRNode>;

  /** The page content tree — an ordered array of top-level section nodes */
  body: SRNode[];
}
