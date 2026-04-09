import React from "react";
import type { SocialLinks } from "@pagoda/schema";

export function Footer({
  companyName,
  phone,
  email,
  address,
  bookingUrl,
  socials,
  style,
  ...rest
}: {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  bookingUrl?: string;
  socials?: SocialLinks;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <footer
      className="footer-section"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "white",
        width: "100%",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div
        className="footer-container"
        style={{
          width: "100%",
          position: "relative",
          minHeight: "200px",
          padding: "40px 20px 20px 20px",
          boxSizing: "border-box",
        }}
      >
        {/* Central content */}
        <div className="footer-center" style={{ textAlign: "center", marginBottom: "40px" }}>
          {companyName && (
            <p
              className="footer-brand"
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#FFD700",
                margin: 0,
                fontFamily: "var(--font-primary), serif",
              }}
            >
              {companyName}
            </p>
          )}

          {/* Contact details */}
          {(phone ?? email ?? address) && (
            <div style={{ marginTop: "15px", fontSize: "14px", color: "#F5F5DC" }}>
              {address && <p style={{ margin: "5px 0", color: "#F5F5DC" }}>{address}</p>}
              {phone && <p style={{ margin: "5px 0", color: "#F5F5DC" }}>{phone}</p>}
              {email && (
                <p style={{ margin: "5px 0" }}>
                  <a href={`mailto:${email}`} style={{ color: "#F5F5DC", textDecoration: "none" }}>
                    {email}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Social icons */}
          {socials && (
            <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "20px" }}>
              {socials.instagram && (
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "white", textDecoration: "none" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="5" />
                    <path d="M17.5 6.5h.01" />
                  </svg>
                </a>
              )}
              {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: "white", textDecoration: "none" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              )}
              {socials.twitter && (
                <a href={socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" style={{ color: "white", textDecoration: "none" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                  </svg>
                </a>
              )}
              {socials.tiktok && (
                <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={{ color: "white", textDecoration: "none" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Booking CTA */}
          {bookingUrl && (
            <div style={{ marginTop: "20px" }}>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "var(--color-secondary)",
                  color: "var(--color-primary)",
                  padding: "12px 32px",
                  borderRadius: "25px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                Book Now
              </a>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div
          className="footer-left"
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            textAlign: "left",
          }}
        >
          <p className="footer-copyright" style={{ fontSize: "14px", color: "#F5F5DC", margin: "5px 0", fontFamily: "var(--font-secondary), Georgia, serif", lineHeight: 1.4 }}>
            Designed &amp; Built by Pagoda Labs, Inc.
          </p>
          {companyName && (
            <p className="footer-copyright" style={{ fontSize: "14px", color: "#F5F5DC", margin: "5px 0", fontFamily: "var(--font-secondary), Georgia, serif", lineHeight: 1.4 }}>
              &copy; {companyName}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
