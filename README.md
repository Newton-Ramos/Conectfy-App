# Conectfy

Backend **NestJS** (REST + WebSocket) e app **Expo** (React Native). Repositório em monorepo simples: pastas `backend/` e `mobile/` com documentação própria.

---

## Fluxo rápido (CEUB / entrega)

**Professor não precisa de dump:** basta PostgreSQL com uma base vazia que você referencia em `DB_NAME`. O Nest cria as tabelas na primeira subida (`TypeORM synchronize`). Opcionalmente rode o seed para dados de demonstração.

### Antes de rodar

1. **PostgreSQL** instalado e base criada, por exemplo: `CREATE DATABASE conectfy;`
2. Copiar `backend/.env.example` → `backend/.env` e preencher **`DB_HOST`**, **`DB_PORT`**, **`DB_USERNAME`**, **`DB_PASSWORD`**, **`DB_NAME`**, **`JWT_SECRET`**.
3. **`DATABASE_URL`** (se aparecer comentada no `.env.example`) é só **referência** para ferramentas ou documentação — **o Nest usa `DB_*`**, não lê `DATABASE_URL` no código.
4. **Não commite `.env`** — contém segredos e credenciais.

### Primeira vez (ordem obrigatória)

| Passo | O quê | Por quê |
|-------|--------|---------|
| 1 | `cd backend` → `npm install` | Dependências do Nest |
| 2 | `npm run start:dev` | Nest sobe e **cria as tabelas** na base |
| 3 | Parar com `Ctrl+C` **ou** deixar rodando | Tabelas já existem |
| 4 | `npm run seed` | **Só depois do passo 2.** O seed usa SQL nas tabelas; **sem tabelas, falha** |
| 5 | `npm run start:dev` de novo | Sessão normal de desenvolvimento |

**Seed:** rode **sempre dentro de `backend/`**. O comando `npm run seed` é **alias** de `npm run seed:demo-tags` (tags e dados demo — detalhes em [`backend/README.md`](./backend/README.md)).

### Mobile (outro terminal)

```bash
cd mobile
npm install
npx expo start
```

Use **Expo Go** no telefone ou **`a`** com **emulador Android** já aberto.

### Uso diário

1. Terminal A: `cd backend && npm run start:dev`
2. Terminal B: `cd mobile && npx expo start`

---

## Estrutura do repositório

| Pasta | Conteúdo |
|-------|----------|
| `backend/` | API NestJS, JWT, chat em tempo real (Socket.IO), upload de mídia, PostgreSQL (TypeORM). |
| `mobile/` | App Expo (expo-router), conversas, contatos, círculos, calendário local, login. |

---

## Pré-requisitos

- **Node.js** 20+ (LTS)
- **npm**
- **PostgreSQL** (local ou remoto) para o backend
- **Expo Go** (teste no celular) ou **Android Studio** com emulador (Windows/Linux/macOS) / **Xcode** (iOS, só macOS)

---

## Rodar no PC (emulador Android)

Para desenvolver **sem telefone físico**, instale o **Android Studio** (inclui o **Android Emulator** / AVD).

### 1. Windows — requisitos

- **RAM:** mínimo 8 GB (16 GB ajuda o emulador).
- **Virtualização:** na BIOS/UEFI, ativar **Intel VT-x** ou **AMD-V** se o Studio pedir.

### 2. Instalar Android Studio

1. [developer.android.com/studio](https://developer.android.com/studio) → instalador Windows.
2. Na configuração inicial, aceite **Android SDK**, **Android SDK Platform** e ferramentas sugeridas.

### 3. SDK (se faltar algo)

**Settings** → **SDK Manager** → **SDK Platforms:** pelo menos uma versão recente de Android (ex.: 14 ou 15). **SDK Tools:** Build-Tools, **Android Emulator**, Platform-Tools.

### 4. Criar AVD

**Device Manager** → **Create Device** → modelo (ex. Pixel 6) → **system image** (Google APIs / Google Play; x86_64 em PCs comuns) → **Finish**.

### 5. Emulador + Expo

1. Inicie o AVD pelo **Play** no Device Manager (primeira vez pode demorar).
2. Suba o backend (`backend/`, ver [`backend/README.md`](./backend/README.md)).
3. Em `mobile/`: `npm install` → `npx expo start` → com o emulador aberto, **`a`**.

**API no emulador:** o app usa **`http://10.0.2.2:3333`** para alcançar o backend no PC (porta **3333**). `10.0.2.2` é o alias do host no emulador; **não use `localhost` dentro do emulador** para o backend.

### Problemas comuns (Windows e rede)

| Situação | O que verificar |
|----------|------------------|
| Emulador lento | Menos RAM no AVD; fechar apps pesadas; virtualização na BIOS; imagem de sistema mais leve. |
| Hypervisor / “HAXM” | Seguir o Android Studio; em Windows, **Windows Hypervisor Platform** em “Ativar ou desativar recursos”. |
| App não conecta ao backend | Backend em **`npm run start:dev`** na porta **3333**; **Firewall do Windows** a permitir Node na rede **privada**; ver `EXPO_PUBLIC_API_URL` abaixo se alteraste o padrão. |

---

## Como rodar o projeto (detalhe)

- **Resumo:** secção **Fluxo rápido (CEUB / entrega)** acima.
- **Banco:** criar só a base; sem dump obrigatório.
- **Backend:** variáveis, scripts e export opcional em [`backend/README.md`](./backend/README.md).
- **Mobile:** URL da API, Expo Go e emulador em [`mobile/README.md`](./mobile/README.md).

---

## Testar no celular

O telefone precisa de URL que alcance o **IP do seu PC na mesma rede Wi‑Fi**, não `localhost`.

**Como descobrir o IPv4 do PC (Windows):**

1. Abra o **Prompt de Comando**: tecla Windows + `R`, digite `cmd` e Enter (ou procure **cmd** no menu Iniciar).
2. Digite `ipconfig` e pressione Enter.
3. Na saída, procure o adaptador da sua rede ativa (por exemplo **Adaptador de Rede sem Fio Wi‑Fi** ou **Ethernet**) e localize **Endereço IPv4** — algo como `192.168.x.x`.
4. Use esse valor **no lugar de** `<IP_DO_PC>` na URL da API, por exemplo: `http://<IP_DO_PC>:3333` → `http://192.168.1.10:3333` (o número real é o que apareceu no passo 3).

- **`EXPO_PUBLIC_API_URL`** — defina no **`mobile/.env`** (ou como o projeto documenta), por exemplo `http://192.168.1.10:3333`, usando o IPv4 que obteve com os passos acima. O backend deve estar a correr e o firewall a aceitar a porta.
- **Emulador Android:** `http://10.0.2.2:3333` (comportamento típico do projeto para host).
- **iOS Simulator (macOS):** em geral `http://localhost:3333`.

Detalhes em [`mobile/README.md`](./mobile/README.md).

---

## Documentação por pacote

- [Backend — instalação, variáveis, scripts](./backend/README.md)
- [Mobile — Expo, API e dispositivo](./mobile/README.md)

---

## Licença

Defina a licença ao publicar (ex.: MIT), conforme a instituição ou a equipa.
