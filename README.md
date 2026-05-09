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
- **Expo Go** no telefone (teste rápido) ou **Android Studio** (emulador no PC Windows/Linux/macOS) / **Xcode** (somente macOS, iOS)

---

## Rodar o app no PC com Windows (emulador Android)

Para desenvolver **sem telefone físico**, é preciso instalar o **Android Studio** — ele inclui o **Android Emulator** (AVD), que simula um aparelho Android no computador. Passo a passo típico:

### 1. Verificar requisitos do Windows

- **RAM**: pelo menos **8 GB** no PC (16 GB recomendado para o emulador rodar fluido).
- **Virtualização**: o emulador usa **Hyper-V** ou o hipervisor da Intel/AMD. Na maior parte dos PCs modernos a virtualização já vem ativa na BIOS/UEFI (`Intel VT-x` ou `AMD-V`). Se o Android Studio avisar que a virtualização está desligada, reinicie o PC, entre na BIOS/UEFI e ative essa opção (o nome varia por fabricante).

### 2. Baixar e instalar o Android Studio

1. Aceda ao site oficial: [developer.android.com/studio](https://developer.android.com/studio).
2. Faça o download do instalador para **Windows**.
3. Execute o instalador e avance com **Next** nas etapas padrão.
4. Na configuração inicial, aceite instalar o **Android SDK**, **Android SDK Platform** e as ferramentas sugeridas (o assistente guia isto).

### 3. Instalar componentes do SDK (se o assistente não completar tudo)

1. Abra o **Android Studio**.
2. Vá a **Settings** (ou **More Actions** → **SDK Manager** na tela de boas-vindas).
3. No separador **SDK Platforms**, marque pelo menos uma versão recente de **Android** (por exemplo **Android 14 ou 15**) — marque a linha e clique em **Apply** para baixar.
4. No separador **SDK Tools**, confira que estão instalados, entre outros: **Android SDK Build-Tools**, **Android Emulator**, **Android SDK Platform-Tools**. Aplique as alterações.

### 4. Criar um dispositivo virtual (AVD)

1. No Android Studio: **More Actions** → **Virtual Device Manager** (ou menu **Tools** → **Device Manager**).
2. Clique em **Create Device**.
3. Escolha um modelo (ex.: **Pixel 6** ou **Pixel 7**) → **Next**.
4. Escolha uma **system image** (imagem do sistema): prefira uma linha com **Download** ao lado se ainda não tiver — baixe uma imagem **Google APIs** ou **Google Play** (ARM ou x86 conforme o seu PC; em máquinas Intel/AMD comuns costuma ser **x86_64** ou equivalente indicado pelo Studio).
5. Finalize o assistente (**Finish**).

### 5. Iniciar o emulador

1. Na lista de dispositivos do **Device Manager**, clique no ícone **Play** ao lado do AVD que criou.
2. Aguarde a janela do Android virtual abrir (na primeira vez pode demorar alguns minutos).

### 6. Ligar o projeto Conectfy ao emulador

1. Suba o **backend** (pasta `backend`, ver [`backend/README.md`](./backend/README.md)).
2. Na pasta **`mobile`**, execute:

   ```bash
   npm install
   npx expo start
   ```

3. Com o Metro Bundler aberto e o **emulador Android já a correr**, pressione **`a`** no terminal para abrir a app no Android, ou use a opção equivalente no menu interativo do Expo.

**API no emulador**: o código do projeto tenta usar **`http://10.0.2.2:3333`** no Android emulador para falar com o backend na máquina host (porta **3333**). Esse endereço é o alias especial do emulador para o `localhost` do seu PC; não use `localhost` dentro do emulador para o backend.

### Problemas frequentes (Windows)

| Sintoma | O que tentar |
|--------|----------------|
| Emulador muito lento | Fechar outras apps pesadas; criar um AVD com menos RAM ou imagem mais leve; confirmar virtualização na BIOS. |
| “HAXM” / hypervisor | Seguir o assistente do Android Studio para instalar o componente certo ou ativar **Windows Hypervisor Platform** em *Ativar ou desativar funcionalidades do Windows*. |
| App não liga ao backend | Backend a ouvir na porta 3333; firewall do Windows a permitir Node na rede privada; confirmar `EXPO_PUBLIC_API_URL` só se mudares o padrão (ver [`mobile/README.md`](./mobile/README.md)). |

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
