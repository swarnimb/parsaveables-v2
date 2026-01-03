/**
 * Upload Episode to Supabase
 * Uploads episode-1.mp3 to storage and updates database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const config = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

// Initialize client
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

function log(stage, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${stage}] ${message}`, JSON.stringify(metadata, null, 2));
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
    const episodeNumber = 1;
    const audioFilePath = path.join(__dirname, 'episode-1.mp3');

    log('START', '🎙️  Starting podcast upload...', {
      episodeNumber,
      audioFilePath
    });

    // Step 1: Upload audio
    const audioUrl = await uploadAudio(audioFilePath, episodeNumber);

    // Step 2: Update episode record
    const episode = await updateEpisodeWithAudio(episodeNumber, audioUrl);

    log('SUCCESS', '✅ Podcast upload completed!', {
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      audioUrl: episode.audio_url
    });

    process.exit(0);
  } catch (error) {
    log('ERROR', '❌ Podcast upload failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run
main();
