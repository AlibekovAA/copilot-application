export function cn(...inputs) {
	const classes = inputs
		.filter(Boolean)
		.map(input => {
			if (typeof input === "string") return input;
			if (Array.isArray(input)) return input.filter(Boolean).join(" ");
			if (typeof input === "object" && input !== null) {
				return Object.entries(input)
					.filter(([_, val]) => val)
					.map(([key]) => key)
					.join(" ");
			}
			return "";
		})
		.filter(Boolean)
		.join(" ");
	
	return classes;
}

