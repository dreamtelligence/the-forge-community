
import { buildFormData, fetchBlobForForm, normalizeSessionCookie, safeJsonParse } from './smoke-tests/utils';

// Types
interface TestResult {
    endpoint: string;
    model: string;
    success: boolean;
    duration: number;
    error?: string;
    mock?: boolean;
}

interface TestConfig {
    ventureId: string;
    apiBaseUrl: string;
    sessionCookie: string;
    testVideoUrl: string;
    testImageUrl: string;
    testDrivingVideoUrl: string;
}

const TEST_CASES = [
    {
        name: 'Face Swap (Lucataco)',
        endpoint: '/api/ventures/{ventureId}/marketing/faceswap',
        model: 'lucataco-faceswap',
        type: 'faceswap',
    },
    {
        name: 'Character Swap (Live Portrait)',
        endpoint: '/api/ventures/{ventureId}/marketing/faceswap',
        model: 'live-portrait',
        type: 'faceswap',
    },
    {
        name: 'Motion Transfer (Wan 2.2)',
        endpoint: '/api/ventures/{ventureId}/marketing/motion-transfer',
        model: 'wan-2.2-animate',
        type: 'motion-transfer',
    },
] as const;

const assetCache = new Map<string, Promise<{ blob: Blob; filename: string }>>();
const loadAsset = (url: string, fallbackName: string) => {
    if (!assetCache.has(url)) {
        assetCache.set(url, fetchBlobForForm(url, fallbackName));
    }
    return assetCache.get(url)!;
};

async function runDryRunTest(
    testCase: typeof TEST_CASES[number],
    config: TestConfig
): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
        endpoint: testCase.endpoint,
        model: testCase.model,
        success: false,
        duration: 0,
    };

    try {
        console.log(`\n🧪 Testing Dry Run: ${testCase.name}`);
        console.log(`   Model: ${testCase.model}`);

        const endpoint = testCase.endpoint.replace('{ventureId}', config.ventureId);
        let formData: FormData;

        if (testCase.type === 'faceswap') {
            const [videoAsset, faceAsset] = await Promise.all([
                loadAsset(config.testVideoUrl, 'video.mp4'),
                loadAsset(config.testImageUrl, 'face.jpg'),
            ]);
            formData = buildFormData({
                model: testCase.model,
                swapCondition: 'all',
            });
            formData.set('video', videoAsset.blob, videoAsset.filename);
            formData.set('face', faceAsset.blob, faceAsset.filename);
        } else {
            // Motion Transfer
            const [drivingAsset, imageAsset] = await Promise.all([
                loadAsset(config.testDrivingVideoUrl, 'driving.mp4'),
                loadAsset(config.testImageUrl, 'character.jpg'),
            ]);
            formData = buildFormData({
                model: testCase.model,
                resolution: '720',
            });
            formData.set('drivingVideo', drivingAsset.blob, drivingAsset.filename);
            formData.set('characterImage', imageAsset.blob, imageAsset.filename);
        }

        console.log(`   📤 Sending request with X-Dry-Run: true...`);
        const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Cookie': config.sessionCookie,
                'X-Dry-Run': 'true',
            },
            body: formData,
        });

        const rawText = await response.text();
        const data = safeJsonParse(rawText) ?? {};

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${rawText}`);
        }

        if (data.mock === true && data.creditsUsed === 0) {
            console.log(`   ✅ Dry Run Success!`);
            console.log(`   🆔 Prediction ID: ${data.predictionId}`);
            console.log(`   💰 Credits Used: ${data.creditsUsed}`);
            result.success = true;
            result.mock = true;
        } else {
            throw new Error(`Response did not indicate mock execution: ${JSON.stringify(data)}`);
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

async function main() {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const sessionCookie = normalizeSessionCookie(
        process.env.TEST_SESSION_COOKIE || 'mock-session-cookie',
        apiBaseUrl,
    );

    // Defaults using public assets if env vars not set (assuming localhost can serve them)
    const config: TestConfig = {
        ventureId: process.env.TEST_VENTURE_ID || 'mock-venture-id',
        apiBaseUrl,
        sessionCookie,
        testVideoUrl: process.env.TEST_VIDEO_URL || `${apiBaseUrl}/0.mp4`,
        testImageUrl: process.env.TEST_IMAGE_URL || `${apiBaseUrl}/applewatch.jpg`,
        testDrivingVideoUrl: process.env.TEST_DRIVING_VIDEO_URL || `${apiBaseUrl}/0.mp4`, // Reusing 0.mp4 for driving video
    };

    if (process.env.TEST_VENTURE_ID && process.env.TEST_SESSION_COOKIE) {
        console.log('ℹ️  Using provided TEST_VENTURE_ID and TEST_SESSION_COOKIE');
    } else {
        console.log('ℹ️  Using MOCK credentials (dev mode bypass expected)');
    }

    console.log('🚀 Starting Dry Run Tests\n');

    let passed = 0;
    for (const testCase of TEST_CASES) {
        const result = await runDryRunTest(testCase, config);
        if (result.success) passed++;
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`📊 SUMMARY: ${passed}/${TEST_CASES.length} passed`);
    console.log('═'.repeat(70));

    process.exit(passed === TEST_CASES.length ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}
