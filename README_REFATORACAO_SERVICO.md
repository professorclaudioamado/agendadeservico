# Refatoração da entidade Serviço

## Objetivo

Separar a validação, a coordenação do cadastro e o acesso à planilha sem alterar o contrato usado pela interface.

## Fluxo

`index.html` → `cadastrarServico(nome, valor, tempo)` → `ServicoService` → `ServicoValidator` → `ServicoRepository` → aba `SERVICOS`.

## Arquivos criados

- `ServicoService.js`: coordena o caso de uso e mantém a função pública `cadastrarServico`.
- `ServicoValidator.js`: valida nome, valor e tempo e normaliza os dados.
- `ServicoRepository.js`: verifica a aba/cabeçalhos, gera o código e grava a linha.

## Arquivo alterado

- `Main.gs.js`: a implementação direta de `cadastrarServico` foi substituída por documentação que aponta para o novo ponto de entrada.

## Compatibilidade preservada

- Nome público da função: `cadastrarServico(nome, valor, tempo)`.
- Aba: `SERVICOS`.
- Cabeçalhos esperados: `Código`, `Nome`, `Valor`, `Tempo` (aceita `Codigo` sem acento na primeira coluna, como antes).
- Mensagens de validação e sucesso.
- Nome salvo em maiúsculas; valor pode usar vírgula decimal; tempo precisa ser inteiro maior que zero.
- Não foi criada uma camada `ServicoRules.js`, pois o fluxo atual não apresenta regra de negócio adicional além da validação dos dados.

## Testes locais

Foram executadas verificações de sintaxe e testes simulados de cadastro válido, normalização, geração do código e entradas inválidas. Os testes simulados não substituem a validação no Google Apps Script com a planilha real.
