# Refatoração da entidade Bairro

## Objetivo

Separar o cadastro de Bairro conforme a arquitetura definida no projeto:

**Interface → Service → Validator → Repository → Google Sheets**

Não foi criado `BairroRules.js` porque o comportamento atual possui apenas validação de entrada e persistência, sem regra de negócio independente que justifique essa camada.

## Arquivos criados

- `Fontes/BairroService.js`
- `Fontes/BairroValidator.js`
- `Fontes/BairroRepository.js`

## Arquivos alterados

- `Fontes/Main.gs.js` — removidos o cadastro direto de Bairro e os helpers genéricos que eram usados somente por esse fluxo.
- `testes/ambienteTeste.js` — adicionados os arquivos de Bairro ao ambiente isolado.
- `testes/cadastros.test.js` — adicionados testes de cadastro e validação de Bairro.
- `testes/contratoInterface.test.js` — o ponto público `cadastrarBairro` passa a ser verificado.

## Compatibilidade preservada

A interface continua chamando:

```javascript
cadastrarBairro(nome)
```

O comportamento existente foi preservado:

- nome obrigatório;
- nome salvo em letras maiúsculas;
- código gerado pelo maior código existente + 1;
- mensagem de sucesso preservada;
- gravação na aba `BAIRROS` usando as colunas `Código` e `Nome`.

## Observação sobre a coluna `cidade`

A aba real `BAIRROS` possui uma terceira coluna chamada `cidade`. O fluxo atual da interface envia somente o nome do bairro e o código antigo também gravava apenas `Código` e `Nome`. Esta refatoração não altera esse comportamento. Associar Bairro a Cidade é uma evolução funcional separada e deve ser implementada com mudança explícita de interface, validações e testes.

## Limpeza estrutural

Após esta refatoração, `Main.gs.js` deixa de precisar dos helpers globais `gerarProximoCodigo`, `verificarCabecalhos` e `obterAba`, pois cada Repository possui suas próprias operações de persistência. O arquivo passa a manter apenas o ponto de entrada global `doGet()`.
