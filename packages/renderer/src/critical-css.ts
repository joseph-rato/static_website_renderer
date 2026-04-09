import type { ThemeTokens } from "@pagoda/schema";

/**
 * Returns critical CSS that should be inlined in the <head>.
 * These styles match the patterns from the reference Jinja2 HTML output.
 */
export function getCriticalCSS(theme: ThemeTokens): string {
  const primary = theme.colors.primary;
  const secondary = theme.colors.secondary;
  const primaryFont = theme.fonts.primary;
  const secondaryFont = theme.fonts.secondary;

  return `
/* Reset & base */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { overflow-x: hidden; width: 100%; max-width: 100%; }
html { scroll-behavior: smooth; }

body {
  font-family: "${secondaryFont}", "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: white;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Font config */
h1, h2, h3, h4, h5, h6 {
  font-family: "${primaryFont}", serif;
  font-weight: 700;
  color: ${primary};
  margin-bottom: 15px;
  letter-spacing: 0.5px;
}

p {
  font-family: "${secondaryFont}", "Inter", sans-serif;
  font-size: 1.1rem;
  line-height: 1.7;
  color: #495057;
  margin-bottom: 15px;
}

a { color: ${primary}; text-decoration: none; transition: color 0.3s ease; }

/* Rich text */
.rich-text-content { line-height: 1.6; color: #333; }
.rich-text-content p { margin-bottom: 1em; }
.rich-text-content ul, .rich-text-content ol { margin: 1em 0; padding-left: 2em; }
.rich-text-content li { margin-bottom: 0.5em; }
.rich-text-content strong, .rich-text-content b { font-weight: 700; }
.rich-text-content em, .rich-text-content i { font-style: italic; }
.rich-text-content a { color: ${primary}; text-decoration: underline; }

/* Service tabs JS interaction */
.service-tab { cursor: pointer; transition: background-color 0.3s; }
.service-tab.active { background-color: ${secondary}; color: #000; }
.service-content { display: none; }
.service-content.active { display: block; }

/* Service header dotted line */
.service-header { position: relative; }
.service-header::after {
  content: '';
  position: absolute;
  bottom: 0.3em;
  left: 0;
  right: 0;
  border-bottom: 2px dotted #ccc;
  z-index: 0;
  margin: 0 5px;
}
.service-name { position: relative; z-index: 1; background: white; padding-right: 4px; }
.service-price { position: relative; z-index: 1; background: white; padding-left: 8px; }

/* Testimonial carousel SSR state */
.testimonial-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; }
.testimonial-slide.active { position: relative; opacity: 1; }

/* Navigation hover effects */
.nav-link:hover { text-decoration: underline; }
.cta-button:hover { opacity: 0.9; }

/* Responsive breakpoints */
@media (max-width: 768px) {
  .highlights-content { flex-direction: column !important; align-items: center !important; }
  .team-grid { flex-direction: column !important; align-items: center !important; }
  .team-member { max-width: 100% !important; }
  .find-us-content { grid-template-columns: 1fr !important; }
  .gallery-row { flex-direction: column !important; }
  .gallery-item { flex: 1 1 100% !important; width: 100% !important; }
  .services-grid { grid-template-columns: 1fr !important; }
  .footer-container { display: flex !important; flex-direction: column !important; align-items: center !important; min-height: auto !important; }
  .footer-left { position: static !important; text-align: center !important; }
}

@media (max-width: 1000px) {
  .services-grid { grid-template-columns: 1fr !important; }
  .service-tabs { gap: 0 !important; flex-wrap: nowrap !important; }
  .service-tab { flex: 1 1 0 !important; min-width: 0 !important; text-align: center !important; }
}

/* Animations */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
}
