/**
 * Entidade: AprendizadoMaquina
 * Camada: Repository — Repositório.
 *
 * Responsabilidade: concentrar a leitura e gravação das abas
 * ML_CONFIGURACOES, ML_EXPERIMENTOS e ML_MODELO.
 * Dependências: SpreadsheetApp (Google Apps Script).
 */
var AprendizadoMaquinaRepository = (function() {
  var ABAS = {
    configuracoes: { nome: "ML_CONFIGURACOES", cabecalhos: ["Chave", "Valor", "Atualizado_em"] },
    experimentos: { nome: "ML_EXPERIMENTOS", cabecalhos: ["ID", "Data_execucao", "Modelo", "Configuracao", "Amostras", "Treino", "Validacao", "Teste", "Acuracia", "Precisao", "Recall", "F1", "Baseline", "Observacoes"] },
    modelo: { nome: "ML_MODELO", cabecalhos: ["Chave", "JSON", "Atualizado_em"] }
  };

  /** Obtém ou cria a aba técnica e garante seus cabeçalhos. */
  function obterAba_(tipo) {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var definicao = ABAS[tipo];
    var aba = planilha.getSheetByName(definicao.nome);
    if (!aba) {
      aba = planilha.insertSheet(definicao.nome);
      aba.getRange(1, 1, 1, definicao.cabecalhos.length).setValues([definicao.cabecalhos]);
      aba.setFrozenRows(1);
    } else if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, definicao.cabecalhos.length).setValues([definicao.cabecalhos]);
    }
    var atuais = aba.getRange(1, 1, 1, definicao.cabecalhos.length).getDisplayValues()[0];
    definicao.cabecalhos.forEach(function(titulo, i) {
      if (String(atuais[i] || "").trim() !== titulo) {
        throw new Error("Confira os cabeçalhos da aba " + definicao.nome + ".");
      }
    });
    return aba;
  }

  /** Recupera a configuração ativa; retorna null se ainda não existir. */
  function obterConfiguracao() {
    var aba = obterAba_("configuracoes");
    if (aba.getLastRow() < 2) return null;
    var linhas = aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues();
    for (var i = linhas.length - 1; i >= 0; i--) {
      if (linhas[i][0] === "ATIVA") {
        try { return JSON.parse(linhas[i][1]); } catch (erro) {
          throw new Error("A configuração salva está inválida.");
        }
      }
    }
    return null;
  }

  /** Persiste uma configuração em JSON, mantendo o histórico simples de versões. */
  function salvarConfiguracao(config) {
    var aba = obterAba_("configuracoes");
    aba.appendRow(["ATIVA", JSON.stringify(config), new Date()]);
    return true;
  }

  /** Registra os resultados de um experimento, sem sobrescrever avaliações anteriores. */
  function salvarExperimento(item) {
    var aba = obterAba_("experimentos");
    var id = "EXP-" + Utilities.getUuid();
    aba.appendRow([
      id, new Date(), "KNN", JSON.stringify(item.configuracao),
      item.amostras, item.treino, item.validacao, item.teste,
      item.metricas.acuracia, item.metricas.precisao, item.metricas.recall,
      item.metricas.f1, item.baseline, item.observacoes || ""
    ]);
    return id;
  }

  /** Salva o modelo treinado em uma única linha identificada pela chave ATUAL. */
  function salvarModelo(modelo) {
    var aba = obterAba_("modelo");
    if (aba.getLastRow() >= 2) aba.getRange(2, 1, aba.getLastRow() - 1, 3).clearContent();
    aba.appendRow(["ATUAL", JSON.stringify(modelo), new Date()]);
    return true;
  }

  /** Recupera o modelo treinado; null significa que ainda não há modelo. */
  function obterModelo() {
    var aba = obterAba_("modelo");
    if (aba.getLastRow() < 2) return null;
    var json = aba.getRange(aba.getLastRow(), 2).getValue();
    if (!json) return null;
    try { return JSON.parse(json); } catch (erro) {
      throw new Error("O modelo salvo está inválido. Execute um novo treinamento.");
    }
  }

  /** Lista os experimentos mais recentes para comparação na tela administrativa. */
  function listarExperimentos(limite) {
    var aba = obterAba_("experimentos");
    if (aba.getLastRow() < 2) return [];
    var inicio = Math.max(2, aba.getLastRow() - (limite || 20) + 1);
    return aba.getRange(inicio, 1, aba.getLastRow() - inicio + 1, 14).getDisplayValues()
      .reverse().map(function(r) {
        return { id:r[0], data:r[1], modelo:r[2], amostras:r[4], treino:r[5],
          validacao:r[6], teste:r[7], acuracia:Number(r[8]), precisao:Number(r[9]),
          recall:Number(r[10]), f1:Number(r[11]), baseline:Number(r[12]), observacoes:r[13] };
      });
  }

  return {
    obterConfiguracao: obterConfiguracao, salvarConfiguracao: salvarConfiguracao,
    salvarExperimento: salvarExperimento, salvarModelo: salvarModelo,
    obterModelo: obterModelo, listarExperimentos: listarExperimentos
  };
})();
