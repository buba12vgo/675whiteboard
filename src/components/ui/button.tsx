import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/80",
  {
    variants: {
      variant: {
        default: "bg-amber text-white hover:bg-amber/90",
        ghost: "bg-transparent text-cream hover:bg-white/10",
        outline: "border border-white/15 bg-white/5 text-cream hover:bg-white/10",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-10 px-3 text-sm",
        touch: "h-12 w-12 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

export function Button({ className, variant, size, asChild = false, type = "button", ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} type={type} {...props} />;
}
