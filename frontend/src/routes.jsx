import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import Layout from '@/components/layout/Layout.jsx'
import RequireAuth from '@/components/layout/RequireAuth.jsx'

// lazy() delays loading a page's code until it's actually needed.
// "/" will not download NotFound's code until you access 404.
const Home = lazy(() => import('@/pages/Home.jsx'))
const Tournaments = lazy(() => import('@/pages/Tournaments.jsx'))
const Profile = lazy(() => import('@/pages/Profile.jsx'))
const Play = lazy(() => import('@/pages/Play.jsx'))
const Room = lazy(() => import('@/pages/Room.jsx'))
const TournamentDetail = lazy(() => import('@/pages/TournamentDetail.jsx'))
const Rules = lazy(() => import('@/pages/Rules.jsx'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard.jsx'))
const Login = lazy(() => import('@/pages/Login.jsx'))
const Friends = lazy(() => import('@/pages/Friends.jsx'))
const Register = lazy(() => import('@/pages/Register.jsx'))
const OAuthCallback = lazy(() => import('@/pages/OAuthCallback.jsx'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy.jsx'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService.jsx'))
const NotFound = lazy(() => import('@/pages/NotFound.jsx'))

// Dev-only playgrounds. Vite replaces `import.meta.env.DEV` with `true` under
// `vite` (npm run dev) and `false` under `vite build`, so a production build
// turns these into `null` and drops the imports — the pages and the fake data
// never reach the bundle. Checking only in the <Route> below wouldn't be
// enough: the import would stay.
const TablePlayground = import.meta.env.DEV ? lazy(() => import('@/pages/dev/TablePlayground.jsx')) : null
const UiPlayground = import.meta.env.DEV ? lazy(() => import('@/pages/dev/UiPlayground.jsx')) : null

function AppRoutes() {
	return (
		// Because pages load lazily, there's a brief moment with nothing to show
		// Suspense catches that and render `fallback` until the lazy resolve.
		<Suspense fallback={<div>Loading…</div>}>
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
					<Route path="/tournament" element={<Tournaments />} />
					<Route path="/leaderboard" element={<Leaderboard />} />
					<Route path="/play" element={<Play />} />
					<Route path="/room/:id" element={<Room />} />
					<Route path="/tournament/:id" element={<TournamentDetail />} />
					<Route path="/rules" element={<Rules />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					{/* Signed out, these bounce to the Login and come back after it. */}
					<Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
					<Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
					<Route path="/oauth/callback" element={<OAuthCallback />} />
					<Route path="/privacy-policy" element={<PrivacyPolicy />} />
					<Route path="/terms-of-service" element={<TermsOfService />} />
					{/* Dev only: these are null in a production build, so the routes don't exist there. */}
					{TablePlayground && <Route path="/dev/table" element={<TablePlayground />} />}
					{UiPlayground && <Route path="/dev/ui" element={<UiPlayground />} />}
					<Route path="*" element={<NotFound />} />
				</Route>
			</Routes>
		</Suspense>
	)
}

export default AppRoutes
