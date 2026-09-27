# BoxTrack v0.0.12

## Novidades

- Adicionado cadastro persistido de categorias de armazenamento.
- Categorias iniciais: **Caixa**, **Saco** e **Mala**.
- Adicionada seleção obrigatória de categoria no cadastro e na edição de caixas.
- Backups e restaurações agora incluem as categorias.

## Correções e compatibilidade

- Caixas existentes em bancos anteriores são migradas automaticamente para a categoria **Caixa**.
- Mantida a numeração sequencial das caixas nas etiquetas impressas.

## Verificação

- Testes automatizados: `npm test -- --run`
- Build de produção: `npm run build`

