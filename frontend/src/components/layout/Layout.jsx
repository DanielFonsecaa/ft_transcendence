import { Outlet } from "react-router"
import Header from "./Header.jsx"
import Footer from "./Footer.jsx"

// The frame every page but the Game Table sits in. <Outlet /> is the hole the
// routed page drops into.
function Layout() {
	return (
		<div className="flex min-h-screen flex-col bg-page">
			<Header />
			<main className="flex flex-1 flex-col">
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}

export default Layout
