import React from "react";

export function Link({
  href,
  target,
  rel,
  style,
  className,
  children,
  ...rest
}: React.PropsWithChildren<{
  href: string;
  target?: "_blank" | "_self";
  rel?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}>) {
  const computedRel = target === "_blank" && !rel ? "noopener noreferrer" : rel;
  return (
    <a
      href={href}
      target={target}
      rel={computedRel}
      style={style}
      className={className}
      data-sr-id={rest["data-sr-id"]}
    >
      {children}
    </a>
  );
}
