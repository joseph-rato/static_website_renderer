import React from "react";

export function Text({
  text,
  style,
  className,
  ...rest
}: {
  text: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <p style={style} className={className} data-sr-id={rest["data-sr-id"]}>
      {text}
    </p>
  );
}
