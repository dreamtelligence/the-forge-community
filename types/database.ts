// ==========================================
// THE FORGE - Database Types (V2.0)
// Auto-generated from DATABASE-SCHEMA-V2.sql
// ==========================================

export type SquadStatus = 'forming' | 'planning' | 'building' | 'launched' | 'archived';
export type SquadType = 'venture' | 'project' | 'experiment';
export type MemberRole = 'lead' | 'co-founder' | 'contributor' | 'member';
export type MemberStatus = 'active' | 'invited' | 'left' | 'removed';
export type EquityType = 'equal' | 'dynamic' | 'custom';

export interface Squad {
  id: string;
  name: string;
  mission?: string;
  status: SquadStatus;
  lead_id?: string;
  min_members: number;
  max_members: number;
  current_members: number;
  created_at: Date;
  launched_at?: Date;
  archived_at?: Date;
  squad_type: SquadType;
  is_public: boolean;
  is_accepting_members: boolean;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: MemberRole;
  equity_share: number;
  equity_type: EquityType;
  hours_contributed: number;
  tasks_completed: number;
  votes_cast: number;
  capital_contributed: number;
  status: MemberStatus;
  joined_at: Date;
  left_at?: Date;
  invited_by?: string;
  invitation_accepted_at?: Date;
}

export type VentureStatus = 'concept' | 'development' | 'launched' | 'revenue' | 'archived';

export interface Venture {
  id: string;
  squad_id: string;
  name?: string;
  tagline?: string;
  category?: string;
  status: VentureStatus;
  current_phase: number;
  phase_completed: number;
  brand_name?: string;
  domain?: string;
  logo_url?: string;
  brand_colors?: string[];
  brand_fonts?: string[];
  target_audience?: string;
  usp?: string;
  selected_supplier_id?: string;
  moq?: number;
  unit_cost?: number;
  first_order_date?: Date;
  first_order_quantity?: number;
  launch_url?: string;
  launch_date?: Date;
  first_sale_date?: Date;
  total_revenue: number;
  total_orders: number;
  created_at: Date;
  updated_at: Date;
  launched_at?: Date;
  ai_logo_prompt?: string;
  ai_brand_guide_url?: string;
}

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface VenturePhase {
  id: string;
  venture_id: string;
  phase_number: number;
  phase_name?: string;
  status: PhaseStatus;
  started_at?: Date;
  completed_at?: Date;
  deadline?: Date;
  total_tasks: number;
  completed_tasks: number;
  ai_modules_enabled?: string[];
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  website?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  country?: string;
  city?: string;
  address?: string;
  categories?: string[];
  moq?: number;
  lead_time_days?: number;
  certifications?: string[];
  rating: number;
  total_reviews: number;
  orders_completed: number;
  response_time_hours?: number;
  verified: boolean;
  verified_by_purchase: boolean;
  discovered_by?: string;
  discovered_via?: string;
  ai_research_query?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SupplierReview {
  id: string;
  supplier_id: string;
  squad_id: string;
  reviewer_id: string;
  rating: number;
  title?: string;
  review_text?: string;
  order_value?: number;
  response_time_rating?: number;
  quality_rating?: number;
  communication_rating?: number;
  verified_purchase: boolean;
  order_date?: Date;
  helpful_count: number;
  created_at: Date;
}

export type SampleStatus = 'ordered' | 'shipped' | 'received' | 'reviewed';

export interface Sample {
  id: string;
  squad_id: string;
  supplier_id?: string;
  product_type?: string;
  description?: string;
  quantity?: number;
  cost?: number;
  shipping_cost?: number;
  total_cost?: number;
  ordered_at: Date;
  expected_delivery?: Date;
  received_at?: Date;
  status: SampleStatus;
  approved?: boolean;
  photos?: string[];
  feedback?: string;
  rating?: number;
  change_requests?: string[];
  reorder: boolean;
  production_ready: boolean;
  created_at: Date;
}

export interface SquadWallet {
  id: string;
  squad_id: string;
  balance: number;
  budget_total: number;
  budget_allocated_samples: number;
  budget_allocated_production: number;
  budget_allocated_marketing: number;
  budget_allocated_misc: number;
  created_at: Date;
  updated_at: Date;
}

export type TransactionType = 'deposit' | 'expense' | 'refund';
export type TransactionCategory = 'samples' | 'production' | 'marketing' | 'misc';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  squad_id: string;
  type: TransactionType;
  category?: TransactionCategory;
  amount: number;
  description?: string;
  sample_id?: string;
  supplier_id?: string;
  created_by?: string;
  created_at: Date;
  receipt_url?: string;
}

export type ForumType = 'public' | 'squad';

export interface Forum {
  id: string;
  type: ForumType;
  squad_id?: string;
  name?: string;
  description?: string;
  is_private: boolean;
  created_at: Date;
}

export type VoteType = 'yes-no' | 'multiple-choice' | 'ranking';
export type VoteStatus = 'open' | 'closed';

export interface Vote {
  id: string;
  squad_id: string;
  venture_id?: string;
  question: string;
  description?: string;
  type: VoteType;
  options?: string[];
  status: VoteStatus;
  created_at: Date;
  deadline?: Date;
  closed_at?: Date;
  required_quorum?: number;
  winning_threshold?: number;
  winning_option?: string;
  created_by?: string;
}

export interface VoteResponse {
  id: string;
  vote_id: string;
  user_id: string;
  choice: string;
  ranking?: number;
  voted_at: Date;
}

export interface AIResearchLog {
  id: string;
  squad_id?: string;
  user_id: string;
  query: string;
  search_type?: string;
  results_count?: number;
  results_json?: any;
  suppliers_created: number;
  created_at: Date;
}

export type AIAssetType = 'logo' | 'brand-guide' | 'video' | 'product-image';
export type AIAssetStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface AIGeneratedAsset {
  id: string;
  venture_id: string;
  squad_id: string;
  type: AIAssetType;
  ai_model?: string;
  prompt?: string;
  parameters?: any;
  asset_url?: string;
  thumbnail_url?: string;
  status: AIAssetStatus;
  approved?: boolean;
  rating?: number;
  created_by?: string;
  created_at: Date;
  completed_at?: Date;
}

export type ActivityType = 'development' | 'design' | 'marketing' | 'admin';

export interface TimeEntry {
  id: string;
  squad_id: string;
  user_id: string;
  task_id?: string;
  hours: number;
  description?: string;
  date: Date;
  activity_type?: ActivityType;
  approved: boolean;
  approved_by?: string;
  created_at: Date;
}

// ==========================================
// Extended User Type (with pgvector)
// ==========================================

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  skills?: string[];
  skills_vector?: number[]; // pgvector embedding
  interests?: string[];
  time_commitment?: number;
  budget_capacity?: number;
  experience_level?: string;
  preferred_roles?: string[];
  timezone?: string;
  languages?: string[];
  bio?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_zip?: string;
  address_country?: string;
  instagram?: string;
  linkedin?: string;
  goal?: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface SquadWithMembers extends Squad {
  lead_name?: string;
  lead_email?: string;
  member_count: number;
  member_ids?: string[];
  members?: SquadMember[];
}

export interface VentureWithProgress extends Venture {
  squad_name?: string;
  phases_completed: number;
  total_phases: number;
  completion_percentage: number;
}

export interface SupplierWithRating extends Supplier {
  avg_rating: number;
  review_count: number;
}

// ==========================================
// Request/Response Payloads
// ==========================================

export interface CreateSquadRequest {
  name: string;
  mission?: string;
  squad_type?: SquadType;
  is_public?: boolean;
  max_members?: number;
}

export interface CreateVentureRequest {
  squad_id: string;
  name?: string;
  category?: string;
  tagline?: string;
}

export interface CreateVoteRequest {
  squad_id: string;
  venture_id?: string;
  question: string;
  description?: string;
  type: VoteType;
  options?: string[];
  deadline?: Date;
  required_quorum?: number;
  winning_threshold?: number;
}

export interface SubmitVoteRequest {
  vote_id: string;
  choice: string;
  ranking?: number;
}

export interface AddSupplierRequest {
  name: string;
  website?: string;
  email?: string;
  country?: string;
  categories?: string[];
  moq?: number;
  lead_time_days?: number;
  discovered_via?: string;
  ai_research_query?: string;
}

export interface OrderSampleRequest {
  squad_id: string;
  supplier_id?: string;
  product_type?: string;
  description?: string;
  quantity?: number;
  cost?: number;
  shipping_cost?: number;
  expected_delivery?: Date;
}

export interface ReviewSampleRequest {
  sample_id: string;
  rating: number;
  feedback?: string;
  photos?: string[];
  approved: boolean;
  change_requests?: string[];
  production_ready: boolean;
}

export interface AddWalletTransactionRequest {
  squad_id: string;
  type: TransactionType;
  category?: TransactionCategory;
  amount: number;
  description?: string;
  receipt_url?: string;
}

export interface GenerateAIAssetRequest {
  venture_id: string;
  squad_id: string;
  type: AIAssetType;
  prompt: string;
  ai_model?: string;
  parameters?: any;
}

export interface LogTimeEntryRequest {
  squad_id: string;
  task_id?: string;
  hours: number;
  description?: string;
  date: Date;
  activity_type?: ActivityType;
}

// ==========================================
// AI Matchmaking Types
// ==========================================

export interface MatchmakingRequest {
  user_id: string;
  limit?: number;
  min_score?: number;
}

export interface MatchmakingResult {
  user_id: string;
  name?: string;
  email?: string;
  skills?: string[];
  match_score: number; // 0-1
  similarity_distance: number;
  compatible_roles?: string[];
}

// ==========================================
// Phase Definitions (Constants)
// ==========================================

export const VENTURE_PHASES = [
  {
    number: 1,
    name: 'Ideation',
    description: 'Squad formation and initial concept',
    ai_modules: []
  },
  {
    number: 2,
    name: 'Concept',
    description: 'Product category, target audience, USP',
    ai_modules: []
  },
  {
    number: 3,
    name: 'Branding',
    description: 'Name, logo, visual identity',
    ai_modules: ['flux1', 'brand-guide']
  },
  {
    number: 4,
    name: 'Sourcing',
    description: 'Find manufacturers and suppliers',
    ai_modules: ['tavily-research', 'supplier-db']
  },
  {
    number: 5,
    name: 'Prototyping',
    description: 'Order samples, iterate on product',
    ai_modules: []
  },
  {
    number: 6,
    name: 'Launch',
    description: 'Go-to-market preparation',
    ai_modules: ['video-renderer', 'social-media']
  }
] as const;

export type VenturePhaseNumber = 1 | 2 | 3 | 4 | 5 | 6;
