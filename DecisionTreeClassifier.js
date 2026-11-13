/**
 * Entidade: AprendizadoMaquina
 * Camada: Algoritmo — Classificador Árvore de Decisão.
 *
 * Responsabilidade:
 * Treinar uma árvore binária para classificar agendamentos históricos,
 * estimar o percentual de faltas observado na folha e avaliar o modelo.
 *
 * Dependências: nenhuma. Compatível com Google Apps Script V8 e Node.js.
 *
 * Observação:
 * O percentual da folha representa a frequência de faltas nos exemplos que
 * chegaram àquela folha. Não é uma probabilidade calibrada.
 */
var DecisionTreeClassifier = (function() {
  var FEATURES_NUMERICAS = ["hora", "diaSemana", "antecedenciaDias"];

  /** Calcula o índice Gini de um conjunto de exemplos. */
  function calcularGini(exemplos) {
    if (!exemplos.length) return 0;
    var positivos = exemplos.filter(function(item) { return Number(item.rotulo) === 1; }).length;
    var proporcao = positivos / exemplos.length;
    return 1 - proporcao * proporcao - (1 - proporcao) * (1 - proporcao);
  }

  /** Calcula o ponto médio entre valores numéricos consecutivos distintos. */
  function gerarLimiares(valores) {
    var ordenados = valores.map(Number).filter(isFinite).sort(function(a, b) { return a - b; })
      .filter(function(valor, indice, lista) { return indice === 0 || valor !== lista[indice - 1]; });
    var limiares = [];
    for (var i = 0; i < ordenados.length - 1; i++) {
      limiares.push((ordenados[i] + ordenados[i + 1]) / 2);
    }
    if (limiares.length > 24) {
      var reduzidos = [];
      for (var j = 1; j <= 24; j++) {
        reduzidos.push(limiares[Math.floor(j * limiares.length / 25)]);
      }
      limiares = reduzidos.filter(function(valor, indice, lista) {
        return indice === 0 || valor !== lista[indice - 1];
      });
    }
    return limiares;
  }

  /** Divide exemplos segundo uma regra binária candidata. */
  function dividir(exemplos, feature, operador, valor) {
    var esquerda = [], direita = [];
    exemplos.forEach(function(item) {
      var dado = item.features[feature];
      var corresponde = operador === "<="
        ? Number(dado) <= valor
        : String(dado) === String(valor);
      (corresponde ? esquerda : direita).push(item);
    });
    return { esquerda: esquerda, direita: direita };
  }

  /** Procura a divisão com maior redução ponderada de impureza Gini. */
  function melhorDivisao(exemplos, features, minLeaf) {
    var giniPai = calcularGini(exemplos);
    var melhor = null;
    features.forEach(function(feature) {
      var valores = exemplos.map(function(item) { return item.features[feature]; });
      var candidatos = FEATURES_NUMERICAS.indexOf(feature) !== -1
        ? gerarLimiares(valores).map(function(valor) { return { operador: "<=", valor: valor }; })
        : valores.map(String).filter(function(valor, indice, lista) {
            return lista.indexOf(valor) === indice;
          }).slice(0, 30).map(function(valor) { return { operador: "==", valor: valor }; });

      candidatos.forEach(function(candidato) {
        var partes = dividir(exemplos, feature, candidato.operador, candidato.valor);
        if (partes.esquerda.length < minLeaf || partes.direita.length < minLeaf) return;
        var impureza = (partes.esquerda.length / exemplos.length) * calcularGini(partes.esquerda) +
          (partes.direita.length / exemplos.length) * calcularGini(partes.direita);
        var ganho = giniPai - impureza;
        if (!melhor || ganho > melhor.ganho) {
          melhor = {
            feature: feature,
            operador: candidato.operador,
            valor: candidato.valor,
            ganho: ganho,
            esquerda: partes.esquerda,
            direita: partes.direita
          };
        }
      });
    });
    return melhor;
  }

  /** Cria uma folha com a frequência histórica da classe FALTOU. */
  function criarFolha(exemplos) {
    var faltas = exemplos.filter(function(item) { return Number(item.rotulo) === 1; }).length;
    return {
      tipo: "FOLHA",
      total: exemplos.length,
      faltas: faltas,
      risco: exemplos.length ? faltas / exemplos.length : 0,
      classe: faltas / Math.max(1, exemplos.length) >= 0.5 ? 1 : 0
    };
  }

  /** Treina recursivamente uma árvore binária com limites contra sobreajuste. */
  function construirNo(exemplos, features, profundidade, config) {
    var folha = criarFolha(exemplos);
    var puros = folha.faltas === 0 || folha.faltas === exemplos.length;
    if (puros || profundidade >= config.profundidadeMaxima ||
        exemplos.length < config.minimoParaDividir * 1 ||
        !features.length) return folha;

    var divisao = melhorDivisao(exemplos, features, config.minimoPorFolha);
    if (!divisao || divisao.ganho <= 0) return folha;

    return {
      tipo: "DECISAO",
      feature: divisao.feature,
      operador: divisao.operador,
      valor: divisao.valor,
      ganho: divisao.ganho,
      total: exemplos.length,
      faltas: folha.faltas,
      esquerda: construirNo(divisao.esquerda, features, profundidade + 1, config),
      direita: construirNo(divisao.direita, features, profundidade + 1, config)
    };
  }

  /**
   * Treina a árvore usando somente as características selecionadas.
   *
   * @param {Object[]} exemplos Exemplos com features e rótulo binário.
   * @param {Object} configuracao Parâmetros do algoritmo.
   * @return {Object} Modelo serializável para persistência em JSON.
   */
  function treinar(exemplos, configuracao) {
    if (!Array.isArray(exemplos) || !exemplos.length) {
      throw new Error("Não há exemplos para treinar a Árvore de Decisão.");
    }
    var config = {
      modelo: "ARVORE_DECISAO",
      features: configuracao.features.slice(),
      profundidadeMaxima: Number(configuracao.profundidadeMaxima || 4),
      minimoParaDividir: Number(configuracao.minimoParaDividir || 6),
      minimoPorFolha: Number(configuracao.minimoPorFolha || 2)
    };
    if (config.profundidadeMaxima < 1 || config.profundidadeMaxima > 10 ||
        config.minimoParaDividir < 2 || config.minimoPorFolha < 1) {
      throw new Error("Parâmetros inválidos para a Árvore de Decisão.");
    }
    return {
      algoritmo: "ARVORE_DECISAO",
      versao: 1,
      configuracao: config,
      amostras: exemplos.length,
      raiz: construirNo(exemplos, config.features, 0, config)
    };
  }

  /**
   * Classifica um agendamento e retorna o caminho de decisões percorrido.
   *
   * @param {Object} modelo Árvore previamente treinada.
   * @param {Object} features Características do agendamento.
   * @return {Object} Escore experimental, classe e regras percorridas.
   */
  function prever(modelo, features) {
    if (!modelo || !modelo.raiz || !modelo.configuracao) {
      throw new Error("Árvore de Decisão não treinada.");
    }
    var no = modelo.raiz;
    var regras = [];
    while (no.tipo === "DECISAO") {
      var dado = features[no.feature];
      var corresponde = no.operador === "<="
        ? Number(dado) <= Number(no.valor)
        : String(dado) === String(no.valor);
      regras.push({
        feature: no.feature,
        operador: no.operador,
        valor: no.valor,
        resultado: corresponde
      });
      no = corresponde ? no.esquerda : no.direita;
    }
    return {
      escore: no.risco,
      riscoPercentual: Math.round(no.risco * 100),
      classe: no.classe === 1 ? "RISCO_ELEVADO" : "RISCO_MENOR",
      quantidadeExemplosFolha: no.total,
      quantidadeFaltasFolha: no.faltas,
      regras: regras
    };
  }

  /** Calcula acurácia, precisão, recall e F1 para o conjunto informado. */
  function avaliar(modelo, exemplos) {
    var vp = 0, fp = 0, vn = 0, fn = 0;
    exemplos.forEach(function(item) {
      var previsto = prever(modelo, item.features).classe === "RISCO_ELEVADO";
      if (previsto && item.rotulo === 1) vp++;
      else if (previsto) fp++;
      else if (item.rotulo === 0) vn++;
      else fn++;
    });
    var precisao = vp + fp ? vp / (vp + fp) : 0;
    var recall = vp + fn ? vp / (vp + fn) : 0;
    return {
      quantidade: exemplos.length,
      verdadeirosPositivos: vp,
      falsosPositivos: fp,
      verdadeirosNegativos: vn,
      falsosNegativos: fn,
      acuracia: exemplos.length ? (vp + vn) / exemplos.length : 0,
      precisao: precisao,
      recall: recall,
      f1: precisao + recall ? 2 * precisao * recall / (precisao + recall) : 0
    };
  }

  return {
    treinar: treinar,
    prever: prever,
    avaliar: avaliar,
    calcularGini: calcularGini
  };
})();
