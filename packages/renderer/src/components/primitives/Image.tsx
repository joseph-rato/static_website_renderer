import React from "react";

export function Image({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  style,
  className,
  ...rest
}: {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <img
      src={src}
      alt={alt ?? ""}
      width={width}
      height={height}
      loading={loading}
      style={style}
      className={className}
      data-sr-id={rest["data-sr-id"]}
    />
  );
}
