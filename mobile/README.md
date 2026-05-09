# Conectfy — Mobile

App **Expo** (React Native) com **expo-router**, voltado a conversas, contatos, círculos e fluxos de autenticação contra o backend NestJS do monorepositório.

---

## Pré-requisitos

- Node.js 20+
- Conta [Expo](https://expo.dev) (opcional, para builds na nuvem)
- **Backend** rodando e acessível a partir do dispositivo ou emulador (ver secção [API](#api-base-url))

---

## Instalação

Na pasta `mobile/`:

```bash
npm install
```

---

## Configuração da API (`EXPO_PUBLIC_API_URL`)

O cliente HTTP resolve a URL em `api/client.ts`. Regra prática:

| Onde roda o app | O que usar |
|-----------------|------------|
| **Android Emulator** | Deixe **sem** `EXPO_PUBLIC_API_URL` ou use `http://10.0.2.2:3333` (mapeia para o `localhost` da máquina host). |
| **iOS Simulator** | `http://localhost:3333` costuma funcionar. |
| **Celular físico (mesma Wi‑Fi)** | IP da sua máquina na rede local, ex.: `http://192.168.0.15:3333` — **não** use `localhost` no aparelho. |

Crie um arquivo **`.env`** na pasta `mobile/` (ou exporte no shell antes do `expo start`):

```env
EXPO_PUBLIC_API_URL=http://192.168.0.15:3333
```

Reinicie o bundler após alterar variáveis (`Ctrl+C` e `npx expo start` de novo).

Variáveis **opcionais** (login social — só se for usar):

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_FACEBOOK_APP_ID`
- `EXPO_PUBLIC_INSTAGRAM_APP_ID`

---

## Executar o projeto

```bash
npm start
# ou
npx expo start
```

Comandos úteis:

| Comando | Descrição |
|---------|-----------|
| `npm start` | Metro + QR Code / menu interativo |
| `npm run android` | Build/run nativo Android (requer ambiente Android configurado) |
| `npm run ios` | Build/run nativo iOS (macOS + Xcode) |
| `npm run typecheck` | `tsc --noEmit` |

---

## Ver o app no celular

1. Suba o **backend** (`npm run start:dev` na pasta `backend`).
2. Ajuste **`EXPO_PUBLIC_API_URL`** se for **dispositivo físico** (IP do PC).
3. Na pasta `mobile`, rode `npx expo start`.
4. No Android/iOS:
   - **Expo Go**: escaneie o QR Code (mesma rede Wi‑Fi que o computador, no modo LAN).
   - **Tunnel** (rede complicada): `npx expo start --tunnel` (pode ser mais lento).

Confira no console do app a linha **`API_URL`** (log do cliente) para garantir que aponta para o servidor certo.

---

## Estrutura relevante

- `app/` — rotas file-based (auth, abas, chat `[peerId]`, etc.)
- `api/client.ts` — Axios + URL base
- `app.config.ts` — injeta `extra.apiUrl` a partir do ambiente

---

## Solução de problemas

| Sintoma | O que fazer |
|---------|-------------|
| “Sem conexão com o servidor” | Backend ligado; firewall permitindo porta 3333; URL correta no `.env` do mobile |
| Funciona no emulador e não no celular | Definir IP da máquina em `EXPO_PUBLIC_API_URL` |
| Login/cadastro ok mas chat falha | WebSocket precisa do mesmo host alcançável; confira API e rede |

---

## Referência

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- Backend: [`../backend/README.md`](../backend/README.md)
