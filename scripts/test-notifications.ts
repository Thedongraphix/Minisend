#!/usr/bin/env tsx
/**
 * Test Notification Script
 *
 * This script tests the Neynar notification system by sending a test
 * notification to a specific FID.
 *
 * Usage:
 *   npm run test-notification <fid>
 *
 * Example:
 *   npm run test-notification 887038
 *
 * Requirements:
 * - NEYNAR_API_KEY must be set in .env
 * - User must have added the mini app and enabled notifications
 * - FID must be a valid Farcaster ID
 */

import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testNotification(fid: number) {
  console.log('🔔 Neynar Notification Test');
  console.log('============================\n');

  // Verify API key
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: NEYNAR_API_KEY not found in environment variables');
    console.error('   Please add NEYNAR_API_KEY to your .env file\n');
    process.exit(1);
  }

  console.log('✅ Neynar API Key found');
  console.log(`🎯 Target FID: ${fid}\n`);

  // Validate FID
  if (!Number.isInteger(fid) || fid <= 0) {
    console.error('❌ Error: Invalid FID. Must be a positive integer');
    process.exit(1);
  }

  try {
    // Initialize Neynar client
    const client = new NeynarAPIClient({ apiKey });
    console.log('✅ Neynar client initialized\n');

    // Send test notification
    console.log('📤 Sending test notification...');

    const appUrl = process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz';

    const response = await client.publishFrameNotifications({
      targetFids: [fid],
      filters: {},
      notification: {
        title: '🧪 Test Notification',
        body: 'This is a test from Minisend. Notifications are working!',
        target_url: appUrl,
      },
    });

    console.log('✅ Notification sent successfully!\n');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('\n📊 Check your Farcaster app for the notification');
    console.log('📈 Check Neynar dev portal for analytics: https://dev.neynar.com/\n');

  } catch (error) {
    console.error('❌ Failed to send notification\n');

    if (error instanceof Error) {
      console.error('Error message:', error.message);

      // Common error scenarios
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('\n💡 Tip: Check that your NEYNAR_API_KEY is valid');
        console.error('   Get your API key from: https://dev.neynar.com/\n');
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        console.error('\n💡 Tip: The user may not have enabled notifications');
        console.error('   Steps to enable:');
        console.error('   1. Open Minisend in Farcaster');
        console.error('   2. Click "Enable Notifications" button');
        console.error('   3. Confirm in the Farcaster app\n');
      } else {
        console.error('\nFull error:', error);
      }
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: FID argument required\n');
  console.error('Usage: npm run test-notification <fid>');
  console.error('Example: npm run test-notification 887038\n');
  process.exit(1);
}

const fid = parseInt(args[0], 10);
testNotification(fid);
