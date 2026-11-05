/**
 * Smoke Tests for Video Effects (Face Swap, Lip Sync, Motion Transfer)
 * Tests all 6 video effect tools
 */

import { buildFormData, fetchBlobForForm, normalizeSessionCookie, safeJsonParse } from './utils';

// Types
interface TestResult {
  model: string;
  provider: string;
  success: boolean;
  duration: number;
  error?: string;
  jobId?: string;
  mediaUrl?: string;
  creditsUsed?: number;
}

interface TestConfig {
  ventureId: string;
  apiBaseUrl: string;
  sessionCookie: string;
  testVideoUrl: string;
  testImageUrl: string;
  testAudioUrl: string;
  testDrivingVideoUrl: string;
}

// Test Cases
const FACESWAP_TEST_CASES = [
  {
    name: 'Live Portrait Pro',
    model: 'live-portrait',
    provider: 'replicate',
    expectedCredits: 65,
  },
] as const;

const LIPSYNC_TEST_CASES = [
  {
    name: 'Sync Lip Sync 2 (Preview)',
    model: 'preview',
    provider: 'replicate',
    expectedCredits: 18,
  },
  {
    name: 'Sync Lip Sync 2 Pro',
    model: 'final',
    provider: 'replicate',
    expectedCredits: 45,
  },
] as const;

const MOTION_TRANSFER_TEST_CASES = [
  {
    name: 'Wan 2.2 Animate (Motion Transfer)',
    model: 'wan-2.2-animate',
    provider: 'replicate',
    expectedCredits: 50,
    resolution: '720',
  },
] as const;

const assetCache = new Map<string, Promise<{ blob: Blob; filename: string }>>();
const loadAsset = (url: string, fallbackName: string) => {
  if (!assetCache.has(url)) {
    assetCache.set(url, fetchBlobForForm(url, fallbackName));
  }
  return assetCache.get(url)!;
};

/**
 * Test Face Swap models
 */
async function testFaceSwap(
  testCase: typeof FACESWAP_TEST_CASES[number],
  config: TestConfig
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    model: testCase.model,
    provider: testCase.provider,
    success: false,
    duration: 0,
  };

  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   Model: ${testCase.model}`);
    console.log(`   Expected Credits: ${testCase.expectedCredits}`);

    // Step 1: Create face swap request
    const [videoAsset, faceAsset] = await Promise.all([
      loadAsset(config.testVideoUrl, 'video.mp4'),
      loadAsset(config.testImageUrl, 'face.jpg'),
    ]);
    const formData = buildFormData({
      model: testCase.model,
      swapCondition: 'all',
    });
    formData.set('video', videoAsset.blob, videoAsset.filename);
    formData.set('face', faceAsset.blob, faceAsset.filename);

    console.log(`   📤 Sending request...`);
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/faceswap`,
      {
        method: 'POST',
        headers: {
          'Cookie': config.sessionCookie,
        },
        body: formData,
      }
    );

    const rawText = await response.text();
    const data = safeJsonParse(rawText) ?? {};

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${rawText}`);
    }

    if (data.status === 'succeeded') {
      result.mediaUrl = data.outputUrl;
      result.creditsUsed = data.creditsUsed;
      result.success = true;
      return result;
    }

    if (!data.predictionId) {
      throw new Error(data.error || 'Prediction ID fehlt');
    }

    result.jobId = data.predictionId;
    const creditsReserved = data.creditsUsed;

    console.log(`   ✅ Job created: ${result.jobId}`);
    console.log(`   💰 Credits reserved: ${creditsReserved}`);

    // Step 2: Poll for completion
    console.log(`   ⏳ Polling for completion...`);
    const maxPolls = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds
    let pollCount = 0;
    let completed = false;

    while (pollCount < maxPolls && !completed) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      const pollResponse = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/faceswap?predictionId=${result.jobId}`,
        {
          headers: {
            'Cookie': config.sessionCookie,
          },
        }
      );

      if (!pollResponse.ok) {
        throw new Error(`Poll failed: HTTP ${pollResponse.status}`);
      }

      const pollData = await pollResponse.json();
      const status = pollData.status;

      if (status === 'succeeded') {
        completed = true;
        result.mediaUrl = pollData.outputUrl;
        result.creditsUsed = creditsReserved;

        console.log(`   ✅ Face swap complete!`);
        console.log(`   🎬 Video URL: ${result.mediaUrl}`);
        console.log(`   💰 Credits used: ${result.creditsUsed}`);

        result.success = true;
      } else if (status === 'failed' || status === 'canceled') {
        throw new Error(`Face swap failed: ${pollData.error}`);
      } else {
        process.stdout.write(`   ⏳ Attempt ${pollCount}/${maxPolls}... (${status})\r`);
      }
    }

    if (!completed) {
      throw new Error('Timeout waiting for face swap to complete');
    }

  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Test failed: ${result.error}`);
  } finally {
    result.duration = Date.now() - startTime;
    console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
  }

  return result;
}

/**
 * Test Lip Sync models
 */
async function testLipSync(
  testCase: typeof LIPSYNC_TEST_CASES[number],
  config: TestConfig
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    model: testCase.model,
    provider: testCase.provider,
    success: false,
    duration: 0,
  };

  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   Model: ${testCase.model}`);
    console.log(`   Expected Credits: ${testCase.expectedCredits}`);

    // Step 1: Create lip sync request
    const videoAsset = await loadAsset(config.testVideoUrl, 'video.mp4');
    const formData = buildFormData({
      mode: testCase.model,
      audioUrl: config.testAudioUrl,
    });
    formData.set('video', videoAsset.blob, videoAsset.filename);

    console.log(`   📤 Sending request...`);
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/lipsync`,
      {
        method: 'POST',
        headers: {
          'Cookie': config.sessionCookie,
        },
        body: formData,
      }
    );

    const rawText = await response.text();
    const data = safeJsonParse(rawText) ?? {};

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${rawText}`);
    }

    if (!data.predictionId) {
      throw new Error(data.error || 'Prediction ID fehlt');
    }

    result.jobId = data.predictionId;
    const creditsReserved = data.creditsUsed;

    console.log(`   ✅ Job created: ${result.jobId}`);
    console.log(`   💰 Credits reserved: ${creditsReserved}`);

    // Step 2: Poll for completion
    console.log(`   ⏳ Polling for completion...`);
    const maxPolls = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds
    let pollCount = 0;
    let completed = false;

    while (pollCount < maxPolls && !completed) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      const pollResponse = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/lipsync?predictionId=${result.jobId}`,
        {
          headers: {
            'Cookie': config.sessionCookie,
          },
        }
      );

      if (!pollResponse.ok) {
        throw new Error(`Poll failed: HTTP ${pollResponse.status}`);
      }

      const pollData = await pollResponse.json();
      const status = pollData.status;

      if (status === 'succeeded') {
        completed = true;
        result.mediaUrl = pollData.outputUrl;
        result.creditsUsed = creditsReserved;

        console.log(`   ✅ Lip sync complete!`);
        console.log(`   🎬 Video URL: ${result.mediaUrl}`);
        console.log(`   💰 Credits used: ${result.creditsUsed}`);

        result.success = true;
      } else if (status === 'failed' || status === 'canceled') {
        throw new Error(`Lip sync failed: ${pollData.error}`);
      } else {
        process.stdout.write(`   ⏳ Attempt ${pollCount}/${maxPolls}... (${status})\r`);
      }
    }

    if (!completed) {
      throw new Error('Timeout waiting for lip sync to complete');
    }

  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Test failed: ${result.error}`);
  } finally {
    result.duration = Date.now() - startTime;
    console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
  }

  return result;
}

/**
 * Test Motion Transfer
 */
async function testMotionTransfer(
  testCase: typeof MOTION_TRANSFER_TEST_CASES[number],
  config: TestConfig
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    model: testCase.model,
    provider: testCase.provider,
    success: false,
    duration: 0,
  };

  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   Model: ${testCase.model}`);
    console.log(`   Expected Credits: ${testCase.expectedCredits}`);

    // Step 1: Create motion transfer request
    const [drivingAsset, imageAsset] = await Promise.all([
      loadAsset(config.testDrivingVideoUrl, 'driving.mp4'),
      loadAsset(config.testImageUrl, 'character.jpg'),
    ]);
    const formData = buildFormData({
      model: testCase.model,
      resolution: testCase.resolution,
      mergeAudio: true,
      goFast: true,
    });
    formData.set('drivingVideo', drivingAsset.blob, drivingAsset.filename);
    formData.set('characterImage', imageAsset.blob, imageAsset.filename);

    console.log(`   📤 Sending request...`);
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/motion-transfer`,
      {
        method: 'POST',
        headers: {
          'Cookie': config.sessionCookie,
        },
        body: formData,
      }
    );

    const rawText = await response.text();
    const data = safeJsonParse(rawText) ?? {};

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${rawText}`);
    }

    if (!data.predictionId) {
      throw new Error(data.error || 'Prediction ID fehlt');
    }

    result.jobId = data.predictionId;
    const creditsReserved = data.creditsUsed;

    console.log(`   ✅ Job created: ${result.jobId}`);
    console.log(`   💰 Credits reserved: ${creditsReserved}`);

    // Step 2: Poll for completion
    console.log(`   ⏳ Polling for completion...`);
    const maxPolls = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds
    let pollCount = 0;
    let completed = false;

    while (pollCount < maxPolls && !completed) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      const pollResponse = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/motion-transfer?predictionId=${result.jobId}`,
        {
          headers: {
            'Cookie': config.sessionCookie,
          },
        }
      );

      if (!pollResponse.ok) {
        throw new Error(`Poll failed: HTTP ${pollResponse.status}`);
      }

      const pollData = await pollResponse.json();
      const status = pollData.status;

      if (status === 'succeeded') {
        completed = true;
        result.mediaUrl = pollData.outputUrl;
        result.creditsUsed = creditsReserved;

        console.log(`   ✅ Motion transfer complete!`);
        console.log(`   🎬 Video URL: ${result.mediaUrl}`);
        console.log(`   💰 Credits used: ${result.creditsUsed}`);

        result.success = true;
      } else if (status === 'failed' || status === 'canceled') {
        throw new Error(`Motion transfer failed: ${pollData.error}`);
      } else {
        process.stdout.write(`   ⏳ Attempt ${pollCount}/${maxPolls}... (${status})\r`);
      }
    }

    if (!completed) {
      throw new Error('Timeout waiting for motion transfer to complete');
    }

  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Test failed: ${result.error}`);
  } finally {
    result.duration = Date.now() - startTime;
    console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
  }

  return result;
}

/**
 * Run all video effects smoke tests
 */
export async function runVideoEffectsTests(config: TestConfig) {
  console.log('🚀 Starting Video Effects Smoke Tests\n');
  console.log(`Venture ID: ${config.ventureId}`);
  console.log(`API Base URL: ${config.apiBaseUrl}\n`);
  console.log('═'.repeat(70));

  const results: TestResult[] = [];

  // Test Face Swap models
  console.log('\n👤 TESTING FACE SWAP MODELS');
  console.log('─'.repeat(70));
  for (const testCase of FACESWAP_TEST_CASES) {
    const result = await testFaceSwap(testCase, config);
    results.push(result);

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test Lip Sync models
  console.log('\n\n🗣️  TESTING LIP SYNC MODELS');
  console.log('─'.repeat(70));
  for (const testCase of LIPSYNC_TEST_CASES) {
    const result = await testLipSync(testCase, config);
    results.push(result);

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test Motion Transfer
  console.log('\n\n💃 TESTING MOTION TRANSFER');
  console.log('─'.repeat(70));
  for (const testCase of MOTION_TRANSFER_TEST_CASES) {
    const result = await testMotionTransfer(testCase, config);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TEST SUMMARY - VIDEO EFFECTS');
  console.log('═'.repeat(70) + '\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`💰 Total Credits Used: ${results.reduce((sum, r) => sum + (r.creditsUsed || 0), 0)}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.model}: ${r.error}`);
      });
  }

  console.log('\n' + '═'.repeat(70));

  return {
    passed,
    failed,
    total: results.length,
    results,
  };
}

// CLI execution
if (require.main === module) {
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const sessionCookie = normalizeSessionCookie(
    process.env.TEST_SESSION_COOKIE || '',
    apiBaseUrl,
  );

  const config: TestConfig = {
    ventureId: process.env.TEST_VENTURE_ID || '',
    apiBaseUrl,
    sessionCookie,
    testVideoUrl: process.env.TEST_VIDEO_URL || '',
    testImageUrl: process.env.TEST_IMAGE_URL || '',
    testAudioUrl: process.env.TEST_AUDIO_URL || '',
    testDrivingVideoUrl: process.env.TEST_DRIVING_VIDEO_URL || '',
  };

  if (!config.ventureId || !config.sessionCookie) {
    console.error('❌ Missing required environment variables:');
    console.error('   - TEST_VENTURE_ID');
    console.error('   - TEST_SESSION_COOKIE');
    console.error('   - TEST_VIDEO_URL (for face swap & lip sync)');
    console.error('   - TEST_IMAGE_URL (for face swap & motion transfer)');
    console.error('   - TEST_AUDIO_URL (for lip sync)');
    console.error('   - TEST_DRIVING_VIDEO_URL (for motion transfer)');
    console.error('   - API_BASE_URL (optional, defaults to localhost:3000)');
    process.exit(1);
  }

  runVideoEffectsTests(config)
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
