<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BoxTrack AI

Aplicação pessoal para organizar caixas, locais e itens domésticos.

## Armazenamento

Os dados são guardados localmente no navegador usando SQLite via IndexedDB. Não há conta, sincronização entre dispositivos ou API obrigatória.

Antes de limpar os dados do navegador, faça uma cópia de segurança pelo recurso de exportação quando ele estiver disponível.

## Execução local

Pré-requisito: Node.js.

```bash
npm install
npm run dev
```

O assistente de IA é opcional. Para ativá-lo, copie `.env.example` para `.env.local` e preencha `VITE_GOOGLE_GENAI_API_KEY` com uma chave própria. Essa chave fica acessível no navegador; não publique a aplicação com uma chave pessoal embutida.

## Android

O projeto também possui um app Android gerado com Capacitor.

Para atualizar o projeto nativo depois de alterar a aplicação web:

```bash
npm run build
npx cap sync android
```

Para gerar uma versão local de teste:

```bash
cd android
./gradlew assembleDebug
```

O workflow do GitHub Actions é executado quando uma tag `v*` é enviada. Ele gera APK e AAB e cria uma GitHub Release automaticamente:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Para assinar a versão release, configure estes Secrets no GitHub:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Sem esses Secrets, o workflow ainda gera os artefatos release, mas não assinados para distribuição.
