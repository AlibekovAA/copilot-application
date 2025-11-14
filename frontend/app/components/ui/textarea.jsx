import * as React from "react";
import { cn } from "./utils";
import { useTheme } from "../../context/ThemeContext";

const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => {
    const { theme } = useTheme();

    const baseClasses =
      theme === "light"
        ? "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200 bg-white/90 border-[rgba(148,163,184,0.45)] text-slate-800 placeholder:text-slate-400 focus:border-[#ef3124] focus:ring-2 focus:ring-[#ef3124]/25"
        : "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200 bg-[rgba(20,20,20,0.6)] border-[rgba(148,163,184,0.2)] text-gray-200 placeholder:text-gray-500 focus:border-[#9933ff] focus:ring-2 focus:ring-[#9933ff]/20";

    return (
      <textarea
        className={cn(
          baseClasses,
          "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

