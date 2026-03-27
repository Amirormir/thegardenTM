# Nexus League

Monorepo fullstack pour une ligue amateur League of Legends, construit avec Next.js 15, tRPC 11, Auth.js v5, Prisma 6, pnpm et Turborepo.

## Setup

1. Installer les dépendances
   `pnpm install`
2. Copier l’environnement
   `Copy-Item .env.example .env.local`
3. Générer le client Prisma
   `pnpm db:generate`
4. Pousser le schéma sur votre PostgreSQL
   `pnpm db:push`
5. Injecter les données de démo
   `pnpm db:seed`
6. Lancer le monorepo
   `pnpm dev`

Par défaut, l'application web démarre sur le port `3004`.

## Commandes

- `pnpm dev` lance le monorepo via Turborepo
- `pnpm build` lance le build production du workspace
- `pnpm lint` exécute ESLint sur les packages concernés
- `pnpm typecheck` exécute TypeScript strict partout
- `pnpm db:generate` génère Prisma Client
- `pnpm db:push` pousse le schéma Prisma sans migration
- `pnpm db:migrate` crée et applique une migration Prisma
- `pnpm db:seed` exécute le seed réaliste de démonstration
- `pnpm db:studio` ouvre Prisma Studio

## Structure

```text
nexus-league/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (public)/
│       │   ├── (authenticated)/
│       │   ├── (admin)/
│       │   └── api/
│       ├── components/
│       │   ├── animations/
│       │   ├── features/
│       │   ├── layouts/
│       │   └── ui/
│       ├── hooks/
│       ├── lib/
│       │   ├── riot/
│       │   ├── trpc/
│       │   ├── utils/
│       │   └── validators/
│       ├── server/
│       │   ├── routers/
│       │   └── utils/
│       ├── styles/
│       └── public/
├── packages/
│   ├── config/
│   ├── db/
│   └── types/
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

## Variables d’environnement

```env
DATABASE_URL=""
DIRECT_URL=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3004"
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
RIOT_API_KEY=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
CLOUDINARY_URL=""
```

## Hypothèses documentées

- Auth.js v5 est implémenté via `next-auth@5.0.0-beta.30`, car au 27 mars 2026 la branche v5 exposée par npm est encore portée par le dist-tag `beta`.
- Les modèles Prisma `Account`, `Session` et `VerificationToken` ont été ajoutés, car ils sont requis par l’adapter Prisma d’Auth.js même s’ils ne sont pas listés explicitement dans la spec métier.
- Le routage Riot est fixé à `europe` pour les endpoints régionaux et `euw1` pour les endpoints plateforme, en cohérence avec l’exemple `EUW1_*` de la spec.
- Un champ `Team.budget` a été ajouté pour supporter le dashboard d’équipe et le calculateur budget sans inventer de logique métier supplémentaire.
- Les joueurs peuvent être `Free Agent` via `teamId = null` au lieu d’une pseudo-team système, ce qui limite les effets de bord sur les statistiques et le transfermarket.
- Les rôles multiples sont modélisés avec un rôle principal `Player.role` et des rôles secondaires `Player.secondaryRoles`, afin de rester compatibles avec le tri et les badges publics déjà en place.
- La photo de profil admin est gérée comme une URL d’image (`Player.imageUrl`) plutôt qu’un upload direct, pour ne pas bloquer le back-office tant que Cloudinary n’est pas branché.
- `metadataBase` est initialisé à `http://localhost:3004` par défaut pour éviter les warnings Open Graph en local.
- Le seed Credentials utilise des comptes de démonstration avec mot de passe commun `NexusLeague!2026`.

## Vérification locale

- `pnpm typecheck` et `pnpm lint` doivent passer sans base de données active.
- `pnpm build` nécessite des variables d’environnement définies, mais pas de connexion PostgreSQL active pour la génération Prisma et le build Next.
- `pnpm db:push` et `pnpm db:seed` exigent en revanche une vraie base PostgreSQL accessible.
