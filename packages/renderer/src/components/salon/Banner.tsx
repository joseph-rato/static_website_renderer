import React from "react";

export function Banner({
  title,
  content,
  textColor,
  backgroundColor,
  style,
  ...rest
}: {
  title?: string;
  content: string;
  textColor?: string;
  backgroundColor?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <div
      className="banner-bar"
      style={{
        backgroundColor: backgroundColor ?? "var(--color-primary)",
        color: textColor ?? "#FFFFFF",
        padding: "8px 0",
        textAlign: "center",
        borderBottom: "1px solid rgba(0,0,0,0.1)",
        width: "100%",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div
        className="banner-content rich-text-content"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          color: textColor ?? "#FFFFFF",
          fontSize: "14px",
          fontWeight: 600,
          fontFamily: "var(--font-secondary, Inter), sans-serif",
        }}
      >
        {title && (
          <strong className="banner-title" style={{ fontWeight: 700, marginRight: "5px" }}>
            {title}:
          </strong>
        )}
        <span dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
