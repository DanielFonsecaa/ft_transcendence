import { useEffect, useState } from "react"

// The top of the lobby: what the room is called, who runs it, and the room code
// to pass on.
//
// "ROOM CODE", not "ROOM ID" as the design has it: the code is the thing players
// share, and CONTEXT.md keeps one word for it.
//
// The "copied!" feedback is cleared by an effect with a cleanup, not by a bare
// setTimeout. A game can start a second after the click, and a timer left running
// would then try to change the state of a screen that no longer exists.
const COPIED_MS = 1500

function LobbyHeader({ lobby, connected }) {
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		if (!copied) return undefined
		const timer = setTimeout(() => setCopied(false), COPIED_MS)
		return () => clearTimeout(timer)
	}, [copied])

	const copyCode = async () => {
		try {
			await navigator.clipboard.writeText(lobby.code ?? "")
			setCopied(true)
		} catch {
			/* clipboard blocked — the code is on screen right next to the button */
		}
	}

	return (
		<header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-4">
			<div className="flex min-w-0 flex-col gap-2">
				<p className="font-mono text-xs tracking-[0.18em] text-green-soft">ROOM LOBBY</p>
				<h1 className="font-title text-[clamp(28px,6vw,38px)] font-extrabold text-white">{lobby.name || "Room"}</h1>
				<p className="text-[15px] text-white/70">
					Hosted by {lobby.host}
					{!connected && <span className="ml-2 text-yellow">· reconnecting…</span>}
				</p>
			</div>

			{/* The code stays readable inside the button, so the button's name reads
			    "Copy room code, ROOM CODE 7F2K" rather than hiding the value behind an
			    aria-label. */}
			<button
				type="button"
				onClick={copyCode}
				className="flex flex-none cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-panel px-[18px] py-3.5 transition-colors hover:border-white/40"
			>
				<span className="sr-only">Copy room code</span>
				<span className="font-mono text-[11px] tracking-[0.14em] text-muted">ROOM CODE</span>
				<span className="font-mono text-[17px] font-bold tracking-[0.2em] text-white">{lobby.code ?? "—"}</span>
				<span aria-hidden="true" className="font-mono text-[13px] text-muted">
					{copied ? "copied!" : "⧉"}
				</span>
			</button>
			<span aria-live="polite" className="sr-only">
				{copied ? "Room code copied" : ""}
			</span>
		</header>
	)
}

export default LobbyHeader
