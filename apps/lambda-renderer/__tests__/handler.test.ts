import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { handler } from "../src/handler.js";

// Load example fixtures
const salonPage = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../packages/schema/examples/salon-landing-page.json"),
    "utf-8",
  ),
);

const minimalPage = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../packages/schema/examples/minimal-page.json"),
    "utf-8",
  ),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function directEvent(pageDocument: unknown) {
  return { pageDocument };
}

function apiGatewayEvent(body: string | null) {
  return {
    httpMethod: "POST",
    body,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: "/render",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as never,
    resource: "",
  };
}

// ---------------------------------------------------------------------------
// Integration tests — Direct invocation
// ---------------------------------------------------------------------------

describe("Lambda handler — direct invocation", () => {
  it("renders the full salon landing page to valid HTML", async () => {
    const result = await handler(directEvent(salonPage));

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("<!DOCTYPE html>");
    expect(result.body).toContain("<html");
    expect(result.body).toContain("</html>");
  });

  it("includes page title in the rendered HTML", async () => {
    const result = await handler(directEvent(salonPage));

    expect(result.body).toContain("Crown of Beauty");
  });

  it("includes key page sections in rendered output", async () => {
    const result = await handler(directEvent(salonPage));
    const html = result.body;

    // Navigation
    expect(html).toContain("Book Now");
    // Hero
    expect(html).toContain("Welcome to Crown of Beauty");
    // Services
    expect(html).toContain("Our Services");
    // Team
    expect(html).toContain("Our Team");
    // Testimonials
    expect(html).toContain("What Our Clients Say");
    // Find Us
    expect(html).toContain("123 Main Street");
  });

  it("renders the minimal page example", async () => {
    const result = await handler(directEvent(minimalPage));

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("<!DOCTYPE html>");
    expect(result.body).toContain("My Salon");
  });

  it("includes theme CSS custom properties", async () => {
    const result = await handler(directEvent(salonPage));

    expect(result.body).toContain("--color-primary");
    expect(result.body).toContain("#FF6B6B");
  });

  it("includes Google Fonts link", async () => {
    const result = await handler(directEvent(salonPage));

    expect(result.body).toContain("fonts.googleapis.com");
    expect(result.body).toContain("Abhaya+Libre");
  });

  it("includes analytics script", async () => {
    const result = await handler(directEvent(salonPage));

    expect(result.body).toContain("UA-123456789-1");
    expect(result.body).toContain("googletagmanager.com");
  });
});

// ---------------------------------------------------------------------------
// Integration tests — API Gateway
// ---------------------------------------------------------------------------

describe("Lambda handler — API Gateway", () => {
  it("renders valid PageDocument from JSON body", async () => {
    const event = apiGatewayEvent(JSON.stringify(minimalPage));
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("<!DOCTYPE html>");
  });

  it("returns 400 for missing body", async () => {
    const event = apiGatewayEvent(null);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Request body is required");
  });

  it("returns 400 for malformed JSON", async () => {
    const event = apiGatewayEvent("{not valid json");
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Invalid JSON in request body");
  });
});

// ---------------------------------------------------------------------------
// Validation error handling
// ---------------------------------------------------------------------------

describe("Lambda handler — validation errors", () => {
  it("returns 400 with errors for empty object", async () => {
    const result = await handler(directEvent({}));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Schema validation failed");
    expect(body.errors).toBeInstanceOf(Array);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("returns 400 when body array is missing", async () => {
    const result = await handler(
      directEvent({
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
      }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("body")]),
    );
  });

  it("returns 400 when pageDocument is null (direct invocation)", async () => {
    const result = await handler(directEvent(null));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("pageDocument is required");
  });

  it("returns descriptive messages for invalid schema", async () => {
    const result = await handler(
      directEvent({
        schemaVersion: "1.0.0",
        metadata: { title: "Test" },
        theme: {
          colors: { primary: "#000", secondary: "#fff" },
          fonts: { primary: "Arial", secondary: "Helvetica" },
        },
        body: [],
        extraField: true,
      }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.errors.length).toBeGreaterThan(0);
    // Should have human-readable messages
    body.errors.forEach((msg: string) => {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

describe("Lambda handler — performance", () => {
  it("renders the full salon page in under 200ms (warm)", async () => {
    // Warm up
    await handler(directEvent(salonPage));

    // Measure
    const start = performance.now();
    const result = await handler(directEvent(salonPage));
    const elapsed = performance.now() - start;

    expect(result.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(200);
  });

  it("produces deterministic output", async () => {
    const result1 = await handler(directEvent(salonPage));
    const result2 = await handler(directEvent(salonPage));

    expect(result1.body).toBe(result2.body);
  });
});
