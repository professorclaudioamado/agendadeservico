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
  assert.match(html, /"AGENDADO", "CONFIRMADO", "CONCLUÍDO", "FALTOU", "CANCELADO"/);
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


test("Data_cadastro não é campo de formulário e aparece no detalhamento como somente leitura", () => {
  assert.doesNotMatch(html, /id=["']dataCadastroAgenda["']/);
  assert.match(html, /Data de cadastro:.*item\.dataCadastro/);
});

test("interface oferece acesso à configuração K-NN e exibe escore na grade", () => {
  assert.match(html, /data-pagina="aprendizado"/);
  assert.match(html, /id="mlK"/);
  assert.match(html, /id="mlLimiar"/);
  assert.match(html, /treinarAvaliarAprendizadoMaquina/);
  assert.match(html, /preverAgendamentosAgenda/);
  assert.match(html, /Risco estimado de falta/);
  assert.match(html, /Escore experimental/);
});


test("grade da Agenda apresenta classificação visual do risco e mantém aviso de escore experimental", () => {
  assert.match(html, /risco-agendamento-baixo/);
  assert.match(html, /risco-agendamento-medio/);
  assert.match(html, /risco-agendamento-alto/);
  assert.match(html, /previsao\.classificacaoRisco/);
  assert.match(html, /Escore experimental: proporção de vizinhos com falta; não é probabilidade calibrada/);
  assert.match(html, /carregarGradeCadastro\("agenda"\)/);
});


test("interface oferece configuração e avaliação da Regressão Logística", () => {
  [
    'option value="REGRESSAO_LOGISTICA"',
    'id="mlParametrosLogistica"',
    'id="mlRegularizacao"',
    'id="mlTaxaAprendizado"',
    'id="mlIteracoes"',
    'id="mlTolerancia"',
    'id="mlLimiarLogistica"',
    "REGRESSAO_LOGISTICA",
    "modelo.treinamento.convergiu"
  ].forEach(function(contrato) {
    assert.ok(html.includes(contrato), "Contrato ausente na interface: " + contrato);
  });
});

test("grade mantém a ordem K-NN, Árvore, Regressão Logística e Ações", () => {
  const posKnn = html.indexOf('thRiscoKNN.textContent = "Risco estimado de falta — K-NN"');
  const posArvore = html.indexOf('thRiscoArvore.textContent = "Risco Árvore de Decisão"');
  const posLogistica = html.indexOf('thRiscoLogistica.textContent = "Risco Regressão Logística"');
  const posAcoes = html.indexOf('thAcoes.textContent = "Ações"');
  assert.ok(posKnn >= 0 && posArvore > posKnn && posLogistica > posArvore && posAcoes > posLogistica);
  assert.match(html, /previsaoLogistica = previsoes && previsoes\.REGRESSAO_LOGISTICA/);
  assert.match(html, /adicionarCelulaRisco\(previsaoLogistica, "REGRESSAO_LOGISTICA"\)/);
});

test("explicação clicável apresenta os componentes do cálculo logístico", () => {
  [
    'createElement("details")',
    'resumo.textContent = "Ver cálculo"',
    "Atributos informados:",
    "Intercepto:",
    "valor preparado",
    "coeficiente",
    "contribuição",
    "z = intercepto + soma das contribuições",
    "Sigmoide(z)",
    "Escore do modelo:",
    "Limiar:",
    "Versão do modelo:"
  ].forEach(function(contrato) {
    assert.ok(html.includes(contrato), "Explicação incompleta: " + contrato);
  });
  assert.match(html, /Não é probabilidade calibrada/);
});
