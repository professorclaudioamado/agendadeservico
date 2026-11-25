/**
 * Entidade: PrevisaoAgendamentos
 * Camada: Repository — Repositório.
 *
 * Responsabilidade:
 * Concentrar o acesso às abas AGENDA, PREVISAO_CONFIGURACOES,
 * PREVISAO_MODELO e PREVISAO_EXPERIMENTOS do Google Sheets.
 *
 * Dependências: SpreadsheetApp, Utilities e Session do Apps Script.
 */
var PrevisaoAgendamentosRepository = (function() {
  var CABECALHOS = {
    configuracoes: ["Chave", "JSON", "Atualizado_em"],
    modelo: ["Chave", "JSON", "Atualizado_em"],
    experimentos: ["ID", "Data_execucao", "Janela", "Neuronios", "Epocas",
      "Amostras", "MAE", "RMSE", "WAPE", "Previsao_10_dias", "Observacoes"]
  };

  /** Obtém ou cria uma aba técnica e confere seus cabeçalhos. */
  function obterAba_(tipo) {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var nome = tipo === "configuracoes" ? "PREVISAO_CONFIGURACOES" :
      tipo === "modelo" ? "PREVISAO_MODELO" : "PREVISAO_EXPERIMENTOS";
    var cabecalhos = CABECALHOS[tipo];
    var aba = planilha.getSheetByName(nome);
    if (!aba) {
      aba = planilha.insertSheet(nome);
      aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
      aba.setFrozenRows(1);
    } else if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
      aba.setFrozenRows(1);
    }
    var atuais = aba.getRange(1, 1, 1, cabecalhos.length).getDisplayValues()[0];
    cabecalhos.forEach(function(titulo, indice) {
      if (String(atuais[indice] || "").trim() !== titulo) {
        throw new Error("Confira os cabeçalhos da aba " + nome + ".");
      }
    });
    return aba;
  }

  /**
   * Lê os registros da Agenda usando o nome do cabeçalho Data_cadastro,
   * sem assumir que a coluna permaneça sempre na posição I.
   *
   * @return {Object[]} Registros com código e data de cadastro.
   */
  function listarDatasCadastro() {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName("AGENDA");
    if (!aba || aba.getLastRow() < 2) return [];
    var ultimaColuna = aba.getLastColumn();
    var valores = aba.getRange(1, 1, aba.getLastRow(), ultimaColuna).getValues();
    var cabecalhos = valores[0].map(function(item) { return String(item || "").trim().toLowerCase(); });
    var indiceData = cabecalhos.indexOf("data_cadastro");
    var indiceCodigo = cabecalhos.indexOf("código");
    if (indiceCodigo < 0) indiceCodigo = cabecalhos.indexOf("codigo");
    if (indiceData < 0) throw new Error("A coluna Data_cadastro não foi encontrada na aba AGENDA.");
    return valores.slice(1).filter(function(linha) {
      return indiceCodigo < 0 || String(linha[indiceCodigo] || "").trim() !== "";
    }).map(function(linha) {
      return { codigo: indiceCodigo < 0 ? "" : linha[indiceCodigo], dataCadastro: linha[indiceData] };
    });
  }

  /** Recupera a configuração salva ou null quando ainda não foi configurada. */
  function obterConfiguracao() {
    var aba = obterAba_("configuracoes");
    if (aba.getLastRow() < 2) return null;
    try {
      var valor = aba.getRange(2, 2).getValue();
      return valor ? JSON.parse(valor) : null;
    } catch (erro) {
      throw new Error("A configuração da previsão de demanda está inválida.");
    }
  }

  /** Persiste a configuração vigente em uma linha fixa. */
  function salvarConfiguracao(config) {
    var aba = obterAba_("configuracoes");
    aba.getRange(2, 1, 1, 3).setValues([["ATIVA", JSON.stringify(config), new Date()]]);
    return true;
  }

  /** Recupera o último modelo treinado ou null. */
  function obterModelo() {
    var aba = obterAba_("modelo");
    if (aba.getLastRow() < 2) return null;
    try {
      var valor = aba.getRange(2, 2).getValue();
      return valor ? JSON.parse(valor) : null;
    } catch (erro) {
      throw new Error("O modelo de previsão salvo está inválido. Execute um novo treinamento.");
    }
  }

  /** Substitui o modelo ativo, preservando apenas a versão operacional atual. */
  function salvarModelo(modelo) {
    var aba = obterAba_("modelo");
    aba.getRange(2, 1, 1, 3).setValues([["ATUAL", JSON.stringify(modelo), new Date()]]);
    return true;
  }

  /** Registra um experimento sem apagar as avaliações anteriores. */
  function salvarExperimento(modelo, observacoes) {
    var aba = obterAba_("experimentos");
    var id = "DEMANDA-" + Utilities.getUuid();
    var metricas = modelo.metricas;
    aba.appendRow([
      id, new Date(), modelo.configuracao.janelaDias, modelo.configuracao.neuronios,
      modelo.configuracao.epocas, modelo.amostras, metricas.mae, metricas.rmse,
      metricas.wape == null ? "" : metricas.wape,
      JSON.stringify(modelo.previsao), observacoes || ""
    ]);
    return id;
  }

  /** Lista os experimentos mais recentes em ordem decrescente. */
  function listarExperimentos(limite) {
    var aba = obterAba_("experimentos");
    if (aba.getLastRow() < 2) return [];
    var quantidade = Math.max(1, Number(limite) || 10);
    var inicio = Math.max(2, aba.getLastRow() - quantidade + 1);
    return aba.getRange(inicio, 1, aba.getLastRow() - inicio + 1, CABECALHOS.experimentos.length)
      .getValues().reverse().map(function(linha) {
        var data = linha[1] instanceof Date
          ? Utilities.formatDate(linha[1], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
          : String(linha[1] || "");
        return {
          id: linha[0], data: data, janelaDias: Number(linha[2]),
          neuronios: Number(linha[3]), epocas: Number(linha[4]),
          amostras: Number(linha[5]), mae: Number(linha[6]),
          rmse: Number(linha[7]), wape: linha[8] === "" ? null : Number(linha[8]),
          observacoes: linha[10] || ""
        };
      });
  }

  return {
    listarDatasCadastro: listarDatasCadastro,
    obterConfiguracao: obterConfiguracao,
    salvarConfiguracao: salvarConfiguracao,
    obterModelo: obterModelo,
    salvarModelo: salvarModelo,
    salvarExperimento: salvarExperimento,
    listarExperimentos: listarExperimentos
  };
})();
