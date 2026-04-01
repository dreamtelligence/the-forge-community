/**
 * Smoke Tests for Image Generation Models
 * Tests marketing media image models (Replicate)
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
const IMAGE_TEST_CASES = [
  // Replicate
  {
    name: 'Flux 2 Pro (Photorealism)',
    model: 'black-forest-labs/flux-2-pro',
    provider: 'replicate',
    prompt: 'a red apple on a wooden table, studio lighting, professional photography',
    aspectRatio: '1:1',
    expectedCredits: 4,
  },
  {
    name: 'Flux 1.1 Pro (Gold Standard)',
    model: 'black-forest-labs/flux-1.1-pro',
    provider: 'replicate',
    prompt: 'a red apple on a wooden table, studio lighting, professional photography',
    aspectRatio: '16:9',
    expectedCredits: 4,
  },
] as const;

// Gemini-specific tests (different endpoint)

/**
 * Test a single image generation model
 */
async function testImageModel(
  testCase: typeof IMAGE_TEST_CASES[number],
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
      mode: 'text-to-image',
      prompt: testCase.prompt,
      model: testCase.model,
      aspectRatio: testCase.aspectRatio,
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
    console.log(`   ⏳ Polling for completion...`);
    const maxPolls = 60; // 5 minutes max
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
        console.log(`   🖼️  Image URL: ${result.mediaUrl}`);
        console.log(`   💰 Credits used: ${result.creditsUsed}`);

        // Step 3: Verify media is accessible
        if (result.mediaUrl) {
          const mediaCheck = await fetch(result.mediaUrl, { method: 'HEAD' });
          if (!mediaCheck.ok) {
            throw new Error('Media URL is not accessible');
          }
          console.log(`   ✅ Media is accessible`);
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
 * Run all image generation smoke tests
 */
export async function runImageGenerationTests(config: TestConfig) {
  console.log('🚀 Starting Image Generation Smoke Tests\n');
  console.log(`Venture ID: ${config.ventureId}`);
  console.log(`API Base URL: ${config.apiBaseUrl}\n`);
  console.log('═'.repeat(70));

  const results: TestResult[] = [];

  // Test all standard image models
  for (const testCase of IMAGE_TEST_CASES) {
    const result = await testImageModel(testCase, config);
    results.push(result);

    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TEST SUMMARY - IMAGE GENERATION');
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

  runImageGenerationTests(config)
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
