import { type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-brutal border border-glass-border bg-glass backdrop-blur-glass shadow-glass-md", className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b-2 border-glass-border-strong p-4", className)} {...props} />
  );
}

type CardTitleProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
};

export function CardTitle({
  as: Component = "div",
  className,
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={cn("font-mono text-xs font-semibold uppercase tracking-wider text-concrete-50", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
