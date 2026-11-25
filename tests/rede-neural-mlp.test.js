/**
 * Entidade: PrevisaoAgendamentos
 * Responsabilidade: testar treinamento, previsão e métricas da rede neural MLP.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const raiz = path.resolve(__dirname, "..");

test("MLP treina com dados determinísticos e retorna saída finita", () => {
  const contexto = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(raiz, "RedeNeuralMLP.js"), "utf8"),
    contexto,
    { filename: "RedeNeuralMLP.js" }
  );
  const entradas = Array.from({ length: 30 }, (_, i) => [i / 30, (i % 7) / 7]);
  const alvos = entradas.map(x => 0.2 + x[0] * 0.5 + x[1] * 0.2);
  const modelo = contexto.RedeNeuralMLP.treinar(
    entradas.slice(0, 22), alvos.slice(0, 22),
    entradas.slice(22), alvos.slice(22),
    { neuronios: 8, epocas: 250, taxaAprendizado: 0.02, semente: 42 }
  );
  const previsao = contexto.RedeNeuralMLP.prever(modelo, [0.5, 0.3]);
  assert.equal(Number.isFinite(previsao), true);
  assert.ok(modelo.treinamento.melhorEpoca >= 1);
  assert.ok(modelo.pesosEntrada.length === 8);
});

test("MLP calcula MAE, RMSE e WAPE na escala original", () => {
  const contexto = {};
  vm.runInNewContext(fs.readFileSync(path.join(raiz, "RedeNeuralMLP.js"), "utf8"), contexto);
  const modelo = {
    entradas: 1, neuronios: 1,
    pesosEntrada: [[0]], viesesOcultos: [0],
    pesosSaida: [[0]], viesesSaida: [Math.log1p(2)]
  };
  const metricas = contexto.RedeNeuralMLP.avaliar(modelo, [[0], [1]], [
    Math.log1p(2) / Math.log1p(4), Math.log1p(2) / Math.log1p(4)
  ], Math.log1p(4));
  assert.equal(Number.isFinite(metricas.mae), true);
  assert.equal(Number.isFinite(metricas.rmse), true);
  assert.equal(Number.isFinite(metricas.wape), true);
});
