/** Props for flex layout containers. */
export interface FlexContainerProps {
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  /** CSS justify-content value */
  justify?: string;
  /** CSS align-items value */
  align?: string;
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  /** CSS gap value (e.g. "16px", "1rem") */
  gap?: string;
}

/** Props for CSS grid layout containers. */
export interface GridContainerProps {
  /** CSS grid-template-columns */
  columns?: string;
  /** CSS grid-template-rows */
  rows?: string;
  /** CSS gap value */
  gap?: string;
  /** CSS grid-template-areas */
  areas?: string;
}

/** Props for a generic container with max-width centering. */
export interface ContainerProps {
  /** Max width (e.g. "1200px"). Default: "1200px" */
  maxWidth?: string;
  /** Horizontal padding (e.g. "16px"). Default: "16px" */
  padding?: string;
}
