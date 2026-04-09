import React from "react";

export function RichText({
  html,
  style,
  className,
  ...rest
}: {
  html: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <div
      style={style}
      className={className ? `rich-text-content ${className}` : "rich-text-content"}
      data-sr-id={rest["data-sr-id"]}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
