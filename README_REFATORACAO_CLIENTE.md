# Refatoração da entidade Cliente

## Arquitetura

`index.html → ClienteService.js → ClienteValidator.js / ClienteRules.js → ClienteRepository.js → Google Sheets`

## Responsabilidades

- `ClienteService.js`: coordena o cadastro e expõe os pontos de entrada compatíveis com `index.html`.
- `ClienteValidator.js`: valida campos e normaliza dados; não acessa planilhas.
- `ClienteRules.js`: confirma que as referências cidade/bairro consultadas existem e correspondem aos códigos enviados.
- `ClienteRepository.js`: concentra consultas às abas `CIDADES` e `BAIRROS`, valida cabeçalhos e grava na aba `CLIENTES`.
- `Main.gs.js`: mantém os helpers usados pelos módulos antigos e deixa de implementar diretamente o fluxo de Cliente.

## Compatibilidade preservada

- `cadastrarCliente(dados)`
- `listarCidadesSelecao()`
- `listarBairrosSelecao()`
- Abas e cabeçalhos existentes
- Mensagem de sucesso do cadastro
- Geração automática do código
- Normalização de texto e validações atuais do cliente

## Teste com clasp

1. Faça backup ou commit das alterações locais.
2. Execute `clasp status` e confira a lista de arquivos.
3. Revise as alterações com Git (`git diff`).
4. Execute `clasp push`.
5. Teste o cadastro de cliente e as listas de cidade/bairro no Web App.
6. Confirme que agendamentos continuam funcionando.

O teste local não comprova acesso ao Google Sheets real; a validação final depende da execução no projeto implantado.
