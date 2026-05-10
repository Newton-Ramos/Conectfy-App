# Conectfy — Backend

Servidor da API em **NestJS**. Guarda dados no **PostgreSQL**, faz login com **JWT**, chat em tempo real com **Socket.IO** e guarda ficheiros de utilizadores (imagens, áudio, etc.). Funciona em conjunto com a app mobile Expo.

Se isto é a primeira vez no projeto, siga a secção **“Rodar pela primeira vez”** na ordem dos passos.

---

## O que precisa instalado

- **Node.js** versão 20 ou superior ([nodejs.org](https://nodejs.org))
- **PostgreSQL** (14 ou mais recente costuma servir)
- A porta **3333** livre no computador (é a porta que a API usa por defeito)
- **Git**, se for clonar o repositório

Só precisa de ferramentas como `pg_dump` se quiser **copiar a base de dados** para outro PC — não é obrigatório para desenvolvimento normal.

---

## Rodar pela primeira vez

Faça **nesta ordem**:

### 1. Entrar na pasta do backend

```bash
cd backend
```

### 2. Criar o ficheiro `.env`

Copie o exemplo:

- **Windows (CMD ou PowerShell):** `copy .env.example .env`
- **Mac / Linux:** `cp .env.example .env`

Abra o `.env` num editor de texto e preencha pelo menos:

| O quê | Onde no `.env` |
|-------|----------------|
| Ligação ao PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` |
| Chave secreta do login | `JWT_SECRET` (pode ser uma frase longa inventada por si) |
| Porta da API *(opcional)* | `PORT` — se não mudar, fica **3333** |

⚠️ **Não envie o `.env` para o Git** — lá está a palavra-passe da base e segredos.

⚠️ No `.env.example` pode aparecer **`DATABASE_URL` comentada**. É só uma nota para outras ferramentas. **Este projeto usa os campos `DB_*`** — não precisa de configurar `DATABASE_URL` para o servidor funcionar.

### 3. Criar a base de dados vazia

No PostgreSQL, crie uma base com o **mesmo nome** que colocou em `DB_NAME`, por exemplo:

```sql
CREATE DATABASE conectfy;
```

### 4. Instalar dependências

```bash
npm install
```

### 5. Ligar o servidor **uma primeira vez**

```bash
npm run start:dev
```

Espere até arrancar **sem erro** de ligação à base de dados. Nesta primeira vez o projeto **cria as tabelas** sozinho na base.

Pode parar o servidor com **Ctrl+C** quando quiser.

### 6. *(Opcional)* Pôr dados de exemplo

Se quiser utilizadores e mensagens de demonstração:

```bash
npm run seed
```

⚠️ **Só funciona depois do passo 5.** Se correr o seed antes das tabelas existirem, vai falhar. Primeiro tem de ter corrido `npm run start:dev` com sucesso pelo menos uma vez.

### 7. Dia a dia

Para trabalhar no projeto, na pasta `backend`:

```bash
npm run start:dev
```

A API fica em **http://localhost:3333** (ou na porta que definiu em `PORT`).

---

## Comandos que mais usa

| Comando | Para quê |
|---------|----------|
| `npm run start:dev` | Modo desenvolvimento — é o que deve usar quase sempre |
| `npm run build` | Gera a pasta `dist/` para produção |
| `npm run start:prod` | Corre a versão já compilada *(depois do `build`)* |
| `npm run seed` | Dados de exemplo *(opcional; ver aviso acima)* |

Outros comandos (`lint`, `format`, testes) existem no `package.json` se precisar mais tarde.

---

## Resto das opções no `.env`

Há muitas linhas comentadas no **`.env.example`** (CORS, recuperação de palavra-passe por email, login com Google/Facebook/Instagram). **Para uma primeira execução não precisa disso** — só os dados da base e o `JWT_SECRET` são essenciais.

Quando quiser detalhe linha a linha, abra o `.env.example` no editor.

---

## Ficheiros enviados pelos utilizadores

Fotos e áudios ficam guardados no servidor e são acedidos pela API no endereço **`/uploads/`**. Num servidor real convém ter espaço em disco e cópias de segurança.

---

## Ligar à app no telefone

O telefone ou emulador tem de conseguir “ver” o PC na rede. O mais importante é o backend estar **ligado** e a **porta** (por exemplo 3333) não estar bloqueada pelo firewall.

Instruções completas (IP do PC, Expo): **[README do mobile](../mobile/README.md)**.

---

## Copiar a base para outro computador *(opcional)*

Só se precisar de um “backup em SQL” ou de passar a base ao professor:

```bash
pg_dump -h localhost -p 5432 -U postgres -d conectfy --encoding=UTF8 -f conectfy_dump.sql
psql -h localhost -p 5432 -U postgres -d conectfy -f conectfy_dump.sql
```

Troque `localhost`, porta, utilizador e nome da base pelos valores do seu `.env`. No Windows as ferramentas costumam estar em `C:\Program Files\PostgreSQL\...\bin\`.

---

## Se algo correr mal

| Situação | O que experimentar |
|----------|---------------------|
| Erro ao ligar à base | PostgreSQL a correr? Utilizador e palavra-passe certos no `.env`? Nome da base igual ao `DB_NAME`? |
| “Porta já em uso” | Outro programa na 3333, ou mude `PORT` no `.env` |
| Seed dá erro | Já correu `npm run start:dev` com sucesso **antes**? |
| App no telefone não fala com o API | PC e telefone na mesma Wi‑Fi? Firewall? Ver **[mobile/README.md](../mobile/README.md)** |

---

## Lista rápida (checklist)

- [ ] Node.js instalado (`node -v`)
- [ ] PostgreSQL a correr e base criada
- [ ] Ficheiro `.env` com dados da base e `JWT_SECRET`
- [ ] `npm install` na pasta `backend`
- [ ] `npm run start:dev` até funcionar sem erro *(cria tabelas)*
- [ ] Só depois: `npm run seed` *(se quiser dados demo)*

---

## Onde ir buscar mais ajuda

- Visão geral do projeto (incluindo mobile): **[README na raiz](../README.md)**
- Documentação NestJS: [docs.nestjs.com](https://docs.nestjs.com)
