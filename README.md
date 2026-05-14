# Conectfy

Monorepo com **backend NestJS** (API REST, JWT, Socket.IO, TypeORM, PostgreSQL) e **aplicativo mobile Expo** (React Native, expo-router) para chat em tempo real e funcionalidades sociais.

Documentação pensada para **desenvolvimento local**, **deploy em produção (Render)** e **entrega acadêmica**.

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Backend | NestJS, TypeORM, PostgreSQL, JWT, Socket.IO |
| Mobile | Expo, React Native, expo-router, Axios, Socket.IO Client |

---

## Estrutura do projeto

| Pasta | Conteúdo |
|-------|----------|
| [`backend/`](./backend/) | API NestJS, autenticação, WebSockets, uploads, conexão com PostgreSQL |
| [`mobile/`](./mobile/) | App Expo (expo-router), variáveis `EXPO_PUBLIC_*`, builds EAS opcionais |

Detalhes de execução, variáveis e deploy: **[`backend/README.md`](./backend/README.md)** e **[`mobile/README.md`](./mobile/README.md)**.

---

## Pré-requisitos

- **Node.js** 20 ou superior (alinhado a `engines` nos `package.json`)
- **npm**
- **PostgreSQL** (local ou gerenciado, ex.: Render Postgres)
- **Expo Go** ou emulador / dispositivo para o app mobile

---

## Início rápido (local)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env: DB_* ou DATABASE_URL, JWT_SECRET, etc.
npm run start:dev
```

Na primeira vez com banco vazio, o TypeORM pode criar o schema conforme a configuração em `.env` (veja o README do backend). Opcionalmente: `npm run seed`.

### 2. Mobile

```bash
cd mobile
npm install
cp .env.example .env
# Defina EXPO_PUBLIC_API_URL (IP da máquina na LAN ou 10.0.2.2 no emulador Android)
npx expo start
```

Use **Expo Go** no celular (mesma rede Wi‑Fi) ou **`a`** com emulador Android aberto.

### 3. Conectar mobile ao backend

| Cenário | URL típica em `EXPO_PUBLIC_API_URL` |
|---------|-------------------------------------|
| Emulador Android | `http://10.0.2.2:3333` |
| Celular físico (mesma rede) | `http://<IPv4_DO_PC>:3333` |
| Backend no Render (produção) | `https://<seu-serviço>.onrender.com` (sem barra final, salvo convenção da API) |

Reinicie o Metro após alterar `.env`.

---

## Deploy em produção (visão geral)

1. **PostgreSQL** no [Render](https://render.com): criar instância, copiar **Internal Database URL**.
2. **Web Service** (Node): repositório GitHub, **Root Directory** `backend`, build `npm install && npm run build`, start `npm start`.
3. Variáveis de ambiente no painel do Web Service: ver tabela no **[`backend/README.md`](./backend/README.md)**.
4. No **mobile**, apontar `EXPO_PUBLIC_API_URL` para a URL pública `https://...onrender.com` (build EAS ou `.env` conforme fluxo).

Passo a passo detalhado: **[`backend/README.md`](./backend/README.md#deploy-no-render)**.

---

## Documentação por pasta

| Arquivo | Conteúdo |
|---------|----------|
| [`backend/README.md`](./backend/README.md) | Variáveis, scripts, build de produção, Render, TypeORM |
| [`mobile/README.md`](./mobile/README.md) | Expo, `EXPO_PUBLIC_API_URL`, Expo Go vs EAS |

---

## Licença

Defina a licença ao publicar (ex.: MIT), conforme instituição ou equipe. O backend está marcado como `UNLICENSED` no `package.json` até essa definição.

---

## CHANGELOG RECENTE (último commit)

> Esta seção descreve **alterações de documentação** aplicadas na revisão dos READMEs (raiz, `backend/` e `mobile/`).

- **README raiz:** reorganizado com foco em monorepo, início rápido, tabela de URLs do mobile, visão geral de deploy no Render e links para os READMEs filhos.
- **Objetivo:** clareza para correção acadêmica, clone do repositório e encadeamento backend ↔ mobile.
- **Deploy:** resumo em quatro passos (Postgres, Web Service, variáveis, URL no app) com remissão ao backend para o passo a passo completo.
- **Comandos:** padronização para `npm install`, `npx expo start` no mobile e referência a `npm run build` / `npm start` no backend em produção.

---

## O que mudou na documentação (resumo objetivo)

- Inclusão explícita de **deploy no Render** e da variável **`EXPO_PUBLIC_API_URL`** apontando para **HTTPS** em produção.
- Separação clara entre **desenvolvimento local** e **produção**.
- Lista de **pré-requisitos** e **estrutura do repositório** atualizada.
- Seções **CHANGELOG RECENTE** e este **resumo** para rastreabilidade na entrega acadêmica e no GitHub.

---

**README pronto para publicação no GitHub** (conteúdo revisado para produção e entrega; configure licença e repositório remoto conforme sua instituição).
