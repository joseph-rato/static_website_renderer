import React from "react";
import type { ServiceGroup } from "@pagoda/schema";

export function ServicesMenu({
  title,
  subtitle,
  content,
  body,
  menuNote,
  bookingUrl,
  serviceGroups,
  style,
  ...rest
}: {
  title: string;
  subtitle?: string;
  content?: string;
  body?: string;
  menuNote?: string;
  bookingUrl?: string;
  serviceGroups: ServiceGroup[];
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  const richContent = content ?? body;

  return (
    <section
      className="section services-section"
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
      <div className="section-container services-container" style={{ maxWidth: "992px", width: "100%", margin: "0 auto", textAlign: "center" }}>
        <h2
          className="section-title"
          style={{
            color: "var(--color-primary)",
            fontSize: "2.5rem",
            fontWeight: 700,
            marginBottom: "20px",
            fontFamily: "var(--font-primary), serif",
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p className="services-subtitle" style={{ fontSize: "1.3rem", color: "#6B7280", marginBottom: "20px", fontFamily: "var(--font-secondary), sans-serif" }}>
            {subtitle}
          </p>
        )}

        {richContent && (
          <div
            className="section-subtitle rich-text-content"
            style={{ maxWidth: "100%", margin: "0 auto 40px auto", textAlign: "left", fontFamily: "var(--font-secondary), sans-serif" }}
            dangerouslySetInnerHTML={{ __html: richContent }}
          />
        )}

        <div className="services-menu" style={{ fontFamily: "var(--font-secondary), Arial, sans-serif", width: "100%", padding: "20px 0 40px 0" }}>
          {/* Service category tabs */}
          <div className="service-tabs" style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {serviceGroups.map((group, index) => (
              <div
                key={group.category}
                className={`service-tab${index === 0 ? " active" : ""}`}
                data-service-type={group.category}
                style={{
                  padding: "12px 24px",
                  backgroundColor: index === 0 ? "var(--color-secondary)" : "var(--color-primary)",
                  color: index === 0 ? "#000" : "white",
                  cursor: "pointer",
                  border: "1px solid #000",
                }}
              >
                {group.category}
              </div>
            ))}
          </div>

          {/* Service content for each category */}
          {serviceGroups.map((group, groupIndex) => (
            <div
              key={group.category}
              className={`service-content${groupIndex === 0 ? " active" : ""}`}
              id={`content-${group.category}`}
              style={{
                display: groupIndex === 0 ? "block" : "none",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "50px 20px",
                width: "100%",
              }}
            >
              {menuNote && (
                <div className="pricing-note" style={{ textAlign: "center", fontSize: "14px", color: "#666", marginBottom: "20px", fontStyle: "italic" }}>
                  {menuNote}
                </div>
              )}

              <h2
                className="service-section-title"
                style={{
                  textAlign: "center",
                  color: "var(--color-primary)",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "25px",
                  marginTop: 0,
                }}
              >
                {group.category} &amp; Services
              </h2>

              <div
                className="services-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px 40px",
                  width: "100%",
                  padding: "20px",
                }}
              >
                {group.services.map((service) => (
                  <div key={service.id} className="service-item" style={{ paddingBottom: "12px" }}>
                    <div
                      className="service-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "10px",
                        position: "relative",
                      }}
                    >
                      <span className="service-name-wrapper" style={{ display: "flex", alignItems: "baseline", gap: "5px", flex: 1, minWidth: 0 }}>
                        <span className="service-name" style={{ fontWeight: 600, fontSize: "15px", color: "#333" }}>
                          {service.name}
                        </span>
                      </span>
                      <span
                        className="service-price"
                        style={{
                          textAlign: "right",
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          fontSize: "15px",
                          whiteSpace: "nowrap",
                          background: "white",
                          paddingLeft: "8px",
                        }}
                      >
                        {service.isVariablePrice
                          ? `Starting at $${service.price.toFixed(2)}`
                          : `$${service.price.toFixed(2)}`}
                      </span>
                    </div>
                    {service.description && (
                      <div
                        className="service-description"
                        style={{
                          color: "#666",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          marginTop: "3px",
                          textAlign: "left",
                          fontFamily: "var(--font-secondary), Arial, sans-serif",
                        }}
                      >
                        {service.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {bookingUrl && (
          <div style={{ marginTop: "20px" }}>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "var(--color-secondary)",
                color: "white",
                padding: "15px 40px",
                borderRadius: "30px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "1.1rem",
              }}
            >
              Book an Appointment
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
