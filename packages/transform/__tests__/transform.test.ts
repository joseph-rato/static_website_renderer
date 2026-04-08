import { describe, it, expect } from "vitest";
import { transform } from "../src/transform.js";
import { validatePageDocument, SCHEMA_VERSION } from "@pagoda/schema";
import type { PreviewInput } from "../src/legacy-types/preview-input.js";
import type { DatabaseData } from "../src/legacy-types/database-data.js";

// Minimal valid preview input
const minimalPreviewInput: PreviewInput = {
  color: { primary_color: "#FF0000", secondary_color: "#0000FF" },
  font: { primary_font: "Times New Roman", secondary_font: "Arial" },
  hero_section: { header: "Welcome" },
  our_services: { header: "Services" },
  find_us: { title: "Find Us", google_maps: false },
  booking_link: { url: "https://book.example.com" },
};

// Minimal valid database data
const minimalDatabaseData: DatabaseData = {
  company_name: "Test Salon",
  salon_uuid: "test-uuid-123",
  logo_data: {
    image_url: "https://example.com/logo.png",
    logo_alt_text: "Test Logo",
    logo_width: 200,
    logo_height: 100,
  },
  contact_details: {
    phone: "(555) 000-0000",
    email: "test@example.com",
    hours: {
      monday: "9-5",
      tuesday: "9-5",
      wednesday: "9-5",
      thursday: "9-5",
      friday: "9-5",
      saturday: "10-3",
      sunday: "Closed",
    },
    address: "123 Test St",
  },
  location_data: {
    address: "123 Test St",
    latitude: 40.0,
    longitude: -74.0,
    map_url: "https://maps.google.com/?q=123+Test+St",
    directions: "Near the park",
    timezone: "America/New_York",
  },
  services_data: { services: [] },
  staff_data: { staff_members: [] },
  website_url: "https://example.com",
  timezone: "America/New_York",
};

// Full preview input (mirrors complete_preview_input.json)
const fullPreviewInput: PreviewInput = {
  company_name: "Crown of Beauty Salon",
  color: { primary_color: "#FF6B6B", secondary_color: "#4ECDC4" },
  font: { primary_font: "Abhaya Libre", secondary_font: "Inter" },
  hero_section: {
    header: "Welcome to Crown of Beauty",
    subhead: "Your Premier Beauty Destination",
    include_book_now_button: true,
    image: "https://example.com/hero-image.jpg",
    text: "<p>Experience luxury beauty services.</p>",
    book_link_copy: "Book Your Appointment",
  },
  our_services: {
    header: "Our Services",
    subtitle: "Professional Beauty Services",
    subtext: "<p>Comprehensive beauty services.</p>",
  },
  service_highlights: {
    highlights: [
      { icon: "IconHeartHandshake", title: "Hair Styling", body: "Professional cuts" },
      { icon: "IconUser", title: "Hair Coloring", body: "Expert coloring" },
    ],
  },
  testimonials: {
    title: "What Our Clients Say",
    subtitle: "Read their experiences",
    testimonials: [
      { name: "Jane", content: "<p>Amazing!</p>", source: "Google" },
    ],
  },
  gallery: {
    title: "Photos",
    items: [
      { image_url: "https://example.com/g1.jpg", title: "Interior" },
    ],
  },
  banner: {
    title: "Grand Opening",
    content: "<p>20% off!</p>",
    text_color: "#FFFFFF",
    background_color: "#FF6B6B",
  },
  team: {
    title: "Our Team",
    text: "<p>Meet our talented professionals.</p>",
  },
  socials: {
    instagram_url: "https://instagram.com/test",
    facebook_url: "https://facebook.com/test",
  },
  find_us: {
    title: "Call to schedule an appointment.",
    google_maps: true,
  },
  booking_link: {
    url: "https://book.getpagoda.com/book?salonId=test",
    title: "Book Now",
  },
  announcement_modal: {
    title: "New Classes!",
    body: "<p>We offer braiding classes.</p>",
    items: ["Braids", "Cornrows"],
    call_to_action: "Call us today!",
    background_color: "#FF6B6B",
    text_color: "#FFFFFF",
  },
};

const fullDatabaseData: DatabaseData = {
  company_name: "Crown of Beauty Salon",
  salon_uuid: "e9774c5d-8e08-45bd-8170-e2b645a465a6",
  logo_data: {
    image_url: "https://example.com/logos/crown.png",
    logo_alt_text: "Crown of Beauty Logo",
    logo_width: 200,
    logo_height: 100,
  },
  contact_details: {
    phone: "(555) 123-4567",
    email: "info@crownofbeauty.com",
    hours: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 7:00 PM",
      friday: "9:00 AM - 7:00 PM",
      saturday: "10:00 AM - 4:00 PM",
      sunday: "Closed",
    },
    address: "123 Main Street, Boston, MA 02101",
  },
  location_data: {
    address: "123 Main Street, Boston, MA 02101",
    latitude: 42.3601,
    longitude: -71.0589,
    map_url: "https://maps.google.com/?q=Crown+of+Beauty",
    directions: "Downtown Boston",
    timezone: "America/New_York",
  },
  services_data: {
    services: [
      {
        id: 1, uuid: "s1", name: "Hair Cut", description: "Professional haircut",
        service_type: "Hair", default_price: 50, default_is_variable_price: false, default_duration_mins: 60,
      },
      {
        id: 2, uuid: "s2", name: "Facial", description: "Rejuvenating facial",
        service_type: "Facial", default_price: 80, default_is_variable_price: false, default_duration_mins: 90,
      },
    ],
  },
  staff_data: {
    staff_members: [
      {
        id: 1, first_name: "Sarah", last_name: "Johnson", position: "Owner",
        title: "Master Stylist", bio: "15 years experience",
        photo_url: "https://example.com/staff/sarah.jpg",
        email: "sarah@test.com", phone: "(555) 111-1111",
        specialties: ["Hair Styling", "Color"],
      },
    ],
  },
  website_url: "https://crownofbeauty.com",
  timezone: "America/New_York",
  google_analytics_tracking_id: "UA-123456789-1",
};

describe("transform", () => {
  describe("minimal input", () => {
    it("produces a valid PageDocument from minimal data", () => {
      const doc = transform(minimalPreviewInput, minimalDatabaseData);
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("sets the correct schema version", () => {
      const doc = transform(minimalPreviewInput, minimalDatabaseData);
      expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    });

    it("maps theme colors and fonts", () => {
      const doc = transform(minimalPreviewInput, minimalDatabaseData);
      expect(doc.theme.colors.primary).toBe("#FF0000");
      expect(doc.theme.colors.secondary).toBe("#0000FF");
      expect(doc.theme.fonts.primary).toBe("Times New Roman");
      expect(doc.theme.fonts.secondary).toBe("Arial");
    });

    it("includes only always-rendered sections (no optional sections)", () => {
      const doc = transform(minimalPreviewInput, minimalDatabaseData);
      const types = doc.body.map((n) => n.type);
      // Must have: navigation, hero, services-menu, find-us, footer
      expect(types).toContain("navigation");
      expect(types).toContain("hero");
      expect(types).toContain("services-menu");
      expect(types).toContain("find-us");
      expect(types).toContain("footer");
      // Must NOT have optional sections
      expect(types).not.toContain("announcement-modal");
      expect(types).not.toContain("service-highlights");
      expect(types).not.toContain("team");
      expect(types).not.toContain("testimonials");
      expect(types).not.toContain("gallery");
    });

    it("derives nav links for only Home and Services", () => {
      const doc = transform(minimalPreviewInput, minimalDatabaseData);
      const nav = doc.body.find((n) => n.type === "navigation");
      const navLinks = (nav?.props as Record<string, unknown>)?.navLinks as Array<{ label: string }>;
      expect(navLinks).toHaveLength(2);
      expect(navLinks[0]!.label).toBe("Home");
      expect(navLinks[1]!.label).toBe("Services");
    });
  });

  describe("full input", () => {
    it("produces a valid PageDocument from full data", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const result = validatePageDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("includes all sections in correct order", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const types = doc.body.map((n) => n.type);
      expect(types).toEqual([
        "announcement-modal",
        "navigation",
        "hero",
        "services-menu",
        "service-highlights",
        "team",
        "testimonials",
        "gallery",
        "find-us",
        "footer",
      ]);
    });

    it("groups services by service_type", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const servicesMenu = doc.body.find((n) => n.type === "services-menu");
      const groups = (servicesMenu?.props as Record<string, unknown>)?.serviceGroups as Array<{
        category: string;
        services: unknown[];
      }>;
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.category).sort()).toEqual(["Facial", "Hair"]);
    });

    it("maps staff members with camelCase keys", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const team = doc.body.find((n) => n.type === "team");
      const members = (team?.props as Record<string, unknown>)?.members as Array<Record<string, unknown>>;
      expect(members).toHaveLength(1);
      expect(members[0]!.firstName).toBe("Sarah");
      expect(members[0]!.lastName).toBe("Johnson");
      expect(members[0]!.photoUrl).toBe("https://example.com/staff/sarah.jpg");
    });

    it("derives nav links including About and Testimonials", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const nav = doc.body.find((n) => n.type === "navigation");
      const navLinks = (nav?.props as Record<string, unknown>)?.navLinks as Array<{ label: string }>;
      expect(navLinks).toHaveLength(4);
      expect(navLinks.map((l) => l.label)).toEqual(["Home", "Services", "About", "Testimonials"]);
    });

    it("adds banner as child of navigation", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const nav = doc.body.find((n) => n.type === "navigation");
      expect(nav?.children).toHaveLength(1);
      expect(nav?.children![0]!.type).toBe("banner");
    });

    it("maps metadata correctly", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      expect(doc.metadata.favicon).toBe("https://example.com/logos/crown.png");
      expect(doc.metadata.fonts).toEqual(["Abhaya Libre", "Inter"]);
      expect(doc.metadata.analyticsId).toBe("UA-123456789-1");
      expect(doc.metadata.url).toBe("https://crownofbeauty.com");
    });

    it("maps socials to find-us props", () => {
      const doc = transform(fullPreviewInput, fullDatabaseData);
      const findUs = doc.body.find((n) => n.type === "find-us");
      const socials = (findUs?.props as Record<string, unknown>)?.socials as Record<string, unknown>;
      expect(socials?.instagram).toBe("https://instagram.com/test");
      expect(socials?.facebook).toBe("https://facebook.com/test");
    });
  });

  describe("determinism", () => {
    it("produces identical output for the same input", () => {
      const doc1 = transform(fullPreviewInput, fullDatabaseData);
      const doc2 = transform(fullPreviewInput, fullDatabaseData);
      expect(JSON.stringify(doc1)).toBe(JSON.stringify(doc2));
    });
  });
});
