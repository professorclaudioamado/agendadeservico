/**
 * Entidade: Bairro
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Centralizar o acesso à aba BAIRROS para o cadastro de bairros,
 * incluindo validação dos cabeçalhos utilizados, geração do próximo
 * código e gravação do registro.
 *
 * Dependências principais:
 * - SpreadsheetApp do Google Apps Script.
 */
var BairroRepository = (function() {
  var NOME_ABA = "BAIRROS";
  var CABECALHOS_UTILIZADOS = ["Código", "Nome"];

  /**
   * Persiste um bairro já validado e normalizado.
   *
   * Observação: a planilha atual possui também a coluna "cidade", mas o
   * fluxo existente de cadastro recebe apenas o nome do bairro. Para manter
   * esta etapa como Refactoring — Refatoração, sem mudança funcional, a
   * terceira coluna continua sem ser preenchida por este cadastro.
   *
   * @param {string} nome Nome do bairro já validado e normalizado.
   * @return {number} Código atribuído ao novo bairro.
   * @throws {Error} Quando a aba ou os cabeçalhos utilizados são inválidos.
   */
  function salvar(nome) {
    var aba = obterAba_();
    verificarCabecalhos_(aba);
    var codigo = gerarProximoCodigo_(aba);

    aba.appendRow([codigo, nome]);
    return codigo;
  }

  /**
   * Localiza a aba BAIRROS.
   *
   * @return {GoogleAppsScript.Spreadsheet.Sheet} Aba BAIRROS.
   * @throws {Error} Quando a aba não existe.
   * @private
   */
  function obterAba_() {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(NOME_ABA);

    if (!aba) {
      throw new Error("A aba " + NOME_ABA + " não foi encontrada.");
    }

    return aba;
  }

  /**
   * Confere os cabeçalhos efetivamente usados pelo fluxo atual.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba BAIRROS.
   * @return {void}
   * @throws {Error} Quando algum cabeçalho não corresponde ao esperado.
   * @private
   */
  function verificarCabecalhos_(aba) {
    if (aba.getLastRow() < 1) {
      throw new Error("A aba " + aba.getName() + " não possui cabeçalhos.");
    }

    var encontrados = aba
      .getRange(1, 1, 1, CABECALHOS_UTILIZADOS.length)
      .getDisplayValues()[0];

    for (var i = 0; i < CABECALHOS_UTILIZADOS.length; i++) {
      var encontrado = String(encontrados[i]).trim().toLowerCase();
      var esperado = CABECALHOS_UTILIZADOS[i].trim().toLowerCase();

      // Preserva a compatibilidade já aceita com "Codigo" sem acento.
      if (i === 0 && encontrado === "codigo") continue;

      if (encontrado !== esperado) {
        throw new Error(
          "Confira a coluna " + (i + 1) + " da aba " + aba.getName() +
          ". Título esperado: " + CABECALHOS_UTILIZADOS[i]
        );
      }
    }
  }

  /**
   * Calcula o maior código existente mais um.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba BAIRROS.
   * @return {number} Próximo código numérico.
   * @private
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
