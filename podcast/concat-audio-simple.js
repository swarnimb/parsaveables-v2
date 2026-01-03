/**
 * Simple MP3 Concatenation without FFmpeg
 * Concatenates intro + dialogue + outro MP3 files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const introPath = path.join(__dirname, 'assets', 'intro-music.mp3');
const dialoguePath = path.join(__dirname, 'dialogue-1.mp3');
const outroPath = path.join(__dirname, 'assets', 'outro-music.mp3');
const outputPath = path.join(__dirname, 'episode-1.mp3');

console.log('Concatenating MP3 files...');
console.log('Intro:', introPath);
console.log('Dialogue:', dialoguePath);
console.log('Outro:', outroPath);

try {
  const introBuffer = fs.readFileSync(introPath);
  const dialogueBuffer = fs.readFileSync(dialoguePath);
  const outroBuffer = fs.readFileSync(outroPath);

  console.log('File sizes:');
  console.log('- Intro:', introBuffer.length, 'bytes');
  console.log('- Dialogue:', dialogueBuffer.length, 'bytes');
  console.log('- Outro:', outroBuffer.length, 'bytes');

  // Simple concatenation (works for MP3s)
  const combined = Buffer.concat([introBuffer, dialogueBuffer, outroBuffer]);

  fs.writeFileSync(outputPath, combined);

  console.log('✅ Success! Combined file created:', outputPath);
  console.log('Total size:', combined.length, 'bytes');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
