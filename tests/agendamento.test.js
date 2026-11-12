const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");

function carregar(contexto, arquivo) {
  vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), "utf8"), contexto, {
    filename: arquivo
  });
}

function criarContexto() {
  const chamadas = {};
  const contexto = {
    chamadas,
    AgendamentoRepository: {
      buscarPorCodigo: codigo => String(codigo) === "12"
        ? { codigo: "12", data: "2026-11-20", hora: "14:00", status: "AGENDADO" }
        : null,
      buscarFuncionarioPorCodigo: codigo => String(codigo) === "4" ? { codigo: "4" } : null,
      buscarClientePorCodigo: codigo => String(codigo) === "3" ? { codigo: "3" } : null,
      buscarServicoPorCodigo: codigo => String(codigo) === "1"
        ? { codigo: "1", valor: 75 } : null,
      atualizar: (codigo, dados) => { chamadas.atualizar = { codigo, dados }; },
      atualizarStatus: (codigo, status) => { chamadas.status = { codigo, status }; },
      listarFuncionarios: () => [],
      listarClientes: () => [],
      listarServicos: () => [],
      salvar: dados => { chamadas.salvar = dados; return 13; }
    }
  };
  carregar(contexto, "AgendamentoRules.js");
  carregar(contexto, "AgendamentoValidator.js");
  carregar(contexto, "AgendamentoService.js");
  return contexto;
}

const dadosValidos = {
  data: "2026-11-21",
  hora: "15:30",
  codigo_funcionario: "4",
  codigo_cliente: "3",
  codigo_servico: "1",
  status: "CONFIRMADO"
};

test("consulta agendamento pelo código e rejeita código inexistente", () => {
  const contexto = criarContexto();
  assert.equal(contexto.AgendamentoService.consultar("12").codigo, "12");
  assert.throws(() => contexto.AgendamentoService.consultar("99"), /não encontrado/i);
});

test("atualiza os dados do agendamento e recalcula o valor pelo serviço", () => {
  const contexto = criarContexto();
  const resposta = contexto.AgendamentoService.atualizar("12", dadosValidos);
  assert.match(resposta, /atualizado com sucesso/i);
  assert.equal(contexto.chamadas.atualizar.codigo, "12");
  assert.equal(contexto.chamadas.atualizar.dados.codigoFuncionario, 4);
  assert.equal(contexto.chamadas.atualizar.dados.valor, 75);
  assert.equal(contexto.chamadas.atualizar.dados.status, "CONFIRMADO");
});

test("alterar status modifica somente o status e valida os valores permitidos", () => {
  const contexto = criarContexto();
  contexto.AgendamentoService.alterarStatus("12", "CANCELADO");
  assert.deepEqual(contexto.chamadas.status, { codigo: "12", status: "CANCELADO" });
  assert.throws(
    () => contexto.AgendamentoService.alterarStatus("12", "EM_ATENDIMENTO"),
    /status válido/i
  );
});


test("cadastro não aceita data de cadastro enviada pela interface", () => {
  const contexto = criarContexto();
  const dados = {
    ...dadosValidos,
    data_cadastro: "01/01/2000",
    dataCadastro: "01/01/2000"
  };

  const resposta = contexto.AgendamentoService.cadastrar(dados);

  assert.match(resposta, /cadastrado com sucesso/i);
  assert.equal(contexto.chamadas.salvar.data, contexto.AgendamentoRules.criarDataPlanilha(dados.data));
  assert.equal(Object.prototype.hasOwnProperty.call(contexto.chamadas.salvar, "dataCadastro"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(contexto.chamadas.salvar, "data_cadastro"), false);
});
