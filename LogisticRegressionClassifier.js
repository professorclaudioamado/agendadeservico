/**
 * Entidade: AprendizadoMaquina
 * Camada: Algoritmo — Classificador de Regressão Logística.
 *
 * Responsabilidade:
 * Treinar um modelo de classificação binária por regressão logística,
 * preparar atributos numéricos e categóricos, calcular escores pela função
 * sigmoide e produzir explicações matemáticas reproduzíveis.
 *
 * Dependências: nenhuma. Compatível com Google Apps Script V8 e Node.js.
 *
 * Observação estatística:
 * O resultado da sigmoide é um escore do modelo. Não deve ser interpretado
 * como probabilidade calibrada sem avaliação específica de calibração.
 */
var LogisticRegressionClassifier = (function() {
  var FEATURES_PERMITIDAS = [
    "antecedenciaDias", "hora", "diaSemana", "funcionario", "servico", "cliente"
  ];
  var FEATURES_NUMERICAS = ["antecedenciaDias", "hora", "diaSemana"];
  var VERSAO_MODELO = 1;

  /** Calcula a sigmoide com proteção contra overflow numérico. */
  function sigmoide(z) {
    var valor = Number(z);
    if (!isFinite(valor)) throw new Error("O valor z da Regressão Logística deve ser finito.");
    if (valor >= 0) {
      var exponencialNegativa = Math.exp(-valor);
      return 1 / (1 + exponencialNegativa);
    }
    var exponencialPositiva = Math.exp(valor);
    return exponencialPositiva / (1 + exponencialPositiva);
  }

  /** Valida e normaliza os parâmetros recebidos pelo classificador. */
  function normalizarConfiguracao(configuracao) {
    if (!configuracao || !Array.isArray(configuracao.features) || !configuracao.features.length) {
      throw new Error("Selecione ao menos uma característica para a Regressão Logística.");
    }
    var features = configuracao.features.slice();
    if (features.some(function(nome) {
      return FEATURES_PERMITIDAS.indexOf(nome) === -1;
    })) throw new Error("A Regressão Logística recebeu uma característica não permitida.");
    if (features.some(function(nome, indice) { return features.indexOf(nome) !== indice; })) {
      throw new Error("Não repita características na Regressão Logística.");
    }

    var config = {
      modelo: "REGRESSAO_LOGISTICA",
      features: features,
      regularizacao: Number(configuracao.regularizacao == null ? 0.1 : configuracao.regularizacao),
      taxaAprendizado: Number(configuracao.taxaAprendizado == null ? 0.1 : configuracao.taxaAprendizado),
      iteracoesMaximas: Number(configuracao.iteracoesMaximas == null ? 10000 : configuracao.iteracoesMaximas),
      tolerancia: Number(configuracao.tolerancia == null ? 0.0000001 : configuracao.tolerancia),
      limiar: Number(configuracao.limiar == null ? 0.5 : configuracao.limiar)
    };
    if (!isFinite(config.regularizacao) || config.regularizacao < 0 || config.regularizacao > 100) {
      throw new Error("A regularização L2 deve ficar entre 0 e 100.");
    }
    if (!isFinite(config.taxaAprendizado) || config.taxaAprendizado <= 0 || config.taxaAprendizado > 1) {
      throw new Error("A taxa de aprendizado deve ser maior que 0 e no máximo 1.");
    }
    if (!Number.isInteger(config.iteracoesMaximas) || config.iteracoesMaximas < 100 || config.iteracoesMaximas > 50000) {
      throw new Error("O máximo de iterações deve ser um inteiro entre 100 e 50000.");
    }
    if (!isFinite(config.tolerancia) || config.tolerancia <= 0 || config.tolerancia > 0.01) {
      throw new Error("A tolerância deve ser maior que 0 e no máximo 0,01.");
    }
    if (!isFinite(config.limiar) || config.limiar <= 0 || config.limiar >= 1) {
      throw new Error("O limiar deve estar entre 0 e 1.");
    }
    return config;
  }

  /** Monta o esquema de padronização e codificação usando somente o treino. */
  function criarEsquema(exemplos, features) {
    return features.map(function(nome) {
      if (FEATURES_NUMERICAS.indexOf(nome) !== -1) {
        var valores = exemplos.map(function(item) { return Number(item.features[nome]); });
        if (valores.some(function(valor) { return !isFinite(valor); })) {
          throw new Error("A característica numérica '" + nome + "' contém valor inválido.");
        }
        var media = valores.reduce(function(soma, valor) { return soma + valor; }, 0) / valores.length;
        var variancia = valores.reduce(function(soma, valor) {
          return soma + Math.pow(valor - media, 2);
        }, 0) / valores.length;
        var desvio = Math.sqrt(variancia);
        return {
          nome: nome, tipo: "NUMERICA", media: media,
          desvioPadrao: desvio > 0 ? desvio : 1,
          colunas: [nome]
        };
      }

      var categorias = exemplos.map(function(item) {
        var valor = item.features[nome];
        if (valor === null || valor === undefined || String(valor).trim() === "") {
          throw new Error("A característica categórica '" + nome + "' contém valor vazio.");
        }
        return String(valor);
      }).filter(function(valor, indice, lista) {
        return lista.indexOf(valor) === indice;
      }).sort();
      return {
        nome: nome, tipo: "CATEGORICA", categorias: categorias,
        colunas: categorias.map(function(categoria) { return nome + "=" + categoria; })
      };
    });
  }

  /** Expande um registro para a matriz numérica definida pelo esquema do treino. */
  function vetorizar(features, esquema) {
    var vetor = [];
    esquema.forEach(function(atributo) {
      var valor = features[atributo.nome];
      if (valor === null || valor === undefined || String(valor).trim() === "") {
        throw new Error("Informe um valor válido para a característica '" + atributo.nome + "'.");
      }
      if (atributo.tipo === "NUMERICA") {
        var numero = Number(valor);
        if (!isFinite(numero)) throw new Error("A característica '" + atributo.nome + "' deve ser numérica.");
        vetor.push((numero - atributo.media) / atributo.desvioPadrao);
      } else {
        var categoria = String(valor);
        atributo.categorias.forEach(function(item) { vetor.push(item === categoria ? 1 : 0); });
      }
    });
    return vetor;
  }

  /** Calcula a função objetivo: log-loss média com regularização L2. */
  function calcularPerda(matriz, rotulos, coeficientes, intercepto, lambda) {
    var perda = 0;
    matriz.forEach(function(vetor, indice) {
      var z = intercepto;
      for (var j = 0; j < vetor.length; j++) z += vetor[j] * coeficientes[j];
      var p = Math.min(1 - 1e-15, Math.max(1e-15, sigmoide(z)));
      perda += -(rotulos[indice] * Math.log(p) + (1 - rotulos[indice]) * Math.log(1 - p));
    });
    var penalidade = coeficientes.reduce(function(soma, valor) { return soma + valor * valor; }, 0);
    return perda / matriz.length + (lambda * penalidade) / 2;
  }

  /** Calcula gradientes médios do intercepto e dos coeficientes. */
  function calcularGradientes(matriz, rotulos, coeficientes, intercepto, lambda) {
    var gradiente = coeficientes.map(function() { return 0; });
    var gradienteIntercepto = 0;
    matriz.forEach(function(vetor, indice) {
      var z = intercepto;
      for (var j = 0; j < vetor.length; j++) z += vetor[j] * coeficientes[j];
      var erro = sigmoide(z) - rotulos[indice];
      gradienteIntercepto += erro;
      for (var k = 0; k < vetor.length; k++) gradiente[k] += erro * vetor[k];
    });
    gradienteIntercepto /= matriz.length;
    gradiente = gradiente.map(function(valor, indice) {
      return valor / matriz.length + lambda * coeficientes[indice];
    });
    return { intercepto: gradienteIntercepto, coeficientes: gradiente };
  }

  /** Treina por gradiente descendente em lote com busca de passo decrescente. */
  function treinar(exemplos, configuracao) {
    if (!Array.isArray(exemplos) || exemplos.length < 2) {
      throw new Error("São necessários ao menos dois exemplos para treinar a Regressão Logística.");
    }
    var config = normalizarConfiguracao(configuracao);
    var rotulos = exemplos.map(function(item) {
      var rotulo = Number(item && item.rotulo);
      if (rotulo !== 0 && rotulo !== 1) throw new Error("Os rótulos devem ser exclusivamente 0 ou 1.");
      return rotulo;
    });
    if (rotulos.indexOf(0) === -1 || rotulos.indexOf(1) === -1) {
      throw new Error("A Regressão Logística precisa de exemplos das duas classes (0 e 1).");
    }
    exemplos.forEach(function(item) {
      if (!item || !item.features) throw new Error("Cada exemplo deve conter o objeto features.");
    });

    var esquema = criarEsquema(exemplos, config.features);
    var matriz = exemplos.map(function(item) { return vetorizar(item.features, esquema); });
    var quantidadeColunas = matriz[0].length;
    var coeficientes = Array.from({ length: quantidadeColunas }, function() { return 0; });
    var intercepto = 0;
    var perdaAtual = calcularPerda(matriz, rotulos, coeficientes, intercepto, config.regularizacao);
    var taxa = config.taxaAprendizado;
    var convergiu = false;
    var iteracao = 0;
    var normaGradiente = Infinity;

    for (iteracao = 1; iteracao <= config.iteracoesMaximas; iteracao++) {
      var gradientes = calcularGradientes(matriz, rotulos, coeficientes, intercepto, config.regularizacao);
      normaGradiente = Math.sqrt(gradientes.intercepto * gradientes.intercepto +
        gradientes.coeficientes.reduce(function(soma, valor) { return soma + valor * valor; }, 0));
      if (normaGradiente <= config.tolerancia) { convergiu = true; break; }

      var passo = taxa;
      var aceitou = false;
      var novosCoeficientes, novoIntercepto, novaPerda;
      while (passo >= 1e-10) {
        novosCoeficientes = coeficientes.map(function(valor, indice) {
          return valor - passo * gradientes.coeficientes[indice];
        });
        novoIntercepto = intercepto - passo * gradientes.intercepto;
        novaPerda = calcularPerda(matriz, rotulos, novosCoeficientes, novoIntercepto, config.regularizacao);
        if (novaPerda <= perdaAtual + 1e-14) { aceitou = true; break; }
        passo /= 2;
      }
      if (!aceitou) { convergiu = normaGradiente <= config.tolerancia * 10; break; }

      var maiorAlteracao = Math.abs(novoIntercepto - intercepto);
      novosCoeficientes.forEach(function(valor, indice) {
        maiorAlteracao = Math.max(maiorAlteracao, Math.abs(valor - coeficientes[indice]));
      });
      coeficientes = novosCoeficientes;
      intercepto = novoIntercepto;
      perdaAtual = novaPerda;
      taxa = Math.min(config.taxaAprendizado, passo * 1.2);
      if (maiorAlteracao <= config.tolerancia) { convergiu = true; break; }
    }

    var colunas = [];
    esquema.forEach(function(atributo) {
      atributo.colunas.forEach(function(nome) { colunas.push({ atributo: atributo.nome, nome: nome }); });
    });
    return {
      algoritmo: "REGRESSAO_LOGISTICA",
      versao: VERSAO_MODELO,
      configuracao: config,
      esquema: esquema,
      colunas: colunas,
      intercepto: intercepto,
      coeficientes: coeficientes,
      amostras: exemplos.length,
      classes: {
        classe0: rotulos.filter(function(x) { return x === 0; }).length,
        classe1: rotulos.filter(function(x) { return x === 1; }).length
      },
      treinamento: {
        convergiu: convergiu,
        iteracoes: Math.min(iteracao, config.iteracoesMaximas),
        perdaFinal: perdaAtual,
        normaGradiente: normaGradiente,
        regularizacao: config.regularizacao
      }
    };
  }

  /** Calcula o escore e retorna os componentes exatos usados no valor z. */
  function prever(modelo, features, limiarOpcional) {
    if (!modelo || modelo.algoritmo !== "REGRESSAO_LOGISTICA" ||
        !Array.isArray(modelo.coeficientes) || !Array.isArray(modelo.esquema) ||
        !Array.isArray(modelo.colunas) || modelo.coeficientes.length !== modelo.colunas.length) {
      throw new Error("Modelo de Regressão Logística inválido ou não treinado.");
    }
    var vetor = vetorizar(features, modelo.esquema);
    var contribuicoes = [];
    var z = Number(modelo.intercepto);
    modelo.colunas.forEach(function(coluna, indice) {
      var contribuicao = vetor[indice] * Number(modelo.coeficientes[indice]);
      z += contribuicao;
      contribuicoes.push({
        atributo: coluna.atributo,
        coluna: coluna.nome,
        valorPreparado: vetor[indice],
        coeficiente: Number(modelo.coeficientes[indice]),
        contribuicao: contribuicao
      });
    });
    var escore = sigmoide(z);
    var limiar = Number(limiarOpcional == null ? modelo.configuracao.limiar : limiarOpcional);
    if (!isFinite(limiar) || limiar <= 0 || limiar >= 1) throw new Error("Limiar inválido para a previsão.");
    var atributosOriginais = {};
    modelo.configuracao.features.forEach(function(nome) { atributosOriginais[nome] = features[nome]; });
    return {
      algoritmo: "REGRESSAO_LOGISTICA",
      versaoModelo: modelo.versao,
      escore: escore,
      riscoPercentual: Math.round(escore * 100),
      classe: escore >= limiar ? "RISCO_ELEVADO" : "RISCO_MENOR",
      limiar: limiar,
      explicacao: {
        atributos: atributosOriginais,
        intercepto: Number(modelo.intercepto),
        contribuicoes: contribuicoes,
        z: z,
        sigmoide: escore,
        formula: "1 / (1 + exp(-z))"
      }
    };
  }

  /** Calcula matriz de confusão e métricas binárias no conjunto informado. */
  function avaliar(modelo, exemplos, limiar) {
    if (!Array.isArray(exemplos) || !exemplos.length) {
      throw new Error("Informe exemplos para avaliar a Regressão Logística.");
    }
    var vp = 0, fp = 0, vn = 0, fn = 0;
    exemplos.forEach(function(item) {
      var rotulo = Number(item.rotulo);
      if (rotulo !== 0 && rotulo !== 1) throw new Error("Os rótulos de avaliação devem ser 0 ou 1.");
      var corte = Number(limiar == null ? modelo.configuracao.limiar : limiar);
      var previsto = regressaoPreverInterno_(modelo, item.features, corte).escore >= corte;
      if (previsto && rotulo === 1) vp++;
      else if (previsto) fp++;
      else if (rotulo === 0) vn++;
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
      acuracia: (vp + vn) / exemplos.length,
      precisao: precisao,
      recall: recall,
      f1: precisao + recall ? 2 * precisao * recall / (precisao + recall) : 0
    };
  }

  /** Evita duplicar a validação pública ao calcular métricas. */
  function regressaoPreverInterno_(modelo, features, limiar) {
    return prever(modelo, features, limiar);
  }

  return {
    treinar: treinar,
    prever: prever,
    avaliar: avaliar,
    sigmoide: sigmoide,
    normalizarConfiguracao: normalizarConfiguracao
  };
})();
