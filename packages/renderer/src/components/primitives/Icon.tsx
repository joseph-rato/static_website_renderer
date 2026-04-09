import React from "react";

/** SVG icon placeholders mapped from Tabler icon names. */
const ICON_PATHS: Record<string, string> = {
  IconHeartHandshake:
    "M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572",
  IconUser:
    "M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2",
  IconBarcode:
    "M4 7v-1a2 2 0 0 1 2-2h2M4 17v1a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v1M16 20h2a2 2 0 0 0 2-2v-1M5 11h1v2h-1zM10 11l0 2M14 11h1v2h-1zM19 11l0 2",
  IconMapPin:
    "M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0M17.657 16.657l-4.243 4.243a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z",
  IconPhone: "M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5l5 2v4a2 2 0 0 1-2 2a16 16 0 0 1-15-15a2 2 0 0 1 2-2",
  IconMail: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-10zM3 7l9 6l9-6",
  IconClock: "M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0M12 7v5l3 3",
  IconBrandInstagram:
    "M4 4m0 4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M16.5 7.5l0 0",
  IconBrandFacebook: "M7 10v4h3v7h4v-7h3l1-4h-4v-2a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2h-3",
  IconBrandTwitter: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6c2.2.1 4.4-.6 6-2c-3-1-5.5-3.3-6-7c.5.2 1.2.3 2 .3c-2.5-2-3-6-1-9c2.3 2.6 5.8 4.2 9 4.3a4.5 4.5 0 0 1 7.7-4.1c1 0 2.5-.5 3.3-1l-1 3",
  IconBrandTiktok: "M21 7.917v4.034a9.5 9.5 0 0 1-5-1.951v6a6 6 0 1 1-5-5.917v4.07a2 2 0 1 0 1 1.847v-14h4a5 5 0 0 0 5 5.917z",
};

export function Icon({
  name,
  size = 24,
  color = "currentColor",
  style,
  className,
  ...rest
}: {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  const paths = ICON_PATHS[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      data-sr-id={rest["data-sr-id"]}
    >
      {paths ? (
        paths.split("M").filter(Boolean).map((d, i) => (
          <path key={i} d={`M${d}`} />
        ))
      ) : (
        <circle cx="12" cy="12" r="10" />
      )}
    </svg>
  );
}
