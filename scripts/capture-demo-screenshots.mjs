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

async function snap(route, name, { beforeShot, fullPage = false } = {}) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' })
  await sleep(2600) // entrance animations settle
  if (beforeShot) await beforeShot()
  await page.screenshot({ path: join(outDir, name), fullPage })
  console.log('captured', name)
}

await snap('/leaderboard', 'leaderboard.png')

// Rounds: taller viewport so the expanded round (scorecard + players) fits in
// one clean frame instead of fullPage capturing all 63 rounds.
await page.setViewport({ width: 420, height: 1320, deviceScaleFactor: 2 })
await snap('/rounds', 'rounds.png', {
  beforeShot: async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('main button')
      if (btn) btn.click()
    })
    await sleep(2200) // expand animation + scorecard image load
  },
})
await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 })

await snap('/pulps', 'pulps.png')
await snap('/podcast', 'podcast.png')

await browser.close()
console.log('Done →', outDir)
