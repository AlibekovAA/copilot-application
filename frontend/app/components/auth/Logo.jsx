export function Logo({ className = '' }) {
	return (
		<img
			src="/logo_color/Group%203.svg"
			alt="Logo"
			className={`${className} object-contain`}
			loading="lazy"
		/>
	);
}
