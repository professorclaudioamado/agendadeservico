/**
 * Entidade: AprendizadoMaquina
 * Responsabilidade: validar o classificador Árvore de Decisão.
 *
 * Testa aprendizado de divisões numéricas e categóricas, previsão,
 * métricas e limites de configuração.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
const contexto = { Math, Number, String, Array, Object, isFinite };
vm.runInNewContext(
  fs.readFileSync(path.join(raiz, "DecisionTreeClassifier.js"), "utf8"),
  contexto,
  { filename: "DecisionTreeClassifier.js" }
);
const arvore = contexto.DecisionTreeClassifier;

function exemplosHistoricos() {
  const exemplos = [];
  for (let i = 0; i < 40; i++) {
    const noite = i % 2 === 1;
    exemplos.push({
      features: {
        hora: noite ? 19 : 9,
        diaSemana: i % 7,
        funcionario: noite ? "F2" : "F1",
        servico: "S1"
      },
      rotulo: noite ? 1 : 0
    });
  }
  return exemplos;
}

test("Árvore de Decisão aprende uma divisão e classifica os grupos", () => {
  const modelo = arvore.treinar(exemplosHistoricos(), {
    features: ["hora", "funcionario"],
    profundidadeMaxima: 3,
    minimoParaDividir: 6,
    minimoPorFolha: 2
  });

  const previsaoManha = arvore.prever(modelo, {
    hora: 9, funcionario: "F1"
  });
  const previsaoNoite = arvore.prever(modelo, {
    hora: 19, funcionario: "F2"
  });

  assert.equal(modelo.algoritmo, "ARVORE_DECISAO");
  assert.ok(modelo.raiz.tipo === "DECISAO" || modelo.raiz.tipo === "FOLHA");
  assert.equal(previsaoManha.riscoPercentual, 0);
  assert.equal(previsaoNoite.riscoPercentual, 100);
  assert.ok(previsaoNoite.regras.length > 0);
});

test("Árvore calcula métricas no conjunto de avaliação", () => {
  const dados = exemplosHistoricos();
  const modelo = arvore.treinar(dados.slice(0, 30), {
    features: ["hora", "funcionario"],
    profundidadeMaxima: 3,
    minimoParaDividir: 6,
    minimoPorFolha: 2
  });
  const metricas = arvore.avaliar(modelo, dados.slice(30));

  assert.equal(metricas.quantidade, 10);
  assert.equal(metricas.acuracia, 1);
  assert.equal(metricas.precisao, 1);
  assert.equal(metricas.recall, 1);
  assert.equal(metricas.f1, 1);
});

test("Árvore não cria divisões quando os exemplos são de uma única classe", () => {
  const dados = exemplosHistoricos().map(item => ({
    features: item.features,
    rotulo: 0
  }));
  const modelo = arvore.treinar(dados, {
    features: ["hora", "funcionario"],
    profundidadeMaxima: 4,
    minimoParaDividir: 6,
    minimoPorFolha: 2
  });

  assert.equal(modelo.raiz.tipo, "FOLHA");
  assert.equal(arvore.prever(modelo, dados[0].features).riscoPercentual, 0);
});

test("Gini é zero em grupo puro e máximo em classes equilibradas", () => {
  assert.equal(arvore.calcularGini([{ rotulo: 0 }, { rotulo: 0 }]), 0);
  assert.equal(arvore.calcularGini([{ rotulo: 0 }, { rotulo: 1 }]), 0.5);
});
