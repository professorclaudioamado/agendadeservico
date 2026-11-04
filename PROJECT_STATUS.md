# PROJECT_STATUS.md — Status do Projeto Agenda de Serviços

## Versão atual

A aplicação utiliza Google Apps Script e Google Sheets, com entidades organizadas em camadas. A integração manual tradicional por Gmail está implementada na `main`. A integração experimental com IA/Groq está sendo preparada na branch `feature/groq-email-agendamento-ia`; ainda depende de revisão, publicação no Apps Script e teste real.

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

## Integração com Gmail usando IA — branch de desenvolvimento

### Implementação preparada

- Novo arquivo `GmailAgendamentoIAService.js`, com chamada no servidor à API Groq.
- Novo botão **Verificar e-mail com IA**, separado do botão tradicional.
- Modelo configurado: `openai/gpt-oss-20b`.
- Resposta solicitada por Structured Outputs com JSON Schema estrito.
- A chave é lida de `GROQ_API_KEY` nas Propriedades do Script.
- O fluxo com IA processa até 10 mensagens por execução.
- Os dados extraídos passam pelo validador existente e pela busca exata dos cadastros.
- A gravação continua sendo realizada por `AgendamentoService.cadastrar()`.
- O rótulo Gmail só é aplicado após a gravação bem-sucedida.

### Pendências antes de usar

1. Revisar e integrar a branch de desenvolvimento.
2. Configurar `GROQ_API_KEY` no projeto Apps Script que executará a integração.
3. Atualizar a implantação Web App, se aplicável.
4. Autorizar Gmail e UrlFetchApp quando solicitado.
5. Executar testes reais com e-mails válidos, inválidos e não relacionados.
6. Conferir a gravação na aba AGENDA e o rótulo no Gmail.

A chave não deve ser incluída no GitHub nem no código. O conteúdo dos e-mails enviados à IA será compartilhado com o provedor Groq; utilize a função somente para mensagens cujo conteúdo possa ser enviado a esse serviço.

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

## Integração ViaCEP no cadastro de clientes — etapa 1 concluída

### Objetivo
Preparar a camada de bairros para que a futura consulta de CEP possa localizar um bairro já cadastrado ou incluí-lo automaticamente, sem gerar duplicidades no fluxo de integração.

### Implementado
- `BairroRepository.buscarPorNome(nome)` consulta a aba `BAIRROS` e compara nomes sem diferenciar maiúsculas/minúsculas ou espaços externos.
- `BairroService.localizarOuCadastrar(nome)` valida o nome, procura o bairro e cadastra somente quando não encontra.
- O caso de uso utiliza `LockService` para serializar a consulta e a inclusão entre execuções simultâneas desse novo fluxo.
- O cadastro tradicional `BairroService.cadastrar(nome)` e o ponto de entrada global `cadastrarBairro(nome)` foram preservados.
- A estrutura atual da planilha não foi alterada; a coluna opcional `cidade` continua sem preenchimento por esse fluxo.

### Testes realizados
- Busca de bairro existente ignorando caixa e espaços externos: aprovado.
- Retorno `null` quando o bairro não existe: aprovado.
- Geração do próximo código: aprovado.
- Reutilização de bairro existente: aprovado.
- Cadastro automático de bairro ausente: aprovado.
- Verificação de que o fluxo não cria duplicidade quando o bairro já existe: aprovado.
- Rejeição de nome vazio: aprovado.
- Sintaxe dos dois arquivos compilada no ambiente JavaScript V8 com dependências simuladas: aprovado.

Os testes foram executados com objetos simulados (mocks); ainda não foi realizado teste integrado contra uma planilha real do Google Sheets.

### Arquivos desta etapa
- **Criados:** nenhum.
- **Alterados:** `BairroService.js` e `BairroRepository.js`.
- **Mantidos:** `BairroValidator.js`, `ClienteRepository.js`, `ClienteService.js`, `ClienteValidator.js` e `index.html`.
- **Excluídos:** nenhum. Não há arquivo obsoleto identificado nesta etapa.

### Próxima etapa
Criar `ClienteCepService.js` para consultar a API ViaCEP e integrar o retorno à interface em `index.html`. O fluxo deverá preencher endereço, CEP, bairro e cidade quando houver correspondência, mantendo a seleção manual quando a cidade não existir na lista cadastrada. O bairro deverá utilizar `BairroService.localizarOuCadastrar()` para evitar duplicidade.
