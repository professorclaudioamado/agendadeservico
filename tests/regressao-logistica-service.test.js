/**
 * Entidade: AprendizadoMaquina
 * Responsabilidade: validar a integração da Regressão Logística nas camadas
 * Validator e Service, sem acessar a planilha real.
 *
 * Os testes usam dependências simuladas para verificar isolamento do algoritmo,
 * seleção de parâmetros na validação e bloqueio de previsões não aprovadas.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");

function carregar(contexto, arquivo) {
  vm.runInNewContext(
    fs.readFileSync(path.join(raiz, arquivo), "utf8"),
    contexto,
    { filename: arquivo }
  );
}

function configuracaoLogistica() {
  return {
    modelo: "REGRESSAO_LOGISTICA",
    regularizacao: 0.1,
    taxaAprendizado: 0.1,
    iteracoesMaximas: 10000,
    tolerancia: 0.0000001,
    limiar: 0.5,
    features: ["antecedenciaDias", "hora", "diaSemana", "servico"]
  };
}

test("Validator aceita Regressão Logística e preserva K-NN e Árvore", () => {
  const contexto = {};
  carregar(contexto, "AprendizadoMaquinaValidator.js");
  const validar = contexto.AprendizadoMaquinaValidator.validarConfiguracao;

  assert.equal(validar(configuracaoLogistica()), true);
  assert.equal(validar({
    modelo: "KNN", k: 3, limiar: 0.5,
    features: ["hora"], pesos: { hora: 1 }
  }), true);
  assert.equal(validar({
    modelo: "ARVORE_DECISAO", profundidadeMaxima: 4,
    minimoParaDividir: 6, minimoPorFolha: 2, features: ["hora"]
  }), true);
});

test("Validator rejeita parâmetros inválidos da Regressão Logística", () => {
  const contexto = {};
  carregar(contexto, "AprendizadoMaquinaValidator.js");
  const validar = contexto.AprendizadoMaquinaValidator.validarConfiguracao;

  [
    [{ regularizacao: -1 }, /regularização/],
    [{ taxaAprendizado: 0 }, /taxa de aprendizado/],
    [{ iteracoesMaximas: 99 }, /iterações/],
    [{ tolerancia: 0 }, /tolerância/],
    [{ limiar: 1 }, /limiar/],
    [{ features: ["hora", "hora"] }, /Não repita/],
    [{ features: ["codigoAgendamento"] }, /não reconhecida/]
  ].forEach(([alteracao, mensagem]) => {
    assert.throws(() => validar(Object.assign(configuracaoLogistica(), alteracao)), mensagem);
  });
});

test("Service seleciona regularização e limiar na validação e reserva o teste", () => {
  const treino = Array.from({ length: 60 }, (_, i) => ({
    data: i, features: { marcador: "treino" }, rotulo: i < 45 ? 0 : 1
  }));
  const validacao = Array.from({ length: 20 }, (_, i) => ({
    data: 60 + i, features: { marcador: "validacao" }, rotulo: i % 2
  }));
  const teste = Array.from({ length: 20 }, (_, i) => ({
    data: 80 + i, features: { marcador: "teste" }, rotulo: i < 15 ? 0 : 1
  }));
  const chamadasAvaliacao = [];
  const chamadasTreino = [];
  let modeloSalvo = null;
  let experimentoSalvo = null;
  const metricas = (quantidade, acuracia, precisao, recall, f1) => ({
    quantidade, acuracia, precisao, recall, f1
  });

  const contexto = {
    Date, JSON, Math, Number, String, Array, Object, isFinite,
    AprendizadoMaquinaValidator: { validarConfiguracao: () => true },
    AprendizadoMaquinaRepository: {
      obterConfiguracao: () => null,
      salvarConfiguracao: () => true,
      salvarExperimento: item => { experimentoSalvo = item; return "EXP-LOGISTICA"; },
      salvarModelo: modelo => { modeloSalvo = modelo; return true; },
      obterModelo: () => null,
      listarExperimentos: () => []
    },
    AgendamentoRepository: { listarDadosAprendizado: () => [] },
    AprendizadoMaquinaRules: {
      prepararExemplos: () => ({
        exemplos: treino.concat(validacao, teste),
        excluidos: { statusSemResultado: 0, dataInvalida: 0, cadastroAusente: 0, horaInvalida: 0 }
      }),
      dividirTemporal: () => ({ treino, validacao, teste })
    },
    LogisticRegressionClassifier: {
      treinar: (exemplos, config) => {
        chamadasTreino.push({ quantidade: exemplos.length, incluiTeste: exemplos.some(
          item => item.features.marcador === "teste"
        ) });
        return {
          algoritmo: "REGRESSAO_LOGISTICA",
          configuracao: config,
          treinamento: { convergiu: true, iteracoes: 100, perdaFinal: 0.4 }
        };
      },
      avaliar: (modelo, exemplos, limiar) => {
        const origem = exemplos[0].features.marcador;
        chamadasAvaliacao.push({ origem, regularizacao: modelo.configuracao.regularizacao, limiar });
        if (origem === "validacao") {
          const melhor = modelo.configuracao.regularizacao === 1 && limiar === 0.4;
          return melhor
            ? metricas(20, 0.85, 0.8, 0.8, 0.8)
            : metricas(20, 0.6, 0.4, 0.4, 0.4);
        }
        return metricas(20, 0.8, 0.6, 0.6, 0.6);
      }
    }
  };

  carregar(contexto, "AprendizadoMaquinaService.js");
  const resultado = contexto.AprendizadoMaquinaService.treinarAvaliarAlgoritmo("REGRESSAO_LOGISTICA");

  assert.equal(resultado.algoritmo, "REGRESSAO_LOGISTICA");
  assert.equal(resultado.configuracaoSelecionada.regularizacao, 1);
  assert.equal(resultado.configuracaoSelecionada.limiar, 0.4);
  assert.equal(resultado.metricasValidacao.f1, 0.8);
  assert.equal(resultado.metricas.acuracia, 0.8);
  assert.equal(resultado.baseline, 0.75);
  assert.equal(resultado.aprovado, true);
  assert.equal(modeloSalvo.aprovado, true);
  assert.equal(modeloSalvo.configuracao.modelo, "REGRESSAO_LOGISTICA");
  assert.equal(experimentoSalvo.modelo, "REGRESSAO_LOGISTICA");
  assert.match(experimentoSalvo.observacoes, /sigmoide não é probabilidade calibrada/);
  assert.ok(chamadasAvaliacao.some(item => item.origem === "validacao"));
  assert.equal(chamadasAvaliacao.filter(item => item.origem === "teste").length, 1);
  assert.ok(chamadasTreino.every(item => item.incluiTeste === false));
  assert.equal(chamadasTreino[chamadasTreino.length - 1].quantidade, 80);
});

test("Service não persiste modelo logístico que não convergiu", () => {
  const treino = Array.from({ length: 60 }, (_, i) => ({
    features: { marcador: "treino" }, rotulo: i % 2
  }));
  const validacao = Array.from({ length: 20 }, () => ({
    features: { marcador: "validacao" }, rotulo: 0
  }));
  const teste = Array.from({ length: 20 }, () => ({
    features: { marcador: "teste" }, rotulo: 0
  }));
  let chamadas = 0;
  let persistiu = false;
  const contexto = {
    Date, JSON, Math, Number, String, Array, Object, isFinite,
    AprendizadoMaquinaValidator: { validarConfiguracao: () => true },
    AprendizadoMaquinaRepository: {
      obterConfiguracao: () => null,
      salvarExperimento: () => { persistiu = true; },
      salvarModelo: () => { persistiu = true; }
    },
    AgendamentoRepository: { listarDadosAprendizado: () => [] },
    AprendizadoMaquinaRules: {
      prepararExemplos: () => ({ exemplos: treino.concat(validacao, teste), excluidos: {} }),
      dividirTemporal: () => ({ treino, validacao, teste })
    },
    LogisticRegressionClassifier: {
      treinar: (exemplos, config) => {
        chamadas++;
        return {
          algoritmo: "REGRESSAO_LOGISTICA", configuracao: config,
          treinamento: { convergiu: chamadas < 25 }
        };
      },
      avaliar: () => ({ quantidade: 20, acuracia: 0.8, precisao: 0.8, recall: 0.8, f1: 0.8 })
    }
  };
  carregar(contexto, "AprendizadoMaquinaService.js");
  assert.throws(
    () => contexto.AprendizadoMaquinaService.treinarAvaliarAlgoritmo("REGRESSAO_LOGISTICA"),
    /não convergiu/
  );
  assert.equal(persistiu, false);
});

test("Service só exibe previsão logística aprovada e mantém previsões dos modelos antigos", () => {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const data = [
    String(amanha.getDate()).padStart(2, "0"),
    String(amanha.getMonth() + 1).padStart(2, "0"),
    amanha.getFullYear()
  ].join("/");
  const hoje = new Date();
  const dataCadastro = [
    String(hoje.getDate()).padStart(2, "0"),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    hoje.getFullYear()
  ].join("/");
  const registros = [{
    codigo: "AG-1", data, dataCadastro, hora: "13:00", status: "AGENDADO",
    codigoFuncionario: "F1", codigoServico: "S1", codigoCliente: "C1"
  }];
  const modelos = {
    REGRESSAO_LOGISTICA: {
      aprovado: false,
      configuracao: { features: ["antecedenciaDias", "hora", "diaSemana", "servico"] }
    },
    KNN: { aprovado: false, configuracao: { features: ["hora", "diaSemana", "funcionario", "servico"] } },
    ARVORE_DECISAO: { aprovado: false, configuracao: { features: ["hora", "diaSemana", "funcionario", "servico"] } }
  };
  const contexto = {
    Date, JSON, Math, Number, String, Array, Object, isFinite,
    AprendizadoMaquinaRepository: { obterModelo: algoritmo => modelos[algoritmo], listarExperimentos: () => [] },
    AprendizadoMaquinaRules: {
      converterData: valor => {
        if (valor instanceof Date) return valor;
        const partes = String(valor || "").split("/");
        if (partes.length !== 3) return null;
        return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]), 12);
      },
      converterHora: valor => {
        const partes = String(valor || "").split(":");
        return partes.length === 2 ? Number(partes[0]) + Number(partes[1]) / 60 : null;
      },
      classificarRisco: percentual => ({
        nivel: percentual < 30 ? "BAIXO" : percentual <= 60 ? "MEDIO" : "ALTO",
        rotulo: percentual < 30 ? "Baixo" : percentual <= 60 ? "Médio" : "Alto"
      })
    },
    LogisticRegressionClassifier: { prever: () => ({ riscoPercentual: 45 }) },
    KNNClassifier: { prever: () => ({ riscoPercentual: 35 }) },
    DecisionTreeClassifier: { prever: () => ({ riscoPercentual: 55 }) }
  };
  carregar(contexto, "AprendizadoMaquinaService.js");

  const service = contexto.AprendizadoMaquinaService;
  const semAprovacao = service.preverTodosAgendamentos(registros);
  assert.deepEqual(Object.keys(semAprovacao).sort(), [
    "ARVORE_DECISAO", "KNN", "REGRESSAO_LOGISTICA"
  ]);
  assert.equal(Object.keys(semAprovacao.REGRESSAO_LOGISTICA).length, 0);
  assert.equal(semAprovacao.KNN["AG-1"].riscoPercentual, 35);
  assert.equal(semAprovacao.ARVORE_DECISAO["AG-1"].riscoPercentual, 55);

  modelos.REGRESSAO_LOGISTICA.aprovado = true;
  const comAprovacao = service.preverAgendamentos(registros, "REGRESSAO_LOGISTICA");
  assert.equal(comAprovacao["AG-1"].riscoPercentual, 45);
  assert.equal(comAprovacao["AG-1"].classificacaoRisco, "Médio");
});
