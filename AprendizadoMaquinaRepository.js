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
    // Mantém o modelo ativo em uma linha fixa e evita acumular linhas vazias.
    aba.getRange(2, 1, 1, 3).setValues([["ATUAL", JSON.stringify(modelo), new Date()]]);
    if (aba.getLastRow() > 2) aba.getRange(3, 1, aba.getLastRow() - 2, 3).clearContent();
    return true;
  }

  /** Recupera o modelo treinado; null significa que ainda não há modelo. */
  function obterModelo() {
    var aba = obterAba_("modelo");
    if (aba.getLastRow() < 2) return null;
    // Busca a chave ATUAL explicitamente, sem depender da última linha usada.
    var linhas = aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues();
    for (var i = linhas.length - 1; i >= 0; i--) {
      if (String(linhas[i][0] || "").trim() !== "ATUAL" || !linhas[i][1]) continue;
      try { return JSON.parse(linhas[i][1]); } catch (erro) {
        throw new Error("O modelo salvo está inválido. Execute um novo treinamento.");
      }
    }
    return null;
  }

  /** Lista os experimentos mais recentes para comparação na tela administrativa. */
  function listarExperimentos(limite) {
    var aba = obterAba_("experimentos");
    if (aba.getLastRow() < 2) return [];
    var inicio = Math.max(2, aba.getLastRow() - (limite || 20) + 1);
    return aba.getRange(inicio, 1, aba.getLastRow() - inicio + 1, 14).getValues()
      .reverse().map(function(r) {
        // getValues() preserva números reais; getDisplayValues() pode retornar
        // percentuais localizados (por exemplo, "72,7%"), que Number() não converte.
        var dataExecucao = r[1] instanceof Date
          ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
          : String(r[1] || "");

        return {
          id: r[0],
          data: dataExecucao,
          modelo: r[2],
          amostras: Number(r[4] || 0),
          treino: Number(r[5] || 0),
          validacao: Number(r[6] || 0),
          teste: Number(r[7] || 0),
          acuracia: Number(r[8] || 0),
          precisao: Number(r[9] || 0),
          recall: Number(r[10] || 0),
          f1: Number(r[11] || 0),
          baseline: Number(r[12] || 0),
          observacoes: r[13] || ""
        };
      });
  }

  return {
    obterConfiguracao: obterConfiguracao, salvarConfiguracao: salvarConfiguracao,
    salvarExperimento: salvarExperimento, salvarModelo: salvarModelo,
    obterModelo: obterModelo, listarExperimentos: listarExperimentos
  };
})();
