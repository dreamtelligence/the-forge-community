#!/bin/bash

# Define the replacements
declare -A replacements=(
    ["@/lib/achievements"]="@/lib/user/achievements"
    ["@/lib/admin-access"]="@/lib/security/admin-access"
    ["@/lib/admin"]="@/lib/security/admin"
    ["@/lib/ai-contract-scan"]="@/lib/ai/contract-scan"
    ["@/lib/ai-legal"]="@/lib/ai/legal"
    ["@/lib/ai-prompt-engine"]="@/lib/ai/prompt-engine"
    ["@/lib/ai-research"]="@/lib/ai/research"
    ["@/lib/billing-v2"]="@/lib/billing/v2"
    ["@/lib/credit-pricing"]="@/lib/billing/credit-pricing"
    ["@/lib/db-security"]="@/lib/security/db"
    ["@/lib/direct-messages"]="@/lib/forum/direct-messages"
    ["@/lib/energy"]="@/lib/finance/energy"
    ["@/lib/error-tracking"]="@/lib/utils/error-tracking"
    ["@/lib/finance-ledger"]="@/lib/finance/ledger"
    ["@/lib/finance-reconciliation"]="@/lib/finance/reconciliation"
    ["@/lib/forge-knowledge"]="@/lib/ai/knowledge"
    ["@/lib/forge-lab"]="@/lib/ai/lab"
    ["@/lib/forum-feed"]="@/lib/forum/feed"
    ["@/lib/forum-performance"]="@/lib/forum/performance"
    ["@/lib/forum-venture"]="@/lib/forum/venture"
    ["@/lib/founder-number"]="@/lib/user/founder-number"
    ["@/lib/gemini-tools"]="@/lib/ai/gemini-tools"
    ["@/lib/google-ai"]="@/lib/ai/google"
    ["@/lib/invoice-pdf"]="@/lib/billing/invoice-pdf"
    ["@/lib/karma"]="@/lib/user/karma"
    ["@/lib/knowledge-base"]="@/lib/ai/knowledge-base"
    ["@/lib/legal-corpus"]="@/lib/legal/corpus"
    ["@/lib/moderation"]="@/lib/security/moderation"
    ["@/lib/notifications"]="@/lib/forum/notifications"
    ["@/lib/notion"]="@/lib/integrations/notion"
    ["@/lib/orion-tools"]="@/lib/ai/orion-tools"
    ["@/lib/personal-studio"]="@/lib/ventures/personal-studio"
    ["@/lib/platform-access"]="@/lib/security/platform-access"
    ["@/lib/platform-invoicing"]="@/lib/billing/invoicing"
    ["@/lib/platform-tax-profile"]="@/lib/billing/tax-profile"
    ["@/lib/profile"]="@/lib/user/profile"
    ["@/lib/prompt-templates"]="@/lib/ai/prompt-templates"
    ["@/lib/provider-keys"]="@/lib/integrations/provider-keys"
    ["@/lib/rate-limit"]="@/lib/security/rate-limit"
    ["@/lib/research"]="@/lib/ai/research-core"
    ["@/lib/seo"]="@/lib/utils/seo"
    ["@/lib/session-user"]="@/lib/user/session"
    ["@/lib/slack-notifications"]="@/lib/integrations/slack"
    ["@/lib/squad-visibility"]="@/lib/user/squad-visibility"
    ["@/lib/stripe"]="@/lib/billing/stripe"
    ["@/lib/text-utils"]="@/lib/utils/text"
    ["@/lib/transaction-retry"]="@/lib/utils/transaction-retry"
    ["@/lib/trend-hunter"]="@/lib/ai/trend-hunter"
    ["@/lib/turnstile"]="@/lib/security/turnstile"
    ["@/lib/ui-sound"]="@/lib/utils/sound"
    ["@/lib/venture-access"]="@/lib/ventures/access"
    ["@/lib/venture-templates"]="@/lib/ventures/templates"
    ["@/lib/video-utils"]="@/lib/utils/video"
    ["@/lib/watchdog"]="@/lib/security/watchdog"
)

# Find all .ts and .tsx files
files=$(find app lib shared types scripts -name "*.ts" -o -name "*.tsx")

for file in $files; do
    for old in "${!replacements[@]}"; do
        new="${replacements[$old]}"
        # Use sed to replace the pattern. 
        # We look for the pattern surrounded by quotes to avoid partial matches
        # Note: BSD sed (macOS) works slightly differently than GNU sed
        sed -i '' "s|['\"]${old}['\"]|'${new}'|g" "$file"
        sed -i '' "s|['\"]${old}/|'${new}/|g" "$file"
    done
done
