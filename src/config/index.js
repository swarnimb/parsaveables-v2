/**
 * Configuration loader for ParSaveables
 * Loads from environment variables with validation
 */

// Load environment variables from .env.local in development
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch (error) {
    // dotenv not installed or .env.local not found - that's ok in production
  }
}

/**
 * Validate required environment variable exists
 * @param {string} key - Environment variable name
 * @param {string} description - Human-readable description
 * @returns {string} Environment variable value
 * @throws {Error} If required env var is missing
 */
function requireEnv(key, description) {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Description: ${description}\n` +
      `Please add ${key} to your .env.local file`
    );
  }

  return value;
}

/**
 * Get optional environment variable with default
 * @param {string} key - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value or default
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

/**
 * Application configuration object
 * All sensitive credentials loaded from environment variables
 */
export const config = {
  // Gmail API configuration (for scorecard email polling)
  gmail: {
    clientId: requireEnv('GMAIL_CLIENT_ID', 'Gmail OAuth2 Client ID'),
    clientSecret: requireEnv('GMAIL_CLIENT_SECRET', 'Gmail OAuth2 Client Secret'),
    refreshToken: requireEnv('GMAIL_REFRESH_TOKEN', 'Gmail OAuth2 Refresh Token')
  },

  // Anthropic API configuration (for Claude Vision scorecard extraction)
  anthropic: {
    apiKey: requireEnv('ANTHROPIC_API_KEY', 'Anthropic API key for Claude Vision'),
    model: getEnv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022') // Default to Sonnet 3.5
  },

  // Supabase configuration (for database and auth)
  supabase: {
    url: requireEnv('VITE_SUPABASE_URL', 'Supabase project URL'),
    anonKey: requireEnv('VITE_SUPABASE_ANON_KEY', 'Supabase anonymous key'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key (for server-side operations)')
  },

  // GitHub configuration (for podcast release uploads)
  github: {
    token: getEnv('GITHUB_TOKEN', ''), // Optional, only needed for podcast generation
    repo: getEnv('GITHUB_REPO', 'ParSaveables/parsaveables-v2') // Default repo
  },

  // ElevenLabs API configuration (for podcast TTS)
  elevenlabs: {
    apiKey: getEnv('ELEVENLABS_API_KEY', ''), // Optional, only needed for podcast generation
    voiceId1: getEnv('ELEVENLABS_VOICE_ID_1', ''), // First podcast host voice
    voiceId2: getEnv('ELEVENLABS_VOICE_ID_2', '')  // Second podcast host voice
  },

  // Application settings
  app: {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    logLevel: getEnv('LOG_LEVEL', 'info'),
    dashboardUrl: getEnv('DASHBOARD_URL', 'http://localhost:5175')
  }
};

// Validate required config on module load (fail fast)
// Only validate Gmail and Anthropic in development (required for core functionality)
if (config.app.nodeEnv !== 'production') {
  console.log('✓ Configuration loaded successfully');
  console.log(`  Gmail: ${config.gmail.clientId ? '✓' : '✗'}`);
  console.log(`  Anthropic: ${config.anthropic.apiKey ? '✓' : '✗'}`);
  console.log(`  Supabase: ${config.supabase.url ? '✓' : '✗'}`);
}

export default config;
