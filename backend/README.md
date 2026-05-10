# Conectfy — Backend

Backend NestJS com PostgreSQL, JWT e Socket.IO para o aplicativo Conectfy.

---

## Stack

- NestJS
- PostgreSQL
- TypeORM
- JWT
- Socket.IO

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL
- Porta **3333** livre (opcional)

---

## Setup

### 1. Ambiente

```bash
cd backend
cp .env.example .env
```

Configure `DB_*`, `JWT_SECRET` e demais variáveis necessárias no `.env`. Não commite `.env`. Variáveis opcionais e integrações estão comentadas em `.env.example`.

### 2. Banco de dados

Crie manualmente uma base com o **mesmo nome** que `DB_NAME`:

```sql
CREATE DATABASE conectfy;
```

### 3. Instalação

```bash
npm install
```

### 4. Primeira execução

```bash
npm run start:dev
```

Na primeira execução, o TypeORM cria o schema automaticamente.

### 5. Seed (opcional)

```bash
npm run seed
```

Alias de `seed:demo-tags` — rode **apenas depois** de ter executado `npm run start:dev` com sucesso (tabelas criadas).

---

## Scripts principais

| Script | Função |
|--------|--------|
| `npm run start:dev` | Desenvolvimento (watch) |
| `npm run build` | Build para `dist/` |
| `npm run start:prod` | Produção (`node dist/main`, após `build`) |
| `npm run seed` | Dados de demonstração |

Outros scripts (`lint`, `test`, etc.) — ver `package.json`.

---

## Uploads

Arquivos enviados pelos usuários são armazenados em `uploads/` e expostos via `/uploads/`.

---

## Integração com o mobile

API padrão: **`http://localhost:3333`**. Expo, IP na LAN e `EXPO_PUBLIC_API_URL` — **[README do mobile](../mobile/README.md)**.

---

## Documentação adicional

- [README principal](../README.md)
- [NestJS](https://docs.nestjs.com)
