# PROJECT_STATUS.md — Status do Projeto Agenda de Serviços

## Versão atual

A aplicação utiliza Google Apps Script e Google Sheets, com entidades organizadas em camadas. A `main` contém os cadastros, o CRUD de agendamentos, as integrações com Gmail e ViaCEP, o BOT conversacional com IA/Groq e chamadas de ferramentas, o registro automático e protegido de `Data_cadastro` e a primeira versão do K-NN com tela de configuração. A PR #22 foi integrada e publicada no Apps Script pelo workflow #101. Os testes funcionais na planilha real e no navegador ainda precisam ser realizados. A implantação permanece restrita ao proprietário (`MYSELF`).

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


## BOT com IA e chamadas de ferramentas — integrado à main

### Objetivo
Permitir que a IA interprete perguntas em linguagem natural e escolha consultas reais ao cadastro e à agenda, sem depender de uma árvore rígida de perguntas e respostas. A IA não acessa o Google Sheets diretamente e não recebe ferramentas de gravação.

### Implementação preparada na branch `feature/bot-ia-tool-calling`
- Criado `BotToolsService.js`, com registro de ferramentas autorizadas e despacho por nome, sem uma cadeia de condições para decidir qual consulta executar.
- Ferramenta `consultar_servicos`: retorna nome, preço e duração cadastrados.
- Ferramenta `consultar_profissionais`: retorna os profissionais cadastrados.
- Ferramenta `consultar_agenda`: consulta os agendamentos já registrados em uma data, com filtro opcional por profissional.
- Ferramenta `verificar_horario`: verifica conflito com os agendamentos existentes, considerando a duração cadastrada do serviço.
- `BotIAService.js` foi preparado para o ciclo de tool calling (chamada de ferramentas): envia o catálogo de ferramentas à Groq, recebe a ferramenta escolhida pelo modelo, executa a consulta no servidor, devolve o resultado ao modelo e aguarda a resposta natural final.
- `BotService.js` agora permite que respostas informativas da IA sejam apresentadas sem forçar o cliente a iniciar um agendamento.
- O despacho rejeita nomes de ferramentas que não estejam explicitamente registrados.
- A IA continua sem permissão para gravar, editar ou cancelar registros. A confirmação explícita e o cadastro permanecem sob responsabilidade do fluxo existente `BotService` → `AgendamentoService.cadastrar()`.

### Limites conhecidos — não inventar disponibilidade
- A planilha e os repositórios inspecionados não fornecem expediente, dias de trabalho, intervalos, folgas ou associação formal entre serviço e profissional.
- Por isso, `verificar_horario` informa somente se há conflito com agendamentos já registrados. Ausência de conflito não comprova que o profissional trabalha naquele horário.
- Não foi implementada busca de primeiro horário livre nem lista de alternativas, pois isso exigiria uma fonte real de jornada e regras de funcionamento.
- A consulta de agenda é realizada somente após a identificação do cliente pelo fluxo existente.

### Arquivos
- **Criado:** `BotToolsService.js`.
- **Alterados:** `BotIAService.js`, `BotService.js`, `tests/bot.test.js`, `PROJECT_STATUS.md`.
- **Mantidos:** `Bot.html`, `BotValidator.js`, `BotRules.js`, `BotRepository.js`, `AgendamentoService.js`, `AgendamentoRepository.js`, `ClienteRepository.js`, `Main.gs.js`, `appsscript.json`, `.claspignore`, `.github/workflows/apps-script.yml` e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum. Não há duplicação de responsabilidade que justifique excluir arquivos existentes.

### Validação e publicação
- Foi atualizado o teste automatizado da integração Groq para cobrir o ciclo de chamada de ferramenta e retorno do resultado ao modelo.
- GitHub Actions, execução #62: sintaxe JavaScript, nove testes automatizados do BOT e validação de configuração aprovados.
- PR #12 integrado à `main` por squash; commit de integração `b5050a54bcf24d81957029aadec82f01c75b23d5`.
- A execução de validação do PR não publica o Apps Script. A publicação decorrente do push na `main` ainda precisa ser confirmada separadamente.
- A última versão de implantação comprovada antes desta etapa era `@59`, com acesso `MYSELF`; não registrar uma nova versão até confirmar o resultado do workflow de publicação.
- Após a publicação, será necessário realizar uma conversa real no BOT com `GROQ_API_KEY` configurada para confirmar a compatibilidade efetiva do modelo com tool calling.

### Como validar
1. Aguardar o GitHub Actions no Pull Request e corrigir qualquer falha encontrada.
2. Após a integração e publicação, abrir a implantação existente com a conta proprietária.
3. Perguntar ao BOT quais serviços existem e solicitar o preço e a duração de um serviço específico.
4. Perguntar quais profissionais estão cadastrados.
5. Solicitar a consulta da agenda de uma data e, depois, a verificação de um horário específico.
6. Confirmar que respostas informativas não iniciam um cadastro e que nenhum agendamento é gravado sem confirmação explícita.
7. Conferir que a IA não declara expediente ou horário livre sem uma fonte de jornada cadastrada.

### Próxima etapa
Definir e cadastrar a jornada dos profissionais (dias da semana, início e fim do expediente, intervalos, folgas e, se necessário, serviços que cada profissional executa). Com essa fonte de dados será possível implementar busca confiável de primeiro horário e alternativas.


## Publicação do BOT com IA e chamadas de ferramentas — concluída

### Resultado da publicação
- O commit `a7e2f6ad878bd4ace2a0c223b75489efe7a380e0` da branch `main` acionou a execução #66 do workflow **Apps Script - validar e publicar**.
- A etapa de validação foi concluída com sucesso: sintaxe JavaScript, testes automatizados do BOT e configuração.
- A etapa **Publicar no Google Apps Script** também foi concluída com sucesso.
- O log confirmou `clasp push --force` e atualização da implantação Web App existente; versão registrada: `@63`.
- A implantação mantém `webapp.access = MYSELF` e `executeAs = USER_DEPLOYING`. O BOT continua restrito ao proprietário; não foi liberado acesso público.

### O que ainda exige validação manual
1. Abrir a implantação Web App com a conta proprietária e acessar o BOT pelo parâmetro `?BOT`.
2. Confirmar que `GROQ_API_KEY` está configurada nas Propriedades do Script, sem compartilhar seu valor.
3. Fazer uma pergunta informativa, por exemplo: quais serviços estão cadastrados e qual o preço/duração de um deles.
4. Solicitar a lista de profissionais e uma consulta de agenda para uma data.
5. Verificar se a IA responde com dados reais e se consultas não criam agendamentos.
6. Se for testar um agendamento, concluir a identificação e só confirmar depois de revisar o resumo. Conferir o registro na aba `AGENDA`.

O teste real depende da autorização do proprietário e do uso de dados reais da planilha; não pode ser declarado aprovado apenas com os testes automatizados.

### Arquivos desta etapa
- **Criados:** nenhum.
- **Alterados:** `PROJECT_STATUS.md`.
- **Mantidos:** todos os arquivos de código e configuração, inclusive `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum.

### Próxima etapa
Executar e registrar o teste integrado real do BOT com a Groq. Depois, definir a jornada dos profissionais (expediente, intervalos, folgas e serviços permitidos) antes de implementar busca de horários livres ou alternativas.


## Identificação visual da versão do BOT — publicada e validada

### Objetivo
Exibir no cabeçalho da interface do BOT o número da implantação para facilitar a confirmação visual de que a atualização foi publicada.

### Alteração
- O cabeçalho de `Bot.html` exibe **Versão 67** junto à identificação do assistente.
- O número fica na linha de identificação do BOT e permanece visível também em telas pequenas.
- A numeração corresponde à versão publicada da implantação do Apps Script. O GitHub Actions, execução #69, concluiu com sucesso a validação e a publicação da implantação existente, registrando a versão `@67`.

### Arquivos desta etapa
- **Criados:** nenhum.
- **Alterados:** `Bot.html` e `PROJECT_STATUS.md`.
- **Mantidos:** `BotService.js`, `BotIAService.js`, `BotToolsService.js`, `appsscript.json`, `.github/workflows/apps-script.yml` e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum.

### Como testar
1. Aguardar a execução do workflow no push da `main`.
2. Confirmar que a etapa de publicação foi concluída e que o log registrou a implantação `@67`.
3. Abrir a URL do BOT e conferir **Versão 67** no cabeçalho, inclusive em largura de celular.
4. Se a tela ainda mostrar versão anterior, recarregar a página sem cache.


### Ajuste da numeração da implantação
- A publicação intermediária concluiu a implantação `@66`. O ajuste final do cabeçalho foi publicado com sucesso na execução #69, que registrou a implantação `@67`.


## Continuidade do contexto do BOT — correção preparada

### Problema identificado
- Em uma mensagem que combinava a intenção de agendar um serviço com uma pergunta informativa sobre profissionais, a IA podia responder à pergunta sem devolver o serviço mencionado nos campos estruturados.
- O BotService só preservava o retorno informativo quando não havia alteração de campos. Isso tornava frágil a combinação de resposta informativa e atualização do pedido.

### Correção implementada na branch fix/bot-preservar-contexto-agendamento
- BotIAService.js: reforçadas as instruções para extrair o serviço mencionado mesmo quando a mesma mensagem contém uma pergunta informativa; orientado o modelo a não descartar dados já presentes na sessão.
- BotService.js: aplica primeiro os campos interpretados à sessão e, em seguida, responde a mensagens informativas sem avançar indevidamente o fluxo de agendamento.
- tests/bot.test.js: incluído teste de regressão que reproduz a sequência “quero cortar o cabelo, quais profissionais estão disponíveis?” seguida de “para quando podemos agendar?”. O teste verifica que o BOT pergunta pelo profissional, e não novamente pelo serviço.

### Arquivos
- **Criados:** nenhum.
- **Alterados:** BotIAService.js, BotService.js, tests/bot.test.js, PROJECT_STATUS.md.
- **Mantidos:** BotToolsService.js, BotRepository.js, BotValidator.js, BotRules.js, Bot.html, serviços e repositórios de agendamento, appsscript.json, .claspignore, workflow de publicação e PROJECT_GUIDE.md.
- **Excluídos:** nenhum. Nenhum arquivo ficou obsoleto.

### Validação e publicação
- A validação automatizada pelo GitHub Actions ainda deve ser concluída no Pull Request.
- A publicação no Apps Script depende da integração na main e da execução bem-sucedida do workflow de publicação.
- O teste automatizado simula a resposta estruturada da IA; a conversa real com a Groq e os cadastros da planilha ainda exige validação manual após a publicação.
- A implantação permanece restrita ao proprietário (MYSELF).

### Como testar após publicar
1. Abrir o BOT e concluir a identificação do cliente.
2. Enviar uma mensagem que mencione um serviço e pergunte quais profissionais estão disponíveis.
3. Confirmar que a lista de profissionais é apresentada.
4. Perguntar em seguida quando pode agendar.
5. Confirmar que o BOT mantém o serviço e pergunta apenas o próximo dado ausente.
6. Prosseguir até o resumo e verificar que nenhum registro é gravado antes da confirmação explícita.


### Complemento da correção — contexto dos cadastros fornecido à IA
- A análise identificou que BotService já obtinha os catálogos, mas BotIAService enviava à Groq somente os campos já selecionados. Assim, a IA nem sempre tinha os nomes oficiais para relacionar expressões como “cortar o cabelo” ao serviço cadastrado “Corte de Cabelo”.
- BotIAService.js agora inclui no contexto da solicitação os nomes dos serviços e profissionais cadastrados, sem enviar códigos internos ou dados pessoais.
- A instrução da IA determina que os nomes extraídos correspondam aos catálogos recebidos, sem inventar opções.
- tests/bot.test.js verifica que os nomes dos catálogos são enviados no contexto da interpretação.
- Arquivos adicionais alterados nesta complementação: BotIAService.js e tests/bot.test.js. Não foram criados nem excluídos arquivos.


## Continuidade do contexto do BOT — correção integrada e publicada

### Resultado
- As correções foram integradas à branch `main` pelos PRs #13 e #14.
- O BOT preserva o serviço mencionado pelo cliente enquanto responde a uma pergunta informativa sobre profissionais.
- A interpretação da IA recebe os nomes dos serviços e profissionais cadastrados, permitindo relacionar expressões do cliente aos nomes oficiais sem inventar opções.
- O serviço citado é aplicado à sessão antes da resposta informativa, sem avançar indevidamente a etapa do agendamento.

### Arquivos
- **Criados:** nenhum.
- **Alterados:** `BotIAService.js`, `BotService.js`, `tests/bot.test.js` e `PROJECT_STATUS.md`.
- **Mantidos:** `BotToolsService.js`, `BotRepository.js`, `BotValidator.js`, `BotRules.js`, `Bot.html`, serviços e repositórios de agendamento, `Main.gs.js`, `appsscript.json`, `.claspignore`, workflow de publicação e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum. Não há arquivo obsoleto identificado nesta etapa.

### Validação e publicação
- PR #13: validação automatizada concluída com sucesso.
- PR #14: execução de validação #75 aprovada; sintaxe JavaScript, configuração e 10 testes automatizados aprovados.
- A publicação decorrente do merge do PR #14 foi executada pelo GitHub Actions, execução #76.
- O job **Publicar no Google Apps Script** terminou com sucesso e o log confirmou: implantação existente atualizada para a versão `@69`.
- Commit publicado: `15df91ebbe2d1c72e77ec67bf3e927d5230b709d`.
- A implantação permanece restrita ao proprietário (`webapp.access = MYSELF`); não foi habilitado acesso público.
- **Atenção à identificação visual:** o cabeçalho de `Bot.html` ainda contém o texto fixo “Versão 67”. A versão efetivamente implantada é `69`; portanto, não use o número exibido no cabeçalho como confirmação da implantação até que a identificação visual seja corrigida em etapa própria.

### Teste manual pendente
Os testes automatizados utilizam respostas simuladas da IA. Ainda é necessário testar a conversa real com a Groq e a planilha:
1. Abrir o BOT na implantação atualizada e concluir a identificação do cliente.
2. Enviar: “Quero cortar o cabelo, mas gostaria de saber quais profissionais estão disponíveis”.
3. Confirmar que o BOT lista os profissionais e mantém o serviço na sessão.
4. Perguntar: “Blz, para quando podemos agendar?”.
5. Confirmar que o BOT pergunta pelo próximo dado ausente (profissional), sem solicitar novamente o serviço.
6. Prosseguir até o resumo e confirmar que nenhum agendamento é gravado antes da confirmação explícita.
7. Se concluir um agendamento de teste, conferir o registro na aba `AGENDA`.

### Próxima etapa
Executar o teste manual real com a conta proprietária, Groq e planilha. Em uma etapa separada, corrigir a identificação visual do cabeçalho para que ela não apresente um número fixo divergente da implantação efetiva.


## CRUD de Agendamentos — interface implementada, integrada e validada

### Objetivo
Concluir na interface da Agenda as operações de consulta, edição, cancelamento e alteração de status, reaproveitando as operações de servidor integradas pelo PR #17.

### Implementado
- A grade de agendamentos exibe ações por registro: **Consultar**, **Editar** e **Cancelar**.
- A consulta apresenta os dados do agendamento selecionado.
- A edição carrega os dados existentes no formulário e salva as alterações sem trocar o código do registro.
- O formulário diferencia cadastro novo de edição e oferece a opção **Cancelar edição**.
- O cancelamento é lógico: altera o status para `CANCELADO`, preservando a linha e o histórico.
- A grade permite selecionar e salvar diretamente um dos status aceitos: `AGENDADO`, `CONFIRMADO`, `CONCLUÍDO` e `CANCELADO`.
- Após salvar ou alterar status, a grade é atualizada a partir dos dados do servidor.
- Os carregadores das listas de funcionários, clientes e serviços aceitam callbacks para preencher o formulário de edição após o carregamento dos cadastros.
- O formulário de novo agendamento e as integrações existentes foram preservados.
- Foi incluído teste automatizado para verificar a sintaxe JavaScript incorporada em `index.html` e os contratos da interface do CRUD.

### Integração e validação
- PR #18 integrada à branch `main` por squash.
- Commit de integração: `3c05363d3b6f6325be1dc3aa80af5321d3faa085`.
- GitHub Actions, execução #85: sintaxe JavaScript, testes automatizados e validação da configuração concluídos com sucesso.
- A etapa de publicação no Google Apps Script foi ignorada nessa execução porque o workflow de Pull Request realiza somente validação.
- O teste integrado na implantação Apps Script, com dados reais da planilha e interação no navegador, ainda precisa ser realizado após a publicação.

### Arquivos desta etapa
- **Criados:** `tests/agendamento-interface.test.js`.
- **Alterados:** `index.html`, `tests/agendamento-interface.test.js` e `PROJECT_STATUS.md`.
- **Mantidos:** `AgendamentoService.js`, `AgendamentoRepository.js`, `AgendamentoValidator.js`, `AgendamentoRules.js`, `Main.gs.js`, `Bot.html`, arquivos de Gmail, arquivos de configuração e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum. Nenhum arquivo ficou obsoleto.

### Como testar após a publicação
1. Abrir a tela **Agenda** e conferir as ações exibidas em cada registro.
2. Consultar um agendamento e conferir seus dados.
3. Editar data, hora, funcionário, cliente, serviço ou status e salvar; conferir a atualização na mesma linha.
4. Alterar o status pela grade e conferir que somente a coluna Status foi modificada.
5. Cancelar um agendamento e confirmar que a linha permanece na planilha com status `CANCELADO`.
6. Criar um novo agendamento para confirmar que o formulário continua funcionando no modo de cadastro.

### Próximo passo
Publicar a versão integrada no Google Apps Script e executar os testes reais na implantação. A implantação deve continuar restrita ao proprietário (`MYSELF`) até que a autenticação e a autorização dos pontos de entrada administrativos sejam revisadas.


## Agenda — exibição dos nomes relacionados e ação Detalhar

### Objetivo
Substituir os códigos de funcionário, cliente e serviço pelos respectivos nomes na grade de agendamentos, mantendo os códigos originais para operações internas.

### Implementado
- A grade da aba AGENDA consulta os cadastros de funcionários, clientes e serviços pelos pontos de entrada já existentes no Service.
- As colunas `Codigo_funcionario`, `Codigo_cliente` e `Codigo_servico` passam a exibir os nomes correspondentes, com títulos amigáveis: **Funcionário**, **Cliente** e **Serviço**.
- A ação **Consultar** foi renomeada para **Detalhar**.
- A visualização de detalhes também apresenta os nomes relacionados.
- Os códigos originais continuam sendo utilizados para editar, cancelar e alterar status; nenhuma coluna ou dado da planilha foi modificado.
- Quando um código não tiver cadastro correspondente, a interface apresenta `Código N` como fallback, sem ocultar o registro.

### Arquivos da etapa
- **Criados:** nenhum.
- **Alterados:** `index.html`, `tests/agendamento-interface.test.js`, `PROJECT_STATUS.md`.
- **Mantidos:** `AgendamentoService.js`, `AgendamentoRepository.js`, repositórios de Funcionário, Cliente e Serviço, `Main.gs.js`, `appsscript.json` e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum. Não há arquivo obsoleto nesta alteração.

### Validação
- Incluídos testes estáticos para a carga dos três cadastros, substituição visual dos códigos, preservação do código do agendamento nas ações e rótulo **Detalhar**.
- A validação completa será executada pelo GitHub Actions no Pull Request.
- Após integração e publicação, conferir na tela Agenda os nomes correspondentes, abrir **Detalhar**, editar e cancelar um registro para confirmar que as operações continuam usando os códigos corretos.

### Próximo passo
Integrar a alteração após aprovação do workflow e publicar no Apps Script. Em seguida, validar visualmente a grade com os dados reais da planilha.

---

## Atualização de estado — PR #20: Data_cadastro automática

### Resultado integrado à branch `main`

- A PR #20 foi integrada por squash.
- Commit de integração: `a44c1dabe958561365362d1dd502bcbc9ec1c713`.
- Mensagem: `Registra e protege Data_cadastro dos agendamentos (#20)`.
- A alteração registra automaticamente a data de cadastro do agendamento na coluna I (`Data_cadastro`) da aba `AGENDA`.
- O valor é gerado no servidor durante a gravação; não existe campo correspondente no formulário.
- A coluna I é protegida contra edição manual, com a descrição `AGENDA_DATA_CADASTRO_SOMENTE_LEITURA`.
- A consulta do agendamento devolve `dataCadastro`, e a edição preserva o valor já gravado na coluna I.
- A interface apresenta a data de cadastro no detalhamento do agendamento.

### Arquivos da PR #20

- **Criado:** `tests/agendamento-repository.test.js`.
- **Alterados:** `AgendamentoRepository.js`, `index.html`, `tests/agendamento.test.js`, `tests/agendamento-interface.test.js`.
- **Mantidos:** `AgendamentoService.js`, `AgendamentoRules.js`, `AgendamentoValidator.js`, `Main.gs.js`, demais entidades e integrações, configurações e `PROJECT_GUIDE.md`.
- **Excluídos:** nenhum. Não foi identificada responsabilidade antiga obsoleta nesta etapa.
- **Documentação:** esta atualização registra o resultado da PR #20; o guia do projeto permanece inalterado.

### Validação automatizada

- GitHub Actions, execução de validação #92 (run ID `43128894716`): concluída com sucesso.
- Sintaxe JavaScript, testes automatizados e validação de configuração aprovados.
- A execução de Pull Request não publicou o conteúdo no Apps Script.
- Os testes de repositório utilizam dependências simuladas; não comprovam, por si só, a aplicação efetiva das permissões na planilha real.

### Pendências de validação no Google Apps Script

1. Executar o workflow manual de publicação da branch `main`, com a confirmação `publicar=true`, caso ainda não tenha sido executado.
2. Confirmar no GitHub Actions que os jobs de validação e publicação terminaram com sucesso.
3. Na implantação atual, criar um agendamento e conferir se a coluna I recebe a data automaticamente.
4. Conferir se a coluna I está protegida contra edição manual e se a edição de um agendamento preserva a data original.
5. Conferir se a data aparece no detalhamento da interface.

**Importante:** a integração da PR #20 no GitHub não significa que a implantação Web App já esteja atualizada. Não registrar uma nova versão publicada até confirmar o sucesso do job de publicação.

## Estado das frentes de evolução já combinadas

### 1. Qualidade e histórico dos dados — em evolução

O CSV da aba `AGENDA` enviado pelo usuário foi analisado e contém 207 registros e as nove colunas esperadas, incluindo `Data_cadastro`. Nesse recorte:

- `FALTOU` já existe como status, com 57 registros; portanto, sua criação não é uma pendência;
- `CONCLUÍDO`: 107 registros;
- `CANCELADO`: 17 registros;
- `AGENDADO`: 15 registros;
- `CONFIRMADO`: 11 registros;
- `Data_cadastro` está preenchida em 203 registros e vazia em 4;
- `Valor` está vazio em 48 registros.

Esses números descrevem somente o CSV analisado e podem mudar conforme a planilha evoluir. A presença de `Data_cadastro` registra a data de criação, mas não informa quando cada alteração de status ocorreu.

Pendências desta frente:

- concluído nesta etapa: novas mudanças de status passam a ser registradas com data/hora na aba `AGENDA_HISTORICO_STATUS`, sem sobrescrever o histórico anterior;
- mudanças antigas continuam sem timestamp confiável e não serão reconstruídas por estimativa;
- investigar os quatro registros sem `Data_cadastro` e os 48 sem `Valor`, definindo tratamento sem inventar ou preencher dados históricos;
- verificar consistência e completude antes de utilizar os registros no treinamento.

O histórico passa a registrar transições a partir da publicação desta implementação. Dados históricos sem a data em que o status foi definido continuam sem permitir reconstruir com segurança o que era conhecido em cada momento.

### 2. Previsão de faltas com K-NN — implementada e publicada na PR #22

A implementação do algoritmo K-NN (K vizinhos mais próximos) foi integrada na PR #22. A arquitetura inclui:

- `AprendizadoMaquinaService.js`;
- `AprendizadoMaquinaRepository.js`;
- `AprendizadoMaquinaRules.js`;
- `AprendizadoMaquinaValidator.js`;
- `KNNClassifier.js`;
- integração controlada com o fluxo de agendamentos e a interface, quando definida.

Implementação da PR #22: distância mista para atributos numéricos e categóricos; separação cronológica 60/20/20; comparação com baseline; métricas de acurácia, precisão, recall, F1 e matriz de confusão. O treinamento usa somente registros com resultado final `FALTOU` ou `CONCLUÍDO`; estados em aberto e cancelados não são rótulos. O escore apresentado é a proporção de faltas entre vizinhos, não uma probabilidade calibrada. A Agenda só recebe escores quando o modelo supera o baseline e atinge os critérios mínimos de avaliação. A validação automatizada da PR #22 foi aprovada; testes reais no Apps Script ainda estão pendentes.

### 3. Tela de parâmetros/configurações dos modelos — implementada e publicada inicialmente

A tela própria para administrar os parâmetros dos modelos foi criada como parte da PR #22. A implementação atual contempla o K-NN; novos modelos exigirão suas próprias implementações e parâmetros.

Funcionalidades implementadas nesta primeira versão:

- selecionar o modelo disponível;
- configurar os parâmetros específicos de cada modelo (no K-NN, por exemplo, a quantidade de vizinhos `K`);
- selecionar as características dos agendamentos utilizadas pelo modelo;
- configurar critérios de distância e pesos, quando aplicáveis;
- definir parâmetros de treinamento e avaliação;
- salvar, recuperar e identificar a configuração ativa;
- permitir comparar configurações/experimentos e seus resultados.

A tela atual permite configurar K, limiar, características, ponderação por distância, salvar configurações, treinar/avaliar e comparar experimentos. As abas `ML_CONFIGURACOES`, `ML_EXPERIMENTOS` e `ML_MODELO` são criadas sob demanda pelo Repository. A arquitetura permite incorporar outros modelos futuramente, mas suas implementações específicas ainda não existem.

### 4. Jornada e disponibilidade dos profissionais — ainda pendente

Para oferecer horários livres e alternativas confiáveis pelo BOT, ainda é necessário definir uma fonte de dados para:

- dias de trabalho da semana;
- início e fim do expediente;
- intervalos;
- folgas e exceções;
- serviços que cada profissional está habilitado a executar, quando aplicável.

Até essa fonte existir, a ferramenta de verificação informa apenas conflitos com agendamentos já registrados; ausência de conflito não comprova que o profissional trabalha naquele horário. Não implementar busca de primeiro horário livre com base apenas na ausência de conflitos.

### 5. Segurança para eventual acesso público — ainda pendente

A implantação permanece com acesso `MYSELF`. Antes de liberar o BOT ou a aplicação a visitantes externos, é necessário revisar autenticação e autorização no servidor e proteger todos os pontos de entrada administrativos. Não alterar o acesso para público antes dessa etapa.

### 6. Testes integrados reais — pendentes de confirmação

Os testes automatizados aprovados não substituem a validação no ambiente Google. Permanecem como verificações manuais ou integradas a registrar:

- CRUD de agendamentos na implantação e na planilha reais;
- gravação, preservação e proteção de `Data_cadastro`;
- preenchimento de CEP com ViaCEP e gravação de cliente/bairro;
- conversa real do BOT com Groq, consultas e confirmação antes da gravação;
- processamento tradicional de e-mails Gmail e prevenção de duplicidade;
- confirmação visual da interface e dos dados exibidos.

A integração experimental de leitura de e-mails com IA continua sendo uma frente separada, sujeita às pendências já descritas neste documento; não considerá-la concluída.

## Próxima etapa recomendada

Executar a validação funcional no Web App publicado: abrir a tela Previsão de faltas, treinar o modelo na planilha real, conferir as métricas calculadas pelo Apps Script e validar visualmente a coluna de escores na Agenda. A avaliação local do CSV é preliminar e não substitui o resultado calculado no ambiente real.


---

## Implementação inicial do K-NN e da tela de configuração — PR #22

### Escopo implementado na branch `feature/knn-previsao-faltas`

- Criados `KNNClassifier.js`, `AprendizadoMaquinaRules.js`, `AprendizadoMaquinaValidator.js`, `AprendizadoMaquinaService.js` e `AprendizadoMaquinaRepository.js`.
- Criado `tests/aprendizado-maquina.test.js` para o classificador, métricas, preparação dos rótulos, separação temporal e validação.
- Alterados `AgendamentoRepository.js` e `AgendamentoRules.js` para leitura dos dados de treinamento, registro de transições futuras e reconhecimento de `FALTOU`.
- Alterados `index.html` e `tests/agendamento-interface.test.js` para a tela de parâmetros e a coluna de escore na Agenda.
- Nenhum arquivo antigo foi removido.

### Persistência criada sob demanda

- `ML_CONFIGURACOES`: configurações salvas.
- `ML_EXPERIMENTOS`: histórico das avaliações e métricas.
- `ML_MODELO`: modelo treinado utilizado nas previsões.
- `AGENDA_HISTORICO_STATUS`: histórico append-only das mudanças de status posteriores à publicação.

### Configuração inicial avaliada no CSV disponível

- 164 registros com rótulo final (`FALTOU` ou `CONCLUÍDO`).
- Divisão temporal: 98 para treino, 33 para validação e 33 para teste.
- Configuração inicial: K=3; horário, dia da semana, funcionário e serviço.
- Avaliação preliminar reproduzida localmente com a mesma distância mista: acurácia 72,7%, precisão 54,5%, recall 60,0%, F1 57,1%; baseline 69,7%.
- A avaliação no ambiente Apps Script deverá ser conferida após a publicação. O escore dos vizinhos não deve ser interpretado como probabilidade calibrada.

### Critérios de liberação na Agenda

O modelo só libera escores quando houver pelo menos 20 exemplos no teste, F1, recall e precisão iguais ou superiores a 0,50 e acurácia superior ao baseline. Se não atingir os critérios, a grade informa que a estimativa está indisponível, evitando exibir números sem desempenho mínimo.

### Validação automatizada

- PR #22: GitHub Actions, execução #99 (run ID `43133466477`), concluída com sucesso.
- Verificação de sintaxe JavaScript: sucesso.
- Testes automatizados `node --test tests/*.test.js`: sucesso.
- Validação de `appsscript.json` e `.clasp.json`: sucesso.
- Job de publicação: ignorado por se tratar de Pull Request.

### Como validar após integrar e publicar

1. Abrir **Previsão de faltas** e conferir os parâmetros carregados.
2. Salvar uma configuração válida e confirmar a persistência nas abas técnicas.
3. Executar **Treinar e avaliar modelo**; conferir amostras, divisão temporal, métricas e baseline.
4. Conferir se o modelo foi aprovado pelos critérios e se o experimento foi registrado.
5. Abrir a Agenda e verificar a coluna **Risco estimado de falta** nos agendamentos futuros em aberto.
6. Alterar o status de um agendamento para `FALTOU` e conferir a criação de uma linha em `AGENDA_HISTORICO_STATUS`.
7. Repetir a alteração sem mudar o status e confirmar que não é criada uma transição duplicada.
8. Conferir que edição de agendamento preserva `Data_cadastro` e que as demais funções do CRUD continuam funcionando.

### Pendências

- Integrar a PR #22 e publicar o conteúdo da `main` pelo workflow autorizado.
- Conferir o treinamento e as métricas na planilha real, pois a avaliação local não substitui a execução no Apps Script.
- Validar visualmente a grade e o tempo de carregamento com os registros reais.
- Melhorar a qualidade e ampliar o histórico de dados; a base atual é pequena e possui somente cinco clientes distintos no CSV analisado.
- Avaliar calibração do escore e monitorar desempenho com novos resultados antes de tratá-lo como probabilidade.


---

## Registro de implementação e publicação — PR #22

- PR #22 integrada por squash à branch `main`.
- Commit de integração: `fd861078dd71405f53640b756841fee75c503a56`.
- PR #21 foi fechada como substituída; seu conteúdo atualizado foi incorporado à documentação da PR #22.
- GitHub Actions, execução #101 (run ID `43133627283`), evento `push` na `main`: concluída com sucesso.
- Validação de sintaxe JavaScript, testes automatizados e configuração: sucesso.
- Envio dos arquivos ao Google Apps Script: sucesso.
- Atualização da implantação existente do Web App: sucesso.
- A publicação técnica está confirmada. Os testes funcionais na planilha real e no navegador permanecem pendentes.

### Arquivos da implementação

**Criados**
- `KNNClassifier.js`
- `AprendizadoMaquinaRules.js`
- `AprendizadoMaquinaValidator.js`
- `AprendizadoMaquinaService.js`
- `AprendizadoMaquinaRepository.js`
- `tests/aprendizado-maquina.test.js`

**Alterados**
- `AgendamentoRepository.js`
- `AgendamentoRules.js`
- `index.html`
- `tests/agendamento-interface.test.js`
- `PROJECT_STATUS.md`

**Mantidos**
- Demais arquivos e integrações existentes, incluindo BOT, Gmail, cadastros, configurações e `PROJECT_GUIDE.md`.

**Excluídos**
- Nenhum. Não foi identificada duplicação antiga que pudesse ser removida com segurança nesta etapa.

### Como testar no Web App publicado

1. Abrir a implantação Web App já utilizada pelo projeto.
2. Acessar **Previsão de faltas**.
3. Conferir a configuração inicial, salvar e executar **Treinar e avaliar modelo**.
4. Conferir as métricas, a aprovação ou reprovação e o registro do experimento.
5. Acessar **Agenda** e conferir a coluna **Risco estimado de falta** nos agendamentos futuros com status AGENDADO ou CONFIRMADO.
6. Alterar o status de um agendamento de teste para FALTOU e verificar a criação do histórico em `AGENDA_HISTORICO_STATUS`.
7. Confirmar que os demais fluxos de cadastro, edição, detalhamento e cancelamento continuam funcionando.

### Limitações conhecidas

- O histórico de status registra transições a partir desta publicação; não existem timestamps confiáveis para reconstruir alterações antigas.
- A base analisada tem 164 exemplos rotulados e somente cinco clientes distintos no CSV. Os resultados podem variar conforme novos dados sejam adicionados.
- O valor percentual apresentado é escore experimental de vizinhos, não probabilidade calibrada.
- A execução automatizada não testa a planilha real nem a interação visual do Web App; essa conferência funcional permanece pendente.


---

## Previsão de faltas — orientação e diagnóstico detalhado preparados

### Implementado na branch feature/previsao-faltas-interface-didatica
- A tela explica o algoritmo K-NN atualmente disponível e informa que outros algoritmos não devem ser selecionados antes de serem implementados e testados.
- Os parâmetros K, limiar, características e ponderação possuem explicação, orientação inicial e recomendação de uso.
- A tela apresenta instruções passo a passo para salvar, treinar, avaliar e comparar configurações.
- O Service retorna os critérios individuais de aprovação, resultados, limites, explicações e recomendações.
- O painel diferencia modelo inexistente de modelo treinado e reprovado.
- O Repository grava o modelo ativo em uma linha fixa e procura explicitamente a chave ATUAL, evitando depender da última linha utilizada da aba.

### Critérios preservados
- Mínimo de 20 exemplos no conjunto de teste.
- F1, recall e precisão iguais ou superiores a 0,50.
- Acurácia superior ao baseline.
- Modelos reprovados permanecem disponíveis para consulta, mas não liberam escores na Agenda.

### Arquivos alterados
- `index.html`
- `AprendizadoMaquinaService.js`
- `AprendizadoMaquinaRepository.js`
- `tests/aprendizado-maquina.test.js`
- `PROJECT_STATUS.md`

### Arquivos mantidos
- `AprendizadoMaquinaRules.js`
- `AprendizadoMaquinaValidator.js`
- `KNNClassifier.js`
- `PROJECT_GUIDE.md`

### Exclusões
Nenhum arquivo removido.

### Validação
Aguardando execução do GitHub Actions no Pull Request. A publicação no Apps Script só será considerada concluída após confirmação do workflow de publicação na branch principal.
