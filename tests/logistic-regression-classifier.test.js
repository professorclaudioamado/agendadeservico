/**
 * Entidade: AprendizadoMaquina
 * Responsabilidade: testar o classificador de Regressão Logística isoladamente.
 *
 * Cobertura: preparação numérica e categórica, convergência, previsão,
 * explicação matemática, avaliação, validação e estabilidade da sigmoide.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
const contexto = { Math, Number, String, Array, Object, isFinite, Infinity };
vm.runInNewContext(
  fs.readFileSync(path.join(raiz, "LogisticRegressionClassifier.js"), "utf8"),
  contexto,
  { filename: "LogisticRegressionClassifier.js" }
);
const regressao = contexto.LogisticRegressionClassifier;

function exemplosSeparaveis() {
  const exemplos = [];
  for (let i = 0; i < 80; i++) {
    const faltou = i % 2 === 1;
    exemplos.push({
      features: {
        antecedenciaDias: faltou ? 1 + (i % 4) : 15 + (i % 6),
        hora: faltou ? 18 + (i % 3) : 8 + (i % 3),
        diaSemana: i % 7,
        servico: faltou ? "S_NOTURNO" : "S_DIURNO"
      },
      rotulo: faltou ? 1 : 0
    });
  }
  return exemplos;
}

function treinarPadrao(dados) {
  return regressao.treinar(dados, {
    modelo: "REGRESSAO_LOGISTICA",
    features: ["antecedenciaDias", "hora", "diaSemana", "servico"],
    regularizacao: 0.1,
    taxaAprendizado: 0.1,
    iteracoesMaximas: 15000,
    tolerancia: 0.0000001,
    limiar: 0.5
  });
}

test("Regressão Logística treina com atributos numéricos e categóricos", () => {
  const modelo = treinarPadrao(exemplosSeparaveis());
  assert.equal(modelo.algoritmo, "REGRESSAO_LOGISTICA");
  assert.equal(modelo.versao, 1);
  assert.equal(modelo.amostras, 80);
  assert.equal(modelo.esquema.length, 4);
  assert.equal(modelo.esquema[0].tipo, "NUMERICA");
  assert.equal(modelo.esquema[3].tipo, "CATEGORICA");
  assert.equal(modelo.treinamento.convergiu, true);
  assert.ok(modelo.coeficientes.every(Number.isFinite));
  assert.ok(Number.isFinite(modelo.intercepto));
});

test("previsão retorna escore, classe e explicação matemática reproduzível", () => {
  const modelo = treinarPadrao(exemplosSeparaveis());
  const features = { antecedenciaDias: 2, hora: 19, diaSemana: 3, servico: "S_NOTURNO" };
  const previsao = regressao.prever(modelo, features);
  const soma = previsao.explicacao.intercepto + previsao.explicacao.contribuicoes
    .reduce((total, item) => total + item.contribuicao, 0);
  const sigmoideCalculada = 1 / (1 + Math.exp(-previsao.explicacao.z));

  assert.ok(previsao.escore > 0.5);
  assert.equal(previsao.classe, "RISCO_ELEVADO");
  assert.ok(Math.abs(soma - previsao.explicacao.z) < 1e-12);
  assert.ok(Math.abs(sigmoideCalculada - previsao.escore) < 1e-12);
  assert.equal(previsao.explicacao.formula, "1 / (1 + exp(-z))");
  assert.equal(previsao.explicacao.atributos.servico, "S_NOTURNO");
  assert.equal(previsao.versaoModelo, 1);
});

test("avaliação calcula matriz de confusão e métricas binárias", () => {
  const dados = exemplosSeparaveis();
  const modelo = treinarPadrao(dados.slice(0, 60));
  const metricas = regressao.avaliar(modelo, dados.slice(60));

  assert.equal(metricas.quantidade, 20);
  assert.equal(metricas.acuracia, 1);
  assert.equal(metricas.precisao, 1);
  assert.equal(metricas.recall, 1);
  assert.equal(metricas.f1, 1);
  assert.equal(metricas.falsosPositivos, 0);
  assert.equal(metricas.falsosNegativos, 0);
});

test("sigmoide permanece finita em valores extremos", () => {
  assert.equal(regressao.sigmoide(1000), 1);
  assert.equal(regressao.sigmoide(-1000), 0);
  assert.throws(() => regressao.sigmoide("não-numérico"), /deve ser finito/);
  assert.throws(() => regressao.sigmoide(Infinity), /deve ser finito/);
});

test("treinamento rejeita dados sem as duas classes e rótulos inválidos", () => {
  const base = exemplosSeparaveis();
  assert.throws(() => treinarPadrao(base.map(item => ({
    features: item.features, rotulo: 0
  }))), /duas classes/);
  assert.throws(() => treinarPadrao(base.map((item, indice) => ({
    features: item.features, rotulo: indice === 0 ? 2 : item.rotulo
  }))), /exclusivamente 0 ou 1/);
});

test("configuração rejeita atributos repetidos e parâmetros fora dos limites", () => {
  assert.throws(() => regressao.normalizarConfiguracao({
    features: ["hora", "hora"]
  }), /Não repita/);
  assert.throws(() => regressao.normalizarConfiguracao({
    features: ["codigoAgendamento"]
  }), /não permitida/);
  assert.throws(() => regressao.normalizarConfiguracao({
    features: ["hora"], regularizacao: -1
  }), /regularização/);
  assert.throws(() => regressao.normalizarConfiguracao({
    features: ["hora"], limiar: 1
  }), /limiar/);
});

test("previsão rejeita atributos ausentes e modelo incompatível", () => {
  const modelo = treinarPadrao(exemplosSeparaveis());
  assert.throws(() => regressao.prever(modelo, { hora: 10 }), /Informe um valor válido/);
  assert.throws(() => regressao.prever({ algoritmo: "KNN" }, { hora: 10 }), /inválido ou não treinado/);
});

test("classificador suporta aproximadamente 208 registros com classes desbalanceadas", () => {
  const dados = [];
  for (let i = 0; i < 208; i++) {
    const faltou = i % 5 === 0;
    dados.push({
      features: {
        antecedenciaDias: (i * 7) % 35,
        hora: 8 + (i % 11),
        diaSemana: i % 7,
        servico: "S" + (i % 4)
      },
      rotulo: faltou ? 1 : 0
    });
  }
  const modelo = treinarPadrao(dados);
  const previsao = regressao.prever(modelo, {
    antecedenciaDias: 12, hora: 14, diaSemana: 2, servico: "S2"
  });
  assert.equal(modelo.amostras, 208);
  assert.ok(Number.isFinite(previsao.escore));
  assert.ok(previsao.escore >= 0 && previsao.escore <= 1);
  assert.ok(modelo.coeficientes.every(Number.isFinite));
});

test("característica numérica constante e categoria inédita não geram valores inválidos", () => {
  const dados = exemplosSeparaveis().map(item => ({
    features: { hora: 10, servico: item.features.servico },
    rotulo: item.rotulo
  }));
  const modelo = regressao.treinar(dados, {
    features: ["hora", "servico"], iteracoesMaximas: 10000
  });
  const previsao = regressao.prever(modelo, { hora: 10, servico: "SERVICO_NOVO" });
  assert.ok(Number.isFinite(previsao.escore));
  assert.ok(Number.isFinite(previsao.explicacao.z));
  assert.equal(modelo.esquema[0].desvioPadrao, 1);
});
