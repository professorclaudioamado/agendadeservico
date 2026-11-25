/**
 * Entidade: PrevisaoAgendamentos
 * Componente: RedeNeuralMLP — Rede Neural Multicamadas.
 *
 * Responsabilidade:
 * Implementar uma rede neural densa com uma camada oculta tanh e saída linear,
 * treinamento por retropropagação do erro e gradiente descendente estocástico.
 * O componente é independente do Google Apps Script e do Google Sheets.
 *
 * Dependências: Math e JavaScript padrão.
 */
var RedeNeuralMLP = (function() {
  /** Gerador pseudoaleatório determinístico para resultados reproduzíveis. */
  function criarGerador_(semente) {
    var estado = (Number(semente) || 12345) >>> 0;
    return function() {
      estado = (1664525 * estado + 1013904223) >>> 0;
      return estado / 4294967296;
    };
  }

  /** Cria uma matriz com valores pequenos, evitando saturação inicial da tanh. */
  function matriz_(linhas, colunas, aleatorio) {
    var limite = Math.sqrt(6 / (linhas + colunas));
    var resultado = [];
    for (var i = 0; i < linhas; i++) {
      var linha = [];
      for (var j = 0; j < colunas; j++) linha.push((aleatorio() * 2 - 1) * limite);
      resultado.push(linha);
    }
    return resultado;
  }

  /** Calcula a saída e mantém as ativações necessárias à retropropagação. */
  function propagar_(modelo, entrada) {
    var ocultas = [];
    for (var h = 0; h < modelo.pesosEntrada.length; h++) {
      var soma = modelo.viesesOcultos[h];
      for (var i = 0; i < entrada.length; i++) soma += modelo.pesosEntrada[h][i] * entrada[i];
      ocultas.push(Math.tanh(soma));
    }
    var saida = modelo.viesesSaida[0];
    for (var k = 0; k < ocultas.length; k++) saida += modelo.pesosSaida[0][k] * ocultas[k];
    return { ocultas: ocultas, saida: saida };
  }

  /**
   * Treina a rede e conserva os pesos com menor erro de validação.
   *
   * @param {number[][]} entradasTreino Vetores normalizados.
   * @param {number[]} alvosTreino Contagens normalizadas.
   * @param {number[][]} entradasValidacao Vetores de validação.
   * @param {number[]} alvosValidacao Alvos de validação.
   * @param {Object} config Neurônios, épocas, taxa e semente.
   * @return {Object} Modelo treinado e histórico de convergência.
   */
  function treinar(entradasTreino, alvosTreino, entradasValidacao, alvosValidacao, config) {
    if (!entradasTreino || !entradasTreino.length) throw new Error("Não há amostras para treinar a rede neural.");
    var quantidadeEntradas = entradasTreino[0].length;
    var neuronios = Number(config.neuronios);
    var aleatorio = criarGerador_(config.semente || 2026);
    var modelo = {
      entradas: quantidadeEntradas,
      neuronios: neuronios,
      pesosEntrada: matriz_(neuronios, quantidadeEntradas, aleatorio),
      viesesOcultos: Array(neuronios).fill(0),
      pesosSaida: matriz_(1, neuronios, aleatorio),
      viesesSaida: [0]
    };
    var melhorPesos = null;
    var melhorErro = Infinity;
    var melhorEpoca = 0;
    var paciencia = 0;
    var taxa = Number(config.taxaAprendizado);
    var epocas = Number(config.epocas);
    var historico = [];

    for (var epoca = 1; epoca <= epocas; epoca++) {
      // Ordem determinística embaralhada a cada época para reduzir viés temporal.
      var indices = entradasTreino.map(function(_, indice) { return indice; });
      for (var p = indices.length - 1; p > 0; p--) {
        var q = Math.floor(aleatorio() * (p + 1));
        var temporario = indices[p]; indices[p] = indices[q]; indices[q] = temporario;
      }

      indices.forEach(function(indice) {
        var entrada = entradasTreino[indice];
        var alvo = alvosTreino[indice];
        var resultado = propagar_(modelo, entrada);
        var erro = resultado.saida - alvo;
        var gradienteSaida = 2 * erro;

        for (var h = 0; h < neuronios; h++) {
          var pesoSaidaAntigo = modelo.pesosSaida[0][h];
          var gradienteOculto = gradienteSaida * pesoSaidaAntigo * (1 - resultado.ocultas[h] * resultado.ocultas[h]);
          modelo.pesosSaida[0][h] -= taxa * gradienteSaida * resultado.ocultas[h];
          modelo.viesesOcultos[h] -= taxa * gradienteOculto;
          for (var x = 0; x < quantidadeEntradas; x++) {
            modelo.pesosEntrada[h][x] -= taxa * gradienteOculto * entrada[x];
          }
        }
        modelo.viesesSaida[0] -= taxa * gradienteSaida;
      });

      var erroValidacao = calcularErro_(modelo, entradasValidacao, alvosValidacao);
      if (!isFinite(erroValidacao)) throw new Error("A rede neural produziu erro numérico inválido.");
      if (erroValidacao < melhorErro - 0.0000001) {
        melhorErro = erroValidacao;
        melhorEpoca = epoca;
        paciencia = 0;
        melhorPesos = JSON.parse(JSON.stringify(modelo));
      } else {
        paciencia++;
      }
      if (epoca === 1 || epoca % 25 === 0) {
        historico.push({ epoca: epoca, erroValidacao: erroValidacao });
      }
      if (paciencia >= 100) break;
    }

    if (melhorPesos) modelo = melhorPesos;
    modelo.treinamento = {
      epocasExecutadas: Math.min(epocas, epoca),
      melhorEpoca: melhorEpoca,
      erroValidacao: melhorErro,
      historico: historico
    };
    return modelo;
  }

  /** Calcula o erro quadrático médio sem alterar os pesos. */
  function calcularErro_(modelo, entradas, alvos) {
    if (!entradas || !entradas.length) return Infinity;
    var soma = 0;
    for (var i = 0; i < entradas.length; i++) {
      var erro = propagar_(modelo, entradas[i]).saida - alvos[i];
      soma += erro * erro;
    }
    return soma / entradas.length;
  }


  /** Retorna a saída linear da rede para um vetor de entrada. */
  function prever(modelo, entrada) {
    if (!modelo || !Array.isArray(entrada) || entrada.length !== modelo.entradas) {
      throw new Error("Entrada incompatível com a rede neural treinada.");
    }
    return propagar_(modelo, entrada).saida;
  }

  /** Calcula métricas de erro na escala normalizada ou na escala original. */
  function avaliar(modelo, entradas, alvos, escala) {
    var somaAbsoluta = 0, somaQuadrados = 0, somaReal = 0;
    for (var i = 0; i < entradas.length; i++) {
      var previsto = Math.expm1(Math.max(0, prever(modelo, entradas[i])) * escala);
      var real = Math.expm1(Math.max(0, alvos[i]) * escala);
      var erro = previsto - real;
      somaAbsoluta += Math.abs(erro);
      somaQuadrados += erro * erro;
      somaReal += Math.abs(real);
    }
    var quantidade = entradas.length || 1;
    return {
      amostras: entradas.length,
      mae: somaAbsoluta / quantidade,
      rmse: Math.sqrt(somaQuadrados / quantidade),
      wape: somaReal ? somaAbsoluta / somaReal : null
    };
  }

  return { treinar: treinar, prever: prever, avaliar: avaliar };
})();
