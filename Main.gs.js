/**
 * Projeto: Agenda de Serviços
 * Responsabilidade: ponto de entrada do Web App.
 *
 * Objetivo:
 * Manter apenas responsabilidades globais da aplicação. Os casos de uso
 * das entidades ficam nos respectivos arquivos Service, Validator/Rules
 * e Repository, conforme a arquitetura definida no PROJECT_GUIDE.md.
 *
 * Dependências principais:
 * - HtmlService do Google Apps Script.
 */

/**
 * Entrega a interface principal do Web App.
 *
 * @return {GoogleAppsScript.HTML.HtmlOutput} Página principal da aplicação.
 */
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Agenda de Atendimento - Serviços");
}


/**
 * Lista os registros de uma aba para montar as grades da interface.
 * A função aceita somente as abas de cadastro conhecidas pelo sistema.
 *
 * @param {string} nomeAba Nome da aba a consultar.
 * @return {{cabecalhos:string[], linhas:string[][]}} Dados para a tabela.
 */
function listarRegistrosCadastro(nomeAba) {
  var abasPermitidas = [
    "FUNCIONARIOS", "SERVICOS", "CIDADES",
    "BAIRROS", "CLIENTES", "AGENDA"
  ];

  if (abasPermitidas.indexOf(nomeAba) === -1) {
    throw new Error("Cadastro não reconhecido para consulta.");
  }

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error("A aba " + nomeAba + " não foi encontrada na planilha.");
  }

  var ultimaLinha = aba.getLastRow();
  var ultimaColuna = aba.getLastColumn();

  if (ultimaLinha < 1 || ultimaColuna < 1) {
    return { cabecalhos: [], linhas: [] };
  }

  var valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getDisplayValues();
  var cabecalhos = valores[0];
  var linhas = [];

  for (var i = 1; i < valores.length; i++) {
    // Ignora linhas totalmente vazias.
    var linha = valores[i];
    var temDados = linha.some(function(valor) {
      return String(valor).trim() !== "";
    });

    if (temDados) linhas.push(linha);
  }

  return {
    cabecalhos: cabecalhos,
    linhas: linhas
  };
}


/** Consulta um funcionário pelo código. @param {number|string} codigo Código. @return {{codigo:number, nome:string}} Dados do funcionário. */
function consultarFuncionario(codigo) { return FuncionarioService.consultar(codigo); }

/** Atualiza um funcionário. @param {number|string} codigo Código. @param {string} nome Novo nome. @return {string} Confirmação. */
function atualizarFuncionario(codigo, nome) { return FuncionarioService.atualizar(codigo, nome); }

/** Exclui um funcionário. @param {number|string} codigo Código. @return {string} Confirmação. */
function excluirFuncionario(codigo) { return FuncionarioService.excluir(codigo); }
