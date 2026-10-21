import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-sm font-medium text-cream", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-full border border-white/15 bg-white/5 px-4 text-cream outline-none placeholder:text-muted focus:border-amber",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-none rounded-3xl border border-white/15 bg-white/5 px-4 py-3 text-cream outline-none placeholder:text-muted focus:border-amber",
        className,
      )}
      {...props}
    />
  );
}
