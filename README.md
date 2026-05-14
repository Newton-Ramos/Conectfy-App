# Conectfy

[![API](https://img.shields.io/badge/API-NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?logo=expo&logoColor=white)](https://expo.dev)
[![Database](https://img.shields.io/badge/DB-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Render-000000?logo=render&logoColor=white)](https://render.com)

Monorepo full-stack: **NestJS** (`backend/`) + **Expo / React Native** (`mobile/`). API REST, JWT, Socket.IO, TypeORM e PostgreSQL.

---

## Visão geral

Cliente mobile consome a API via HTTP; eventos em tempo real usam **Socket.IO**. Dados persistem em **PostgreSQL**. Deploy da API em **Render**; o app resolve a base URL com **`EXPO_PUBLIC_API_URL`**.

---

## Features

- Autenticação **JWT** (login, cadastro por fluxo de email e recuperação de senha)
- **OAuth** Google, Facebook e Instagram (quando variáveis estão configuradas)
- **Chat** em tempo real (**Socket.IO**)
- **Mensagens** com suporte a mídia (ex.: voz) e uploads servidos em `/uploads/`
- **Contatos** e **círculos** (`users`, `circles`)
- **Notificações** (`notifications`)

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Backend | NestJS, TypeORM, PostgreSQL, JWT, Passport, Socket.IO |
| Mobile | Expo, React Native, expo-router, Axios, socket.io-client |

---

## Arquitetura

```
┌─────────────────────┐     HTTP / REST      ┌─────────────────────┐
│  Expo (React Native)│ ◄──────────────────► │  NestJS API         │
│  mobile/            │     WebSocket (JWT)  │  backend/           │
└─────────────────────┘                      └──────────┬──────────┘
                                                        │ TypeORM
                                                        ▼
                                             ┌─────────────────────┐
                                             │  PostgreSQL         │
                                             └─────────────────────┘
```

Fluxo: credenciais → API emite **JWT** → cliente envia `Authorization: Bearer` e conecta ao gateway Socket.IO com o mesmo segredo de verificação no servidor.

---

## Estrutura do projeto

| Diretório | Função |
|-----------|--------|
| [`backend/`](./backend/) | API, variáveis, build `dist/`, deploy Render |
| [`mobile/`](./mobile/) | App Expo, `EXPO_PUBLIC_*`, builds EAS |

Referência detalhada: [`backend/README.md`](./backend/README.md) · [`mobile/README.md`](./mobile/README.md)

---

## Pré-requisitos

- **Node.js** 20+ e **npm** (`engines` nos `package.json` de `backend/` e `mobile/`)
- **PostgreSQL** (local ou Render Postgres)
- **Git**
- Mobile: **Expo Go** e/ou emulador Android (Xcode no macOS para iOS)

---

## Setup local

**Backend**

```bash
cd backend
npm install
cp .env.example .env
# Preencher DB / JWT (ver seção Variáveis de ambiente)
npm run start:dev
```

**Mobile**

```bash
cd mobile
npm install
cp .env.example .env
# EXPO_PUBLIC_API_URL — ver próxima seção
npx expo start
```

API padrão: `http://localhost:3333`. Schema inicial: [`backend/README.md`](./backend/README.md).

---

## Comunicação mobile ↔ backend

Variável **`EXPO_PUBLIC_API_URL`**: URL base da API (sem path extra, salvo convenção do projeto).

| Cenário | Exemplo |
|---------|---------|
| Emulador Android → API no host | `http://10.0.2.2:3333` |
| Dispositivo físico → API no PC (mesma LAN) | `http://192.168.0.15:3333` |
| API no Render | `https://<serviço>.onrender.com` |

- Emulador: não usar `localhost` para alcançar o host; usar `10.0.2.2`.  
- Físico: usar IPv4 da máquina que roda o Nest, não `127.0.0.1` do telefone.  
- Após editar `.env`: reiniciar Metro (`Ctrl+C` → `npx expo start`).

---

## Deploy (Render + Expo)

**Render — ordem**

1. Criar **PostgreSQL** → **Available** → copiar **Internal Database URL** → mapear para **`DATABASE_URL`** no Web Service.  
2. Criar **Web Service** (Node), repo GitHub, **Root Directory:** `backend`.  
3. **Environment:** `NODE_ENV`, `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN` (e demais do [`.env.example`](./backend/.env.example)).  
4. **Build:** `npm install && npm run build`  
5. **Start:** `npm start`  
6. Validar URL pública `https://<app>.onrender.com`.

`PORT` / `RENDER`: injetados pelo Render.

**Expo**

- **Expo Go + dev:** `EXPO_PUBLIC_API_URL` no `mobile/.env` apontando para a URL HTTPS da API.  
- **EAS:** mesma variável nos secrets / env do perfil de build (não commitar).

Detalhes (CORS, `TYPEORM_SYNC`, etc.): [`backend/README.md#deploy-no-render`](./backend/README.md#deploy-no-render).

---

## Variáveis de ambiente

| Variável | Onde | Função |
|----------|------|--------|
| **`DATABASE_URL`** | `backend/.env` / Render | String Postgres (preferida no Render). Alternativa: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`. |
| **`JWT_SECRET`** | `backend/.env` / Render | Segredo HMAC do JWT (≥ 16 caracteres na validação de produção). |
| **`EXPO_PUBLIC_API_URL`** | `mobile/.env` / EAS | Base URL da API para o bundle Expo. |
| `NODE_ENV` | Render | `production` na API pública. |
| `CORS_ORIGIN` | Render | Origens permitidas (lista separada por vírgula). |
| `TYPEORM_SYNC` | Render | `true` uma vez se não houver migrations e o banco estiver vazio; depois `false`. |

Listas completas: [`backend/.env.example`](./backend/.env.example) · [`mobile/.env.example`](./mobile/.env.example)

---

## Execução rápida

```bash
# Terminal 1 — API
cd backend && npm install && cp .env.example .env && npm run start:dev

# Terminal 2 — App (ajuste EXPO_PUBLIC_API_URL antes)
cd mobile && npm install && cp .env.example .env && npx expo start
```

Edite os `.env` antes se já tiver Postgres e secrets definidos.

---

## Troubleshooting

| Sintoma | Checagem |
|---------|----------|
| Falha de rede no app | `EXPO_PUBLIC_API_URL`, HTTP vs HTTPS, firewall, mesma LAN |
| CORS no browser | `CORS_ORIGIN` contém a origem exata |
| API cai no boot (Render) | Logs; `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET` |
| Erro de tabela inexistente | `TYPEORM_SYNC` ou migrations — [backend README](./backend/README.md) |

---

## Status do projeto

| Área | Estado |
|------|--------|
| **Backend** | NestJS modular (auth, users, messages, notifications, circles); build `npm run build`; start `npm start`. |
| **Mobile** | Expo Router; integração API + Socket.IO via `EXPO_PUBLIC_API_URL`. |
| **Deploy** | Render documentado (Postgres + Web Service); mobile via `.env` / EAS. |

---

## Licença

Definir licença ao publicar (ex.: MIT) conforme instituição. O `package.json` do backend pode permanecer `UNLICENSED` até essa decisão.

---

Documentação complementar: [`backend/README.md`](./backend/README.md) · [`mobile/README.md`](./mobile/README.md)
