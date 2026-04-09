import React from "react";

/**
 * SymbolRef is handled directly by RenderNode (it resolves the symbol inline).
 * This component is a fallback that should never be rendered directly.
 */
export function SymbolRef(_props: {
  symbolId: string;
  overrides?: Record<string, unknown>;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return null;
}
