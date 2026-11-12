/**
 * Entidade: AprendizadoMaquina
 * Responsabilidade: verificar a seleção automática de parâmetros K-NN.
 *
 * Garante que K e limiar sejam escolhidos com a validação e que o teste
 * permaneça reservado para a avaliação final do modelo.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");

test("treinamento seleciona K e limiar na validação antes de avaliar o teste", () => {
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
  let modeloSalvo = null;
  let experimentoSalvo = null;
  const metricas = (quantidade, acuracia, precisao, recall, f1) => ({
    quantidade, acuracia, precisao, recall, f1
  });

  const contexto = {
    Date,
    JSON,
    Math,
    isFinite,
    AprendizadoMaquinaValidator: {
      validarConfiguracao: () => true
    },
    AprendizadoMaquinaRepository: {
      obterConfiguracao: () => ({
        modelo: "KNN", k: 3, limiar: 0.5, ponderarDistancia: false,
        features: ["marcador"], pesos: { marcador: 1 }
      }),
      salvarExperimento: item => { experimentoSalvo = item; return "EXP-TESTE"; },
      salvarModelo: modelo => { modeloSalvo = modelo; return true; },
      obterModelo: () => null,
      listarExperimentos: () => []
    },
    AgendamentoRepository: {
      listarDadosAprendizado: () => []
    },
    AprendizadoMaquinaRules: {
      prepararExemplos: () => ({
        exemplos: treino.concat(validacao, teste),
        excluidos: { statusSemResultado: 0, dataInvalida: 0, cadastroAusente: 0, horaInvalida: 0 }
      }),
      dividirTemporal: () => ({ treino, validacao, teste })
    },
    KNNClassifier: {
      treinar: (exemplos, configuracao) => ({ configuracao, amostras: exemplos }),
      avaliar: (modelo, exemplos, limiar) => {
        const origem = exemplos[0].features.marcador;
        chamadasAvaliacao.push({ origem, k: modelo.configuracao.k, limiar });
        if (origem === "validacao") {
          const melhor = modelo.configuracao.k === 1 && limiar === 0.4;
          return melhor
            ? metricas(20, 0.8, 0.8, 0.8, 0.8)
            : metricas(20, 0.6, 0.4, 0.4, 0.4);
        }
        return metricas(20, 0.8, 0.6, 0.6, 0.6);
      }
    }
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(raiz, "AprendizadoMaquinaService.js"), "utf8"),
    contexto,
    { filename: "AprendizadoMaquinaService.js" }
  );

  const resultado = contexto.AprendizadoMaquinaService.treinarAvaliar();

  assert.equal(resultado.configuracaoSelecionada.k, 1);
  assert.equal(resultado.configuracaoSelecionada.limiar, 0.4);
  assert.equal(resultado.metricasValidacao.f1, 0.8);
  assert.equal(resultado.metricas.acuracia, 0.8);
  assert.equal(resultado.baseline, 0.75);
  assert.equal(resultado.aprovado, true);
  assert.ok(chamadasAvaliacao.some(item => item.origem === "validacao"));
  assert.equal(chamadasAvaliacao.filter(item => item.origem === "teste").length, 1);
  assert.equal(modeloSalvo.configuracao.k, 1);
  assert.equal(modeloSalvo.configuracao.limiar, 0.4);
  assert.equal(experimentoSalvo.configuracao.k, 1);
  assert.match(experimentoSalvo.observacoes, /Parâmetros escolhidos na validação/);
});
