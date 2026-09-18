import { makeDefaultConfig, validateConfig } from "./tournamentStructure.js"

// =============================================================================
// THE TOURNAMENT MOCK STORE — AND THE BACKEND'S CONTRACT
// =============================================================================
//
// The tournament screens run entirely on the data below. Nothing here talks to
// a server: the list lives in module state, so it lasts as long as the tab and
// is visible in production too (spec.md, "Data: the frontend defines it").
//
// **Every field name and shape in this file is the contract.** The tournament
// backend has to answer with exactly these names, because the pages read them
// directly and nothing maps between the two (docs/adr/0001-frontend-defines-
// the-data.md). Where the backend already has a field, the name here is the
// backend's own name, taken from `game_api/models.py` and
// `game_api/serializers.py` — `created_at`, `created_by`, `max_participants`,
// `participant_count`, `participants[].user`, `participants[].final_position`.
//
// **This whole file gets deleted once the backend lands.** What replaces it is
// six one-line `api` calls against the endpoints that already exist in
// `game_api/views.py::TournamentViewSet`:
//
//   listTournaments()    → GET    /tournaments/
//   getTournament(id)    → GET    /tournaments/<id>/
//   createTournament(c)  → POST   /tournaments/            { name, ...config }
//   joinTournament(id)   → POST   /tournaments/<id>/register/
//   leaveTournament(id)  → POST   /tournaments/<id>/unregister/
//   startTournament(id)  → POST   /tournaments/<id>/start/
//
// That is why all six are `async` even though nothing here waits for anything:
// the pages are already written against a server, so the swap touches this file
// and nothing else. The rejections carry `.message` and `.status` for the same
// reason — `lib/api.js` throws exactly that, so a page can't tell the mock's
// failures from the real ones.
//
// **A tournament object *is* its own config.** The settings sit flat on it,
// exactly as they sit flat on the `Tournament` model — so `computeStructure()`,
// `validateConfig()` and `enabledRuleLabels()` all take a stored tournament
// straight from here, with no mapping step and no nested `config` to unwrap.
//
// Gaps the backend still has to close are in `../BACKEND_REDESIGN_TASKS.md` §5
// and in `.scratch/redesign/issues/11-backend-catchup.md`.
// =============================================================================

// The backend's GameStatus values, not names of our own — the whole API speaks
// this enum and a second vocabulary would only need translating.
export const STATUS_LABELS = {
	pending: "Upcoming",
	in_progress: "In progress",
	finished: "Finished",
	cancelled: "Canceled",
}

// Text colours, as theme tokens rather than the design's raw hexes: the design's
// #6f6f6f/#ffffff80 for a finished tournament misses WCAG AA at this size, and
// `muted` (#808080) is the darkest gray that passes on a panel (spec.md).
export const STATUS_COLORS = {
	pending: "text-blue-soft",
	in_progress: "text-green-soft",
	finished: "text-muted",
	cancelled: "text-red-soft",
}

// The stripe along the top of a card. Full-strength colours, not the `-soft`
// ones: a border only has to reach 3:1.
export const STATUS_ACCENTS = {
	pending: "border-t-blue",
	in_progress: "border-t-green",
	finished: "border-t-line-strong",
	cancelled: "border-t-red",
}

// A tournament id is a short code people read out, so it uses the room-code
// alphabet: A–Z and 2–9, with I, O, 0 and 1 left out (CONTEXT.md).
export function makeTournamentId(length = 4) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	let id = ""
	for (let i = 0; i < length; i++) {
		id += alphabet[Math.floor(Math.random() * alphabet.length)]
	}
	return id
}

export function formatDate(iso) {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

// How many places the podium shows. The design's Final results panel has three.
const PODIUM_PLACES = 3

// 1st, 2nd and 3rd, worked out from `final_position` — the field
// `TournamentParticipant` already has for it, rather than a separate list of
// names that could disagree with the roster. Pure, so `FinalResults.jsx` only
// has to draw what comes back.
export function finalStandings(tournament) {
	return (tournament?.participants ?? [])
		.filter((entry) => Number.isFinite(entry.final_position))
		.sort((a, b) => a.final_position - b.final_position)
		.slice(0, PODIUM_PLACES)
}

// --- the seed ----------------------------------------------------------------

const DEFAULT_AVATAR = "/profile/default.jpg"

// Faces for the seeded names, so the participant chips look like the design's.
const PHOTOS = {
	daniel: "/profile/daniel.png",
	feazeved: "/profile/fifipe.png",
	ana: "/profile/girl.jpg",
	pedro: "/profile/wallace.png",
	lucas: "/profile/alex.png",
	guesttt: "/profile/smiley.jpg",
	guest_11: "/profile/duck.jpg",
	rita_c: "/profile/cat.jpg",
}

// The shape of `PublicProfileSerializer`, which is what every nested user in
// the tournament API is.
function person(username) {
	return {
		public_id: `mock-${username}`,
		username,
		display_name: username,
		avatar_url: PHOTOS[username] ?? DEFAULT_AVATAR,
	}
}

// `TournamentParticipant`: the person, their seed once the draw has happened,
// and where they finished. `final_position` is what the podium reads.
function entrant(username, { seed = null, final_position = null } = {}) {
	return { user: person(username), seed, final_position }
}

function daysFromNow(days) {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return date.toISOString()
}

function entrants(count, host, positions = []) {
	return Array.from({ length: count }, (_, i) => {
		const username = i === 0 ? host : `player_${i + 1}`
		const place = positions.indexOf(username)
		return entrant(username, { final_position: place === -1 ? null : place + 1 })
	})
}

// One tournament, with the settings flattened onto it the way the backend
// stores them.
function seeded({ id, name, host, status, createdAt, participants, results, settings }) {
	const winner = results?.[0]
	// The defaults carry an empty `name`, because the create form starts from
	// them. A seeded tournament has a real name, so that key is dropped here and
	// set below.
	const config = { ...makeDefaultConfig(settings.format), ...settings }
	delete config.name

	return {
		id,
		name,
		status,
		created_at: createdAt,
		created_by: person(host),
		finished_at: status === "finished" ? createdAt : null,
		winner: winner ? person(winner) : null,
		participants,
		...config,
	}
}

function seedTournaments() {
	return [
		seeded({
			id: "8K2P",
			name: "Friday Showdown",
			host: "daniel",
			status: "pending",
			createdAt: daysFromNow(3),
			participants: entrants(14, "daniel"),
			settings: { format: "knockout", max_participants: 20 },
		}),
		seeded({
			id: "3FPQ",
			name: "Casual ONE League",
			host: "feazeved",
			status: "in_progress",
			createdAt: daysFromNow(-2),
			participants: entrants(12, "feazeved"),
			settings: {
				format: "bestof",
				max_participants: 12,
				players_per_table: 4,
				advance_per_table: 1,
				matches_per_round: 5,
			},
		}),
		seeded({
			id: "WKWM",
			name: "Weekend Warmup",
			host: "guesttt",
			status: "in_progress",
			createdAt: daysFromNow(-1),
			participants: entrants(10, "guesttt"),
			settings: { format: "knockout", max_participants: 10 },
		}),
		seeded({
			id: "9QXR",
			name: "Lightning Cup",
			host: "ana",
			status: "finished",
			createdAt: daysFromNow(-10),
			participants: entrants(8, "ana", ["ana", "player_5", "player_3"]),
			results: ["ana", "player_5", "player_3"],
			settings: {
				format: "knockout",
				max_participants: 8,
				players_per_table: 4,
				advance_per_table: 2,
				final_best_of_3: false,
			},
		}),
		seeded({
			id: "CHMP",
			name: "Champions Cup",
			host: "pedro",
			status: "finished",
			createdAt: daysFromNow(-30),
			participants: entrants(24, "pedro", ["pedro", "player_11", "player_3"]),
			results: ["pedro", "player_11", "player_3"],
			settings: {
				format: "bestof",
				max_participants: 24,
				matches_per_round: 3,
				matches_in_final: 7,
			},
		}),
		seeded({
			id: "L4TN",
			name: "Mega Tournament",
			host: "lucas",
			status: "pending",
			createdAt: daysFromNow(7),
			participants: entrants(40, "lucas"),
			settings: { format: "knockout", max_participants: 64 },
		}),
		seeded({
			id: "RB7M",
			name: "Friends Cup",
			host: "guest_11",
			status: "pending",
			createdAt: daysFromNow(1),
			// Deliberately full: without one full-but-still-open tournament in the
			// seed, the detail page's "Tournament full" state could never be seen.
			participants: entrants(16, "guest_11"),
			settings: { format: "bestof", max_participants: 16 },
		}),
		seeded({
			id: "ZM1K",
			name: "One Card Masters",
			host: "daniel",
			status: "finished",
			createdAt: daysFromNow(-20),
			participants: entrants(32, "daniel", ["daniel", "player_19", "player_7"]),
			results: ["daniel", "player_19", "player_7"],
			settings: { format: "knockout", max_participants: 32 },
		}),
	]
}

// The store. Newest first, so a tournament you just made is at the top.
let tournaments = seedTournaments()

// Only the tests call this. It goes with the rest of the file.
export function resetTournaments() {
	tournaments = seedTournaments()
}

// --- reads -------------------------------------------------------------------

// A page must never be able to edit the store by editing its own state, so
// everything that leaves here is a copy. Without it a bug would only surface on
// the next navigation, which is the worst kind to chase.
const copy = (value) => structuredClone(value)

// `TournamentDetailSerializer` extends the list one, so a detail carries both
// the roster and the count.
function toDetail(tournament) {
	return { ...copy(tournament), participant_count: tournament.participants.length }
}

// `TournamentListSerializer`: the count of entrants, never the roster. Keeping
// that split honest stops the list page from leaning on a field the real
// endpoint will not send.
function toListRow({ participants, ...rest }) {
	return { ...copy(rest), participant_count: participants.length }
}

// The mock fails the way `lib/api.js` fails: an Error carrying the status the
// real endpoint would answer with. That is what makes a page's error handling
// the same code before and after the backend lands.
function fail(message, status) {
	const error = new Error(message)
	error.status = status
	return error
}

function find(id) {
	const tournament = tournaments.find((entry) => entry.id === id)
	if (!tournament) throw fail(`No tournament ${id}.`, 404)
	return tournament
}

export async function listTournaments() {
	return tournaments.map(toListRow)
}

export async function getTournament(id) {
	return toDetail(find(id))
}

// --- who is acting -----------------------------------------------------------

// Every endpoint above reads the acting user from the session cookie, which is
// why none of these functions takes a user argument. The mock has to get it from
// somewhere, and the one place the app already keeps the signed-in user is
// `localStorage["user"]`, written by `lib/auth.jsx`. Reading it here — rather
// than passing the user down from a page — is what keeps these signatures
// identical to the endpoints they will become.
function signedInUser() {
	try {
		const raw = localStorage.getItem("user")
		const stored = raw ? JSON.parse(raw) : null
		if (!stored?.username) return null
		// `auth.jsx` normalises the photo to `avatar`; the contract's name is
		// `avatar_url`, because that is what PublicProfileSerializer sends.
		return {
			public_id: stored.public_id ?? `mock-${stored.username}`,
			username: stored.username,
			display_name: stored.display_name ?? stored.name ?? stored.username,
			avatar_url: stored.avatar_url ?? stored.avatar ?? DEFAULT_AVATAR,
		}
	} catch {
		// No storage at all, or unreadable: the same as being signed out.
		return null
	}
}

export function isEntered(tournament, username) {
	if (!username) return false
	return (tournament?.participants ?? []).some((entry) => entry.user.username === username)
}

function requireUser() {
	const user = signedInUser()
	if (!user) throw fail("Sign in to do that.", 403)
	return user
}

// --- writes ------------------------------------------------------------------

// The database does this with a unique column. Here it is a search: a taken code
// is retried, and after enough collisions the code grows a character rather than
// spinning forever — which is what would happen if the alphabet ever ran dry.
function freeId() {
	for (let length = 4; ; length++) {
		for (let attempt = 0; attempt < 20; attempt++) {
			const id = makeTournamentId(length)
			if (!tournaments.some((entry) => entry.id === id)) return id
		}
	}
}

// `config` is the POST body: `name` plus the settings, flat, already keyed by the
// backend's own field names — so it is spread in as it is, with no mapping step.
export async function createTournament(config) {
	const host = requireUser()
	const name = String(config?.name ?? "").trim()

	// The dialog shows `validateConfig`'s errors as a live list. Re-running it
	// here makes the rules true of the endpoint and not only of the form.
	const { ok, errors } = validateConfig({ ...config, name })
	if (!ok) throw fail(errors.join(" "), 400)

	const tournament = {
		...config,
		id: freeId(),
		name,
		status: "pending",
		created_at: new Date().toISOString(),
		created_by: host,
		finished_at: null,
		winner: null,
		// The real view registers the creator in the same request.
		participants: [{ user: host, seed: null, final_position: null }],
	}

	tournaments = [tournament, ...tournaments]
	return toDetail(tournament)
}

// The error messages are the backend's own words, copied from
// `TournamentViewSet.register`, so the sentence a person reads does not change
// the day this file goes away.
export async function joinTournament(id) {
	const user = requireUser()
	const tournament = find(id)

	if (tournament.status !== "pending") throw fail("Registration is closed.", 400)
	if (isEntered(tournament, user.username)) throw fail("Already registered.", 400)
	if (tournament.participants.length >= tournament.max_participants) throw fail("Tournament is full.", 400)

	tournament.participants.push({ user, seed: null, final_position: null })
	return toDetail(tournament)
}

// The real `unregister` answers 204 with no body. This answers with the fresh
// tournament, like the other three writes do, so the page never has to follow a
// write with a read — and so every write here has one shape. Logged as a
// backend gap (issues/11-backend-catchup.md).
export async function leaveTournament(id) {
	const user = requireUser()
	const tournament = find(id)

	if (tournament.status !== "pending") throw fail("Can't leave a tournament that has already started.", 400)
	if (!isEntered(tournament, user.username)) throw fail("You're not registered for this tournament.", 400)

	tournament.participants = tournament.participants.filter((entry) => entry.user.username !== user.username)
	return toDetail(tournament)
}

// Starting is the moment the roster is locked and the draw happens. The real
// `Tournament.start()` shuffles the participants and numbers them 1..n; the seed
// is that draw, and round 1's tables are dealt from it.
export async function startTournament(id) {
	const user = requireUser()
	const tournament = find(id)

	if (tournament.created_by.username !== user.username)
		throw fail("Only the creator can start the tournament.", 403)
	if (tournament.status !== "pending") throw fail("This tournament has already started or finished.", 400)
	if (tournament.participants.length < 2) throw fail("Need at least 2 participants to start.", 400)

	const order = shuffled(tournament.participants)
	order.forEach((entry, index) => {
		entry.seed = index + 1
	})
	tournament.status = "in_progress"
	return toDetail(tournament)
}

// Fisher–Yates on a copy of the list: the participants keep the order they
// signed up in, and only their seeds are drawn.
function shuffled(list) {
	const out = [...list]
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out
}
