import React from "react";
import type { SocialLinks } from "@pagoda/schema";

export function FindUs({
  title,
  subtitle,
  showGoogleMaps,
  address,
  phone,
  email,
  latitude,
  longitude,
  mapUrl,
  hours,
  socials,
  style,
  ...rest
}: {
  title: string;
  subtitle?: string;
  showGoogleMaps: boolean;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  hours?: Record<string, string>;
  socials?: SocialLinks;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  const hasMap = showGoogleMaps && (mapUrl ?? (latitude && longitude));

  return (
    <section
      className="section find-us-section"
      style={{
        backgroundColor: "white",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 20px",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div className="section-container find-us-container" style={{ maxWidth: "992px", width: "100%", margin: "0 auto", padding: "40px 0" }}>
        <div
          className={`find-us-content${hasMap ? "" : " no-maps"}`}
          style={{
            display: "grid",
            gridTemplateColumns: hasMap ? "1fr 1fr" : "1fr",
            alignItems: "start",
            textAlign: "left",
            gap: "60px",
            maxWidth: "992px",
            margin: "0 auto",
          }}
        >
          {/* Map column */}
          {hasMap && (
            <div
              className="maps-column"
              style={{
                background: "white",
                borderRadius: "15px",
                overflow: "hidden",
                boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
              }}
            >
              <div className="maps-container" style={{ width: "100%", height: "100%" }}>
                {mapUrl ? (
                  <iframe
                    className="google-maps-iframe"
                    src={mapUrl}
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    loading="lazy"
                    title="Google Maps Location"
                  />
                ) : latitude && longitude ? (
                  <iframe
                    className="google-maps-iframe"
                    src={`https://maps.google.com/maps?q=${latitude},${longitude}&output=embed`}
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    loading="lazy"
                    title="Google Maps Location"
                  />
                ) : null}
              </div>
            </div>
          )}

          {/* Contact info column */}
          <div className="contact-info-column" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
            <h2
              className="find-us-title"
              style={{
                fontFamily: "var(--font-primary), serif",
                fontSize: "2.5rem",
                color: "var(--color-primary)",
                marginBottom: "15px",
                textAlign: "left",
              }}
            >
              {title}
            </h2>

            {subtitle && (
              <p className="find-us-subtitle" style={{ fontSize: "1.2rem", color: "#6B7280", marginBottom: "30px", textAlign: "left" }}>
                {subtitle}
              </p>
            )}

            <div className="contact-details" style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              {address && (
                <div className="contact-detail-item">
                  <h2
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "26px",
                      marginBottom: "8px",
                      fontFamily: "var(--font-primary), serif",
                      textAlign: "left",
                    }}
                  >
                    Address
                  </h2>
                  <p style={{ color: "#495057", fontSize: "20px", lineHeight: 1.5, fontFamily: "var(--font-secondary), sans-serif" }}>
                    {address}
                  </p>
                </div>
              )}

              {phone && (
                <div className="contact-detail-item">
                  <h2
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "26px",
                      marginBottom: "8px",
                      fontFamily: "var(--font-primary), serif",
                      textAlign: "left",
                    }}
                  >
                    Phone
                  </h2>
                  <p style={{ color: "#495057", fontSize: "20px", lineHeight: 1.5, fontFamily: "var(--font-secondary), sans-serif" }}>
                    {phone}
                  </p>
                </div>
              )}

              {email && (
                <div className="contact-detail-item">
                  <h2
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "26px",
                      marginBottom: "8px",
                      fontFamily: "var(--font-primary), serif",
                      textAlign: "left",
                    }}
                  >
                    Email
                  </h2>
                  <p style={{ color: "#495057", fontSize: "20px", lineHeight: 1.5, fontFamily: "var(--font-secondary), sans-serif" }}>
                    <a href={`mailto:${email}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                      {email}
                    </a>
                  </p>
                </div>
              )}

              {hours && Object.keys(hours).length > 0 && (
                <div className="contact-detail-item">
                  <h2
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "26px",
                      marginBottom: "8px",
                      fontFamily: "var(--font-primary), serif",
                      textAlign: "left",
                    }}
                  >
                    Hours of Operation
                  </h2>
                  {Object.entries(hours).map(([day, time]) => (
                    <p key={day} style={{ color: "#495057", fontSize: "20px", lineHeight: 1.5, marginBottom: "4px", fontFamily: "var(--font-secondary), sans-serif" }}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}: {time}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Social media icons */}
            {socials && (
              <div className="social-icons-container" style={{ display: "flex", gap: "15px", marginTop: "30px", justifyContent: "flex-start" }}>
                {socials.instagram && (
                  <a
                    href={socials.instagram}
                    className="social-icon"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", textDecoration: "none" }}
                    aria-label="Instagram"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="5" />
                      <path d="M17.5 6.5h.01" />
                    </svg>
                  </a>
                )}
                {socials.facebook && (
                  <a
                    href={socials.facebook}
                    className="social-icon"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", textDecoration: "none" }}
                    aria-label="Facebook"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                )}
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    className="social-icon"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", textDecoration: "none" }}
                    aria-label="Twitter"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                    </svg>
                  </a>
                )}
                {socials.tiktok && (
                  <a
                    href={socials.tiktok}
                    className="social-icon"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", textDecoration: "none" }}
                    aria-label="TikTok"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
