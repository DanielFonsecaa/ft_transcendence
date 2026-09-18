import { useId } from "react"

// A labelled input or select, with an optional hint and error under it.
// Everything else (value, onChange, type, min, required…) is forwarded to the
// field itself, so this behaves like the element it wraps.
//
// useId() gives ids that are unique on the page, which is what ties the label,
// the hint and the error to the field.
function FormField({ label, hint, error, as = "input", className = "", children, ...rest }) {
	const id = useId()
	const hintId = `${id}-hint`
	const errorId = `${id}-error`
	const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined

	const fieldClasses = `rounded-md border-2 bg-page px-4 py-3 text-[15px] text-white outline-none transition-colors ${
		error ? "border-red" : "border-line-strong focus:border-green"
	}`

	return (
		<div className={`flex flex-col gap-2 ${className}`}>
			<label htmlFor={id} className="font-mono text-[11px] tracking-[0.14em] text-muted">
				{label}
			</label>
			{as === "select" ? (
				<select id={id} aria-describedby={describedBy} aria-invalid={Boolean(error)} className={fieldClasses} {...rest}>
					{children}
				</select>
			) : (
				<input id={id} aria-describedby={describedBy} aria-invalid={Boolean(error)} className={fieldClasses} {...rest} />
			)}
			{hint && (
				<p id={hintId} className="font-mono text-[11px] text-muted">
					{hint}
				</p>
			)}
			{error && (
				<p id={errorId} role="alert" className="font-mono text-[11px] text-red-soft">
					{error}
				</p>
			)}
		</div>
	)
}

export default FormField
