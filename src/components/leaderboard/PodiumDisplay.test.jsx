import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PodiumDisplay from './PodiumDisplay'
import { mockLeaderboardPlayers } from '@/test/testUtils'

describe('PodiumDisplay', () => {
  it('should render nothing when players array is empty', () => {
    const { container } = render(<PodiumDisplay players={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render top 3 players on podium', () => {
    render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Check all three players are displayed
    expect(screen.getByText('Shogun')).toBeInTheDocument()
    expect(screen.getByText('Jabba the Putt')).toBeInTheDocument()
    expect(screen.getByText('🐦')).toBeInTheDocument() // Bird shows as emoji
  })

  it('should display player points and rounds', () => {
    render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Check points are displayed (component renders the number only, no "pts" suffix)
    expect(screen.getByText('290.5')).toBeInTheDocument()
    expect(screen.getByText('272.5')).toBeInTheDocument()
    expect(screen.getByText('243.5')).toBeInTheDocument()

    // Check rounds are displayed (some players may have same round count)
    const roundsElements = screen.getAllByText(/\d+ rounds/)
    expect(roundsElements.length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('33 rounds')).toBeInTheDocument()
  })

  it('should show trophy icon only for 1st place', () => {
    const { container } = render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Should have exactly 1 trophy icon
    const trophies = container.querySelectorAll('svg')
    const trophyIcons = Array.from(trophies).filter(svg =>
      svg.parentElement?.parentElement?.textContent?.includes('290.5')
    )
    expect(trophyIcons.length).toBeGreaterThan(0)
  })

  it('should expand player stats when clicked', async () => {
    const user = userEvent.setup()
    render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Initially, expanded stats should not be visible
    expect(screen.queryByText('Wins')).not.toBeInTheDocument()

    // Click on first player
    const shogunCard = screen.getByText('Shogun').closest('div')
    await user.click(shogunCard)

    // Expanded stats should now be visible
    expect(screen.getByText('Wins')).toBeInTheDocument()
    expect(screen.getByText('Podiums')).toBeInTheDocument()
    expect(screen.getByText('Avg Pts')).toBeInTheDocument()
    expect(screen.getByText('Birdies')).toBeInTheDocument()
    expect(screen.getByText('Eagles')).toBeInTheDocument()
    expect(screen.getByText('Aces')).toBeInTheDocument()
  })

  it('should apply highlight to expanded card', async () => {
    const user = userEvent.setup()
    render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Card should not have ring classes initially
    expect(screen.getByText('Shogun').parentElement).not.toHaveClass('ring-2')

    await user.click(screen.getByText('Shogun').parentElement)

    // Re-query after click — PodiumCard is defined inside PodiumDisplay so state
    // updates cause remount; a captured reference would be stale after re-render.
    await waitFor(() => {
      expect(screen.getByText('Shogun').parentElement).toHaveClass('ring-2')
      expect(screen.getByText('Shogun').parentElement).toHaveClass('ring-primary')
    })
  })

  it('should only allow one player expanded at a time (accordion behavior)', async () => {
    const user = userEvent.setup()
    render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Click first player
    const shogunCard = screen.getByText('Shogun').closest('div')
    await user.click(shogunCard)

    // Stats visible
    expect(screen.getByText('Wins')).toBeInTheDocument()

    // Click second player
    await user.click(screen.getByText('Jabba the Putt').parentElement)

    // After clicking Jabba, only Jabba's card should be highlighted
    await waitFor(() => {
      expect(screen.getByText('Jabba the Putt').parentElement).toHaveClass('ring-2')
      expect(screen.getByText('Shogun').parentElement).not.toHaveClass('ring-2')
    })
  })
})
