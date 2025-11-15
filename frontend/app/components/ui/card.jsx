import * as React from "react";
import { cn } from "./utils";
import styles from "./card.module.css";

function Card({ className, ...props }) {
	return (
		<div
			data-slot="card"
			className={cn(styles.card, className)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }) {
	return (
		<div
			data-slot="card-header"
			className={cn(styles.cardHeader, className)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }) {
	return (
		<h4
			data-slot="card-title"
			className={cn(styles.cardTitle, className)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }) {
	return (
		<p
			data-slot="card-description"
			className={cn(styles.cardDescription, className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }) {
	return (
		<div
			data-slot="card-action"
			className={cn(styles.cardAction, className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }) {
	return (
		<div
			data-slot="card-content"
			className={cn(styles.cardContent, className)}
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }) {
	return (
		<div
			data-slot="card-footer"
			className={cn(styles.cardFooter, className)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
};

