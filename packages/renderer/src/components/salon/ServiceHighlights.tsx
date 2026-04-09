import React from "react";
import type { ServiceHighlight } from "@pagoda/schema";
import { Icon } from "../primitives/Icon.js";

export function ServiceHighlights({
  highlights,
  style,
  ...rest
}: {
  highlights: ServiceHighlight[];
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <section
      className="section service-highlights-section"
      style={{
        background: "var(--color-secondary)",
        color: "white",
        textAlign: "center",
        padding: "60px 20px",
        width: "100%",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div
        className="highlights-content"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "row",
          gap: "40px",
          alignItems: "center",
          justifyContent: "space-evenly",
          flexWrap: "wrap",
        }}
      >
        {highlights.map((highlight, index) => (
          <div
            key={index}
            className="highlight-item"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              width: "240px",
            }}
          >
            <Icon name={highlight.icon} size={80} color="white" style={{ opacity: 0.9 }} />
            {highlight.title && (
              <h2 style={{ fontSize: "20px", margin: 0, color: "white", borderBottom: "2px solid rgba(255,255,255,0.3)", paddingBottom: "10px" }}>
                {highlight.title}
              </h2>
            )}
            {highlight.body && (
              <p style={{ fontSize: "20px", lineHeight: 1.8, opacity: 0.95, margin: 0 }}>
                {highlight.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
