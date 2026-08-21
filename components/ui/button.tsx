import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "rounded-control inline-flex items-center justify-center gap-2 font-medium transition-[background-color,color,border-color,opacity,transform] outline-none disabled:pointer-events-none disabled:opacity-60 active:scale-[0.99]",
  {
    variants: {
      variant: {
        // Brass is the one loud colour; exactly one primary action per view.
        primary: "bg-brass text-brass-ink hover:opacity-90",
        secondary: "border-line bg-surface hover:bg-surface-muted border",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-muted",
        danger: "text-negative hover:bg-negative/10",
      },
      size: {
        sm: "h-8 px-2.5 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        // 44 px is the comfortable thumb target; a mouse pointer does not need it,
        // and at desktop density a row of 44 px ghost buttons reads as heavy.
        icon: "size-11 sm:size-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof button>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

export { button as buttonStyles };
