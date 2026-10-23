/**
 * Entidade: Cliente
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Concentrar a leitura e a gravação na planilha relacionadas ao cadastro
 * de clientes, incluindo as consultas de cidades e bairros usadas pelo formulário.
 *
 * Dependências principais:
 * - Google Apps Script SpreadsheetApp.
 *
 * Observação:
 * Os nomes e a ordem dos cabeçalhos existentes são preservados.
 */
var ClienteRepository = (function() {

  var ABA_CLIENTES = "CLIENTES";
  var ABA_CIDADES = "CIDADES";
  var ABA_BAIRROS = "BAIRROS";

  var CABECALHOS_CLIENTES = [
    "Código", "Nome", "CPF", "Dt_aniversario", "Endereço",
    "Número", "Codigo_cidade", "Codigo_bairro", "CEP",
    "Celular", "E-mail", "Status_financeiro"
  ];

  /**
   * Lista cidades para a lista suspensa do formulário de clientes.
   *
   * @return {Object[]} Objetos com codigo, nome e estado.
   */
  function listarCidades() {
    var aba = obterAba_(ABA_CIDADES);
    verificarCabecalhos_(aba, ["Código", "Nome", "Estado"]);

    if (aba.getLastRow() < 2) return [];

    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, 3).getDisplayValues();
    var resultado = [];

    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][0]).trim() !== "" && String(dados[i][1]).trim() !== "") {
        resultado.push({
          codigo: String(dados[i][0]).trim(),
          nome: String(dados[i][1]).trim(),
          estado: String(dados[i][2]).trim()
        });
      }
    }

    return resultado;
  }

  /**
   * Lista bairros para a lista suspensa do formulário de clientes.
   *
   * @return {Object[]} Objetos com codigo e nome.
   */
  function listarBairros() {
    var aba = obterAba_(ABA_BAIRROS);
    verificarCabecalhos_(aba, ["Código", "Nome"]);

    if (aba.getLastRow() < 2) return [];

    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, 2).getDisplayValues();
    var resultado = [];

    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][0]).trim() !== "" && String(dados[i][1]).trim() !== "") {
        resultado.push({
          codigo: String(dados[i][0]).trim(),
          nome: String(dados[i][1]).trim()
        });
      }
    }

    return resultado;
  }

  /**
   * Busca uma cidade pelo código.
   *
   * @param {string|number} codigo Código da cidade.
   * @return {Object|null} Cidade encontrada ou null.
   */
  function buscarCidadePorCodigo(codigo) {
    return buscarPorCodigo_(listarCidades(), codigo);
  }

  /**
   * Busca um bairro pelo código.
   *
   * @param {string|number} codigo Código do bairro.
   * @return {Object|null} Bairro encontrado ou null.
   */
  function buscarBairroPorCodigo(codigo) {
    return buscarPorCodigo_(listarBairros(), codigo);
  }

  /**
   * Grava um cliente já validado e preparado pelo Service.
   *
   * @param {Object} cliente Dados normalizados do cliente.
   * @return {number} Código gerado para o cliente.
   */
  function salvar(cliente) {
    var aba = obterAba_(ABA_CLIENTES);
    verificarCabecalhos_(aba, CABECALHOS_CLIENTES);

    var codigo = gerarProximoCodigo_(aba);
    aba.appendRow([
      codigo,
      cliente.nome,
      cliente.cpf,
      cliente.dt_aniversario,
      cliente.endereco,
      cliente.numero,
      Number(cliente.codigo_cidade),
      Number(cliente.codigo_bairro),
      cliente.cep,
      cliente.celular,
      cliente.email,
      cliente.status_financeiro
    ]);

    return codigo;
  }

  /**
   * Procura um registro pelo código em uma lista previamente consultada.
   *
   * @param {Object[]} itens Lista de registros.
   * @param {string|number} codigo Código procurado.
   * @return {Object|null} Registro encontrado ou null.
   * @private
   */
  function buscarPorCodigo_(itens, codigo) {
    var procurado = String(codigo).trim();
    for (var i = 0; i < itens.length; i++) {
      if (String(itens[i].codigo).trim() === procurado) return itens[i];
    }
    return null;
  }

  /**
   * Obtém uma aba pelo nome.
   *
   * @param {string} nome Nome da aba.
   * @return {GoogleAppsScript.Spreadsheet.Sheet} Aba encontrada.
   * @throws {Error} Quando a aba não existe.
   * @private
   */
  function obterAba_(nome) {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(nome);
    if (!aba) throw new Error("A aba " + nome + " não foi encontrada.");
    return aba;
  }

  /**
   * Verifica os cabeçalhos para evitar leitura ou gravação em estrutura incorreta.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba verificada.
   * @param {string[]} esperados Cabeçalhos esperados na ordem definida.
   * @return {void}
   * @throws {Error} Quando um cabeçalho não corresponde ao esperado.
   * @private
   */
  function verificarCabecalhos_(aba, esperados) {
    if (aba.getLastRow() < 1) {
      throw new Error("A aba " + aba.getName() + " não possui cabeçalhos.");
    }

    var cabecalhos = aba.getRange(1, 1, 1, esperados.length).getDisplayValues()[0];
    for (var i = 0; i < esperados.length; i++) {
      var encontrado = String(cabecalhos[i]).trim().toLowerCase();
      var esperado = String(esperados[i]).trim().toLowerCase();
      if (i === 0 && encontrado === "codigo") continue;
      if (encontrado !== esperado) {
        throw new Error(
          "Confira a coluna " + (i + 1) + " da aba " + aba.getName() +
          ". Título esperado: " + esperados[i]
        );
      }
    }
  }

  /**
   * Gera o próximo código numérico a partir do maior código existente.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba de destino.
   * @return {number} Próximo código disponível.
   * @private
   */
  function gerarProximoCodigo_(aba) {
    var ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 1;

    var codigos = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();
    var maiorCodigo = 0;
    for (var i = 0; i < codigos.length; i++) {
      var atual = Number(codigos[i][0]);
      if (!isNaN(atual) && atual > maiorCodigo) maiorCodigo = atual;
    }
    return maiorCodigo + 1;
  }

  return {
    listarCidades: listarCidades,
    listarBairros: listarBairros,
    buscarCidadePorCodigo: buscarCidadePorCodigo,
    buscarBairroPorCodigo: buscarBairroPorCodigo,
    salvar: salvar
  };

})();
