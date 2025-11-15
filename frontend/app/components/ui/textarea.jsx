import * as React from "react";
import { cn } from "./utils";
import { useTheme } from "../../context/ThemeContext";
import styles from "./textarea.module.css";

const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => {
    const { theme } = useTheme();
    const themeClass = theme === "light" ? styles.themeLight : styles.themeDark;

    return (
      <textarea
        className={cn(styles.textarea, themeClass, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

