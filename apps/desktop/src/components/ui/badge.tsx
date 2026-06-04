import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-brutal px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-2 ring-inset font-mono",
  {
    variants: {
      variant: {
        default: "bg-electric/15 text-electric ring-electric/30",
        secondary: "bg-glass text-concrete-300 ring-glass-border-strong",
        warning: "bg-warning/15 text-warning ring-warning/30",
        danger: "bg-ember/15 text-ember ring-ember/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}