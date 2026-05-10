# Conectfy — Mobile

App Expo/React Native do Conectfy com chat, contatos e integração em tempo real com o backend NestJS.

---

## Stack

- Expo
- React Native
- expo-router
- Axios
- Socket.IO Client

---

## Pré-requisitos

- Node.js 20+
- Backend do projeto em execução (ver [`backend/README.md`](../backend/README.md))
- Expo Go ou emulador Android / simulador iOS

---

## Setup

### 1. Instalação

```bash
cd mobile
npm install
```

### 2. Configuração da API

Copie `.env.example` para `.env` na pasta `mobile/` e defina a URL da API, por exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3333
```

Substitua `192.168.x.x` pelo IPv4 do PC na mesma rede (**celular físico**). Ajuste a porta se o backend não usar **3333**.

| Ambiente | URL típica |
|----------|------------|
| Celular físico (Wi‑Fi) | `http://<IP_LOCAL_DO_PC>:3333` |
| Emulador Android | `http://10.0.2.2:3333` |
| iOS Simulator (macOS) | `http://localhost:3333` |

Variáveis públicas precisam do prefixo **`EXPO_PUBLIC_`**. Após alterar `.env`, reinicie o Metro (`Ctrl+C` → `npx expo start`).

Variáveis opcionais para login social estão documentadas no `.env.example`.

### 3. Executar o app

```bash
npx expo start
```

Use **Expo Go** no dispositivo ou pressione **`a`** no terminal com o **emulador Android** aberto ( **`i`** no macOS para iOS).

---

## Scripts principais

| Script | Função |
|--------|--------|
| `npm start` | Desenvolvimento |
| `npm run android` | Build/execução nativa Android |
| `npm run ios` | Nativo iOS (macOS / Xcode) |
| `npm run web` | Web |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

---

## Backend

O backend deve estar rodando; URL padrão no host é **`http://localhost:3333`**. Porta, variáveis e uploads — **[README do backend](../backend/README.md)**.

---

## Documentação adicional

- [README principal](../README.md)
- [README do backend](../backend/README.md)
- [Expo](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
