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
    content: 'See that PULPs tab in the navigation? That\'s where the real fun is — open PULPy windows, place Blessings, challenge rivals, and spend PULPs on Advantages.',
    emoji: '🪙',
    showImage: false,
    spotlightTarget: 'pulps',
    spotlightPosition: 'above',
  },
]

/**
 * PULP Economy Tutorial Screen Data
 * Shown from the About page PULP Economy card
 */

export const pulpScreens = [
  {
    id: 1,
    title: 'Welcome to PULP',
    content: 'Your ParSaveables Ultimate Loyalty Program (PULP) — where every round earns rewards!',
    emoji: '🎉',
  },
  {
    id: 2,
    title: 'Earn PULPs',
    content: 'Play rounds to earn PULPs automatically: +10 for participation, +5 per higher-ranked player you beat, and bonus PULPs for finishing outside the top 3.',
    emoji: '🔥',
  },
  {
    id: 3,
    title: 'Grow Your PULPs',
    content: 'When a PULPy window opens (5 minutes!), place a Blessing on the top 3 finishers or challenge a rival to a head-to-head duel to double your PULPs.',
    emoji: '📈',
  },
  {
    id: 4,
    title: 'Spend Your PULPs',
    content: 'Buy advantages to gain competitive edges on the course:',
    emoji: '🛒',
    showAdvantages: true,
    advantages: [
      { name: 'Mulligan', icon: '🔄' },
      { name: 'Bag Trump', icon: '🎒' },
      { name: 'Shotgun Buddy', icon: '🍺' },
    ],
  },
]
