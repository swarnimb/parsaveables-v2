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
  },
  {
    id: 4,
    title: 'Rounds',
    content: 'View complete round history with dates, courses, and scores. Tap any round to expand and see everyone\'s performance that day.',
    emoji: '📊',
    showImage: false,
  },
  {
    id: 5,
    title: 'Podcast',
    content: 'Every month, we generate an AI podcast recapping highlights, rivalries, and drama from your rounds. Tune in for some friendly roasting!',
    emoji: '🎙️',
    showImage: false,
  },
  {
    id: 6,
    title: 'Process Scorecard',
    content: 'Found the Process Scorecard button in the top navigation? That\'s where admins can manually upload scorecards to keep the league running smoothly.',
    emoji: '⚙️',
    showImage: false,
  },
  {
    id: 7,
    title: 'One More Thing...',
    content: 'See that Betting tab in the navigation? Don\'t tap it yet 😏',
    emoji: '😏',
    showImage: false,
  },
]

/**
 * Betting Tutorial Screen Data
 * Shown when user tries to access /betting for the first time
 */

export const bettingScreens = [
  {
    id: 1,
    title: 'Welcome to Betting',
    content: 'Ready to make rounds more interesting? ParSaveables betting lets you wager PULP on predictions and challenge rivals.',
    emoji: '💰',
  },
  {
    id: 2,
    title: 'How Predictions Work',
    content: 'Before each round, predict the top 3 finishers. Get it right and earn PULP. The more confident you are, the more you can wager.',
    emoji: '🎯',
  },
  {
    id: 3,
    title: 'PULP Economy',
    content: 'PULP is your currency. Earn it by playing well, making good predictions, and winning challenges. Spend it on advantages like mulligans and bag trumps.',
    emoji: '💎',
  },
  {
    id: 4,
    title: 'Are You Interested?',
    content: 'We\'re gauging interest before launching the full betting system. Let us know if you\'d like to participate!',
    emoji: '🤔',
    isInterestScreen: true, // Special flag for interest confirmation UI
  },
]
