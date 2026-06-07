# CLAUDE.md — Mundial 2026 App

## Ruta del proyecto
`C:\Users\feder\Documents\Claude\WorldCup`

## Qué es este proyecto
App web para seguimiento del Mundial FIFA 2026 orientada a un círculo cercano (~50 usuarios). Foco en análisis pre-partido con estadísticas avanzadas. Compartible por link, con datos actualizados automáticamente.

## Stack decidido

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React + Vite | Mobile-first, dark mode por defecto |
| Hosting | GitHub Pages | URL pública gratis |
| CI/CD + Cron | GitHub Actions | Cada 4h, fetch datos → commit → deploy |
| Base de datos | Supabase PostgreSQL | Fuente de verdad, free tier 500MB |
| Datos principales | BSD (Bzzoiro Sports Data) | Sin rate limits, 100% gratis |
| Historial selecciones | API-Football | 100 req/día, fetch 1x al inicio |
| Noticias | RSS feeds + GNews | ESPN Deportes, Marca, BBC Sport |

## APIs confirmadas

### BSD — Fuente principal
- Base URL: `https://sports.bzzoiro.com/api/v2/`
- Auth: `Authorization: Token $BSD_API_TOKEN` (variable de entorno, nunca hardcodeada)
- Sin rate limits
- Mundial 2026: `league_id=27`, `season_id=188`

**Endpoints confirmados y funcionando:**
```
GET /api/v2/events/?league_id=27&date_from=YYYY-MM-DD
GET /api/v2/events/{id}/stats/          → shotmap, momentum, xg_per_minute, average_positions
GET /api/v2/events/{id}/lineups/        → disponible ~1h antes del partido
GET /api/v2/events/{id}/prediction/     → disponible ~24-48h antes
GET /api/v2/events/{id}/odds/           → disponible ~48h antes
GET /api/v2/events/{id}/metadata/       → funfacts, ai_preview
GET /api/v2/events/{id}/player-stats/   → pendiente confirmar
GET /api/v2/leagues/27/standings/       → posiciones con xG
GET /api/v2/worldcup/squads/            → 48 equipos, grupos A-L, nóminas
```

**IDs reales confirmados:**
- México: `451`, Sudáfrica: `452`
- Brasil: `4748`, Argentina: `4819`
- Francia: `4481`, España: `4698`
- Alemania: `4711`, Portugal: `4704`
- Inglaterra: `4713`
- Primer partido: México vs Sudáfrica, `event_id=8287`, 11 Jun 2026

### API-Football
- Solo para historial de selecciones (Copa América, Eliminatorias, Mundiales anteriores)
- Fetch una sola vez al inicio del torneo
- Guardar en tabla `team_history` de Supabase

## Base de datos Supabase — Tablas

```sql
matches        -- partidos con scores, xG, status, venue, kickoff_at
teams          -- 48 equipos con metadata, forma, xG promedios
players        -- stats acumuladas del torneo, radar_json (jsonb)
match_stats    -- stats por partido: shotmap_json, momentum_json, average_positions_json (jsonb)
news_cache     -- noticias con deduplicación por URL
team_history   -- historial selecciones de API-Football (fetch 1x)
sync_log       -- registro de cada ejecución del cron
```

## Cron job — GitHub Actions

Corre cada 4h. Pasos:
1. `GET /api/v2/events/?league_id=27` → scores y status del día
2. `GET /api/v2/events/{id}/stats/` → xG, shotmap, momentum (partidos terminados)
3. `GET /api/v2/events/{id}/prediction/` → predicciones (partidos próximos)
4. `GET /api/v2/events/{id}/odds/` → cuotas
5. RSS + GNews → noticias, deduplicar por URL
6. Upsert todo en Supabase
7. Generar JSONs estáticos en `/public/data/`
8. `git commit && git push` → GitHub Pages se actualiza

## JSONs estáticos generados por el cron

```
/public/data/matches.json           -- todos los partidos + scores
/public/data/standings.json         -- posiciones por grupo
/public/data/players.json           -- goleadores + stats
/public/data/teams.json             -- perfil de los 48 equipos
/public/data/match_{id}.json        -- pre-partido completo por partido
/public/data/news.json              -- últimas 20 noticias
/public/data/team_history_{id}.json -- historial por selección
```

## Diseño y UX

### Paleta
- Dark mode por defecto, toggle a light mode
- Dark: fondo `#0C1420`, surface `#172030`, acento `#F59E0B` (dorado)
- Light: fondo `#F7F8FA`, surface `#FFFFFF`, acento `#2563EB` (azul)

### Tipografía
- `Sora` — textos, títulos
- `DM Mono` — números, stats, badges

### Navegación
- Mobile: bottom nav con 7 tabs
- Desktop: sidebar fija izquierda + main area

### Tabs (bottom nav)
1. ⚽ Grupos — tablas con xG, clasificados marcados
2. 📅 Calendario — partidos del día, tappables → pre-partido
3. 🏆 Bracket — eliminatorias (disponible desde ronda de 32)
4. 📈 Estadísticas — goleadores, asistencias, porteros, equipos
5. 📊 Pronósticos — probabilidades de campeonato
6. 🌍 Equipos — cards colapsables con perfil táctico
7. 📰 Noticias — feed estilo Google News con featured card

### Pre-partido (vista desde Calendario)
UX: topbar cambia a "← Calendario", bottom nav se oculta, animación slide-in.

Secciones en orden:
1. Hero del partido (estadio, hora, clima)
2. Forma reciente (últimos 5 partidos)
3. Dato curioso
4. Probabilidades (barra tricolor home/draw/away)
5. Historial H2H
6. Líneas de apuesta (cuotas + badge "Valor")
7. Identidad táctica (tags + metros por equipo)
8. Percentile bars (vs 48 selecciones)
9. xG Rolling chart (últimos 8 partidos)
10. Red de pases (passing network con nodos)
11. Formaciones (cancha SVG con 11 jugadores)
12. Heatmap cancha completa
13. Radar charts jugadores
14. Matriz ataque vs defensa
15. Mapa de tiros (scatter xG)
16. Predicción (score más probable)

## Cómo construimos — Capas en orden

Construimos capa a capa. No avanzar a la siguiente hasta que la anterior esté funcionando y revisada.

**Capa 1 — Calendario** ← estamos aquí
- Fetch de partidos desde BSD (`/api/v2/events/?league_id=27`)
- Guardar en Supabase tabla `matches`
- Generar `/public/data/matches.json`
- Frontend: tab Calendario con lista de partidos del día

**Capa 2 — Grupos y Standings**
- Fetch de standings con xG desde BSD
- Tab Grupos con tablas por grupo

**Capa 3 — Pre-partido básico**
- Datos del partido: hero, forma reciente, probabilidades, H2H
- Navegación Calendario → Pre-partido

**Capa 4 — Stats avanzadas**
- Shotmap, momentum, xG acumulado, posiciones promedio
- Visualizaciones SVG en el pre-partido

**Capa 5 — Estadísticas globales**
- Goleadores, porteros, equipos
- Tab Estadísticas completo

**Capa 6 — Equipos**
- Cards colapsables con perfil táctico
- Tab Equipos

**Capa 7 — Noticias**
- RSS + GNews → Supabase → JSON
- Tab Noticias

**Capa 8 — Bracket**
- Eliminatorias desde ronda de 32
- Tab Bracket

## Variables de entorno

Todas las keys viven en variables de entorno. Nunca en el código, nunca en archivos commiteados.

**Local (`.env` en la raíz, está en `.gitignore`):**
```
BSD_API_TOKEN=tu_token_aqui
SUPABASE_URL=tu_url_aqui
SUPABASE_SERVICE_KEY=tu_key_aqui
API_FOOTBALL_TOKEN=tu_token_aqui
```

**GitHub Actions (Settings → Secrets → Actions):**
```
BSD_API_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_KEY
API_FOOTBALL_TOKEN
```

El frontend nunca accede a las APIs directamente — solo lee los JSONs estáticos de `/public/data/`. Las keys solo las usa el cron.

## Reglas para Claude Code

- Siempre construir mobile-first
- Nunca hardcodear datos — todo viene de los JSONs estáticos
- Cada componente debe funcionar con datos vacíos/null sin romperse
- Los JSONs se fetchan al cargar la app, se cachean en memoria
- Nunca exponer la API key en el frontend — solo el cron la usa
- Commits pequeños y descriptivos por cada capa completada
- Cuando algo no esté claro, preguntar antes de implementar
