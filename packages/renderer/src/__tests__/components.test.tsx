import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";

// Primitives
import { Heading } from "../components/primitives/Heading.js";
import { Text } from "../components/primitives/Text.js";
import { RichText } from "../components/primitives/RichText.js";
import { Image } from "../components/primitives/Image.js";
import { Link } from "../components/primitives/Link.js";
import { Icon } from "../components/primitives/Icon.js";
import { Div } from "../components/primitives/Div.js";
import { Section } from "../components/primitives/Section.js";
import { Span } from "../components/primitives/Span.js";

// Layout
import { FlexContainer } from "../components/layout/FlexContainer.js";
import { GridContainer } from "../components/layout/GridContainer.js";
import { Container } from "../components/layout/Container.js";

// Salon
import { Navigation } from "../components/salon/Navigation.js";
import { Banner } from "../components/salon/Banner.js";
import { AnnouncementModal } from "../components/salon/AnnouncementModal.js";
import { Hero } from "../components/salon/Hero.js";
import { ServicesMenu } from "../components/salon/ServicesMenu.js";
import { ServiceHighlights } from "../components/salon/ServiceHighlights.js";
import { Team } from "../components/salon/Team.js";
import { Testimonials } from "../components/salon/Testimonials.js";
import { Gallery } from "../components/salon/Gallery.js";
import { FindUs } from "../components/salon/FindUs.js";
import { Footer } from "../components/salon/Footer.js";

function render(element: React.ReactElement): string {
  return renderToString(element);
}

describe("Primitive components", () => {
  it("Heading renders correct tag level and text", () => {
    const html = render(<Heading level={2} text="Hello World" />);
    expect(html).toContain("<h2");
    expect(html).toContain("Hello World");
    expect(html).toContain("</h2>");
  });

  it("Heading renders h1 when level=1", () => {
    const html = render(<Heading level={1} text="Title" />);
    expect(html).toContain("<h1");
    expect(html).toContain("</h1>");
  });

  it("Text renders a paragraph", () => {
    const html = render(<Text text="Some text content" />);
    expect(html).toContain("<p");
    expect(html).toContain("Some text content");
    expect(html).toContain("</p>");
  });

  it("RichText renders HTML content with dangerouslySetInnerHTML", () => {
    const html = render(<RichText html="<strong>Bold</strong> text" />);
    expect(html).toContain("<strong>Bold</strong> text");
    expect(html).toContain("rich-text-content");
  });

  it("Image renders img tag with attributes", () => {
    const html = render(
      <Image src="https://example.com/img.jpg" alt="Test" width={100} loading="lazy" />,
    );
    expect(html).toContain('src="https://example.com/img.jpg"');
    expect(html).toContain('alt="Test"');
    expect(html).toContain('loading="lazy"');
  });

  it("Link renders anchor tag", () => {
    const html = render(
      <Link href="https://example.com" target="_blank">
        Click me
      </Link>,
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Click me");
  });

  it("Icon renders SVG", () => {
    const html = render(<Icon name="IconUser" size={32} color="red" />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="32"');
    expect(html).toContain('stroke="red"');
  });

  it("Icon renders fallback for unknown icon", () => {
    const html = render(<Icon name="UnknownIcon" />);
    expect(html).toContain("<circle");
  });

  it("Div renders a div", () => {
    const html = render(<Div>Content</Div>);
    expect(html).toContain("<div");
    expect(html).toContain("Content");
  });

  it("Section renders a section", () => {
    const html = render(<Section>Content</Section>);
    expect(html).toContain("<section");
    expect(html).toContain("Content");
  });

  it("Span renders a span", () => {
    const html = render(<Span>Content</Span>);
    expect(html).toContain("<span");
    expect(html).toContain("Content");
  });
});

describe("Layout components", () => {
  it("FlexContainer renders with flex styles", () => {
    const html = render(
      <FlexContainer direction="column" gap="16px" justify="center">
        <div>Item</div>
      </FlexContainer>,
    );
    expect(html).toContain("flex-direction:column");
    expect(html).toContain("gap:16px");
    expect(html).toContain("justify-content:center");
  });

  it("GridContainer renders with grid styles", () => {
    const html = render(
      <GridContainer columns="1fr 1fr" gap="20px">
        <div>Item</div>
      </GridContainer>,
    );
    expect(html).toContain("display:grid");
    expect(html).toContain("grid-template-columns:1fr 1fr");
  });

  it("Container renders with max-width", () => {
    const html = render(
      <Container maxWidth="800px">
        <div>Content</div>
      </Container>,
    );
    expect(html).toContain("max-width:800px");
    expect(html).toContain("margin:0 auto");
  });
});

describe("Salon components", () => {
  it("Navigation renders nav with links and CTA", () => {
    const html = render(
      <Navigation
        logoUrl="https://example.com/logo.png"
        logoAlt="Logo"
        bookingUrl="https://book.example.com"
        bookButtonText="Book Now"
        navLinks={[
          { label: "Home", anchor: "#home" },
          { label: "Services", anchor: "#services" },
          { label: "About", anchor: "#about" },
          { label: "Testimonials", anchor: "#testimonials" },
        ]}
      />,
    );
    expect(html).toContain("<nav");
    expect(html).toContain("navigation-bar");
    expect(html).toContain("Home");
    expect(html).toContain("Services");
    expect(html).toContain("About");
    expect(html).toContain("Testimonials");
    expect(html).toContain("Book Now");
    expect(html).toContain("logo.png");
  });

  it("Navigation renders with Banner child", () => {
    const html = render(
      <Navigation
        navLinks={[{ label: "Home", anchor: "#home" }]}
      >
        <Banner content="<p>Grand Opening!</p>" backgroundColor="#FF6B6B" />
      </Navigation>,
    );
    expect(html).toContain("banner-bar");
    expect(html).toContain("Grand Opening!");
  });

  it("Banner renders content and title", () => {
    const html = render(
      <Banner title="Sale" content="<p>50% off!</p>" backgroundColor="#FF0000" textColor="#FFF" />,
    );
    expect(html).toContain("banner-bar");
    expect(html).toContain("Sale");
    expect(html).toContain("50% off!");
  });

  it("AnnouncementModal renders with items and CTA", () => {
    const html = render(
      <AnnouncementModal
        title="New Classes!"
        body="<p>Sign up now</p>"
        items={["Braids", "Cornrows"]}
        callToAction="Call today!"
        backgroundColor="#FF6B6B"
        textColor="#FFFFFF"
      />,
    );
    expect(html).toContain("announcement-modal");
    expect(html).toContain("New Classes!");
    expect(html).toContain("Sign up now");
    expect(html).toContain("Braids");
    expect(html).toContain("Cornrows");
    expect(html).toContain("Call today!");
  });

  it("Hero renders header, subhead, and book button", () => {
    const html = render(
      <Hero
        header="Welcome"
        subhead="Your Destination"
        imageUrl="https://example.com/hero.jpg"
        showBookButton={true}
        bookButtonText="Book Now"
        bookingUrl="https://book.example.com"
      />,
    );
    expect(html).toContain("Welcome");
    expect(html).toContain("Your Destination");
    expect(html).toContain("hero.jpg");
    expect(html).toContain("Book Now");
  });

  it("Hero renders rich text", () => {
    const html = render(
      <Hero header="Title" richText="<p>Rich <strong>content</strong></p>" />,
    );
    expect(html).toContain("Rich <strong>content</strong>");
  });

  it("ServicesMenu renders tabs and services", () => {
    const html = render(
      <ServicesMenu
        title="Our Services"
        serviceGroups={[
          {
            category: "Hair",
            services: [
              { id: 1, name: "Hair Cut", price: 50, isVariablePrice: false, durationMins: 60 },
              { id: 2, name: "Hair Color", price: 120, isVariablePrice: true, durationMins: 120 },
            ],
          },
          {
            category: "Nails",
            services: [
              { id: 3, name: "Manicure", price: 35, isVariablePrice: false, durationMins: 45 },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain("Our Services");
    expect(html).toContain("Hair");
    expect(html).toContain("Nails");
    expect(html).toContain("Hair Cut");
    expect(html).toContain("$50.00");
    expect(html).toContain("Starting at $120.00");
    expect(html).toContain("Manicure");
  });

  it("ServiceHighlights renders highlights with icons", () => {
    const html = render(
      <ServiceHighlights
        highlights={[
          { icon: "IconHeartHandshake", title: "Care", body: "Top care" },
          { icon: "IconUser", title: "Personal", body: "Personalized" },
        ]}
      />,
    );
    expect(html).toContain("service-highlights-section");
    expect(html).toContain("Care");
    expect(html).toContain("Top care");
    expect(html).toContain("<svg");
  });

  it("Team renders members with photos", () => {
    const html = render(
      <Team
        title="Our Team"
        members={[
          {
            id: 1,
            firstName: "Sarah",
            lastName: "Johnson",
            title: "Stylist",
            photoUrl: "https://example.com/sarah.jpg",
          },
        ]}
      />,
    );
    expect(html).toContain("Our Team");
    expect(html).toContain("Sarah Johnson");
    expect(html).toContain("Stylist");
    expect(html).toContain("sarah.jpg");
  });

  it("Team renders placeholder for members without photo", () => {
    const html = render(
      <Team
        title="Team"
        members={[{ id: 1, firstName: "John", lastName: "Doe" }]}
      />,
    );
    expect(html).toContain("placeholder");
    expect(html).toContain("J"); // first initial
  });

  it("Testimonials renders carousel with first slide active", () => {
    const html = render(
      <Testimonials
        title="Reviews"
        testimonials={[
          { name: "Jane", content: "<p>Great!</p>", source: "Google" },
          { name: "John", content: "<p>Amazing!</p>" },
        ]}
      />,
    );
    expect(html).toContain("Reviews");
    expect(html).toContain("Jane");
    expect(html).toContain("Great!");
    expect(html).toContain("Google");
    expect(html).toContain("carousel-dot");
  });

  it("Gallery renders grid with images", () => {
    const html = render(
      <Gallery
        title="Photos"
        items={[
          { imageUrl: "https://example.com/1.jpg", title: "Photo 1" },
          { imageUrl: "https://example.com/2.jpg", title: "Photo 2" },
        ]}
      />,
    );
    expect(html).toContain("Photos");
    expect(html).toContain("gallery-grid");
    expect(html).toContain("1.jpg");
    expect(html).toContain("2.jpg");
  });

  it("FindUs renders map, address, phone, hours", () => {
    const html = render(
      <FindUs
        title="Find Us"
        showGoogleMaps={true}
        address="123 Main St"
        phone="555-1234"
        email="info@test.com"
        mapUrl="https://maps.google.com/embed"
        hours={{ monday: "9-5", tuesday: "9-5" }}
      />,
    );
    expect(html).toContain("Find Us");
    expect(html).toContain("123 Main St");
    expect(html).toContain("555-1234");
    expect(html).toContain("info@test.com");
    expect(html).toContain("iframe");
    expect(html).toContain("Monday");
    expect(html).toContain("9-5");
  });

  it("FindUs renders without map when showGoogleMaps is false", () => {
    const html = render(
      <FindUs title="Contact" showGoogleMaps={false} phone="555-0000" />,
    );
    expect(html).not.toContain("iframe");
    expect(html).toContain("555-0000");
  });

  it("Footer renders company info and socials", () => {
    const html = render(
      <Footer
        companyName="Beauty Salon"
        phone="555-1234"
        email="info@salon.com"
        bookingUrl="https://book.example.com"
        socials={{
          instagram: "https://instagram.com/salon",
          facebook: "https://facebook.com/salon",
        }}
      />,
    );
    expect(html).toContain("<footer");
    expect(html).toContain("Beauty Salon");
    expect(html).toContain("555-1234");
    expect(html).toContain("info@salon.com");
    expect(html).toContain("Pagoda Labs");
    expect(html).toContain("instagram.com/salon");
  });
});
