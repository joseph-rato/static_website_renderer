import Ajv, { type ErrorObject } from "ajv";
import type { PageDocument } from "../types/page.js";

// ---------------------------------------------------------------------------
// Schema (inline for maximum compatibility across bundlers and runtimes)
// ---------------------------------------------------------------------------

const styleObjectDef = {
  type: "object",
  additionalProperties: { type: ["string", "number"] },
} as const;

const responsiveStylesDef = {
  type: "object",
  properties: {
    mobile: { $ref: "#/$defs/StyleObject" },
    tablet: { $ref: "#/$defs/StyleObject" },
    desktop: { $ref: "#/$defs/StyleObject" },
  },
  additionalProperties: false,
} as const;

const srNodeDef = {
  type: "object",
  required: ["type"],
  properties: {
    type: { type: "string" },
    id: { type: "string" },
    props: { type: "object", additionalProperties: true },
    styles: { $ref: "#/$defs/StyleObject" },
    responsiveStyles: { $ref: "#/$defs/ResponsiveStyles" },
    className: { type: "string" },
    children: {
      type: "array",
      items: { $ref: "#/$defs/SRNode" },
    },
    visible: { type: "boolean", default: true },
  },
  additionalProperties: false,
} as const;

const openGraphMetadataDef = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    image: { type: "string" },
    type: { type: "string" },
  },
  additionalProperties: false,
} as const;

const twitterMetadataDef = {
  type: "object",
  properties: {
    card: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    image: { type: "string" },
  },
  additionalProperties: false,
} as const;

const pageMetadataDef = {
  type: "object",
  required: ["title"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    url: { type: "string" },
    og: { $ref: "#/$defs/OpenGraphMetadata" },
    twitter: { $ref: "#/$defs/TwitterMetadata" },
    favicon: { type: "string" },
    fonts: { type: "array", items: { type: "string" } },
    analyticsId: { type: "string" },
  },
  additionalProperties: false,
} as const;

const themeTokensDef = {
  type: "object",
  required: ["colors", "fonts"],
  properties: {
    colors: {
      type: "object",
      required: ["primary", "secondary"],
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
        primaryText: { type: "string" },
        secondaryText: { type: "string" },
        background: { type: "string" },
        surface: { type: "string" },
      },
      additionalProperties: false,
    },
    fonts: {
      type: "object",
      required: ["primary", "secondary"],
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
      },
      additionalProperties: false,
    },
    custom: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
  additionalProperties: false,
} as const;

const pageDocumentSchema = {
  // Note: $schema omitted intentionally — Ajv 8 does not bundle the
  // draft-2020-12 meta-schema by default. The standalone .schema.json
  // file carries the canonical $schema URI for tooling / documentation.
  title: "PageDocument",
  type: "object",
  required: ["schemaVersion", "metadata", "theme", "body"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string" },
    metadata: { $ref: "#/$defs/PageMetadata" },
    theme: { $ref: "#/$defs/ThemeTokens" },
    symbols: {
      type: "object",
      additionalProperties: { $ref: "#/$defs/SRNode" },
    },
    body: {
      type: "array",
      items: { $ref: "#/$defs/SRNode" },
      minItems: 1,
    },
  },
  $defs: {
    StyleObject: styleObjectDef,
    ResponsiveStyles: responsiveStylesDef,
    SRNode: srNodeDef,
    OpenGraphMetadata: openGraphMetadataDef,
    TwitterMetadata: twitterMetadataDef,
    PageMetadata: pageMetadataDef,
    ThemeTokens: themeTokensDef,
  },
} as const;

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Format a single Ajv error into a human-readable string.
 */
function formatError(error: ErrorObject): string {
  const path = error.instancePath || "/";
  const message = error.message ?? "unknown error";

  if (error.keyword === "additionalProperties") {
    const extra = (error.params as { additionalProperty?: string }).additionalProperty;
    return `${path} has unexpected property "${extra}"`;
  }

  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    return `${path} is missing required property "${missing}"`;
  }

  return `${path} ${message}`;
}

// Module-level singleton — compiled once, reused on every call.
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true, validateSchema: false });
const validate = ajv.compile<PageDocument>(pageDocumentSchema);

/**
 * Validate an unknown value against the PageDocument JSON Schema.
 *
 * Returns `{ valid: true }` when the document is valid, or
 * `{ valid: false, errors: [...] }` with human-readable messages otherwise.
 */
export function validatePageDocument(doc: unknown): ValidationResult {
  const isValid = validate(doc);

  if (isValid) {
    return { valid: true };
  }

  const errors = (validate.errors ?? []).map(formatError);
  return { valid: false, errors };
}
