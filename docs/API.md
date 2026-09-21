# TPCS — Endpoints

Referencia de los dos servicios HTTP del monorepo:

- **REST API** (`apps/api`) — `https://api.casemurocity.org`
- **Auth service** (`apps/auth`) — `https://auth.casemurocity.org`

Los tipos de todas las respuestas están en `packages/shared` (`IClubMember`, `IMatch`, `IPlayerStats`, `ITOTW`, `IAchievementUnlocked`, `IPlayerProfile`, `ApiResponse<T>`…).

---

## Conceptos

- **`playerId`**: id del jugador en EA (personaId). Es la clave de todo lo relacionado con un jugador y no cambia aunque cambie de nombre. Sale de `clubs/matches` de EA (clave del objeto `players[clubId]`).
- **`playerName`**: último gamertag visto para ese `playerId`. Solo para mostrar. Los miembros guardan además `nameHistory[]`.
- **Sesión**: la pone el auth service en una cookie de dominio `.casemurocity.org`. Las rutas protegidas del api la validan reenviándola a `AUTH_URL/api/auth/get-session`; la web tiene que hacer `fetch(..., { credentials: "include" })`.
- **0 segundos**: un jugador que aparece en un partido con `secondsPlayed: 0` se guarda en el partido pero no cuenta para stats, medias, logros ni TOTW.
- **Vinculación cuenta ↔ jugador** (`members.userId`): la hace un admin, bien directamente (`PATCH /admin/members/:playerId`), bien aprobando una **solicitud** que el propio usuario crea desde "Mi cuenta" (`POST /members/me/link-request`). Colección `link_requests` (`ILinkRequest`: `id, userId, userName, userImage, playerId, playerName, status: pending|approved|rejected, createdAt, resolvedAt, resolvedBy`). Un usuario solo puede tener una solicitud pendiente y una cuenta solo puede estar vinculada a un jugador.

---

## REST API (`apps/api`)

### Formato de respuesta

```json
{ "status": { "code": 200, "message": "Ok" }, "response": … }
```

Errores: `{ "status": { "code": 400 | 401 | 403 | 404 | 500 | 502, "message": "ERROR_…" } }`.

Excepción: `GET /club` devuelve `{ "status": 200, "response": … }` o `{ "status": 400 }` (formato heredado).

### Club

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/club` | Info + stats globales del club (`IClub`). Caché en Mongo con TTL `CLUB_CACHE_MS`; si EA falla se sirve la caché aunque esté caducada y no se reintenta hasta `CLUB_RETRY_MS`. Nunca pisa datos buenos con una respuesta vacía de EA. |

### Miembros

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/members` | — | Lista de miembros (`IClubMember[]`), ordenada por nombre. |
| `GET` | `/members/stats` | — | `{ official: IPlayerStats[], friendly: IPlayerStats[] }` de todos los jugadores. Un doc por jugador **y posición**. |
| `GET` | `/members/stats/:type` | — | `type` = `official` \| `friendly`. |
| `GET` | `/members/me` | sesión | Miembro vinculado a la cuenta con sesión (`IClubMember` o `null`). |
| `GET` | `/members/me/link-request` | sesión | Solicitud de vinculación pendiente de la cuenta (`ILinkRequest` o `null`). |
| `POST` | `/members/me/link-request` | sesión | Body `{ "playerId": string }`. Crea la solicitud (sustituye a la pendiente anterior si la había). `404` si el jugador no existe, `409 ALREADY_LINKED` si la cuenta ya tiene jugador, `409 PLAYER_TAKEN` si el jugador ya tiene cuenta. |
| `DELETE` | `/members/me/link-request` | sesión | Cancela la solicitud pendiente. `{ cancelled: boolean }`. |
| `GET` | `/members/:playerId` | — | Perfil completo (`IPlayerProfile`): `{ member, stats: { official, friendly }, achievements, totw }`. 404 si no existe. |

`achievements` viene con la definición embebida: `{ playerId, playerName, achievementId, reached?, unlockedAt, matchId?, definition: IAchievementDefinition }`.

### Partidos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/matches` | Todos los partidos (`IMatch[]`). |
| `GET` | `/matches/ordered?limit=N` | Más recientes primero. |
| `GET` | `/matches/ordered/:type?limit=N` | `type` = `league` \| `playoff` \| `friendly`. |
| `GET` | `/matches/player/:playerId?limit=N` | Partidos en los que aparece el jugador (incluye los de 0 segundos). Lista vacía si no ha jugado ninguno. |
| `GET` | `/matches/:id` | Un partido por `matchId` de EA (objeto, 404 si no existe). |

Cada `IMatch` lleva `localClub`/`awayClub` con `matchStats`, `players[]` (`IMatchPlayer`: `playerId`, `playerName`, `secondsPlayed`, `rating`, `matchEvents`…), `penaltiesScore` si hubo tanda, y a nivel de partido `result`, `winnerByDnf`, `winnerByPen`, `localTeam`.

### Logros

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/achievements` | Definiciones (`IAchievementDefinition[]`). La fuente es `packages/shared/src/achievements.definitions.ts`; el worker las sincroniza a la DB al arrancar. |

### Equipo de la semana (HOF / HOS)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/totw` | Todas las semanas (`ITOTW[]`), más reciente primero. |
| `GET` | `/totw/latest` | Última semana. |
| `GET` | `/totw/schedule` | `{ cron, timezone, nextDate }` del próximo cálculo. |
| `GET` | `/totw/:week` | Por `weekNumber` (entero) o `weekIso` (`"2026-13"`). |
| `GET` | `/totw/appearances` | Todas las apariciones (`IMemberTotwAppearances[]`). |
| `GET` | `/totw/appearances/:week` | Apariciones de una semana ISO. |

### Medias por posición

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/playeraverages` | Medias del club por posición (`IAverageStats[]`). |
| `GET` | `/playeraverages/:position` | `goalkeeper` \| `defender` \| `midfielder` \| `forward` \| `general`. |

### Admin

Requieren sesión **y** rol `admin`. Devuelven `401` sin sesión, `403` sin rol, `502` si el auth service no responde.

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| `PATCH` | `/admin/members/:playerId` | `{ "imageUrl"?: string \| null, "userId"?: string \| null }` | Foto y cuenta vinculada del miembro. `null` (o `""`) desvincula; un campo ausente no se toca. `imageUrl` debe ser `http(s)`. Una cuenta solo puede estar vinculada a un jugador: al asignarla se libera del anterior. Devuelve el miembro actualizado. |
| `POST` | `/admin/members/:playerId/image` | `{ "image": "data:image/png;base64,…" }` | Sube la foto del jugador (PNG ≤ 4 MB, la web la manda ya encuadrada a **400×450**) a Cloudflare R2 (`players/<playerId>.png`) y guarda su URL pública en `imageUrl`. Devuelve el miembro. `503 IMAGE_STORAGE_NOT_CONFIGURED` si faltan las variables `R2_*`. |
| `POST` | `/admin/image-proxy` | `{ "url": string }` | Devuelve los bytes de una imagen remota para que el editor la pinte en canvas sin CORS. Solo `http(s)` en puertos estándar, hosts públicos (se resuelve el DNS y se rechazan IPs privadas/loopback/link-local), ≤ 3 redirecciones revalidadas, ≤ 10 MB, y el tipo se decide por la firma del fichero (png/jpeg/gif/webp; nunca SVG). Es `POST` para que exija preflight de CORS. |
| `GET` | `/admin/link-requests` | — | Solicitudes de vinculación pendientes (`ILinkRequest[]`, más antiguas primero). |
| `POST` | `/admin/link-requests/:id/approve` | — | Aprueba: vincula la cuenta al jugador (misma regla que el `PATCH`) y descarta las demás pendientes del mismo usuario o jugador. Devuelve `{ request, member }`. 404 si no existe o ya no está pendiente. |
| `POST` | `/admin/link-requests/:id/reject` | — | Rechaza la solicitud. Devuelve la solicitud actualizada. |

### Variables de entorno

Ver [`apps/api/.env.example`](../apps/api/.env.example).

---

## Auth service (`apps/auth`)

Better Auth con proveedor social de **Twitch**. Cookie de sesión con dominio `COOKIE_DOMAIN` (`.casemurocity.org`).

### Better Auth

Todo lo que cuelga de `/api/auth/*` lo maneja Better Auth (sign-in social, callback, `get-session`, sign-out, delete-user…). Lo habitual desde la web se hace con el cliente (`better-auth/vue`) apuntando a `PUBLIC_AUTH_URL`. `update-user` está bloqueado (403).

Campos extra del usuario: `role` (`visitor` \| `follower` \| `subscriber` \| `vip` \| `mod` \| `admin`), `twitchId`, `twitchFollowing`, `twitchSub`, `discordId` (solo los escribe el servidor: `input: false`), y los de privacidad `showPublicName` / `showPublicImage` (booleanos, por defecto `true`). `POST /api/auth/update-user` solo admite esos dos campos: cualquier otro (nombre, imagen…) devuelve `403 Not allowed`, porque el perfil viene de Twitch.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auth/get-session` | `{ session, user }` o `null`. Es lo que usa el api para validar sesiones. |

### Rutas propias

Formato: `{ "status": "success", "data": … }` o `{ "status": "error", "message": "…" }`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/public/users?ids=a,b,c` | — | Datos públicos de usuarios (`IPublicUser[]`: `id`, `name`, `image`). `name` / `image` vienen a `null` si el usuario los ha ocultado (`showPublicName` / `showPublicImage`). Máx. 50 ids; 400 si ninguno es válido. Para mostrar la cuenta vinculada a un jugador. |
| `GET` | `/api/twitch/sync` | sesión | Re-sincroniza follow / sub / rol del usuario con Twitch. Errores: `NO_TWITCH_ACCOUNT` (404), `TWITCH_TOKEN_EXPIRED` (401), `MISSING_CHANNEL_ID` (500). |
| `GET` | `/api/admin/users?q=texto` | sesión + `admin` | Lista de usuarios (`id`, `name`, `image`, `role`, `twitchId`, `discordId`) filtrada por nombre, máx. 200. Para el selector del panel admin. |
| `GET` | `/health` | — | `{ "status": "ok" }`. |

### Variables de entorno

Ver [`apps/auth/.env.example`](../apps/auth/.env.example).

---

## Eventos (RabbitMQ)

Exchange `events` (topic). Routing keys en `EVENT_KEYS` de shared:

| Key | Payload | Estado |
|---|---|---|
| `totw.new` | `ITOTW` | activo |
| `match.new` | `IMatch` | producer comentado |
| `player.achievement.unlock.onetime` | `IAchievementEventPayload` | producer comentado |
| `player.achievement.unlock.milestone` | `IMilestoneEventPayload` | producer comentado |
