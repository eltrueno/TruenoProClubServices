# TPCS — Endpoints

Referencia de los dos servicios HTTP del monorepo:

- **REST API** (`apps/api`) — `https://api.casemuro.stream`
- **Auth service** (`apps/auth`) — `https://auth.casemuro.stream`

Los tipos de todas las respuestas están en `packages/shared` (`IClubMember`, `IMatch`, `IPlayerStats`, `ITOTW`, `IAchievementUnlocked`, `IPlayerProfile`, `ApiResponse<T>`…).

---

## Conceptos

- **`playerId`**: id del jugador en EA (personaId). Es la clave de todo lo relacionado con un jugador y no cambia aunque cambie de nombre. Sale de `clubs/matches` de EA (clave del objeto `players[clubId]`).
- **`playerName`**: último gamertag visto para ese `playerId`. Solo para mostrar. Los miembros guardan además `nameHistory[]`.
- **Sesión**: la pone el auth service en una cookie de dominio `.casemuro.stream`. Las rutas protegidas del api la validan reenviándola a `AUTH_URL/api/auth/get-session`; la web tiene que hacer `fetch(..., { credentials: "include" })`.
- **Minutos mínimos**: un jugador con menos de 15' (`secondsPlayed < 900`, `MIN_SECONDS_PLAYED`) se guarda en el partido, pero ese partido no cuenta para sus stats, medias, logros ni TOTW.
- **Partido nulo** (`voided: true`): nadie de ninguno de los dos equipos llega a 15'. Se guarda y se devuelve como cualquier otro, pero no cuenta para nada (stats, logros, medias, TOTW, rachas de la web). `voidedBy`: `auto` (por los minutos) o `admin` (marcado o desmarcado a mano, ver `PUT /admin/matches/:matchId/voided`).
- **Abandono en amistosos**: EA no marca `winnerByDnf` en amistosos, pero sí fuerza el 3-0 al que se va. El worker lo pone si el partido se cortó antes del minuto 80 **y** hay ese 3-0 forzado que no cuadra con los goles de los jugadores; pierde el que se fue y se guarda el marcador real, como en liga.
- **Base compartida** (`SHARED_DB_NAME`, por defecto `tpcs27_shared`): además de la base de cada club (`MONGO_URL`), hay una común a todos los clubes para lo que es de la persona y no del club. Cuelga de la misma conexión (`useDb`), así que el usuario de Mongo de cada club solo necesita `readWrite` también sobre ella. Colecciones `players` (`IPlayerIdentity`: `playerId, userId, imageUrl`) y `link_requests`.
- **Vinculación cuenta ↔ jugador** (`IPlayerIdentity.userId`, global): la misma cuenta es el mismo jugador en todos los clubes. La hace un admin, bien directamente (`PATCH /admin/members/:playerId`), bien aprobando una **solicitud** que el propio usuario crea desde "Mi jugador" en accounts.casemuro.stream (`POST /members/me/link-request`, en el api de un club donde aparece el jugador). Colección `link_requests` en la base compartida (`ILinkRequest`: `id, userId, userName, userImage, playerId, playerName, status: pending|approved|rejected, createdAt, resolvedAt, resolvedBy`). Un usuario solo puede tener una solicitud pendiente y una cuenta solo puede estar vinculada a un jugador (índice único en la base compartida). Cada api solo devuelve las pendientes de jugadores de su plantilla; el panel admin (accounts.casemuro.stream/admin) pide las de cada club al api de ese club.
- **Cuentas borradas:** las cuentas están en la base del auth y la vinculación en la compartida, así que borrar una cuenta no toca la vinculación por sí solo. accounts desvincula el jugador antes de borrar (`DELETE /members/me/identity`) y, como red de seguridad, cada api repasa cada `IDENTITY_CLEANUP_HOURS` (24 por defecto) los vínculos: pregunta al auth (`GET /api/public/users`, en lotes de 50) qué cuentas existen y libera los jugadores de las que no (y retira sus solicitudes pendientes). Si el auth falla, si no aparece ninguna de las cuentas consultadas o si de golpe faltaran más de la mitad (3 o más), no toca nada y lo deja en el log.
- **Fotos** (híbrido): cada jugador tiene una foto **global** (`IPlayerIdentity.imageUrl`, la ven todos los clubes) y cada club puede taparla con **la suya** (`members.imageUrl`). El api devuelve en `IClubMember.imageUrl` la efectiva (la del club si la hay, si no la global) e `imageSource: "club" | "global" | null` para saber de dónde sale.
- **Migración**: al arrancar, el api pasa una sola vez el vínculo y las fotos de `members` a la base compartida y copia allí las `link_requests` (marca `shared-player-identity-v1` en la colección `migrations` de la base del club). Lo que ya haya en la global no se pisa; si la global ya tiene otra foto, la del club se conserva como propia.

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
| `GET` | `/members/me` | sesión | Miembro vinculado a la cuenta con sesión (`IClubMember` o `null`). `null` también si la cuenta tiene jugador pero no ha jugado en este club. |
| `GET` | `/members/me/identity` | sesión | Jugador de la cuenta en una sola petición: `{ playerId: string \| null, member: IClubMember \| null }`. `playerId` es el EA ID vinculado (global, juegue o no en este club) y `member` su miembro aquí si juega en este club. Distingue "sin vincular" de "vinculado, pero sin partidos aquí". |
| `DELETE` | `/members/me/identity` | sesión | La cuenta suelta su jugador y retira su solicitud pendiente: `{ unlinked: boolean }`. Lo llama accounts justo antes de borrar la cuenta. Volver a vincularlo exige una solicitud aprobada por un admin. |
| `GET` | `/members/me/link-request` | sesión | Solicitud de vinculación pendiente de la cuenta (`ILinkRequest` o `null`). |
| `POST` | `/members/me/link-request` | sesión | Body `{ "playerId": string }`. Crea la solicitud (sustituye a la pendiente anterior si la había). `404` si el jugador no existe, `409 ALREADY_LINKED` si la cuenta ya tiene jugador, `409 PLAYER_TAKEN` si el jugador ya tiene cuenta. |
| `DELETE` | `/members/me/link-request` | sesión | Cancela la solicitud pendiente. `{ cancelled: boolean }`. |
| `GET` | `/members/by-user?ids=a,b` | — | Jugador vinculado a cada cuenta: `[{ userId, playerId }]`, solo las que tienen uno (las demás no vienen). Máx. 100 ids; `400` sin ids o con más. La vinculación es global: responde lo mismo el api de cualquier club. Lo usa el auth service para `GET /api/v1/accounts`. |
| `GET` | `/members/:playerId` | — | Perfil completo (`IPlayerProfile`): `{ member, stats: { official, friendly }, achievements, account, totw }`. `achievements` son sus logros de club en este club; `account`, sus logros de cuenta y puntos (`IAccountAchievements`), o `null` si no tiene cuenta vinculada o la base compartida no responde. 404 si no existe. |

`achievements` y `account.achievements` vienen con la definición embebida: `{ playerId, playerName, achievementId, reached?, unlockedAt, matchId?, definition }` (ver [Logros](#logros)).

### Partidos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/matches` | Todos los partidos (`IMatch[]`). |
| `GET` | `/matches/ordered?limit=N` | Más recientes primero. |
| `GET` | `/matches/ordered/:type?limit=N` | `type` = `league` \| `playoff` \| `friendly`. |
| `GET` | `/matches/player/:playerId?limit=N` | Partidos en los que aparece el jugador (incluye los de menos de 15' y los nulos). Lista vacía si no ha jugado ninguno. |
| `GET` | `/matches/:id` | Un partido por `matchId` de EA (objeto, 404 si no existe). |

Cada `IMatch` lleva `localClub`/`awayClub` con `matchStats`, `players[]` (`IMatchPlayer`: `playerId`, `playerName`, `secondsPlayed`, `rating`, `matchEvents`…), `penaltiesScore` si hubo tanda, y a nivel de partido `result`, `winnerByDnf`, `winnerByPen`, `localTeam`, `voided` y `voidedBy`.

### Logros

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/achievements` | — | Definiciones de los logros **de club** (`IAchievementDefinition[]`). Salen de la DB, que el worker deja igual que `packages/shared/src/achievements.definitions.ts` al arrancar. |
| `GET` | `/achievements/account` | — | Definiciones de los logros **de cuenta** (`packages/shared/src/achievements.account.ts`; no pasan por la DB). Iguales en el api de cualquier club. |
| `GET` | `/members/me/achievements` | sesión | Logros de cuenta y puntos de la cuenta con sesión: `{ playerId, clubId, userId, achievements, points }` (`IAccountAchievements` más `playerId` —jugador vinculado o `null`— y `clubId` —el id de EA de ESTE club, para saber de qué club es cada entrada de `points.clubs`—). |

**Definición** (`IAchievementDefinition`): `_id`, `name`, `description`, `type` (`club` \| `account`), `category` (apartado en el que se enseña: `milestones`, `matches`, `attack`, `performance`, `defense`, `discipline`, `team`, `streaks`, `expert`, `curiosities`, y para los de cuenta `account`, `global`, `collection`; etiquetas en `ACHIEVEMENT_CATEGORY_LABELS`), `points`, `rarity` (`common` ≤ 10 puntos, `rare` ≤ 25, `epic` ≤ 50, `legendary` por encima: sale de los puntos con `rarityFromPoints`), `hidden` (logro oculto: mientras no se consigue, la web enseña que existe pero no qué es; lo son las curiosidades y los legendarios, `isHiddenAchievement`. Es solo visual: la API devuelve la definición completa), `metric` (qué se mide, `ACHIEVEMENT_METRICS`), `scope` (`cumulative` \| `match`), `mode` (`unique` \| `infinite`) y `step` / `threshold` / `exact`.

**Logros de club.** Cuentan todos los partidos del jugador en el club, oficiales y amistosos juntos (menos los nulos y los de menos de 15'). Hay de cuatro clases según de dónde sale la métrica:

- totales del jugador (goles, partidos, victorias…),
- un partido concreto, del jugador (5 goles, portero que marca, 100% de pases…) o del equipo (ganar por 5, 10 goles, tanda de penaltis, 11 del club…); los de equipo se los lleva cada jugador del club que juega ese partido,
- rachas (victorias seguidas, partidos marcando, sequía de delantero…),
- calendario, en la hora local del club (`TZ`): partidos en un día, días distintos, semanas seguidas, fin de semana, fechas señaladas…

Para rachas y calendario el worker guarda un estado por jugador (`achievements_progress`, `IAchievementProgress`) que avanza con cada partido que cuenta, **en orden cronológico** (por eso los partidos nuevos se insertan ordenados por fecha). Los hitos (`mode: "infinite"`) dan un desbloqueo por cada escalón (`reached`: 25, 50…), cada uno con sus `points`.

Si al arrancar el worker ve que ha desaparecido un logro, que le han cambiado las condiciones (`metric`, `scope`, `type`, `mode`, `step`, `threshold`, `exact`) o que hay uno nuevo, rehace stats, estado y logros desde el historial, en silencio y con la fecha del partido en que se consigue cada uno. Cambiar nombre, descripción, apartado o puntos no rehace nada. Ahora mismo no hay logros del equipo de la semana (el motor los sigue soportando: métricas `totwBest` / `totwWorst`).

**Logros de cuenta.** Comunes a todos los clubes y solo para cuentas vinculadas a su jugador. Al vincularse se reciben de golpe los que ya se cumplan y **no se pierden nunca** (ni al dejar de ser sub, ni al desconectar Discord, ni al desvincularse). Viven en la base compartida:

- `player_club_totals` (`IPlayerClubTotals`): lo que lleva cada jugador en cada club (partidos, victorias, goles, asistencias, último día jugado, logros de club y sus puntos). Cada worker escribe solo las filas de su club; juntas dan los totales "entre clubes" sin que un club lea la base de otro.
- `account_achievements_unlocked` (`IAccountAchievementUnlocked`: `userId, playerId, achievementId, reached?, unlockedAt`), con índice único para que dos workers no dupliquen.

Cada worker, al arrancar y después de cada sincronización (`WORKER_INTERVAL`), actualiza su resumen y evalúa a todas las cuentas vinculadas. Los datos de la cuenta (Discord, follow, sub y nivel, antigüedad) los pide al auth con un token de API (`AUTH_URL`, `AUTH_API_TOKEN`, `GET /api/v1/accounts?ids=`). Sin token, o si el auth no responde, se evalúan solo los que dependen del juego y los de la cuenta se dejan para la siguiente (no se da por hecho que alguien no es sub).

**Puntos** (`IAccountAchievements.points`): `account` (logros de cuenta), `clubs[]` (`{ clubId, points, achievements }` de los logros de club en cada club) y `total`. Pensados para rankings y para la futura economía del canal.

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
| `PATCH` | `/admin/members/:playerId` | `{ "imageUrl"?: string \| null, "userId"?: string \| null, "imageScope"?: "global" \| "club" }` | Foto y cuenta vinculada del miembro. `null` (o `""`) desvincula / quita; un campo ausente no se toca. `imageUrl` debe ser `http(s)`. `imageScope` (por defecto `global`): `global` guarda la foto de todos los clubes y quita la propia de este para que se vea; `club` guarda solo la de este club (`null` la quita y vuelve a verse la global). El vínculo es siempre global; una cuenta solo puede estar en un jugador: al asignarla se libera del anterior. Devuelve el miembro actualizado. |
| `POST` | `/admin/members/:playerId/image` | `{ "image": "data:image/png;base64,…", "scope"?: "global" \| "club" }` | Sube la foto del jugador (PNG ≤ 4 MB, la web la manda ya encuadrada a **400×450**) a Cloudflare R2 y la asigna con el mismo alcance que el `PATCH`. Claves en el bucket (común a todos los clubes): global `players/<playerId>.png`, de club `players/club-<CLUBID>/<playerId>.png`. Devuelve el miembro. `503 IMAGE_STORAGE_NOT_CONFIGURED` si faltan las variables `R2_*`. |
| `POST` | `/admin/image-proxy` | `{ "url": string }` | Devuelve los bytes de una imagen remota para que el editor la pinte en canvas sin CORS. Solo `http(s)` en puertos estándar, hosts públicos (se resuelve el DNS y se rechazan IPs privadas/loopback/link-local), ≤ 3 redirecciones revalidadas, ≤ 10 MB, y el tipo se decide por la firma del fichero (png/jpeg/gif/webp; nunca SVG). Es `POST` para que exija preflight de CORS. |
| `GET` | `/admin/link-requests` | — | Solicitudes de vinculación pendientes de jugadores de este club (`ILinkRequest[]`, más antiguas primero). |
| `POST` | `/admin/link-requests/:id/approve` | — | Aprueba: vincula la cuenta al jugador (misma regla que el `PATCH`) y descarta las demás pendientes del mismo usuario o jugador. Devuelve `{ request, member }`. 404 si no existe o ya no está pendiente. |
| `POST` | `/admin/link-requests/:id/reject` | — | Rechaza la solicitud. Devuelve la solicitud actualizada. |
| `PUT` | `/admin/matches/:matchId/voided` | `{ "voided": true \| false \| null }` | Marca (`true`) o desmarca (`false`) el partido como nulo a mano (`voidedBy: "admin"`); `null` lo devuelve al criterio automático. Avisa al worker por RabbitMQ (`stats.recalculate`) y este recalcula stats, logros y medias al momento. Devuelve `{ match, recalculation: "queued" \| "unavailable" }` (`unavailable`: RabbitMQ no respondió o falta `RABBITMQ_URL`; el cambio queda guardado, pero sin recalcular). 404 si no existe. |

### Variables de entorno

Ver [`apps/api/.env.example`](../apps/api/.env.example).

---

## Auth service (`apps/auth`)

Better Auth con proveedor social de **Twitch**. Cookie de sesión con dominio `COOKIE_DOMAIN` (`.casemuro.stream`).

> Para integrar otra web con las cuentas (alta del origen, login, leer la sesión, tokens de API para servicios de fuera, ejemplos), ver la guía **[AUTH](AUTH)**.

### Better Auth

Todo lo que cuelga de `/api/auth/*` lo maneja Better Auth (sign-in social, callback, `get-session`, sign-out, delete-user…). Lo habitual desde la web se hace con el cliente (`better-auth/vue`) apuntando a `PUBLIC_AUTH_URL`. `update-user` está bloqueado (403).

Campos extra del usuario: `role` (`visitor` \| `follower` \| `subscriber` \| `vip` \| `mod` \| `admin`), `twitchId`, `twitchFollowing`, `twitchSub`, `twitchSubTier` (`"1000"` / `"2000"` / `"3000"` o `null`), `twitchSyncedAt` (última sincronización correcta), `twitchSyncAttemptAt` (último intento, haya salido bien o no), `twitchNeedsReauth` (el token de Twitch ya no sirve: hay que volver a iniciar sesión), `discordId` y `discordName` (Discord vinculado, ver abajo) (solo los escribe el servidor: `input: false`), y los de privacidad `showPublicName` / `showPublicImage` (booleanos, por defecto `true`). `POST /api/auth/update-user` solo admite esos dos campos: cualquier otro (nombre, imagen…) devuelve `403 Not allowed`, porque el perfil viene de Twitch.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auth/get-session` | `{ session, user }` o `null`. Es lo que usa el api para validar sesiones. |

#### Discord vinculado

Se entra siempre con Twitch; Discord solo se **vincula** a una cuenta que ya existe, para que el bot sepa a quién mencionar. Hace falta `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` (si no, no hay proveedor) y el redirect `<BETTER_AUTH_URL>/api/auth/callback/discord` en la app de Discord.

- **Vincular:** `POST /api/auth/link-social` con `{ provider: "discord", callbackURL, errorCallbackURL }` (sesión). Devuelve la URL de Discord. Solo se pide el permiso `identify` (id y nombre, sin email); por eso mismo no se puede crear ni abrir una cuenta con Discord. Al volver, el usuario tiene `discordId` y, un momento después, `discordName` (nombre de usuario de Discord). Si esa cuenta de Discord ya está en otra cuenta, vuelve a `errorCallbackURL` con `error=account_already_linked_to_different_user`.
- **Desvincular:** `DELETE /api/discord/link` (abajo). Borra la cuenta enlazada con sus tokens y deja `discordId` / `discordName` a `null`.
- **Cerrado a propósito** (`403`): `sign-in/social` con un proveedor que no sea `twitch`, `link-social` con uno que no sea `discord`, y `unlink-account` entero (por ahí se podría soltar Twitch y dejar la cuenta sin forma de entrar).

#### Sincronización con Twitch

Follow, sub (con nivel) y rol se refrescan solos, sin que el usuario tenga que pulsar nada:

- **Al iniciar sesión**, en cada login (no solo el primero).
- **Al leer la sesión** (`get-session`), si la última sincronización tiene más de `TWITCH_SYNC_STALE_MINUTES` (6 h por defecto). Va en segundo plano: esa respuesta trae los datos de antes y la siguiente ya los nuevos.
- **Un repaso periódico** cada `TWITCH_SYNC_INTERVAL_MINUTES` (60 por defecto) para quien no entra en la web: hasta 200 usuarios por pasada, primero los que llevan más tiempo sin intentarse.
- **A mano**, con `GET /api/twitch/sync` (como mucho una vez cada 30 s).

Si un intento falla (Twitch caído, cuenta sin token…), ni el segundo plano ni el repaso lo reintentan hasta pasados `TWITCH_SYNC_RETRY_MINUTES` (10 por defecto): así una caída de Twitch no se convierte en tres peticiones a Twitch por cada carga de página.

El rol se guarda con condición: solo si el rol que hay en la base de datos en ese momento no es `admin`, `mod` ni `vip`. Si un admin cambia un rol mientras dura una sincronización, gana el cambio del admin.

Los tokens de Twitch (`accessToken`, `refreshToken` de la colección `account`) se guardan **cifrados** (`account.encryptOAuthTokens`, clave `BETTER_AUTH_SECRET`). Los que ya existían en claro se siguen leyendo y se cifran solos en el siguiente login o renovación. Si cambia `BETTER_AUTH_SECRET`, los tokens cifrados dejan de poder leerse y esas cuentas pasan a `twitchNeedsReauth` hasta que vuelvan a entrar.

El follow se da por bueno si la respuesta de `channels/followed?broadcaster_id=<canal>` trae ese canal en `data` (su `total` es cuántos canales sigue el usuario en total, no si sigue este). `TWITCH_CHANNEL_ID` tiene que ser el id numérico del canal: vacío o inválido devuelve `MISSING_CHANNEL_ID` sin consultar nada.

Los permisos de Twitch (`user:read:follows`, `user:read:subscriptions`) los pide el servidor en todos los logins (`TWITCH_SCOPES` en `packages/auth`). Si Twitch falla en una de las dos consultas se conserva el valor anterior (antes un error contaba como "no es sub"). Si el token no tiene esos permisos o sigue dando 401 después de renovarlo, se marca `twitchNeedsReauth` y no se vuelve a intentar hasta el siguiente login. Los roles `admin`, `mod` y `vip` nunca se tocan.

### Rutas propias

Formato: `{ "status": "success", "data": … }` o `{ "status": "error", "message": "…" }`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/public/users?ids=a,b,c` | — | Datos públicos de usuarios (`IPublicUser[]`: `id`, `name`, `image`). `name` / `image` vienen a `null` si el usuario los ha ocultado (`showPublicName` / `showPublicImage`). Máx. 50 ids; 400 si ninguno es válido. Para mostrar la cuenta vinculada a un jugador. |
| `GET` | `/api/twitch/sync` | sesión | Re-sincroniza follow / sub / rol del usuario con Twitch. Devuelve `twitchFollowing`, `twitchSub`, `twitchSubTier`, `role`, `twitchSyncedAt` y `partial` (`true` si Twitch falló en una consulta y se conservó el valor anterior). Errores: `NO_TWITCH_ACCOUNT` (404), `TWITCH_TOKEN_EXPIRED` (401: token caducado, revocado o sin permisos; hay que volver a iniciar sesión), `TWITCH_UNAVAILABLE` (el código de Twitch, o 502: fallaron las dos consultas y no se cambió nada), `TWITCH_SYNC_TOO_SOON` (429 con `Retry-After` y `retryAfterSeconds`: menos de 30 s desde la anterior), `MISSING_CHANNEL_ID` (500). |
| `GET` | `/api/discord` | sesión | `{ enabled, discordId, discordName }`: si se puede vincular Discord (hay credenciales) y qué tiene vinculado la cuenta. |
| `DELETE` | `/api/discord/link` | sesión | Desvincula Discord de la cuenta. `{ unlinked: boolean }` (`false` si no había nada). No exige sesión reciente. |
| `GET` | `/api/admin/users?q=texto` | sesión + `admin` | Lista de usuarios (`id`, `name`, `image`, `role`, `twitchId`, `discordId`) filtrada por nombre, máx. 200. Para el selector del panel admin. |
| `GET` | `/api/admin/tokens` | sesión + `admin` | Tokens de API (`id`, `name`, `hint` —principio del token—, `createdAt`, `createdBy`, `lastUsedAt`). Nunca devuelve el token. |
| `POST` | `/api/admin/tokens` | sesión + `admin` | Body `{ "name": string }` (máx. 60). Crea un token y lo devuelve en `token` **solo en esta respuesta** (`201`); en la base queda su hash SHA-256 (colección `api_tokens`). `400 INVALID_NAME`. |
| `DELETE` | `/api/admin/tokens/:id` | sesión + `admin` | Revoca (borra) el token: deja de valer en el acto. `404 NOT_FOUND`. |
| `GET` | `/api/v1/accounts?twitchIds=&twitchLogins=&discordIds=&ids=` | token de API | Para servicios externos (`Authorization: Bearer tpcs_…`), de servidor a servidor. Cuentas por id de Twitch, nombre de usuario de Twitch (sin distinguir mayúsculas), id de Discord o id de cuenta; máx. 100 valores. Devuelve `id`, `name`, `image`, `role`, `twitchId`, `twitchFollowing`, `twitchSub`, `twitchSubTier`, `twitchSyncedAt`, `twitchNeedsReauth`, `discordId`, `discordName`, `createdAt` y `playerId` (jugador vinculado, lo pide a `CLUB_API_URL/members/by-user`). Las que no existen no vienen. Sin email y sin aplicar `showPublicName` / `showPublicImage`. Errores: `401 INVALID_TOKEN`, `400 NO_VALID_PARAMS` / `TOO_MANY`, `429 RATE_LIMITED` (`API_TOKEN_RATE_LIMIT` por minuto y token, 120 por defecto; en memoria), `502 PLAYERS_UNAVAILABLE`. Guía de uso en **[AUTH](AUTH#fuera-de-casemurostream-tokens-de-api)**. |
| `GET` | `/health` | — | `{ "status": "ok" }`. |
| `GET` | `/api/dev/status` | — | **Solo en desarrollo** (`DEVMODE=true` + `DEV_LOGIN=true` + `BETTER_AUTH_URL` en localhost; si no, la ruta no existe). Usuarios de prueba disponibles. |
| `POST` | `/api/dev/login` | — | **Solo en desarrollo.** Body `{ "preset": "visitante" \| "seguidor" \| "sub" \| "admin" }`. Crea (o reutiliza) ese usuario de prueba y deja la cookie de sesión, sin Twitch. Lo usa `pnpm dev:local`. |

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
| `stats.recalculate` | `IStatsRecalculatePayload` | activo · **api → worker**: un admin ha marcado o desmarcado un partido como nulo. El worker lo consume en su cola durable `worker.stats-recalculate` y recalcula stats, logros y medias (si llegan varios seguidos, uno solo). Necesita `RABBITMQ_URL` también en el api, con el mismo vhost que el worker del club. |
