/**
 * Entidade: AprendizadoMaquina
 * Responsabilidade: testes do classificador K-NN e da preparação cronológica.
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

test("K-NN calcula escore de vizinhos e retorna classe prevista", () => {
  const contexto = {};
  carregar(contexto, "KNNClassifier.js");
  const cfg = { k: 3, limiar: 0.5, ponderarDistancia: false,
    features: ["hora", "servico"], pesos: { hora: 1, servico: 1 } };
  const modelo = contexto.KNNClassifier.treinar([
    {features:{hora:9,servico:"1"},rotulo:1},
    {features:{hora:9.5,servico:"1"},rotulo:1},
    {features:{hora:10,servico:"2"},rotulo:0},
    {features:{hora:17,servico:"3"},rotulo:0}
  ], cfg);
  const resultado = contexto.KNNClassifier.prever(modelo, {hora:9.2,servico:"1"});
  assert.equal(resultado.riscoPercentual, 67);
  assert.equal(resultado.classe, "RISCO_ELEVADO");
  assert.equal(resultado.quantidadeVizinhos, 3);
});

test("avaliação K-NN calcula matriz de confusão e métricas", () => {
  const contexto = {};
  carregar(contexto, "KNNClassifier.js");
  const cfg = { k: 1, limiar: 0.5, ponderarDistancia: false,
    features: ["servico"], pesos: {servico:1} };
  const modelo = contexto.KNNClassifier.treinar([
    {features:{servico:"A"},rotulo:1},
    {features:{servico:"B"},rotulo:0}
  ], cfg);
  const resultado = contexto.KNNClassifier.avaliar(modelo, [
    {features:{servico:"A"},rotulo:1},
    {features:{servico:"B"},rotulo:0}
  ], 0.5);
  assert.equal(resultado.acuracia, 1);
  assert.equal(resultado.precisao, 1);
  assert.equal(resultado.recall, 1);
  assert.equal(resultado.f1, 1);
});

test("preparação exclui cancelados e estados ainda sem resultado", () => {
  const contexto = {};
  carregar(contexto, "AprendizadoMaquinaRules.js");
  const config = {features:["hora","diaSemana","funcionario","servico"]};
  const resultado = contexto.AprendizadoMaquinaRules.prepararExemplos([
    {data:"10/01/2026",hora:"09:00",codigoFuncionario:"1",codigoServico:"2",status:"FALTOU"},
    {data:"11/01/2026",hora:"10:00",codigoFuncionario:"1",codigoServico:"2",status:"CONCLUÍDO"},
    {data:"12/01/2026",hora:"11:00",codigoFuncionario:"1",codigoServico:"2",status:"CANCELADO"},
    {data:"13/01/2026",hora:"11:00",codigoFuncionario:"1",codigoServico:"2",status:"AGENDADO"}
  ], config);
  assert.equal(resultado.exemplos.length, 2);
  assert.equal(resultado.exemplos[0].rotulo, 1);
  assert.equal(resultado.exemplos[1].rotulo, 0);
  assert.equal(resultado.excluidos.statusSemResultado, 2);
});

test("separação temporal preserva ordem entre treino, validação e teste", () => {
  const contexto = {};
  carregar(contexto, "AprendizadoMaquinaRules.js");
  const exemplos = Array.from({length:20}, (_,i) => ({data:i,features:{hora:9},rotulo:i%2}));
  const partes = contexto.AprendizadoMaquinaRules.dividirTemporal(exemplos);
  assert.equal(partes.treino.length, 12);
  assert.equal(partes.validacao.length, 4);
  assert.equal(partes.teste.length, 4);
  assert.ok(partes.treino[11].data < partes.validacao[0].data);
  assert.ok(partes.validacao[3].data < partes.teste[0].data);
});

test("validador rejeita K e características inválidas", () => {
  const contexto = {};
  carregar(contexto, "AprendizadoMaquinaValidator.js");
  assert.throws(() => contexto.AprendizadoMaquinaValidator.validarConfiguracao({
    modelo:"KNN",k:0,limiar:0.5,features:["hora"]
  }), /K deve ser/);
  assert.throws(() => contexto.AprendizadoMaquinaValidator.validarConfiguracao({
    modelo:"KNN",k:3,limiar:0.5,features:["cpf"]
  }), /não reconhecida/);
});
