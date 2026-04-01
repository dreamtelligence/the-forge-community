#!/usr/bin/env tsx
/**
 * Master Test Runner for All Smoke Tests
 * Runs image, video, and video effects smoke tests
 */

import { runImageGenerationTests } from './test-image-generation';
import { runVideoGenerationTests } from './test-video-generation';
import { runVideoEffectsTests } from './test-video-effects';
import { normalizeSessionCookie } from './utils';

interface TestConfig {
  ventureId: string;
  apiBaseUrl: string;
  sessionCookie: string;
  testVideoUrl?: string;
  testImageUrl?: string;
  testAudioUrl?: string;
  testDrivingVideoUrl?: string;
}

interface TestSummary {
  passed: number;
  failed: number;
  total: number;
  results: any[];
}

interface AllTestsSummary {
  image: TestSummary | null;
  video: TestSummary | null;
  effects: TestSummary | null;
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
  totalDuration: number;
}

async function runAllTests() {
  const startTime = Date.now();

  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║       SMOKE TESTS - IMAGE & VIDEO GENERATION MODELS              ║');
  console.log('║              The Forge Community Platform                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log();

  // Load configuration
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const sessionCookie = normalizeSessionCookie(
    process.env.TEST_SESSION_COOKIE || '',
    apiBaseUrl,
  );

  const config: TestConfig = {
    ventureId: process.env.TEST_VENTURE_ID || '',
    apiBaseUrl,
    sessionCookie,
    testVideoUrl: process.env.TEST_VIDEO_URL,
    testImageUrl: process.env.TEST_IMAGE_URL,
    testAudioUrl: process.env.TEST_AUDIO_URL,
    testDrivingVideoUrl: process.env.TEST_DRIVING_VIDEO_URL,
  };

  // Validate required config
  if (!config.ventureId || !config.sessionCookie) {
    console.error('❌ Missing required environment variables:\n');
    console.error('Required:');
    console.error('   - TEST_VENTURE_ID');
    console.error('   - TEST_SESSION_COOKIE\n');
    console.error('Optional:');
    console.error('   - API_BASE_URL (defaults to http://localhost:3000)');
    console.error('   - TEST_VIDEO_URL (for video effects tests)');
    console.error('   - TEST_IMAGE_URL (for video effects tests)');
    console.error('   - TEST_AUDIO_URL (for lip sync tests)');
    console.error('   - TEST_DRIVING_VIDEO_URL (for motion transfer tests)');
    console.error('\nExample:');
    console.error('   export TEST_VENTURE_ID="your-venture-id"');
    console.error('   export TEST_SESSION_COOKIE="your-session-cookie"');
    console.error('   npm run test:smoke\n');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Venture ID: ${config.ventureId}`);
  console.log(`   API Base URL: ${config.apiBaseUrl}`);
  console.log(`   Session Cookie: ${config.sessionCookie.substring(0, 20)}...`);
  console.log();

  const summary: AllTestsSummary = {
    image: null,
    video: null,
    effects: null,
    totalPassed: 0,
    totalFailed: 0,
    totalTests: 0,
    totalDuration: 0,
  };

  // Determine which tests to run based on command line args
  const args = process.argv.slice(2);
  const runImage = args.length === 0 || args.includes('--image');
  const runVideo = args.length === 0 || args.includes('--video');
  const runEffects = args.length === 0 || args.includes('--effects');

  try {
    // Phase 1: Image Generation Tests
    if (runImage) {
      console.log('\n\n');
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║                 PHASE 1: IMAGE GENERATION TESTS                   ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log();

      try {
        summary.image = await runImageGenerationTests(config);
      } catch (error) {
        console.error('❌ Image generation tests failed:', error);
        summary.image = { passed: 0, failed: 0, total: 0, results: [] };
      }
    }

    // Phase 2: Video Generation Tests
    if (runVideo) {
      console.log('\n\n');
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║                 PHASE 2: VIDEO GENERATION TESTS                   ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log();

      try {
        summary.video = await runVideoGenerationTests(config);
      } catch (error) {
        console.error('❌ Video generation tests failed:', error);
        summary.video = { passed: 0, failed: 0, total: 0, results: [] };
      }
    }

    // Phase 3: Video Effects Tests
    if (runEffects) {
      console.log('\n\n');
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║                   PHASE 3: VIDEO EFFECTS TESTS                    ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log();

      // Check if test assets are configured
      if (!config.testVideoUrl || !config.testImageUrl || !config.testAudioUrl) {
        console.log('⚠️  Video effects tests skipped: Test assets not configured');
        console.log('   Set TEST_VIDEO_URL, TEST_IMAGE_URL, TEST_AUDIO_URL, TEST_DRIVING_VIDEO_URL');
      } else {
        try {
          summary.effects = await runVideoEffectsTests({
            ...config,
            testVideoUrl: config.testVideoUrl!,
            testImageUrl: config.testImageUrl!,
            testAudioUrl: config.testAudioUrl!,
            testDrivingVideoUrl: config.testDrivingVideoUrl || config.testVideoUrl!,
          });
        } catch (error) {
          console.error('❌ Video effects tests failed:', error);
          summary.effects = { passed: 0, failed: 0, total: 0, results: [] };
        }
      }
    }

  } catch (error) {
    console.error('❌ Fatal error during test execution:', error);
  }

  // Calculate totals
  summary.totalPassed =
    (summary.image?.passed || 0) +
    (summary.video?.passed || 0) +
    (summary.effects?.passed || 0);

  summary.totalFailed =
    (summary.image?.failed || 0) +
    (summary.video?.failed || 0) +
    (summary.effects?.failed || 0);

  summary.totalTests =
    (summary.image?.total || 0) +
    (summary.video?.total || 0) +
    (summary.effects?.total || 0);

  summary.totalDuration = Date.now() - startTime;

  // Print final summary
  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                      FINAL TEST SUMMARY                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log();

  if (summary.image) {
    console.log(`🖼️  Image Generation:  ${summary.image.passed}/${summary.image.total} passed`);
  }
  if (summary.video) {
    console.log(`🎬 Video Generation:  ${summary.video.passed}/${summary.video.total} passed`);
  }
  if (summary.effects) {
    console.log(`✨ Video Effects:     ${summary.effects.passed}/${summary.effects.total} passed`);
  }

  console.log();
  console.log('─'.repeat(70));
  console.log();
  console.log(`📊 Total Tests:       ${summary.totalTests}`);
  console.log(`✅ Passed:            ${summary.totalPassed}`);
  console.log(`❌ Failed:            ${summary.totalFailed}`);
  console.log(`⏱️  Total Duration:    ${(summary.totalDuration / 1000).toFixed(2)}s`);

  const successRate = summary.totalTests > 0
    ? ((summary.totalPassed / summary.totalTests) * 100).toFixed(1)
    : '0.0';
  console.log(`📈 Success Rate:      ${successRate}%`);

  console.log();

  if (summary.totalFailed === 0 && summary.totalTests > 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
  } else if (summary.totalFailed > 0) {
    console.log('⚠️  SOME TESTS FAILED');
  } else {
    console.log('⚠️  NO TESTS RUN');
  }

  console.log();
  console.log('═'.repeat(70));

  // Exit with appropriate code
  process.exit(summary.totalFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
