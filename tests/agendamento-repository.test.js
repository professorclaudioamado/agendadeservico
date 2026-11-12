/**
 * Entidade: Agendamento
 * Responsabilidade: testes do acesso à aba AGENDA no Repository.
 *
 * Verifica a gravação automática da Data_cadastro, a proteção da coluna I
 * e a preservação da data original durante a edição de um agendamento.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");

function criarPlanilhaAgenda() {
  const cabecalhos = [
    "Código", "Data", "Hora", "Codigo_funcionario",
    "Codigo_cliente", "Codigo_servico", "Valor", "Status",
    "Data_cadastro"
  ];
  const linhas = [cabecalhos];
  const protecoes = [];
  const formatos = [];

  function obterTexto(valor) {
    if (valor instanceof Date) {
      return valor.toLocaleDateString("pt-BR");
    }
    return valor == null ? "" : String(valor);
  }

  const aba = {
    getName: () => "AGENDA",
    getLastRow: () => linhas.length,
    getRange: function(linha, coluna, quantidadeLinhas, quantidadeColunas) {
      if (typeof linha === "string") {
        return {
          protect: function() {
            const protecao = {
              descricao: "",
              somenteAviso: true,
              editores: [{ email: "editor@exemplo.com" }],
              dominioEdita: true,
              setDescription(valor) { this.descricao = valor; },
              getDescription() { return this.descricao; },
              setWarningOnly(valor) { this.somenteAviso = valor; },
              getEditors() { return this.editores; },
              removeEditors() { this.editores = []; },
              canDomainEdit() { return this.dominioEdita; },
              setDomainEdit(valor) { this.dominioEdita = valor; }
            };
            protecoes.push(protecao);
            return protecao;
          }
        };
      }

      const numeroLinhas = quantidadeLinhas || 1;
      const numeroColunas = quantidadeColunas || 1;
      return {
        getValues: function() {
          return linhas.slice(linha - 1, linha - 1 + numeroLinhas)
            .map(registro => registro.slice(coluna - 1, coluna - 1 + numeroColunas));
        },
        getDisplayValues: function() {
          return this.getValues().map(registro => registro.map(obterTexto));
        },
        setNumberFormat: function(formato) {
          formatos.push({ linha, coluna, formato });
        },
        setValues: function(valores) {
          valores.forEach((registro, indice) => {
            for (let i = 0; i < registro.length; i++) {
              linhas[linha - 1 + indice][coluna - 1 + i] = registro[i];
            }
          });
        },
        setValue: function(valor) {
          linhas[linha - 1][coluna - 1] = valor;
        }
      };
    },
    appendRow: function(registro) {
      linhas.push(registro.slice());
    },
    getProtections: function() {
      return protecoes;
    }
  };

  return { aba, linhas, protecoes, formatos };
}

function carregarRepository(planilha) {
  const contexto = {
    SpreadsheetApp: {
      ProtectionType: { RANGE: "RANGE" },
      getActiveSpreadsheet: () => ({
        getSheetByName: nome => nome === "AGENDA" ? planilha.aba : null
      })
    }
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(raiz, "AgendamentoRepository.js"), "utf8"),
    contexto,
    { filename: "AgendamentoRepository.js" }
  );
  return contexto.AgendamentoRepository;
}

test("salvar grava Data_cadastro automaticamente e protege a coluna I", () => {
  const planilha = criarPlanilhaAgenda();
  const repository = carregarRepository(planilha);
  const antes = new Date();

  const codigo = repository.salvar({
    data: new Date(2026, 10, 20),
    hora: "14:00",
    codigoFuncionario: 4,
    codigoCliente: 3,
    codigoServico: 1,
    valor: 75,
    status: "AGENDADO"
  });

  const depois = new Date();
  const dataCadastro = planilha.linhas[1][8];

  assert.equal(codigo, 1);
  assert.equal(planilha.linhas[1].length, 9);
  assert.equal(Object.prototype.toString.call(dataCadastro), "[object Date]");
  assert.ok(dataCadastro.getTime() >= antes.getTime());
  assert.ok(dataCadastro.getTime() <= depois.getTime());
  assert.equal(planilha.protecoes.length, 1);
  assert.equal(planilha.protecoes[0].descricao, "AGENDA_DATA_CADASTRO_SOMENTE_LEITURA");
  assert.equal(planilha.protecoes[0].somenteAviso, false);
  assert.equal(planilha.protecoes[0].editores.length, 0);
  assert.equal(planilha.protecoes[0].dominioEdita, false);
  assert.ok(planilha.formatos.some(item => item.coluna === 9 && item.formato === "dd/MM/yyyy"));
});

test("edição preserva a Data_cadastro já gravada", () => {
  const planilha = criarPlanilhaAgenda();
  const dataOriginal = new Date(2026, 9, 15);
  planilha.linhas.push([
    12, new Date(2026, 10, 20), "14:00", 4, 3, 1, 75, "AGENDADO",
    dataOriginal
  ]);
  const repository = carregarRepository(planilha);

  repository.atualizar(12, {
    data: new Date(2026, 10, 21),
    hora: "15:00",
    codigoFuncionario: 4,
    codigoCliente: 3,
    codigoServico: 1,
    valor: 75,
    status: "CONFIRMADO"
  });

  assert.equal(planilha.linhas[1][8].getTime(), dataOriginal.getTime());
  assert.equal(planilha.linhas[1][7], "CONFIRMADO");
});
