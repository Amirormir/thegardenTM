# Nexus League

Plateforme fullstack pour une ligue amateur League of Legends, inspiree de Transfermarkt et adaptee a l'esport. Centralise les valorisations de joueurs, la gestion des rosters, le suivi de competition et les statistiques en temps reel via l'API Riot Games.

**Stack:** Next.js 15 (App Router) | TypeScript | tRPC 11 | Prisma 6 | PostgreSQL (Neon) | Auth.js v5 | Tailwind CSS 4 | GSAP + Framer Motion | Turborepo

---

## Features

### Pages publiques
- **Homepage** — Hero anime, showcase des top 3 joueurs par valeur marchande, classement rapide
- **Transfermarket** — Catalogue de joueurs avec filtres (role, equipe, valeur), badges de tier (S/A/B/C), comparaison multi-joueurs
- **Fiche joueur** — Profil detaille avec stats, historique de valeur, teinte aux couleurs de l'equipe
- **League** — Classement general, calendrier des matchs, resultats detailles, historique
- **Stats** — Statistiques agregees de la ligue (top scorers, KDA, CS, etc.)
- **Pages equipe** — Roster, valeur marchande totale, classement par valeur, teinte aux couleurs de l'equipe
- **Inscription** — Page de registration avec credentials

### Pages authentifiees (Team Captain)
- **Dashboard equipe** — Vue d'ensemble du roster, budget, contrats actifs
- **Gestion des contrats** — Renouvellement, resiliation, creation de contrats
- **Budget calculator** — Simulation client-side du budget salarial
- **Offres de transfert** — Envoi, reception, negociation (propose/counter/accept/reject)
- **Profil utilisateur** — Edition du profil, notifications

### Back-office admin
- **Gestion joueurs** — CRUD complet, valorisation marchande, photos
- **Gestion equipes** — CRUD equipes, assignation capitaine, budget
- **Gestion matchs** — Creation/edition de matchs et games, import de stats Riot
- **Gestion contrats** — Vue et administration de tous les contrats
- **Gestion utilisateurs** — Roles, bannissement, vue d'ensemble
- **Gestion ligue** — Saisons, configuration

### Systeme
- **Auth** — Discord OAuth2 + Credentials, RBAC (User / Team Captain / Admin)
- **Command palette** — Navigation rapide (Ctrl+K)
- **Sidebar + Navbar** — Navigation responsive avec indicateurs de role
- **Notifications** — Systeme de notifications en temps reel
- **API type-safe** — tRPC end-to-end avec validation Zod
- **Tests** — 118+ tests unitaires (validators + tRPC routers)

---

## Setup

1. Installer les dependances
   ```bash
   pnpm install
   ```
2. Copier l'environnement
   ```bash
   cp .env.example .env.local
   ```
3. Generer le client Prisma
   ```bash
   pnpm db:generate
   ```
4. Pousser le schema sur votre PostgreSQL
   ```bash
   pnpm db:push
   ```
5. Injecter les donnees de demo
   ```bash
   pnpm db:seed
   ```
6. Lancer le monorepo
   ```bash
   pnpm dev
   ```

Par defaut, l'application web demarre sur le port `3004`.

---

## Commandes

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance le monorepo via Turborepo |
| `pnpm build` | Build production du workspace |
| `pnpm lint` | ESLint sur les packages concernes |
| `pnpm typecheck` | TypeScript strict partout |
| `pnpm db:generate` | Genere Prisma Client |
| `pnpm db:push` | Pousse le schema Prisma sans migration |
| `pnpm db:migrate` | Cree et applique une migration Prisma |
| `pnpm db:seed` | Seed realiste de demonstration |
| `pnpm db:studio` | Ouvre Prisma Studio |

---

## Structure

```text
nexus-league/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (public)/            # Homepage, transfermarket, league, stats, register
│       │   ├── (authenticated)/     # Team dashboard, contracts, budget, profile, notifications
│       │   ├── (admin)/admin/       # Back-office (players, teams, matches, contracts, users, league)
│       │   └── api/                 # tRPC + Auth.js handlers
│       ├── components/
│       │   ├── animations/          # GSAP wrappers, scroll triggers
│       │   ├── features/            # Composants metier (admin, home, league, team, transfermarket)
│       │   └── ui/                  # Design system (Button, Card, Modal, Badge, CommandPalette...)
│       ├── hooks/                   # Custom React hooks
│       ├── lib/
│       │   ├── riot/                # Client Riot API, rate limiter, cache Redis
│       │   ├── trpc/                # Config client + serveur tRPC
│       │   ├── utils/               # Helpers, mock data, DDragon
│       │   └── validators/          # Schemas Zod (partages avec les routers)
│       ├── server/
│       │   └── routers/             # tRPC routers (player, team, match, contract, transfer, stats, user)
│       ├── styles/                  # CSS additionnel, animations
│       └── public/                  # Assets statiques
├── packages/
│   ├── config/                      # ESLint, TypeScript, Tailwind presets
│   ├── db/                          # Prisma schema, migrations, seed
│   └── types/                       # Types TypeScript partages
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Variables d'environnement

```env
# Database
DATABASE_URL=""
DIRECT_URL=""

# Auth
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3004"
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""

# Riot Games
RIOT_API_KEY=""              # Dev key, expire toutes les 24h

# Redis
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Media
CLOUDINARY_URL=""
```

---

## Design

- **Theme** : Dark + Violet + Premium, glassmorphism
- **Typographie** : Clash Display (headings), Satoshi (body), JetBrains Mono (valeurs)
- **Tiers visuels** : S (gold anime) / A (violet gradient) / B (violet solid) / C (default glass)
- **Couleurs equipe** : Les pages joueur et equipe adoptent les couleurs de l'equipe via teinte dynamique

---

## Notes

- La cle API Riot (dev) **expire toutes les 24h** — l'app degrade gracieusement sur 403.
- Les `marketValue` sont definis manuellement par les admins, pas calcules automatiquement.
- Le budget calculator est une **simulation client-side** — il n'impose aucune regle.
- Toutes les valeurs monetaires sont en **monnaie virtuelle** (entiers).
- Les stats de match Riot sont stockees localement dans `PlayerMatchStats` apres fetch.
- Le seed Credentials utilise le mot de passe commun `NexusLeague!2026`.
