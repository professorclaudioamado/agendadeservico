/**
 * Entidade: PrevisaoAgendamentos
 * Responsabilidade: testar regras de série diária, janela temporal e validação.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const raiz = path.resolve(__dirname, "..");

function carregar(contexto, arquivo) {
  vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), "utf8"), contexto, { filename: arquivo });
}

test("série diária preenche com zero os dias sem novos cadastros", () => {
  const contexto = {};
  carregar(contexto, "PrevisaoAgendamentosRules.js");
  const regras = contexto.PrevisaoAgendamentosRules;
  const serie = regras.gerarSerieDiaria([
    { dataCadastro: "01/11/2026" },
    { dataCadastro: "01/11/2026" },
    { dataCadastro: "03/11/2026" }
  ], new Date(2026, 10, 4, 12));
  assert.deepEqual(JSON.parse(JSON.stringify(serie.map(x => [x.chave, x.quantidade]))), [
    ["2026-11-01", 2], ["2026-11-02", 0], ["2026-11-03", 1], ["2026-11-04", 0]
  ]);
});

test("datas inválidas não são aceitas", () => {
  const contexto = {};
  carregar(contexto, "PrevisaoAgendamentosRules.js");
  assert.equal(contexto.PrevisaoAgendamentosRules.converterData("31/02/2026"), null);
  assert.equal(contexto.PrevisaoAgendamentosRules.converterData("2026-11-04").getDate(), 4);
});

test("janelas usam somente os dias anteriores ao alvo", () => {
  const contexto = {};
  carregar(contexto, "PrevisaoAgendamentosRules.js");
  const serie = [1, 2, 0, 4].map((quantidade, i) => ({
    chave: "2026-11-0" + (i + 1), quantidade
  }));
  const resultado = contexto.PrevisaoAgendamentosRules.criarJanelas(serie, 2);
  assert.equal(resultado.amostras.length, 2);
  assert.deepEqual(Array.from(resultado.amostras[0].entrada), [
    Math.log1p(1) / Math.log1p(4), Math.log1p(2) / Math.log1p(4)
  ]);
  assert.equal(resultado.amostras[0].quantidadeReal, 0);
});

test("validador rejeita parâmetros fora dos limites", () => {
  const contexto = {};
  carregar(contexto, "PrevisaoAgendamentosValidator.js");
  assert.throws(() => contexto.PrevisaoAgendamentosValidator.validarConfiguracao({
    janelaDias: 2, neuronios: 12, epocas: 700, taxaAprendizado: 0.01
  }), /janela histórica/);
  assert.equal(contexto.PrevisaoAgendamentosValidator.validarConfiguracao({
    janelaDias: 7, neuronios: 12, epocas: 700, taxaAprendizado: 0.015
  }), true);
});
