# Trueno Pro Club Services

Sistema de gestión para clubes de Pro Clubs (EA FC): miembros, partidos, estadísticas, logros, equipo de la semana, cuentas vinculadas y anuncios en Discord. Multi-club: un mismo código se compila por club (`PUBLIC_CLUB`), hoy **Casemuro City** en [city.casemuro.stream](https://city.casemuro.stream).

> Esta wiki se genera desde la carpeta [`docs/`](https://github.com/eltrueno/TruenoProClubServices/tree/main/docs) del repositorio. Para cambiar algo, edita ahí y abre un PR; no edites la wiki a mano.

## Páginas

| Página | Contenido |
|---|---|
| **[API](API)** | Endpoints de la REST API y del servicio de auth, formato de respuesta, códigos de error y eventos de RabbitMQ |
| **[AUTH](AUTH)** | Guía para usar las cuentas desde otra web: login compartido y sesión dentro de `casemuro.stream`, y tokens de API para servicios de fuera |
| **[README](https://github.com/eltrueno/TruenoProClubServices#readme)** | Arquitectura, instalación, scripts, variables de entorno, estructura de carpetas y base de datos |

## Servicios

| Servicio | URL | Código |
|---|---|---|
| Web (GitHub Pages, estática) | https://city.casemuro.stream | `apps/web` |
| REST API | https://api.casemuro.stream | `apps/api` |
| Auth | https://auth.casemuro.stream | `apps/auth` |
| Worker (sync con EA, stats, logros, TOTW) | — | `apps/worker` |
| Bot de Discord | — | `apps/discordbot` |
| Renderizado de imágenes | — | `apps/imagerenderer` |

Paquetes compartidos: `packages/shared` (tipos, constantes, modelos, definiciones de logros), `packages/eafcapi` (cliente de EA + parseo de partidos), `packages/auth` (Better Auth), `packages/image-renderer-client`.

## Conceptos clave

- **`playerId`**: los jugadores se identifican por su id de EA, no por el nombre. Los miembros se crean a partir de los partidos (única fuente del id) y guardan su histórico de nombres.
- **Minutos mínimos**: un jugador con menos de 15' en un partido se guarda, pero ese partido no cuenta para sus stats, medias, logros ni TOTW. Si nadie llega a 15', el partido es **nulo** y no cuenta para nada.
- **DNF / penaltis**: se detectan a partir del payload de EA (`packages/eafcapi/src/core/parse.ts`); se guarda el marcador real y los goles de la tanda.
- **Logros**: definidos en `packages/shared/src/achievements.definitions.ts`; el worker los sincroniza a la DB al arrancar y los evalúa con cada partido.
- **Discord**: cada usuario conecta su Discord en accounts; el bot saca de ahí (auth, con token de API) a quién mencionar. Ya no hay fichero de jugadores en el bot.
- **Sesión**: cookie de dominio `.casemuro.stream` emitida por el auth service; las rutas protegidas del api la validan contra `get-session`.

## Flujo de datos

```
EA (proclubs.ea.com)
   │  clubs/matches, members/stats, clubs/info, clubs/overallStats
   ▼
worker ──► MongoDB ◄── api ◄── web (GitHub Pages)
   │                    ▲
   │ RabbitMQ (totw.new…)│ cookie de sesión validada contra auth
   ▼                    │
discordbot ──► imagerenderer ──► captura páginas de la web
```
