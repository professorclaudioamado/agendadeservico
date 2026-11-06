const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
function carregar(contexto, arquivo) {
  vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), "utf8"), contexto, { filename: arquivo });
}
function criarCache() {
  const dados = new Map();
  return {
    get: chave => dados.has(chave) ? dados.get(chave) : null,
    put: (chave, valor) => dados.set(chave, valor),
    remove: chave => dados.delete(chave)
  };
}
function criarContextoBot(opcoes = {}) {
  const cache = criarCache();
  const contexto = {
    CacheService: { getScriptCache: () => cache },
    Utilities: { getUuid: () => "12345678-1234-1234-1234-123456789012" },
    BotRepository: {
      buscarClientePorCpf: (cpf, final) => cpf === "52998224725" && final === "1234"
        ? { codigo: "7", nome: "Maria" } : null,
      buscarClientePorCodigo: codigo => String(codigo) === "7" ? { codigo: "7", nome: "Maria" } : null,
      listarServicos: () => [{ codigo: "2", nome: "Consulta", tempo: 30 }],
      listarFuncionarios: () => [{ codigo: "5", nome: "João" }],
      listarAgendamentosDoDia: () => opcoes.ocupados || []
    },
    AgendamentoService: {
      cadastrar: dados => {
        contexto.agendamentoCriado = dados;
        return "Código: 99";
      }
    },
    BotIAService: {
      interpretarMensagem: texto => /confirm/i.test(texto)
        ? { intencao: "confirmar", servico: "", profissional: "", data: "", hora: "", confirmacao: "sim" }
        : /não|nao/i.test(texto)
          ? { intencao: "outro", servico: "", profissional: "", data: "", hora: "", confirmacao: "nao" }
          : { intencao: "agendar", servico: "Consulta", profissional: "João", data: "2099-12-31", hora: "14:00", confirmacao: "nenhuma" }
    }
  };
  carregar(contexto, "BotValidator.js");
  carregar(contexto, "BotRules.js");
  carregar(contexto, "BotService.js");
  return contexto;
}

test("valida CPF e os quatro últimos números do celular", () => {
  const contexto = {};
  carregar(contexto, "BotValidator.js");
  assert.equal(contexto.BotValidator.validarCpf("529.982.247-25"), "52998224725");
  assert.throws(() => contexto.BotValidator.validarCpf("11111111111"), /CPF válido/);
  assert.equal(contexto.BotValidator.validarFinalCelular("1234"), "1234");
  assert.throws(() => contexto.BotValidator.validarFinalCelular("123"), /quatro últimos/);
});

test("valida data futura e horário", () => {
  const contexto = {};
  carregar(contexto, "BotValidator.js");
  assert.equal(contexto.BotValidator.validarData("31/12/2099"), "2099-12-31");
  assert.throws(() => contexto.BotValidator.validarData("31/02/2099"), /não existe/);
  assert.equal(contexto.BotValidator.validarHora("14:30"), "14:30");
  assert.throws(() => contexto.BotValidator.validarHora("24:00"), /HH:MM/);
});

test("normaliza nomes e identifica sobreposição de horários", () => {
  const contexto = {};
  carregar(contexto, "BotRules.js");
  assert.equal(contexto.BotRules.localizarPorNome([{ codigo: 1, nome: "Clínica Geral" }], "clinica geral").codigo, 1);
  assert.equal(contexto.BotRules.horarioDisponivel("10:30", 30, [{ hora: "10:00", duracao: 30 }]), true);
  assert.equal(contexto.BotRules.horarioDisponivel("10:20", 30, [{ hora: "10:00", duracao: 30 }]), false);
});

test("interpreta linguagem natural pela API Groq com resposta estruturada", () => {
  let requisicao;
  const retornoIA = { intencao: "agendar", servico: "Consulta", profissional: "João", data: "2099-12-31", hora: "14:00", confirmacao: "nenhuma" };
  const contexto = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: nome => nome === "GROQ_API_KEY" ? "chave-de-teste" : null }) },
    Utilities: { formatDate: () => "2099-12-30" },
    Session: { getScriptTimeZone: () => "America/Cuiaba" },
    UrlFetchApp: { fetch: (url, opcoes) => {
      requisicao = { url, opcoes };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(retornoIA) } }] }) };
    } }
  };
  carregar(contexto, "BotIAService.js");
  const resultado = contexto.BotIAService.interpretarMensagem("Quero consulta amanhã às duas com João", {
    servicos: [{ nome: "Consulta" }], profissionais: [{ nome: "João" }], campos: {}
  });
  assert.equal(resultado.data, "2099-12-31");
  assert.equal(requisicao.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(requisicao.opcoes.headers.Authorization, "Bearer chave-de-teste");
  assert.equal(JSON.parse(requisicao.opcoes.payload).response_format.type, "json_object");
  assert.equal(JSON.parse(requisicao.opcoes.payload).reasoning_format, "hidden");
});


// Confere o diagnóstico HTTP sem permitir que a chave da API apareça na mensagem.
test("exibe a mensagem técnica da Groq em erro HTTP sem revelar a chave", () => {
  const contexto = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "segredo-nao-exibir" }) },
    Utilities: { formatDate: () => "2099-12-30" },
    Session: { getScriptTimeZone: () => "America/Cuiaba" },
    UrlFetchApp: { fetch: () => ({
      getResponseCode: () => 400,
      getContentText: () => JSON.stringify({ error: { message: "Invalid response_format for this request" } })
    }) }
  };
  carregar(contexto, "BotIAService.js");
  assert.throws(
    () => contexto.BotIAService.interpretarMensagem("Quero marcar amanhã", {}),
    erro => {
      assert.match(erro.message, /HTTP 400: Invalid response_format/);
      assert.equal(erro.message.includes("segredo-nao-exibir"), false);
      return true;
    }
  );
});

test("conversa natural identifica cliente, prepara resumo e só grava após confirmação", () => {
  const contexto = criarContextoBot();
  const bot = contexto.BotService;
  let resposta = bot.iniciar();
  const sessaoId = resposta.sessaoId;
  assert.match(resposta.mensagem, /CPF/);
  resposta = bot.processar("529.982.247-25", sessaoId);
  assert.match(resposta.mensagem, /quatro últimos/);
  resposta = bot.processar("1234", sessaoId);
  assert.match(resposta.mensagem, /Maria/);
  resposta = bot.processar("Quero uma consulta com João em 31 de dezembro de 2099 às 14h", sessaoId);
  assert.match(resposta.mensagem, /Posso confirmar/);
  assert.equal(contexto.agendamentoCriado, undefined);
  resposta = bot.processar("Pode confirmar", sessaoId);
  assert.match(resposta.mensagem, /registrado com sucesso/);
  assert.equal(contexto.agendamentoCriado.codigo_cliente, "7");
  assert.equal(contexto.agendamentoCriado.codigo_funcionario, "5");
  assert.equal(contexto.agendamentoCriado.codigo_servico, "2");
});

test("não permite gravar quando o horário está ocupado", () => {
  const contexto = criarContextoBot({ ocupados: [{ codigoFuncionario: "5", hora: "14:00", duracao: 60 }] });
  const bot = contexto.BotService;
  const sessaoId = bot.iniciar().sessaoId;
  bot.processar("529.982.247-25", sessaoId);
  bot.processar("1234", sessaoId);
  const resposta = bot.processar("Quero consulta com João dia 31/12/2099 às 14h", sessaoId);
  assert.match(resposta.mensagem, /não está disponível/);
  assert.equal(contexto.agendamentoCriado, undefined);
});

test("sessão expirada reinicia identificação em vez de confiar em estado enviado pelo navegador", () => {
  const contexto = criarContextoBot();
  const resposta = contexto.BotService.processar("SIM", "sessao-inexistente");
  assert.match(resposta.mensagem, /sessão expirou/);
  assert.match(resposta.mensagem, /CPF/);
});

test("JavaScript incorporado em Bot.html possui sintaxe válida", () => {
  const html = fs.readFileSync(path.join(raiz, "Bot.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, "script inline deve existir");
  assert.doesNotThrow(() => new vm.Script(script[1]));
});