BUILD:
npm install && npm run build

START:
node dist/src/main.js

RELEASE:
npm run migration:run:prod

VARIÁVEIS:
- NODE_ENV=production
- DATABASE_URL (Render Postgres)
