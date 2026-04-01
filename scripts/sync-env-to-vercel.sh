#!/bin/bash

# List of variables to transfer
vars=(
  "AUTH_RESEND_FROM"
  "GEMINI_API_VERSION"
  "GEMINI_MODEL"
  "REPLICATE_API_TOKEN"
  "REPLICATE_WEBHOOK_"
  "STRIPE_WEBHOOK_SECRET"
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
  "TURNSTILE_SECRET_KEY"
  "PUBLIC_LOGIN_ENABLED"
  "NEXT_PUBLIC_PUBLIC_LOGIN_ENABLED"
  "BETA_LOGIN_ALLOWLIST"
  "NEXT_PUBLIC_BETA_APPLICATION_EMAIL"
  "ADMIN_EMAIL"
  "ADMIN_EMAILS"
  "CASEWORKER_CREDENTIALS_ENABLED"
  "NEXT_PUBLIC_CASEWORKER_CREDENTIALS_ENABLED"
  "CASEWORKER_LOGIN_EMAIL"
  "NEXT_PUBLIC_CASEWORKER_LOGIN_EMAIL"
  "CASEWORKER_LOGIN_PASSWORD"
  "NEXT_PUBLIC_STRIPE_PRICE_PLATFORM_ACCESS"
  "NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY"
  "STRIPE_PRICE_PLATFORM_ACCESS"
  "STRIPE_PRICE_PRO_MONTHLY"
  "STRIPE_ALLOWED_SUBSCRIPTION_PRICE_IDS"
  "RESEND_API_KEY"
  "WAREHOUSE_RESEND_FROM"
  "WAREHOUSE_RESEND_FROM_NAME"
  "BLOB_READ_WRITE_TOKEN"
  "WAREHOUSE_REORDER_TARGET_MULTIPLIER"
  "WAREHOUSE_REORDER_MIN_ORDER_QTY"
  "WAREHOUSE_OPS_DIGEST_MAX_VENTURES"
  "WAREHOUSE_OPS_DIGEST_SEND_EMPTY"
  "WAREHOUSE_OPS_DIGEST_EMAIL_ENABLED"
)

# Function to get value from .env.local
get_val() {
  grep "^$1=" .env.local | cut -d'=' -f2- | sed 's/^"//;s/"$//'
}

echo "Starting transfer of environment variables to Vercel..."

run_vercel() {
  if command -v vercel >/dev/null 2>&1; then
    vercel "$@"
  else
    npx vercel "$@"
  fi
}

for var in "${vars[@]}"; do
  val=$(get_val "$var")
  if [ -n "$val" ]; then
    echo "Adding $var..."
    # We use printf to handle potential special characters in values
    printf "%s" "$val" | run_vercel env add "$var" production --force
    printf "%s" "$val" | run_vercel env add "$var" preview --force
    printf "%s" "$val" | run_vercel env add "$var" development --force
  else
    echo "Skipping $var (not found in .env.local)"
  fi
done

# Special case for NEXT_PUBLIC_APP_URL which might be your custom domain
val=$(get_val "AUTH_URL")
if [ -n "$val" ]; then
  echo "Adding NEXT_PUBLIC_APP_URL (from AUTH_URL)..."
  printf "%s" "$val" | run_vercel env add "NEXT_PUBLIC_APP_URL" production --force
  printf "%s" "$val" | run_vercel env add "NEXT_PUBLIC_APP_URL" preview --force
  printf "%s" "$val" | run_vercel env add "NEXT_PUBLIC_APP_URL" development --force
fi

echo "Done! Please run 'vercel deploy' or wait for the next push to apply changes."
