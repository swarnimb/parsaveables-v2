/**
 * Onboarding Tutorial Screen Data
 * 7 mandatory screens shown on first login after signup
 */

export const onboardingScreens = [
  {
    id: 1,
    title: 'Welcome to ParSaveables!',
    content: 'Your disc golf league just got an upgrade. Track rounds, climb the leaderboard, and compete with friends in a whole new way.',
    emoji: '🥏',
    showImage: false,
  },
  {
    id: 2,
    title: 'How It Works',
    content: 'Take a screenshot of your UDisc scorecard and email it in. Our AI extracts scores, applies our custom points system, and updates the leaderboard automatically.',
    emoji: '📸',
    showAnimation: true, // Shows AnimatedFlow component
  },
  {
    id: 3,
    title: 'Leaderboard',
    content: 'Track your rank across seasons and tournaments. Click on any player to see their detailed stats: wins, podiums, average points, and scoring stats.',
    emoji: '🏆',
    showImage: false,
    spotlightTarget: 'leaderboard', // Highlights bottom nav button
    spotlightPosition: 'above',
  },
  {
    id: 4,
    title: 'Rounds',
    content: 'View complete round history with dates, courses, and scores. Tap any round to expand and see everyone\'s performance that day.',
    emoji: '📊',
    showImage: false,
    spotlightTarget: 'rounds',
    spotlightPosition: 'above',
  },
  {
    id: 5,
    title: 'Podcast',
    content: 'Every month, we generate an AI podcast recapping highlights, rivalries, and drama from your rounds. Tune in for some friendly roasting!',
    emoji: '🎙️',
    showImage: false,
    spotlightTarget: 'podcast',
    spotlightPosition: 'above',
  },
  {
    id: 6,
    title: 'Process Scorecard',
    content: 'Found the Process Scorecard button in the top navigation? That\'s where admins can manually upload scorecards to keep the league running smoothly.',
    emoji: '⚙️',
    showImage: false,
    // No spotlight - keep centered to avoid bottom nav cutoff
  },
  {
    id: 7,
    title: 'One More Thing...',
    content: 'See that Betting tab in the navigation? Don\'t tap it yet 😏',
    emoji: '😏',
    showImage: false,
    spotlightTarget: 'betting',
    spotlightPosition: 'above',
  },
]

/**
 * Betting Tutorial Screen Data
 * Shown when user tries to access /betting for the first time
 */

export const bettingScreens = [
  {
    id: 1,
    title: 'Welcome to PULP',
    content: 'Your ParSaveables Ultimate Loyalty Program (PULP) - where every round earns rewards!',
    emoji: '🎉',
  },
  {
    id: 2,
    title: 'Earn PULPs',
    content: 'The more you play, the more you earn. Keep streaks going to earn even more!',
    emoji: '🔥',
  },
  {
    id: 3,
    title: 'Grow Your PULPs',
    content: 'Bet on who will be top 3 in the next round, or straight up challenge a rival to double your PULPs.',
    emoji: '📈',
  },
  {
    id: 4,
    title: 'Use Your PULPs',
    content: 'Buy advantages to gain competitive edges:',
    emoji: '🛒',
    showAdvantages: true, // Shows 2x2 grid of advantages
    advantages: [
      { name: 'Mulligan', icon: '🔄' },
      { name: 'Bag Trump', icon: '🎒' },
      { name: 'Anti-Mulligan', icon: '🚫' },
      { name: 'Shotgun Buddy', icon: '🍺' },
    ],
  },
  {
    id: 5,
    title: 'Your Vote Kinda Matters',
    content: 'ParSaveables is a wanna-be democracy, so we\'re asking: are you interested in the betting economy?',
    emoji: '🗳️',
    isInterestScreen: true, // Special flag for interest confirmation UI
  },
]
