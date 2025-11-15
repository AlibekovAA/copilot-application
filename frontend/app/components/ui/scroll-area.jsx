import * as React from "react";
import { cn } from "./utils";
import styles from "./scroll-area.module.css";

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn(styles.scrollArea, className)} {...props}>
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };

