/**
 * Entidade: AprendizadoMaquina
 * Camada: Service — Camada de Serviço.
 *
 * Responsabilidade: coordenar configuração, preparação dos dados,
 * avaliação temporal, persistência dos experimentos e previsão de risco.
 *
 * Dependências: AprendizadoMaquinaValidator, AprendizadoMaquinaRules,
 * AprendizadoMaquinaRepository, AgendamentoRepository e KNNClassifier.
 */
var AprendizadoMaquinaService = (function() {
  var CONFIG_PADRAO = {
    modelo: "KNN", k: 7, limiar: 0.5, ponderarDistancia: false,
    features: ["antecedenciaDias", "hora", "diaSemana", "funcionario", "servico"],
    pesos: { antecedenciaDias: 1, hora: 1, diaSemana: 1, funcionario: 1, servico: 1, cliente: 1 }
  };

  /** Retorna uma cópia da configuração ativa ou os padrões iniciais. */
  function obterConfiguracao() {
    return AprendizadoMaquinaRepository.obterConfiguracao() || JSON.parse(JSON.stringify(CONFIG_PADRAO));
  }

  /** Valida e persiste os parâmetros informados na tela. */
  function salvarConfiguracao(config) {
    AprendizadoMaquinaValidator.validarConfiguracao(config);
    var normalizada = {
      modelo: "KNN", k: Number(config.k), limiar: Number(config.limiar),
      ponderarDistancia: Boolean(config.ponderarDistancia),
      features: config.features.slice(),
      pesos: config.pesos || CONFIG_PADRAO.pesos
    };
    AprendizadoMaquinaRepository.salvarConfiguracao(normalizada);
    return { sucesso: true, mensagem: "Configuração salva com sucesso.", configuracao: normalizada };
  }

  /**
   * Treina com os 60% mais antigos, valida nos 20% seguintes e mede o teste
   * nos 20% mais recentes. O conjunto de teste não participa do treinamento.
   */
  function treinarAvaliar() {
    var config = obterConfiguracao();
    AprendizadoMaquinaValidator.validarConfiguracao(config);
    var registros = AgendamentoRepository.listarDadosAprendizado();
    var preparado = AprendizadoMaquinaRules.prepararExemplos(registros, config);
    var partes = AprendizadoMaquinaRules.dividirTemporal(preparado.exemplos);
    if (partes.treino.length < config.k) throw new Error("Reduza K: há menos exemplos de treino que vizinhos solicitados.");

    var treino = partes.treino.map(paraClassificador_);
    var validacao = partes.validacao.map(paraClassificador_);
    var teste = partes.teste.map(paraClassificador_);
    var modeloCompleto = KNNClassifier.treinar(treino.concat(validacao), config);
    var metricas = KNNClassifier.avaliar(modeloCompleto, teste, config.limiar);
    var positivosTreino = treino.filter(function(x) { return x.rotulo === 1; }).length;
    var classeBaseline = positivosTreino >= treino.length - positivosTreino ? 1 : 0;
    var acertosBaseline = teste.filter(function(x) { return x.rotulo === classeBaseline; }).length;
    var baseline = teste.length ? acertosBaseline / teste.length : 0;
    var aprovado = metricas.quantidade >= 20 && metricas.f1 >= 0.5 &&
      metricas.recall >= 0.5 && metricas.precisao >= 0.5 &&
      metricas.acuracia > baseline;
    modeloCompleto.metricas = metricas;
    modeloCompleto.baseline = baseline;
    modeloCompleto.aprovado = aprovado;
    modeloCompleto.treinadoEm = new Date().toISOString();
    var modelo = modeloCompleto;
    var observacoes = "Excluídos: " + JSON.stringify(preparado.excluidos) +
      ". Escore de vizinhos não é probabilidade calibrada.";
    var experimento = {
      configuracao: config, amostras: preparado.exemplos.length,
      treino: treino.length, validacao: validacao.length, teste: teste.length,
      metricas: metricas, baseline: baseline, observacoes: observacoes
    };
    var id = AprendizadoMaquinaRepository.salvarExperimento(experimento);
    AprendizadoMaquinaRepository.salvarModelo(modelo);
    return {
      sucesso: true, experimentoId: id, metricas: metricas, baseline: baseline,
      aprovado: aprovado, amostras: preparado.exemplos.length,
      excluidos: preparado.excluidos,
      mensagem: aprovado
        ? "Modelo avaliado e liberado para exibir escores experimentais."
        : "Modelo treinado, mas não atingiu os critérios mínimos para exibição na Agenda."
    };
  }

  /** Converte a estrutura preparada para o contrato do classificador. */
  function paraClassificador_(item) {
    return { features: item.features, rotulo: item.rotulo };
  }

  /**
   * Calcula os escores dos agendamentos futuros. Registros passados e estados
   * finais não recebem previsão. O resultado é um mapa indexado pelo código.
   */
  function preverAgendamentos(registros) {
    var modelo = AprendizadoMaquinaRepository.obterModelo();
    if (!modelo || !modelo.aprovado) return {};
    var config = modelo.configuracao;
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var mapa = {};
    registros.forEach(function(r) {
      var status = String(r.status || "").toUpperCase();
      if (status !== "AGENDADO" && status !== "CONFIRMADO") return;
      var data = AprendizadoMaquinaRules.converterData(r.data);
      var hora = AprendizadoMaquinaRules.converterHora(r.hora);
      if (!data || data.getTime() < hoje.getTime() || hora === null) return;
      var cadastro = AprendizadoMaquinaRules.converterData(r.dataCadastro);
      var features = {
        antecedenciaDias: cadastro ? Math.max(0, Math.round((data.getTime() - cadastro.getTime()) / 86400000)) : null,
        hora: hora, diaSemana: data.getDay(),
        funcionario: String(r.codigoFuncionario || ""),
        servico: String(r.codigoServico || ""),
        cliente: String(r.codigoCliente || "")
      };
      if (config.features.some(function(f) { return features[f] === null || features[f] === ""; })) return;
      mapa[String(r.codigo)] = KNNClassifier.prever(modelo, features);
    });
    return mapa;
  }

  /** Retorna dados para a tela de configuração e comparação. */
  function obterPainel() {
    var modelo = AprendizadoMaquinaRepository.obterModelo();
    return {
      configuracao: obterConfiguracao(),
      modelo: modelo ? { treinadoEm: modelo.treinadoEm, aprovado: modelo.aprovado, metricas: modelo.metricas, baseline: modelo.baseline } : null,
      experimentos: AprendizadoMaquinaRepository.listarExperimentos(20)
    };
  }

  return {
    obterConfiguracao: obterConfiguracao, salvarConfiguracao: salvarConfiguracao,
    treinarAvaliar: treinarAvaliar, preverAgendamentos: preverAgendamentos,
    obterPainel: obterPainel
  };
})();

/** Pontos de entrada da tela administrativa de aprendizado de máquina. */
function obterPainelAprendizadoMaquina() { return AprendizadoMaquinaService.obterPainel(); }
function salvarConfiguracaoAprendizadoMaquina(config) { return AprendizadoMaquinaService.salvarConfiguracao(config); }
function treinarAvaliarAprendizadoMaquina() { return AprendizadoMaquinaService.treinarAvaliar(); }
function preverAgendamentosAgenda() {
  return AprendizadoMaquinaService.preverAgendamentos(AgendamentoRepository.listarDadosAprendizado());
}
