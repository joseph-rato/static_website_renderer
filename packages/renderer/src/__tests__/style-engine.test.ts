import { describe, it, expect } from "vitest";
import { styleObjectToCSS, generateResponsiveCSS, collectResponsiveCSS } from "../StyleEngine.js";

describe("StyleEngine", () => {
  describe("styleObjectToCSS", () => {
    it("converts camelCase to kebab-case", () => {
      expect(styleObjectToCSS({ backgroundColor: "red" })).toBe(
        "background-color: red",
      );
    });

    it("appends px to numeric values", () => {
      expect(styleObjectToCSS({ fontSize: 16 })).toBe("font-size: 16px");
    });

    it("handles multiple properties in sorted order", () => {
      const result = styleObjectToCSS({
        padding: "10px",
        backgroundColor: "blue",
        fontSize: "14px",
      });
      expect(result).toBe(
        "background-color: blue; font-size: 14px; padding: 10px",
      );
    });

    it("skips undefined values", () => {
      expect(
        styleObjectToCSS({ color: "red", background: undefined }),
      ).toBe("color: red");
    });

    it("returns empty string for empty object", () => {
      expect(styleObjectToCSS({})).toBe("");
    });
  });

  describe("generateResponsiveCSS", () => {
    it("generates mobile media query", () => {
      const css = generateResponsiveCSS("hero", {
        mobile: { padding: "10px" },
      });
      expect(css).toContain("@media (max-width: 768px)");
      expect(css).toContain('[data-sr-id="hero"]');
      expect(css).toContain("padding: 10px");
    });

    it("generates tablet media query", () => {
      const css = generateResponsiveCSS("nav", {
        tablet: { fontSize: "14px" },
      });
      expect(css).toContain("@media (min-width: 769px) and (max-width: 1024px)");
      expect(css).toContain('[data-sr-id="nav"]');
    });

    it("generates desktop media query", () => {
      const css = generateResponsiveCSS("section", {
        desktop: { maxWidth: "1200px" },
      });
      expect(css).toContain("@media (min-width: 1025px)");
    });

    it("generates all breakpoints", () => {
      const css = generateResponsiveCSS("test", {
        mobile: { padding: "8px" },
        tablet: { padding: "16px" },
        desktop: { padding: "24px" },
      });
      expect(css).toContain("max-width: 768px");
      expect(css).toContain("min-width: 769px");
      expect(css).toContain("min-width: 1025px");
    });
  });

  describe("collectResponsiveCSS", () => {
    it("collects CSS from nested node tree", () => {
      const nodes = [
        {
          id: "parent",
          responsiveStyles: { mobile: { padding: "10px" } },
          children: [
            {
              id: "child",
              responsiveStyles: { tablet: { fontSize: "12px" } },
            },
          ],
        },
      ];
      const css = collectResponsiveCSS(nodes);
      expect(css).toContain("parent");
      expect(css).toContain("child");
    });

    it("skips nodes without id or responsiveStyles", () => {
      const nodes = [{ id: undefined, children: [] }];
      const css = collectResponsiveCSS(nodes);
      expect(css).toBe("");
    });
  });
});
