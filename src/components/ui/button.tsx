import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary: "bg-night text-white shadow-sm hover:bg-[#30304f] disabled:bg-stone-300 disabled:text-stone-500",
  secondary: "border border-stone-300 bg-white text-ink shadow-sm hover:border-moss hover:text-moss",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-ink",
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed [&_svg]:shrink-0",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
