<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=Forge+Logo" alt="The Forge Community Logo" width="120" />
  
  # The Forge Community 🛠️

  **The Ultimate Operating System for Founders, Builders, and Squads.**

  [![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![AI Integrated](https://img.shields.io/badge/AI-Integrated-8A2BE2?style=for-the-badge)](https://sdk.vercel.ai/)
</div>

---

## 🌟 Overview

**The Forge Community** is far more than just a social network—it's a comprehensive "Company in a Box" ecosystem. Designed for ambitious founders and creators, it seamlessly integrates community interaction, venture building, automated legal operations, financial management, and advanced AI agents into one cohesive platform.

Whether you are looking for co-founders to form a "Squad," managing your startup's roadmap, signing NDAs, or automating tasks with AI, The Forge provides all the tools needed to go from an idea to a launched venture.

---

## 📸 Platform Previews

<div align="center">
  <table border="0">
    <tr>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 14.58.54.png" alt="Screenshot 1" /></td>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 14.59.04.png" alt="Screenshot 2" /></td>
    </tr>
    <tr>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 14.59.12.png" alt="Screenshot 3" /></td>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 14.59.27.png" alt="Screenshot 4" /></td>
    </tr>
    <tr>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 14.59.38.png" alt="Screenshot 5" /></td>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 14.59.44.png" alt="Screenshot 6" /></td>
    </tr>
    <tr>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 15.00.02.png" alt="Screenshot 7" /></td>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 15.00.05.png" alt="Screenshot 8" /></td>
    </tr>
    <tr>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 15.00.11.png" alt="Screenshot 9" /></td>
      <td width="50%"><img src="public/Screenshots/Bildschirmfoto 2026-05-05 um 15.00.35.png" alt="Screenshot 10" /></td>
    </tr>
  </table>
</div>

---

## 🚀 Core Features & Modules

The platform is structured into several massive, interconnected modules:

### 👥 Squads & Collaboration
- **Team Formation:** Build your "Squad" with defined roles (Lead, Member, Guest).
- **Equity Management:** Track equity shares and ownership percentages natively.
- **Democratic Decisions:** Built-in voting systems for roadmaps, features, and company-wide decisions.

### 🏭 The Venture Builder
- **From Ideation to Launch:** Track your venture through stages (Ideation, In Progress, Launched, Paused).
- **Task & Roadmap Management:** Assign tasks with priorities and track progress via shared roadmaps.
- **Marketplace & Services:** Built-in structures to handle different venture types (E-commerce, SaaS, Agency, etc.).

### ⚖️ Legal Studio (DACH Optimized)
- **Automated Contracts:** Generate and sign NDAs, Service Agreements, and Employment Contracts.
- **Legal Precision:** Templates are specifically tuned for German law (BGB), utilizing standard clause structures (§§ 1-X).
- **Status Tracking:** Monitor documents from Draft to Sent, to Signed, right within the dashboard.

### 🤖 Agentic AI & Human-in-the-Loop
- **Multi-Model Support:** Integration with Google (Gemini) and OpenAI via the Vercel AI SDK.
- **Human-in-the-Loop:** A unique `AiAction` system that requires explicit user confirmation before executing critical tool calls.
- **Energy Economy:** Sophisticated rate-limiting and monetization tracking prompt/completion usage in real-time.

### 💳 Financials, Wallets & Transparency
- **Squad Wallets:** Dedicated wallets for squads to manage budgets (Marketing, Production, Software, etc.).
- **Radical Transparency:** A public "Financial Protocol" module with real-time treasury snapshots, transaction logs, and milestone tracking.
- **Stripe Connect:** Fully integrated Stripe onboarding for platform fees, subscriptions, and payouts.

### 💬 Community, Forum & Gamification
- **Nested Forums:** Highly engaged community with upvoting/downvoting mechanics.
- **Direct Messaging:** Real-time messaging and participant threads.
- **Karma & Achievements:** Users earn "Karma", collect unique achievements, and receive "Founder Numbers."

### 🛡️ Internal Operations (Admin Cockpit)
- **Venture Lifecycle Management:** Overseeing all projects from Ideation to Launch.
- **Founder Pipeline:** A dedicated CRM for managing founder applications and onboarding.
- **Financial Oversight:** Monitoring platform-wide revenue and "Energy" distribution.

---

## 🛠 Technical Architecture

The Forge is built as a robust, highly modular **Next.js App Router** monolith, heavily relying on Server Components and Server Actions for maximum performance and security.

### Tech Stack
- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Actions, PPR)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [GSAP](https://gsap.com/), [Recharts](https://recharts.org/)
- **Backend & Database**: Vercel Postgres, [Prisma ORM](https://prisma.io/) (98+ models, complex relations)
- **Authentication**: [NextAuth.js v5 (Beta)](https://authjs.dev/) with PostgreSQL Adapters
- **AI Integration**: Vercel AI SDK (`@ai-sdk/google`, `@ai-sdk/openai`), Replicate, Gemini Tools
- **Integrations**: Stripe (Connect/Billing), Resend, Notion API, Vercel Blob

### Data Schema Highlights
The Prisma schema (`schema.prisma`) is an enterprise-grade foundation with over **2,800 lines** of code, modeling **98 distinct models** and **47 enums**. It handles complex relationships including:
- **Polymorphic AI Actions:** A state-machine based execution engine for agentic workflows.
- **Squad Hierarchies:** Many-to-many relationships with granular role-based access control (RBAC).
- **Financial Ledger:** Complete audit trail for "Energy" (AI tokens) and wallet transactions.
- **Threaded Forums:** High-performance nested comments with upvote/downvote mechanics.

---

## 💻 Local Development Setup

To get The Forge Community running on your local machine, follow these steps:

### Prerequisites
- **Node.js**: v22.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: A running Postgres instance (local or hosted, e.g., Supabase / Vercel)

### 1. Clone the Repository
```bash
git clone https://github.com/KleinDigitalSolutions/the-forge-community.git
cd the-forge-community
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root of the project. You will need keys for the database, NextAuth, Stripe, Resend, and your chosen AI providers. 
*(Refer to `.env.example` if available, or request access to the staging keys).*
```env
# Example essential variables
DATABASE_URL="postgresql://user:password@localhost:5432/the_forge"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI
OPENAI_API_KEY="..."
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Stripe
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
```

### 4. Database Setup & Migrations
Generate the Prisma client and push the schema to your database:
```bash
npx prisma generate
npx prisma db push
# Or, if using migrations:
# npm run migrate:deploy
```

*(Optional)* Seed the database with initial testing data:
```bash
npm run seed:academy
```

### 5. Run the Development Server
```bash
npm run dev
```
The platform will now be available at `http://localhost:3000`.

---

## 🧪 Testing & Validation
The project includes various test suites and architecture checks:
- **Smoke Tests:** `npm run test:smoke` (Tests core flows like Auth, AI Image/Video generation, Warehouse boundaries).
- **Architecture Validation:** `npm run check:architecture` Ensures structural integrity before building or linting.

---

## 📜 License
*Proprietary / Closed Source* - This repository serves as a portfolio showcase. All rights reserved by Klein Digital Solutions.

<div align="center">
  <i>Built with passion for the next generation of founders.</i>
</div>
