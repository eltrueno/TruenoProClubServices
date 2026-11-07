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
👉 **[https://city.casemuro.stream](https://city.casemuro.stream)**

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
- Login social con Twitch, sincronización de follow/sub/rol (al entrar, en segundo plano cuando los datos son viejos y con un repaso periódico), endpoint público de usuarios y listado admin.

##### **web** — Frontend
- **Stack**: Astro 7 + Vue 3 + Tailwind CSS 4 + DaisyUI 5.
- **100% estática** (`output: "static"`) y **multi-club**: el club se elige en tiempo de build con `PUBLIC_CLUB` (`city` | `united`, ver [`src/config/club.ts`](apps/web/src/config/club.ts)), que define nombre, logo, colores, redes y metadatos, y opcionalmente el estilo de la cabecera (`headerStyle`: color del club o fondo del tema) y fondos propios por tema (`surfaces`). La imagen de las vistas previas de enlaces (`/og.png`, PNG 1200×630) se genera en el build con el escudo sobre el `themeColor` del club. Se despliega en **GitHub Pages** (`.github/workflows/deploy-web.yml`), que publica **un club por repositorio**: el dominio sale de `PUBLIC_SITE_URL` y el workflow genera el `CNAME`. Los demás clubes tienen un repo propio con solo un workflow que clona este y compila con su `PUBLIC_CLUB`; cuando este despliegue sale bien, avisa a esos repos (`repository_dispatch`, variable `CLUB_PAGES_REPOS` y secret `CLUB_PAGES_DISPATCH_TOKEN`) para que publiquen el mismo commit. Las islas Vue llaman al api (`PUBLIC_API_URL`) y al auth (`PUBLIC_AUTH_URL`) desde el navegador.
- Las páginas "dinámicas" van por query string y se leen en cliente: `/jugador?id=<playerId>&tab=…`, `/partido?id=<matchId>&player=<playerId>`, `/totw?semana=<iso>&tipo=best|worst`, `/partidos?id=…&desde=…&hasta=…&liga&playoff&amistoso`.
- Panel admin en `/admin` (solicitudes de vinculación pendientes, foto y cuenta vinculada de cada jugador; solo rol `admin`).
- **La cuenta no vive aquí:** iniciar sesión y los ajustes están en **accounts** (ver abajo). En la web del club solo quedan el tema (en el menú de la cuenta) y el botón **Mi jugador**: lleva a la ficha del jugador vinculado en este club, sale desactivado si la cuenta tiene jugador pero no ha jugado en este club, y lleva a accounts para pedir la vinculación si no tiene. `/micuenta` y `/login` se mantienen solo como redirecciones a accounts.
- Config por variables `PUBLIC_*` (ver `apps/web/.env.example`).

##### **accounts-front** — Web de la cuenta (`accounts.casemuro.stream`)
- **Stack**: Astro 7 + Vue 3 + Tailwind CSS 4 + DaisyUI 5, **100% estática**, en **Cloudflare Workers** (solo archivos estáticos, conectado al repo desde el panel de Cloudflare; config en [`wrangler.jsonc`](apps/accounts-front/wrangler.jsonc)).
- Común a todos los clubes: **login** (`/login?redirect=<url>`), perfil y sincronización con Twitch, conexiones, **Mi jugador** (de todos los clubes a la vez, porque una cuenta = un EA ID), privacidad, borrar la cuenta y la política de privacidad (`/privacidad`).
- Las webs de los clubes mandan aquí para iniciar sesión y, al terminar, se vuelve a la página de origen. La vuelta (`redirect`) solo se acepta hacia rutas propias o webs `https://*.casemuro.stream`, para que el enlace de login no sirva para mandar a nadie a una web de fuera.
- La sesión es la de Better Auth: la cookie es de `.casemuro.stream`, así que una sesión iniciada aquí vale en todas las webs. Las solicitudes de vinculación se crean en el api del club donde aparece el jugador.
- Colores: el rojo del City (`#c80d0d`) funde con el granate del United (`#b90a34`) de izquierda a derecha en todo lo que lleva color de marca.
- Config por variables `PUBLIC_*` (ver `apps/accounts-front/.env.example`).
- **Despliegue en Cloudflare Workers**, conectado al repo desde el panel: Cloudflare compila y publica solo con cada push a `main` (no hay Action ni secrets en GitHub). Puesta en marcha, una vez:
  1. `ALLOWED_ORIGINS` del auth y de los dos api: añadir `https://accounts.casemuro.stream` (y desplegarlos).
  2. Cloudflare → *Workers & Pages → Create → Workers → Import a repository* → este repo. El Worker se tiene que llamar como el `name` de [`wrangler.jsonc`](apps/accounts-front/wrangler.jsonc) (`casemuro-accounts`).
     - **Build command:** `pnpm --filter @trueno-proclub-services/shared build && pnpm --filter @trueno-proclub-services/auth build && pnpm --filter @trueno-proclub-services/accounts-front build`
     - **Deploy command:** `npx wrangler deploy --config apps/accounts-front/wrangler.jsonc`
     - **Root directory / Path:** vacío (la raíz del repo). **Production branch:** `main`, sin builds de otras ramas.
     - **Variables del build:** `NODE_VERSION=24`, `PNPM_VERSION=10.32.1`, `PUPPETEER_SKIP_DOWNLOAD=true` (Cloudflare instala todo el monorepo; sin esto se descargaría Chrome para `eafcapi`), `PUBLIC_SITE_URL=https://accounts.casemuro.stream` y, si algún club aún no tiene api, `PUBLIC_CLUBS=city`.
     - **Build watch paths:** `apps/accounts-front/*`, `packages/shared/*` y `packages/auth/*`, para que un cambio en la web o el api no la recompile.
  3. *Settings → Domains & Routes → Add → Custom domain* → `accounts.casemuro.stream` (como `casemuro.stream` ya está en Cloudflare, el DNS y el certificado se crean solos).

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

#### ✅ Pruebas: `pnpm test`

`pnpm test` compila `shared` y `auth` y pasa todas las pruebas del monorepo con [Vitest](https://vitest.dev) (`apps/*/test`, `packages/*/test`; `pnpm test:watch` para dejarlas mirando). Cubren la sincronización con Twitch (follow, sub, rol, errores, tokens cifrados, renovación), el modelo de usuario y los hooks de Better Auth contra un Mongo en memoria, el login de desarrollo, la limpieza de vínculos de cuentas borradas y la URL de vuelta del login de accounts. Las que usan Mongo tiran de `mongodb-memory-server`: la primera vez descarga el binario de Mongo (~100 MB).

#### 🧪 Probar las cuentas en local: `pnpm dev:local`

Con los servicios de producción no se puede probar el login desde localhost (CORS, cookies de `.casemuro.stream` y la URL de vuelta de Twitch). `pnpm dev:local` ([`scripts/dev-local.mjs`](scripts/dev-local.mjs)) arranca todo en localhost con la configuración buena, sin tocar los `.env`:

| Servicio | URL |
|---|---|
| accounts | http://localhost:4323/login |
| web (city) | http://localhost:4321 |
| api (city) | http://localhost:3010 |
| auth | http://localhost:3001 |

- **Twitch:** usa las credenciales de `apps/auth/.env`; si ahí no está `TWITCH_CHANNEL_ID`, busca el id del canal de `mr_casemuro` (o `DEV_TWITCH_CHANNEL`).
- **Entrar sin Twitch:** en el login de accounts aparecen botones para entrar como usuario de prueba (visitante, seguidor, sub, admin). Es un login de desarrollo del auth (`/api/dev/*`) que solo existe con `DEVMODE=true`, `DEV_LOGIN=true` **y** `BETTER_AUTH_URL` en localhost a la vez; en producción no existe. Para probar el login real con Twitch, añade `http://localhost:3001/api/auth/callback/twitch` a las redirect URLs de la app de Twitch.
- **Bases de datos:** saca la conexión de `apps/api/.env` (`MONGO_URL`). El auth usa su propia base de desarrollo (`tpcs_auth_dev`). La base del club es la de `apps/api/.env` (casi solo lectura). La compartida (vínculos, solicitudes, fotos globales) es por defecto una **copia de desarrollo** (`tpcs27_shared_dev`), para que lo que pruebes no aparezca en el `/admin` de verdad; con `pnpm dev:local --real-shared` se usa la real. Las subidas de fotos a R2 van desactivadas y la limpieza de vínculos huérfanos no corre en `DEVMODE`.
- `--only=auth,api` arranca solo algunos. Ctrl+C lo para todo.

### 🔧 Configuración

Cada app tiene un `.env.example` con todas sus variables comentadas:

- [`apps/api/.env.example`](apps/api/.env.example)
- [`apps/worker/.env.example`](apps/worker/.env.example)
- [`apps/auth/.env.example`](apps/auth/.env.example)
- [`apps/web/.env.example`](apps/web/.env.example) (`PUBLIC_CLUB`, `PUBLIC_SITE_URL`, `PUBLIC_API_URL`, `PUBLIC_AUTH_URL`, `PUBLIC_ACCOUNTS_URL`; en el deploy se leen de las *repository variables*)
- [`apps/accounts-front/.env.example`](apps/accounts-front/.env.example) (`PUBLIC_SITE_URL`, `PUBLIC_AUTH_URL` y, en local, el api de cada club). En producción las variables se ponen en el Worker de Cloudflare (variables del build)

Las más importantes:

| Variable | Apps | Descripción |
|---|---|---|
| `MONGO_URL` / `MONGODB_URI` | api, worker / auth | Conexión a MongoDB (en api y worker, la base del club) |
| `SHARED_DB_NAME` | api, worker | Base común a todos los clubes (vínculos, fotos globales, solicitudes). Por defecto `tpcs27_shared`. El usuario de `MONGO_URL` necesita `readWrite` también sobre ella |
| `CLUBID` | api, worker | Id del club en EA. **Cambia con cada entrega** (FC27 = club nuevo) |
| `PLATFORM` | api, worker | `common-gen5`, `common-gen4` o `nx` |
| `ALLOWED_ORIGINS` | api, auth | Orígenes permitidos (CORS / trustedOrigins), separados por coma. Tienen que incluir `https://accounts.casemuro.stream`: en el auth para que el login de Twitch pueda volver allí, y en el api de cada club para que accounts pueda consultar el jugador y pedir la vinculación |
| `AUTH_URL` | api | URL del auth service para validar sesiones en rutas protegidas |
| `IDENTITY_CLEANUP_HOURS` | api | Cada cuántas horas se liberan los jugadores vinculados a cuentas borradas (24) |
| `DEVMODE` | api, auth | CORS abierto y cookies sin dominio, solo para desarrollo |
| `RABBITMQ_URL` | worker, discordbot | Conexión a RabbitMQ |
| `WORKER_INTERVAL` | worker | Segundos entre sincronizaciones con EA |
| `FORCE_RECALCULATE` | worker | Recalcula todas las stats y logros desde el histórico al arrancar |
| `TOTW_CRON_SCHEDULE`, `TZ` | api, worker | Cuándo se calcula el equipo de la semana |
| `CLUB_CACHE_MS`, `CLUB_RETRY_MS` | api | TTL de la caché de `/club` y espera tras un fallo de EA |
| `TWITCH_CLIENT_ID/SECRET`, `TWITCH_CHANNEL_ID` | auth | Proveedor Twitch y canal a seguir (`TWITCH_CHANNEL_ID` es el id **numérico** del canal) |
| `TWITCH_SYNC_INTERVAL_MINUTES`, `TWITCH_SYNC_STALE_MINUTES`, `TWITCH_SYNC_RETRY_MINUTES` | auth | Cada cuánto pasa el repaso de follow/sub (60), a partir de cuándo se consideran viejos los datos (360) y espera tras un intento fallido (10) |
| `BETTER_AUTH_SECRET` | auth | Firma las sesiones y cifra los tokens de Twitch guardados. Si cambia, los usuarios tendrán que volver a conectar Twitch |
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
├── accounts-front/src/          # accounts.casemuro.stream (Cloudflare Pages)
│   ├── pages/                    # / (cuenta), /login, /privacidad, 404
│   ├── components/account/       # Tarjetas: perfil, conexiones, mi jugador, privacidad, borrar
│   ├── lib/                      # auth.ts, api.ts (auth + api de cada club), redirect.ts (vuelta segura)
│   └── config/site.ts            # URL del auth y clubes
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
| `members` | Miembros (`playerId` único, `playerName`, `nameHistory`, `pro*`, `imageUrl` = foto propia del club) |
| `matches` | Partidos normalizados (`_id` = `matchId`) |
| `member_stats_officials` / `member_stats_friendlies` | Stats acumuladas por jugador y posición |
| `player_average_stats` | Medias del club por posición |
| `achievements_definitions` / `achievements_unlocked` | Definiciones y desbloqueos de logros |
| `totw` / `member_totw_appearances` | Equipo de la semana y apariciones |

Cada club tiene su base (la de `MONGO_URL`). Además hay una **base compartida** entre clubes (`SHARED_DB_NAME`, por defecto `tpcs27_shared`) para lo que es de la persona y no del club:

| Colección | Contenido |
|---|---|
| `players` | Identidad global por `playerId`: cuenta vinculada (`userId`, una cuenta = un jugador en todos los clubes) y foto por defecto (`imageUrl`) |
| `link_requests` | Solicitudes de vinculación cuenta ↔ jugador |

La foto que ve la web es la del club si la tiene y, si no, la global. El api migra solo (una vez por base de club, al arrancar) el vínculo y las fotos que antes vivían en `members`; ver [docs/API.md](docs/API.md).

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
- **Sesiones** en cookie de dominio `.casemuro.stream`; las rutas admin del api validan sesión y rol `admin` contra el auth service.
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

👉 **[https://city.casemuro.stream](https://city.casemuro.stream)** (Casemuro City deployment)

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
- **auth** — Express + Better Auth + MongoDB: Twitch login, follow/sub/role sync (on sign-in, in the background when stale and in a periodic sweep), public users endpoint and admin user listing.
- **web** — Astro 7 + Vue 3 + Tailwind CSS 4 + DaisyUI 5 frontend. Fully static, deployed to GitHub Pages (`.github/workflows/deploy-web.yml`, custom domain via a generated `CNAME`). Multi-club: one club per repository; other clubs live in satellite repos that only hold a workflow cloning this one, and a successful deploy here triggers them (`repository_dispatch`, `CLUB_PAGES_REPOS` variable and `CLUB_PAGES_DISPATCH_TOKEN` secret) so every club publishes the same commit. Dynamic pages take query params read client-side (`/jugador?id=<playerId>`, `/partido?id=<matchId>`, `/totw?semana=…&tipo=…`). Admin panel at `/admin` (pending link requests, player photo and linked account, `admin` role only). Signing in and account settings live in **accounts** (below); the club site only keeps the theme (in the account menu) and the **Mi jugador** button, which opens the linked player's page in this club, is disabled when the account has a player who never played for this club, and links to accounts to request the link otherwise. `/micuenta` and `/login` are kept as redirects to accounts. Configured through `PUBLIC_*` env vars (`apps/web/.env.example`). The link preview image (`/og.png`, 1200×630 PNG) is generated at build time from the club crest over its `themeColor`.
- **accounts-front** — `accounts.casemuro.stream`, shared by every club: sign-in (`/login?redirect=<url>`), profile and Twitch sync, connections, **Mi jugador** across all clubs (one account = one EA ID), privacy, account deletion and the privacy policy. Astro 7 + Vue 3 + Tailwind CSS 4 + DaisyUI 5, fully static, deployed as a static-assets **Cloudflare Worker** connected to the repo (Cloudflare builds and deploys every push to `main`; no GitHub Action or secrets; config in `apps/accounts-front/wrangler.jsonc`). Club sites send users here to sign in and get them back afterwards; `redirect` is only honoured for its own paths and `https://*.casemuro.stream` sites (no open redirect). The session cookie is on `.casemuro.stream`, so one sign-in works everywhere. Brand colours blend the City red (`#c80d0d`) into the United maroon (`#b90a34`) left to right. Worker settings: name `casemuro-accounts` (must match `wrangler.jsonc`), root = repo root, production branch `main`, build command `pnpm --filter @trueno-proclub-services/shared build && pnpm --filter @trueno-proclub-services/auth build && pnpm --filter @trueno-proclub-services/accounts-front build`, deploy command `npx wrangler deploy --config apps/accounts-front/wrangler.jsonc`, build variables `NODE_VERSION=24`, `PNPM_VERSION=10.32.1`, `PUPPETEER_SKIP_DOWNLOAD=true`, `PUBLIC_SITE_URL=https://accounts.casemuro.stream` (plus `PUBLIC_CLUBS=city` if a club has no API yet), build watch paths `apps/accounts-front/*`, `packages/shared/*`, `packages/auth/*`, custom domain `accounts.casemuro.stream`. Add that origin to `ALLOWED_ORIGINS` in auth and every club API.
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

#### ✅ Tests: `pnpm test`

`pnpm test` builds `shared` and `auth` and runs every test in the monorepo with [Vitest](https://vitest.dev) (`apps/*/test`, `packages/*/test`; `pnpm test:watch` to keep watching): Twitch sync (follow, sub, role, errors, encrypted tokens, refresh), the user model and Better Auth hooks against an in-memory Mongo, the dev login, the orphan-link sweep and the accounts login redirect check. Mongo-backed tests use `mongodb-memory-server`, which downloads a Mongo binary (~100 MB) on first run.

#### 🧪 Testing accounts locally: `pnpm dev:local`

The production services can't be used for sign-in from localhost (CORS, `.casemuro.stream` cookies, Twitch redirect URL). `pnpm dev:local` ([`scripts/dev-local.mjs`](scripts/dev-local.mjs)) starts everything on localhost with the right config, without touching any `.env`: accounts on `:4323`, web (city) on `:4321`, api (city) on `:3010`, auth on `:3001`.

- **Sign in without Twitch:** the accounts login shows buttons to sign in as a test user (visitor, follower, sub, admin). It's an auth dev login (`/api/dev/*`) that only exists when `DEVMODE=true`, `DEV_LOGIN=true` **and** a localhost `BETTER_AUTH_URL` are all set. For the real Twitch login, add `http://localhost:3001/api/auth/callback/twitch` to the Twitch app redirect URLs.
- **Databases:** the connection comes from `apps/api/.env`. Auth uses its own dev database (`tpcs_auth_dev`); the club database is the one in `apps/api/.env` (mostly read-only); the shared database defaults to a **dev copy** (`tpcs27_shared_dev`) so your tests don't show up in the real `/admin` (`--real-shared` to use the real one). R2 uploads are disabled and the orphan-link sweep doesn't run under `DEVMODE`.
- `--only=auth,api` starts a subset. Ctrl+C stops everything.

### 🔧 Configuration

Each app ships a commented `.env.example`: [`apps/api`](apps/api/.env.example), [`apps/worker`](apps/worker/.env.example), [`apps/auth`](apps/auth/.env.example). Key variables:

| Variable | Apps | Description |
|---|---|---|
| `MONGO_URL` / `MONGODB_URI` | api, worker / auth | MongoDB connection (for api and worker, the club's database) |
| `SHARED_DB_NAME` | api, worker | Database shared by all clubs (links, global photos, link requests). Defaults to `tpcs27_shared`. The `MONGO_URL` user also needs `readWrite` on it |
| `CLUBID` | api, worker | EA club id. **Changes every game release** (FC27 = new club) |
| `PLATFORM` | api, worker | `common-gen5`, `common-gen4` or `nx` |
| `ALLOWED_ORIGINS` | api, auth | Comma-separated allowed origins (CORS / trustedOrigins). Must include `https://accounts.casemuro.stream`: in auth so the Twitch login can return there, and in every club api so accounts can read the player and request the link |
| `AUTH_URL` | api | Auth service URL used to validate sessions on protected routes |
| `IDENTITY_CLEANUP_HOURS` | api | How often (hours) players linked to deleted accounts are released (24) |
| `DEVMODE` | api, auth | Open CORS and host-only cookies, development only |
| `RABBITMQ_URL` | worker, discordbot | RabbitMQ connection |
| `WORKER_INTERVAL` | worker | Seconds between EA syncs |
| `FORCE_RECALCULATE` | worker | Recompute all stats and achievements from match history on startup |
| `TOTW_CRON_SCHEDULE`, `TZ` | api, worker | When the team of the week is computed |
| `CLUB_CACHE_MS`, `CLUB_RETRY_MS` | api | `/club` cache TTL and cooldown after an EA failure |
| `TWITCH_CLIENT_ID/SECRET`, `TWITCH_CHANNEL_ID` | auth | Twitch provider and channel to follow (`TWITCH_CHANNEL_ID` is the **numeric** channel id) |
| `TWITCH_SYNC_INTERVAL_MINUTES`, `TWITCH_SYNC_STALE_MINUTES`, `TWITCH_SYNC_RETRY_MINUTES` | auth | How often the follow/sub sweep runs (60), when data counts as stale (360) and the wait after a failed attempt (10) |
| `BETTER_AUTH_SECRET` | auth | Signs sessions and encrypts stored Twitch tokens. Changing it forces users to reconnect Twitch |
| `PUPPETEER_EXECUTABLE_PATH` | api, worker, imagerenderer | Chrome path if not in the default location |

### 🔌 Endpoints

See **[docs/API.md](docs/API.md)** (REST API, auth service and RabbitMQ events). The API also serves an index at `GET /`.

### 🗓️ Database

MongoDB. Explicit collection names live in `packages/shared/src/models`: `clubs`, `members`, `matches`, `member_stats_officials`, `member_stats_friendlies`, `player_average_stats`, `achievements_definitions`, `achievements_unlocked`, `totw`, `member_totw_appearances`. Each club has its own database; a **shared database** (`SHARED_DB_NAME`, default `tpcs27_shared`) holds what belongs to the person rather than the club: `players` (global identity per `playerId`: linked account and default photo) and `link_requests`. A club can override a player's photo with its own (`members.imageUrl`). The api migrates the legacy link and photos out of `members` once per club database on startup. The auth database (Better Auth) is separate.

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
