import React from "react";
import type { GalleryItem } from "@pagoda/schema";

export function Gallery({
  title,
  gridLayout = "uniform",
  items,
  style,
  ...rest
}: {
  title: string;
  gridLayout?: string;
  items: GalleryItem[];
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  // Split items into rows of 3
  const rows: GalleryItem[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }

  return (
    <section
      className="section gallery-section"
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
      <div
        className="section-container gallery-container"
        style={{ maxWidth: "992px", width: "100%", margin: "0 auto", textAlign: "center" }}
      >
        <h2
          style={{
            fontFamily: "var(--font-primary), serif",
            fontSize: "2.5rem",
            color: "var(--color-primary)",
            marginBottom: "40px",
          }}
        >
          {title}
        </h2>

        <div
          className={`gallery-grid ${gridLayout === "middle_expand" ? "middle-expand" : ""}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            width: "100%",
            maxWidth: "992px",
            marginTop: "40px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="gallery-row"
              style={{ display: "flex", gap: "20px", alignItems: "stretch", width: "100%" }}
            >
              {row.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="gallery-item"
                  style={{
                    overflow: "hidden",
                    borderRadius: "8px",
                    flex: "1 1 calc(33.333% - 14px)",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title ?? `Gallery Image ${rowIndex * 3 + itemIndex + 1}`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      borderRadius: "8px",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
