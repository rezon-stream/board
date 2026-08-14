# pattaya-stream

Сетка живых YouTube-трансляций Паттайи: статика на Astro + React, статусы каналов
отдаёт Cloudflare Worker (`/api/live`).

## Локальный запуск

    ./dev.sh

Скрипт гасит прошлый стенд и поднимает два контейнера:

- http://localhost:8787 — собранная статика и `/api/live` в workerd, том же рантайме,
  что в проде;
- http://localhost:4321 — Astro с HMR, `/api/live` проксируется в первый.

Разовые команды идут в тот же контейнер:

    docker compose exec api npm run check
