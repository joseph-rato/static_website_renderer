import React from "react";

export function Heading({
  level,
  text,
  style,
  className,
  ...rest
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag style={style} className={className} data-sr-id={rest["data-sr-id"]}>
      {text}
    </Tag>
  );
}
