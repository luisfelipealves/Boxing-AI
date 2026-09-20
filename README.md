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
