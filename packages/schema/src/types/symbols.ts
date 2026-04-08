/**
 * Props for a symbol reference node (type: "symbol-ref").
 *
 * A symbol reference points to a reusable node tree defined in
 * the PageDocument's `symbols` map. The renderer resolves the reference
 * and renders the symbol's tree, optionally merging `overrides` into
 * the symbol's root node props.
 */
export interface SymbolRefProps {
  /** ID of the symbol to render, matching a key in PageDocument.symbols */
  symbolId: string;
  /** Prop overrides to merge into the symbol's root node props */
  overrides?: Record<string, unknown>;
}
