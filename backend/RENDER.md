BUILD:
npm install && npm run build

START (recomendado — roda migrations antes de subir):
npm start

Alternativa equivalente:
npm run migration:run:prod && node dist/src/main.js

RELEASE (opcional; migrations também rodam via migrationsRun e npm start):
npm run migration:run:prod

VARIÁVEIS:
- NODE_ENV=production
- DATABASE_URL (Render Postgres)
