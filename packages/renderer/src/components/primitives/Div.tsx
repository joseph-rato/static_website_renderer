import React from "react";

export function Div({
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
    <div style={style} className={className} data-sr-id={rest["data-sr-id"]}>
      {children}
    </div>
  );
}
