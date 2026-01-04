/**
 * Generate Podcast from Existing Script
 *
 * Uses pre-written script from database instead of generating with AI.
 * For when you have a custom script ready in podcast_scripts table.
 *
 * Usage: node generate-from-existing-script.js <episode_number>
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    hostVoiceId: process.env.ELEVENLABS_HOST_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
    cohostVoiceId: process.env.ELEVENLABS_COHOST_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
  }
};

// Initialize client
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

function log(stage, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${stage}] ${message}`, JSON.stringify(metadata, null, 2));
}

// Fetch script from database
async function fetchScriptFromDatabase(episodeNumber) {
  log('FETCH', `Fetching script for episode ${episodeNumber} from database...`);

  // First get episode_id from episode_number
  const { data: episode, error: episodeError } = await supabase
    .from('podcast_episodes')
    .select('id')
    .eq('episode_number', episodeNumber)
    .single();

  if (episodeError) {
    throw new Error(`Failed to fetch episode: ${episodeError.message}`);
  }

  // Then fetch script using episode_id
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

// Generate audio from script
async function generateDialogueAudio(script, episodeNumber) {
  log('AUDIO', 'Generating two-person dialogue audio...');

  // Parse script into lines with speaker identification
  const lines = script.split('\n').filter(line => line.trim());
  const audioSegments = [];
  let segmentCount = 0;

  for (const line of lines) {
    // Match "[ANNIE]:" or "[HYZER]:" patterns
    const match = line.match(/^\[(ANNIE|HYZER)\]:\s*(.+)$/i);
    if (!match) continue;

    const [, speaker, text] = match;
    const isAnnie = speaker.toUpperCase().includes('ANNIE');
    const voiceId = isAnnie ? config.elevenlabs.hostVoiceId : config.elevenlabs.cohostVoiceId;

    segmentCount++;
    log('AUDIO', `Generating segment ${segmentCount} for ${speaker}`, {
      textLength: text.length,
      preview: text.substring(0, 50) + '...'
    });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenlabs.apiKey
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.6,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    audioSegments.push(Buffer.from(audioBuffer));

    // Small delay between API calls to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Concatenate all audio segments
  const dialogueAudio = Buffer.concat(audioSegments);
  const dialogueFilePath = path.join(__dirname, `dialogue-${episodeNumber}.mp3`);
  fs.writeFileSync(dialogueFilePath, dialogueAudio);

  log('AUDIO', 'Dialogue audio generated', {
    totalSegments: audioSegments.length,
    fileSize: dialogueAudio.length,
    filePath: dialogueFilePath
  });

  return dialogueFilePath;
}

// Add intro/outro music with fade effects
async function addIntroOutroMusic(dialoguePath, episodeNumber) {
  log('AUDIO', 'Adding intro/outro music with fade effects...');

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

  // Clean up local file
  fs.unlinkSync(audioFilePath);

  return publicUrl.publicUrl;
}

// Update episode record with audio URL
async function updateEpisodeWithAudio(episodeNumber, audioUrl) {
  log('DATABASE', 'Updating episode record with audio URL...');

  const { data, error } = await supabase
    .from('podcast_episodes')
    .update({
      audio_url: audioUrl,
      is_published: true,
      published_at: new Date().toISOString()
    })
    .eq('episode_number', episodeNumber)
    .select()
    .single();

  if (error) throw error;

  log('DATABASE', 'Episode updated successfully', {
    episodeId: data.id,
    audioUrl: data.audio_url
  });

  return data;
}

// Main execution
async function main() {
  try {
    // Get episode number from command line args
    const episodeNumber = parseInt(process.argv[2]) || 1;

    log('START', `🎙️  Starting podcast generation from existing script...`, {
      episodeNumber
    });

    // Step 1: Fetch script from database
    const script = await fetchScriptFromDatabase(episodeNumber);

    // Step 2: Generate dialogue audio
    const dialogueFilePath = await generateDialogueAudio(script, episodeNumber);

    // Step 3: Add intro/outro music
    const finalAudioPath = await addIntroOutroMusic(dialogueFilePath, episodeNumber);

    // Clean up dialogue-only file
    if (fs.existsSync(dialogueFilePath)) {
      fs.unlinkSync(dialogueFilePath);
    }

    // Step 4: Upload audio
    const audioUrl = await uploadAudio(finalAudioPath, episodeNumber);

    // Step 5: Update episode record
    const episode = await updateEpisodeWithAudio(episodeNumber, audioUrl);

    log('SUCCESS', '✅ Podcast generation completed!', {
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      audioUrl: episode.audio_url
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
