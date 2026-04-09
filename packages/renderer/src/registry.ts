import type React from "react";
import { COMPONENT_TYPES } from "@pagoda/schema";

// Primitives
import { Div } from "./components/primitives/Div.js";
import { Section } from "./components/primitives/Section.js";
import { Span } from "./components/primitives/Span.js";
import { Heading } from "./components/primitives/Heading.js";
import { Text } from "./components/primitives/Text.js";
import { RichText } from "./components/primitives/RichText.js";
import { Image } from "./components/primitives/Image.js";
import { Link } from "./components/primitives/Link.js";
import { Icon } from "./components/primitives/Icon.js";

// Layout
import { FlexContainer } from "./components/layout/FlexContainer.js";
import { GridContainer } from "./components/layout/GridContainer.js";
import { Container } from "./components/layout/Container.js";

// Salon
import { Navigation } from "./components/salon/Navigation.js";
import { Banner } from "./components/salon/Banner.js";
import { AnnouncementModal } from "./components/salon/AnnouncementModal.js";
import { Hero } from "./components/salon/Hero.js";
import { ServicesMenu } from "./components/salon/ServicesMenu.js";
import { ServiceHighlights } from "./components/salon/ServiceHighlights.js";
import { Team } from "./components/salon/Team.js";
import { Testimonials } from "./components/salon/Testimonials.js";
import { Gallery } from "./components/salon/Gallery.js";
import { FindUs } from "./components/salon/FindUs.js";
import { Footer } from "./components/salon/Footer.js";

// Special
import { SymbolRef } from "./components/special/SymbolRef.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyComponent = React.ComponentType<any>;

/**
 * Component registry: maps SRNode.type string → React component.
 * Extensible via registry.set() for plugins.
 */
export const registry = new Map<string, AnyComponent>([
  // Primitives
  [COMPONENT_TYPES.div, Div],
  [COMPONENT_TYPES.section, Section],
  [COMPONENT_TYPES.span, Span],
  [COMPONENT_TYPES.heading, Heading],
  [COMPONENT_TYPES.text, Text],
  [COMPONENT_TYPES.richText, RichText],
  [COMPONENT_TYPES.image, Image],
  [COMPONENT_TYPES.link, Link],
  [COMPONENT_TYPES.icon, Icon],

  // Layout
  [COMPONENT_TYPES.flexContainer, FlexContainer],
  [COMPONENT_TYPES.gridContainer, GridContainer],
  [COMPONENT_TYPES.container, Container],

  // Salon domain
  [COMPONENT_TYPES.navigation, Navigation],
  [COMPONENT_TYPES.banner, Banner],
  [COMPONENT_TYPES.announcementModal, AnnouncementModal],
  [COMPONENT_TYPES.hero, Hero],
  [COMPONENT_TYPES.servicesMenu, ServicesMenu],
  [COMPONENT_TYPES.serviceHighlights, ServiceHighlights],
  [COMPONENT_TYPES.team, Team],
  [COMPONENT_TYPES.testimonials, Testimonials],
  [COMPONENT_TYPES.gallery, Gallery],
  [COMPONENT_TYPES.findUs, FindUs],
  [COMPONENT_TYPES.footer, Footer],

  // Special
  [COMPONENT_TYPES.symbolRef, SymbolRef],
]);
