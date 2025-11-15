'use client';

import * as React from "react";
import { cn } from "./utils";
import styles from "./label.module.css";

function Label({
	className,
	...props
}) {
  return (
    <label
      data-slot="label"
      className={cn(styles.label, className)}
      {...props}
    />
  );
}

export { Label };

