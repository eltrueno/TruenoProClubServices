# TPCS — Usar las cuentas de Casemuro desde otra web

Guía para integrar una web con el servicio de cuentas (`auth.casemuro.stream` + `accounts.casemuro.stream`). La referencia de endpoints está en [API.md](API#auth-service-appsauth); aquí está el cómo.

| Tu web está en… | Qué puedes hacer | Estado |
|---|---|---|
| Un subdominio de `casemuro.stream` | Login compartido y sesión del usuario (cookie) | Disponible, [ver abajo](#webs-dentro-de-casemurostream) |
| Otro dominio, o un servidor / bot | Consultar cuentas y su jugador vinculado con un token de API | Disponible, [ver abajo](#fuera-de-casemurostream-tokens-de-api) |

---

## Cómo funciona

- Las cuentas son de **Twitch**: no hay registro ni contraseña propios. El login vive en `https://accounts.casemuro.stream/login` y es común a todas las webs.
- Al entrar, el auth service (`https://auth.casemuro.stream`, Better Auth) deja una **cookie de sesión con dominio `.casemuro.stream`**. El navegador la envía a cualquier subdominio, así que una sesión iniciada en una web vale en todas.
- La cookie es `HttpOnly`: tu JavaScript no la lee. Lo que haces es pedir la sesión al auth service (`get-session`) y el navegador adjunta la cookie.
- Una cuenta puede estar **vinculada a un jugador** de EA (lo aprueba un admin). El vínculo es global: la misma cuenta es el mismo jugador en todos los clubes.

---

## Webs dentro de `casemuro.stream`

### 1. Pide que se dé de alta tu origen

El auth service y las APIs de los clubes solo aceptan peticiones con credenciales de orígenes conocidos. Pásale al administrador el origen exacto de tu web (esquema + host, sin barra final, p. ej. `https://miweb.casemuro.stream`) para que lo añada a:

- `ALLOWED_ORIGINS` del **auth service** (obligatorio).
- `ALLOWED_ORIGINS` de la **API de cada club** que vayas a llamar con sesión (solo si usas rutas con sesión, ver [paso 4](#4-opcional-el-jugador-de-la-cuenta)).

Sin esto el navegador bloquea las respuestas por CORS. Tiene que ser `https`.

> Dar de alta un origen es darle confianza: esa web recibe los datos de la sesión del usuario, **email incluido**, y puede hacer en su nombre lo mismo que la web de la cuenta. Solo para webs de la comunidad.

### 2. Iniciar sesión

Manda al usuario al login de accounts con la URL a la que tiene que volver:

```js
const login = () => {
    const back = encodeURIComponent(window.location.href)
    window.location.href = `https://accounts.casemuro.stream/login?redirect=${back}`
}
```

- `redirect` solo admite webs `https` de `casemuro.stream` y sus subdominios; cualquier otra cosa se ignora y el usuario acaba en la página de su cuenta.
- Si el usuario ya tiene sesión, el login lo devuelve directamente a `redirect`.
- No hay parámetros en la vuelta (ni código ni token): la sesión ya está en la cookie. Al cargar tu página, léela como en el paso 3.

### 3. Leer la sesión

**Desde el navegador:**

```js
const res = await fetch("https://auth.casemuro.stream/api/auth/get-session", {
    credentials: "include", // sin esto no viaja la cookie
})
const data = await res.json() // { session, user } o null si no hay sesión
const user = data?.user ?? null
```

Con el cliente de Better Auth (`better-auth`, misma versión mayor que el servidor: 1.x) es lo mismo con estado reactivo:

```js
import { createAuthClient } from "better-auth/vue" // o /react, /svelte, /client

export const authClient = createAuthClient({ baseURL: "https://auth.casemuro.stream" })

const session = authClient.useSession() // session.value.data?.user
```

**Desde tu servidor** (SSR o un backend en un subdominio): la cookie llega en la petición del usuario; reenvíala tal cual.

```js
const res = await fetch("https://auth.casemuro.stream/api/auth/get-session", {
    headers: { cookie: req.headers.cookie ?? "" },
})
const user = (await res.json())?.user ?? null
```

Así validan la sesión las APIs de los clubes. No guardes la cookie ni el objeto `session` (lleva el token de sesión): valida en cada petición o cachea solo el `user` unos segundos.

**El usuario (`user`):**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Id de la cuenta. Es la clave para todo lo demás. |
| `name` | `string` | Nombre de Twitch. |
| `image` | `string \| null` | Avatar de Twitch. |
| `email` | `string` | Dato privado: no lo muestres ni lo guardes si no lo necesitas. |
| `role` | `string` | `visitor` \| `follower` \| `subscriber` \| `vip` \| `mod` \| `admin`. |
| `twitchId` | `string \| null` | Id numérico de Twitch. |
| `twitchFollowing` | `boolean` | Sigue al canal. |
| `twitchSub` | `boolean` | Es sub del canal. |
| `twitchSubTier` | `string \| null` | `"1000"` / `"2000"` / `"3000"`. |
| `twitchSyncedAt` | fecha | Última vez que se comprobó follow / sub / rol. |
| `twitchNeedsReauth` | `boolean` | El permiso de Twitch ya no sirve: follow / sub pueden estar desfasados hasta que vuelva a iniciar sesión. |
| `showPublicName`, `showPublicImage` | `boolean` | Privacidad: si es `false`, no enseñes su nombre / avatar junto a su jugador. |
| `discordId` | `string \| null` | Reservado, hoy vacío. |

Follow, sub y rol se refrescan solos (al entrar, y en segundo plano si tienen más de 6 h). No hace falta que llames a nada.

**Permisos:** para "solo subs", "solo mods"… usa `role` (ya tiene en cuenta follow y sub). Compruébalo siempre en tu servidor si protege algo de verdad; lo que decide el JavaScript del navegador lo puede saltar cualquiera.

### 4. (Opcional) El jugador de la cuenta

La API de cada club (`https://api.casemuro.stream` para City; cada club tiene la suya) responde con el jugador de la sesión. Necesita tu origen en su `ALLOWED_ORIGINS`.

```js
const res = await fetch("https://api.casemuro.stream/members/me/identity", { credentials: "include" })
const { data } = await res.json()
// data.playerId: EA ID vinculado a la cuenta (null si no tiene), igual en todos los clubes
// data.member:   su ficha en este club (null si no ha jugado aquí)
```

Con el `playerId`, el resto es público y no necesita sesión ni alta: `GET /members/:playerId` (ficha, stats, logros, TOTW), `GET /matches`… Ver [API.md](API#miembros).

Al revés, de jugador a cuenta: los miembros traen `userId`, y `GET https://auth.casemuro.stream/api/public/users?ids=a,b` devuelve nombre y avatar públicos (respetando la privacidad del usuario).

### 5. Cerrar sesión

```js
await fetch("https://auth.casemuro.stream/api/auth/sign-out", { method: "POST", credentials: "include" })
// o: await authClient.signOut()
```

Cierra la sesión en **todas** las webs de `casemuro.stream`, no solo en la tuya. Para gestionar la cuenta (privacidad, jugador vinculado, borrarla) enlaza a `https://accounts.casemuro.stream`.

### Qué no puedes hacer

- Cambiar el perfil: nombre, avatar y email vienen de Twitch. `update-user` solo admite `showPublicName` / `showPublicImage`.
- Cambiar roles o vincular jugadores: es cosa de los admins (`accounts.casemuro.stream/admin`).
- Usar el token de Twitch del usuario: no sale del auth service.

### Desarrollo en local

La cookie de producción no llega a `localhost` y el login no redirige allí, así que contra producción no se puede probar desde local. Opciones:

- **Con el repositorio:** `pnpm dev:local` levanta auth, API y accounts en localhost, con usuarios de prueba (visitante, seguidor, sub, admin) sin pasar por Twitch. Ver el [README](https://github.com/eltrueno/TruenoProClubServices#readme) (`pnpm dev:local`). Apunta tu web a `http://localhost:3001` (auth) y `http://localhost:4323/login` (login).
- **Sin el repositorio:** prueba en tu subdominio real una vez dado de alta.

### Si algo falla

| Síntoma | Causa habitual |
|---|---|
| Error de CORS en la consola | Tu origen no está en `ALLOWED_ORIGINS` del servicio al que llamas, o no coincide exactamente (http/https, `www`, barra final). |
| `get-session` devuelve `null` con sesión iniciada | Falta `credentials: "include"`, o tu web no está bajo `casemuro.stream`, o no va por `https`. |
| Tras el login acabas en la página de la cuenta | `redirect` no es una URL `https` de `casemuro.stream`, o no va codificada con `encodeURIComponent`. |
| `401` en `/members/me/*` | No hay sesión. `502 AUTH_UNAVAILABLE`: la API no ha podido hablar con el auth service. |
| `403` en `sign-out` u otro `POST` | Origen no dado de alta en el auth service. |

---

## Fuera de `casemuro.stream`: tokens de API

Desde otro dominio no hay login ni sesión: la cookie no se envía fuera de `casemuro.stream` y no hay "Iniciar sesión con Casemuro" (OAuth) para terceros. Lo que hay es una **consulta de servidor a servidor** con un token: le das una cuenta de Twitch y te dice qué cuenta de Casemuro es y qué jugador tiene vinculado.

Caso típico: una web de drafts que lee el chat de Twitch. Cuando alguien se apunta, pregunta por su id de Twitch y, si tiene jugador, enseña su ficha y sus stats.

### 1. Pide un token

Los crea un admin en `https://accounts.casemuro.stream/admin` (sección "Tokens de API"), uno por aplicación. Tiene esta pinta: `tpcs_…` (48 caracteres).

- Se muestra **una sola vez**, al crearlo. Si se pierde, se revoca y se crea otro.
- Es un secreto: guárdalo en una variable de entorno de tu servidor. **No lo pongas en JavaScript de navegador, en una app ni en un repositorio**; quien lo vea puede usarlo. Si se filtra, avisa para revocarlo.
- Solo sirve para leer. No da acceso al email ni permite cambiar nada.

### 2. Consulta cuentas

```
GET https://auth.casemuro.stream/api/v1/accounts
Authorization: Bearer tpcs_…
```

| Parámetro | Qué es |
|---|---|
| `twitchIds` | Ids numéricos de Twitch, separados por comas. **El recomendado**: no cambia nunca (en el chat es la etiqueta `user-id`). |
| `twitchLogins` | Nombres de usuario de Twitch, sin distinguir mayúsculas. Puede no encontrar a quien se ha cambiado el nombre hace poco o usa un nombre visible distinto del de usuario (p. ej. con caracteres no latinos). |
| `ids` | Ids de cuenta de Casemuro (el `userId` que traen los miembros en la API de los clubes). |

Se pueden combinar. Máximo 100 valores por petición entre los tres; los que no tienen formato válido se ignoran.

```js
const res = await fetch("https://auth.casemuro.stream/api/v1/accounts?twitchIds=123456789,987654321", {
    headers: { Authorization: `Bearer ${process.env.CASEMURO_API_TOKEN}` },
})
const { data } = await res.json()
```

```json
{
  "status": "success",
  "data": [
    {
      "id": "66f1a2b3c4d5e6f708192a3b",
      "name": "NombreEnTwitch",
      "image": "https://static-cdn.jtvnw.net/…/profile_image-300x300.png",
      "role": "subscriber",
      "twitchId": "123456789",
      "twitchFollowing": true,
      "twitchSub": true,
      "twitchSubTier": "1000",
      "twitchSyncedAt": "2026-11-15T17:40:43.000Z",
      "twitchNeedsReauth": false,
      "playerId": "1003297613"
    }
  ]
}
```

- **Quien no tiene cuenta no viene en `data`** (no hay error ni entrada vacía). En el ejemplo, `987654321` no se ha registrado. Empareja por `twitchId`, no por posición.
- `playerId` es el EA ID del jugador vinculado, el mismo en todos los clubes; `null` si la cuenta no tiene jugador.
- `role`: `visitor` \| `follower` \| `subscriber` \| `vip` \| `mod` \| `admin`. `twitchSubTier`: `"1000"` / `"2000"` / `"3000"` o `null`.
- Follow y sub son los de la última comprobación (`twitchSyncedAt`); se refrescan cada pocas horas, no al momento. Con `twitchNeedsReauth: true` pueden estar desfasados hasta que el usuario vuelva a entrar.
- Aquí **no** se aplican los ajustes de privacidad del usuario: `name` e `image` vienen siempre. Si los enseñas en público junto a su jugador, es responsabilidad de tu web.

### 3. Pide el jugador y sus stats

Con el `playerId`, lo demás es la API pública de cada club, **sin token**:

```js
// Ficha completa en un club: miembro, stats (oficiales y amistosos), logros y TOTW
const res = await fetch(`https://api.casemuro.stream/members/${playerId}`)
if (res.status === 404) { /* ese jugador no ha jugado en este club */ }
const { response } = await res.json() // { member, stats: { official, friendly }, achievements, totw }
```

Cada club tiene su API (`https://api.casemuro.stream` es la de City) y un jugador puede estar en uno, en varios o en ninguno. Las stats vienen con un documento por posición. Todo el detalle, en [API.md](API#miembros).

### Errores y límites

Formato: `{ "status": "error", "code": "…", "message": "…" }`.

| HTTP | `code` | Qué pasa |
|---|---|---|
| `401` | `INVALID_TOKEN` | Falta la cabecera `Authorization: Bearer …`, o el token no existe o está revocado. |
| `400` | `NO_VALID_PARAMS` | No has pasado ningún `twitchIds` / `twitchLogins` / `ids` válido. |
| `400` | `TOO_MANY` | Más de 100 valores en una petición: pártela. |
| `429` | `RATE_LIMITED` | Más de 120 peticiones por minuto con ese token. Espera lo que diga `Retry-After` (segundos). |
| `502` | `PLAYERS_UNAVAILABLE` | No se ha podido consultar los jugadores vinculados. Reintenta más tarde; no lo trates como "sin jugador". |

Consejos: agrupa varias cuentas en una petición en vez de hacer una por persona, y cachea el resultado unos minutos (el vínculo con el jugador cambia muy pocas veces).

### Lo que es público sin token

- Todo lo de solo lectura de la API de cada club: miembros, stats, partidos, logros, TOTW ([API.md](API#rest-api-appsapi)).
- `GET https://auth.casemuro.stream/api/public/users?ids=…`: nombre y avatar de una cuenta a partir de su id, aplicando su privacidad.
- `GET https://api.casemuro.stream/members/by-user?ids=…`: jugador vinculado a una cuenta a partir de su id.
