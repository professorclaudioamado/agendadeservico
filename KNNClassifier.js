/**
 * Entidade: AprendizadoMaquina
 * Camada: Algoritmo — Classificador K-NN.
 *
 * Responsabilidade:
 * Calcular distâncias mistas (Gower simplificada), selecionar os K vizinhos
 * mais próximos e produzir um escore de risco como proporção de faltas.
 *
 * Importante: o escore é uma proporção local dos vizinhos, não uma
 * probabilidade calibrada. A avaliação temporal deve orientar sua utilização.
 * Dependências: nenhuma; compatível com Google Apps Script V8.
 */
var KNNClassifier = (function() {
  /** Calcula a distância entre dois exemplos usando somente as features ativas. */
  function distancia(a, b, configuracao) {
    var soma = 0;
    var pesos = 0;
    configuracao.features.forEach(function(nome) {
      var peso = Number(configuracao.pesos[nome] || 1);
      if (peso <= 0) return;
      var x = a[nome];
      var y = b[nome];
      var d;
      if (nome === "antecedenciaDias") {
        d = Math.min(1, Math.abs(Number(x) - Number(y)) / 90);
      } else if (nome === "hora") {
        var diferenca = Math.abs(Number(x) - Number(y));
        d = Math.min(diferenca, 24 - diferenca) / 12;
      } else if (nome === "diaSemana") {
        var dias = Math.abs(Number(x) - Number(y));
        d = Math.min(dias, 7 - dias) / 3;
      } else {
        d = String(x) === String(y) ? 0 : 1;
      }
      soma += d * peso;
      pesos += peso;
    });
    return pesos ? soma / pesos : 1;
  }

  /** Treina o classificador armazenando os exemplos históricos rotulados. */
  function treinar(exemplos, configuracao) {
    if (!Array.isArray(exemplos) || exemplos.length < Number(configuracao.k)) {
      throw new Error("A quantidade de exemplos é menor que o valor de K.");
    }
    var amostras = exemplos.map(function(item) {
      var copia = {};
      configuracao.features.forEach(function(nome) { copia[nome] = item.features[nome]; });
      copia.rotulo = Number(item.rotulo) === 1 ? 1 : 0;
      return copia;
    });
    return { algoritmo: "KNN", versao: 1, configuracao: configuracao, amostras: amostras };
  }

  /** Retorna escore 0–100 e a classe prevista para um novo agendamento. */
  function prever(modelo, features) {
    if (!modelo || !modelo.amostras || !modelo.configuracao) {
      throw new Error("Modelo K-NN não treinado.");
    }
    var cfg = modelo.configuracao;
    var vizinhos = modelo.amostras.map(function(amostra) {
      return { distancia: distancia(features, amostra, cfg), rotulo: amostra.rotulo };
    }).sort(function(a, b) { return a.distancia - b.distancia; })
      .slice(0, Math.min(Number(cfg.k), modelo.amostras.length));
    var soma = 0;
    var pesoTotal = 0;
    vizinhos.forEach(function(item) {
      var peso = cfg.ponderarDistancia ? 1 / Math.max(item.distancia, 0.000001) : 1;
      soma += item.rotulo * peso;
      pesoTotal += peso;
    });
    var risco = pesoTotal ? soma / pesoTotal : 0;
    return {
      riscoPercentual: Math.round(risco * 100),
      classe: risco >= Number(cfg.limiar || 0.5) ? "RISCO_ELEVADO" : "RISCO_MENOR",
      quantidadeVizinhos: vizinhos.length
    };
  }

  /** Calcula métricas binárias para a avaliação temporal. */
  function avaliar(modelo, exemplos, limiar) {
    var vp = 0, fp = 0, vn = 0, fn = 0;
    exemplos.forEach(function(item) {
      var previsto = prever(modelo, item.features).riscoPercentual / 100 >= limiar;
      if (previsto && item.rotulo === 1) vp++;
      else if (previsto) fp++;
      else if (item.rotulo === 0) vn++;
      else fn++;
    });
    var precisao = vp + fp ? vp / (vp + fp) : 0;
    var recall = vp + fn ? vp / (vp + fn) : 0;
    var f1 = precisao + recall ? 2 * precisao * recall / (precisao + recall) : 0;
    return {
      quantidade: exemplos.length, verdadeirosPositivos: vp, falsosPositivos: fp,
      verdadeirosNegativos: vn, falsosNegativos: fn,
      acuracia: exemplos.length ? (vp + vn) / exemplos.length : 0,
      precisao: precisao, recall: recall, f1: f1
    };
  }

  return { treinar: treinar, prever: prever, avaliar: avaliar, distancia: distancia };
})();
