# Trueno Pro Club Services

Sistema de gestión para clubes de Pro Clubs (EA FC): miembros, partidos, estadísticas, logros, equipo de la semana, cuentas vinculadas y anuncios en Discord. Desplegado para **Casemuro City** en [casemurocity.org](https://www.casemurocity.org).

> Esta wiki se genera desde la carpeta [`docs/`](https://github.com/eltrueno/TruenoProClubServices/tree/main/docs) del repositorio. Para cambiar algo, edita ahí y abre un PR; no edites la wiki a mano.

## Páginas

| Página | Contenido |
|---|---|
| **[API](API)** | Endpoints de la REST API y del servicio de auth, formato de respuesta, códigos de error y eventos de RabbitMQ |
| **[README](https://github.com/eltrueno/TruenoProClubServices#readme)** | Arquitectura, instalación, scripts, variables de entorno, estructura de carpetas y base de datos |

## Servicios

| Servicio | URL | Código |
|---|---|---|
| Web (GitHub Pages, estática) | https://www.casemurocity.org | `apps/web` |
| REST API | https://api.casemurocity.org | `apps/api` |
| Auth | https://auth.casemurocity.org | `apps/auth` |
| Worker (sync con EA, stats, logros, TOTW) | — | `apps/worker` |
| Bot de Discord | — | `apps/discordbot` |
| Renderizado de imágenes | — | `apps/imagerenderer` |

Paquetes compartidos: `packages/shared` (tipos, constantes, modelos, definiciones de logros), `packages/eafcapi` (cliente de EA + parseo de partidos), `packages/auth` (Better Auth), `packages/image-renderer-client`.

## Conceptos clave

- **`playerId`**: los jugadores se identifican por su id de EA, no por el nombre. Los miembros se crean a partir de los partidos (única fuente del id) y guardan su histórico de nombres.
- **0 segundos**: un jugador que aparece en un partido sin jugar se guarda pero no cuenta para stats, medias, logros ni TOTW.
- **DNF / penaltis**: se detectan a partir del payload de EA (`packages/eafcapi/src/core/parse.ts`); se guarda el marcador real y los goles de la tanda.
- **Logros**: definidos en `packages/shared/src/achievements.definitions.ts`; el worker los sincroniza a la DB al arrancar y los evalúa con cada partido.
- **Sesión**: cookie de dominio `.casemurocity.org` emitida por el auth service; las rutas protegidas del api la validan contra `get-session`.

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
