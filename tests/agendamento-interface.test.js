/**
 * Entidade: Agendamento
 * Responsabilidade: testes de integração estática da interface da Agenda.
 *
 * Verifica a sintaxe dos scripts incorporados em index.html e a presença
 * dos contratos usados pelas ações de consulta, edição, cancelamento e status.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("JavaScript incorporado em index.html possui sintaxe válida", () => {
  const scripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
  assert.ok(scripts.length > 0, "Nenhum bloco script encontrado em index.html");
  scripts.forEach((match, indice) => {
    assert.doesNotThrow(
      () => new vm.Script(match[1], { filename: "index.html<script " + indice + ">" }),
      "Bloco script " + indice + " contém erro de sintaxe"
    );
  });
});

test("interface da Agenda oferece as operações do CRUD", () => {
  [
    "consultarAgendamentoTela",
    "editarAgendamentoTela",
    "cancelarAgendamentoTela",
    "alterarStatusAgendamentoTela",
    "atualizarAgendamento",
    "alterarStatusAgendamento",
    "btnCancelarEdicaoAgendamento"
  ].forEach(function(contrato) {
    assert.ok(html.includes(contrato), "Contrato ausente na interface: " + contrato);
  });
});

test("cancelamento da Agenda é lógico e mantém o status CANCELADO", () => {
  assert.match(html, /function cancelarAgendamentoTela\(codigo\)[\s\S]*?alterarStatusAgendamentoTela\(codigo, "CANCELADO"\)/);
  assert.match(html, /"AGENDADO", "CONFIRMADO", "CONCLUÍDO", "CANCELADO"/);
});


test("grade da Agenda apresenta nomes relacionados e mantém códigos nas ações", () => {
  assert.match(html, /function carregarReferenciasAgenda\(aoCarregar\)/);
  assert.match(html, /listarFuncionariosAgenda\(\)/);
  assert.match(html, /listarClientesAgenda\(\)/);
  assert.match(html, /listarServicosAgenda\(\)/);
  assert.match(html, /indice === 3\) valorExibido = obterNomeReferenciaAgenda\("funcionarios", valor\)/);
  assert.match(html, /indice === 4\) valorExibido = obterNomeReferenciaAgenda\("clientes", valor\)/);
  assert.match(html, /indice === 5\) valorExibido = obterNomeReferenciaAgenda\("servicos", valor\)/);
  assert.match(html, /codigoAgendamento = linha\[0\]/);
});

test("ação de consulta da Agenda é apresentada como Detalhar", () => {
  assert.match(html, /texto: "Detalhar", classe: "botao-acao-grade", acao: consultarAgendamentoTela/);
  assert.doesNotMatch(html, /texto: "Consultar", classe: "botao-acao-grade", acao: consultarAgendamentoTela/);
});
