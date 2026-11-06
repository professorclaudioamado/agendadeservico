const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function carregarArquivo(nome, variavel) {
  const contexto = {};
  vm.runInNewContext(
    fs.readFileSync(nome, "utf8"),
    contexto,
    { filename: nome }
  );
  return contexto[variavel];
}

const validator = carregarArquivo("BotValidator.js", "BotValidator");
const rules = carregarArquivo("BotRules.js", "BotRules");

test("normaliza CPF e aceita dígitos verificadores válidos", () => {
  assert.equal(validator.validarCpf("529.982.247-25"), "52998224725");
});

test("rejeita CPF com dígito verificador incorreto", () => {
  assert.throws(() => validator.validarCpf("52998224724"), /CPF válido/);
});

test("rejeita CPF com todos os números iguais", () => {
  assert.throws(() => validator.validarCpf("11111111111"), /CPF válido/);
});

test("valida data real no formato DD/MM/AAAA", () => {
  assert.equal(validator.validarData("31/12/2099"), "2099-12-31");
});

test("rejeita data inexistente", () => {
  assert.throws(() => validator.validarData("31/02/2099"), /não existe/);
});

test("valida horário no formato HH:MM", () => {
  assert.equal(validator.validarHora("09:45"), "09:45");
  assert.throws(() => validator.validarHora("24:00"), /HH:MM/);
});

test("localiza nomes sem diferença de acentuação ou caixa", () => {
  const item = rules.localizarPorNome([{ codigo: 1, nome: "Clínica Geral" }], "clinica geral");
  assert.equal(item.codigo, 1);
});

test("aceita horários consecutivos sem sobreposição", () => {
  assert.equal(
    rules.horarioDisponivel("10:30", 30, [{ hora: "10:00", duracao: 30 }]),
    true
  );
});

test("rejeita sobreposição de horários", () => {
  assert.equal(
    rules.horarioDisponivel("10:20", 30, [{ hora: "10:00", duracao: 30 }]),
    false
  );
});
