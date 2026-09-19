const BACK =
	"flex-none rounded-md border-2 border-white px-[26px] py-[15px] font-logo text-[15px] font-bold text-white transition-colors hover:bg-white hover:text-page"

// The end of a game: who won, and the way back to the room.
//
// "Back to room" is a button and not a link, because it *acts*: the room has to be
// reopened before there is anything to go back to (§2.5), and the URL never changes
// — the code now points at the fresh lobby, so the table simply becomes the lobby
// again under the same address. Pressing it when somebody else already has is
// harmless; the server hands back the room they made.
function ResultPanel({ winner, iWon, onRematch, busy = false }) {
	const accent = iWon ? "border-t-green" : "border-t-blue"
	const eyebrow = iWon ? "text-green-soft" : "text-blue-soft"
	const who = iWon ? "You" : winner

	return (
		<section
			className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 border-t-4 bg-panel p-[clamp(12px,2vh,22px)] ${accent}`}
		>
			<div className="flex min-w-0 flex-col gap-2">
				<p className={`font-mono text-[11px] tracking-[0.18em] ${eyebrow}`}>{iWon ? "YOU WON" : "GAME OVER"}</p>
				<h2 className="font-title text-[clamp(24px,5vw,30px)] font-extrabold text-white">
					{iWon ? "You won" : `${winner} won`}
				</h2>
				<p className="font-mono text-[13px] text-white/70">{who} went out first.</p>
				<p className="font-mono text-[13px] text-muted">The room stays open for a rematch.</p>
			</div>
			<button type="button" onClick={onRematch} disabled={busy} className={BACK}>
				{busy ? "Opening…" : "Back to room"}
			</button>
		</section>
	)
}

export default ResultPanel
