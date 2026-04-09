import React from "react";
import type { NavLink } from "@pagoda/schema";

export function Navigation({
  logoUrl,
  logoAlt,
  bookingUrl,
  bookButtonText = "Book Now",
  navLinks = [],
  style,
  children,
  ...rest
}: React.PropsWithChildren<{
  logoUrl?: string;
  logoAlt?: string;
  bookingUrl?: string;
  bookButtonText?: string;
  navLinks?: NavLink[];
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}>) {
  const midpoint = Math.ceil(navLinks.length / 2);
  const leftLinks = navLinks.slice(0, midpoint);
  const rightLinks = navLinks.slice(midpoint);

  return (
    <nav
      className="navigation-bar"
      style={{
        position: "relative",
        background: "var(--color-primary)",
        borderBottom: "1px solid var(--color-secondary)",
        zIndex: 1000,
        width: "100%",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      {/* Banner child renders before the nav bar */}
      {children}

      <div
        className="nav-container"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70px",
          position: "relative",
        }}
      >
        <div
          className="nav-full-screen-center-items"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "40px",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Left nav links */}
          <div className="nav-links-left" style={{ display: "flex", gap: "40px", alignItems: "center" }}>
            {leftLinks.map((link) => (
              <a
                key={link.anchor}
                href={link.anchor}
                className="nav-link"
                style={{
                  color: "var(--color-secondary)",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "1rem",
                  fontFamily: "var(--font-primary), Georgia, serif",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  transition: "all 0.3s ease",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Center logo */}
          {logoUrl && (
            <div className="nav-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="logo-component" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={logoUrl}
                  alt={logoAlt ?? ""}
                  className="logo-image"
                  style={{ height: "50px", width: "auto", objectFit: "contain" }}
                />
              </div>
            </div>
          )}

          {/* Right nav links */}
          <div className="nav-links-right" style={{ display: "flex", gap: "40px", alignItems: "center" }}>
            {rightLinks.map((link) => (
              <a
                key={link.anchor}
                href={link.anchor}
                className="nav-link"
                style={{
                  color: "var(--color-secondary)",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "1rem",
                  fontFamily: "var(--font-primary), Georgia, serif",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  transition: "all 0.3s ease",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* CTA button */}
        {bookingUrl && (
          <div className="nav-right" style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
            <div className="nav-cta" style={{ display: "flex", alignItems: "center" }}>
              <a
                href={bookingUrl}
                className="cta-button"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "var(--color-secondary)",
                  color: "var(--color-primary)",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-primary), Georgia, serif",
                  border: "2px solid var(--color-secondary)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {bookButtonText}
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
