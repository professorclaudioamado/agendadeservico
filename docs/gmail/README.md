# Integração com Gmail — processamento de agendamentos

## Objetivo

A tela Agenda oferece dois processamentos manuais:

- **Verificar e-mail:** extrai os campos no formato fixo usando o validador tradicional.
- **Verificar e-mail com IA:** envia o texto do e-mail à API Groq para extrair os campos e, depois, utiliza as mesmas validações e o mesmo cadastro de agendamento.

Nenhum processamento automático é criado. Ambos dependem do clique do usuário.

## Formato recomendado do e-mail

Assunto exato: `AGENDAMENTO`

Corpo:

```text
Cliente: Maria Silva
Serviço: Consulta
Profissional: João Santos
Data: 30/10/2026
Horário: 14:00
```

Os nomes devem corresponder exatamente aos registros nas abas CLIENTES, SERVICOS e FUNCIONARIOS. A data deve estar explicitamente informada e ser válida. O horário deve usar HH:MM no formato de 24 horas.

A rotina tradicional exige esse formato de campos. A rotina com IA aceita texto mais livre, mas não deve deduzir datas relativas como "amanhã", nem inventar dados ausentes.

## Arquivos envolvidos

- `GmailAgendamentoRepository.js`: pesquisa e-mails pendentes e aplica o rótulo de processamento.
- `GmailAgendamentoValidator.js`: valida os campos, a data e o horário.
- `GmailAgendamentoService.js`: processamento tradicional.
- `GmailAgendamentoIAService.js`: processamento com Groq e extração estruturada.
- `AgendamentoService.js`: gravação oficial do agendamento.
- `AgendamentoRepository.js`: leitura dos cadastros e gravação na planilha.
- `index.html`: os dois botões e o resumo dos resultados.

## Configuração da Groq

No editor do Google Apps Script:

1. Abra **Configurações do projeto**.
2. Localize **Propriedades do script**.
3. Adicione a propriedade `GROQ_API_KEY`.
4. Cole o valor da chave Groq como valor da propriedade.
5. Salve.

A chave é lida no servidor com `PropertiesService.getScriptProperties()`. Ela não deve ser colocada no código, no HTML, no GitHub ou enviada pelo chat.

Endpoint: `https://api.groq.com/openai/v1/chat/completions`

Modelo: `openai/gpt-oss-20b`

A solicitação utiliza Structured Outputs com JSON Schema estrito. O corpo do e-mail é tratado como dado não confiável, nunca como instrução para a IA.

## Comportamento da rotina com IA

1. Busca as conversas pendentes com assunto exato AGENDAMENTO.
2. Processa no máximo 10 mensagens por execução para reduzir risco de timeout e consumo inesperado.
3. Envia somente o texto simples da mensagem à Groq.
4. Recebe cliente, serviço, profissional, data e horário em JSON.
5. Rejeita mensagens que não sejam solicitações, campos vazios, data/horário inválidos e nomes inexistentes ou duplicados.
6. Obtém códigos exclusivamente dos cadastros na planilha. A IA não escolhe códigos nem grava diretamente.
7. Chama `AgendamentoService.cadastrar()`, preservando as regras existentes e o valor do serviço cadastrado.
8. Aplica `AGENDAMENTO_PROCESSADO` somente depois da gravação bem-sucedida.

Se houver mais de 10 mensagens pendentes, a interface informa que ainda existem mensagens e o usuário pode executar novamente. Mensagens com falha não recebem o rótulo e podem ser tentadas novamente.

O processamento com IA envia o conteúdo do e-mail a um provedor externo (Groq). Não utilize esse fluxo para mensagens que contenham informações que não devam ser compartilhadas com esse provedor.

## Limites e cuidados

- A busca do repositório continua limitada a 100 conversas candidatas.
- O fluxo com IA processa até 10 mensagens por clique.
- A rotina tradicional e a rotina com IA compartilham a mesma busca e o mesmo rótulo. Quando uma delas processa uma conversa, a outra deixa de encontrá-la.
- A interface desabilita os dois botões durante a execução iniciada naquela tela.
- A gravação na planilha e a aplicação do rótulo Gmail são operações separadas. Se ocorrer falha após gravar e antes de aplicar o rótulo, confira a agenda antes de tentar novamente.
- A chave Groq deve existir no projeto Apps Script que executará a integração.
- Não há teste real da API ou do Gmail até que o projeto seja executado com uma chave válida e as permissões do Google autorizadas.

## Como testar

1. Configure `GROQ_API_KEY` nas Propriedades do Script do projeto de teste.
2. Publique/atualize o projeto Apps Script com os arquivos desta branch.
3. Confirme que CLIENTES, SERVICOS e FUNCIONARIOS possuem os nomes usados nos e-mails.
4. Envie um e-mail para a conta Gmail usada pelo Apps Script, com assunto exato `AGENDAMENTO` e uma solicitação em texto livre, contendo cliente, serviço, profissional, data explícita e horário.
5. Na tela Agenda, clique em **Verificar e-mail com IA**.
6. Confira o resumo e a nova linha na aba AGENDA.
7. Execute novamente e confirme que a conversa rotulada não é processada outra vez.
8. Teste uma mensagem sem dados obrigatórios e uma mensagem que não seja solicitação; nenhuma delas deve gerar linha na agenda.
9. Teste separadamente o botão **Verificar e-mail** para confirmar que o fluxo tradicional continua funcionando.

A validação automatizada de sintaxe não substitui o teste integrado real com Gmail e Groq.
