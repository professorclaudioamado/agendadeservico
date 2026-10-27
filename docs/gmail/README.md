# Integração com Gmail — Etapa 1: diagnóstico

## Objetivo

Preparar a leitura de e-mails que solicitam agendamentos, sem alterar o fluxo atual da aplicação nem gravar dados na planilha nesta etapa.

A integração procura mensagens cujo assunto seja exatamente `AGENDAMENTO`, sem diferenciar letras maiúsculas de minúsculas. Mensagens com prefixos ou texto adicional no assunto, como `Re: AGENDAMENTO` e `AGENDAMENTO urgente`, são descartadas após a conferência individual.

## Arquivos adicionados

- `GmailAgendamentoRepository.js` — pesquisa mensagens candidatas no Gmail e filtra o assunto exato.
- `GmailAgendamentoValidator.js` — extrai e valida Cliente, Serviço, Data e Horário.
- `GmailAgendamentoService.js` — coordena a análise e registra um resumo de diagnóstico nos logs.

A organização segue a arquitetura em camadas do projeto: Service → Validator / Repository. O repositório desta etapa acessa somente o Gmail; o acesso ao Google Sheets continuará nas classes Repository existentes.

## Formato esperado do e-mail

Assunto:

```text
AGENDAMENTO
```

Corpo:

```text
Cliente: Maria Silva
Serviço: Consulta
Data: 30/10/2026
Horário: 14:00
```

A validação de formato deve produzir os campos Cliente `Maria Silva`, Serviço `Consulta`, Data ISO `2026-10-30` e Horário `14:00`.

## Comportamento e limites

- A pesquisa consulta até 100 conversas candidatas por execução.
- Cada mensagem dentro das conversas retornadas é verificada individualmente.
- A data precisa estar no formato `DD/MM/AAAA` e corresponder a uma data real.
- O horário precisa estar no formato de 24 horas `HH:MM`.
- Os logs não incluem o corpo completo do e-mail.
- Nenhum agendamento é criado nesta etapa.
- Nenhuma mensagem é marcada como lida, movida ou alterada.
- Não há ainda verificação de existência do cliente/serviço nos cadastros, controle de duplicidade ou acionador automático.

## Como validar no Google Apps Script

1. Incorporar os três arquivos ao projeto Apps Script vinculado à aplicação.
2. Salvar e executar manualmente `verificarEmailsAgendamento()`.
3. Autorizar o acesso ao Gmail, caso o Google solicite.
4. Abrir o registro de execução e conferir o resumo e os registros `DIAGNOSTICO_GMAIL_AGENDAMENTO`.
5. Confirmar que os e-mails esperados são identificados e que nenhum registro foi criado na aba `AGENDA`.

## Testes locais realizados

- Verificação sintática dos três arquivos JavaScript.
- Extração do exemplo informado.
- Rejeição de data inexistente e horário inválido.
- Identificação de campos ausentes.

Esses testes locais não substituem a execução real com uma conta Gmail autorizada. A execução real ainda está pendente.

## Próxima etapa proposta

Após validar a leitura real, planejar a integração com o fluxo existente de agendamento. Antes de gravar qualquer coisa, será necessário mapear os nomes dos clientes e serviços aos códigos utilizados pelo sistema, definir o comportamento para solicitações inválidas e implementar uma forma persistente de evitar duplicidade pelo ID da mensagem do Gmail. O acionador automático deve ser configurado somente após testar o fluxo completo.
