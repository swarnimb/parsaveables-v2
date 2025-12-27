/**
 * Test Script: Scorecard Processing Workflow
 *
 * This script tests the complete v1 workflow:
 * 1. Gmail API connection
 * 2. Email extraction with image attachments
 * 3. Image upload to Supabase Storage
 * 4. Claude Vision API scorecard extraction
 * 5. Database insertion
 *
 * Run: node test-scorecard-processing.js
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { processNewScorecards } from './src/api/processScorecard.js';

console.log('🧪 Starting Scorecard Processing Test\n');
console.log('This will test the complete workflow:');
console.log('  ✓ Gmail API connection');
console.log('  ✓ Image extraction from emails');
console.log('  ✓ Image upload to Supabase Storage');
console.log('  ✓ Claude Vision scorecard extraction');
console.log('  ✓ Database insertion');
console.log('\n' + '='.repeat(60) + '\n');

// Test configuration
const testOptions = {
  emailFrom: null,        // Process from any sender
  maxEmails: 1,          // Process only 1 email for testing
  skipNotifications: true // Don't send emails during testing
};

console.log('Test Options:', testOptions);
console.log('\n' + '='.repeat(60) + '\n');

// Run the test
try {
  console.log('🚀 Starting processScorecard workflow...\n');

  const results = await processNewScorecards(testOptions);

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETED');
  console.log('='.repeat(60) + '\n');

  // Display results
  console.log('📊 RESULTS:\n');
  console.log('Stats:', JSON.stringify(results.stats, null, 2));

  if (results.processed.length > 0) {
    console.log('\n✅ Successfully Processed:', results.processed.length);
    results.processed.forEach((item, index) => {
      console.log(`\n  [${index + 1}] Email ID: ${item.emailId}`);
      console.log(`      Course: ${item.round.course_name}`);
      console.log(`      Date: ${item.round.date}`);
      console.log(`      Players: ${item.playerRounds.length}`);
      console.log(`      Event: ${item.event.name}`);
      if (item.round.scorecard_image_url) {
        console.log(`      📸 Image URL: ${item.round.scorecard_image_url}`);
      } else {
        console.log(`      ⚠️  Image upload failed (but processing continued)`);
      }
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed:', results.failed.length);
    results.failed.forEach((item, index) => {
      console.log(`\n  [${index + 1}] Email ID: ${item.emailId}`);
      console.log(`      From: ${item.from}`);
      console.log(`      Subject: ${item.subject}`);
      console.log(`      Error: ${item.error}`);
      if (item.stack) {
        console.log(`\n      Stack Trace:\n${item.stack}`);
      }
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped:', results.skipped.length);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test Complete!');
  console.log('='.repeat(60) + '\n');

  // Check for image upload success
  if (results.processed.length > 0 && results.processed[0].round.scorecard_image_url) {
    console.log('✅ IMAGE UPLOAD TO SUPABASE: SUCCESS');
    console.log(`   View image at: ${results.processed[0].round.scorecard_image_url}`);
  } else if (results.processed.length > 0) {
    console.log('⚠️  IMAGE UPLOAD: Failed (check logs above)');
  }

  process.exit(0);

} catch (error) {
  console.error('\n' + '='.repeat(60));
  console.error('❌ TEST FAILED');
  console.error('='.repeat(60) + '\n');
  console.error('Error:', error.message);
  console.error('\nStack Trace:');
  console.error(error.stack);

  console.log('\n' + '='.repeat(60));
  console.log('💡 TROUBLESHOOTING TIPS:');
  console.log('='.repeat(60));
  console.log('1. Check .env.local has all required variables:');
  console.log('   - GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
  console.log('   - ANTHROPIC_API_KEY');
  console.log('   - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.log('2. Ensure Supabase Storage bucket "scorecards" exists and is public');
  console.log('3. Check Gmail has unread emails with UDisc scorecard attachments');
  console.log('4. Verify Anthropic API key has credits available');
  console.log('='.repeat(60) + '\n');

  process.exit(1);
}
