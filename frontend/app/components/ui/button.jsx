import * as React from "react";
import { cn } from "./utils";
import styles from "./button.module.css";

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}) {
	const variantClass = {
		default: styles.variantDefault,
		destructive: styles.variantDestructive,
		outline: styles.variantOutline,
		secondary: styles.variantSecondary,
		ghost: styles.variantGhost,
		link: styles.variantLink,
	}[variant] || styles.variantDefault;

	const sizeClass = {
		default: styles.sizeDefault,
		sm: styles.sizeSm,
		lg: styles.sizeLg,
		icon: styles.sizeIcon,
	}[size] || styles.sizeDefault;

	const buttonClassName = cn(
		styles.button,
		variantClass,
		sizeClass,
		className
	);

	if (asChild && props.children) {
		return React.cloneElement(props.children, {
			className: buttonClassName,
			...props.children.props,
		});
	}

	return (
		<button
			data-slot="button"
			className={buttonClassName}
			{...props}
		/>
	);
}

export { Button };

