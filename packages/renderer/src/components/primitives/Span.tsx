import React from "react";

export function Span({
  style,
  className,
  children,
  ...rest
}: React.PropsWithChildren<{
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}>) {
  return (
    <span style={style} className={className} data-sr-id={rest["data-sr-id"]}>
      {children}
    </span>
  );
}
