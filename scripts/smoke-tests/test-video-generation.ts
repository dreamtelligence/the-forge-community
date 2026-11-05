/**
 * Smoke Tests for Video Generation Models
 * Tests marketing media video models (Replicate + Google Veo)
 */

import { buildFormData, normalizeSessionCookie, safeJsonParse } from './utils';

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
}

// Test Cases
const VIDEO_TEST_CASES_REPLICATE = [
  {
    name: 'Kling 4.0',
    model: 'kwaivgi/kling-v4.0',
    provider: 'replicate',
    prompt: 'gentle waves rolling onto a sandy beach at sunset, cinematic',
    duration: 5,
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 8,
  },
  {
    name: 'Kling 2.6 Pro (Cinema + Audio)',
    model: 'kwaivgi/kling-v2.6',
    provider: 'replicate',
    prompt: 'gentle waves rolling onto a sandy beach at sunset, cinematic',
    duration: 4,
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 55,
  },
  {
    name: 'Sora 2 (Flagship)',
    model: 'openai/sora-2',
    provider: 'replicate',
    prompt: 'gentle waves rolling onto a sandy beach at sunset, cinematic',
    duration: 4,
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 60,
  },
  {
    name: 'Veo 3.1 (via Replicate)',
    model: 'google/veo-3.1',
    provider: 'replicate',
    prompt: 'gentle waves rolling onto a sandy beach at sunset, cinematic',
    duration: 4,
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 58,
  },
  {
    name: 'MiniMax H3 (Human Motion)',
    model: 'minimax/h3',
    provider: 'replicate',
    prompt: 'a person walking confidently down a city street',
    duration: 5,
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 45,
  },
  {
    name: 'Luma Ray 3.2 (Atmospheric)',
    model: 'luma/ray-3.2',
    provider: 'replicate',
    prompt: 'clouds moving slowly across a blue sky, time-lapse',
    duration: 5,
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 40,
  },
] as const;

const VIDEO_TEST_CASES_VEO = [
  {
    name: 'Veo 3.1 (Veo Studio via Replicate)',
    model: 'veo-3.1',
    provider: 'replicate',
    prompt: 'a beautiful sunset over mountains, warm colors',
    duration: 4,
    resolution: '720p',
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 40,
  },
  {
    name: 'Veo 3.1 Fast',
    model: 'veo-3.1-fast',
    provider: 'replicate',
    prompt: 'a beautiful sunset over mountains, warm colors',
    duration: 4,
    resolution: '720p',
    aspectRatio: '16:9',
    includeAudio: false,
    expectedCredits: 15,
  },
] as const;

/**
 * Test a Replicate video model
 */
async function testReplicateVideo(
  testCase: typeof VIDEO_TEST_CASES_REPLICATE[number],
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
    console.log(`   Provider: ${testCase.provider}`);
    console.log(`   Expected Credits: ${testCase.expectedCredits}`);

    // Step 1: Create generation request
    const formData = buildFormData({
      mode: 'text-to-video',
      prompt: testCase.prompt,
      model: testCase.model,
      duration: testCase.duration,
      aspectRatio: testCase.aspectRatio,
      generateAudio: testCase.includeAudio,
    });

    console.log(`   📤 Sending request...`);
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/media`,
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
      result.mediaUrl = data.assets?.[0]?.url;
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
    console.log(`   ⏳ Polling for completion (this may take 1-3 minutes)...`);
    const maxPolls = 120; // 10 minutes max
    const pollInterval = 5000; // 5 seconds
    let pollCount = 0;
    let completed = false;

    while (pollCount < maxPolls && !completed) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      const pollResponse = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/media?predictionId=${result.jobId}`,
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
        result.mediaUrl = pollData.assets?.[0]?.url;
        result.creditsUsed = creditsReserved;

        console.log(`   ✅ Generation complete!`);
        console.log(`   🎬 Video URL: ${result.mediaUrl}`);
        console.log(`   💰 Credits used: ${result.creditsUsed}`);

        // Step 3: Verify media is accessible
        if (result.mediaUrl) {
          const mediaCheck = await fetch(result.mediaUrl, { method: 'HEAD' });
          if (!mediaCheck.ok) {
            throw new Error('Video URL is not accessible');
          }
          console.log(`   ✅ Video is accessible`);
        }

        result.success = true;
      } else if (status === 'failed') {
        throw new Error(`Generation failed: ${pollData.error}`);
      } else {
        process.stdout.write(`   ⏳ Attempt ${pollCount}/${maxPolls}... (${status})\r`);
      }
    }

    if (!completed) {
      throw new Error('Timeout waiting for generation to complete');
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
 * Test Google Veo video models
 */
async function testVeoVideo(
  testCase: typeof VIDEO_TEST_CASES_VEO[number],
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
    console.log(`   Provider: ${testCase.provider}`);
    console.log(`   Expected Credits: ${testCase.expectedCredits}`);

    // Step 1: Create Veo generation request
    const formData = buildFormData({
      mode: 'text-to-video',
      prompt: testCase.prompt,
      model: testCase.model,
      durationSeconds: testCase.duration,
      resolution: testCase.resolution,
      aspectRatio: testCase.aspectRatio,
      generateAudio: testCase.includeAudio,
    });

    console.log(`   📤 Sending request...`);
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/veo`,
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

    if (!data.operationName) {
      throw new Error(data.error || 'Operation fehlt');
    }

    result.jobId = data.operationName;
    const creditsReserved = data.creditsUsed;

    console.log(`   ✅ Job created: ${result.jobId}`);
    console.log(`   💰 Credits reserved: ${creditsReserved}`);

    // Step 2: Poll for completion
    console.log(`   ⏳ Polling for completion (this may take 1-3 minutes)...`);
    const maxPolls = 120; // 10 minutes max
    const pollInterval = 5000; // 5 seconds
    let pollCount = 0;
    let completed = false;

    while (pollCount < maxPolls && !completed) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      const pollResponse = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/marketing/veo?operation=${result.jobId}`,
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
        result.mediaUrl = pollData.assets?.[0]?.url;
        result.creditsUsed = creditsReserved;

        console.log(`   ✅ Generation complete!`);
        console.log(`   🎬 Video URL: ${result.mediaUrl}`);
        console.log(`   💰 Credits used: ${result.creditsUsed}`);

        result.success = true;
      } else if (status === 'failed') {
        throw new Error(`Generation failed: ${pollData.error}`);
      } else {
        process.stdout.write(`   ⏳ Attempt ${pollCount}/${maxPolls}... (${status})\r`);
      }
    }

    if (!completed) {
      throw new Error('Timeout waiting for generation to complete');
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
 * Run all video generation smoke tests
 */
export async function runVideoGenerationTests(config: TestConfig) {
  console.log('🚀 Starting Video Generation Smoke Tests\n');
  console.log(`Venture ID: ${config.ventureId}`);
  console.log(`API Base URL: ${config.apiBaseUrl}\n`);
  console.log('═'.repeat(70));

  const results: TestResult[] = [];

  // Test Replicate video models
  console.log('\n📦 TESTING REPLICATE VIDEO MODELS');
  console.log('─'.repeat(70));
  for (const testCase of VIDEO_TEST_CASES_REPLICATE) {
    const result = await testReplicateVideo(testCase, config);
    results.push(result);

    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Test Google Veo models
  console.log('\n\n🔵 TESTING GOOGLE VEO MODELS');
  console.log('─'.repeat(70));
  for (const testCase of VIDEO_TEST_CASES_VEO) {
    const result = await testVeoVideo(testCase, config);
    results.push(result);

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TEST SUMMARY - VIDEO GENERATION');
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
  };

  if (!config.ventureId || !config.sessionCookie) {
    console.error('❌ Missing required environment variables:');
    console.error('   - TEST_VENTURE_ID');
    console.error('   - TEST_SESSION_COOKIE');
    console.error('   - API_BASE_URL (optional, defaults to localhost:3000)');
    process.exit(1);
  }

  runVideoGenerationTests(config)
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
