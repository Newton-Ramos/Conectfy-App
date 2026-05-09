# Conectfy

Aplicação de produtividade e comunicação: **backend NestJS** (API REST + WebSocket) e **app mobile Expo** (React Native). O repositório está organizado em pastas com instruções de execução em cada uma.

---

## Estrutura do repositório

| Pasta      | Conteúdo |
|-----------|----------|
| `backend/` | API NestJS, autenticação JWT, chat em tempo real (Socket.IO), upload de mídia, PostgreSQL (TypeORM). |
| `mobile/`  | App Expo (expo-router), conversas, contatos, círculos, calendário local, login. |

---

## Pré-requisitos

- **Node.js** 20+ (LTS recomendado)
- **npm** (ou pnpm/yarn, se preferir)
- **PostgreSQL** acessível localmente (ou remoto) para o backend
- **Expo Go** no telefone (teste rápido) ou **Android Studio / Xcode** (emuladores e builds)

---

## Como rodar o projeto (visão geral)

1. **Banco de dados** — crie o banco referenciado no `.env` do backend (ex.: `conectfy`).
2. **Backend** — instale dependências, copie `.env.example` → `.env`, ajuste credenciais e suba a API (porta padrão **3333**).  
   → Detalhes: [`backend/README.md`](./backend/README.md)
3. **Mobile** — instale dependências, configure `EXPO_PUBLIC_API_URL` se for testar em **celular físico** na mesma rede, e inicie o Expo.  
   → Detalhes: [`mobile/README.md`](./mobile/README.md)

Ordem prática: terminal 1 = backend em modo desenvolvimento; terminal 2 = `npx expo start` na pasta `mobile`.

---

## Testar no celular

O app mobile precisa alcançar o backend pela rede:

- **Emulador Android**: costuma funcionar com `http://10.0.2.2:3333` (padrão no código quando não há `.env`).
- **Dispositivo físico**: use o **IP da máquina na LAN** (ex.: `http://192.168.1.10:3333`) na variável `EXPO_PUBLIC_API_URL`.
- **iOS Simulator**: `http://localhost:3333` em geral funciona.

Instruções passo a passo estão em [`mobile/README.md`](./mobile/README.md).

---

## Documentação por pacote

- [Backend — instalação, variáveis de ambiente e scripts](./backend/README.md)
- [Mobile — Expo, URL da API e uso no aparelho](./mobile/README.md)

---

## Licença

Defina a licença no repositório ao publicar no GitHub (ex.: MIT), conforme a política da sua instituição ou equipe.
