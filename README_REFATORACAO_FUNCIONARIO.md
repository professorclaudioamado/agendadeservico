# Refatoração de Funcionário — Etapa incremental

## Objetivo

Separar o cadastro de funcionários em camadas sem alterar o contrato usado pela interface ou a estrutura da aba `FUNCIONARIOS`.

## Fluxo aplicado

**Interface → FuncionarioService → FuncionarioValidator → FuncionarioRepository → Google Sheets**

- `FuncionarioService.js`: coordena o cadastro e mantém a função pública `cadastrarFuncionario(nome)`.
- `FuncionarioValidator.js`: exige um nome não vazio e o normaliza removendo espaços externos e convertendo para maiúsculas.
- `FuncionarioRepository.js`: valida os cabeçalhos, calcula o próximo código e grava na aba `FUNCIONARIOS`.
- `Main.gs.js`: deixa de implementar diretamente o cadastro; os outros cadastros legados não foram alterados.
- `index.html`: mantido sem alterações.

## Compatibilidade preservada

- Nome da função chamada pela interface: `cadastrarFuncionario(nome)`.
- Nome da aba: `FUNCIONARIOS`.
- Cabeçalhos: `Código`, `Nome`.
- Regra de código: maior código numérico existente mais um, ou `1` quando ainda não há registros.
- Mensagem de sucesso: `Funcionário cadastrado com sucesso! Código: N`.
- Mensagem para nome ausente: `Informe o nome do funcionário.`
- A listagem de funcionários usada pela Agenda continua em `AgendamentoRepository.js`; não foi alterada nesta etapa.

## Arquivos criados

- `FuncionarioService.js`
- `FuncionarioValidator.js`
- `FuncionarioRepository.js`
- `README_REFATORACAO_FUNCIONARIO.md`

## Arquivo alterado

- `Main.gs.js`

## Arquivos mantidos

- `index.html`, todos os arquivos de Agendamento, Cliente, `appsscript.json` e `.clasp.json`.

## Testes

Os testes locais com planilha simulada devem cobrir cadastro válido, normalização, geração de código, nome ausente, aba ausente e cabeçalho inválido. Eles não substituem o teste no Google Apps Script real.

## Próximo passo

Revisar `clasp status` e o diff, fazer backup/commit e testar o cadastro de funcionário e a criação de agendamento no ambiente real antes de iniciar outra entidade.
