import { useCallback, useEffect, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import GameHeader from "@/components/game/GameHeader.jsx"
import GameTable from "@/components/game/GameTable.jsx"
import Footer from "@/components/layout/Footer.jsx"
import Header from "@/components/layout/Header.jsx"
import Lobby from "@/components/room/Lobby.jsx"
import Button from "@/components/ui/Button.jsx"
import { ErrorMessage, Loading } from "@/components/ui/Message.jsx"
import api from "@/lib/api.js"
import { useAuth } from "@/lib/auth.jsx"
import { useGameSocket } from "@/lib/socket.js"

// Owns the room's connection and decides which view is on screen. The two views
// (Lobby, GameTable) are dumb by design — they take a payload and hand actions
// back up, so this is the only file that knows the server exists.
//
// It also draws its own frame, which is why this route sits outside Layout: the
// lobby wants the site header and footer, and the game wants neither. The table
// gets a slim header of its own and every pixel of the height.
function Room() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()

	// `lobby` and `game` are whole payloads straight off the socket. The server
	// pushes one the moment we connect, so there is nothing to seed by hand — we
	// only wait for the first message to arrive.
	const [lobby, setLobby] = useState(null)
	const [game, setGame] = useState(null)
	const [publicId, setPublicId] = useState(null)
	const [error, setError] = useState("")

	// Claim a place before opening the socket — the server only lets players and
	// spectators listen. Doing it here rather than on the Play page means a
	// shared link, a refresh and a click all take the same path.
	//
	// The route param can be a join code (e.g. from the room list) rather than
	// the UUID, but the socket route only accepts the UUID — so we resolve it
	// from the game payload before opening the socket.
	useEffect(() => {
		if (!user) return
		let cancelled = false

		;(async () => {
			try {
				const room = await api.get(`/games/${id}/`)
				// A player arrives nested under `user`; a spectator has `username` on
				// the row itself. Reading both the same way sent spectators back to
				// join, which then refused them.
				const isMe = (person) => (person?.user?.username ?? person?.username) === user.username
				const alreadyIn = room.players.some(isMe) || room.spectators.some(isMe)
				if (!alreadyIn) await api.post(`/games/${id}/join/`, {})
				if (!cancelled) setPublicId(room.public_id)
			} catch (err) {
				if (!cancelled) setError(err.message)
			}
		})()

		return () => {
			cancelled = true
		}
	}, [id, user])

	const handleMessage = useCallback((data) => {
		if (data.type === "lobby") {
			setLobby(data)
			setGame(null)
		} else if (data.type === "game_state") {
			// The payload type flipping IS the "game started" signal.
			if (data.state === null)
				return
			setGame(data)
		} else if (data.type === "error") {
			setError(data.message)
		}
	}, [])

	const { connected, send } = useGameSocket(publicId, handleMessage)

	if (!user) return <Navigate to="/login" replace state={{ from: `/room/${id}` }} />

	const act = async (path, body) => {
		setError("")
		try {
			await api.post(`/games/${id}/${path}/`, body ?? {})
		} catch (err) {
			setError(err.message)
		}
	}

	// No optimistic updates anywhere: the server broadcasts the new room to
	// everyone, and the views redraw from that.
	const takeSeat = (index) => act("seat", { index })
	const goSpectate = () => act("spectate")
	const startGame = () => act("start")
	const leaveRoom = async () => {
		await act("leave")
		navigate("/#rooms")
	}

	// The game takes the whole window and scrolls nowhere: the arena measures itself
	// against this height, which is what makes the compact arena possible.
	if (game) {
		return (
			<div className="flex h-dvh flex-col overflow-hidden bg-page">
				<GameHeader code={id} watching={game.spectator_count ?? 0} />
				<main className="flex min-h-0 flex-1 flex-col">
					<GameTable game={game} send={send} error={error} roomCode={id} />
				</main>
			</div>
		)
	}

	// Everything else — the lobby, loading, a failure — sits in the normal frame.
	return (
		<div className="flex min-h-dvh flex-col bg-page">
			<Header />
			<main className="flex flex-1 flex-col">
				{error && !lobby ? (
					<section className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-5 px-[clamp(16px,4vw,24px)] py-16 text-center">
						<ErrorMessage boxed>{error}</ErrorMessage>
						<Button variant="outline" color="yellow" onClick={() => navigate("/#rooms")}>
							Back to rooms
						</Button>
					</section>
				) : lobby ? (
					<Lobby
						lobby={lobby}
						user={user}
						connected={connected}
						error={error}
						onSeat={takeSeat}
						onSpectate={goSpectate}
						onStart={startGame}
						onLeave={leaveRoom}
					/>
				) : (
					<Loading className="py-16 text-center">Joining room…</Loading>
				)}
			</main>
			<Footer />
		</div>
	)
}

export default Room
