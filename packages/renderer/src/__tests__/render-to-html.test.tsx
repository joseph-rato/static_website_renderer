import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { PageDocument } from "@pagoda/schema";
import { renderToHTML } from "../server.js";

// Load the example JSON
const examplePath = resolve(
  __dirname,
  "../../../schema/examples/salon-landing-page.json",
);
const exampleDoc: PageDocument = JSON.parse(
  readFileSync(examplePath, "utf-8"),
);

describe("renderToHTML", () => {
  it("produces a valid HTML document", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</body>");
    expect(html).toContain("</html>");
  });

  it("includes page title in <title> tag", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("<title>Welcome to Crown of Beauty");
  });

  it("includes meta description", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain('name="description"');
    expect(html).toContain("luxury beauty services");
  });

  it("includes OpenGraph tags", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:type"');
  });

  it("includes Twitter card tags", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:title"');
  });

  it("includes favicon links", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain('rel="icon"');
    expect(html).toContain('rel="apple-touch-icon"');
  });

  it("includes Google Fonts links", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("fonts.googleapis.com");
    expect(html).toContain("Abhaya+Libre");
    expect(html).toContain("Inter");
  });

  it("includes Google Analytics snippet", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("googletagmanager.com");
    expect(html).toContain("UA-123456789-1");
  });

  it("includes theme CSS custom properties", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("--color-primary: #FF6B6B");
    expect(html).toContain("--color-secondary: #4ECDC4");
    expect(html).toContain("--font-primary: Abhaya Libre");
    expect(html).toContain("--font-secondary: Inter");
  });

  it("renders all salon sections", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("announcement-modal");
    expect(html).toContain("navigation-bar");
    expect(html).toContain("banner-bar");
    expect(html).toContain("header-section"); // hero
    expect(html).toContain("services-section");
    expect(html).toContain("service-highlights-section");
    expect(html).toContain("team-section");
    expect(html).toContain("testimonials-section");
    expect(html).toContain("gallery-section");
    expect(html).toContain("find-us-section");
    expect(html).toContain("<footer");
  });

  it("renders announcement modal content", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Braiding Classes");
    expect(html).toContain("Braids &amp; Twist");
  });

  it("renders navigation links", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Home");
    expect(html).toContain("Services");
    expect(html).toContain("About");
    expect(html).toContain("Testimonials");
  });

  it("renders hero section", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Welcome to Crown of Beauty");
    expect(html).toContain("Your Premier Beauty Destination");
  });

  it("renders services with prices", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Hair Cut");
    expect(html).toContain("$50.00");
    expect(html).toContain("Starting at $120.00");
  });

  it("renders team members", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Sarah Johnson");
    expect(html).toContain("Michael Chen");
    expect(html).toContain("Emily Rodriguez");
  });

  it("renders testimonials", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Jane Doe");
    expect(html).toContain("John Smith");
  });

  it("renders gallery images", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("salon-interior.jpg");
    expect(html).toContain("stylist-at-work.jpg");
  });

  it("renders find-us with hours", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("123 Main Street");
    expect(html).toContain("(555) 123-4567");
    expect(html).toContain("9:00 AM - 6:00 PM");
  });

  it("renders footer", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("Crown of Beauty Salon");
    expect(html).toContain("Pagoda Labs");
  });

  it("includes critical CSS", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toContain("scroll-behavior: smooth");
    expect(html).toContain(".service-content.active");
    expect(html).toContain(".rich-text-content");
  });
});

describe("Determinism", () => {
  it("produces identical output for the same input", () => {
    const html1 = renderToHTML(exampleDoc);
    const html2 = renderToHTML(exampleDoc);
    expect(html1).toBe(html2);
  });

  it("produces identical output across multiple invocations", () => {
    const results = Array.from({ length: 5 }, () => renderToHTML(exampleDoc));
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(results[0]);
    }
  });
});

describe("Snapshot", () => {
  it("matches snapshot for full salon-landing-page.json", () => {
    const html = renderToHTML(exampleDoc);
    expect(html).toMatchSnapshot();
  });
});
