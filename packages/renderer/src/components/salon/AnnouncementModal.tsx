import React from "react";

export function AnnouncementModal({
  title,
  body,
  items,
  callToAction,
  backgroundColor,
  textColor,
  style,
  ...rest
}: {
  title: string;
  body: string;
  items?: string[];
  callToAction?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <div
      className="announcement-modal"
      style={{
        backgroundColor: backgroundColor ?? "var(--color-primary)",
        color: textColor ?? "#FFFFFF",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center",
        maxWidth: "600px",
        margin: "20px auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "15px",
          color: textColor ?? "#FFFFFF",
          fontFamily: "var(--font-primary), serif",
        }}
      >
        {title}
      </h2>

      <div
        className="rich-text-content"
        style={{ marginBottom: "15px", lineHeight: 1.6, color: textColor ?? "#FFFFFF" }}
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {items && items.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "15px 0" }}>
          {items.map((item, index) => (
            <li
              key={index}
              style={{
                padding: "8px 0",
                fontSize: "1.1rem",
                fontWeight: 600,
                color: textColor ?? "#FFFFFF",
              }}
            >
              &bull; {item}
            </li>
          ))}
        </ul>
      )}

      {callToAction && (
        <p
          style={{
            marginTop: "15px",
            fontWeight: 600,
            fontSize: "1.1rem",
            fontStyle: "italic",
            color: textColor ?? "#FFFFFF",
          }}
        >
          {callToAction}
        </p>
      )}
    </div>
  );
}
