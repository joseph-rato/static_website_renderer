import React from "react";

export function Section({
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
    <section style={style} className={className} data-sr-id={rest["data-sr-id"]}>
      {children}
    </section>
  );
}
