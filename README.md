# Conectfy

Monorepo com backend NestJS e aplicativo Expo/React Native para chat em tempo real e funcionalidades sociais.

---

## Stack

- NestJS
- PostgreSQL
- Expo / React Native
- Socket.IO
- TypeORM

---

## Estrutura do projeto

| Pasta | Descrição |
|-------|-----------|
| [`backend/`](./backend/) | API NestJS, JWT, Socket.IO, uploads, PostgreSQL |
| [`mobile/`](./mobile/) | App Expo (expo-router), integração com o backend |

---

## Pré-requisitos

- **Node.js** 20+
- **npm**
- **PostgreSQL** (base vazia criada manualmente)
- **Expo Go** ou **emulador Android** para rodar o app

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run start:dev
npm run seed
```

Na primeira execução, rode `npm run start:dev` antes do seed para que o TypeORM crie as tabelas.

**Antes de iniciar:**

- Crie a base PostgreSQL manualmente.
- Copie `.env.example` → `.env`.
- Preencha `DB_*`, `JWT_SECRET` e variáveis necessárias.
- Rode `npm run start:dev` antes do seed.
- Não commite `.env`.

### 2. Mobile

```bash
cd mobile
npm install
npx expo start
```

Use **Expo Go** no dispositivo ou pressione **`a`** com o **emulador Android** já em execução.

---

### Ambiente mobile (API)

| Contexto | URL típica do backend |
|----------|------------------------|
| Emulador Android | `http://10.0.2.2:3333` (host do PC; não use `localhost` no app) |
| Celular físico | `http://<IP_LOCAL_DA_MÁQUINA>:3333` na mesma rede — configure em `mobile/.env` (`EXPO_PUBLIC_API_URL`) |

Detalhes de variáveis e comportamento padrão: [`mobile/README.md`](./mobile/README.md).

---

## Documentação adicional

| Documento | Conteúdo |
|-----------|-----------|
| [`backend/README.md`](./backend/README.md) | Variáveis, scripts, seed, exportação |
| [`mobile/README.md`](./mobile/README.md) | Expo, `EXPO_PUBLIC_API_URL`, dispositivos |

Documentação detalhada e material acadêmico estão disponíveis no PDF do projeto.

---

## Licença

Defina a licença ao publicar (ex.: MIT), conforme instituição ou equipe. O backend está marcado como `UNLICENSED` até essa definição.
