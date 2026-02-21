import React from "react";

import { cn } from "../../lib/utils";

interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

interface BentoGridItemProps extends React.HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div";
  children?: React.ReactNode;
}

export function BentoGrid({ className, children, ...props }: BentoGridProps) {
  return (
    <div className={cn("bento-grid", className)} {...props}>
      {children}
    </div>
  );
}

export function BentoGridItem({
  as = "article",
  className,
  children,
  ...props
}: BentoGridItemProps) {
  const Component = as;

  return (
    <Component className={cn("bento-grid-item", className)} {...props}>
      {children}
    </Component>
  );
}
