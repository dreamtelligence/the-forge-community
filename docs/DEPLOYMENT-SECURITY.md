# Security Enhancements - Deployment Guide

**Project:** STAKE & SCALE
**Version:** 1.0.0 (Production-Ready)
**Date:** 2025-01-19

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

All security libraries use existing dependencies - **no new packages required**.

### 2. Environment Variables

Add to `.env.local` (all have safe defaults):

```bash
# IP Rate Limiting
ENABLE_IP_RATE_LIMIT=true
RATE_LIMIT_BACKEND=database
IP_RATE_LIMIT_GLOBAL=200
IP_RATE_LIMIT_VOICE=20
IP_RATE_LIMIT_VIDEO=10
IP_RATE_LIMIT_IMAGE=30
IP_RATE_LIMIT_SIGNUP=5

# Daily Quotas
DAILY_QUOTA_VOICE_FREE=20
DAILY_QUOTA_IMAGE_FREE=15
DAILY_QUOTA_VIDEO_FREE=3

# Blob Storage Lifecycle
MEDIA_RETENTION_DAYS=90
ENABLE_MEDIA_CLEANUP=true
MEDIA_CLEANUP_DRY_RUN=false

# CORS
ENABLE_CORS_PROTECTION=true
ALLOWED_ORIGINS=https://www.stakeandscale.de,http://localhost:3000

# CSP rollout
# true  = Content-Security-Policy-Report-Only
# false = Content-Security-Policy (enforced)
CSP_REPORT_ONLY=false

# Error tracking / release tags
APP_RELEASE=local-dev
# Optional: when @sentry/nextjs is installed and configured
SENTRY_DSN=
```

### 3. Test Locally

```bash
npm run dev
```

**Verify IP Rate Limiting:**
```bash
# Make 201 requests in 1 hour from same IP:
for i in {1..201}; do curl http://localhost:3000/api/dashboard; done
# Request 201 should return 429 (rate limit exceeded)
```

**Verify Daily Quotas:**
```bash
# Generate 4 videos in one day (should fail on 4th)
# POST /api/ventures/xxx/marketing/media (type: video)
```

**Verify CORS:**
```bash
curl -H "Origin: https://evil.com" http://localhost:3000/api/dashboard
# Should return 403 (origin not allowed)
```

---

## 📦 Production Deployment (Vercel)

### Step 1: Environment Variables

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add **all** variables from `.env.local` (see above).

**Important:**
- Set `RATE_LIMIT_BACKEND=database` (not `memory`!)
- Set `ALLOWED_ORIGINS` to production domain only
- Generate `CRON_SECRET` (Vercel does this automatically for cron jobs)

### Step 2: Deploy

```bash
git add .
git commit -m "feat: Add production-grade security enhancements"
git push origin main
```

Vercel will automatically:
1. Build the project
2. Run `prisma generate`
3. Deploy to production
4. Set up cron job (from `vercel.json`)

### Step 3: Verify Cron Job

1. Go to **Vercel Dashboard → Cron Jobs**
2. You should see: `/api/cron/cleanup-media` (Schedule: `0 2 * * *`)
3. Click **"Trigger"** to test manually
4. Check logs → Should see `[Cron] Media cleanup job started`

### Step 4: Monitor

**First 24 Hours:**
- Check Vercel logs for `[Rate Limit]` warnings
- Monitor daily quota exhaustion events
- Verify no false positive blocks

**First Week:**
- Check blob storage size (should stay stable after 90 days)
- Monitor cost per user (should be <€1/user/month)

---

## 🧪 Testing Security Features

### Test 1: IP Rate Limiting

**Script:** `test-rate-limit.sh`

```bash
#!/bin/bash
URL="https://www.stakeandscale.de/api/dashboard"

echo "Testing IP rate limiting..."
for i in {1..210}; do
  echo "Request $i"
  response=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

  if [ "$response" == "429" ]; then
    echo "✅ Rate limit triggered at request $i"
    break
  fi
done
```

**Expected:** `429` status code after ~200 requests.

### Test 2: Daily Quotas

**Manual Test:**
1. Generate 3 videos via `/api/ventures/xxx/marketing/media`
2. Attempt 4th generation
3. Should return: `429` with error `"Tageslimit für Video-Generierung erreicht"`

### Test 3: CORS Protection

```bash
curl -H "Origin: https://malicious-site.com" \
     https://www.stakeandscale.de/api/dashboard

# Expected: 403 Forbidden
```

### Test 4: Blob Cleanup (Dry Run)

```bash
# Manually trigger cron with dry run
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://www.stakeandscale.de/api/cron/cleanup-media

# Check response:
# {
#   "success": true,
#   "result": {
#     "dryRun": false,
#     "assetsDeleted": 5,
#     "bytesFreed": 12345678
#   }
# }
```

### Test 5: Security Headers

```bash
curl -sSI https://www.stakeandscale.de | \
  grep -Ei "strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|content-security-policy"
```

Expected baseline:

- Strict-Transport-Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (camera/microphone/geolocation disabled)
- Content-Security-Policy (or Content-Security-Policy-Report-Only when `CSP_REPORT_ONLY=true`)

### Test 6: Stripe Webhook Signature + Idempotency

Checklist:
- Signature validation active via `stripe.webhooks.constructEvent(...)`
- Atomic idempotency lock active via `webhook_events.event_id` unique key
- Duplicate webhook delivery returns `200` without side effects
- Failed processing releases lock for Stripe retry

Evidence:
- Route: `app/api/webhooks/stripe/route.ts`
- Table: `webhook_events`

### Test 7: Multi-Tenant Isolation (Venture APIs)

Manual smoke check:
1. Login as user A and call a venture endpoint with venture from user B.
2. Expected response: `404` (`Venture nicht gefunden oder Zugriff verweigert`).
3. Login as owner/member and repeat.
4. Expected response: `200`.

Hardened routes now use centralized access guard:
- `lib/venture-access.ts`
- marketing campaigns APIs
- sourcing item/import APIs
- watchdog latest API

### Test 8: Auth/Public Endpoint Rate Limits

Auth POST rate limit:
- Route: `app/api/auth/[...nextauth]/route.ts`
- Scope: signin + credentials/email callback POST flows
- Limiter: `RateLimiters.auth` (`5` requests / `15` minutes / client IP)

Public founder form rate limit:
- Route: `app/api/founders/add/route.ts`
- Limiter: `RateLimiters.publicForm` (`8` requests / `10` minutes / client IP)

### Test 9: Error Tracking + Release Tagging

Current baseline:
- Structured server error tracking in `lib/error-tracking.ts`
- Release tag sourced from: `APP_RELEASE` -> `VERCEL_GIT_COMMIT_SHA` -> `VERCEL_DEPLOYMENT_ID`
- Optional Sentry bridge is auto-used when `@sentry/nextjs` is installed

Quick check:
1. Trigger a known handled error in staging.
2. Verify log entry includes `release` + `environment`.
3. If Sentry installed, verify event appears with matching release tag.

---

## 🔒 Security Checklist

**Before Deploying to Production:**

- [ ] All environment variables set in Vercel
- [ ] `ALLOWED_ORIGINS` contains **only** production domain
- [ ] `RATE_LIMIT_BACKEND=database` (not memory)
- [ ] Cron job configured in `vercel.json`
- [ ] `ENABLE_IP_RATE_LIMIT=true`
- [ ] `ENABLE_MEDIA_CLEANUP=true`
- [ ] `ENABLE_CORS_PROTECTION=true`
- [ ] `CSP_REPORT_ONLY` set (`true` for rollout, `false` for enforcement)
- [ ] Tested rate limiting locally
- [ ] Tested daily quotas locally
- [ ] Verified CORS blocks malicious origins
- [ ] Verified security headers via `curl -I` or browser devtools
- [ ] Stripe webhook signature verification and idempotency lock tested
- [ ] Venture cross-tenant access blocked (`404` on foreign venture IDs)
- [ ] Auth/public rate limits verified (`429` after threshold)
- [ ] Error tracking logs include release tag
- [ ] Monitored first 24h after deployment

**Optional (Nice to Have):**

- [ ] Cloudflare Bot Management enabled
- [ ] Email verification on signup
- [ ] Honeypot for bot detection
- [ ] Redis for distributed rate limiting

---

## 📊 Monitoring Queries

### Check Rate Limit Hits (Logs)

```bash
vercel logs --production | grep "\[Rate Limit\]"
```

### Check Daily Quota Usage (Database)

```sql
SELECT
  feature,
  COUNT(*) as hits,
  MAX("windowStart") as latest_window
FROM "RateLimitBucket"
WHERE
  feature LIKE 'daily-quota:%'
  AND "windowStart" > NOW() - INTERVAL '7 days'
GROUP BY feature
ORDER BY hits DESC;
```

### Check Blob Storage Size

```sql
SELECT
  SUM(size) / 1024 / 1024 as total_mb,
  COUNT(*) as total_assets,
  source
FROM "MediaAsset"
WHERE "isArchived" = false
GROUP BY source;
```

### Check Cleanup Job Effectiveness

```sql
SELECT
  COUNT(*) as archived_assets,
  SUM(size) / 1024 / 1024 as freed_mb
FROM "MediaAsset"
WHERE "isArchived" = true;
```

---

## 🚨 Troubleshooting

### Issue: Rate Limit False Positives

**Symptom:** Legitimate users getting blocked.

**Solution:**
1. Check IP extraction logic:
   ```bash
   vercel logs --production | grep "extractIpAddress"
   ```
2. Temporarily increase limits:
   ```bash
   IP_RATE_LIMIT_GLOBAL=500  # Double the limit
   ```
3. Add IP whitelist (if needed - see `lib/security/ip-rate-limit.ts`)

### Issue: Daily Quota Too Strict

**Symptom:** >10% of users hitting daily limits.

**Solution:**
```bash
DAILY_QUOTA_VIDEO_FREE=5  # Increase from 3 to 5
DAILY_QUOTA_IMAGE_FREE=25  # Increase from 15 to 25
```

### Issue: Blob Cleanup Deleting Too Much

**Symptom:** Users complain about missing assets.

**Solution:**
1. Enable dry-run mode:
   ```bash
   MEDIA_CLEANUP_DRY_RUN=true
   ```
2. Check eligibility criteria in logs
3. Increase retention period:
   ```bash
   MEDIA_RETENTION_DAYS=180  # 6 months instead of 3
   ```

### Issue: Cron Job Not Running

**Symptom:** No cleanup logs in Vercel.

**Solution:**
1. Verify `vercel.json` is deployed
2. Check Vercel Dashboard → Cron Jobs
3. Manually trigger via dashboard
4. Verify `CRON_SECRET` is set

### Issue: High API Latency After Deployment

**Symptom:** API requests slower than before.

**Solution:**
1. Check rate limiter performance:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM "RateLimitBucket"
   WHERE "userId" = 'system:ip'
     AND "feature" = 'ip:global-api'
     AND "windowStart" = NOW();
   ```
2. Add index if missing (should exist):
   ```sql
   CREATE INDEX CONCURRENTLY idx_ratelimit_ip_lookup
   ON "RateLimitBucket" ("userId", "feature", "windowStart");
   ```
3. Switch to memory backend temporarily:
   ```bash
   RATE_LIMIT_BACKEND=memory  # Dev/staging only!
   ```

---

## 🔄 Rollback Plan

If something goes wrong, quickly disable features:

**Emergency Disable (5 seconds):**
```bash
# Vercel Dashboard → Environment Variables → Edit
ENABLE_IP_RATE_LIMIT=false
ENABLE_MEDIA_CLEANUP=false
ENABLE_CORS_PROTECTION=false

# Redeploy (or wait for auto-deploy)
```

**Partial Rollback (Daily Quotas):**
```typescript
// Comment out daily quota checks in:
// - app/api/ventures/[id]/marketing/voice/route.ts
// - app/api/ventures/[id]/marketing/media/route.ts

// Lines to comment:
// const dailyQuota = await checkDailyVoiceQuota(user.id);
// if (!dailyQuota.allowed) { ... }
```

**Full Rollback (Git):**
```bash
git revert <commit-hash>
git push origin main
```

---

## 📈 Success Metrics (First Month)

**Security:**
- ✅ Zero successful cost attacks (>€50 in single day)
- ✅ <0.1% false positive rate (legitimate users blocked)
- ✅ <5% daily quota exhaustion (free tier users)

**Performance:**
- ✅ API latency <500ms p95 (unchanged from baseline)
- ✅ Rate limiter overhead <10ms per request
- ✅ Cron job execution <30s per run

**Cost:**
- ✅ Blob storage growth <10GB/month
- ✅ Cost per user <€1/month (Replicate + ElevenLabs)
- ✅ Vercel function invocations <1M/month

**User Experience:**
- ✅ <1% support tickets re: "blocked" errors
- ✅ Zero data loss from blob cleanup
- ✅ No service outages from security features

---

## 🆘 Support

**Issues?**
- GitHub Issues: (not public yet)
- Email: info@stakeandscale.de
- Documentation: `SECURITY-ENHANCEMENT.md`

---

**Next Steps:**
1. Deploy to staging first (test for 24h)
2. Deploy to production
3. Monitor for 1 week
4. Tune limits based on real usage
5. Enable Redis for scale (if needed)

🎉 **Your API is now production-ready and protected against cost attacks!**
