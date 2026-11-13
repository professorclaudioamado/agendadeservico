/**
 * Entidade: AprendizadoMaquina
 * Camada: Service — Camada de Serviço.
 *
 * Responsabilidade:
 * Coordenar configuração, preparação dos dados, treinamento, avaliação,
 * persistência e previsão com K-NN e Árvore de Decisão.
 *
 * Dependências:
 * AprendizadoMaquinaValidator, AprendizadoMaquinaRules,
 * AprendizadoMaquinaRepository, AgendamentoRepository,
 * KNNClassifier e DecisionTreeClassifier.
 */
var AprendizadoMaquinaService = (function() {
  var CONFIG_PADRAO = {
    KNN: {
      modelo: "KNN", k: 3, limiar: 0.5, ponderarDistancia: false,
      features: ["hora", "diaSemana", "funcionario", "servico"],
      pesos: { antecedenciaDias: 1, hora: 1, diaSemana: 1, funcionario: 1, servico: 1, cliente: 1 }
    },
    ARVORE_DECISAO: {
      modelo: "ARVORE_DECISAO", profundidadeMaxima: 4,
      minimoParaDividir: 6, minimoPorFolha: 2,
      features: ["hora", "diaSemana", "funcionario", "servico"]
    }
  };

  /** Retorna uma cópia da configuração do algoritmo solicitado. */
  function obterConfiguracao(modelo) {
    var algoritmo = String(modelo || "KNN").toUpperCase();
    if (!CONFIG_PADRAO[algoritmo]) throw new Error("Algoritmo não reconhecido.");
    var salva = AprendizadoMaquinaRepository.obterConfiguracao(algoritmo);
    return salva || JSON.parse(JSON.stringify(CONFIG_PADRAO[algoritmo]));
  }

  /** Valida e persiste a configuração sem afetar o outro algoritmo. */
  function salvarConfiguracao(config) {
    var algoritmo = String(config && config.modelo || "KNN").toUpperCase();
    config.modelo = algoritmo;
    AprendizadoMaquinaValidator.validarConfiguracao(config);
    var normalizada = algoritmo === "KNN" ? {
      modelo: "KNN", k: Number(config.k), limiar: Number(config.limiar),
      ponderarDistancia: Boolean(config.ponderarDistancia),
      features: config.features.slice(),
      pesos: config.pesos || CONFIG_PADRAO.KNN.pesos
    } : {
      modelo: "ARVORE_DECISAO",
      profundidadeMaxima: Number(config.profundidadeMaxima),
      minimoParaDividir: Number(config.minimoParaDividir),
      minimoPorFolha: Number(config.minimoPorFolha),
      features: config.features.slice()
    };
    AprendizadoMaquinaRepository.salvarConfiguracao(normalizada);
    return {
      sucesso: true,
      mensagem: "Configuração de " + nomeAlgoritmo_(algoritmo) + " salva com sucesso.",
      configuracao: normalizada
    };
  }

  /** Treina e avalia o algoritmo selecionado com divisão temporal 60/20/20. */
  function treinarAvaliar() {
    var config = obterConfiguracao();
    return treinarAlgoritmo_(config.modelo, config);
  }

  /**
   * Treina e avalia explicitamente o algoritmo solicitado.
   *
   * @param {string} algoritmo Identificador KNN ou ARVORE_DECISAO.
   * @return {Object} Métricas, critérios, configuração selecionada e experimento.
   */
  function treinarAvaliarAlgoritmo(algoritmo) {
    var config = obterConfiguracao(algoritmo);
    return treinarAlgoritmo_(algoritmo, config);
  }

  /** Coordena treinamento comum, mantendo os ajustes específicos de cada classificador. */
  function treinarAlgoritmo_(algoritmo, config) {
    algoritmo = String(algoritmo || config.modelo || "KNN").toUpperCase();
    config.modelo = algoritmo;
    AprendizadoMaquinaValidator.validarConfiguracao(config);
    var registros = AgendamentoRepository.listarDadosAprendizado();
    var preparado = AprendizadoMaquinaRules.prepararExemplos(registros, config);
    var partes = AprendizadoMaquinaRules.dividirTemporal(preparado.exemplos);
    var treino = partes.treino.map(paraClassificador_);
    var validacao = partes.validacao.map(paraClassificador_);
    var teste = partes.teste.map(paraClassificador_);
    var ajuste = algoritmo === "KNN"
      ? selecionarParametrosKNN_(treino, validacao, config)
      : selecionarParametrosArvore_(treino, validacao, config);
    var classificador = classificador_(algoritmo);
    var modelo = classificador.treinar(treino.concat(validacao), ajuste.configuracao);
    var metricas = classificador.avaliar(modelo, teste);
    var positivosTreino = treino.filter(function(x) { return x.rotulo === 1; }).length;
    var classeBaseline = positivosTreino >= treino.length - positivosTreino ? 1 : 0;
    var baseline = teste.length ? teste.filter(function(x) {
      return x.rotulo === classeBaseline;
    }).length / teste.length : 0;
    var criterios = criarCriterios_(metricas, baseline, algoritmo);
    var aprovado = criterios.every(function(item) { return item.atingido; });

    modelo.metricas = metricas;
    modelo.baseline = baseline;
    modelo.aprovado = aprovado;
    modelo.treinadoEm = new Date().toISOString();
    modelo.criterios = criterios;
    modelo.divisao = { treino: treino.length, validacao: validacao.length, teste: teste.length };
    modelo.amostras = preparado.exemplos.length;
    modelo.excluidos = preparado.excluidos;

    var observacoes = "Parâmetros escolhidos na validação. Excluídos: " +
      JSON.stringify(preparado.excluidos) +
      (algoritmo === "KNN"
        ? ". Escore de vizinhos não é probabilidade calibrada."
        : ". Frequência da folha não é probabilidade calibrada.");
    var experimento = {
      modelo: algoritmo,
      configuracao: ajuste.configuracao,
      amostras: preparado.exemplos.length,
      treino: treino.length, validacao: validacao.length, teste: teste.length,
      metricas: metricas, baseline: baseline, observacoes: observacoes
    };
    var id = AprendizadoMaquinaRepository.salvarExperimento(experimento);
    AprendizadoMaquinaRepository.salvarModelo(modelo);
    return {
      sucesso: true, algoritmo: algoritmo, experimentoId: id,
      metricas: metricas, baseline: baseline, aprovado: aprovado,
      amostras: preparado.exemplos.length, excluidos: preparado.excluidos,
      divisao: modelo.divisao, criterios: criterios,
      configuracaoSelecionada: ajuste.configuracao,
      metricasValidacao: ajuste.metricas,
      mensagem: aprovado
        ? nomeAlgoritmo_(algoritmo) + " aprovado para gerar escores experimentais."
        : nomeAlgoritmo_(algoritmo) + " treinado, mas não atingiu todos os critérios mínimos. O escore permanece experimental."
    };
  }

  /** Cria critérios de liberação comuns aos dois algoritmos. */
  function criarCriterios_(metricas, baseline, algoritmo) {
    return [
      { id:"amostra", nome:"Quantidade de exemplos no teste", valor:metricas.quantidade, minimo:20, operador:">=", atingido:metricas.quantidade>=20,
        explicacao:"O conjunto de teste precisa ter pelo menos 20 agendamentos com resultado conhecido.",
        recomendacao:"Registre mais resultados reais (FALTOU ou CONCLUÍDO) e execute nova avaliação." },
      { id:"f1", nome:"F1", valor:metricas.f1, minimo:0.5, operador:">=", atingido:metricas.f1>=0.5,
        explicacao:"Equilibra precisão e recall.",
        recomendacao:"Revise as características e os parâmetros do algoritmo." },
      { id:"recall", nome:"Recall", valor:metricas.recall, minimo:0.5, operador:">=", atingido:metricas.recall>=0.5,
        explicacao:"Mede quantas faltas reais o modelo conseguiu identificar.",
        recomendacao:"Verifique se há exemplos suficientes de FALTOU e revise as características." },
      { id:"precisao", nome:"Precisão", valor:metricas.precisao, minimo:0.5, operador:">=", atingido:metricas.precisao>=0.5,
        explicacao:"Mede quantos agendamentos sinalizados como risco elevado realmente resultaram em falta.",
        recomendacao:"Revise os parâmetros e compare novos experimentos." },
      { id:"baseline", nome:"Acurácia acima do resultado básico", valor:metricas.acuracia, minimo:baseline, operador:">", atingido:metricas.acuracia>baseline,
        explicacao:"O modelo precisa superar a estratégia simples que sempre prevê a classe mais frequente no treino.",
        recomendacao:"Ajuste as características e os parâmetros; não considere aprovado um modelo que não supere o resultado básico." }
    ];
  }

  /** Seleciona K e limiar pela melhor F1 na validação, sem consultar o teste. */
  function selecionarParametrosKNN_(treino, validacao, config) {
    var valoresK = [1, 3, 5, 7, 9];
    if (valoresK.indexOf(Number(config.k)) === -1) valoresK.push(Number(config.k));
    valoresK = valoresK.filter(function(k, indice, lista) {
      return k <= treino.length && lista.indexOf(k) === indice;
    });
    var limiares = [0.3, 0.4, 0.5, 0.6, 0.7];
    if (limiares.indexOf(Number(config.limiar)) === -1) limiares.push(Number(config.limiar));
    limiares.sort(function(a, b) { return a - b; });
    var melhor = null;
    valoresK.forEach(function(k) {
      limiares.forEach(function(limiar) {
        var candidata = {
          modelo:"KNN", k:k, limiar:limiar,
          ponderarDistancia:config.ponderarDistancia,
          features:config.features.slice(), pesos:config.pesos
        };
        var classificador = KNNClassifier;
        var candidato = classificador.treinar(treino, candidata);
        var metricas = classificador.avaliar(candidato, validacao, limiar);
        var distancia = Math.abs(k - Number(config.k)) + Math.abs(limiar - Number(config.limiar)) * 10;
        if (melhorCandidato_(melhor, metricas, distancia)) {
          melhor = { configuracao:candidata, metricas:metricas, distancia:distancia };
        }
      });
    });
    if (!melhor) throw new Error("Não foi possível selecionar parâmetros do K-NN.");
    return { configuracao:melhor.configuracao, metricas:melhor.metricas };
  }

  /** Seleciona limites da árvore pela melhor F1 na validação. */
  function selecionarParametrosArvore_(treino, validacao, config) {
    var profundidades = [2, 3, 4, 5, Number(config.profundidadeMaxima)];
    var divisaoMinima = [6, 10, 15, Number(config.minimoParaDividir)];
    var folhasMinimas = [2, 3, 5, Number(config.minimoPorFolha)];
    var melhor = null;
    profundidades.forEach(function(profundidade) {
      divisaoMinima.forEach(function(minimoDividir) {
        folhasMinimas.forEach(function(minimoFolha) {
          if (minimoDividir < minimoFolha * 2 || minimoDividir > treino.length) return;
          var candidata = {
            modelo:"ARVORE_DECISAO", features:config.features.slice(),
            profundidadeMaxima:profundidade,
            minimoParaDividir:minimoDividir,
            minimoPorFolha:minimoFolha
          };
          var modelo = DecisionTreeClassifier.treinar(treino, candidata);
          var metricas = DecisionTreeClassifier.avaliar(modelo, validacao);
          var distancia = Math.abs(profundidade - Number(config.profundidadeMaxima)) +
            Math.abs(minimoDividir - Number(config.minimoParaDividir)) / 10 +
            Math.abs(minimoFolha - Number(config.minimoPorFolha));
          if (melhorCandidato_(melhor, metricas, distancia)) {
            melhor = { configuracao:candidata, metricas:metricas, distancia:distancia };
          }
        });
      });
    });
    if (!melhor) throw new Error("Não foi possível selecionar parâmetros da Árvore de Decisão.");
    return { configuracao:melhor.configuracao, metricas:melhor.metricas };
  }

  /** Compara candidatos por F1, acurácia, recall e proximidade da configuração inicial. */
  function melhorCandidato_(melhor, metricas, distancia) {
    return !melhor ||
      metricas.f1 > melhor.metricas.f1 ||
      (metricas.f1 === melhor.metricas.f1 && metricas.acuracia > melhor.metricas.acuracia) ||
      (metricas.f1 === melhor.metricas.f1 && metricas.acuracia === melhor.metricas.acuracia &&
        metricas.recall > melhor.metricas.recall) ||
      (metricas.f1 === melhor.metricas.f1 && metricas.acuracia === melhor.metricas.acuracia &&
        metricas.recall === melhor.metricas.recall && distancia < melhor.distancia);
  }

  /** Retorna o classificador correspondente ao identificador do modelo. */
  function classificador_(algoritmo) {
    return algoritmo === "ARVORE_DECISAO" ? DecisionTreeClassifier : KNNClassifier;
  }

  /** Converte um exemplo das Rules para o contrato dos classificadores. */
  function paraClassificador_(item) {
    return { features:item.features, rotulo:item.rotulo };
  }

  /** Constrói as características atuais de um agendamento usando a mesma regra dos modelos. */
  function prepararFeaturesPrevisao_(registro) {
    var data = AprendizadoMaquinaRules.converterData(registro.data);
    var hora = AprendizadoMaquinaRules.converterHora(registro.hora);
    var cadastro = AprendizadoMaquinaRules.converterData(registro.dataCadastro);
    if (!data || hora === null) return null;
    return {
      antecedenciaDias: cadastro ? Math.max(0, Math.round((data.getTime() - cadastro.getTime()) / 86400000)) : null,
      hora:hora, diaSemana:data.getDay(),
      funcionario:String(registro.codigoFuncionario || ""),
      servico:String(registro.codigoServico || ""),
      cliente:String(registro.codigoCliente || "")
    };
  }

  /** Calcula previsões para um único modelo, inclusive quando não aprovado. */
  function preverAgendamentos(registros, algoritmo) {
    algoritmo = String(algoritmo || "KNN").toUpperCase();
    var modelo = AprendizadoMaquinaRepository.obterModelo(algoritmo);
    var mapa = {};
    if (!modelo || !modelo.configuracao || !Array.isArray(modelo.configuracao.features)) return mapa;
    var classificador = classificador_(algoritmo);
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    registros.forEach(function(r) {
      var status = String(r.status || "").toUpperCase();
      if (status !== "AGENDADO" && status !== "CONFIRMADO") return;
      var data = AprendizadoMaquinaRules.converterData(r.data);
      if (!data || data.getTime() < hoje.getTime()) return;
      var features = prepararFeaturesPrevisao_(r);
      if (!features || modelo.configuracao.features.some(function(f) {
        return features[f] === null || features[f] === "";
      })) return;
      var previsao = classificador.prever(modelo, features);
      var classificacao = AprendizadoMaquinaRules.classificarRisco(previsao.riscoPercentual);
      if (!classificacao) return;
      previsao.algoritmo = algoritmo;
      previsao.nivelRisco = classificacao.nivel;
      previsao.classificacaoRisco = classificacao.rotulo;
      mapa[String(r.codigo)] = previsao;
    });
    return mapa;
  }

  /** Retorna os dois mapas de previsão sem sobrescrever um algoritmo com o outro. */
  function preverTodosAgendamentos(registros) {
    return {
      KNN: preverAgendamentos(registros, "KNN"),
      ARVORE_DECISAO: preverAgendamentos(registros, "ARVORE_DECISAO")
    };
  }

  /** Retorna configuração, modelo e experimentos do algoritmo selecionado. */
  function obterPainel(algoritmo) {
    algoritmo = String(algoritmo || "KNN").toUpperCase();
    var modelo = AprendizadoMaquinaRepository.obterModelo(algoritmo);
    return {
      algoritmo:algoritmo,
      configuracao:obterConfiguracao(algoritmo),
      modelo:modelo ? {
        algoritmo:algoritmo, treinadoEm:modelo.treinadoEm,
        aprovado:modelo.aprovado, metricas:modelo.metricas,
        baseline:modelo.baseline, configuracao:modelo.configuracao,
        criterios:modelo.criterios || [], divisao:modelo.divisao || null,
        amostras:modelo.amostras || null, excluidos:modelo.excluidos || null
      } : null,
      experimentos:AprendizadoMaquinaRepository.listarExperimentos(30)
        .filter(function(item) { return String(item.modelo || "KNN").toUpperCase() === algoritmo; })
    };
  }

  /** Traduz identificadores técnicos para rótulos da interface. */
  function nomeAlgoritmo_(algoritmo) {
    return algoritmo === "ARVORE_DECISAO" ? "Árvore de Decisão" : "K-NN";
  }

  return {
    obterConfiguracao:obterConfiguracao,
    salvarConfiguracao:salvarConfiguracao,
    treinarAvaliar:treinarAvaliar,
    treinarAvaliarAlgoritmo:treinarAvaliarAlgoritmo,
    preverAgendamentos:preverAgendamentos,
    preverTodosAgendamentos:preverTodosAgendamentos,
    obterPainel:obterPainel
  };
})();

/** Pontos de entrada da tela administrativa de aprendizado de máquina. */
function obterPainelAprendizadoMaquina(algoritmo) {
  return AprendizadoMaquinaService.obterPainel(algoritmo);
}
function salvarConfiguracaoAprendizadoMaquina(config) {
  return AprendizadoMaquinaService.salvarConfiguracao(config);
}
function treinarAvaliarAprendizadoMaquina(algoritmo) {
  return AprendizadoMaquinaService.treinarAvaliarAlgoritmo(algoritmo || "KNN");
}
function preverAgendamentosAgenda() {
  return AprendizadoMaquinaService.preverTodosAgendamentos(
    AgendamentoRepository.listarDadosAprendizado()
  );
}
