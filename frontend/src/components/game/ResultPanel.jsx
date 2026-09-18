import { Link } from "react-router"

const BACK =
	"flex-none rounded-md border-2 border-white px-[26px] py-[15px] font-logo text-[15px] font-bold text-white transition-colors hover:bg-white hover:text-page"

// The end of a game: who won, and the way back to the room.
//
// "Back to room" goes to /room/<code>, which is the same URL this table is already
// on. Until the backend reopens a room after a game (§2.5) the server keeps sending
// the finished game, so the button lands on the same screen — which is why the
// design's "Room stays open for a rematch" line is left out for now.
function ResultPanel({ winner, iWon, roomCode }) {
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
			</div>
			<Link to={`/room/${roomCode}`} className={BACK}>
				Back to room
			</Link>
		</section>
	)
}

export default ResultPanel
