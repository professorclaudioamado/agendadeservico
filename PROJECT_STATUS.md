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

## Integração ViaCEP no cadastro de clientes — concluída

### Implementado
- Criado ClienteCepService.js, responsável por consultar a API ViaCEP no servidor usando UrlFetchApp.
- A consulta aceita CEP com ou sem hífen e valida os oito dígitos.
- O serviço trata CEP inexistente, resposta inválida, falha HTTP e falha de comunicação.
- O formulário de clientes consulta o CEP quando o campo perde o foco, preenche logradouro e CEP e tenta selecionar a cidade somente quando nome e UF correspondem a uma cidade cadastrada.
- Quando o ViaCEP retorna bairro, a interface chama localizarOuCadastrarBairro() e seleciona o código correspondente na lista.
- Se a cidade não estiver cadastrada, o usuário deverá selecioná-la manualmente. Se o ViaCEP não retornar logradouro ou bairro, os respectivos campos permanecem disponíveis para preenchimento manual.
- O número do imóvel e os demais dados do cliente não são alterados pela consulta.
- O fluxo tradicional de cadastro de cliente e o cadastro manual de bairros foram preservados.

### Testes realizados
- Consulta simulada com CEP válido sem hífen: aprovada.
- Consulta simulada com CEP válido com hífen: aprovada.
- Tratamento de CEP inexistente (erro: true): aprovado.
- Rejeição de CEP com formato inválido: aprovada.
- Tratamento de resposta HTTP 503: aprovado.
- Tratamento de falha de comunicação: aprovado.
- Sintaxe do JavaScript incorporado em index.html: aprovada.
- Os testes utilizaram respostas simuladas; não foi executada uma chamada real ao ViaCEP a partir do Apps Script nem um teste real com a planilha.

### Arquivos desta etapa
- Criados: ClienteCepService.js.
- Alterados: index.html e BairroService.js (exposição pública da operação localizarOuCadastrarBairro).
- Mantidos: ClienteService.js, ClienteRepository.js, ClienteValidator.js, ClienteRules.js, BairroRepository.js e BairroValidator.js.
- Excluídos: nenhum. Nenhum arquivo antigo ficou obsoleto por esta implementação.

### Configuração e primeiro uso
- Na primeira execução, o Google Apps Script poderá solicitar autorização para realizar chamadas externas por meio de UrlFetchApp.
- O teste final deve ser realizado na implantação Web App atualizada, com um CEP real, verificando preenchimento do logradouro, seleção de cidade, seleção ou cadastro do bairro e gravação do cliente.
- O campo de número continua sendo preenchido manualmente.

### Próximo passo
Testar a funcionalidade na implantação real do Google Apps Script, autorizar a chamada externa quando solicitado e conferir os registros nas abas BAIRROS e CLIENTES.


## BOT conversacional de agendamento — implementação inicial concluída

### Objetivo
Adicionar uma interface de conversa ao mesmo projeto Agenda de Serviços, selecionada pelo parâmetro `?BOT`, sem criar outro projeto Apps Script ou outra planilha.

### Implementado e integrado à branch `main`
- Criada a interface `Bot.html`, com apresentação de mensagens e campo de resposta.
- Criados `BotService.js`, `BotValidator.js`, `BotRules.js` e `BotRepository.js`, respeitando a arquitetura em camadas.
- O fluxo conversa por etapas: identificação do cliente por CPF, confirmação dos quatro últimos dígitos do celular cadastrado, escolha do serviço, escolha do profissional, data, horário e confirmação.
- A consulta do cliente retorna somente código e nome; o BOT não lista nem apresenta outros dados pessoais.
- A identificação confere o formato e os dígitos verificadores do CPF, além dos quatro últimos dígitos do celular cadastrado.
- A disponibilidade é verificada considerando o profissional, a duração cadastrada do serviço e os agendamentos não cancelados do dia.
- A gravação utiliza o fluxo existente `AgendamentoService.cadastrar()`.
- `Main.gs.js` direciona para `Bot.html` quando o parâmetro `BOT` está presente; sem esse parâmetro, mantém a interface administrativa `index.html`.
- Criados 12 testes automatizados cobrindo CPF, final do celular, data, horário, normalização de nomes, conflito de horários, fluxo conversacional completo e sintaxe do JavaScript de `Bot.html`.

### Segurança e publicação
- O manifesto permanece com `webapp.access = MYSELF`; não foi habilitado acesso anônimo.
- A aplicação atual possui pontos de entrada administrativos globais que ainda precisam de autenticação individual no servidor antes de liberar a mesma implantação para visitantes externos.
- Por esse motivo, o BOT ainda não está liberado ao público e não deve ser divulgado como URL de atendimento público.
- A implementação foi integrada à branch `main` pelo PR #9.
- O GitHub Actions executou `clasp push --force` e atualizou a implantação Web App existente com sucesso; a versão implantada foi registrada como `@54` na execução 42140899936.
- O manifesto continua com `webapp.access = MYSELF`; portanto, o BOT está implantado, mas acessível somente ao proprietário. O acesso público ainda não foi habilitado.

### Validações realizadas
- GitHub Actions: verificação de sintaxe JavaScript aprovada.
- GitHub Actions: os 12 testes automatizados do BOT foram aprovados, incluindo fluxo conversacional completo com dependências simuladas e sintaxe do JavaScript incorporado em `Bot.html`.
- A verificação de sintaxe JavaScript e a validação de configuração do projeto foram aprovadas.
- A publicação dos arquivos e a atualização da implantação Web App existente foram concluídas com sucesso.
- Ainda não foi realizado teste integrado no Apps Script com a planilha real nem teste de ponta a ponta no navegador.

### Arquivos desta etapa
- **Criados:** `Bot.html`, `BotService.js`, `BotValidator.js`, `BotRules.js`, `BotRepository.js`, `tests/bot.test.js`.
- **Alterados:** `Main.gs.js`, `AgendamentoRepository.js`, `ClienteRepository.js`, `.github/workflows/apps-script.yml`, `.claspignore`, `PROJECT_STATUS.md`.
- **Mantidos:** `index.html`, `AgendamentoService.js`, `AgendamentoValidator.js`, `AgendamentoRules.js`, `appsscript.json` e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum. Nenhum arquivo existente ficou obsoleto nesta etapa.

### Próxima etapa obrigatória
Implementar autenticação administrativa no servidor e proteger todos os pontos de entrada administrativos antes de alterar a implantação para acesso público. Depois, executar testes integrados no Google Sheets e no navegador. Até essa proteção ser concluída, manter `webapp.access = MYSELF`.


## BOT com interface estilo WhatsApp e IA Groq — implementação integrada e publicada

### Objetivo
Evoluir o BOT inicial para uma experiência de conversa natural, com interface responsiva inspirada no WhatsApp e interpretação de mensagens por IA, sem criar outro projeto Apps Script ou outra planilha.

### Implementação integrada à branch `main` pelo PR #10
- Interface refeita em `Bot.html`, com cabeçalho verde, balões de conversa, horários, indicador de digitação, campo fixo de mensagem e adaptação para celular.
- Criado `BotIAService.js`, que utiliza a API Groq, modelo `openai/gpt-oss-20b` e a propriedade `GROQ_API_KEY` das Propriedades do Script.
- A IA interpreta serviço, profissional, data relativa ou explícita, horário coloquial e confirmação, retornando JSON Schema estrito.
- `BotService.js` mantém o fluxo de identificação por CPF e quatro últimos dígitos do celular; depois disso aceita linguagem natural.
- A sessão passou a ser armazenada no CacheService do servidor por até 30 minutos. O navegador recebe apenas um identificador aleatório, não o estado interno nem o CPF.
- Cadastros, disponibilidade e gravação continuam sob controle dos Repositories, Rules, Validators e `AgendamentoService.cadastrar()`.
- A gravação só acontece depois de resumo e confirmação explícita do cliente.

### Segurança e limites
- A chave Groq não é enviada ao navegador nem armazenada no GitHub.
- A IA não escolhe códigos internos e não grava na planilha.
- A saída da IA é validada pelo servidor; nomes precisam corresponder a cadastros existentes.
- O horário é consultado novamente antes de gravar.
- O conteúdo das mensagens enviadas à Groq é compartilhado com esse provedor. Não envie informações além das necessárias ao atendimento.
- A implantação continua com acesso `MYSELF`; não liberar acesso público até proteger os pontos de entrada administrativos conforme o status anterior.

### Testes automatizados preparados
- Validação de CPF, celular, data e hora.
- Normalização de nomes e conflitos de horário.
- Chamada simulada da API Groq e validação de resposta estruturada.
- Conversa completa simulada com confirmação antes da gravação.
- Bloqueio de horário ocupado.
- Expiração da sessão e sintaxe do JavaScript da interface.

### Arquivos desta etapa
- **Criado:** `BotIAService.js`.
- **Alterados:** `Bot.html`, `BotService.js`, `BotRepository.js`, `tests/bot.test.js`.
- **Mantidos:** `BotValidator.js`, `BotRules.js`, `AgendamentoService.js`, `AgendamentoRepository.js`, `ClienteRepository.js`, `Main.gs.js`, `appsscript.json`, `.claspignore` e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum.

### Validação e publicação
- GitHub Actions, execução #51 (validação do PR): sintaxe, testes e configuração aprovados.
- GitHub Actions, execução #52 (push na main): validação aprovada e publicação no Apps Script concluída.
- O workflow enviou 35 arquivos e atualizou a implantação Web App existente para a versão `@57`.
- O modelo de IA é `openai/gpt-oss-20b`, chamado pelo endpoint compatível com OpenAI da Groq.
- O BOT reutiliza a propriedade `GROQ_API_KEY` nas Propriedades do Script. O valor da chave não é lido nem exposto pelo repositório.
- Ainda falta o teste real de ponta a ponta no navegador com a planilha e uma chamada efetiva à Groq. Se a propriedade `GROQ_API_KEY` já estiver configurada nesse projeto Apps Script, não é necessário cadastrá-la novamente; caso contrário, configure-a nas Propriedades do Script.
- A implantação continua com acesso `MYSELF`; o BOT não está liberado para clientes externos. Manter assim até implementar autenticação administrativa em todos os pontos de entrada.


## Correção de compatibilidade e diagnóstico da API Groq — em validação

### Problema identificado
- O BOT recebia HTTP 400, mas BotIAService.js descartava o corpo de erro enviado pela Groq. Assim, a interface mostrava uma mensagem genérica e não era possível identificar a causa precisa.
- O modelo GPT-OSS 20B é listado pela documentação Groq como compatível com Structured Outputs; portanto, ainda não há evidência suficiente para atribuir o erro a chave inválida, modelo indisponível ou limite de conta.
- A documentação oficial da Groq também oferece JSON Object Mode. Como o servidor já valida os seis campos e seus valores permitidos, esta etapa troca o formato de resposta para JSON Object Mode e mantém a validação local obrigatória.

### Alterações preparadas na branch fix/bot-groq-http-400
- BotIAService.js: usa response_format type json_object e reasoning_format hidden; mantém o modelo openai/gpt-oss-20b, a chave em Script Properties e a validação dos campos recebidos.
- BotIAService.js: quando a API retorna erro HTTP, extrai apenas error.message do corpo de resposta, limita o texto e nunca expõe cabeçalhos ou a chave.
- tests/bot.test.js: ajusta o teste do formato JSON e acrescenta teste de erro HTTP 400, incluindo a verificação de que a chave não aparece na mensagem.

### Arquivos
- Criados: nenhum.
- Alterados: BotIAService.js, tests/bot.test.js.
- Mantidos: BotService.js, BotRepository.js, BotValidator.js, BotRules.js, Bot.html, serviços e repositórios de Agendamento, appsscript.json, PROJECT_GUIDE.md.
- Excluídos: nenhum.

### Validação e próximo passo
- Aguardando GitHub Actions para validar sintaxe e testes automatizados.
- Após aprovação, integrar a correção à main e publicar a nova versão do Apps Script.
- Fazer uma chamada real à Groq pelo BOT. Se ainda houver HTTP 400, a interface passará a mostrar a mensagem técnica devolvida pelo provedor, permitindo identificar e corrigir a causa específica.
- Não alterar a chave GROQ_API_KEY nem compartilhá-la no chat. A chave não foi modificada nesta etapa.


### Correção Groq — integrada e publicada
- PR #11 integrado à main após validação do GitHub Actions.
- O formato de resposta da API foi alterado para JSON Object Mode; a validação dos seis campos obrigatórios e dos valores permitidos permanece no servidor.
- A mensagem técnica de erro HTTP da Groq agora é extraída do corpo da resposta, limitada e sem expor chave ou cabeçalhos.
- Testes automatizados: 9 aprovados, incluindo teste de diagnóstico HTTP 400 e proteção da chave.
- GitHub Actions, execução #55: validação e publicação concluídas; 35 arquivos enviados e implantação Web App atualizada para a versão @59.
- Ainda pendente: teste real no navegador com a chamada à Groq. Caso ocorra novo erro, a interface exibirá a mensagem específica retornada pela API, para correção direcionada.
