import * as React from "react";
import { cn } from "./utils";

function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "border-transparent bg-[#9933ff] text-white": variant === "default",
          "border-transparent bg-gray-100 text-gray-700": variant === "secondary",
          "border-gray-300 bg-transparent text-gray-700": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };

