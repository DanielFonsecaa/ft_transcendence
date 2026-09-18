import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { enabledRuleLabels } from "./rooms.js"
import { computeStructure, makeDefaultConfig } from "./tournamentStructure.js"
import {
	createTournament,
	finalStandings,
	formatDate,
	getTournament,
	joinTournament,
	leaveTournament,
	listTournaments,
	makeTournamentId,
	resetTournaments,
	startTournament,
	STATUS_ACCENTS,
	STATUS_COLORS,
	STATUS_LABELS,
} from "./tournaments.js"

describe("makeTournamentId", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("is four characters by default", () => {
		expect(makeTournamentId()).toHaveLength(4)
	})

	it("has the requested length", () => {
		for (const length of [0, 1, 6, 12]) expect(makeTournamentId(length)).toHaveLength(length)
	})

	// People read these codes out loud and type them in. That's the whole reason
	// the alphabet leaves out I, O, 0 and 1.
	it("never uses I, O, 0 or 1", () => {
		const ids = Array.from({ length: 500 }, () => makeTournamentId(8)).join("")
		expect(ids).toMatch(/^[A-HJ-NP-Z2-9]+$/)
	})

	// Math.random lands anywhere in [0, 1). Pin both ends so an off-by-one can't
	// index past the alphabet and put "undefined" into a code.
	it("stays inside the alphabet at both ends of Math.random", () => {
		const random = vi.spyOn(Math, "random").mockReturnValue(0)
		expect(makeTournamentId(3)).toBe("AAA")

		random.mockReturnValue(0.999999)
		expect(makeTournamentId(3)).toBe("999")
	})
})

describe("formatDate", () => {
	// Midday UTC, so the date is the same in whatever timezone this runs in.
	it("shows a two-digit day, short month and year", () => {
		expect(formatDate("2026-03-03T12:00:00Z")).toBe("03 Mar 2026")
	})
})

describe("STATUS_COLORS", () => {
	it("has a colour for exactly the statuses that have a label", () => {
		expect(Object.keys(STATUS_COLORS).sort()).toEqual(Object.keys(STATUS_LABELS).sort())
	})
})

// ---------------------------------------------------------------------------
// The mock store. Every test starts from the seeded list, because the store is
// module state that lives as long as the session.
// ---------------------------------------------------------------------------

describe("listTournaments", () => {
	beforeEach(() => {
		resetTournaments()
	})

	// The backend's TournamentListSerializer sends `participant_count` and does
	// NOT send `participants` — the roster only comes with the detail. The mock
	// keeps that split, so the list page can't accidentally lean on a field the
	// real endpoint won't give it.
	it("sends a count of participants and never the roster", async () => {
		const rows = await listTournaments()

		expect(rows.length).toBeGreaterThan(0)
		for (const row of rows) {
			expect(typeof row.participant_count).toBe("number")
			expect(row).not.toHaveProperty("participants")
		}
	})
})

describe("getTournament", () => {
	beforeEach(() => {
		resetTournaments()
	})

	// TournamentDetailSerializer extends the list one, so the detail has both.
	it("returns the roster as well as the count", async () => {
		const tournament = await getTournament("8K2P")

		expect(tournament.id).toBe("8K2P")
		expect(tournament.participants).toHaveLength(tournament.participant_count)
		expect(tournament.participants[0].user.username).toBe("daniel")
	})

	// The settings sit flat on a tournament, which is the whole reason the pure
	// structure functions can read one straight from the store with no mapping.
	it("hands a tournament that computeStructure can read directly", async () => {
		const tournament = await getTournament("9QXR")

		expect(computeStructure(tournament)).toEqual(
			computeStructure({ max_participants: 8, players_per_table: 4, advance_per_table: 2 }),
		)
	})

	it("rejects an unknown id the way a 404 does", async () => {
		await expect(getTournament("NOPE")).rejects.toMatchObject({
			status: 404,
			message: expect.stringContaining("No tournament"),
		})
	})

	// Handing out the stored object would let a page mutate the store by editing
	// its own props, and the bug would only show on the next navigation.
	it("hands out a copy, not the stored tournament", async () => {
		const first = await getTournament("8K2P")
		first.name = "Renamed"
		first.participants.push(null)

		const second = await getTournament("8K2P")
		expect(second.name).toBe("Friday Showdown")
		expect(second.participants).toHaveLength(14)
	})
})

// The mock reads the signed-in user out of localStorage, the one place the app
// already keeps it (`lib/auth.jsx`). The real endpoints read the session cookie,
// which is why none of them takes a user argument.
function signIn(username = "rita_c", stored = {}) {
	const values = new Map([["user", JSON.stringify({ username, avatar: "/profile/cat.jpg", ...stored })]])
	globalThis.localStorage = {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, String(value)),
		removeItem: (key) => values.delete(key),
	}
}

function signOut() {
	delete globalThis.localStorage
}

describe("createTournament", () => {
	beforeEach(() => {
		resetTournaments()
		signIn()
	})

	afterEach(() => {
		signOut()
	})

	const config = () => ({ ...makeDefaultConfig("knockout"), name: "Friday Cup" })

	// The real view creates the tournament and immediately registers the creator,
	// so a brand new tournament already has one participant.
	it("signs the creator up as the only participant", async () => {
		const created = await createTournament(config())

		expect(created.status).toBe("pending")
		expect(created.created_by.username).toBe("rita_c")
		expect(created.participants).toHaveLength(1)
		expect(created.participants[0].user.username).toBe("rita_c")
		expect(created.participants[0].final_position).toBeNull()
	})

	// `auth.jsx` stores the photo as `avatar`; the contract's name for it is
	// `avatar_url`, because that is what PublicProfileSerializer sends.
	it("carries the signed-in photo over as avatar_url", async () => {
		const created = await createTournament(config())
		expect(created.participants[0].user.avatar_url).toBe("/profile/cat.jpg")
	})

	it("puts it at the top of the list, with a readable id", async () => {
		const created = await createTournament({ ...config(), name: "Sunday Slam" })
		const rows = await listTournaments()

		expect(rows[0].id).toBe(created.id)
		expect(rows[0].name).toBe("Sunday Slam")
		expect(created.id).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
	})

	it("keeps the settings flat on the tournament", async () => {
		const created = await createTournament({ ...config(), max_participants: 8, players_per_table: 4, seven_swap: true })

		expect(created.max_participants).toBe(8)
		expect(created.players_per_table).toBe(4)
		expect(enabledRuleLabels(created)).toEqual(["Seven swap"])
	})

	it("trims the name", async () => {
		const created = await createTournament({ ...config(), name: "  Friday Cup  " })
		expect(created.name).toBe("Friday Cup")
	})

	// The endpoint needs an account. Guests are sent to the Login before the
	// dialog ever opens, but the rule belongs here too, not only in the UI.
	it("rejects a guest", async () => {
		signOut()
		await expect(createTournament(config())).rejects.toMatchObject({ status: 403 })
	})

	// validateConfig is the dialog's live error list; this is the backstop that
	// makes the same rules true of the endpoint, not just of the form.
	it("rejects an invalid config and stores nothing", async () => {
		const before = (await listTournaments()).length

		await expect(createTournament({ ...config(), name: "" })).rejects.toMatchObject({ status: 400 })
		expect(await listTournaments()).toHaveLength(before)
	})

	it("never reuses an id that is already taken", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0)
		const first = await createTournament(config())
		const second = await createTournament(config())

		expect(second.id).not.toBe(first.id)
		vi.restoreAllMocks()
	})
})

describe("joinTournament", () => {
	beforeEach(() => {
		resetTournaments()
		signIn()
	})

	afterEach(() => {
		signOut()
	})

	it("adds me to the roster and answers with the fresh tournament", async () => {
		const before = await getTournament("8K2P")
		const after = await joinTournament("8K2P")

		expect(after.participant_count).toBe(before.participant_count + 1)
		expect(after.participants.at(-1).user.username).toBe("rita_c")
		expect(after.participants.at(-1).final_position).toBeNull()
	})

	it("keeps me on the roster on the next read", async () => {
		await joinTournament("8K2P")
		const again = await getTournament("8K2P")
		expect(again.participants.some((p) => p.user.username === "rita_c")).toBe(true)
	})

	it("refuses to sign me up twice", async () => {
		await joinTournament("8K2P")
		await expect(joinTournament("8K2P")).rejects.toMatchObject({
			status: 400,
			message: "Already registered.",
		})
	})

	// 3FPQ is in progress: the draw has happened, so the roster is locked.
	it("refuses a tournament that has already started", async () => {
		await expect(joinTournament("3FPQ")).rejects.toMatchObject({
			status: 400,
			message: "Registration is closed.",
		})
	})

	it("refuses a full tournament", async () => {
		// RB7M is still open for entries and already seats its 16.
		await expect(joinTournament("RB7M")).rejects.toMatchObject({
			status: 400,
			message: "Tournament is full.",
		})
	})

	it("refuses a guest", async () => {
		signOut()
		await expect(joinTournament("8K2P")).rejects.toMatchObject({ status: 403 })
	})

	it("refuses an unknown tournament", async () => {
		await expect(joinTournament("NOPE")).rejects.toMatchObject({ status: 404 })
	})
})

describe("leaveTournament", () => {
	beforeEach(() => {
		resetTournaments()
		signIn()
	})

	afterEach(() => {
		signOut()
	})

	it("takes me back off the roster", async () => {
		const joined = await joinTournament("8K2P")
		const left = await leaveTournament("8K2P")

		expect(left.participant_count).toBe(joined.participant_count - 1)
		expect(left.participants.some((p) => p.user.username === "rita_c")).toBe(false)
	})

	it("leaves everybody else where they were", async () => {
		const before = await getTournament("8K2P")
		await joinTournament("8K2P")
		const after = await leaveTournament("8K2P")

		expect(after.participants.map((p) => p.user.username)).toEqual(
			before.participants.map((p) => p.user.username),
		)
	})

	it("refuses when I was never signed up", async () => {
		await expect(leaveTournament("8K2P")).rejects.toMatchObject({
			status: 400,
			message: "You're not registered for this tournament.",
		})
	})

	it("refuses a tournament that has already started", async () => {
		signIn("feazeved")
		await expect(leaveTournament("3FPQ")).rejects.toMatchObject({
			status: 400,
			message: "Can't leave a tournament that has already started.",
		})
	})

	it("refuses a guest", async () => {
		signOut()
		await expect(leaveTournament("8K2P")).rejects.toMatchObject({ status: 403 })
	})
})

describe("startTournament", () => {
	beforeEach(() => {
		resetTournaments()
		signIn("daniel")
	})

	afterEach(() => {
		signOut()
	})

	it("moves a pending tournament into progress, for good", async () => {
		const started = await startTournament("8K2P")
		expect(started.status).toBe("in_progress")
		expect((await getTournament("8K2P")).status).toBe("in_progress")
	})

	// `Tournament.start()` shuffles the roster and numbers it: the seed is the
	// draw, and it is what decides who meets whom in round 1.
	it("seeds every participant exactly once", async () => {
		const started = await startTournament("8K2P")
		const seeds = started.participants.map((p) => p.seed).sort((a, b) => a - b)

		expect(seeds).toEqual(Array.from({ length: started.participant_count }, (_, i) => i + 1))
	})

	it("refuses anyone who is not the host", async () => {
		signIn("rita_c")
		await expect(startTournament("8K2P")).rejects.toMatchObject({
			status: 403,
			message: "Only the creator can start the tournament.",
		})
	})

	it("refuses a tournament with nobody to play against", async () => {
		signIn("rita_c")
		const alone = await createTournament({ ...makeDefaultConfig("knockout"), name: "Just me" })

		await expect(startTournament(alone.id)).rejects.toMatchObject({
			status: 400,
			message: "Need at least 2 participants to start.",
		})
	})

	// The host is checked before the status, exactly as the real view does, so each
	// of these has to be tried as its own host.
	it.each([
		["3FPQ", "feazeved"],
		["ZM1K", "daniel"],
	])("refuses %s, which is already under way or over", async (id, host) => {
		signIn(host)
		await expect(startTournament(id)).rejects.toMatchObject({
			status: 400,
			message: "This tournament has already started or finished.",
		})
	})

	it("refuses a guest", async () => {
		signOut()
		await expect(startTournament("8K2P")).rejects.toMatchObject({ status: 403 })
	})
})

describe("finalStandings", () => {
	beforeEach(() => {
		resetTournaments()
	})

	// The podium is derived from `final_position`, which is the field the backend
	// already has for it — not from a separate list of names.
	it("puts the three places in order", async () => {
		const tournament = await getTournament("9QXR")

		expect(finalStandings(tournament).map((entry) => entry.user.username)).toEqual([
			"ana",
			"player_5",
			"player_3",
		])
	})

	it("reads the order from final_position, not from the roster order", async () => {
		const tournament = await getTournament("9QXR")
		tournament.participants.reverse()

		expect(finalStandings(tournament).map((entry) => entry.final_position)).toEqual([1, 2, 3])
	})

	it("is empty while nobody has finished", async () => {
		expect(finalStandings(await getTournament("8K2P"))).toEqual([])
	})

	it("survives a tournament with no participants at all", () => {
		expect(finalStandings({})).toEqual([])
	})

	// A tournament can rank everybody; the panel is a podium, so it shows three.
	it("never shows more than three", () => {
		const many = { participants: Array.from({ length: 9 }, (_, i) => ({ user: { username: `p${i}` }, final_position: i + 1 })) }
		expect(finalStandings(many)).toHaveLength(3)
	})
})

describe("the mock store end to end", () => {
	beforeEach(() => {
		resetTournaments()
	})

	afterEach(() => {
		signOut()
	})

	it("carries one tournament from created to in progress", async () => {
		signIn("rita_c")
		const created = await createTournament({ ...makeDefaultConfig("knockout"), name: "Sunday Slam" })
		expect(created.status).toBe("pending")

		signIn("daniel")
		const joined = await joinTournament(created.id)
		expect(joined.participant_count).toBe(2)

		// Only the host can start it, and the host is whoever created it.
		await expect(startTournament(created.id)).rejects.toMatchObject({ status: 403 })

		signIn("rita_c")
		const started = await startTournament(created.id)
		expect(started.status).toBe("in_progress")

		// And the list agrees, because there is only ever one store.
		const row = (await listTournaments()).find((entry) => entry.id === created.id)
		expect(row.status).toBe("in_progress")
		expect(row.participant_count).toBe(2)
	})
})

describe("STATUS_ACCENTS", () => {
	it("has a card stripe for exactly the statuses that have a label", () => {
		expect(Object.keys(STATUS_ACCENTS).sort()).toEqual(Object.keys(STATUS_LABELS).sort())
	})
})
