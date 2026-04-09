import React from "react";

export function Container({
  maxWidth = "1200px",
  padding = "16px",
  style,
  className,
  children,
  ...rest
}: React.PropsWithChildren<{
  maxWidth?: string;
  padding?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}>) {
  const mergedStyle: React.CSSProperties = {
    maxWidth,
    margin: "0 auto",
    padding: `0 ${padding}`,
    width: "100%",
    boxSizing: "border-box",
    ...style,
  };
  return (
    <div style={mergedStyle} className={className} data-sr-id={rest["data-sr-id"]}>
      {children}
    </div>
  );
}
