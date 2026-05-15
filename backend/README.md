# Conectfy — Backend

API **NestJS** com **PostgreSQL** (**TypeORM**), **JWT**, **Socket.IO** e armazenamento de uploads em disco. Destinada ao aplicativo mobile **Conectfy** (Expo).

---

## Stack

- **NestJS** — framework HTTP, módulos, injeção de dependências  
- **TypeORM** — ORM e migrations/synchronize conforme variáveis  
- **PostgreSQL** — banco relacional  
- **JWT** — autenticação stateless  
- **Socket.IO** — tempo real (chat)

---

## Estrutura (visão geral)

| Área | Descrição |
|------|-----------|
| `src/` | Código da aplicação (módulos `auth`, `users`, `messages`, etc.) |
| `src/config/` | Validação de ambiente em produção, opções de CORS |
| `dist/` | Saída do build TypeScript (`npm run build` → `dist/src/`) — usada em produção |
| `uploads/` | Arquivos servidos em `/uploads/` (voz, etc.; em PaaS o disco costuma ser efêmero) |

---

## Pré-requisitos

- **Node.js** 20 ou superior (`engines` no `package.json`: `>=20 <25`)
- **npm** (não é necessário Yarn)
- **PostgreSQL** acessível (local ou **Render Postgres**)

O script **`npm run build`** usa **`tsc -p tsconfig.build.json`**. Em **runtime** de produção, **`npm start`** executa **`node dist/src/main.js`** (exige `build` prévio).

---

## Configuração local

### 1. Variáveis de ambiente

```bash
cd backend
cp .env.example .env
```

Edite **`.env`**. Não commite `.env` (está no `.gitignore`).

**Opção A — URL única (comum no Render):**

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco
```

**Opção B — variáveis separadas (desenvolvimento local típico):**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sua_senha
DB_NAME=conectfy
```

Outras variáveis (OAuth, SMTP, etc.) estão comentadas em **`.env.example`**.

### 2. Banco de dados (local)

Se não usar `DATABASE_URL`, crie o banco com o mesmo nome de `DB_NAME`:

```sql
CREATE DATABASE conectfy;
```

### 3. Instalação e execução em desenvolvimento

```bash
npm install
npm run start:dev
```

O servidor sobe por padrão na porta **3333** (ou na porta definida em `PORT`). Na primeira execução, o TypeORM pode sincronizar o schema conforme `NODE_ENV` e `TYPEORM_SYNC` (veja `.env.example`).

### 4. Seed (opcional)

```bash
npm run seed
```

Execute **depois** de o backend ter subido com sucesso ao menos uma vez (tabelas criadas).

---

## Scripts principais

| Comando | Uso |
|---------|-----|
| `npm install` | Instala dependências (inclui `devDependencies` necessárias ao build) |
| `npm run start:dev` | Desenvolvimento com hot reload (`npx nest start --watch`) |
| `npm run build` | Compila TypeScript para **`dist/src/`** (`tsc -p tsconfig.build.json`) |
| `npm start` | **Produção:** `node dist/src/main.js` (exige `build` prévio) |
| `npm run start:prod` | Equivalente a `npm start` |
| `npm run seed` | Dados de demonstração |
| `npm run migration:run` / `migration:run:prod` | Migrations (ver `package.json`) |

Lint, testes e outros scripts: ver **`package.json`**.

---

## Build e start (produção)

Na máquina local ou no CI, após configurar variáveis:

```bash
npm install
npm run build
npm start
```

O processo escuta **`0.0.0.0`** e a porta vinda de **`PORT`** (no Render é injetada automaticamente). Em desenvolvimento, sem `PORT`, usa **3333**.

---

## Deploy no Render

### Visão geral

1. Crie um banco **PostgreSQL** no Render e aguarde status **Available**.  
2. Crie um **Web Service** ligado ao mesmo repositório Git (monorepo: use **Root Directory** `backend`).  
3. Configure **variáveis de ambiente** no Web Service (não no Postgres).  
4. Faça o deploy; verifique os **logs** se algo falhar na subida.

### Root Directory, build e start

| Campo no Render | Valor recomendado |
|-----------------|-------------------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### Variáveis de ambiente obrigatórias (Web Service)

| Variável | Descrição |
|----------|-----------|
| **`NODE_ENV`** | `production` — necessário para CORS, TypeORM e validações na subida. |
| **`DATABASE_URL`** | Cole a **Internal Database URL** do Postgres no Render (mesma região que o Web Service). |
| **`JWT_SECRET`** | Segredo forte (mínimo **16 caracteres** exigido pela validação em produção). |
| **`CORS_ORIGIN`** | Origens HTTPS permitidas, **separadas por vírgula** (ex.: front ou Expo web). Pedidos **sem** header `Origin` (app nativo) costumam ser aceitos; para **navegador**, configure as origens corretas. |

O Render define automaticamente **`PORT`** e **`RENDER=true`**. Com `RENDER=true`, o backend exige **`NODE_ENV=production`**.

### Variáveis recomendadas no primeiro deploy

| Variável | Quando usar |
|----------|-------------|
| **`TYPEORM_SYNC`** | `true` **uma vez** se o banco estiver vazio e você **não** usar migrations ainda; depois volte para `false` ou remova. |
| **`JWT_EXPIRES_IN`** | Opcional (ex.: `7d`); há default no código se omitir. |
| **`CORS_ALLOW_EXPO_HOSTS`** | Opcional: `false` para restringir CORS apenas ao que estiver em `CORS_ORIGIN`. |

### Cópia local das variáveis do Render

O arquivo **`render-env.local`** (listado no `.gitignore`) serve só como **cópia de backup** das variáveis do painel; **não** é carregado automaticamente pelo Nest.

---

## Integração com o mobile

- **Local:** API em `http://localhost:3333` no PC; no Expo use o IP da LAN ou `10.0.2.2` no emulador Android — ver **[README do mobile](../mobile/README.md)**.  
- **Produção:** URL pública **`https://conectfy-backend.onrender.com`** em **`EXPO_PUBLIC_API_URL`** no app (EAS Secrets ou `.env` conforme o fluxo de build).

---

## Uploads

Ficheiros ficam em **`uploads/`** e são servidos em **`/uploads/`**. Em serviços como o Render, o filesystem é **efêmero**: arquivos podem ser perdidos em redeploy; para produção séria considere armazenamento objeto (S3, etc.).

---

## Referências

- [README principal](../README.md)  
- [README do mobile](../mobile/README.md)  
- [NestJS](https://docs.nestjs.com)  
- [Render — Web Services](https://render.com/docs/web-services)  
- [Variáveis de exemplo](./.env.example)
