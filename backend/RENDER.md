BUILD:
npm install && npm run build

START:
npm start

(Migrations rodam na subida do Nest via migrationsRun em produção.)

RELEASE (opcional, se quiser rodar migrations antes do start):
npm run migration:run:prod

VARIÁVEIS:
- NODE_ENV=production
- DATABASE_URL (Render Postgres)
