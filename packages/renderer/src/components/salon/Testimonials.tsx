import React from "react";
import type { Testimonial } from "@pagoda/schema";

export function Testimonials({
  title,
  subtitle,
  richText,
  testimonials,
  style,
  ...rest
}: {
  title: string;
  subtitle?: string;
  richText?: string;
  testimonials: Testimonial[];
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <section
      className="section testimonials-section"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "40px",
        padding: "50px 20px",
        width: "100%",
        background: "var(--color-secondary)",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div
        className="section-container testimonials-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          maxWidth: "992px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "white",
            marginBottom: "40px",
            textAlign: "center",
            fontFamily: "var(--font-primary), serif",
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            className="testimonials-subtitle"
            style={{
              fontSize: "1.2rem",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "20px",
              fontFamily: "var(--font-secondary), sans-serif",
            }}
          >
            {subtitle}
          </p>
        )}

        {richText && (
          <div
            className="testimonials-intro rich-text-content"
            style={{
              maxWidth: "800px",
              margin: "0 auto 40px",
              color: "rgba(255,255,255,0.95)",
              fontSize: "1.1rem",
              lineHeight: 1.8,
            }}
            dangerouslySetInnerHTML={{ __html: richText }}
          />
        )}

        {/* Carousel — SSR renders the first slide as active */}
        <div
          className="testimonials-carousel"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="testimonials-slides"
            style={{ position: "relative", width: "100%", height: "300px", overflow: "hidden" }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`testimonial-slide${index === 0 ? " active" : ""}`}
                data-index={index}
                style={{
                  position: index === 0 ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: index === 0 ? 1 : 0,
                }}
              >
                <div
                  className="testimonial-card"
                  style={{
                    background: "white",
                    borderTopLeftRadius: "10px",
                    borderTopRightRadius: "50px",
                    borderBottomLeftRadius: "50px",
                    borderBottomRightRadius: "10px",
                    padding: "30px",
                    textAlign: "center",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    boxShadow: "0px 1px 10px 1px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    className="testimonial-content"
                    style={{
                      color: "#495057",
                      fontSize: "16px",
                      lineHeight: 1.6,
                      marginBottom: "20px",
                      fontFamily: "var(--font-secondary), sans-serif",
                      fontStyle: "italic",
                      flexGrow: 1,
                    }}
                    dangerouslySetInnerHTML={{ __html: testimonial.content }}
                  />
                  <div
                    className="testimonial-author"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "15px",
                      marginTop: "20px",
                    }}
                  >
                    {testimonial.pictureUrl && (
                      <img
                        src={testimonial.pictureUrl}
                        alt={testimonial.name}
                        className="author-image"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid var(--color-secondary)",
                        }}
                      />
                    )}
                    <div className="author-info" style={{ textAlign: "left" }}>
                      <h4
                        className="testimonial-name"
                        style={{
                          color: "var(--color-primary)",
                          fontSize: "18px",
                          fontWeight: 700,
                          margin: 0,
                          fontFamily: "var(--font-primary), serif",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {testimonial.name}
                      </h4>
                      {testimonial.source && (
                        <p
                          className="testimonial-source"
                          style={{ color: "#6c757d", fontSize: "14px", margin: "5px 0 0", fontStyle: "italic" }}
                        >
                          {testimonial.source}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation dots */}
        <div className="carousel-dots" style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "30px" }}>
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot${index === 0 ? " active" : ""}`}
              data-index={index}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: index === 0 ? "var(--color-primary)" : "#ddd",
                border: "none",
                cursor: "pointer",
                transform: index === 0 ? "scale(1.2)" : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
