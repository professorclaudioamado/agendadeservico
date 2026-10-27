# PROJECT_STATUS.md — Status do Projeto Agenda de Serviços

## Versão atual

A aplicação utiliza Google Apps Script e Google Sheets, com entidades organizadas em camadas. A integração manual de solicitações de agendamento por Gmail foi implementada, integrada à branch `main` e publicada no projeto Apps Script. Falta executar o teste real com uma mensagem Gmail e confirmar a gravação na agenda.

## Arquitetura adotada

**Interface → Service → Rules / Validator → Repository → Google Sheets**

A integração com Gmail usa diretamente o serviço nativo `GmailApp` do Google Apps Script. Não depende de plugins ou conectores externos.

## Funcionalidades existentes

- Cadastro de clientes.
- Cadastro de profissionais.
- Cadastro de serviços.
- Criação de agendamentos.
- Uso do Google Sheets como armazenamento.
- Uso do Google Apps Script na aplicação.
- CRUD de funcionários com consulta, edição e exclusão.
- Publicação controlada do código do GitHub para o projeto Apps Script por GitHub Actions.

## Integração com Gmail — processamento manual de agendamentos

### Implementado

- O botão **Verificar e-mail** foi adicionado à tela Agenda.
- `GmailAgendamentoRepository.js` consulta a caixa de entrada usando `GmailApp`, procura assunto exato `AGENDAMENTO` e exclui conversas com o rótulo `AGENDAMENTO_PROCESSADO`.
- `GmailAgendamentoValidator.js` extrai Cliente, Serviço, Profissional, Data e Horário; valida os campos obrigatórios, a data e o horário.
- `GmailAgendamentoService.js` localiza cliente, serviço e profissional por nome exato, chama o fluxo existente `AgendamentoService.cadastrar()` e define o status inicial `AGENDADO`.
- O valor é obtido do cadastro do serviço, conforme a regra existente.
- Depois de gravar com sucesso, o sistema aplica o rótulo Gmail `AGENDAMENTO_PROCESSADO`. A mensagem não é apagada nem marcada como lida.
- A interface mostra a quantidade de e-mails analisados, agendamentos criados e mensagens com problemas.
- Não foi criado acionador automático: o processamento ocorre somente quando o usuário clica no botão.

### Formato esperado do e-mail

Assunto exato: `AGENDAMENTO`

```text
Cliente: Maria Silva
Serviço: Consulta
Profissional: João Santos
Data: 30/10/2026
Horário: 14:00
```

Os nomes precisam corresponder exatamente aos cadastros. A data deve usar `DD/MM/AAAA` e o horário `HH:MM`. Substitua os nomes de exemplo pelos nomes que realmente existem na planilha.

### Validações já realizadas

- Sintaxe verificada nos arquivos JavaScript envolvidos.
- Sintaxe do JavaScript incorporado em `index.html` verificada.
- Teste de validação do e-mail com data e horário válidos: aprovado.
- Teste de data e horário inválidos: aprovado.
- Teste simulado do fluxo do Service com cadastros fictícios: confirmou mapeamento de nomes para códigos, chamada do cadastro e marcação como processado.
- Workflow de validação e publicação do GitHub Actions, execução #9: concluído com sucesso; publicação dos arquivos e registro da versão do código no Apps Script concluídos.

### Limites e cuidados conhecidos

- A busca está limitada a 100 conversas candidatas por execução.
- Uma conversa gera no máximo um agendamento por execução.
- Nomes inexistentes ou duplicados e campos inválidos impedem a gravação e são informados na interface.
- A gravação na planilha e a aplicação do rótulo são operações separadas. Se houver falha exatamente entre elas, a mensagem pode ser considerada novamente; conferir a agenda antes de repetir uma execução após erro inesperado.
- A publicação do código e o registro de uma versão no Apps Script não atualizam automaticamente uma implantação Web App já existente. Se a aplicação aberta no navegador continuar mostrando a versão antiga, atualize a implantação existente em **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**.

## GitHub Actions e publicação no Apps Script

### Estado atual

- `.github/workflows/apps-script.yml` valida a sintaxe JavaScript e a configuração.
- O segredo `CLASPRC_JSON` foi aceito pelo workflow da publicação realizada após o merge do PR #4.
- A execução #9 do workflow concluiu com sucesso, incluindo publicação pelo `clasp` e registro da versão do código.
- O código foi integrado à branch `main` pelo PR #4.
- O workflow não atualiza automaticamente uma implantação Web App existente.

**Atenção:** `clasp push --force` substitui o código do projeto Apps Script pelo conteúdo versionado no GitHub. Antes de novas publicações, mantenha o GitHub como fonte oficial do código.

## Próxima etapa

Executar o teste real no Google:

1. Confirmar que a implantação Web App aberta no navegador está usando a versão atual do código.
2. Conferir se as abas `CLIENTES`, `SERVICOS` e `FUNCIONARIOS` contêm os nomes usados no e-mail.
3. Enviar para a conta Gmail usada pelo Apps Script um e-mail com assunto exato `AGENDAMENTO` e os campos do exemplo, substituindo pelos nomes reais cadastrados.
4. Abrir a tela Agenda e clicar em **Verificar e-mail**.
5. Autorizar o Gmail quando o Google solicitar.
6. Conferir o resumo na tela e a nova linha na aba `AGENDA`.
7. Clicar novamente no botão e confirmar que a conversa processada não cria outro agendamento.

O teste real com Gmail autorizado e a confirmação visual na planilha ainda não foram realizados.

## Arquivos desta etapa

### Arquivos criados

Nenhum.

### Arquivos alterados

- `GmailAgendamentoRepository.js` — leitura e rótulo de processamento das conversas.
- `GmailAgendamentoValidator.js` — extração e validação dos campos do e-mail.
- `GmailAgendamentoService.js` — integração com o cadastro de agendamento existente.
- `index.html` — botão **Verificar e-mail** e apresentação dos resultados.
- `docs/gmail/README.md` — formato, comportamento e instruções de teste.
- `PROJECT_STATUS.md` — atualização do estado do projeto.

### Arquivos mantidos

- `AgendamentoService.js`, `AgendamentoRules.js`, `AgendamentoValidator.js` e `AgendamentoRepository.js` — fluxo existente de cadastro reaproveitado.
- `.clasp.json`, `appsscript.json` e `.claspignore` — configuração existente.
- `PROJECT_GUIDE.md` — mantido sem alterações.

### Arquivos removidos

Nenhum. Não foi identificado arquivo obsoleto nesta etapa.

## Como testar e validar

- A validação automatizada do workflow foi aprovada.
- Os testes locais de sintaxe e de fluxo simulado foram aprovados.
- O próximo teste necessário é o teste integrado real com Gmail autorizado, seguido da conferência da aba `AGENDA` e da prevenção de duplicidade.
