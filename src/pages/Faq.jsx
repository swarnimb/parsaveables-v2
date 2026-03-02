import { HelpCircle } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import PageContainer from '@/components/layout/PageContainer'

const faqs = [
  {
    q: 'How do I submit a scorecard?',
    a: 'Take a screenshot of your UDisc scorecard after your round and email it to the ParSaveables processing address. Our AI extracts every player\'s scores, applies the points system, and updates the leaderboard automatically — usually within a few minutes.',
  },
  {
    q: 'What is PULP?',
    a: 'PULP stands for ParSaveables Ultimate Loyalty Program. It\'s the in-app currency you earn by playing rounds and competing. You can spend PULPs on Advantages that give you real in-game edges on the course.',
  },
  {
    q: 'How do I earn PULPs?',
    a: 'Every round automatically earns you PULPs: +10 for participating, +5 for each higher-ranked player you beat in that round (seasons only), and a DRS bonus if you finish 4th or lower (+2 for 4th, +4 for 5th, +6 for 6th, and so on). You can also win PULPs through Blessings and Challenges.',
  },
  {
    q: 'What is a PULPy window?',
    a: 'A PULPy window is a 5-minute window that any player can open before a round. While the window is open, players can place Blessings and issue Challenges. Once the window closes, no new activity is accepted — everything is locked and waits for the next scorecard to settle.',
  },
  {
    q: 'What is a Blessing?',
    a: 'A Blessing is a prediction on which 3 players will podium (finish top 3) in the next round. You pick 3 players and put PULPs on it. If your picks land correctly, you get 2x your PULP stake back.',
  },
  {
    q: 'What happens if my Blessing is wrong?',
    a: 'Your staked PULPs are lost. Blessings are all-or-nothing — all 3 players must finish in the top 3 for the Blessing to pay out.',
  },
  {
    q: 'What is a Challenge?',
    a: 'A Challenge is a head-to-head duel between two players. The challenger picks a higher-ranked opponent and puts PULPs on it. If the challengee accepts, both players\' PULPs are locked. Whoever shoots fewer strokes in the next round wins both sides.',
  },
  {
    q: 'What happens if the challengee doesn\'t respond before the window closes?',
    a: 'If the challenged player ignores the challenge, both players lose 50% of the wager as a penalty. The challenger gets the remaining 50% back. Ignoring challenges is costly by design.',
  },
  {
    q: 'What happens if I decline a Challenge?',
    a: 'Declining costs you 50% of the wager amount as a cowardice tax, even though you never put anything in. The challenger gets a full refund. Declining is cheaper than ignoring, but still has a cost.',
  },
  {
    q: 'What if a Challenge ends in a tie (same strokes)?',
    a: 'If both players shoot the same total strokes, it\'s a tie — both players get their PULPs fully refunded.',
  },
  {
    q: 'What are Advantages?',
    a: 'Advantages are power-ups you buy with PULPs that apply during a real round on the course. Current Advantages include: Mulligan (replay a shot), Anti-Mulligan (force an opponent to replay a good shot), Bag Trump (ban one disc from an opponent\'s bag for a hole), and Shotgun Buddy (join someone\'s hole mid-round).',
  },
  {
    q: 'Do Advantages expire?',
    a: 'Yes. Advantages expire at 11:59 PM on the day you purchase them. Buy them the day of your round.',
  },
  {
    q: 'Can I stack multiple Advantages?',
    a: 'No. You can only hold one of each Advantage type at a time. Buying a second Mulligan while you already have one is blocked.',
  },
  {
    q: 'What\'s the difference between a Season and a Tournament?',
    a: 'A Season spans the full calendar year and tracks cumulative points across all rounds. A Tournament is a shorter standalone event with its own leaderboard. Beat-higher-ranked PULP bonuses only apply in Seasons.',
  },
  {
    q: 'How is the leaderboard ranked?',
    a: 'Players are ranked by total points accumulated across all rounds in the selected event. Points are awarded based on your finishing position each round using the configured points system, with optional course difficulty multipliers.',
  },
  {
    q: 'What happens when players tie?',
    a: 'Ties go through 4 tie-breakers in order: total strokes, head-to-head record, most wins, most podiums. If all 4 tie-breakers are still equal, the tied players share the positions and their rank points are averaged across the positions they span.',
  },
  {
    q: 'What is the DRS bonus?',
    a: 'DRS (Drag Reduction System) is a consolation bonus for players finishing outside the top 3. 4th place gets +2 PULPs, 5th gets +4, 6th gets +6, and so on. It keeps lower-ranked players engaged and earning regardless of where they finish.',
  },
  {
    q: 'What is the "Beat Higher-Ranked" bonus?',
    a: 'If you finish ahead of a player who is ranked above you on the season leaderboard, you earn +5 PULPs per higher-ranked player you beat in that round. This rewards upsets and keeps competition interesting at every level.',
  },
  {
    q: 'How is the podcast generated?',
    a: 'Once a month, an AI generates a podcast script recapping round highlights, rivalries, standout performances, and drama from the group. The script is reviewed before publishing. Episodes appear in the Podcast tab.',
  },
  {
    q: 'What happens to my PULPs between seasons?',
    a: 'PULPs carry over between seasons — there is no automatic reset. If the group decides to start a new season fresh, an admin can manually reset balances.',
  },
]

export default function Faq() {
  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground">
          Everything you need to know about ParSaveables
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PageContainer>
  )
}
