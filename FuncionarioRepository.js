/**
 * Entidade: Funcionário
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Centralizar o acesso à aba FUNCIONARIOS no Google Sheets para o
 * cadastro de funcionários.
 *
 * Dependências principais: SpreadsheetApp do Google Apps Script.
 */
var FuncionarioRepository = (function() {
  var NOME_ABA = "FUNCIONARIOS";
  var CABECALHOS = ["Código", "Nome"];

  /**
   * Grava um funcionário na planilha e gera o próximo código numérico.
   *
   * @param {string} nome Nome já validado e normalizado.
   * @return {number} Código atribuído ao funcionário.
   * @throws {Error} Quando a aba ou seus cabeçalhos não são válidos.
   */
  function salvar(nome) {
    var aba = obterAba_();
    verificarCabecalhos_(aba);
    var codigo = gerarProximoCodigo_(aba);

    aba.appendRow([codigo, nome]);
    return codigo;
  }

  /**
   * Localiza a aba de funcionários.
   *
   * @return {GoogleAppsScript.Spreadsheet.Sheet} Aba FUNCIONARIOS.
   * @throws {Error} Quando a aba não existe.
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
   * Confere os cabeçalhos sem alterar a estrutura da planilha existente.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba a verificar.
   * @throws {Error} Quando a aba não possui os cabeçalhos esperados.
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

      // Compatibilidade com a variação sem acento já aceita pelo sistema.
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
   * Calcula o maior código existente mais um, preservando a regra atual.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba de funcionários.
   * @return {number} Próximo código disponível.
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

  /** Localiza um funcionário pelo código único. @param {number|string} codigo Código. @return {{codigo:number, nome:string}|null} Registro ou null. */
  function buscarPorCodigo(codigo) {
    var aba = obterAba_(); verificarCabecalhos_(aba);
    var ultimaLinha = aba.getLastRow(); if (ultimaLinha < 2) return null;
    var registros = aba.getRange(2, 1, ultimaLinha - 1, 2).getDisplayValues();
    for (var i = 0; i < registros.length; i++) {
      if (String(registros[i][0]).trim() === String(codigo).trim()) return { codigo: registros[i][0], nome: registros[i][1] };
    }
    return null;
  }

  /** Atualiza o nome mantendo o código. @param {number|string} codigo Código. @param {string} nome Nome validado. @return {boolean} Confirmação. */
  function atualizar(codigo, nome) {
    var aba = obterAba_(); verificarCabecalhos_(aba);
    var ultimaLinha = aba.getLastRow(); if (ultimaLinha < 2) throw new Error("Funcionário não encontrado.");
    var codigos = aba.getRange(2, 1, ultimaLinha - 1, 1).getDisplayValues();
    for (var i = 0; i < codigos.length; i++) {
      if (String(codigos[i][0]).trim() === String(codigo).trim()) { aba.getRange(i + 2, 2).setValue(nome); return true; }
    }
    throw new Error("Funcionário não encontrado.");
  }

  /** Exclui um funcionário pelo código. @param {number|string} codigo Código. @return {boolean} Confirmação. */
  function excluir(codigo) {
    var aba = obterAba_(); verificarCabecalhos_(aba);
    var ultimaLinha = aba.getLastRow(); if (ultimaLinha < 2) throw new Error("Funcionário não encontrado.");
    var codigos = aba.getRange(2, 1, ultimaLinha - 1, 1).getDisplayValues();
    for (var i = 0; i < codigos.length; i++) {
      if (String(codigos[i][0]).trim() === String(codigo).trim()) { aba.deleteRow(i + 2); return true; }
    }
    throw new Error("Funcionário não encontrado.");
  }

  return { salvar: salvar, buscarPorCodigo: buscarPorCodigo, atualizar: atualizar, excluir: excluir };
})();
