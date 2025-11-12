export function Logo({ className = '', variant = 'gradient', alt = 'Logo' }) {
	return (
		<img
			src="/logo_color/Group%203.svg"
			alt={alt}
			className={`${className} object-contain`}
			loading="lazy"
		/>
	);
}


