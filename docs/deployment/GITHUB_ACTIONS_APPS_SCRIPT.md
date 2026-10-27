# Publicação do GitHub para o Google Apps Script

## Objetivo

Manter o GitHub como fonte principal do código e usar GitHub Actions para validar os arquivos e, quando autorizado, publicar o conteúdo da branch `main` no projeto Google Apps Script associado ao `.clasp.json`.

## Fluxo configurado

1. Ao abrir um pull request para `main`, o fluxo verifica a sintaxe dos arquivos JavaScript e os arquivos de configuração.
2. Ao integrar alterações na `main`, as validações são executadas novamente.
3. A publicação automática após um push para `main` fica desativada até a variável `APPS_SCRIPT_DEPLOY_ENABLED` do repositório ter o valor textual `true`.
4. Também é possível iniciar uma execução manual em **Actions → Apps Script - validar e publicar**, marcando a opção de publicação. Essa ação publica explicitamente o conteúdo atual da `main`.

## Por que a publicação está protegida inicialmente?

O comando `clasp push --force` substitui o conteúdo de código do projeto Apps Script pelo conteúdo local do repositório. Antes de ativar a publicação automática, confirme que a versão do GitHub contém todos os arquivos que devem existir no projeto Apps Script e que não há alterações importantes feitas diretamente no editor Google que ainda não estejam no GitHub.

O fluxo não executa `clasp pull` nem modifica o código remoto durante a validação. A publicação só acontece quando a condição de publicação é satisfeita.

## Configuração inicial necessária

A configuração é feita uma única vez. O código e o fluxo de automação ficam no GitHub; a autorização Google precisa ser fornecida pelo proprietário da conta, porque o GitHub Actions não pode abrir a tela de consentimento OAuth em nome do usuário.

### 1. Ativar a API do Apps Script

Com a conta Google que tem acesso ao projeto, abra:

https://script.google.com/home/usersettings

Ative a API Google Apps Script, se ainda não estiver ativada.

### 2. Gerar a credencial OAuth do clasp

Em um computador autenticado na conta Google correta, instale Node.js 22 ou superior e execute no terminal:

```bash
npx --yes @google/clasp@3.4.1 login
```

Conclua a autorização no navegador. O comando cria o arquivo de credenciais do clasp no perfil do usuário. No Windows, normalmente fica em:

```text
%USERPROFILE%\.clasprc.json
```

Esse arquivo contém um token de atualização com acesso aos projetos Apps Script. **Não o envie por e-mail, não o coloque no código e não o confirme no Git.**

### 3. Cadastrar o segredo no GitHub

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret**.

- Nome: `CLASPRC_JSON`
- Valor: o conteúdo integral do arquivo `.clasprc.json` gerado pelo comando de login.

Salve o segredo. Ele será disponibilizado somente para o trabalho de publicação; não é necessário criar o segredo `CLASP_JSON`, porque a configuração não secreta do projeto já está versionada no arquivo `.clasp.json`.

### 4. Conferir o projeto de destino

Confirme que o `scriptId` do arquivo `.clasp.json` aponta para o projeto Apps Script correto. Não altere esse ID sem intenção explícita.

Antes da primeira publicação, abra o projeto Apps Script e confirme que o código existente foi incorporado ao GitHub. Uma publicação forçada pode substituir alterações que existam somente no editor remoto.

### 5. Ativar a publicação automática

Somente depois de confirmar o destino e cadastrar `CLASPRC_JSON`, abra:

**Settings → Secrets and variables → Actions → Variables → New repository variable**

- Nome: `APPS_SCRIPT_DEPLOY_ENABLED`
- Valor: `true`

A partir daí, cada atualização integrada à branch `main` executará as validações e, se elas passarem, publicará os arquivos no projeto Apps Script.

Para manter a publicação automática desligada, remova a variável ou altere seu valor para algo diferente de `true`.

## O que a publicação faz — e o que não faz

- Envia os arquivos aceitos pelo `.claspignore` ao projeto Apps Script.
- Cria uma versão identificada pelo commit do GitHub.
- Não publica automaticamente uma nova versão de uma implantação de Web App já existente. Atualizar uma implantação publicada exige identificar o ID da implantação e configurar esse passo explicitamente.
- Não executa funções do Apps Script nem autoriza os escopos Gmail por conta própria. A primeira execução de funções que acessam Gmail ainda pode exigir autorização na conta Google.
- Não baixa alterações do Apps Script para o GitHub. Depois de centralizar o código, as mudanças devem ser feitas no GitHub; edições diretas no editor remoto podem ser sobrescritas por uma publicação futura.

## Diagnóstico de falhas

- **Erro de autenticação / 401:** refaça o login do clasp e atualize o segredo `CLASPRC_JSON`.
- **API não ativada:** ative a API Apps Script na página de configurações indicada acima.
- **Publicação ignorada após push:** confirme que `APPS_SCRIPT_DEPLOY_ENABLED` está definido como `true`.
- **Publicação não atualiza a URL do Web App:** o envio de código não é o mesmo que atualizar uma implantação existente; configure separadamente o ID da implantação após verificar qual URL está em uso.

## Segurança

- `.clasprc.json` está listado no `.gitignore`.
- `.clasp.json` permanece no repositório porque contém o identificador do projeto, não o token OAuth.
- O token é armazenado nos GitHub Secrets, nunca no código-fonte.
- Não habilite a publicação automática antes de verificar que o GitHub é a versão correta do projeto remoto.
