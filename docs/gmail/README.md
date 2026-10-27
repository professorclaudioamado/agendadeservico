# Integração com Gmail — processamento manual de agendamentos

## Objetivo

Permitir que o usuário clique em **Verificar e-mail** na tela Agenda. O Google Apps Script lê mensagens da caixa de entrada, localiza os cadastros por nome exato e cria os agendamentos pelo fluxo já existente.

Não são utilizados plugins ou conectores externos. A integração usa o serviço nativo `GmailApp` do Google Apps Script.

## Formato do e-mail

Assunto exato:

```text
AGENDAMENTO
```

Corpo:

```text
Cliente: Maria Silva
Serviço: Consulta
Profissional: João Santos
Data: 30/10/2026
Horário: 14:00
```

Os nomes de cliente, serviço e profissional devem corresponder exatamente aos nomes cadastrados nas respectivas abas. A data deve ser DD/MM/AAAA e o horário deve ser HH:MM no formato de 24 horas.

## Arquivos envolvidos

- `GmailAgendamentoRepository.js`: pesquisa mensagens na caixa de entrada e aplica o rótulo de processamento.
- `GmailAgendamentoValidator.js`: extrai os campos e valida os formatos.
- `GmailAgendamentoService.js`: coordena o processamento e chama `AgendamentoService.cadastrar()`.
- `AgendamentoRepository.js`: continua responsável pelo acesso aos cadastros e pela gravação na planilha.
- `index.html`: contém o botão e apresenta o resumo da execução.

## Comportamento

- Procura até 100 conversas candidatas por execução.
- Considera apenas mensagens cujo assunto seja exatamente `AGENDAMENTO`, dentro da caixa de entrada.
- Localiza cliente, serviço e profissional por nome exato. Nomes inexistentes ou duplicados geram um erro para aquela mensagem.
- Cria o agendamento com status `AGENDADO` e valor vindo do cadastro do serviço.
- Após sucesso, aplica o rótulo `AGENDAMENTO_PROCESSADO` à conversa. Não apaga a mensagem nem a marca como lida.
- Mensagens com erro não recebem o rótulo, para que possam ser corrigidas e tentadas novamente.
- Não há acionador automático.

A gravação na planilha e a aplicação do rótulo não são uma única transação. Se houver uma falha após a gravação e antes do rótulo, a mensagem pode ser reprocessada; essa situação deve ser verificada no teste.

## Como testar

1. Publique os arquivos desta branch no projeto Google Apps Script de teste.
2. Confirme que existem nas abas `CLIENTES`, `SERVICOS` e `FUNCIONARIOS` registros para os nomes usados no e-mail.
3. Envie um e-mail para a conta Gmail usada pelo Apps Script, com o assunto e corpo do exemplo acima, substituindo os nomes por cadastros reais.
4. Abra a aplicação e acesse a tela Agenda.
5. Clique em **Verificar e-mail** e autorize o acesso ao Gmail se o Google solicitar.
6. Confira o resumo na interface e confirme a nova linha na aba `AGENDA`.
7. Clique novamente em **Verificar e-mail** e confirme que a mesma conversa não cria outro agendamento.
8. Teste um nome inexistente e confirme que nenhum agendamento é criado para aquela mensagem.

## Limitação do teste atual

A validação de código e a execução real dependem da publicação e autorização no projeto Google Apps Script. Nenhum teste aqui deve usar plugin ou conector do Gmail.
