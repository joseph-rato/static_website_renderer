import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { RenderNode } from "../RenderNode.js";
import type { SRNode } from "@pagoda/schema";

function render(node: SRNode, symbols?: Record<string, SRNode>): string {
  return renderToString(<RenderNode node={node} symbols={symbols} />);
}

describe("RenderNode", () => {
  it("renders a simple heading node", () => {
    const node: SRNode = {
      type: "heading",
      props: { level: 1, text: "Hello" },
    };
    const html = render(node);
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
  });

  it("applies data-sr-id from node.id", () => {
    const node: SRNode = {
      type: "div",
      id: "test-div",
    };
    const html = render(node);
    expect(html).toContain('data-sr-id="test-div"');
  });

  it("applies inline styles", () => {
    const node: SRNode = {
      type: "div",
      id: "styled",
      styles: { backgroundColor: "red", padding: "20px" },
    };
    const html = render(node);
    expect(html).toContain("background-color:red");
    expect(html).toContain("padding:20px");
  });

  it("skips nodes with visible: false", () => {
    const node: SRNode = {
      type: "heading",
      visible: false,
      props: { level: 1, text: "Hidden" },
    };
    const html = render(node);
    expect(html).toBe("");
  });

  it("renders children recursively", () => {
    const node: SRNode = {
      type: "div",
      children: [
        { type: "text", props: { text: "Child 1" } },
        { type: "text", props: { text: "Child 2" } },
      ],
    };
    const html = render(node);
    expect(html).toContain("Child 1");
    expect(html).toContain("Child 2");
  });

  it("resolves symbol-ref nodes", () => {
    const symbols: Record<string, SRNode> = {
      "my-button": {
        type: "text",
        props: { text: "Click Me" },
      },
    };
    const node: SRNode = {
      type: "symbol-ref",
      props: { symbolId: "my-button" },
    };
    const html = render(node, symbols);
    expect(html).toContain("Click Me");
  });

  it("symbol-ref applies overrides", () => {
    const symbols: Record<string, SRNode> = {
      greeting: {
        type: "text",
        props: { text: "Hello" },
      },
    };
    const node: SRNode = {
      type: "symbol-ref",
      props: { symbolId: "greeting", overrides: { text: "Overridden" } },
    };
    const html = render(node, symbols);
    expect(html).toContain("Overridden");
  });

  it("returns null for unknown component types", () => {
    const node: SRNode = {
      type: "unknown-widget",
      props: {},
    };
    const html = render(node);
    expect(html).toBe("");
  });

  it("renders a salon component (hero)", () => {
    const node: SRNode = {
      type: "hero",
      id: "home",
      props: {
        header: "Welcome",
        subhead: "Beauty Awaits",
      },
    };
    const html = render(node);
    expect(html).toContain("Welcome");
    expect(html).toContain("Beauty Awaits");
  });

  it("renders navigation with banner child", () => {
    const node: SRNode = {
      type: "navigation",
      id: "nav",
      props: {
        navLinks: [{ label: "Home", anchor: "#home" }],
      },
      children: [
        {
          type: "banner",
          id: "banner",
          props: {
            content: "<p>Special offer!</p>",
            backgroundColor: "#FF0000",
          },
        },
      ],
    };
    const html = render(node);
    expect(html).toContain("Home");
    expect(html).toContain("Special offer!");
  });
});
