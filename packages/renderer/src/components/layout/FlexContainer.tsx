import React from "react";

export function FlexContainer({
  direction = "row",
  justify,
  align,
  wrap,
  gap,
  style,
  className,
  children,
  ...rest
}: React.PropsWithChildren<{
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justify?: string;
  align?: string;
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  gap?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}>) {
  const mergedStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: direction,
    justifyContent: justify,
    alignItems: align,
    flexWrap: wrap,
    gap,
    ...style,
  };
  return (
    <div style={mergedStyle} className={className} data-sr-id={rest["data-sr-id"]}>
      {children}
    </div>
  );
}
