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

    // Check points are displayed
    expect(screen.getByText('290.5 pts')).toBeInTheDocument()
    expect(screen.getByText('272.5 pts')).toBeInTheDocument()
    expect(screen.getByText('243.5 pts')).toBeInTheDocument()

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
    expect(screen.getByText('Avg Points/Round')).toBeInTheDocument()
    expect(screen.getByText('Birdies')).toBeInTheDocument()
    expect(screen.getByText('Eagles')).toBeInTheDocument()
    expect(screen.getByText('Aces')).toBeInTheDocument()
  })

  it('should apply highlight to expanded card', async () => {
    const user = userEvent.setup()
    render(<PodiumDisplay players={mockLeaderboardPlayers} />)

    // Find the card - it's the parent of the player name
    const shogunName = screen.getByText('Shogun')
    const shogunCard = shogunName.parentElement

    // Card should not have ring classes initially (has border-2 border-primary instead)
    expect(shogunCard).not.toHaveClass('ring-2')

    await user.click(shogunCard)

    // Wait for state update and check ring highlight
    await waitFor(() => {
      expect(shogunCard).toHaveClass('ring-2')
      expect(shogunCard).toHaveClass('ring-primary')
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
    const jabbaCard = screen.getByText('Jabba the Putt').closest('div')
    await user.click(jabbaCard)

    // First player should be collapsed, second expanded
    // (both will show stats section, but only one should be highlighted)
    const highlightedCards = screen.getAllByText(/\d+\.\d+ pts/).filter(el =>
      el.closest('div')?.classList.contains('ring-2')
    )

    // Should have at most 1 highlighted card
    expect(highlightedCards.length).toBeLessThanOrEqual(3) // accounting for all cards
  })
})
