/**
 * Entidade: AprendizadoMaquina
 * Responsabilidade: testes do Repository de experimentos do K-NN.
 *
 * Verifica que métricas numéricas são lidas como valores reais da planilha,
 * sem depender da representação localizada exibida pelo Google Sheets.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");

test("histórico preserva métricas numéricas independentemente da localidade", () => {
  const dataExecucao = new Date("2026-11-12T12:30:00Z");
  const linha = [
    "EXP-1", dataExecucao, "KNN", '{"k":3}',
    100, 60, 20, 20, 0.727, 0.545, 0.6, 0.571, 0.697, "avaliação"
  ];
  const contexto = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: nome => nome === "ML_EXPERIMENTOS" ? aba : null
      })
    },
    Utilities: {
      formatDate: (data, fuso, formato) => {
        assert.equal(fuso, "America/Cuiaba");
        assert.equal(formato, "dd/MM/yyyy HH:mm");
        return "12/11/2026 08:30";
      }
    },
    Session: { getScriptTimeZone: () => "America/Cuiaba" }
  };
  const aba = {
    getLastRow: () => 2,
    getRange: () => ({
      // O Sheets pode exibir esses mesmos números como "72,7%" em pt-BR.
      getDisplayValues: () => [[
        "EXP-1", "12/11/2026", "KNN", '{"k":3}',
        "100", "60", "20", "20", "72,7%", "54,5%",
        "60,0%", "57,1%", "69,7%", "avaliação"
      ]],
      getValues: () => [linha]
    })
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(raiz, "AprendizadoMaquinaRepository.js"), "utf8"),
    contexto,
    { filename: "AprendizadoMaquinaRepository.js" }
  );

  const itens = contexto.AprendizadoMaquinaRepository.listarExperimentos(20);
  assert.equal(itens.length, 1);
  assert.equal(itens[0].data, "12/11/2026 08:30");
  assert.equal(itens[0].amostras, 100);
  assert.equal(itens[0].acuracia, 0.727);
  assert.equal(itens[0].precisao, 0.545);
  assert.equal(itens[0].recall, 0.6);
  assert.equal(itens[0].f1, 0.571);
  assert.equal(itens[0].baseline, 0.697);
  assert.ok(Number.isFinite(itens[0].acuracia));
});
