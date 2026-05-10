# Conectfy — Mobile

App **Expo** (React Native) com **expo-router**: conversas, contatos, círculos e autenticação contra o backend NestJS do monorepositório.

Para **backend, PostgreSQL, seed e visão geral do monorepo**, consulte o [README na raiz do repositório](../README.md).

---

## Pré-requisitos

### Node.js e npm

1. Instale o **Node.js LTS** (recomendado **20 ou superior**): [https://nodejs.org](https://nodejs.org).
2. No instalador Windows, mantenha a opção que associa o Node ao **npm** e ao PATH.
3. Feche e reabra o terminal (PowerShell, CMD ou integrado do VS Code / Cursor).
4. Confirme a instalação:

```bash
node -v
npm -v
```

Deve aparecer uma versão de Node ≥ 20 e uma versão de npm compatível. Se o comando não for reconhecido, reinicie o computador ou verifique o PATH do sistema.

### Demais itens

| Item | Uso |
|------|-----|
| **Git** | Clonar o repositório (se aplicável). |
| **Backend NestJS** | Rodando e acessível na porta em que estiver configurado (padrão do projeto: **3333**). Sem o backend, login e APIs falham. |
| **Expo Go** (Android / iOS) | Teste rápido no **celular físico** na mesma rede Wi‑Fi do PC. [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) / [App Store](https://apps.apple.com/app/expo-go/id982107779). |
| **Android Studio** + **AVD** | Opcional: **emulador Android** no PC. Instalação detalhada do SDK e AVD: secção correspondente no [README da raiz](../README.md). |

Conta **Expo** ([expo.dev](https://expo.dev)) é opcional neste fluxo de desenvolvimento com Expo Go; útil para builds na nuvem (EAS), não obrigatória para `expo start` local.

---

## Instalação do projeto

1. Obtenha o código do monorepositório (clone, ZIP da instituição, etc.) e abra um terminal na pasta do projeto.
2. Entre na pasta do app mobile:

```bash
cd mobile
```

3. Instale as dependências:

```bash
npm install
```

4. Aguarde o fim sem erros. Se houver falha de rede ou permissão, execute o terminal **como administrador** apenas se necessário; em geral basta repetir `npm install` ou limpar cache (`npm cache clean --force`) em último caso.

**Não commite credenciais:** arquivos `.env` estão no `.gitignore` do mobile.

---

## Configuração da API (`EXPO_PUBLIC_API_URL`)

### O que essa variável faz

O cliente HTTP monta a URL base em `api/client.ts`. O Expo injeta variáveis públicas no bundle; apenas nomes que começam com **`EXPO_PUBLIC_`** ficam disponíveis no app.

O arquivo `app.config.ts` carrega **`dotenv`** na raiz do pacote `mobile/`, portanto variáveis devem estar no arquivo **`.env`** dentro de **`mobile/`** (não na raiz do monorepo), salvo uso avançado com export no shell antes de subir o Metro.

### Formato

Uma linha por variável. Sem aspas obrigatórias para URLs simples:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.15:3333
```

- Use **`http://`** (o código aceita host sem protocolo e normaliza, mas explícito evita ambiguidade).
- Inclua a **porta do backend** (no projeto, por padrão **`3333`**).
- **Não** use espaços em volta do `=`.

### Comportamento quando a variável **não** está definida

Se **`EXPO_PUBLIC_API_URL`** estiver vazia ou ausente:

| Ambiente | Resolução típica no código |
|----------|------------------------------|
| **Emulador Android** | `http://10.0.2.2:3333` (`10.0.2.2` é o alias do PC host no emulador). |
| **Simulador iOS** | `http://localhost:3333`. |
| **Celular físico (Expo Go)** | Tenta inferir o IP do PC a partir do bundle Metro (`scriptURL` / linking). Se a inferência falhar, o fallback pode não ser o IP correto — **defina `EXPO_PUBLIC_API_URL` explicitamente** para evitar dúvidas. |

Se você **definir** `EXPO_PUBLIC_API_URL` com `localhost` ou `127.0.0.1` no Android, o código **reescreve** o host para **`10.0.2.2`** no emulador, para que o tráfego vá ao PC e não ao próprio emulador.

### Tabela rápida por destino

| Onde o app roda | Valor recomendado para `EXPO_PUBLIC_API_URL` |
|-----------------|-----------------------------------------------|
| **Emulador Android** | Omitir a variável **ou** `http://10.0.2.2:3333`. |
| **Simulador iOS (macOS)** | Omitir **ou** `http://localhost:3333`. |
| **Celular físico (mesma Wi‑Fi)** | `http://<IPv4_DO_PC>:3333` — ver secção [Testando no celular](#testando-no-celular--emulador). **Não** use `localhost` no aparelho. |

### Variáveis opcionais (login social)

Só necessárias se for usar Google / Facebook / Instagram no app:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_FACEBOOK_APP_ID`
- `EXPO_PUBLIC_INSTAGRAM_APP_ID`

### Após alterar `.env`

Variáveis são lidas quando o **Metro bundler** sobe. Sempre que mudar `.env`:

1. No terminal do Expo, pare com **`Ctrl+C`**.
2. Suba de novo: `npx expo start` (ou `npm start`).
3. Se o app ainda parecer usar valor antigo, limpe o cache do Metro na próxima subida:

```bash
npx expo start --clear
```

Atalho equivalente em algumas versões: `npx expo start -c`.

---

## Executar o app

Na pasta **`mobile/`**:

```bash
npm start
```

Equivalente direto:

```bash
npx expo start
```

Isso inicia o **Metro** e exibe o menu interativo (QR Code, opções por tecla).

### Scripts npm (`package.json`)

| Comando | Descrição |
|---------|-----------|
| `npm start` | `expo start` — desenvolvimento padrão. |
| `npm run android` | `expo run:android` — build/execução nativa Android (SDK / emulador ou USB configurados). |
| `npm run ios` | `expo run:ios` — apenas **macOS** com Xcode. |
| `npm run web` | `expo start --web` — experimental para web. |
| `npm run lint` | Lint do projeto Expo. |
| `npm run typecheck` | `tsc --noEmit` — verificação TypeScript. |

### Atalhos úteis no terminal do Expo (com bundler em foco)

Depois de `expo start`, teclas comuns:

| Tecla / comando | Efeito |
|-----------------|--------|
| **`a`** | Abrir no **emulador Android** (se existir AVD / ambiente). |
| **`i`** | Abrir no **simulador iOS** (só macOS). |
| **`w`** | Abrir no navegador (modo web, se suportado). |
| **`r`** | Recarregar o app nos dispositivos conectados. |
| **`m`** | Abrir menu de desenvolvedor no dispositivo (conforme plataforma). |
| **`Shift+m`** | Escolher tema / opções do menu (varia por versão). |

Linha de comando adicional:

```bash
npx expo start --tunnel
```

Útil quando LAN é restrita (firewall corporativo, rede segmentada); pode ser mais lento que o modo **LAN** padrão.

Para diagnóstico do ambiente:

```bash
npx expo-doctor
```

---

## Testando no celular / emulador

### Pré-condição comum

O **backend** deve estar em execução (por exemplo `npm run start:dev` na pasta `backend`) e ouvindo na mesma porta configurada em **`EXPO_PUBLIC_API_URL`** (ex.: **3333**). Firewall do Windows deve permitir **Node.js** na rede **privada** quando o celular acessa o PC pelo IP.

### Emulador Android

1. Instale e configure o **Android Studio**, crie um **AVD** e inicie o emulador (detalhes no [README da raiz](../README.md)).
2. Suba o backend na máquina host.
3. Na pasta `mobile`, rode `npm start` ou `npx expo start`.
4. Com o emulador já aberto, pressione **`a`** no terminal do Expo para instalar/abrir o app no emulador.

URL típica sem `.env`: **`http://10.0.2.2:3333`** (mapeia o backend no `localhost` do PC).

### Celular físico (Expo Go)

1. Celular e PC na **mesma rede Wi‑Fi** (evite “guest” / isolamento de clientes, se possível).
2. Defina **`EXPO_PUBLIC_API_URL`** apontando para o PC, usando o **IPv4** local do computador (passos abaixo).
3. Rode `npx expo start` no modo **LAN** (padrão).
4. Abra o **Expo Go** e escaneie o **QR Code** do terminal (Android: câmera ou Expo Go; iOS: câmera nativa ou Expo Go conforme documentação atual do Expo).

#### Descobrir o IPv4 do PC no Windows

1. Abra o **Prompt de Comando**: `Win + R`, digite `cmd`, Enter (ou pesquise **cmd** no menu Iniciar).
2. Execute:

```bash
ipconfig
```

3. Localize o adaptador em uso (**Wi‑Fi** ou **Ethernet**) e copie o **Endereço IPv4** (ex.: `192.168.0.15`).
4. No arquivo **`mobile/.env`**, use:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.15:3333
```

Substitua pelo seu IPv4 real e pela porta do backend se não for `3333`.

5. Pare o bundler (`Ctrl+C`) e rode `npx expo start` de novo (ou `npx expo start --clear` se necessário).

#### Conferência rápida

No console de depuração do app (Metro / log), o cliente registra uma linha no estilo **`API_URL`**, útil para confirmar para onde as requisições HTTP vão.

### iOS Simulator (macOS)

Em geral **`http://localhost:3333`** no host Mac funciona para o simulador. Alinhe com a porta real do backend.

---

## Estrutura relevante

| Caminho | Função |
|---------|--------|
| `app/` | Rotas **file-based** (expo-router): autenticação, abas, chat dinâmico (`[peerId]`), etc. |
| `api/client.ts` | **Axios**, URL base (`API_URL`), interceptors e resolução da URL do backend. |
| `app.config.ts` | Configuração Expo; `extra.apiUrl` e carregamento de ambiente via **dotenv**. |
| `app.json` | Metadados estáticos do Expo (fundindo com `app.config.ts`). |

---

## Solução de problemas

| Sintoma | Verificação |
|---------|----------------|
| **“Sem conexão com o servidor”** / timeouts | Backend em `npm run start:dev`; porta correta; **`EXPO_PUBLIC_API_URL`** no celular com IP do PC, não `localhost`. Firewall liberando a porta (ex.: **3333**). |
| **Seed ou login ok no PC, app no celular falha** | URL no `.env` do mobile com **IPv4** (`ipconfig`); PC e telefone na mesma Wi‑Fi; reiniciar Metro após mudar `.env`. |
| **Funciona no emulador, não no físico** | Definir explicitamente `EXPO_PUBLIC_API_URL=http://<IPv4>:3333`; desativar VPN que isole o tráfego; testar `npx expo start --tunnel` se a LAN bloquear. |
| **Chat ou tempo real instável** | WebSocket usa o mesmo host que a API; garanta que o IP/URL alcançável é o mesmo para HTTP e socket no ambiente de teste. |
| **Variável de ambiente “não pega”** | Arquivo é **`mobile/.env`**; nome começa com **`EXPO_PUBLIC_`**; parar Metro com `Ctrl+C` e subir de novo; tentar `npx expo start --clear`. |
| **`expo` / `npm` não encontrado** | Node instalado corretamente; terminal novo após instalar Node; conferir `node -v` e `npm -v`. |
| **Emulador lento** | Mais RAM para o AVD; fechar outros apps; virtualização habilitada na BIOS; ver dicas no README da raiz. |

---

## Referências

- [Documentação Expo](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [README do backend](../backend/README.md) — variáveis, scripts, porta da API
- [README da raiz do monorepo](../README.md) — fluxo completo (PostgreSQL, seed, Android Studio)
