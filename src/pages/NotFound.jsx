import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Page not found</p>
        <Link
          to="/leaderboard"
          className="text-primary hover:underline"
        >
          Go back to Leaderboard
        </Link>
      </div>
    </div>
  )
}
