# Trueno Pro Club Services (TPCS)

[Español <img src="https://flagcdn.com/w40/es.png" width="16" height="12" alt="ES">](#es) | [English <img src="https://flagcdn.com/w40/gb.png" width="16" height="12" alt="GB">](#en)

---

## <a id="es"></a> <img src="https://flagcdn.com/w40/es.png" width="24" height="18" alt="ES"> Español

Un sistema integral de gestión para clubes de Pro Clubs (EA FC).

### 📋 Descripción General

Trueno Pro Club Services es una plataforma completa que permite gestionar todos los aspectos de un club de Pro Clubs: miembros, partidos, estadísticas por jugador y posición, logros, equipo de la semana (HOF / HOS), cuentas de usuario vinculadas a jugadores y anuncios en Discord.

Este proyecto es una **evolución** de [Caracantosmeaos](https://github.com/Caracantosmeaos).

### 🌐 Vista Previa (Live Demo)

Puedes ver el sistema en funcionamiento en el despliegue oficial de **Casemuro City**:
👉 **[https://www.casemurocity.org](https://www.casemurocity.org)**

### 🏗️ Arquitectura del Proyecto

**Monorepo** con [pnpm workspaces](https://pnpm.io/workspaces). Todos los servicios Node son **ESM** y se ejecutan con `tsx` en desarrollo y con `node dist/` en producción.

#### `/packages`

##### **shared** — Tipos, constantes y modelos
- Fuente de verdad del dominio: interfaces (`IClubMember`, `IMatch`, `IPlayerStats`, `ITOTW`…), constantes (`PLAYER_POSITIONS`, `MATCH_TYPES`, `EVENT_KEYS`, `UserRole`…), contratos de la API (`ApiResponse`, `IPlayerProfile`), payloads de eventos y helpers puros.
- `@trueno-proclub-services/shared/models`: esquemas mongoose que comparten api y worker.
- `achievements.definitions.ts`: definiciones de los logros (el worker las sincroniza a la DB al arrancar).

##### **eafcapi** — Cliente de la API de EA
- Llamadas a `proclubs.ea.com` vía puppeteer (necesita Chrome).
- `parse.ts`: helpers puros sobre la respuesta cruda de partidos: id de jugador, eventos del partido, detección de DNF, penaltis y marcador real.

##### **auth** — Configuración de Better Auth
- Instancia compartida de Better Auth (proveedor Twitch, cookies cross-subdomain, campos extra del usuario).

##### **imagerenderer-client** — Cliente tipado del servicio de imágenes

#### `/apps`

##### **api** — REST API
- **Stack**: Express + Mongoose.
- Club, miembros, partidos, stats, logros, HOF/HOS, medias por posición, solicitudes de vinculación cuenta ↔ jugador y panel admin (foto —editor de encuadre a 400×450 con subida a Cloudflare R2—, cuenta vinculada y aprobación de solicitudes).
- Rutas protegidas validando la sesión contra el servicio de auth.
- 📖 **Endpoints: [docs/API.md](docs/API.md)**

##### **worker** — Sincronización y cálculo
- Cada `WORKER_INTERVAL` segundos trae los partidos nuevos de EA, los normaliza (`MatchDTO`), da de alta a los miembros que aparecen, acumula stats, evalúa logros y publica eventos en RabbitMQ.
- Job semanal del equipo de la semana (HOF / HOS).
- Enriquecimiento de miembros (`proName`, `proOverall`…) desde `members/stats` de EA sin pisar datos buenos con valores vacíos.

##### **auth** — Servicio de autenticación
- **Stack**: Express + Better Auth + MongoDB.
- Login social con Twitch, sincronización de follow/sub/rol, endpoint público de usuarios y listado admin.

##### **web** — Frontend
- **Stack**: Astro 7 + Vue 3 + Tailwind CSS 4 + DaisyUI 5.
- **100% estática** (`output: "static"`), desplegada en **GitHub Pages** (`.github/workflows/deploy-web.yml`) con dominio `www.casemurocity.org` (`public/CNAME`). Las islas Vue hacen fetch al api y al auth desde el navegador.
- Las páginas "dinámicas" van por query string y se leen en cliente: `/jugador?id=<playerId>&tab=…`, `/partido?id=<matchId>&player=<playerId>`, `/totw?semana=<iso>&tipo=best|worst`, `/partidos?id=…&desde=…&hasta=…&liga&playoff&amistoso`.
- Panel admin en `/admin` (solicitudes de vinculación pendientes, foto y cuenta vinculada de cada jugador; solo rol `admin`) y "Mi jugador" en `/micuenta`, desde donde un usuario pide vincular su cuenta a su jugador del club.
- Config por variables `PUBLIC_*` (ver `apps/web/.env.example`).

##### **discordbot** — Bot de Discord
- Consume los eventos de RabbitMQ y anuncia el equipo de la semana (y partidos / logros cuando se activen sus productores).

##### **imagerenderer** — Renderizado de imágenes
- Captura páginas de la web con puppeteer para generar las imágenes que publica el bot.

### 🔑 Identidad de los jugadores

La clave de un jugador es su **`playerId`** (id de EA), no su nombre. Así los datos persisten aunque el jugador cambie de gamertag. El id solo lo da EA en `clubs/matches` (clave del objeto `players[clubId]`), por lo que **los miembros se crean a partir de los partidos**: quien juega, existe. `playerName` es siempre el último nombre visto y cada miembro guarda su `nameHistory`.

Reglas relacionadas:
- Un jugador con **0 segundos** en un partido se guarda en el partido pero no cuenta para stats, medias, logros ni TOTW.
- **DNF**: flag de EA + marcador forzado 3-0 + agregado de jugadores discordante.
- **Penaltis**: solo en playoff / amistoso; `clubs.goals − aggregate.goals > 0` en los dos clubes **y** prórroga jugada. Se guarda el marcador real y `penaltiesScore` por club.

## 📊 Diagrama de la aplicación

![Diagrama de la arquitectura](https://i.imgur.com/DhuslGk.png)

### 🚀 Primeros Pasos

#### Requisitos Previos
- Node.js 22+ (recomendado 24)
- pnpm 10+
- Google Chrome (para `eafcapi` / `imagerenderer`)
- MongoDB y RabbitMQ

#### Instalación

```bash
git clone <repository-url>
cd TruenoProClubServices

pnpm install

# Compila packages y apps (respeta el orden de dependencias: shared → resto)
pnpm build
```

### 📦 Scripts

Todos los servicios Node (`api`, `worker`, `auth`) comparten los mismos scripts:

```bash
pnpm --filter @trueno-proclub-services/api dev     # tsx watch (recarga en caliente)
pnpm --filter @trueno-proclub-services/api start   # tsx sin watch
pnpm --filter @trueno-proclub-services/api build   # tsc → dist/
pnpm --filter @trueno-proclub-services/api serve   # node dist/…
```

Sustituye `api` por `worker` o `authservice`. Los packages (`shared`, `auth`, `eafcapi`) se compilan con `build`; si cambias algo en `shared` recuerda recompilarlo (o `pnpm --filter @trueno-proclub-services/shared dev` para watch).

Web:

```bash
pnpm --filter @trueno-proclub-services/web dev      # http://localhost:4321
pnpm --filter @trueno-proclub-services/web build    # → apps/web/dist (estático)
pnpm --filter @trueno-proclub-services/web preview
pnpm --filter @trueno-proclub-services/web check    # astro check
```

Para desarrollar contra un api local, `apps/web/.env` con `PUBLIC_API_URL=http://localhost:3999`.

### 🔧 Configuración

Cada app tiene un `.env.example` con todas sus variables comentadas:

- [`apps/api/.env.example`](apps/api/.env.example)
- [`apps/worker/.env.example`](apps/worker/.env.example)
- [`apps/auth/.env.example`](apps/auth/.env.example)
- [`apps/web/.env.example`](apps/web/.env.example) (`PUBLIC_API_URL`, `PUBLIC_AUTH_URL`, `PUBLIC_SITE_URL`; en GitHub Pages se leen de las *repository variables*)

Las más importantes:

| Variable | Apps | Descripción |
|---|---|---|
| `MONGO_URL` / `MONGODB_URI` | api, worker / auth | Conexión a MongoDB |
| `CLUBID` | api, worker | Id del club en EA. **Cambia con cada entrega** (FC27 = club nuevo) |
| `PLATFORM` | api, worker | `common-gen5`, `common-gen4` o `nx` |
| `ALLOWED_ORIGINS` | api, auth | Orígenes permitidos (CORS / trustedOrigins), separados por coma |
| `AUTH_URL` | api | URL del auth service para validar sesiones en rutas protegidas |
| `DEVMODE` | api, auth | CORS abierto y cookies sin dominio, solo para desarrollo |
| `RABBITMQ_URL` | worker, discordbot | Conexión a RabbitMQ |
| `WORKER_INTERVAL` | worker | Segundos entre sincronizaciones con EA |
| `FORCE_RECALCULATE` | worker | Recalcula todas las stats y logros desde el histórico al arrancar |
| `TOTW_CRON_SCHEDULE`, `TZ` | api, worker | Cuándo se calcula el equipo de la semana |
| `CLUB_CACHE_MS`, `CLUB_RETRY_MS` | api | TTL de la caché de `/club` y espera tras un fallo de EA |
| `TWITCH_CLIENT_ID/SECRET`, `TWITCH_CHANNEL_ID` | auth | Proveedor Twitch y canal a seguir |
| `PUPPETEER_EXECUTABLE_PATH` | api, worker, imagerenderer | Ruta a Chrome si no está en la ubicación por defecto |

#### Servicios Externos

```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
```

### 📂 Estructura de Carpetas

```
packages/
├── shared/src/
│   ├── constants.ts              # Enums / constantes de dominio
│   ├── helpers.ts                # Helpers puros (validación de datos de EA, 0 segundos…)
│   ├── achievements.definitions.ts
│   ├── types/                    # Interfaces
│   └── models/                   # Esquemas mongoose (api + worker)
├── eafcapi/src/
│   ├── core/                     # Llamadas a EA + parse.ts
│   └── model/                    # Tipos de la respuesta de EA
├── auth/src/                     # createAuth() de Better Auth
└── image-renderer-client/

apps/
├── api/src/
│   ├── controllers/  routes/  services/  middleware/  database/
│   └── app.ts
├── worker/src/
│   ├── dtos/                     # MatchDTO, MatchPlayerDTO, MemberInfoDTO
│   ├── services/                 # sync, member, playerStats, achievement, totw, averageStats
│   ├── jobs/  events/  config/  utils/
│   └── index.ts
├── auth/src/
│   ├── routes/                   # twitch, public, admin
│   ├── services/  middleware/  models/  db/
│   └── index.ts
├── web/src/
│   ├── pages/                    # Una página por ruta (sin [params]: query string)
│   ├── components/  layouts/  composables/
│   ├── lib/                      # api.ts (cliente tipado), auth.ts, query.ts (rutas), playerImage.ts
│   ├── services/  model/         # FetchService + entidades de vista
│   └── styles/global.css         # Tailwind 4 + temas DaisyUI
├── discordbot/
└── imagerenderer/src/
```

### 🔌 Endpoints

Documentados en **[docs/API.md](docs/API.md)** (REST API, auth service y eventos de RabbitMQ). La API también expone un índice en `GET /`.

### 🗓️ Base de Datos

**Motor**: MongoDB. Nombres de colección explícitos en `packages/shared/src/models`:

| Colección | Contenido |
|---|---|
| `clubs` | Caché de info + stats globales del club |
| `members` | Miembros (`playerId` único, `playerName`, `nameHistory`, `pro*`, `imageUrl`, `userId`) |
| `matches` | Partidos normalizados (`_id` = `matchId`) |
| `member_stats_officials` / `member_stats_friendlies` | Stats acumuladas por jugador y posición |
| `player_average_stats` | Medias del club por posición |
| `achievements_definitions` / `achievements_unlocked` | Definiciones y desbloqueos de logros |
| `totw` / `member_totw_appearances` | Equipo de la semana y apariciones |

La base de datos de auth (Better Auth) es independiente: `user`, `session`, `account`, `verification`.

### 🐳 Docker

`api`, `worker` y `auth` incluyen `Dockerfile` (build multi-stage desde la raíz del repo):

```bash
docker build -f apps/api/Dockerfile -t tpcs-api .
docker build -f apps/worker/Dockerfile -t tpcs-worker .
docker build -f apps/auth/Dockerfile -t tpcs-auth .
```

### 🔐 Seguridad

- **CORS** con `credentials` y lista de orígenes (`ALLOWED_ORIGINS`).
- **Sesiones** en cookie de dominio `.casemurocity.org`; las rutas admin del api validan sesión y rol `admin` contra el auth service.
- **Error handling** centralizado y tipos fuertes desde `shared`.

### 📝 Tecnologías Principales

| Componente | Tecnologías |
|-----------|------------|
| **API / Worker / Auth** | Node ESM, TypeScript, tsx, Express, Mongoose / MongoDB, Better Auth, RabbitMQ |
| **EA** | puppeteer |
| **Frontend Web** | Astro 7, Vue 3, Tailwind CSS 4, DaisyUI 5, Chart.js, three.js · GitHub Pages |
| **Tooling** | pnpm workspaces, Docker, GitHub Actions (Pages + wiki) |

### 👨‍💻 Autor

**el_trueno**

### 📄 Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE).

### 🤝 Contribuciones

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios
4. Push a la rama y abre un Pull Request

---

## <a id="en"></a> <img src="https://flagcdn.com/w40/gb.png" width="24" height="18" alt="GB"> English

A comprehensive management system for Pro Clubs (EA FC).

### 📋 Overview

Trueno Pro Club Services manages every aspect of a Pro Club: members, matches, per-player and per-position stats, achievements, team of the week (HOF / HOS), user accounts linked to players and Discord announcements.

This project is an **evolution** of [Caracantosmeaos](https://github.com/Caracantosmeaos).

### 🌐 Live Demo

👉 **[https://www.casemurocity.org](https://www.casemurocity.org)** (Casemuro City deployment)

### 🏗️ Project Architecture

**Monorepo** with [pnpm workspaces](https://pnpm.io/workspaces). Every Node service is **ESM**, run with `tsx` in development and `node dist/` in production.

#### `/packages`

- **shared** — Domain source of truth: interfaces, constants (`PLAYER_POSITIONS`, `MATCH_TYPES`, `EVENT_KEYS`, `UserRole`…), API contracts, event payloads, pure helpers, achievement definitions and the mongoose models shared by api and worker (`@trueno-proclub-services/shared/models`).
- **eafcapi** — EA Pro Clubs API client (puppeteer) plus `parse.ts`: pure helpers over the raw match payload (player id, match events, DNF / penalties detection, real score).
- **auth** — Shared Better Auth instance (Twitch provider, cross-subdomain cookies, extra user fields).
- **imagerenderer-client** — Typed client for the image renderer service.

#### `/apps`

- **api** — Express + Mongoose REST API: club, members, matches, stats, achievements, HOF/HOS, position averages, account ↔ player link requests and an admin panel backend (player photo with a 400×450 crop editor uploading to Cloudflare R2, linked account, request approval). Protected routes validate the session against the auth service. 📖 **Endpoints: [docs/API.md](docs/API.md)**
- **worker** — Every `WORKER_INTERVAL` seconds fetches new matches from EA, normalizes them (`MatchDTO`), registers the members that appear, accumulates stats, evaluates achievements and publishes RabbitMQ events. Weekly team-of-the-week job. Enriches members (`proName`, `proOverall`…) from EA without overwriting good data with empty values.
- **auth** — Express + Better Auth + MongoDB: Twitch login, follow/sub/role sync, public users endpoint and admin user listing.
- **web** — Astro 7 + Vue 3 + Tailwind CSS 4 + DaisyUI 5 frontend. Fully static, deployed to GitHub Pages (`.github/workflows/deploy-web.yml`, custom domain via `public/CNAME`). Dynamic pages take query params read client-side (`/jugador?id=<playerId>`, `/partido?id=<matchId>`, `/totw?semana=…&tipo=…`). Admin panel at `/admin` (pending link requests, player photo and linked account, `admin` role only); users request the link to their player from `/micuenta`. Configured through `PUBLIC_*` env vars (`apps/web/.env.example`).
- **discordbot** — Consumes RabbitMQ events and announces the team of the week (matches / achievements once their producers are enabled).
- **imagerenderer** — Captures web pages with puppeteer to render the images the bot posts.

### 🔑 Player identity

A player is keyed by its **`playerId`** (EA id), never by name, so data survives gamertag changes. EA only exposes the id in `clubs/matches` (key of the `players[clubId]` object), so **members are created from matches**: whoever plays, exists. `playerName` is always the last seen name and each member keeps a `nameHistory`.

Related rules:
- A player with **0 seconds** in a match is stored in the match but does not count for stats, averages, achievements or TOTW.
- **DNF**: EA flag + forced 3-0 + player aggregate mismatch.
- **Penalties**: playoff / friendly only; `clubs.goals − aggregate.goals > 0` for both clubs **and** extra time played. Real score and per-club `penaltiesScore` are stored.

## 📊 Application Diagram

![Application Diagram](https://i.imgur.com/DhuslGk.png)

### 🚀 Getting Started

- Node.js 22+ (24 recommended), pnpm 10+, Google Chrome (for `eafcapi` / `imagerenderer`), MongoDB and RabbitMQ.

```bash
git clone <repository-url>
cd TruenoProClubServices
pnpm install
pnpm build   # builds packages and apps in dependency order (shared first)
```

### 📦 Scripts

All Node services (`api`, `worker`, `authservice`) share the same scripts:

```bash
pnpm --filter @trueno-proclub-services/api dev     # tsx watch
pnpm --filter @trueno-proclub-services/api start   # tsx
pnpm --filter @trueno-proclub-services/api build   # tsc → dist/
pnpm --filter @trueno-proclub-services/api serve   # node dist/…
```

Packages (`shared`, `auth`, `eafcapi`) are built with `build`; rebuild `shared` after changing it (or run its `dev` watch).

### 🔧 Configuration

Each app ships a commented `.env.example`: [`apps/api`](apps/api/.env.example), [`apps/worker`](apps/worker/.env.example), [`apps/auth`](apps/auth/.env.example). Key variables:

| Variable | Apps | Description |
|---|---|---|
| `MONGO_URL` / `MONGODB_URI` | api, worker / auth | MongoDB connection |
| `CLUBID` | api, worker | EA club id. **Changes every game release** (FC27 = new club) |
| `PLATFORM` | api, worker | `common-gen5`, `common-gen4` or `nx` |
| `ALLOWED_ORIGINS` | api, auth | Comma-separated allowed origins (CORS / trustedOrigins) |
| `AUTH_URL` | api | Auth service URL used to validate sessions on protected routes |
| `DEVMODE` | api, auth | Open CORS and host-only cookies, development only |
| `RABBITMQ_URL` | worker, discordbot | RabbitMQ connection |
| `WORKER_INTERVAL` | worker | Seconds between EA syncs |
| `FORCE_RECALCULATE` | worker | Recompute all stats and achievements from match history on startup |
| `TOTW_CRON_SCHEDULE`, `TZ` | api, worker | When the team of the week is computed |
| `CLUB_CACHE_MS`, `CLUB_RETRY_MS` | api | `/club` cache TTL and cooldown after an EA failure |
| `TWITCH_CLIENT_ID/SECRET`, `TWITCH_CHANNEL_ID` | auth | Twitch provider and channel to follow |
| `PUPPETEER_EXECUTABLE_PATH` | api, worker, imagerenderer | Chrome path if not in the default location |

### 🔌 Endpoints

See **[docs/API.md](docs/API.md)** (REST API, auth service and RabbitMQ events). The API also serves an index at `GET /`.

### 🗓️ Database

MongoDB. Explicit collection names live in `packages/shared/src/models`: `clubs`, `members`, `matches`, `member_stats_officials`, `member_stats_friendlies`, `player_average_stats`, `achievements_definitions`, `achievements_unlocked`, `totw`, `member_totw_appearances`. The auth database (Better Auth) is separate.

### 🐳 Docker

```bash
docker build -f apps/api/Dockerfile -t tpcs-api .
docker build -f apps/worker/Dockerfile -t tpcs-worker .
docker build -f apps/auth/Dockerfile -t tpcs-auth .
```

### 👨‍💻 Author

**el_trueno**

### 📄 License

[MIT License](LICENSE).
