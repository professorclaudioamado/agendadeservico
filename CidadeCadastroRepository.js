/**
 * Entidade: Cidade
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Centralizar o acesso à aba CIDADES, incluindo validação de cabeçalhos,
 * geração do próximo código e gravação dos dados.
 *
 * Dependências principais:
 * - SpreadsheetApp do Google Apps Script.
 */
var CidadeRepository = (function() {
  var NOME_ABA = "CIDADES";
  var CABECALHOS = ["Código", "Nome", "Estado"];

  /**
   * Persiste uma cidade já validada.
   *
   * @param {{nome: string, estado: string}} cidade Dados válidos da cidade.
   * @return {number} Código atribuído ao novo registro.
   * @throws {Error} Quando a aba ou seus cabeçalhos não forem válidos.
   */
  function salvar(cidade) {
    var aba = obterAba_();
    verificarCabecalhos_(aba);
    var codigo = gerarProximoCodigo_(aba);

    aba.appendRow([codigo, cidade.nome, cidade.estado]);
    return codigo;
  }

  /** @return {GoogleAppsScript.Spreadsheet.Sheet} Aba CIDADES. */
  function obterAba_() {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(NOME_ABA);

    if (!aba) {
      throw new Error("A aba " + NOME_ABA + " não foi encontrada.");
    }

    return aba;
  }

  /**
   * Confere os cabeçalhos existentes sem alterar a planilha.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba CIDADES.
   * @throws {Error} Quando os cabeçalhos não correspondem ao esperado.
   */
  function verificarCabecalhos_(aba) {
    if (aba.getLastRow() < 1) {
      throw new Error("A aba " + aba.getName() + " não possui cabeçalhos.");
    }

    var encontrados = aba.getRange(1, 1, 1, CABECALHOS.length)
      .getDisplayValues()[0];

    for (var i = 0; i < CABECALHOS.length; i++) {
      var encontrado = String(encontrados[i]).trim().toLowerCase();
      var esperado = CABECALHOS[i].trim().toLowerCase();

      // Preserva a compatibilidade já aceita com "Codigo" sem acento.
      if (i === 0 && encontrado === "codigo") continue;

      if (encontrado !== esperado) {
        throw new Error(
          "Confira a coluna " + (i + 1) + " da aba " + aba.getName() +
          ". Título esperado: " + CABECALHOS[i]
        );
      }
    }
  }

  /**
   * Calcula o maior código existente mais um.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba CIDADES.
   * @return {number} Próximo código numérico.
   */
  function gerarProximoCodigo_(aba) {
    var ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 1;

    var codigos = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();
    var maiorCodigo = 0;

    for (var i = 0; i < codigos.length; i++) {
      var atual = Number(codigos[i][0]);
      if (!isNaN(atual) && atual > maiorCodigo) {
        maiorCodigo = atual;
      }
    }

    return maiorCodigo + 1;
  }

  return {
    salvar: salvar
  };
})();
