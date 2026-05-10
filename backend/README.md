# Conectfy — Backend

API **NestJS** + **PostgreSQL** (TypeORM) com **JWT**, **Socket.IO** (chat em tempo real), upload de arquivos servidos em **`/uploads`** e CORS preparado para desenvolvimento com Expo.

## Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação e configuração](#instalação-e-configuração)
3. [Subir a API (passo a passo)](#subir-a-api-passo-a-passo)
4. [Scripts úteis](#scripts-úteis)
5. [Variáveis de ambiente](#variáveis-de-ambiente)
6. [Arquivos estáticos e uploads](#arquivos-estáticos-e-uploads)
7. [Testes opcionais](#testes-opcionais)
8. [Integração com o app mobile](#integração-com-o-app-mobile)
9. [Exportar/importar base (PostgreSQL)](#exportarimportar-base-postgresql)
10. [Modelo de mensagens (mídia)](#modelo-de-mensagens-mídia)
11. [Solução de problemas](#solução-de-problemas)
12. [Checklist rápido](#checklist-rápido)
13. [Referências](#referências)

---

## Pré-requisitos

| Item | Detalhe |
|------|---------|
| **Node.js** | ≥ **20** (LTS recomendado) |
| **PostgreSQL** | ≥ **14** (ou compatível) |
| **Porta da API** | **3333** livre no host, ou altere **`PORT`** no `.env` |
| **Git** | Para clonar o repositório (ou obtenha o código por outro meio) |
| **`pg_dump` / `psql`** | *Opcional* — apenas para [export/import](#exportarimportar-base-postgresql) |

---

## Instalação e configuração

### Obrigatório

1. **Clone** o repositório ou copie o código do monorepo para sua máquina.
2. Entre na pasta do backend:

   ```bash
   cd backend
   ```

3. **Crie o arquivo de ambiente** a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   No Windows (CMD ou PowerShell), equivalente:

   ```bash
   copy .env.example .env
   ```

4. **Edite `.env`** — campos mínimos para subir a API:

   | Grupo | Variáveis |
   |-------|-----------|
   | **Banco** | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` |
   | **JWT** | `JWT_SECRET` (obrigatório); `JWT_EXPIRES_IN` opcional |
   | **API** | `PORT` — padrão **3333** |

5. **Crie o banco vazio** no PostgreSQL com o **mesmo nome** que `DB_NAME`, por exemplo:

   ```sql
   CREATE DATABASE conectfy;
   ```

6. **Instale dependências:**

   ```bash
   npm install
   ```

⚠️ **Não commite o arquivo `.env`** — contém segredos e credenciais.

⚠️ **`DATABASE_URL`** no `.env.example` é só **referência** para ferramentas externas. **Este projeto não lê `DATABASE_URL` no código**; o NestJS/TypeORM usa apenas as variáveis **`DB_*`**.

### Opcional (antes do primeiro start)

- Ajustar **`CORS_ORIGIN`**, recuperação de senha (**`SMTP_*`**, **`APP_PUBLIC_URL`**), flags de dev — ver [Variáveis de ambiente](#variáveis-de-ambiente).
- **OAuth** (`GOOGLE_*`, `FACEBOOK_*`, `INSTAGRAM_*`) — só se for usar login social no app.

---

## Subir a API (passo a passo)

Ordem **obrigatória** na primeira vez (sem tabelas ainda):

| # | Ação | Comando / nota |
|---|------|----------------|
| 1 | Dependências instaladas | `npm install` na pasta `backend/` |
| 2 | `.env` preenchido e banco criado | Ver [Instalação e configuração](#instalação-e-configuração) |
| 3 | **Primeira subida** do Nest — cria schema (TypeORM **synchronize**) | `npm run start:dev` |
| 4 | Aguardar arranque completo | Logs sem erro de conexão ao PostgreSQL |
| 5 | Parar ou manter em segundo plano | `Ctrl+C` **ou** deixar rodando |
| 6 | **Seed** *(opcional)* | `npm run seed` — ver aviso abaixo |
| 7 | Desenvolvimento contínuo | `npm run start:dev` |

⚠️ **Seed só depois das tabelas existirem.** Na primeira execução as tabelas **ainda não existem**. É preciso subir **pelo menos uma vez** o backend com `npm run start:dev`, esperar o TypeORM criar o schema, e **só então** executar `npm run seed`. Caso contrário o seed falha.

- Pode **parar** o Nest com `Ctrl+C` após o primeiro arranque bem-sucedido e rodar `npm run seed` em seguida.
- Ou manter `start:dev` num terminal e rodar `npm run seed` noutro **após** o primeiro arranque completo.

**URL local padrão:** `http://localhost:3333` (ou o valor de `PORT`).

---

## Scripts úteis

### Execução e build

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | Desenvolvimento com **watch** *(recomendado)*. Antes de iniciar, roda `prestart:dev`, que tenta liberar a porta **3333**. |
| `npm run start` | Uma execução sem watch |
| `npm run start:debug` | Modo debug com watch |
| `npm run build` | Compila para `dist/` |
| `npm run start:prod` | Executa `node dist/main` *(após `build`)* |

### Qualidade de código

| Comando | Descrição |
|---------|-----------|
| `npm run lint` | ESLint com correção automática onde aplicável |
| `npm run format` | Prettier em `src/` e `test/` |

### Seed *(opcional)*

| Comando | Descrição |
|---------|-----------|
| `npm run seed` | **Alias** de `seed:demo-tags` |
| `npm run seed:demo-tags` | Dados demo: tags de círculos, mensagens fictícias, perfil demo — ver `SEED_OWNER_EMAIL` no `.env.example` (padrão no script: **admin@admin.com**) |

### Testes *(opcional)*

| Comando | Descrição |
|---------|-----------|
| `npm run test` | Testes unitários (Jest) |
| `npm run test:watch` | Jest em modo watch |
| `npm run test:cov` | Cobertura |
| `npm run test:debug` | Jest com inspector |
| `npm run test:e2e` | Testes e2e (`test/jest-e2e.json`) |

---

## Variáveis de ambiente

Consulte **`.env.example`** para comentários linha a linha. Resumo:

### Obrigatórias / núcleo da API

| Variável | Função |
|----------|--------|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Conexão PostgreSQL (TypeORM em `src/app.module.ts`) |
| `JWT_SECRET` | Assinatura dos tokens JWT |
| `JWT_EXPIRES_IN` | Validade do token *(opcional; ex.: `24h`)* |
| `PORT` | Porta HTTP da API *(padrão **3333**)* |

### Desenvolvimento e CORS

| Variável | Função |
|----------|--------|
| `CORS_ORIGIN` | Origens permitidas *(lista separada por vírgula)*. Em desenvolvimento o `main.ts` já flexibiliza origens comuns do Expo. |

### Recuperação de senha

| Variável | Função |
|----------|--------|
| `PASSWORD_RESET_RETURN_TOKEN` | Em **dev**, pode devolver o token na resposta; em **produção** use SMTP e **`APP_PUBLIC_URL`**. |
| `SMTP_*`, `APP_PUBLIC_URL` | *Opcional* — envio real do link por e-mail em produção |

### OAuth *(opcional)*

| Variável | Função |
|----------|--------|
| `GOOGLE_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | Google Sign-In / backend |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Facebook Graph |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | Instagram Basic Display |

### Seed demo *(opcional)*

| Variável | Função |
|----------|--------|
| `SEED_OWNER_EMAIL` | E-mail do utilizador “dono” no seed *(padrão **admin@admin.com**)* |

### Referência não lida pelo código

| Variável | Função |
|----------|--------|
| `DATABASE_URL` *(comentada no exemplo)* | Apenas referência para pgAdmin, Railway, Render, etc. **O código Nest não usa esta variável.** |

---

## Arquivos estáticos e uploads

Mídias e áudios enviados pelos clientes são servidos sob o prefixo **`/uploads/`**. As pastas são criadas no diretório de trabalho do processo.

⚠️ Em **produção**, garanta **permissão de escrita** no servidor e backups adequados.

---

## Testes opcionais

Não são obrigatórios para rodar a API no dia a dia.

```bash
npm run test
npm run test:e2e
npm run test:cov
```

---

## Integração com o app mobile

O app Expo usa a base URL em **`EXPO_PUBLIC_API_URL`** ou heurísticas por plataforma (emulador vs. físico). O backend deve estar **acessível no IP e porta** que o telefone ou emulador conseguem alcançar (firewall, mesma LAN, etc.).

📱 Detalhes: [`../mobile/README.md`](../mobile/README.md).

---

## Exportar/importar base (PostgreSQL)

*Opcional* — para partilhar estado da base com professor ou outra máquina (requer **`pg_dump`** / **`psql`** no PATH).

```bash
# Exportar (estrutura + dados)
pg_dump -h localhost -p 5432 -U postgres -d conectfy --encoding=UTF8 -f conectfy_dump.sql

# Importar (criar a base vazia antes, se necessário)
psql -h localhost -p 5432 -U postgres -d conectfy -f conectfy_dump.sql
```

Ajuste `-h`, `-p`, `-U`, `-d` aos valores do seu `.env`.

No **Windows**, as ferramentas costumam estar em `C:\Program Files\PostgreSQL\<versão>\bin\`.

---

## Modelo de mensagens (mídia)

A entidade **`Message`** (`src/messages/entities/message.entity.ts`) usa **`MessageMediaType`**: `text`, `image`, `voice`, `video`, `document`, `file`, com campos opcionais **`mediaUrl`** e **`mediaDurationSec`**. Cliente mobile e uploads HTTP devem respeitar esses valores para consistência.

---

## Solução de problemas

| Problema | O que verificar |
|----------|------------------|
| Erro de conexão com o banco | `DB_*` corretas; serviço PostgreSQL ativo; base criada com o nome de `DB_NAME` |
| Porta em uso | Alterar `PORT` no `.env` ou libertar a **3333**; `start:dev` tenta matar processo na 3333 via `prestart:dev` |
| Seed falha | ⚠️ Backend já ter subido **pelo menos uma vez** para criar tabelas |
| CORS no navegador / Expo | Em dev o CORS costuma ser permissivo; em produção configure `CORS_ORIGIN` |
| App mobile não conecta | Backend a ouvir no IP/porta certos; firewall; ver README do mobile |

---

## Checklist rápido

Use esta lista para validar uma instalação **do zero** (professor ou novo ambiente):

- [ ] Node.js ≥ 20 e `npm` funcionando (`node -v`, `npm -v`)
- [ ] PostgreSQL instalado e serviço em execução
- [ ] Base **`CREATE DATABASE …`** com o mesmo nome de `DB_NAME`
- [ ] `copy` / `cp` `.env.example` → `.env` e variáveis **`DB_*`**, **`JWT_SECRET`**, **`PORT`** preenchidas
- [ ] `cd backend` → `npm install`
- [ ] Primeira vez: `npm run start:dev` até API e TypeORM subirem sem erro (**cria tabelas**)
- [ ] *(Opcional)* `npm run seed` **depois** do passo anterior
- [ ] Uso normal: `npm run start:dev` → API em `http://localhost:3333` (ou `PORT`)
- [ ] *(Opcional)* Testes: `npm run test` / `npm run test:e2e`
- [ ] Mobile na mesma rede: firewall a permitir a porta; URL no Expo conforme [`../mobile/README.md`](../mobile/README.md)

---

## Referências

- [README da raiz do monorepo](../README.md) — fluxo CEUB, PostgreSQL, emulador Android
- [NestJS](https://docs.nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [Socket.IO](https://socket.io/docs/v4/)
