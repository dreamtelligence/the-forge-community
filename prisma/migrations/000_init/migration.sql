-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'FOUNDER', 'MENTOR');

-- CreateEnum
CREATE TYPE "VentureType" AS ENUM ('ECOMMERCE', 'SAAS', 'SERVICE', 'MARKETPLACE', 'AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "VentureStatus" AS ENUM ('IDEATION', 'IN_PROGRESS', 'LAUNCHED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SquadRole" AS ENUM ('LEAD', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONTACTED');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('NDA', 'SERVICE_AGREEMENT', 'PARTNERSHIP', 'SUPPLIER_CONTRACT', 'EMPLOYMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LegalDocumentStatus" AS ENUM ('DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'REFUND', 'PLATFORM_FEE', 'PAYOUT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('REQUESTED', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "FounderApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "instagram" TEXT,
    "why" TEXT,
    "role" TEXT,
    "capital" TEXT,
    "skill" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "notionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "toxicityWarnings" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionEndsAt" TIMESTAMP(3),
    "subscriptionStatus" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'founder',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "credits" INTEGER NOT NULL DEFAULT 50,
    "founderNumber" INTEGER NOT NULL DEFAULT 0,
    "karmaScore" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "birthday" TEXT,
    "addressstreet" TEXT,
    "addresscity" TEXT,
    "addresszip" TEXT,
    "addresscountry" TEXT DEFAULT 'Germany',
    "instagram" TEXT,
    "linkedin" TEXT,
    "bio" TEXT,
    "goal" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeAccountStatus" TEXT,
    "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectedAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "role" "SquadRole" NOT NULL DEFAULT 'MEMBER',
    "equityShare" DOUBLE PRECISION,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SquadMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "squadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "ventureId" TEXT,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'multiple-choice',
    "options" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'open',
    "deadline" TIMESTAMP(3),
    "requiredQuorum" INTEGER NOT NULL DEFAULT 50,
    "winningThreshold" INTEGER NOT NULL DEFAULT 50,
    "winningOption" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteResponse" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "comment" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Karma" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "squadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Karma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VentureType" NOT NULL DEFAULT 'OTHER',
    "status" "VentureStatus" NOT NULL DEFAULT 'IDEATION',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "productType" TEXT,
    "targetMarket" TEXT,
    "brandColors" TEXT,
    "logoUrl" TEXT,
    "pricing" JSONB,
    "marketingBudget" DOUBLE PRECISION,
    "totalBudget" DOUBLE PRECISION,
    "estimatedRevenue" DOUBLE PRECISION,
    "launchDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "squadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandDNA" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "tagline" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "toneOfVoice" TEXT,
    "personality" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "writingStyle" TEXT,
    "targetAudience" JSONB,
    "customerPersona" TEXT,
    "primaryColor" TEXT,
    "secondaryColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logoUrl" TEXT,
    "fontFamily" TEXT,
    "productCategory" TEXT,
    "keyFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usp" TEXT,
    "competitors" JSONB,
    "aiContext" TEXT,
    "doNotMention" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandDNA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "squadId" TEXT,
    "createdById" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "status" "LegalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "aiPrompt" TEXT,
    "generatedContent" TEXT,
    "partnerCompanyName" TEXT,
    "partnerContactName" TEXT,
    "partnerContactEmail" TEXT,
    "partnerContactPhone" TEXT,
    "partnerAddress" TEXT,
    "contractTerms" JSONB,
    "documentUrl" TEXT,
    "signatureUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureStep" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "ventureId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "isFromTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VentureType" NOT NULL,
    "defaultSteps" JSONB NOT NULL,
    "defaultTasks" JSONB NOT NULL,
    "estimatedDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "ventureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT,
    "url" TEXT,
    "contactEmail" TEXT,
    "contactInfo" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minOrderQty" INTEGER,
    "priceRange" TEXT,
    "location" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureResource" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentoringSession" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationWarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "warningNumber" INTEGER NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkPreview" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "siteName" TEXT,
    "aiSummary" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "LinkPreview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingContent" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "generatedContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "MarketingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadTransaction" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeTransferId" TEXT,
    "platformFeeAmount" DOUBLE PRECISION,
    "platformFeePercent" DOUBLE PRECISION,
    "description" TEXT,
    "metadata" JSONB,
    "customerEmail" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budgetAmount" DOUBLE PRECISION,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "spentAmount" DOUBLE PRECISION,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "ventureId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "platform" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "imageUrls" TEXT[],
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "clicks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "country" TEXT,
    "category" TEXT NOT NULL,
    "specialization" TEXT,
    "moq" INTEGER,
    "leadTimeDays" INTEGER,
    "paymentTerms" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER,
    "cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "SampleStatus" NOT NULL DEFAULT 'REQUESTED',
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "approved" BOOLEAN,
    "qualityRating" INTEGER,
    "feedback" TEXT,
    "imageUrls" TEXT[],
    "specFileUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "depositPaid" DOUBLE PRECISION,
    "finalPaid" DOUBLE PRECISION,
    "poFileUrl" TEXT,
    "invoiceUrls" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FounderApplication_email_key" ON "FounderApplication"("email");

-- CreateIndex
CREATE INDEX "FounderApplication_status_idx" ON "FounderApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_notionId_key" ON "User"("notionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_slug_key" ON "Squad"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_stripeConnectedAccountId_key" ON "Squad"("stripeConnectedAccountId");

-- CreateIndex
CREATE INDEX "SquadMember_userId_idx" ON "SquadMember"("userId");

-- CreateIndex
CREATE INDEX "SquadMember_squadId_idx" ON "SquadMember"("squadId");

-- CreateIndex
CREATE INDEX "SquadMember_role_idx" ON "SquadMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SquadMember_userId_squadId_key" ON "SquadMember"("userId", "squadId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapVote_userId_roadmapItemId_key" ON "RoadmapVote"("userId", "roadmapItemId");

-- CreateIndex
CREATE INDEX "Decision_squadId_idx" ON "Decision"("squadId");

-- CreateIndex
CREATE INDEX "Decision_status_idx" ON "Decision"("status");

-- CreateIndex
CREATE INDEX "VoteResponse_decisionId_idx" ON "VoteResponse"("decisionId");

-- CreateIndex
CREATE INDEX "VoteResponse_userId_idx" ON "VoteResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteResponse_decisionId_userId_key" ON "VoteResponse"("decisionId", "userId");

-- CreateIndex
CREATE INDEX "ForumVote_postId_idx" ON "ForumVote"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumVote_postId_userId_key" ON "ForumVote"("postId", "userId");

-- CreateIndex
CREATE INDEX "Karma_squadId_idx" ON "Karma"("squadId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Venture_ownerId_idx" ON "Venture"("ownerId");

-- CreateIndex
CREATE INDEX "Venture_squadId_idx" ON "Venture"("squadId");

-- CreateIndex
CREATE INDEX "Venture_status_idx" ON "Venture"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BrandDNA_ventureId_key" ON "BrandDNA"("ventureId");

-- CreateIndex
CREATE INDEX "BrandDNA_ventureId_idx" ON "BrandDNA"("ventureId");

-- CreateIndex
CREATE INDEX "LegalDocument_ventureId_idx" ON "LegalDocument"("ventureId");

-- CreateIndex
CREATE INDEX "LegalDocument_squadId_idx" ON "LegalDocument"("squadId");

-- CreateIndex
CREATE INDEX "LegalDocument_createdById_idx" ON "LegalDocument"("createdById");

-- CreateIndex
CREATE INDEX "LegalDocument_status_idx" ON "LegalDocument"("status");

-- CreateIndex
CREATE INDEX "LegalDocument_documentType_idx" ON "LegalDocument"("documentType");

-- CreateIndex
CREATE INDEX "LegalDocument_createdAt_idx" ON "LegalDocument"("createdAt");

-- CreateIndex
CREATE INDEX "VentureStep_ventureId_idx" ON "VentureStep"("ventureId");

-- CreateIndex
CREATE UNIQUE INDEX "VentureStep_ventureId_stepNumber_key" ON "VentureStep"("ventureId", "stepNumber");

-- CreateIndex
CREATE INDEX "VentureTask_ventureId_idx" ON "VentureTask"("ventureId");

-- CreateIndex
CREATE INDEX "VentureTask_assignedToId_idx" ON "VentureTask"("assignedToId");

-- CreateIndex
CREATE INDEX "VentureTask_dueDate_idx" ON "VentureTask"("dueDate");

-- CreateIndex
CREATE INDEX "VentureTask_status_idx" ON "VentureTask"("status");

-- CreateIndex
CREATE INDEX "VentureTemplate_type_idx" ON "VentureTemplate"("type");

-- CreateIndex
CREATE INDEX "CostItem_ventureId_idx" ON "CostItem"("ventureId");

-- CreateIndex
CREATE INDEX "CostItem_category_idx" ON "CostItem"("category");

-- CreateIndex
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "VentureResource_ventureId_idx" ON "VentureResource"("ventureId");

-- CreateIndex
CREATE INDEX "VentureResource_resourceId_idx" ON "VentureResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "VentureResource_ventureId_resourceId_key" ON "VentureResource"("ventureId", "resourceId");

-- CreateIndex
CREATE INDEX "MentoringSession_ventureId_idx" ON "MentoringSession"("ventureId");

-- CreateIndex
CREATE INDEX "MentoringSession_mentorId_idx" ON "MentoringSession"("mentorId");

-- CreateIndex
CREATE INDEX "ModerationWarning_userId_idx" ON "ModerationWarning"("userId");

-- CreateIndex
CREATE INDEX "ModerationWarning_createdAt_idx" ON "ModerationWarning"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LinkPreview_url_key" ON "LinkPreview"("url");

-- CreateIndex
CREATE INDEX "LinkPreview_url_idx" ON "LinkPreview"("url");

-- CreateIndex
CREATE INDEX "LinkPreview_fetchedAt_idx" ON "LinkPreview"("fetchedAt");

-- CreateIndex
CREATE INDEX "MarketingContent_ventureId_idx" ON "MarketingContent"("ventureId");

-- CreateIndex
CREATE INDEX "MarketingContent_createdById_idx" ON "MarketingContent"("createdById");

-- CreateIndex
CREATE INDEX "MarketingContent_contentType_idx" ON "MarketingContent"("contentType");

-- CreateIndex
CREATE UNIQUE INDEX "SquadTransaction_stripePaymentIntentId_key" ON "SquadTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "SquadTransaction_squadId_idx" ON "SquadTransaction"("squadId");

-- CreateIndex
CREATE INDEX "SquadTransaction_type_idx" ON "SquadTransaction"("type");

-- CreateIndex
CREATE INDEX "SquadTransaction_status_idx" ON "SquadTransaction"("status");

-- CreateIndex
CREATE INDEX "SquadTransaction_createdAt_idx" ON "SquadTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "SquadTransaction_stripePaymentIntentId_idx" ON "SquadTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_ventureId_idx" ON "MarketingCampaign"("ventureId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "ContentPost_campaignId_idx" ON "ContentPost"("campaignId");

-- CreateIndex
CREATE INDEX "ContentPost_ventureId_idx" ON "ContentPost"("ventureId");

-- CreateIndex
CREATE INDEX "ContentPost_status_idx" ON "ContentPost"("status");

-- CreateIndex
CREATE INDEX "ContentPost_scheduledFor_idx" ON "ContentPost"("scheduledFor");

-- CreateIndex
CREATE INDEX "Supplier_ventureId_idx" ON "Supplier"("ventureId");

-- CreateIndex
CREATE INDEX "Supplier_category_idx" ON "Supplier"("category");

-- CreateIndex
CREATE INDEX "Supplier_country_idx" ON "Supplier"("country");

-- CreateIndex
CREATE INDEX "Sample_ventureId_idx" ON "Sample"("ventureId");

-- CreateIndex
CREATE INDEX "Sample_supplierId_idx" ON "Sample"("supplierId");

-- CreateIndex
CREATE INDEX "Sample_status_idx" ON "Sample"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_ventureId_idx" ON "ProductionOrder"("ventureId");

-- CreateIndex
CREATE INDEX "ProductionOrder_supplierId_idx" ON "ProductionOrder"("supplierId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapVote" ADD CONSTRAINT "RoadmapVote_roadmapItemId_fkey" FOREIGN KEY ("roadmapItemId") REFERENCES "RoadmapItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapVote" ADD CONSTRAINT "RoadmapVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteResponse" ADD CONSTRAINT "VoteResponse_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteResponse" ADD CONSTRAINT "VoteResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumVote" ADD CONSTRAINT "ForumVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Karma" ADD CONSTRAINT "Karma_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venture" ADD CONSTRAINT "Venture_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venture" ADD CONSTRAINT "Venture_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDNA" ADD CONSTRAINT "BrandDNA_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureStep" ADD CONSTRAINT "VentureStep_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureTask" ADD CONSTRAINT "VentureTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureTask" ADD CONSTRAINT "VentureTask_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureResource" ADD CONSTRAINT "VentureResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureResource" ADD CONSTRAINT "VentureResource_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringSession" ADD CONSTRAINT "MentoringSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringSession" ADD CONSTRAINT "MentoringSession_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationWarning" ADD CONSTRAINT "ModerationWarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadTransaction" ADD CONSTRAINT "SquadTransaction_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
