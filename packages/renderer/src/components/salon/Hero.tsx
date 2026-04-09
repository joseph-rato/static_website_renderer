import React from "react";

export function Hero({
  header,
  subhead,
  imageUrl,
  richText,
  showBookButton,
  bookButtonText = "Book Now",
  bookingUrl,
  style,
  ...rest
}: {
  header: string;
  subhead?: string;
  imageUrl?: string;
  richText?: string;
  showBookButton?: boolean;
  bookButtonText?: string;
  bookingUrl?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <section
      className="section header-section"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        textAlign: "center",
        padding: 0,
        position: "relative",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div className="header-content" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          className="tagline"
          style={{
            position: "relative",
            width: "100%",
            minHeight: "600px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div
            className={imageUrl ? "background-image" : "background-image tagline-no-image"}
            style={{
              position: "relative",
              width: "100%",
              minHeight: "600px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              ...(!imageUrl
                ? {
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                  }
                : {}),
            }}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Hero Background"
                className="tagline-image"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 1,
                }}
              />
            )}
            <div
              className="tagline-content"
              style={{
                position: "relative",
                zIndex: 2,
                textAlign: "center",
                maxWidth: "80%",
              }}
            >
              <h2
                style={{
                  fontSize: "48px",
                  fontWeight: 800,
                  color: "var(--color-secondary)",
                  marginBottom: "20px",
                  fontFamily: "var(--font-primary), serif",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  letterSpacing: "1px",
                  lineHeight: 1.2,
                }}
              >
                {header}
              </h2>
              {subhead && (
                <p
                  style={{
                    fontSize: "24px",
                    color: "white",
                    fontWeight: 400,
                    lineHeight: 1.6,
                    fontFamily: "var(--font-secondary), sans-serif",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                    maxWidth: "800px",
                    margin: "0 auto",
                  }}
                >
                  {subhead}
                </p>
              )}
            </div>
          </div>
        </div>

        {richText && (
          <div
            className="hero-text rich-text-content"
            style={{
              color: "white",
              fontSize: "1.2rem",
              lineHeight: 1.8,
              fontFamily: "var(--font-secondary), sans-serif",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
              maxWidth: "900px",
              margin: "20px auto 0",
              padding: "0 20px",
              textAlign: "left",
            }}
            dangerouslySetInnerHTML={{ __html: richText }}
          />
        )}

        {showBookButton && bookingUrl && (
          <div className="hero-cta" style={{ marginTop: "30px" }}>
            <a
              href={bookingUrl}
              className="hero-book-button"
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
                fontSize: "1.2rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
              {bookButtonText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
