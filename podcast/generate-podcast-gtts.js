/**
 * Generate Podcast using Google TTS (Testing)
 *
 * This script uses free Google TTS for testing the podcast generation workflow.
 * Once verified, we'll switch to ElevenLabs for production.
 */

import { createClient } from '@supabase/supabase-js';
import gtts from 'gtts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set FFmpeg path to use bundled binary
ffmpeg.setFfmpegPath(ffmpegStatic);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const config = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  voices: {
    // gTTS doesn't have multiple voices, but we can use different languages for distinction
    // We'll use standard English for both and rely on the script quality
    annie: 'en',
    hyzer: 'en'
  }
};

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

function log(stage, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${stage}] ${message}`, metadata ? JSON.stringify(metadata, null, 2) : '');
}

// Fetch script from database
async function fetchScriptFromDatabase(episodeNumber) {
  log('FETCH', `Fetching script for episode ${episodeNumber}...`);

  // Get episode_id from episode_number
  const { data: episode, error: episodeError } = await supabase
    .from('podcast_episodes')
    .select('id')
    .eq('episode_number', episodeNumber)
    .single();

  if (episodeError) {
    throw new Error(`Failed to fetch episode: ${episodeError.message}`);
  }

  // Fetch script using episode_id
  const { data, error } = await supabase
    .from('podcast_scripts')
    .select('script_text, episode_id')
    .eq('episode_id', episode.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch script: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No script found for episode ${episodeNumber}`);
  }

  log('FETCH', 'Script fetched successfully', {
    length: data.script_text.length,
    episodeId: data.episode_id
  });

  return data.script_text;
}

// Generate single audio segment with gTTS
async function generateAudioSegment(text, speaker, segmentIndex) {
  return new Promise((resolve, reject) => {
    const speech = new gtts(text, 'en');
    const tempFile = path.join(__dirname, `temp-segment-${segmentIndex}.mp3`);

    speech.save(tempFile, (err) => {
      if (err) {
        reject(err);
      } else {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile); // Clean up temp file
        resolve(buffer);
      }
    });
  });
}

// Generate dialogue audio from script
async function generateDialogueAudio(script, episodeNumber) {
  log('AUDIO', 'Parsing script and generating dialogue audio...');

  // Parse script into lines
  const lines = script.split('\n').filter(line => line.trim());
  const audioSegments = [];
  let segmentCount = 0;

  for (const line of lines) {
    // Match "[ANNIE]:" or "[HYZER]:" patterns
    const match = line.match(/^\[(ANNIE|HYZER)\]:\s*(.+)$/i);
    if (!match) continue;

    const [, speaker, text] = match;
    segmentCount++;

    log('AUDIO', `Generating segment ${segmentCount}/${lines.length} for ${speaker}`, {
      textLength: text.length,
      preview: text.substring(0, 50) + '...'
    });

    try {
      const audioBuffer = await generateAudioSegment(text.trim(), speaker, segmentCount);
      audioSegments.push(audioBuffer);
    } catch (error) {
      log('ERROR', `Failed to generate segment ${segmentCount}`, { error: error.message });
      throw error;
    }

    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Concatenate all audio segments
  const dialogueAudio = Buffer.concat(audioSegments);
  const dialogueFilePath = path.join(__dirname, `dialogue-${episodeNumber}.mp3`);
  fs.writeFileSync(dialogueFilePath, dialogueAudio);

  log('AUDIO', 'Dialogue audio generated successfully', {
    totalSegments: audioSegments.length,
    fileSize: dialogueAudio.length,
    filePath: dialogueFilePath
  });

  return dialogueFilePath;
}

// Concatenate intro, dialogue, and outro with FFmpeg
async function createFinalEpisode(dialoguePath, episodeNumber) {
  log('AUDIO', 'Creating final episode with intro and outro using FFmpeg...');

  const introPath = path.join(__dirname, 'assets', 'intro-music.mp3');
  const outroPath = path.join(__dirname, 'assets', 'outro-music.mp3');
  const finalPath = path.join(__dirname, `episode-${episodeNumber}.mp3`);

  // Check if intro/outro files exist
  if (!fs.existsSync(introPath)) {
    throw new Error('Intro music not found at: ' + introPath);
  }
  if (!fs.existsSync(outroPath)) {
    throw new Error('Outro music not found at: ' + outroPath);
  }

  // Temporary processed files
  const processedIntroPath = path.join(__dirname, `intro-processed-${episodeNumber}.mp3`);
  const processedOutroPath = path.join(__dirname, `outro-processed-${episodeNumber}.mp3`);

  return new Promise((resolve, reject) => {
    // Step 1: Process intro (5 seconds with fade out from 3-5s)
    log('AUDIO', 'Processing intro: 5 seconds with fade out from 3-5s');

    ffmpeg(introPath)
      .duration(5) // Trim to 5 seconds
      .audioFilters([
        'afade=t=out:st=3:d=2' // Fade out starting at 3s for 2s duration
      ])
      .output(processedIntroPath)
      .on('end', () => {
        log('AUDIO', 'Intro processed successfully');

        // Step 2: Process outro (8 seconds with fade in from 0-4s)
        log('AUDIO', 'Processing outro: 8 seconds with fade in from 0-4s');

        ffmpeg(outroPath)
          .duration(8) // Trim to 8 seconds
          .audioFilters([
            'afade=t=in:st=0:d=4' // Fade in starting at 0s for 4s duration
          ])
          .output(processedOutroPath)
          .on('end', () => {
            log('AUDIO', 'Outro processed successfully');

            // Step 3: Concatenate all three files
            log('AUDIO', 'Concatenating intro + dialogue + outro');

            const concatListPath = path.join(__dirname, `concat-${episodeNumber}.txt`);
            const concatContent = `file '${processedIntroPath.replace(/\\/g, '/')}'\nfile '${dialoguePath.replace(/\\/g, '/')}'\nfile '${processedOutroPath.replace(/\\/g, '/')}'`;
            fs.writeFileSync(concatListPath, concatContent);

            ffmpeg()
              .input(concatListPath)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .audioCodec('libmp3lame')
              .audioBitrate('192k')
              .audioFrequency(44100) // Standard sample rate for better compatibility
              .audioChannels(2) // Stereo
              .format('mp3') // Explicitly set format
              .output(finalPath)
              .on('end', () => {
                // Clean up temporary files
                fs.unlinkSync(processedIntroPath);
                fs.unlinkSync(processedOutroPath);
                fs.unlinkSync(concatListPath);

                const stats = fs.statSync(finalPath);
                log('AUDIO', 'Final episode created successfully', {
                  filePath: finalPath,
                  fileSize: stats.size
                });

                resolve(finalPath);
              })
              .on('error', (err) => {
                log('ERROR', 'Concatenation failed', { error: err.message });
                // Clean up on error
                if (fs.existsSync(processedIntroPath)) fs.unlinkSync(processedIntroPath);
                if (fs.existsSync(processedOutroPath)) fs.unlinkSync(processedOutroPath);
                if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
                reject(err);
              })
              .run();
          })
          .on('error', (err) => {
            log('ERROR', 'Outro processing failed', { error: err.message });
            if (fs.existsSync(processedIntroPath)) fs.unlinkSync(processedIntroPath);
            reject(err);
          })
          .run();
      })
      .on('error', (err) => {
        log('ERROR', 'Intro processing failed', { error: err.message });
        reject(err);
      })
      .run();
  });
}

// Upload to Supabase Storage
async function uploadAudio(audioFilePath, episodeNumber) {
  log('UPLOAD', 'Uploading audio to Supabase Storage...');

  const fileName = `ParSaveables-EP${episodeNumber.toString().padStart(2, '0')}.mp3`;
  const audioBuffer = fs.readFileSync(audioFilePath);

  const { data, error } = await supabase.storage
    .from('podcast-episodes')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('podcast-episodes')
    .getPublicUrl(fileName);

  log('UPLOAD', 'Audio uploaded successfully', {
    fileName,
    url: publicUrl.publicUrl
  });

  return publicUrl.publicUrl;
}

// Main execution
async function main() {
  try {
    const episodeNumber = parseInt(process.argv[2]) || 1;

    log('START', '🎙️  Starting podcast generation (Google TTS Test)', {
      episodeNumber
    });

    // Step 1: Fetch script from database
    const script = await fetchScriptFromDatabase(episodeNumber);

    // Step 2: Generate dialogue audio with gTTS
    const dialogueFilePath = await generateDialogueAudio(script, episodeNumber);

    // Step 3: Create final episode with intro/outro
    const finalAudioPath = await createFinalEpisode(dialogueFilePath, episodeNumber);

    // Step 4: Upload to Supabase
    const audioUrl = await uploadAudio(finalAudioPath, episodeNumber);

    // Clean up temporary files
    if (fs.existsSync(dialogueFilePath)) {
      fs.unlinkSync(dialogueFilePath);
    }

    log('SUCCESS', '✅ Podcast generation completed!', {
      episodeNumber,
      audioUrl,
      note: 'This is a TEST version using Google TTS. Switch to ElevenLabs for production.'
    });

    process.exit(0);
  } catch (error) {
    log('ERROR', '❌ Podcast generation failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run
main();
