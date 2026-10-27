# PROJECT_STATUS.md — Status do Projeto Agenda de Serviços

## Versão atual

Aplicação existente com entidades organizadas em camadas; integração com Gmail preparada em modo de diagnóstico somente leitura; automação de validação e publicação do GitHub para Google Apps Script em configuração.

## Arquitetura adotada

**Interface → Service → Rules / Validator → Repository → Google Sheets**

O repositório GitHub é a fonte central planejada para o código. O Google Apps Script será atualizado por um fluxo controlado de GitHub Actions após a configuração inicial da autenticação.

## Concluído anteriormente

- Cadastro de clientes.
- Cadastro de profissionais.
- Cadastro de serviços.
- Criação de agendamentos.
- Uso do Google Sheets como armazenamento.
- Uso do Google Apps Script na aplicação.
- Refatoração incremental das entidades existentes, conforme os arquivos e documentos de refatoração presentes no repositório.

## Integração com Gmail — Etapa 1

### Preparado no repositório

- `GmailAgendamentoRepository.js`: pesquisa conversas candidatas e retorna mensagens cujo assunto é exatamente `AGENDAMENTO`, sem diferenciar maiúsculas de minúsculas.
- `GmailAgendamentoValidator.js`: extrai e valida Cliente, Serviço, Data e Horário.
- `GmailAgendamentoService.js`: analisa mensagens e registra um diagnóstico nos logs por meio da função pública `verificarEmailsAgendamento()`.
- `docs/gmail/README.md`: documenta formato esperado, limites, testes e procedimento de validação.

### Segurança e limites desta etapa

- Não grava agendamentos na planilha.
- Não modifica, move ou marca mensagens do Gmail como lidas.
- Não registra o corpo completo do e-mail.
- Não valida ainda se cliente ou serviço existem nos cadastros.
- Não possui controle persistente de duplicidade nem acionador automático.
- A pesquisa está limitada a 100 conversas candidatas por execução.

### Testes locais previamente realizados

- Sintaxe dos três arquivos verificada.
- Exemplo `Maria Silva / Consulta / 30/10/2026 / 14:00` validado.
- Data inexistente, horário inválido e campos ausentes detectados.

A execução real no Google Apps Script com Gmail autorizado ainda não foi realizada.

## Centralização no GitHub e publicação no Apps Script

### Preparado nesta etapa

- `.github/workflows/apps-script.yml`: valida a sintaxe JavaScript e o manifesto/configuração; prevê publicação pelo `clasp` após as validações.
- `.gitignore`: protege arquivos locais de credenciais e dependências geradas.
- `docs/deployment/GITHUB_ACTIONS_APPS_SCRIPT.md`: documenta autenticação, segredo do GitHub, ativação da publicação e cuidados de segurança.
- A publicação automática está protegida pela variável de repositório `APPS_SCRIPT_DEPLOY_ENABLED=true`; por padrão, a automação não publica automaticamente.
- A publicação manual exige marcar explicitamente a confirmação na execução do workflow.

### Pendente para ativação

1. Ativar a API Google Apps Script, se ainda não estiver ativa.
2. Gerar a credencial OAuth do `clasp` com a conta Google correta.
3. Cadastrar o segredo `CLASPRC_JSON` nas configurações do GitHub.
4. Confirmar que o projeto Apps Script associado ao `.clasp.json` é o destino correto e que o GitHub contém a versão que deve ser considerada oficial.
5. Ativar a variável `APPS_SCRIPT_DEPLOY_ENABLED=true` somente após essa conferência.
6. Executar a primeira publicação controlada e conferir o resultado no Apps Script.

**Importante:** a publicação com `clasp push --force` substitui o código do projeto remoto pelo conteúdo versionado no GitHub. A validação do workflow em pull request foi aprovada. A automação ainda não foi executada contra o projeto real e não há confirmação de publicação até que as credenciais e a configuração sejam validadas.

O envio do código ao projeto Apps Script não atualiza automaticamente uma implantação de Web App já publicada; essa etapa requer o ID da implantação e configuração específica caso seja necessária.

## Próximos passos

1. Completar a autorização inicial e validar a publicação controlada no Apps Script.
2. Validar a leitura real dos e-mails com `verificarEmailsAgendamento()`.
3. Mapear clientes e serviços para os códigos utilizados pelo sistema atual.
4. Implementar prevenção persistente de duplicidade antes de criar agendamentos.
5. Configurar o processamento automático somente depois dos testes do fluxo completo.

## Arquivos criados na etapa de automação

- `.github/workflows/apps-script.yml`
- `.gitignore`
- `docs/deployment/GITHUB_ACTIONS_APPS_SCRIPT.md`

## Arquivos alterados nesta etapa

- `PROJECT_STATUS.md`
- `docs/gmail/README.md`

## Arquivos mantidos

- Os arquivos de aplicação existentes e os três arquivos de diagnóstico Gmail.
- `.clasp.json`, que contém o identificador e a configuração do projeto Apps Script.
- `.claspignore`, que continua excluindo o arquivo HTML de backup.
- `PROJECT_GUIDE.md`, sem alterações.

## Arquivos removidos

Nenhum. Não há arquivo obsoleto identificado nesta etapa.

## Como testar a automação

1. A validação do workflow foi executada com sucesso no pull request #2.
2. Cadastrar o segredo `CLASPRC_JSON` e conferir o destino em `.clasp.json`.
3. Fazer a primeira publicação somente após confirmar que o conteúdo do GitHub deve substituir o código remoto.
4. Conferir a execução em **GitHub → Actions** e verificar os arquivos no editor Google Apps Script.


## CRUD de Funcionários — implementação em andamento

- A interface de funcionários foi preparada para incluir ações por linha: consultar, editar e excluir.
- O clique na linha carrega o registro no formulário, mantendo o código original para atualização.
- O serviço e o repositório passam a oferecer consulta por código, atualização do nome e exclusão por código.
- A exclusão exige confirmação explícita na interface.
- Esta etapa deve ser validada pelo workflow do GitHub Actions e revisada antes de integrar à branch principal.
