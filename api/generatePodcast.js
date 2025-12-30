/**
 * API Endpoint: Generate Monthly Podcast
 * Triggered monthly via Vercel cron or manual button
 *
 * Route: /api/generatePodcast
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🎙️ Podcast generation triggered');

  try {
    // Run podcast generator as child process
    const podcastDir = path.join(__dirname, '..', '..', 'podcast');
    const scriptPath = path.join(podcastDir, 'generate-dialogue-podcast.js');

    const child = spawn('node', [scriptPath], {
      cwd: podcastDir,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Podcast generation completed');
        res.status(200).json({
          success: true,
          message: 'Podcast generated successfully',
          logs: stdout
        });
      } else {
        console.error('❌ Podcast generation failed with code', code);
        res.status(500).json({
          success: false,
          error: 'Podcast generation failed',
          logs: stderr || stdout
        });
      }
    });

    // Set timeout for long-running process (10 minutes)
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        res.status(408).json({
          success: false,
          error: 'Podcast generation timed out (10 min limit)'
        });
      }
    }, 10 * 60 * 1000);

  } catch (error) {
    console.error('❌ Error triggering podcast generation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
