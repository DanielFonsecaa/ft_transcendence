import { Link, useLocation } from "react-router"
import { useAuth } from "@/lib/auth.jsx"

const buttonBase = "inline-block rounded-xl px-6 py-3 font-bold transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
const primaryButton = `${buttonBase} bg-white text-black hover:rainbow-shadow`
const secondaryButton = '${buttonBase} border border-border text-white hover:bg-white/10'

function Hero() {
	//className is the convention for the css in tailwind, same as class in css.
	// Spread onto a link to make its target open as a popup over this page
	// instead of navigating away to the full page (see routes.jsx / NavBar.jsx).
	const location = useLocation()
	const asModal = { state: { background: location } }

	const { user } = useAuth()

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-24">
			{user && (
			<p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
				Welcome back, {user.username}
			</p>
			)}

			<h1 className="rainbow-text text-6xl font-bold tracking-tight sm:text-8xl">
				ONE
			</h1>

			<p className="max-w-xl text-lg text-muted-foreground">
				{user
					? "A table is always open. Jump in and dump your hand!"
					: "The classic card game. Match a color or number, discard your hand and don't forget to call ONE!"}
			</p>

			<div className="flex flex-wrap items-center justify-center gap-3">
				{user ? (
					<>
						<Link to="/play" {...asModal} className={primaryButton}>
							Play now!
						</Link>
						<Link to="/tournament" {...asModal} className={secondaryButton}>
							Tournaments
						</Link>
					</>
				) : (
					<>
						<Link to="/register" className={primaryButton}>
							Create account
						</Link>
						<Link to="/login" className={secondaryButton}>
							Sign in
						</Link>
					</>
				)}
			</div>
		</section>
	)
}

function Home() {
	return (
		<div className="flex-1 text-white">
			<Hero />
		</div>
	)
}

export default Home
