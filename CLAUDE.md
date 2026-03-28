# CLAUDE.md — Nexus League

## Project Overview

Nexus League is a full-stack web platform for managing an amateur competitive League of Legends league. Inspired by Transfermarkt but adapted for esports, it centralizes player valuations, roster management, competition tracking, and real-time statistics via the Riot Games API.

**Codename:** NEXUS LEAGUE
**Type:** Monorepo fullstack (Next.js)
**Status:** In development

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Components) |
| Language | TypeScript 5 (strict mode) |
| API | tRPC 11 (end-to-end type-safe) |
| ORM | Prisma 6 (PostgreSQL) |
| Database | PostgreSQL (Neon hosted) |
| Cache | Redis (Upstash) |
| Auth | Auth.js v5 (Discord OAuth + Credentials) |
| Styling | Tailwind CSS 4 (dark mode, glassmorphism) |
| Animations | GSAP 3 + Framer Motion 11 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Media | Cloudinary |
| Hosting | Vercel |
| Monorepo | Turborepo |

---

## Project Structure

```
nexus-league/
├── apps/
│   └── web/                          # Next.js application
│       ├── app/                      # App Router
│       │   ├── (public)/             # Public pages (no auth required)
│       │   │   ├── page.tsx          # Homepage
│       │   │   ├── transfermarket/   # Player market listings + player profiles
│       │   │   └── league/           # Standings, results, match details, stats
│       │   ├── (authenticated)/      # Protected pages (auth required)
│       │   │   └── team/             # Team management + budget calculator
│       │   ├── (admin)/              # Admin-only pages
│       │   │   └── admin/            # Back-office (CRUD players, teams, matches, league)
│       │   ├── api/                  # API routes
│       │   │   ├── trpc/[trpc]/      # tRPC handler
│       │   │   └── auth/[...nextauth]/ # Auth.js handler
│       │   ├── layout.tsx            # Root layout (dark mode, fonts, providers)
│       │   └── globals.css           # Global styles, CSS variables, glassmorphism utilities
│       ├── components/
│       │   ├── ui/                   # Base design system components (Button, Card, Modal, Input, Badge...)
│       │   ├── features/             # Feature-specific components
│       │   │   ├── transfermarket/   # PlayerCard, PlayerProfile, MarketFilters, TierBadge...
│       │   │   ├── league/           # StandingsTable, MatchCard, Scoreboard, GoldChart...
│       │   │   ├── team/             # BudgetCalculator, RosterManager, TransferSimulator...
│       │   │   ├── admin/            # AdminForms, DataTables, AuditLog...
│       │   │   └── home/             # Hero, Ticker, PlayerSpotlight, QuickStandings...
│       │   ├── layouts/              # Navbar, Sidebar, Footer, AdminLayout
│       │   └── animations/           # GSAP wrappers, particle effects, scroll triggers
│       ├── lib/
│       │   ├── trpc/                 # tRPC client + server config
│       │   ├── prisma.ts             # Prisma client singleton
│       │   ├── auth.ts               # Auth.js config (providers, callbacks, session)
│       │   ├── riot/                 # Riot API client, rate limiter, cache layer
│       │   │   ├── client.ts         # Axios instance with interceptors
│       │   │   ├── rate-limiter.ts   # Bottleneck config for dev key limits
│       │   │   ├── cache.ts          # Redis cache get/set with TTL per data type
│       │   │   ├── summoner.ts       # Summoner/Account endpoints
│       │   │   ├── match.ts          # Match V5 endpoints
│       │   │   └── league.ts         # League V4 endpoints
│       │   ├── utils/                # Formatters, constants, helpers
│       │   └── validators/           # Zod schemas (shared with tRPC routers)
│       ├── server/
│       │   ├── routers/              # tRPC routers
│       │   │   ├── player.ts         # Player CRUD + market queries
│       │   │   ├── team.ts           # Team CRUD + roster management
│       │   │   ├── match.ts          # Match/game CRUD + Riot data fetch
│       │   │   ├── league.ts         # Standings, seasons, scheduling
│       │   │   ├── contract.ts       # Contract management
│       │   │   ├── admin.ts          # Admin-only procedures
│       │   │   └── stats.ts          # Stats aggregation + Riot integration
│       │   ├── context.ts            # tRPC context (session, prisma, role)
│       │   └── trpc.ts               # tRPC init, middleware (auth, admin guard)
│       ├── hooks/                    # Custom React hooks
│       ├── styles/                   # Additional CSS (animations, keyframes)
│       └── public/                   # Static assets (logos, og-images)
├── packages/
│   ├── db/                           # Prisma package
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   ├── migrations/           # Migration history
│   │   │   └── seed.ts               # Seed script (demo data)
│   │   └── index.ts                  # Re-exports Prisma client + types
│   ├── config/                       # Shared configs
│   │   ├── eslint/                   # ESLint presets
│   │   ├── typescript/               # tsconfig presets
│   │   └── tailwind/                 # Tailwind preset (colors, fonts, glassmorphism)
│   └── types/                        # Shared TypeScript types
│       ├── player.ts
│       ├── team.ts
│       ├── match.ts
│       ├── riot.ts                   # Riot API response types
│       └── index.ts
├── turbo.json
├── package.json
├── .env.example
├── .env.local                        # Local env vars (git-ignored)
└── CLAUDE.md                         # This file
```

---

## Architecture Decisions

### Routing & Rendering
- **Public pages** (homepage, transfermarket, league): Server-Side Rendered (SSR) with `fetch` + revalidation for SEO and performance.
- **Authenticated pages** (team management): Client-Side Rendered (CSR) with tRPC React Query hooks.
- **Admin pages**: CSR, protected by middleware + tRPC guards.
- Use Next.js **route groups** `(public)`, `(authenticated)`, `(admin)` to organize layouts and middleware.

### API Pattern
- All data access goes through **tRPC routers** — never call Prisma directly from components.
- tRPC procedures use **Zod** schemas for input validation.
- Auth and role checks happen in **tRPC middleware**, not in individual procedures.
- Riot API calls are wrapped in the `lib/riot/` module with automatic rate limiting and Redis caching.

### State Management
- **Server state**: tRPC + React Query (automatic caching, refetching, optimistic updates).
- **Client state**: React `useState`/`useReducer` for local UI state (filters, modals, budget calculator).
- No global state library needed — tRPC Query handles it.

---

## Database Models (Prisma)

Key models and their relationships:

```
User (1) ——→ (1) Team (as captain)
Team (1) ——→ (N) Player
Player (1) ——→ (N) Contract
Player (1) ——→ (N) MarketValueHistory
Player (1) ——→ (N) PlayerMatchStats
Team (1) ——→ (N) Contract
Season (1) ——→ (N) Match
Match (1) ——→ (N) MatchGame
MatchGame (1) ——→ (N) PlayerMatchStats
User (1) ——→ (N) AuditLog
```

### Enums
```prisma
enum UserRole    { USER  TEAM_CAPTAIN  ADMIN }
enum PlayerRole  { TOP  JUNGLE  MID  ADC  SUPPORT }
enum ContractStatus { ACTIVE  EXPIRED  TERMINATED  LOAN }
enum MatchFormat { BO1  BO3  BO5 }
enum MatchResult { WIN  LOSS }
```

### Important Fields
- `Player.puuid` — fetched automatically from Riot API using `gameName` + `tagLine`. Used for all match/stats lookups.
- `Player.marketValue` — integer, set manually by admins. Every change creates a `MarketValueHistory` entry.
- `MatchGame.riotMatchId` — the Riot match ID (e.g., `EUW1_1234567890`), used to fetch detailed stats.
- `PlayerMatchStats` — stores denormalized stats per player per game (kills, deaths, assists, cs, gold, champion, damage, vision).

---

## Riot Games API Integration

### Critical Constraints (Dev Key)
- **20 requests/second** and **100 requests/2 minutes** — enforced via `bottleneck.js` rate limiter.
- **Key expires every 24h** — must be regenerated manually at https://developer.riotgames.com.
- Store key in `RIOT_API_KEY` env var. The app should gracefully degrade when the key is expired (403 response).

### Endpoints Used
| Endpoint | Purpose | Cache TTL |
|----------|---------|-----------|
| `/riot/account/v1/accounts/by-riot-id/{name}/{tag}` | Resolve PUUID | 1 hour |
| `/lol/match/v5/matches/by-puuid/{puuid}/ids` | List recent matches | 15 min |
| `/lol/match/v5/matches/{matchId}` | Match details + participants | 24h (immutable) |
| `/lol/match/v5/matches/{matchId}/timeline` | Match timeline events | 24h (immutable) |
| `/lol/league/v4/entries/by-summoner/{id}` | Ranked info | 1 hour |

### Cache Strategy
- Redis (Upstash) as cache layer between the app and Riot API.
- Cache keys follow the pattern: `riot:{endpoint}:{identifier}` (e.g., `riot:match:EUW1_123`).
- Match detail data is **immutable** — cache for 24h+.
- A Vercel Cron job runs every 30 minutes to pre-fetch data for registered players.
- On 429/403/5xx, fall back to cached data and display a "data updated X min ago" indicator.

### Rate Limiter Config (bottleneck.js)
```typescript
const limiter = new Bottleneck({
  reservoir: 20,            // 20 requests
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: 1000, // per second
  maxConcurrent: 5,
});
```

---

## Authentication & Authorization

### Providers
1. **Discord OAuth2** (primary) — most LoL players use Discord.
2. **Credentials** (email/password) — fallback.

### Role-Based Access Control (RBAC)
```typescript
// tRPC middleware pattern
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'ADMIN') throw new TRPCError({ code: 'FORBIDDEN' });
  return next();
});

const captainProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['ADMIN', 'TEAM_CAPTAIN'].includes(ctx.session.user.role))
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next();
});
```

### Route Protection
- Middleware in `middleware.ts` checks auth for `/team/*` and `/admin/*` routes.
- tRPC procedures handle fine-grained authorization (e.g., captain can only edit their own team).

---

## Design System

### Branding: Dark + Violet + Premium + Glassmorphism

#### Color Tokens (CSS Variables)
```css
:root {
  --bg-primary: #0A0A0F;
  --bg-secondary: #12121A;
  --bg-elevated: #1A1A2E;
  --accent-primary: #7C3AED;
  --accent-glow: #A855F7;
  --accent-gold: #F59E0B;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --border-subtle: rgba(124, 58, 237, 0.15);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
}
```

#### Typography
- **Display/Headings**: Clash Display or Orbitron (bold, competitive feel)
- **Body/UI**: Satoshi or General Sans (clean, modern readability)
- **Values/Numbers**: Space Mono or JetBrains Mono (monospaced for financial-style values)

#### Glassmorphism Pattern
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

#### Player Tier Visual System
| Tier | Criteria | Visual Treatment |
|------|----------|-----------------|
| S (Elite) | Top 5% value | Animated gold border + particles + glow |
| A (Premium) | Top 15% | Gradient violet/gold border |
| B (Rising Star) | Top 30% | Solid violet border |
| C (Standard) | Rest | Default glassmorphism |

---

## Coding Conventions

### General
- **Language**: TypeScript strict mode everywhere. No `any` — use `unknown` + type guards.
- **Naming**: camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE for constants.
- **Files**: kebab-case for file names (`player-card.tsx`, `budget-calculator.tsx`).
- **Exports**: Named exports for components and utilities. Default exports only for Next.js pages.

### React Components
- Use **functional components** with hooks only.
- Co-locate component, types, and tests: `PlayerCard/index.tsx`, `PlayerCard/types.ts`, `PlayerCard/PlayerCard.test.tsx`.
- Props interfaces: `interface PlayerCardProps { ... }` — not inline types.
- Use `'use client'` directive only when the component needs client-side features (hooks, event handlers, browser APIs). Default to Server Components.

### tRPC Routers
- One router file per domain: `player.ts`, `team.ts`, `match.ts`, etc.
- Input validation with Zod schemas defined in `lib/validators/`.
- Always return typed outputs — never raw Prisma types with relations you don't need.
- Use `.query()` for reads, `.mutation()` for writes.
- Wrap admin operations in `adminProcedure`, captain operations in `captainProcedure`.

### Prisma
- Always use `select` or `include` to avoid over-fetching.
- Wrap related writes in `prisma.$transaction()`.
- Always create `AuditLog` entries for admin mutations.
- Never expose Prisma client to client-side code.

### Animations
- **GSAP**: Use for page-level animations, scroll-triggered reveals, number counters, SVG morphing. Register plugins (`ScrollTrigger`) in a client-side wrapper component. Always clean up with `gsap.context()` in `useEffect` return.
- **Framer Motion**: Use for React-integrated animations — layout transitions, `AnimatePresence` for mount/unmount, hover/tap gestures, stagger children.
- **CSS**: Use for simple transitions (hover, focus), skeleton shimmer, and infinite animations (ticker scroll).
- Always respect `prefers-reduced-motion`. Disable canvas particles on mobile.

### Error Handling
- tRPC errors: use `TRPCError` with appropriate codes (`NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`).
- Riot API errors: catch in `lib/riot/`, return cached data on failure, surface error state to UI.
- Client-side: use React Error Boundaries for component-level errors. Use tRPC's `onError` for global error handling.
- Never expose stack traces or internal details in production error responses.

---

## Key Commands

```bash
# Development
pnpm dev                    # Start dev server (apps/web)
pnpm db:push                # Push schema to DB (no migration)
pnpm db:migrate             # Create + apply migration
pnpm db:seed                # Seed database with demo data
pnpm db:studio              # Open Prisma Studio

# Quality
pnpm lint                   # ESLint across monorepo
pnpm typecheck              # TypeScript strict check
pnpm test                   # Vitest unit tests
pnpm test:e2e               # Playwright E2E tests

# Build & Deploy
pnpm build                  # Production build
pnpm turbo build            # Turborepo optimized build
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""

# Riot Games
RIOT_API_KEY=""              # Dev key, regenerate every 24h

# Redis
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Media
CLOUDINARY_URL=""
```

---

## Common Patterns

### Fetching Riot Data for a Player
```typescript
// In a tRPC router
const stats = await riotClient.getMatchHistory(player.puuid, { count: 10 });
// riotClient handles: rate limiting → cache check → API call → cache store → return
```

### Budget Calculator Logic
```typescript
// All calculations happen client-side for instant feedback
const totalSalaries = roster.reduce((sum, p) => sum + p.salary, 0);
const budgetUsed = (totalSalaries / salaryBudget) * 100;
// budgetUsed < 70 → green, 70-90 → orange, > 90 → red
```

### Admin Audit Trail
```typescript
// Every admin mutation must log
await prisma.$transaction([
  prisma.player.update({ where: { id }, data }),
  prisma.auditLog.create({
    data: { userId: ctx.session.user.id, action: 'UPDATE', entity: 'Player', entityId: id, details: { before, after } }
  }),
]);
```

---

## Important Notes

- The Riot API dev key **expires every 24 hours**. The app must handle 403 errors gracefully and notify admins. Consider applying for a production key once the project is stable.
- Player `marketValue` is **not** calculated automatically — it is set manually by admins via the back-office. The system only tracks history of changes.
- The budget calculator is a **client-side simulation tool** — it does not enforce any rules. Team captains can freely adjust numbers to plan.
- All monetary values (market value, salary, transfer fee, budget) are **integers representing a virtual currency unit** — not real money.
- Match data from Riot is **stored locally** in `PlayerMatchStats` after fetch. This avoids repeated API calls and allows stats to persist even if the Riot API is unavailable.
- The glassmorphism effect requires `backdrop-filter` support — provide a solid fallback background for older browsers.