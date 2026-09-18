// The three small states every list and form needs. They announce themselves:
// there is no HTML tag for "this text just appeared", so the ARIA roles are the
// right tool here — polite for loading, assertive for an error.
export function Loading({ children = "Loading…", className = "" }) {
	return (
		<p role="status" className={`font-mono text-[13px] tracking-[0.06em] text-muted ${className}`}>
			{children}
		</p>
	)
}

export function ErrorMessage({ children, className = "" }) {
	return (
		<p role="alert" className={`font-mono text-[13px] tracking-[0.06em] text-red-soft ${className}`}>
			{children}
		</p>
	)
}

export function EmptyMessage({ children, className = "" }) {
	return <p className={`font-mono text-[13px] tracking-[0.06em] text-muted ${className}`}>{children}</p>
}
