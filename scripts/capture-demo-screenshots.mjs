#!/usr/bin/env node
/**
 * Capture README screenshots from the running demo preview.
 *
 * Prereqs:
 *   0. npm install --no-save puppeteer   (heavy; not a tracked dependency)
 *   1. npm run build:demo
 *   2. npx cross-env VITE_DEMO_MODE=true vite preview --port 4173 --strictPort
 *   3. node scripts/capture-demo-screenshots.mjs
 *
 * Captures at mobile width (the product is mobile-first). Output → docs/screenshots/.
 */

import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'docs', 'screenshots')
mkdirSync(outDir, { recursive: true })

const BASE = 'http://localhost:4173/parsaveables-v2/#'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 })

// Suppress the splash screen and the first-visit PULP tutorial so screenshots
// show actual content, not overlays. Runs before page scripts on every load.
await page.evaluateOnNewDocument(() => {
  try {
    sessionStorage.setItem('splashShown', 'true')
    localStorage.setItem('parsaveables_tutorials', JSON.stringify({ pulp_economy: { completed: true } }))
  } catch {
    // storage unavailable — ignore
  }
})

async function snap(route, name, { beforeShot } = {}) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' })
  await sleep(2600) // entrance animations settle
  // Hide the demo banner so screenshots read as the real app, and pull the
  // content up to sit flush under the (now banner-less) header.
  await page.addStyleTag({
    content: `
      header > .bg-amber-500 { display: none !important; }
      main { padding-top: 4rem !important; }
    `,
  })
  if (beforeShot) await beforeShot()
  // All shots share one viewport size → identical dimensions → clean single row
  await page.screenshot({ path: join(outDir, name) })
  console.log('captured', name)
}

await snap('/leaderboard', 'leaderboard.png')

await snap('/rounds', 'rounds.png', {
  beforeShot: async () => {
    // Expand the first round to reveal the AI-read scorecard + standings
    await page.evaluate(() => {
      const btn = document.querySelector('main button')
      if (btn) btn.click()
    })
    await sleep(2200) // expand animation + scorecard image load
  },
})

await snap('/pulps', 'pulps.png')
await snap('/podcast', 'podcast.png')

await browser.close()
console.log('Done →', outDir)
