/**
 * Entidade: PrevisaoAgendamentos
 * Camada: Service — Camada de Serviço.
 *
 * Responsabilidade:
 * Coordenar a leitura do histórico, preparação da série diária, treinamento
 * da MLP, avaliação temporal e previsão recursiva dos próximos dez dias.
 *
 * Dependências:
 * PrevisaoAgendamentosValidator, PrevisaoAgendamentosRules,
 * PrevisaoAgendamentosRepository e RedeNeuralMLP.
 */
var PrevisaoAgendamentosService = (function() {
  var CONFIG_PADRAO = {
    janelaDias: 7,
    neuronios: 12,
    epocas: 700,
    taxaAprendizado: 0.015,
    semente: 2026
  };
  var HORIZONTE = 10;
  var MINIMO_DIAS = 35;

  /** Retorna uma cópia da configuração padrão ou da configuração persistida. */
  function obterConfiguracao() {
    var salva = PrevisaoAgendamentosRepository.obterConfiguracao();
    return salva || JSON.parse(JSON.stringify(CONFIG_PADRAO));
  }

  /** Valida e persiste os parâmetros recebidos da interface. */
  function salvarConfiguracao(config) {
    var normalizada = {
      janelaDias: Number(config.janelaDias),
      neuronios: Number(config.neuronios),
      epocas: Number(config.epocas),
      taxaAprendizado: Number(config.taxaAprendizado),
      semente: 2026
    };
    PrevisaoAgendamentosValidator.validarConfiguracao(normalizada);
    PrevisaoAgendamentosRepository.salvarConfiguracao(normalizada);
    return { sucesso: true, mensagem: "Parâmetros da rede neural salvos.", configuracao: normalizada };
  }

  /**
   * Treina, avalia em dados cronologicamente posteriores e gera dez previsões.
   * O conjunto de teste não participa do ajuste dos pesos.
   *
   * @param {Object=} parametros Configuração opcional enviada pela interface.
   * @return {Object} Métricas, previsão, amostras e informações do treinamento.
   */
  function treinar(parametros) {
    var config = parametros ? parametros : obterConfiguracao();
    config = {
      janelaDias: Number(config.janelaDias),
      neuronios: Number(config.neuronios),
      epocas: Number(config.epocas),
      taxaAprendizado: Number(config.taxaAprendizado),
      semente: 2026
    };
    PrevisaoAgendamentosValidator.validarConfiguracao(config);

    var registros = PrevisaoAgendamentosRepository.listarDatasCadastro();
    var serie = PrevisaoAgendamentosRules.gerarSerieDiaria(registros);
    if (serie.length < MINIMO_DIAS) {
      throw new Error("Histórico insuficiente: são necessários pelo menos " + MINIMO_DIAS +
        " dias corridos com Data_cadastro válida. Foram encontrados " + serie.length + ".");
    }

    var total = serie.length - config.janelaDias;
    var fimTreino = Math.floor(total * 0.70);
    // A escala é calculada somente com a parte disponível até o fim do treino.
    // Assim, valores do período de teste não influenciam a normalização.
    var preparados = PrevisaoAgendamentosRules.criarJanelas(
      serie, config.janelaDias, config.janelaDias + fimTreino
    );
    var amostras = preparados.amostras;
    var fimValidacao = Math.floor(total * 0.85);
    if (fimTreino < 10 || fimValidacao - fimTreino < 3 || total - fimValidacao < 3) {
      throw new Error("Não há amostras suficientes para separar treino, validação e teste cronologicamente.");
    }

    var treino = amostras.slice(0, fimTreino);
    var validacao = amostras.slice(fimTreino, fimValidacao);
    var teste = amostras.slice(fimValidacao);
    var modelo = RedeNeuralMLP.treinar(
      treino.map(function(item) { return item.entrada; }),
      treino.map(function(item) { return item.alvo; }),
      validacao.map(function(item) { return item.entrada; }),
      validacao.map(function(item) { return item.alvo; }),
      config
    );

    var metricas = RedeNeuralMLP.avaliar(
      modelo,
      teste.map(function(item) { return item.entrada; }),
      teste.map(function(item) { return item.alvo; }),
      preparados.escala
    );
    var previsao = preverDezDias_(modelo, serie, config, preparados.escala);
    var resultado = {
      algoritmo: "MLP",
      configuracao: config,
      treinadoEm: new Date().toISOString(),
      amostras: total,
      divisao: { treino: treino.length, validacao: validacao.length, teste: teste.length },
      diasHistoricos: serie.length,
      ultimaDataHistorica: serie[serie.length - 1].chave,
      metricas: metricas,
      treinamento: modelo.treinamento,
      modelo: modelo,
      escala: preparados.escala,
      previsao: previsao
    };

    PrevisaoAgendamentosRepository.salvarModelo(resultado);
    var experimentoId = PrevisaoAgendamentosRepository.salvarExperimento(
      resultado,
      "Avaliação temporal 70/15/15; previsão recursiva de dez dias."
    );
    PrevisaoAgendamentosRepository.salvarConfiguracao(config);

    return {
      sucesso: true,
      experimentoId: experimentoId,
      algoritmo: resultado.algoritmo,
      treinadoEm: resultado.treinadoEm,
      amostras: resultado.amostras,
      divisao: resultado.divisao,
      metricas: resultado.metricas,
      treinamento: resultado.treinamento,
      previsao: resultado.previsao,
      mensagem: "Rede neural treinada e avaliada. Confira as métricas antes de utilizar a previsão."
    };
  }

  /** Projeta os próximos dez dias alimentando cada estimativa no dia seguinte. */
  function preverDezDias_(modelo, serie, config, escala) {
    var janela = serie.slice(-config.janelaDias).map(function(item) {
      return Math.log1p(Math.max(0, item.quantidade)) / escala;
    });
    var ultima = serie[serie.length - 1].data;
    var previsoes = [];
    for (var i = 1; i <= HORIZONTE; i++) {
      var saida = RedeNeuralMLP.prever(modelo, janela);
      var normalizada = Math.max(0, saida);
      var quantidade = PrevisaoAgendamentosRules.desnormalizarQuantidade(normalizada, escala);
      var data = new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() + i, 12);
      previsoes.push({
        data: PrevisaoAgendamentosRules.chaveData(data),
        quantidade: quantidade
      });
      janela.shift();
      janela.push(normalizada);
    }
    return previsoes;
  }

  /** Monta o painel sem treinar automaticamente nem criar dados artificiais. */
  function obterPainel() {
    var registros = PrevisaoAgendamentosRepository.listarDatasCadastro();
    var serie = PrevisaoAgendamentosRules.gerarSerieDiaria(registros);
    var modelo = PrevisaoAgendamentosRepository.obterModelo();
    var total = serie.reduce(function(soma, item) { return soma + item.quantidade; }, 0);
    var diasComMovimento = serie.filter(function(item) { return item.quantidade > 0; }).length;
    return {
      configuracao: obterConfiguracao(),
      indicadores: {
        totalHistorico: total,
        mediaDiaria: serie.length ? total / serie.length : 0,
        diasHistoricos: serie.length,
        diasComMovimento: diasComMovimento
      },
      historico: serie.slice(-60).map(function(item) {
        return { data: item.chave, quantidade: item.quantidade };
      }),
      modelo: modelo ? {
        algoritmo: modelo.algoritmo,
        treinadoEm: modelo.treinadoEm,
        amostras: modelo.amostras,
        divisao: modelo.divisao,
        metricas: modelo.metricas,
        treinamento: modelo.treinamento,
        previsao: modelo.previsao,
        ultimaDataHistorica: modelo.ultimaDataHistorica
      } : null,
      experimentos: PrevisaoAgendamentosRepository.listarExperimentos(10),
      minimoDias: MINIMO_DIAS
    };
  }

  return {
    obterConfiguracao: obterConfiguracao,
    salvarConfiguracao: salvarConfiguracao,
    treinar: treinar,
    obterPainel: obterPainel
  };
})();

/** Ponto de entrada chamado pela interface do Web App. */
function obterPainelPrevisaoAgendamentos() {
  return PrevisaoAgendamentosService.obterPainel();
}

/** Salva os parâmetros da rede neural enviados pela interface. */
function salvarConfiguracaoPrevisaoAgendamentos(config) {
  return PrevisaoAgendamentosService.salvarConfiguracao(config);
}

/** Executa treinamento, avaliação temporal e previsão de dez dias. */
function treinarPrevisaoAgendamentos(config) {
  return PrevisaoAgendamentosService.treinar(config);
}
