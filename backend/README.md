# Conectfy — Backend

API **NestJS** com **PostgreSQL** (TypeORM), **JWT**, **Socket.IO** (chat em tempo real), upload de arquivos em disco (`uploads/`) e CORS preparado para desenvolvimento com Expo.

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ (ou compatível)
- Porta **3333** livre (ou altere `PORT` no `.env`)

---

## Configuração

1. Copie o exemplo de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Edite `.env` — no mínimo:

   - **Database**: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
   - **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN` (opcional)
   - **PORT**: padrão `3333`

3. Crie o banco no PostgreSQL com o mesmo nome de `DB_NAME`.

4. Instale dependências:

   ```bash
   npm install
   ```

---

## Executar

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | Desenvolvimento com **watch** (recomendado). Libera a porta 3333 antes do start (`prestart:dev`). |
| `npm run start` | Uma execução sem watch |
| `npm run build` | Build de produção |
| `npm run start:prod` | Rodar `dist/` após `build` |

A API sobe em `http://localhost:3333` (ou o valor de `PORT`).

---

## Scripts úteis

| Script | Descrição |
|--------|-----------|
| `npm run seed:demo-tags` | Dados de exemplo para tags de contato (veja `SEED_OWNER_EMAIL` no `.env.example`) |

---

## Variáveis de ambiente (resumo)

Consulte **`.env.example`** para a lista completa. Destaques:

- **CORS**: `CORS_ORIGIN` — em desenvolvimento o `main.ts` já flexibiliza origens comuns do Expo.
- **Reset de senha**: `PASSWORD_RESET_RETURN_TOKEN` — em dev pode devolver o token na resposta; em produção use SMTP (`SMTP_*`) e `APP_PUBLIC_URL`.
- **OAuth (Google / Meta)**: `GOOGLE_*`, `FACEBOOK_*`, `INSTAGRAM_*` — necessários apenas se for usar esses fluxos no app.

---

## Arquivos estáticos e uploads

Mídias e áudios enviados pelos clientes são servidos sob o prefixo **`/uploads/`** (pastas criadas sob o diretório de trabalho do processo). Garanta permissão de escrita no servidor em produção.

---

## Testes (opcional)

```bash
npm run test
npm run test:e2e
npm run test:cov
```

---

## Integração com o app mobile

O mobile usa a base URL configurada em `EXPO_PUBLIC_API_URL` ou heurísticas por plataforma (veja `mobile/README.md`). O backend deve estar acessível no IP/porta que o telefone ou emulador enxergar.

---

## Solução de problemas

| Problema | Verificação |
|----------|-------------|
| Erro de conexão com o banco | Credenciais `DB_*`, serviço PostgreSQL ativo, banco criado |
| Porta em uso | Altere `PORT` ou libere a 3333 |
| CORS no navegador/Expo | Em dev, CORS costuma estar permissivo; em produção configure `CORS_ORIGIN` |
