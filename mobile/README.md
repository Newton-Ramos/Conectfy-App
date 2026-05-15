# Conectfy — Mobile

Aplicativo **Expo** / **React Native** do Conectfy: chat, contatos e comunicação em tempo real com o backend **NestJS** (REST + Socket.IO).

---

## Stack

- **Expo** (SDK e fluxo de desenvolvimento)
- **React Native**
- **expo-router** — rotas baseadas em arquivos
- **Axios** — HTTP
- **socket.io-client** — WebSockets

---

## Pré-requisitos

- **Node.js** 20+
- Backend em execução (local ou deploy, ex.: Render) — ver **[README do backend](../backend/README.md)**
- **Expo Go** no telefone ou emulador Android / simulador iOS

---

## Setup

### 1. Instalação

```bash
cd mobile
npm install
```

### 2. Variáveis de ambiente (API)

```bash
cp .env.example .env
```

Defina pelo menos:

```env
EXPO_PUBLIC_API_URL=http://<SEU_IP_NA_LAN>:3333
```

| Ambiente | Valor típico de `EXPO_PUBLIC_API_URL` |
|----------|----------------------------------------|
| Celular físico (Wi‑Fi, backend no PC) | `http://<IPv4_do_PC>:3333` |
| Emulador Android (backend no PC) | `http://10.0.2.2:3333` |
| Backend publicado no **Render** | `https://conectfy-backend.onrender.com` |

- Use o prefixo **`EXPO_PUBLIC_`** para variáveis lidas pelo bundle do Expo.  
- **HTTPS** na URL pública (Render) é o esperado em produção.  
- Após alterar `.env`, reinicie o Metro: `Ctrl+C` e rode `npx expo start` de novo.

Outras variáveis (login social, etc.) estão descritas em **`.env.example`**.

### 3. Executar o projeto

```bash
npx expo start
```

- **Expo Go:** instale o app [Expo Go](https://expo.dev/go), escaneie o QR code (mesma rede que o PC, ou use túnel `npx expo start --tunnel`).  
- **Emulador Android:** com o emulador aberto, pressione **`a`** no terminal.  
- **iOS (macOS):** pressione **`i`** com Xcode / simulador configurado.

O script `npm start` no `package.json` do mobile costuma ser alias de `expo start`; o fluxo recomendado na documentação é **`npx expo start`** para garantir a CLI local.

---

## Conectar ao backend (`EXPO_PUBLIC_API_URL`)

1. Suba o backend (`npm run start:dev` local ou URL Render em produção).  
2. No mobile, defina **`EXPO_PUBLIC_API_URL`** para a **base URL** da API (sem path extra, salvo se a API exigir).  
3. Em **produção** (build EAS), configure a mesma variável nos **secrets** do projeto Expo/EAS ou no arquivo de ambiente do perfil de build.

Se o app não autenticar ou der erro de rede, confira firewall, HTTPS vs HTTP e se o celular alcança a URL (em Render, use URL **externa** pública do serviço web).

---

## Expo Go vs build EAS (EAS Build)

| Aspecto | **Expo Go** | **Build EAS** (preview / produção) |
|---------|-------------|-------------------------------------|
| O que é | App genérico da Expo que carrega **seu** projeto em modo desenvolvimento | **APK/IPA** (ou binário) **compilado** com o seu código e nativos |
| Quando usar | Desenvolvimento rápido, testes na faculdade com QR code | Entregar ao professor **sem** depender do seu PC ligado; loja ou instalação direta |
| Backend | Continua usando `EXPO_PUBLIC_API_URL` apontando para seu servidor | Idem: a URL da API é “embaked” no build conforme variáveis na hora do **eas build** |
| Limitações | Precisa ser compatível com o SDK do Expo Go; não inclui todos os módulos nativos custom | Suporta configuração de app assinado, ícones, `eas.json`, etc. |

Para gerar um **APK** de teste (perfil `preview` típico), use o fluxo **EAS** documentado no [Expo EAS Build](https://docs.expo.dev/build/introduction/) (conta Expo, `eas build`, etc.).

---

## Scripts principais

| Comando | Função |
|---------|--------|
| `npm install` | Instala dependências |
| `npx expo start` | Servidor Metro + QR / atalhos de plataforma |
| `npm start` | Em geral equivalente ao `expo start` (ver `package.json`) |
| `npm run android` | Fluxo nativo Android (`expo run:android`) |
| `npm run ios` | Fluxo nativo iOS (macOS) |
| `npm run web` | Versão web do Expo |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Backend

URL padrão no computador de desenvolvimento: **`http://localhost:3333`**. Deploy, variáveis e CORS: **[README do backend](../backend/README.md)**.

---

## Referências

- [README principal](../README.md)  
- [README do backend](../backend/README.md)  
- [Expo](https://docs.expo.dev/)  
- [Expo Router](https://docs.expo.dev/router/introduction/)  
- [EAS Build](https://docs.expo.dev/build/introduction/)
