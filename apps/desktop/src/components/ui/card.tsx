import { type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border border-line bg-panel", className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b border-line p-4", className)} {...props} />
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
      className={cn("text-sm font-semibold text-studio-foreground", className)}
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
