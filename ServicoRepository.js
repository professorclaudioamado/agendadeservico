/**
 * Entidade: Serviço
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Centralizar o acesso à aba SERVICOS, incluindo verificação de cabeçalhos,
 * geração do próximo código e gravação dos dados do serviço.
 */
var ServicoRepository = (function() {
  var NOME_ABA = "SERVICOS";
  var CABECALHOS = ["Código", "Nome", "Valor", "Tempo"];

  /**
   * Persiste um serviço validado na planilha.
   *
   * @param {{nome: string, valor: number, tempo: number}} servico Dados válidos.
   * @return {number} Código atribuído ao serviço.
   * @throws {Error} Quando a aba ou seus cabeçalhos não forem válidos.
   */
  function salvar(servico) {
    var aba = obterAba_();
    verificarCabecalhos_(aba);
    var codigo = gerarProximoCodigo_(aba);

    aba.appendRow([codigo, servico.nome, servico.valor, servico.tempo]);
    return codigo;
  }

  /** @return {GoogleAppsScript.Spreadsheet.Sheet} Aba SERVICOS. */
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
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba de serviços.
   * @throws {Error} Quando algum cabeçalho não corresponder ao esperado.
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

      // Mantém a compatibilidade com cabeçalho "Codigo" sem acento.
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
   * Calcula o maior código atual mais um, como no fluxo anterior.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba de serviços.
   * @return {number} Próximo código numérico.
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
    salvar: salvar
  };
})();
