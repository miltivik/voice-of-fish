import * as ProgressPrimitive from "@radix-ui/react-progress";
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
} from "react";
import { cn } from "@/lib/utils";

function clampProgressValue(value: number | null | undefined) {
  if (typeof value !== "number") {
    return value;
  }

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

export const Progress = forwardRef<
  ElementRef<typeof ProgressPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const clampedValue = clampProgressValue(value);
  const indicatorValue = clampedValue ?? 0;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded bg-line",
        className,
      )}
      value={clampedValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-accent transition-transform"
        style={{ transform: `translateX(-${100 - indicatorValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;
