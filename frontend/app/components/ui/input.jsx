import * as React from "react";
import { cn } from "./utils";
import styles from "./input.module.css";

function Input({ className, type, ...props }) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(styles.input, className)}
			{...props}
		/>
	);
}

export { Input };

