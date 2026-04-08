import { describe, it, expect } from "vitest";
import { validatePageDocument } from "../src/validators/validate.js";
import salonLandingPage from "../examples/salon-landing-page.json";
import minimalPage from "../examples/minimal-page.json";

describe("validatePageDocument", () => {
  describe("valid documents", () => {
    it("accepts the full salon landing page example", () => {
      const result = validatePageDocument(salonLandingPage);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("accepts the minimal page example", () => {
      const result = validatePageDocument(minimalPage);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("accepts a document with symbols", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        symbols: {
          "cta-button": {
            type: "link",
            props: { href: "/book" },
          },
        },
        body: [
          {
            type: "symbol-ref",
            props: { symbolId: "cta-button" },
          },
        ],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("accepts a document with responsive styles", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [
          {
            type: "hero",
            id: "home",
            styles: { padding: "80px 0" },
            responsiveStyles: {
              mobile: { padding: "40px 0" },
              tablet: { padding: "60px 0" },
            },
            props: { header: "Hello" },
          },
        ],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("accepts nodes with children", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [
          {
            type: "navigation",
            id: "nav",
            props: {},
            children: [
              {
                type: "banner",
                id: "banner",
                props: { content: "Hello" },
              },
            ],
          },
        ],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid documents", () => {
    it("rejects a document missing schemaVersion", () => {
      const doc = {
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero" }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes("schemaVersion"))).toBe(true);
    });

    it("rejects a document missing metadata", () => {
      const doc = {
        schemaVersion: "1.0.0",
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero" }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.includes("metadata"))).toBe(true);
    });

    it("rejects a document with empty body", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
    });

    it("rejects a document missing theme colors", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: {},
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero" }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.includes("primary"))).toBe(true);
    });

    it("rejects a node missing type", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ id: "no-type" }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.includes("type"))).toBe(true);
    });

    it("rejects a document with unknown top-level properties", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero" }],
        unknownField: true,
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.includes("unknownField"))).toBe(true);
    });

    it("rejects non-object input", () => {
      expect(validatePageDocument(null).valid).toBe(false);
      expect(validatePageDocument("string").valid).toBe(false);
      expect(validatePageDocument(42).valid).toBe(false);
      expect(validatePageDocument([]).valid).toBe(false);
    });

    it("rejects metadata missing title", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: {},
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero" }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.includes("title"))).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("accepts optional theme.custom tokens", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
          custom: { "border-radius": "8px", "spacing-unit": "16px" },
        },
        body: [{ type: "hero" }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("accepts nodes with visible: false", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero", visible: false }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("accepts all metadata fields", () => {
      const doc = {
        schemaVersion: "1.0.0",
        metadata: {
          title: "Test",
          description: "A test page",
          url: "https://example.com",
          favicon: "https://example.com/favicon.ico",
          fonts: ["Arial", "Helvetica"],
          analyticsId: "G-123",
          og: {
            title: "OG Title",
            description: "OG Desc",
            image: "https://example.com/og.png",
            type: "website",
          },
          twitter: {
            card: "summary_large_image",
            title: "Twitter Title",
            description: "Twitter Desc",
            image: "https://example.com/twitter.png",
          },
        },
        theme: {
          colors: {
            primary: "#000",
            secondary: "#fff",
            primaryText: "#fff",
            secondaryText: "#000",
            background: "#fafafa",
            surface: "#ffffff",
          },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [{ type: "hero", props: { header: "Test" } }],
      };
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });
  });
});
