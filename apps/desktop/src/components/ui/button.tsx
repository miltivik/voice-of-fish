import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-brutal border-2 text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete disabled:pointer-events-none disabled:opacity-50 font-mono",
  {
    variants: {
      variant: {
        default:
          "border-electric bg-electric text-concrete shadow-brutal-sm hover:bg-electric-400 hover:border-electric-400 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px]",
        secondary:
          "border-glass-border-strong bg-glass backdrop-blur-glass text-concrete-50 shadow-glass-sm hover:bg-glass-heavy hover:border-concrete-300",
        glass:
          "border-glass-border bg-glass/60 backdrop-blur-glass text-concrete-50 shadow-glass-sm hover:bg-glass hover:border-glass-border-strong",
        ghost:
          "border-transparent text-concrete-300 hover:bg-glass hover:text-concrete-50",
        danger:
          "border-ember bg-ember text-white shadow-brutal-sm hover:bg-ember-600 hover:border-ember-600 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px]",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 px-3 text-[10px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends
    ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);
Button.displayName = "Button";