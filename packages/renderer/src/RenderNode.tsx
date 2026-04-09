import React from "react";
import type { SRNode, PageDocument } from "@pagoda/schema";
import { registry } from "./registry.js";

export interface RenderNodeProps {
  node: SRNode;
  symbols?: PageDocument["symbols"];
}

/**
 * Recursive component that renders an SRNode tree.
 * Looks up the node's `type` in the component registry, passes props/styles/children.
 */
export const RenderNode = React.memo(function RenderNode({
  node,
  symbols,
}: RenderNodeProps) {
  // Skip invisible nodes
  if (node.visible === false) return null;

  // Handle symbol references
  if (node.type === "symbol-ref") {
    const symbolId = (node.props as { symbolId?: string } | undefined)
      ?.symbolId;
    const overrides = (node.props as { overrides?: Record<string, unknown> } | undefined)
      ?.overrides;
    if (!symbolId || !symbols?.[symbolId]) {
      if (typeof console !== "undefined") {
        console.warn(`[RenderNode] Symbol not found: ${symbolId ?? "undefined"}`);
      }
      return null;
    }
    const symbolNode = symbols[symbolId];
    const resolved: SRNode = overrides
      ? { ...symbolNode, props: { ...symbolNode.props, ...overrides } }
      : symbolNode;
    return <RenderNode node={resolved} symbols={symbols} />;
  }

  const Component = registry.get(node.type);
  if (!Component) {
    if (typeof console !== "undefined") {
      console.warn(`[RenderNode] Unknown component type: ${node.type}`);
    }
    return null;
  }

  const childElements = node.children?.map((child, index) => (
    <RenderNode key={child.id ?? index} node={child} symbols={symbols} />
  ));

  return (
    <Component
      {...(node.props ?? {})}
      style={node.styles}
      className={node.className}
      data-sr-id={node.id}
    >
      {childElements}
    </Component>
  );
});
