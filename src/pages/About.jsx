import { BookOpen, Coins, Trophy, Github, Mail, HelpCircle } from 'lucide-react'
import Tutorial from '@/components/tutorial/Tutorial'
import { coreTutorial, pulpTutorial } from '@/components/tutorial/tutorialData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PageContainer from '@/components/layout/PageContainer'

export default function About() {
  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">About ParSaveables</h1>
        <p className="text-muted-foreground">
          Learn how to use the app and get help
        </p>
      </div>

      {/* Tutorials Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tutorials
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Core App Tutorial</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn the basics: rounds, points, leaderboards, and achievements
                  </p>
                </div>
              </div>
              <Tutorial
                tutorial={coreTutorial}
                trigger={
                  <Button className="w-full">
                    Start Core Tutorial
                  </Button>
                }
              />
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">PULP Economy Tutorial</h3>
                  <p className="text-sm text-muted-foreground">
                    Master betting, challenges, and the advantage shop
                  </p>
                </div>
              </div>
              <Tutorial
                tutorial={pulpTutorial}
                trigger={
                  <Button className="w-full">
                    Start PULP Tutorial
                  </Button>
                }
              />
            </Card>
          </div>
        </div>

        {/* About Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">What is ParSaveables?</h2>
          <Card className="p-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">ParSaveables</strong> is a disc golf tournament and season tracking platform designed for friend groups and small leagues (10-20 players). We transform traditional scoring into an engaging social experience through AI-powered automation and gamification.
              </p>
              <p>
                <strong className="text-foreground">Key Features:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI-Powered Scorecard Processing - Email your UDisc screenshots, we handle the rest</li>
                <li>Dual Leaderboard System - Traditional points + PULP rankings</li>
                <li>Achievement System - Earn badges and PULPs for milestones</li>
                <li>Betting & Predictions - Wager PULPs on round outcomes</li>
                <li>Head-to-Head Challenges - Battle rivals for PULP glory</li>
                <li>Advantages Shop - Buy power-ups to gain competitive edges</li>
                <li>Activity Feed - Stay updated on group activity</li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <a
                href="https://github.com/yourusername/parsaveables"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-primary transition-colors"
              >
                <Github className="h-5 w-5" />
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-xs text-muted-foreground">View source code</p>
                </div>
              </a>
            </Card>

            <Card className="p-4">
              <a
                href="mailto:support@parsaveables.com"
                className="flex items-center gap-3 hover:text-primary transition-colors"
              >
                <Mail className="h-5 w-5" />
                <div>
                  <p className="font-medium">Support</p>
                  <p className="text-xs text-muted-foreground">Get help</p>
                </div>
              </a>
            </Card>

            <Card className="p-4">
              <a
                href="/faq"
                className="flex items-center gap-3 hover:text-primary transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">FAQ</p>
                  <p className="text-xs text-muted-foreground">Common questions</p>
                </div>
              </a>
            </Card>
          </div>
        </div>

        {/* Version Info */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">2.0.0-beta</span>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
