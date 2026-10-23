# Refatoração da entidade Cidade

## Objetivo

Separar o cadastro de Cidade conforme a arquitetura definida no projeto:

**Interface → Service → Validator → Repository → Google Sheets**

Não foi criado `CidadeRules.js` porque o comportamento atual não possui uma regra de negócio independente que justifique essa camada.

## Arquivos criados

- `Fontes/CidadeService.js`
- `Fontes/CidadeCadastroValidator.js`
- `Fontes/CidadeCadastroRepository.js`

## Arquivos alterados

- `Fontes/Main.gs.js` — removida apenas a implementação direta de Cidade.
- `testes/ambienteTeste.js` — adicionados os arquivos de Cidade ao ambiente isolado.
- `testes/cadastros.test.js` — adicionados testes de cadastro e validação de Cidade.
- `testes/contratoInterface.test.js` — o ponto público `cadastrarCidade` passa a ser verificado.

## Compatibilidade preservada

A interface continua chamando:

```javascript
cadastrarCidade(nome, estado)
```

Os nomes da aba e dos cabeçalhos permanecem:

- aba `CIDADES`;
- `Código`;
- `Nome`;
- `Estado`.

## Observação importante

Os helpers genéricos de `Main.gs.js` foram mantidos porque o cadastro de Bairro ainda depende deles. Eles só devem ser removidos após a refatoração de Bairro e nova validação dos testes.
