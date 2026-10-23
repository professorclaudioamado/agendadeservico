# Refatoração completa — Agendamento

## Arquitetura aplicada

**Interface → Service → Rules / Validator → Repository → Google Sheets**

- **Service — Camada de Serviço:** coordena o caso de uso.
- **Rules — Regras de Negócio:** concentra as regras do Agendamento.
- **Validator — Validador:** valida os dados de entrada.
- **Repository — Repositório:** centraliza o acesso ao Google Sheets.

## Arquivos criados

- `AgendamentoService.js`
- `AgendamentoRules.js`
- `AgendamentoValidator.js`
- `AgendamentoRepository.js`

## Arquivo alterado

- `Main.gs.js`

O bloco antigo de Agenda foi removido de `Main.gs.js`. As funções públicas que o `index.html` já utilizava foram preservadas com os mesmos nomes em `AgendamentoService.js`:

- `listarFuncionariosAgenda()`
- `listarClientesAgenda()`
- `listarServicosAgenda()`
- `cadastrarAgendamento(dados)`

Por isso, esta refatoração não exige mudança no frontend para essas chamadas.

## Comportamento preservado

A refatoração mantém as regras observadas no código original:

- data obrigatória e válida;
- hora no formato `HH:MM`;
- funcionário precisa existir;
- cliente precisa existir;
- serviço precisa existir;
- status aceitos: `AGENDADO`, `CONFIRMADO`, `CONCLUÍDO`, `CANCELADO`;
- o valor do agendamento é obtido da aba `SERVICOS`;
- novo código é o maior código existente + 1;
- gravação continua na aba `AGENDA`;
- data continua formatada como `dd/MM/yyyy`;
- valor continua formatado como moeda.

## O que NÃO foi adicionado

Refactoring — Refatoração deve, em primeiro lugar, melhorar a estrutura sem alterar silenciosamente o comportamento.

O código original recebido não verificava conflito de horários entre funcionários. Por isso, a regra de conflito não foi adicionada nesta etapa. Ela deve entrar em uma evolução funcional posterior, acompanhada de teste próprio.

## Ordem para colocar no projeto

1. Substitua o conteúdo local de `Main.gs.js` pela versão refatorada.
2. Adicione os quatro novos arquivos `.js`.
3. Execute `clasp status`.
4. Confira se todos aparecem em **Tracked files**.
5. Execute `clasp push`.
6. Abra o Web App e teste o fluxo de Agenda.

## Testes mínimos

1. Abrir a tela de Agenda e verificar se funcionários carregam.
2. Verificar se clientes carregam.
3. Verificar se serviços e valores carregam.
4. Cadastrar um agendamento válido.
5. Conferir a nova linha na aba `AGENDA`.
6. Tentar salvar sem Data.
7. Tentar uma hora inválida.
8. Tentar um status inválido.
9. Confirmar que mensagens de erro continuam amigáveis.
