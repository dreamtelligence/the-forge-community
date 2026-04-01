# Smoke Tests - Media + Warehouse APIs

Comprehensive smoke tests for all image and video generation models in The Forge Community platform.

## Overview

This test suite validates:
- **2 Image Generation Models** (Replicate)
- **7 Video Generation Models** (Replicate + Google Veo)
- **6 Video Effect Tools** (Face Swap, Lip Sync, Motion Transfer)
- **Warehouse WMS Endpoints** (Woo import, inbound lifecycle, pickup receipt, optional photo flow)

## Prerequisites

### 1. Environment Variables

Create a `.env.test` file in the project root:

```bash
# Required
TEST_VENTURE_ID="your-venture-id"
TEST_SESSION_COOKIE="your-session-cookie"

# Optional
API_BASE_URL="http://localhost:3000"  # or production URL

# For video effects tests only
TEST_VIDEO_URL="https://example.com/test-video.mp4"
TEST_IMAGE_URL="https://example.com/test-image.jpg"
TEST_AUDIO_URL="https://example.com/test-audio.mp3"
TEST_DRIVING_VIDEO_URL="https://example.com/driving-video.mp4"

# For warehouse tests (photo step optional)
TEST_WAREHOUSE_PHOTO_UPLOAD=0
TEST_WAREHOUSE_IMAGE_URL="https://example.com/test-image.jpg"
```

### 2. Get Your Session Cookie

**Option 1: From Browser DevTools**
1. Log in to The Forge platform
2. Open DevTools (F12)
3. Go to Application > Cookies
4. Copy the value of the session cookie

You can set `TEST_SESSION_COOKIE` to either the raw cookie value or the full cookie string
(`authjs.session-token=<value>` on `http://localhost:3000`, or
`__Secure-authjs.session-token=<value>` on HTTPS). The test runner will normalize it.

**Option 2: Using curl**
```bash
curl -c cookies.txt https://your-forge-url/api/auth/signin
# Extract session cookie from cookies.txt
```

### 3. Ensure Sufficient Credits

The test venture should have enough credits:
- **Image Tests:** ~8 credits (2 models)
- **Video Tests:** ~315 credits (7 models)
- **Effects Tests:** ~250 credits (6 tools)
- **Total:** ~573 credits minimum

## Running Tests

### Install Dependencies

```bash
npm install
# or
pnpm install
```

### Run All Tests

```bash
# Load environment variables and run all tests
source .env.test && npm run test:smoke
```

### Run Specific Test Suites

```bash
# Image generation only
npm run test:smoke:image

# Video generation only
npm run test:smoke:video

# Video effects only
npm run test:smoke:effects

# Warehouse WMS API smoke tests
npm run test:smoke:warehouse
```

### Run Individual Test Scripts

```bash
# Image generation
npx tsx scripts/smoke-tests/test-image-generation.ts

# Video generation
npx tsx scripts/smoke-tests/test-video-generation.ts

# Video effects
npx tsx scripts/smoke-tests/test-video-effects.ts

# Warehouse APIs
npx tsx scripts/smoke-tests/test-warehouse-wms.ts
```

## Test Structure

```
scripts/smoke-tests/
├── test-image-generation.ts    # Tests 2 image models
├── test-video-generation.ts    # Tests 7 video models
├── test-video-effects.ts       # Tests 6 effect tools
├── test-warehouse-wms.ts       # Tests warehouse WMS API flow
├── run-all-tests.ts            # Master test runner
└── README.md                   # This file
```

## What Gets Tested

### Image Generation Tests

| Model | Provider | Credits | Test Prompt |
|-------|----------|---------|-------------|
| Flux 2 Pro | Replicate | 4 | "a red apple on a table" |
| Flux 1.1 Pro | Replicate | 4 | "a red apple on a table" |

### Video Generation Tests

| Model | Provider | Credits | Duration |
|-------|----------|---------|----------|
| Kling 2.6 Pro | Replicate | 55 | 4s |
| Sora 2 | Replicate | 60 | 4s |
| Veo 3.1 (Replicate) | Replicate | 58 | 4s |
| Minimax Video-01 | Replicate | 45 | 4s |
| Luma Dream Machine | Replicate | 40 | 4s |
| Veo 3.1 (Google) | Google | 40 | 4s |
| Veo 3.1 Fast | Google | 15 | 4s |

### Video Effects Tests

| Tool | Provider | Credits | Input |
|------|----------|---------|-------|
| Roop Face Swap | Replicate | 50 | Video + Face Image |
| CodePlug Face Swap | Replicate | 45 | Video + Face Image |
| Live Portrait Pro | Replicate | 65 | Image + Driving Video |
| Sync Lip Sync 2 | Replicate | 18 | Video + Audio |
| Sync Lip Sync 2 Pro | Replicate | 45 | Video + Audio |
| Wan 2.2 Animate | Replicate | 50 | Image + Driving Video |

### Warehouse WMS API Tests

| Endpoint Flow | Method | Expected Result |
|--------------|--------|-----------------|
| Woo order import | `POST /warehouse/orders/import/woocommerce` | Summary with `failed=0` |
| Inbound create | `POST /warehouse/inbound-packages` | Package in `RECEIVED` |
| Inbound status update | `PATCH /warehouse/inbound-packages/[id]` | Status change to `STORED` |
| Pickup receipt | `POST /warehouse/inbound-packages/[id]/pickup-receipt` | Receipt `PU-...` + `PICKED_UP` |
| Photo upload/delete (optional) | `POST/DELETE /warehouse/inbound-packages/[id]/photos` | URL add/remove succeeds |

## Success Criteria

Each test validates:
- ✅ API endpoint is reachable
- ✅ Job is created successfully
- ✅ Credits are reserved correctly
- ✅ Generation completes without errors
- ✅ Media URL is returned
- ✅ Media is accessible
- ✅ Credits are settled correctly

## Expected Execution Time

| Test Suite | Tests | Estimated Time |
|------------|-------|----------------|
| Image Generation | 2 | ~1-3 minutes |
| Video Generation | 7 | ~10-20 minutes |
| Video Effects | 6 | ~5-10 minutes |
| Warehouse APIs | 5-6 | ~1-3 minutes |
| **Total** | **20-21** | **~21-38 minutes** |

## Troubleshooting

### "Missing required environment variables"

Ensure you've set `TEST_VENTURE_ID` and `TEST_SESSION_COOKIE`:

```bash
export TEST_VENTURE_ID="your-venture-id"
export TEST_SESSION_COOKIE="your-session-cookie"
```

### "Insufficient credits"

Add credits to your test venture:
```bash
# Check current balance
curl -H "Cookie: ${TEST_SESSION_COOKIE}" \
  "${API_BASE_URL}/api/ventures/${TEST_VENTURE_ID}/credits"

# Purchase credits via Stripe or add manually
```

### "Rate limit exceeded"

Wait for the rate limit to reset (usually 1 hour) or increase rate limits in your venture settings.

### "Timeout waiting for generation"

Some models take longer than expected. You can:
1. Increase `maxPolls` in the test scripts
2. Check job status manually in the database
3. Verify the model is working via the UI

## Adding New Tests

### Add a New Image Model

1. Add to `IMAGE_TEST_CASES` in `test-image-generation.ts`:

```typescript
{
  name: 'My New Model',
  model: 'my-new-model',
  provider: 'replicate',
  prompt: 'test prompt',
  aspectRatio: '1:1',
  expectedCredits: 10,
}
```

### Add a New Video Model

1. Add to appropriate test cases array in `test-video-generation.ts`
2. Choose the correct test function based on provider

### Add a New Effect Tool

1. Add to appropriate test cases array in `test-video-effects.ts`
2. Implement test function if it uses a new endpoint

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Smoke Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - name: Run smoke tests
        env:
          TEST_VENTURE_ID: ${{ secrets.TEST_VENTURE_ID }}
          TEST_SESSION_COOKIE: ${{ secrets.TEST_SESSION_COOKIE }}
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
        run: npm run test:smoke
```

## Monitoring

After running tests, monitor:
- Credit balance changes
- Media asset storage usage
- API error rates
- Generation success rates

Query test results:
```sql
SELECT
  model,
  COUNT(*) as total_generations,
  AVG(duration_ms) as avg_duration,
  SUM(credits_used) as total_credits
FROM media_generations
WHERE created_at > NOW() - INTERVAL '1 day'
  AND venture_id = 'test-venture-id'
GROUP BY model
ORDER BY total_generations DESC;
```

## Support

For issues or questions:
1. Check the main test plan: `/SMOKE_TEST_PLAN.md`
2. Review API logs in the venture dashboard
3. Contact the development team

---

**Last Updated:** 2026-02-06
