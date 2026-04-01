-- ==========================================
-- THE FORGE - AI-POWERED VENTURE STUDIO
-- Database Schema V2.0
-- ==========================================

-- Enable pgvector extension for AI Matchmaking
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- USERS & PROFILES
-- ==========================================

-- Existing User table (keep as is, extend)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS skills_vector vector(1536); -- OpenAI embedding dimension
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS time_commitment INTEGER; -- hours/week
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS budget_capacity INTEGER; -- EUR
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50); -- "beginner", "intermediate", "expert"
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS preferred_roles TEXT[]; -- ["designer", "developer", "marketer"]
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS languages TEXT[];

-- ==========================================
-- SQUADS
-- ==========================================

CREATE TABLE IF NOT EXISTS squads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  mission TEXT, -- "Build a sustainable fashion brand"
  status VARCHAR(50) DEFAULT 'forming', -- forming, planning, building, launched, archived

  -- Leadership
  lead_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,

  -- Size & Capacity
  min_members INTEGER DEFAULT 2,
  max_members INTEGER DEFAULT 5,
  current_members INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  launched_at TIMESTAMP,
  archived_at TIMESTAMP,

  -- Squad Type
  squad_type VARCHAR(50) DEFAULT 'venture', -- venture, project, experiment

  -- Visibility
  is_public BOOLEAN DEFAULT true, -- Can people browse and apply?
  is_accepting_members BOOLEAN DEFAULT true
);

CREATE INDEX idx_squads_status ON squads(status);
CREATE INDEX idx_squads_public ON squads(is_public, is_accepting_members);

-- ==========================================
-- SQUAD MEMBERS
-- ==========================================

CREATE TABLE IF NOT EXISTS squad_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(50) DEFAULT 'member', -- lead, co-founder, contributor

  -- Equity (tracked, not legal)
  equity_share DECIMAL(5,2) DEFAULT 0.00, -- Percentage (e.g., 25.00 = 25%)
  equity_type VARCHAR(50) DEFAULT 'equal', -- equal, dynamic, custom

  -- Contribution Tracking
  hours_contributed INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  votes_cast INTEGER DEFAULT 0,

  -- Capital
  capital_contributed DECIMAL(10,2) DEFAULT 0.00, -- EUR

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, invited, left, removed
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,

  -- Invitation
  invited_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  invitation_accepted_at TIMESTAMP,

  UNIQUE(squad_id, user_id)
);

CREATE INDEX idx_squad_members_squad ON squad_members(squad_id);
CREATE INDEX idx_squad_members_user ON squad_members(user_id);
CREATE INDEX idx_squad_members_status ON squad_members(status);

-- ==========================================
-- VENTURES (What Squads Build)
-- ==========================================

CREATE TABLE IF NOT EXISTS ventures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT UNIQUE NOT NULL REFERENCES squads(id) ON DELETE CASCADE,

  -- Basics
  name VARCHAR(150), -- "EcoWear"
  tagline TEXT, -- "Sustainable fashion for conscious consumers"
  category VARCHAR(50), -- fashion, food, tech, etc.

  -- Status & Phase
  status VARCHAR(50) DEFAULT 'concept', -- concept, development, launched, revenue, archived
  current_phase INTEGER DEFAULT 1, -- 1-6 (Ideation → Launch)
  phase_completed INTEGER DEFAULT 0, -- How many phases done

  -- Branding
  brand_name VARCHAR(100),
  domain VARCHAR(255),
  logo_url TEXT,
  brand_colors TEXT[], -- ["#FF5733", "#C70039"]
  brand_fonts TEXT[], -- ["Inter", "Playfair Display"]

  -- Target Market
  target_audience TEXT, -- Persona description
  usp TEXT, -- Unique Selling Proposition

  -- Supplier
  selected_supplier_id TEXT, -- Reference to suppliers table

  -- Production
  moq INTEGER, -- Minimum Order Quantity
  unit_cost DECIMAL(10,2),
  first_order_date DATE,
  first_order_quantity INTEGER,

  -- Launch
  launch_url TEXT, -- Shopify, Website, etc.
  launch_date DATE,
  first_sale_date DATE,

  -- Revenue (tracked from Stripe)
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  total_orders INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  launched_at TIMESTAMP,

  -- AI Generated Assets
  ai_logo_prompt TEXT,
  ai_brand_guide_url TEXT
);

CREATE INDEX idx_ventures_squad ON ventures(squad_id);
CREATE INDEX idx_ventures_status ON ventures(status);
CREATE INDEX idx_ventures_phase ON ventures(current_phase);

-- ==========================================
-- VENTURE PHASES (6-Step Process)
-- ==========================================

CREATE TABLE IF NOT EXISTS venture_phases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,

  -- Phase Info
  phase_number INTEGER NOT NULL, -- 1-6
  phase_name VARCHAR(100), -- "Ideation", "Concept", "Branding", etc.

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, blocked

  -- Timeline
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  deadline DATE,

  -- Tasks
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,

  -- AI Modules Unlocked
  ai_modules_enabled TEXT[], -- ["flux1", "tavily-research"]

  -- Notes
  notes TEXT,

  UNIQUE(venture_id, phase_number)
);

CREATE INDEX idx_venture_phases_venture ON venture_phases(venture_id);
CREATE INDEX idx_venture_phases_status ON venture_phases(status);

-- ==========================================
-- SUPPLIERS (AI-First Crowdsourced)
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Basic Info
  name VARCHAR(200) NOT NULL,
  website TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  contact_person VARCHAR(100),

  -- Location
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,

  -- Categories
  categories TEXT[], -- ["fashion", "packaging", "electronics"]

  -- Capabilities
  moq INTEGER, -- Minimum Order Quantity
  lead_time_days INTEGER, -- Production time
  certifications TEXT[], -- ["GOTS", "Fair Trade", "ISO 9001"]

  -- Quality Metrics
  rating DECIMAL(3,2) DEFAULT 0.00, -- 0.00 - 5.00
  total_reviews INTEGER DEFAULT 0,
  orders_completed INTEGER DEFAULT 0,
  response_time_hours INTEGER, -- Average response time

  -- Verification
  verified BOOLEAN DEFAULT false, -- Platform verified
  verified_by_purchase BOOLEAN DEFAULT false, -- At least 1 squad ordered

  -- Discovery
  discovered_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  discovered_via VARCHAR(50), -- "ai-research", "manual-add", "imported"
  ai_research_query TEXT, -- Original Tavily query

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_country ON suppliers(country);
CREATE INDEX idx_suppliers_categories ON suppliers USING GIN(categories);
CREATE INDEX idx_suppliers_rating ON suppliers(rating DESC);
CREATE INDEX idx_suppliers_verified ON suppliers(verified);

-- ==========================================
-- SUPPLIER REVIEWS (Squad Ratings)
-- ==========================================

CREATE TABLE IF NOT EXISTS supplier_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,

  -- Rating
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Review
  title VARCHAR(200),
  review_text TEXT,

  -- Details
  order_value DECIMAL(10,2),
  response_time_rating INTEGER CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),

  -- Verification
  verified_purchase BOOLEAN DEFAULT false,
  order_date DATE,

  -- Helpful votes
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(squad_id, supplier_id) -- 1 review per squad per supplier
);

CREATE INDEX idx_supplier_reviews_supplier ON supplier_reviews(supplier_id);
CREATE INDEX idx_supplier_reviews_rating ON supplier_reviews(rating DESC);

-- ==========================================
-- SAMPLES (Sample Management)
-- ==========================================

CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Sample Details
  product_type VARCHAR(100),
  description TEXT,
  quantity INTEGER,

  -- Cost
  cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (cost + shipping_cost) STORED,

  -- Timeline
  ordered_at TIMESTAMP DEFAULT NOW(),
  expected_delivery DATE,
  received_at TIMESTAMP,

  -- Review
  status VARCHAR(50) DEFAULT 'ordered', -- ordered, shipped, received, reviewed
  approved BOOLEAN,

  -- Feedback
  photos TEXT[], -- URLs to uploaded photos
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Change Requests
  change_requests TEXT[], -- ["Make collar smaller", "Different fabric"]

  -- Next Steps
  reorder BOOLEAN DEFAULT false,
  production_ready BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_samples_squad ON samples(squad_id);
CREATE INDEX idx_samples_supplier ON samples(supplier_id);
CREATE INDEX idx_samples_status ON samples(status);

-- ==========================================
-- SQUAD WALLETS (Virtual Budget Tracking)
-- ==========================================

CREATE TABLE IF NOT EXISTS squad_wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT UNIQUE NOT NULL REFERENCES squads(id) ON DELETE CASCADE,

  -- Balance (Virtual - no real money!)
  balance DECIMAL(12,2) DEFAULT 0.00,

  -- Budget Planning
  budget_total DECIMAL(12,2) DEFAULT 0.00,
  budget_allocated_samples DECIMAL(10,2) DEFAULT 0.00,
  budget_allocated_production DECIMAL(10,2) DEFAULT 0.00,
  budget_allocated_marketing DECIMAL(10,2) DEFAULT 0.00,
  budget_allocated_misc DECIMAL(10,2) DEFAULT 0.00,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_squad_wallets_squad ON squad_wallets(squad_id);

-- ==========================================
-- WALLET TRANSACTIONS (Expense Tracking)
-- ==========================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_id TEXT NOT NULL REFERENCES squad_wallets(id) ON DELETE CASCADE,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,

  -- Transaction
  type VARCHAR(50), -- deposit, expense, refund
  category VARCHAR(50), -- samples, production, marketing, misc
  amount DECIMAL(10,2) NOT NULL,

  -- Description
  description TEXT,

  -- Related Objects
  sample_id TEXT REFERENCES samples(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Metadata
  created_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Receipt/Proof
  receipt_url TEXT
);

CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_squad ON wallet_transactions(squad_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(created_at DESC);

-- ==========================================
-- FORUMS (Public + Private Squad Forums)
-- ==========================================

CREATE TABLE IF NOT EXISTS forums (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Forum Type
  type VARCHAR(50) NOT NULL, -- public, squad
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE,

  -- Info
  name VARCHAR(200),
  description TEXT,

  -- Permissions
  is_private BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(type, squad_id) -- 1 forum per squad
);

CREATE INDEX idx_forums_type ON forums(type);
CREATE INDEX idx_forums_squad ON forums(squad_id);

-- Note: Keep existing forum_posts table but add squad_id reference
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_forum_posts_squad ON forum_posts(squad_id);

-- ==========================================
-- VOTES & POLLS (Democratic Decisions)
-- ==========================================

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  venture_id TEXT REFERENCES ventures(id) ON DELETE CASCADE,

  -- Vote Details
  question TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'yes-no', -- yes-no, multiple-choice, ranking

  -- Options (for multiple-choice)
  options TEXT[], -- ["Option A", "Option B", "Option C"]

  -- Status
  status VARCHAR(50) DEFAULT 'open', -- open, closed

  -- Timeline
  created_at TIMESTAMP DEFAULT NOW(),
  deadline TIMESTAMP,
  closed_at TIMESTAMP,

  -- Governance
  required_quorum INTEGER, -- Min number of votes needed
  winning_threshold DECIMAL(5,2), -- e.g., 60.00 = 60% needed

  -- Results
  winning_option TEXT,

  -- Creator
  created_by TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX idx_votes_squad ON votes(squad_id);
CREATE INDEX idx_votes_status ON votes(status);
CREATE INDEX idx_votes_deadline ON votes(deadline);

-- ==========================================
-- VOTE RESPONSES
-- ==========================================

CREATE TABLE IF NOT EXISTS vote_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vote_id TEXT NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,

  -- Response
  choice TEXT NOT NULL, -- "yes", "no", "Option A", etc.
  ranking INTEGER, -- For ranking votes (1st, 2nd, 3rd)

  -- Metadata
  voted_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(vote_id, user_id) -- 1 vote per user per poll
);

CREATE INDEX idx_vote_responses_vote ON vote_responses(vote_id);
CREATE INDEX idx_vote_responses_user ON vote_responses(user_id);

-- ==========================================
-- AI MATCHMAKING (pgvector)
-- ==========================================

-- User embeddings are stored in User.skills_vector
-- Matchmaking query example:
-- SELECT u.*, u.skills_vector <=> $1 as distance
-- FROM "User" u
-- WHERE u.skills_vector IS NOT NULL
-- ORDER BY distance ASC
-- LIMIT 10;

CREATE INDEX IF NOT EXISTS idx_user_skills_vector ON "User" USING ivfflat (skills_vector vector_cosine_ops);

-- ==========================================
-- AI RESEARCH LOGS (Tavily API Usage)
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_research_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,

  -- Query
  query TEXT NOT NULL,
  search_type VARCHAR(50), -- "supplier", "market-research", "competitor"

  -- Results
  results_count INTEGER,
  results_json JSONB, -- Full Tavily response

  -- Auto-saved Suppliers
  suppliers_created INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_research_logs_squad ON ai_research_logs(squad_id);
CREATE INDEX idx_ai_research_logs_user ON ai_research_logs(user_id);

-- ==========================================
-- AI ASSET GENERATION (Flux.1, etc.)
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_generated_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,

  -- Asset Type
  type VARCHAR(50), -- "logo", "brand-guide", "video", "product-image"

  -- Generation
  ai_model VARCHAR(50), -- "flux.1", "stable-diffusion", "runway"
  prompt TEXT,
  parameters JSONB, -- Model-specific params

  -- Output
  asset_url TEXT,
  thumbnail_url TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, generating, completed, failed

  -- User Feedback
  approved BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Metadata
  created_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_ai_assets_venture ON ai_generated_assets(venture_id);
CREATE INDEX idx_ai_assets_type ON ai_generated_assets(type);
CREATE INDEX idx_ai_assets_status ON ai_generated_assets(status);

-- ==========================================
-- TIME TRACKING (Contribution Measurement)
-- ==========================================

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,

  -- Task Reference
  task_id TEXT, -- Reference to task if applicable

  -- Time
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,

  -- Date
  date DATE NOT NULL,

  -- Type
  activity_type VARCHAR(50), -- "development", "design", "marketing", "admin"

  -- Approval (for dynamic equity)
  approved BOOLEAN DEFAULT false,
  approved_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_time_entries_squad ON time_entries(squad_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(date DESC);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Update ventures.updated_at on change
CREATE OR REPLACE FUNCTION update_venture_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_venture_timestamp
BEFORE UPDATE ON ventures
FOR EACH ROW
EXECUTE FUNCTION update_venture_timestamp();

-- Update squad_wallets.updated_at on transaction
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE squad_wallets
  SET updated_at = NOW()
  WHERE id = NEW.wallet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_on_transaction
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_timestamp();

-- Auto-create Squad Wallet on Squad Creation
CREATE OR REPLACE FUNCTION create_squad_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO squad_wallets (squad_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_squad_wallet
AFTER INSERT ON squads
FOR EACH ROW
EXECUTE FUNCTION create_squad_wallet();

-- Auto-create Squad Forum on Squad Creation
CREATE OR REPLACE FUNCTION create_squad_forum()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO forums (type, squad_id, name, is_private)
  VALUES ('squad', NEW.id, NEW.name || ' Forum', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_squad_forum
AFTER INSERT ON squads
FOR EACH ROW
EXECUTE FUNCTION create_squad_forum();

-- Update Squad current_members count
CREATE OR REPLACE FUNCTION update_squad_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE squads
  SET current_members = (
    SELECT COUNT(*)
    FROM squad_members
    WHERE squad_id = COALESCE(NEW.squad_id, OLD.squad_id)
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.squad_id, OLD.squad_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_squad_member_count
AFTER INSERT OR UPDATE OR DELETE ON squad_members
FOR EACH ROW
EXECUTE FUNCTION update_squad_member_count();

-- ==========================================
-- VIEWS (Useful Queries)
-- ==========================================

-- Active Squads with Member Info
CREATE OR REPLACE VIEW active_squads_with_members AS
SELECT
  s.*,
  u.name as lead_name,
  u.email as lead_email,
  COUNT(sm.id) as member_count,
  ARRAY_AGG(sm.user_id) as member_ids
FROM squads s
LEFT JOIN "User" u ON s.lead_id = u.id
LEFT JOIN squad_members sm ON s.id = sm.squad_id AND sm.status = 'active'
WHERE s.status NOT IN ('archived')
GROUP BY s.id, u.name, u.email;

-- Ventures with Progress
CREATE OR REPLACE VIEW ventures_with_progress AS
SELECT
  v.*,
  s.name as squad_name,
  (SELECT COUNT(*) FROM venture_phases vp WHERE vp.venture_id = v.id AND vp.status = 'completed') as phases_completed,
  (SELECT COUNT(*) FROM venture_phases vp WHERE vp.venture_id = v.id) as total_phases,
  ROUND((SELECT COUNT(*) FROM venture_phases vp WHERE vp.venture_id = v.id AND vp.status = 'completed')::numeric /
        NULLIF((SELECT COUNT(*) FROM venture_phases vp WHERE vp.venture_id = v.id), 0) * 100, 2) as completion_percentage
FROM ventures v
LEFT JOIN squads s ON v.squad_id = s.id;

-- Top Rated Suppliers
CREATE OR REPLACE VIEW top_suppliers AS
SELECT
  s.*,
  COALESCE(AVG(sr.rating), 0) as avg_rating,
  COUNT(sr.id) as review_count
FROM suppliers s
LEFT JOIN supplier_reviews sr ON s.id = sr.supplier_id
GROUP BY s.id
ORDER BY avg_rating DESC, review_count DESC;

-- ==========================================
-- INITIAL DATA (Optional)
-- ==========================================

-- Insert default venture phases for new ventures (will be done in app logic)
-- But here's the reference:
-- Phase 1: Ideation
-- Phase 2: Concept
-- Phase 3: Branding
-- Phase 4: Sourcing
-- Phase 5: Prototyping
-- Phase 6: Launch

-- ==========================================
-- GRANTS (Permissions)
-- ==========================================

-- Grant permissions to authenticated users (adjust as needed)
-- This depends on your RLS setup

-- ==========================================
-- COMMENTS (Documentation)
-- ==========================================

COMMENT ON TABLE squads IS 'Teams of founders building ventures together';
COMMENT ON TABLE ventures IS 'Products/brands being built by squads';
COMMENT ON TABLE suppliers IS 'Manufacturers and service providers (AI-first crowdsourced)';
COMMENT ON TABLE samples IS 'Product samples ordered and reviewed by squads';
COMMENT ON TABLE votes IS 'Democratic decision-making polls for squads';
COMMENT ON TABLE ai_research_logs IS 'Tavily API research queries and results';
COMMENT ON TABLE ai_generated_assets IS 'AI-generated logos, videos, etc. from Flux.1/Runway';
COMMENT ON TABLE time_entries IS 'Time tracking for dynamic equity calculation';

-- ==========================================
-- END OF SCHEMA
-- ==========================================
