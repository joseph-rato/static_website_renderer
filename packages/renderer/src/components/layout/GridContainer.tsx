import React from "react";

export function GridContainer({
  columns,
  rows,
  gap,
  areas,
  style,
  className,
  children,
  ...rest
}: React.PropsWithChildren<{
  columns?: string;
  rows?: string;
  gap?: string;
  areas?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}>) {
  const mergedStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: columns,
    gridTemplateRows: rows,
    gap,
    gridTemplateAreas: areas,
    ...style,
  };
  return (
    <div style={mergedStyle} className={className} data-sr-id={rest["data-sr-id"]}>
      {children}
    </div>
  );
}
