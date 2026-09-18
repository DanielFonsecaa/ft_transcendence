import Avatar from "@/components/ui/Avatar.jsx"

// One person in a list. The buttons come in as children, so the same row serves
// Requests, Your friends, Sent and Blocked.
//
// The green dot never travels alone: "Online" is written next to it, because a
// colour on its own says nothing to someone who can't tell it apart.
function FriendRow({ person, accent = "green", busy = false, children }) {
	const ACCENTS = {
		red: "border-l-red",
		blue: "border-l-blue",
		green: "border-l-green",
		yellow: "border-l-yellow",
	}
	const name = person.display_name || person.username

	return (
		<li
			className={`flex flex-wrap items-center gap-3.5 rounded-md border border-white/10 border-l-4 bg-panel px-[clamp(12px,3vw,20px)] py-3.5 transition-opacity ${
				ACCENTS[accent] ?? ACCENTS.green
			} ${busy ? "opacity-40" : ""}`}
		>
			<Avatar src={person.avatar_url} name={name} size="sm" ring={accent} />

			<span className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5">
				<span className="truncate font-title text-[19px] font-bold text-white">{name}</span>
				<span
					className={`flex items-center gap-[7px] font-mono text-[11px] tracking-[0.08em] ${
						person.is_online ? "text-green-soft" : "text-muted"
					}`}
				>
					<i
						aria-hidden="true"
						className={`h-2 w-2 flex-none rounded-full ${person.is_online ? "bg-green" : "bg-white/30"}`}
					/>
					{person.is_online ? "Online" : "Offline"}
				</span>
			</span>

			<span className="flex flex-none flex-wrap items-center gap-2">{children}</span>
		</li>
	)
}

export default FriendRow
