# PROJECT_STATUS.md — Status do Projeto Agenda de Serviços

## Versão atual

Aplicação existente com entidades refatoradas para uma arquitetura em camadas; integração com Gmail em preparação, na etapa de diagnóstico somente leitura.

## Arquitetura adotada

**Interface → Service → Rules / Validator → Repository → Google Sheets**

A integração de e-mail também separa coordenação, validação e leitura do Gmail. Nesta primeira etapa, ela não grava na planilha.

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
- Não registra o corpo completo do e-mail nos logs.
- Não valida ainda se cliente ou serviço existem nos cadastros.
- Não possui controle persistente de duplicidade nem acionador automático.
- A pesquisa está limitada a 100 conversas candidatas por execução.

### Testes locais

- Sintaxe dos três arquivos verificada.
- Exemplo `Maria Silva / Consulta / 30/10/2026 / 14:00` validado.
- Data inexistente, horário inválido e campos ausentes detectados.

A execução real no Google Apps Script com Gmail autorizado ainda não foi realizada.

## Próximo passo

Validar a integração no ambiente Google Apps Script, executando manualmente `verificarEmailsAgendamento()` e conferindo os logs. Após essa validação, analisar como mapear cliente e serviço para os códigos usados pelo sistema atual antes de implementar a gravação de agendamentos.

## Arquivos criados nesta etapa

- `GmailAgendamentoRepository.js`
- `GmailAgendamentoValidator.js`
- `GmailAgendamentoService.js`
- `docs/gmail/README.md`

## Arquivos alterados nesta etapa

- `PROJECT_STATUS.md`

## Arquivos mantidos

- Os arquivos existentes da aplicação, incluindo os repositórios e serviços de Agendamento, Cliente, Funcionário, Serviço, Bairro e Cidade.
- `PROJECT_GUIDE.md`, sem alterações.

## Arquivos removidos

Nenhum. Não há arquivo obsoleto identificado nesta etapa.

## Como testar

1. Integrar os três arquivos JavaScript ao projeto Apps Script.
2. Executar manualmente `verificarEmailsAgendamento()`.
3. Autorizar o acesso ao Gmail se solicitado.
4. Conferir os logs e verificar que os campos do e-mail de teste foram extraídos corretamente.
5. Confirmar que a aba `AGENDA` não foi alterada por esta etapa.
