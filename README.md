# Garden

Plateforme League of Legends avec:

- site public et back-office Next.js
- base Prisma/PostgreSQL pour la ligue classique
- MongoDB pour les customs
- import `.rofl` via un microservice Python

Le front web tourne sur `http://localhost:3004`.

## Prerequis

- `git`
- `Node.js >= 22.13`
- `pnpm >= 10`
- acces a la base PostgreSQL utilisee par le projet
- acces a la base Mongo utilisee par les customs
- optionnel: Python `3.11+` pour l'import replay

## Recuperer Le Projet

```bash
git clone https://github.com/Amirormir/thegardenTM.git
cd thegardenTM
pnpm install
```

## Variables D'Environnement

Pour repartir vite sur un autre PC, le plus simple est de recopier les fichiers deja configures depuis ton PC actuel:

- `thegardenTM/.env.local`
- `thegardenTM/apps/web/.env.local`

Si tu preferes les refaire a la main, il te faut au minimum:

### `/.env.local`

Base Prisma + auth:

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

### `/apps/web/.env.local`

Customs + replay parser:

```env
MONGO_URL=""
REPLAY_SERVICE_URL="http://127.0.0.1:8000"
```

Notes:

- `DATABASE_URL` / `DIRECT_URL` servent a Prisma
- `MONGO_URL` sert a la partie `Custom`
- `REPLAY_SERVICE_URL` sert a l'import `.rofl`
- si tu reutilises les bases deja en ligne, ne lance pas de seed par erreur

## Premier Demarrage

Si tu te connectes aux bases deja existantes:

```bash
pnpm db:generate
pnpm dev
```

Si tu repars sur une base PostgreSQL vide:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

## Lancer Seulement Le Site

Depuis la racine:

```bash
pnpm dev
```

Ou uniquement l'app web:

```bash
pnpm --filter @nexus/web dev
```

## Import `.rofl` Pour Les Customs

L'import replay du site passe par le dossier voisin `replay-service`.

Si tu n'as pas encore ce dossier sur l'autre PC, il faut aussi le recuperer. Ensuite:

```bash
cd replay-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -e ".[dev]"
lol-stats serve --port 8000
```

Quand le service tourne:

- l'API repond sur `http://127.0.0.1:8000`
- le site peut importer un `.rofl` depuis `Custom > Saison 2 > detail d'un match`

## Ordre De Lancement Recommande

Terminal 1:

```bash
cd replay-service
.\.venv\Scripts\activate
lol-stats serve --port 8000
```

Terminal 2:

```bash
cd thegardenTM
pnpm dev
```

## Commandes Utiles

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm --filter @nexus/web typecheck
```

## Ce Qui A Ete Branche

- branding `Garden`
- section `Custom`
- `Saison 1` figee localement
- `Saison 2` connectee a Mongo
- leaderboard customs avec tiers, elo, `NR`, `MVP`, `ACE`
- historique custom cliquable
- page detail de match custom
- import `.rofl` depuis le microservice Python

## Verification Rapide Si Ca Ne Demarre Pas

1. verifier `Node` et `pnpm`
2. verifier `/.env.local`
3. verifier `/apps/web/.env.local`
4. verifier que PostgreSQL repond
5. verifier que Mongo repond
6. verifier que `lol-stats serve --port 8000` tourne si tu testes les replays
7. lancer `pnpm --filter @nexus/web typecheck`
