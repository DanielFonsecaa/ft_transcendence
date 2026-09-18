import { Outlet, useLocation } from "react-router"
import BigFooter from "./BigFooter.jsx"
import Footer from "./Footer.jsx"
import Header from "./Header.jsx"
import ScrollToHash from "./ScrollToHash.jsx"

// The frame every page but the Game Table sits in. <Outlet /> is the hole the
// routed page drops into. Home gets the big footer; everywhere else the slim one.
function Layout() {
	const isHome = useLocation().pathname === "/"

	return (
		<div className="flex min-h-screen flex-col bg-page">
			<ScrollToHash />
			<Header />
			<main className="flex flex-1 flex-col">
				<Outlet />
			</main>
			{isHome ? <BigFooter /> : <Footer />}
		</div>
	)
}

export default Layout
