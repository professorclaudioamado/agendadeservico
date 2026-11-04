/**
 * Entidade: Bairro
 * Camada: Repository — Repositório
 * Responsabilidade: concentrar a consulta e a gravação na aba BAIRROS.
 * Dependência: SpreadsheetApp do Google Apps Script.
 */
var BairroRepository = (function() {
  var NOME_ABA = "BAIRROS";
  var CABECALHOS_UTILIZADOS = ["Código", "Nome"];

  /** Busca por nome sem diferenciar maiúsculas/minúsculas ou espaços externos.
   * @param {string} nome Nome procurado.
   * @return {{codigo: string, nome: string}|null} Registro ou null.
   */
  function buscarPorNome(nome) {
    var aba = obterAba_();
    verificarCabecalhos_(aba);
    var ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return null;
    var procurado = normalizarNome_(nome);
    var registros = aba.getRange(2, 1, ultimaLinha - 1, 2).getDisplayValues();
    for (var i = 0; i < registros.length; i++) {
      var codigo = String(registros[i][0]).trim();
      var nomeEncontrado = String(registros[i][1]).trim();
      if (codigo !== "" && normalizarNome_(nomeEncontrado) === procurado) {
        return {codigo: codigo, nome: nomeEncontrado};
      }
    }
    return null;
  }

  /** Grava um bairro validado e retorna o código atribuído.
   * A terceira coluna opcional "cidade" permanece sem alteração nesta etapa.
   * @param {string} nome Nome validado e normalizado.
   * @return {number} Código atribuído.
   */
  function salvar(nome) {
    var aba = obterAba_();
    verificarCabecalhos_(aba);
    var codigo = gerarProximoCodigo_(aba);
    aba.appendRow([codigo, nome]);
    return codigo;
  }

  /** Normaliza somente para comparação, sem alterar o valor armazenado.
   * @param {string} nome Nome a comparar.
   * @return {string} Nome em minúsculas e sem espaços externos.
   * @private
   */
  function normalizarNome_(nome) {
    return String(nome || "").trim().toLocaleLowerCase();
  }

  /** @return {GoogleAppsScript.Spreadsheet.Sheet} Aba BAIRROS.
   * @throws {Error} Quando a aba não existe.
   * @private
   */
  function obterAba_() {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(NOME_ABA);
    if (!aba) throw new Error("A aba " + NOME_ABA + " não foi encontrada.");
    return aba;
  }

  /** Verifica os dois cabeçalhos utilizados pelo cadastro atual.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba BAIRROS.
   * @throws {Error} Quando a estrutura não corresponde ao esperado.
   * @private
   */
  function verificarCabecalhos_(aba) {
    if (aba.getLastRow() < 1) throw new Error("A aba " + aba.getName() + " não possui cabeçalhos.");
    var encontrados = aba.getRange(1, 1, 1, 2).getDisplayValues()[0];
    for (var i = 0; i < CABECALHOS_UTILIZADOS.length; i++) {
      var encontrado = String(encontrados[i]).trim().toLowerCase();
      var esperado = CABECALHOS_UTILIZADOS[i].trim().toLowerCase();
      if (i === 0 && encontrado === "codigo") continue;
      if (encontrado !== esperado) {
        throw new Error("Confira a coluna " + (i + 1) + " da aba " + aba.getName() +
          ". Título esperado: " + CABECALHOS_UTILIZADOS[i]);
      }
    }
  }

  /** Calcula o maior código existente mais um.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba BAIRROS.
   * @return {number} Próximo código.
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

  return {buscarPorNome: buscarPorNome, salvar: salvar};
})();
