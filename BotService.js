/**
 * Entidade: BOT de Agendamento
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Conduzir o atendimento conversacional, manter a sessão no servidor,
 * validar informações interpretadas pela IA e coordenar a criação do
 * agendamento por meio dos Services e Repositories existentes.
 *
 * Dependências: BotRepository, BotValidator, BotRules, BotIAService,
 * AgendamentoService, CacheService e Utilities.
 */
var BotService = (function() {
  var PREFIXO_CACHE = "BOT_WHATSAPP_SESSAO_";
  var DURACAO_SESSAO_SEGUNDOS = 1800;
  var LIMITE_MENSAGEM = 800;

  /** Cria uma sessão nova sem expor dados pessoais ao navegador. */
  function iniciar() {
    var id = Utilities.getUuid();
    salvarSessao_(id, { etapa: "cpf", cliente: null, campos: {} });
    return {
      sessaoId: id,
      mensagem: "Olá! 👋 Seja bem-vindo(a) à Agenda de Serviços.\n\n" +
        "Vou ajudar você a encontrar um horário. Para proteger seu cadastro, " +
        "primeiro informe seu CPF (somente números)."
    };
  }

  /**
   * Processa uma mensagem usando a sessão armazenada no servidor.
   * O navegador recebe somente um identificador aleatório, nunca o estado.
   * @param {string} mensagem Texto digitado pelo cliente.
   * @param {string} sessaoId Identificador aleatório da sessão.
   * @return {{mensagem:string,sessaoId:string}} Resposta para a interface.
   */
  function processar(mensagem, sessaoId) {
    var texto = BotValidator.normalizarTexto(mensagem);
    if (!texto) throw new Error("Digite uma mensagem para continuar.");
    if (texto.length > LIMITE_MENSAGEM) {
      throw new Error("Envie uma mensagem de até " + LIMITE_MENSAGEM + " caracteres.");
    }
    if (/^(reiniciar|recomeçar|recomecar|novo atendimento)$/i.test(texto)) return iniciar();

    var id = String(sessaoId || "");
    var estado = id ? carregarSessao_(id) : null;
    if (!estado) {
      var nova = iniciar();
      nova.mensagem = "Sua sessão expirou ou não foi localizada. Vamos começar novamente.\n\n" + nova.mensagem;
      return nova;
    }

    try {
      if (estado.etapa === "cpf") return processarCpf_(texto, id, estado);
      if (estado.etapa === "celular") return processarCelular_(texto, id, estado);
      if (estado.etapa === "concluido") {
        estado.campos = {};
        estado.etapa = "pedido";
      }
      return processarPedido_(texto, id, estado);
    } catch (erro) {
      salvarSessao_(id, estado);
      return retorno_(erro && erro.message ? erro.message :
        "Não consegui processar sua mensagem. Pode tentar novamente?", id);
    }
  }

  function processarCpf_(texto, id, estado) {
    estado.cpf = BotValidator.validarCpf(texto);
    estado.etapa = "celular";
    salvarSessao_(id, estado);
    return retorno_("Obrigado! Agora informe os quatro últimos números do celular " +
      "registrado no seu cadastro.", id);
  }

  function processarCelular_(texto, id, estado) {
    var finalCelular = BotValidator.validarFinalCelular(texto);
    var cliente = BotRepository.buscarClientePorCpf(estado.cpf, finalCelular);
    estado.cpf = "";
    if (!cliente) {
      estado.etapa = "cpf";
      salvarSessao_(id, estado);
      return retorno_("Não consegui confirmar seu cadastro. Confira o CPF e os " +
        "quatro últimos números do celular. Para tentar novamente, informe seu CPF.", id);
    }
    estado.cliente = { codigo: String(cliente.codigo), nome: String(cliente.nome) };
    estado.etapa = "pedido";
    estado.campos = {};
    salvarSessao_(id, estado);
    return retorno_("Cadastro localizado, " + estado.cliente.nome + "! 😊\n\n" +
      "Agora pode me contar do seu jeito: qual serviço você deseja, com quem " +
      "e em que dia ou horário prefere? Pode escrever tudo em uma única mensagem.", id);
  }

  function processarPedido_(texto, id, estado) {
    var servicos = BotRepository.listarServicos();
    var profissionais = BotRepository.listarFuncionarios();
    var interpretacao = BotIAService.interpretarMensagem(texto, {
      servicos: servicos,
      profissionais: profissionais,
      campos: estado.campos || {}
    });

    aplicarInterpretacao_(interpretacao, estado, servicos, profissionais);

    var possuiAlteracao = !!(interpretacao.servico || interpretacao.profissional ||
      interpretacao.data || interpretacao.hora);

    // Uma resposta informativa pode também trazer dados novos do agendamento.
    // Os campos já foram aplicados à sessão acima; responder à pergunta não
    // deve fazer o BOT abandonar o pedido nem avançar prematuramente de etapa.
    if (interpretacao.intencao === "outro" && interpretacao.mensagem) {
      salvarSessao_(id, estado);
      return retorno_(interpretacao.mensagem, id);
    }

    if (interpretacao.intencao === "cancelar") {
      estado.campos = {};
      estado.etapa = "pedido";
      salvarSessao_(id, estado);
      return retorno_("Por enquanto, este atendimento ainda não realiza cancelamentos. " +
        "Para cancelar um agendamento existente, entre em contato com a equipe. " +
        "Posso ajudar com um novo agendamento.", id);
    }

    if (estado.etapa === "confirmacao" && interpretacao.confirmacao === "nao" &&
        !possuiAlteracao) {
      estado.campos = {};
      estado.etapa = "pedido";
      salvarSessao_(id, estado);
      return retorno_("Sem problema! Não vou registrar esse pedido. 😊\n\n" +
        "Se quiser fazer outro pedido, é só me contar. Para reiniciar, digite REINICIAR.", id);
    }
    if (estado.etapa === "confirmacao" && interpretacao.confirmacao === "sim") {
      return confirmarAgendamento_(id, estado);
    }
    return prepararConfirmacao_(id, estado, servicos, profissionais);
  }

  function aplicarInterpretacao_(dados, estado, servicos, profissionais) {
    if (dados.servico) {
      var servico = BotRules.localizarPorNome(servicos, dados.servico);
      if (!servico) {
        throw new Error("Não localizei esse serviço no cadastro. Temos: " +
          listarNomes_(servicos) + ". Qual deles você deseja?");
      }
      estado.campos.codigoServico = String(servico.codigo);
      estado.campos.nomeServico = servico.nome;
      estado.campos.duracao = Number(servico.tempo) || 30;
    }
    if (dados.profissional) {
      var profissional = BotRules.localizarPorNome(profissionais, dados.profissional);
      if (!profissional) {
        throw new Error("Não localizei esse profissional no cadastro. As opções são: " +
          listarNomes_(profissionais) + ". Com quem prefere agendar?");
      }
      estado.campos.codigoFuncionario = String(profissional.codigo);
      estado.campos.nomeFuncionario = profissional.nome;
    }
    if (dados.data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
        throw new Error("Não consegui identificar a data. Pode informar o dia e o mês?");
      }
      var partes = dados.data.split("-");
      var dataTexto = partes[2] + "/" + partes[1] + "/" + partes[0];
      estado.campos.data = BotValidator.validarData(dataTexto);
      estado.campos.dataExibicao = dataTexto;
    }
    if (dados.hora) estado.campos.hora = BotValidator.validarHora(dados.hora);
  }

  function prepararConfirmacao_(id, estado, servicos, profissionais) {
    var campos = estado.campos;
    if (!campos.codigoServico) {
      return salvarERetornar_(id, estado, "Qual serviço você deseja agendar?\n" +
        "Opções disponíveis: " + listarNomes_(servicos) + ".");
    }
    if (!campos.codigoFuncionario) {
      return salvarERetornar_(id, estado, "Com qual profissional você prefere agendar?\n" +
        "Opções disponíveis: " + listarNomes_(profissionais) + ".");
    }
    if (!campos.data) {
      return salvarERetornar_(id, estado, "Para qual dia você gostaria? Pode dizer, por exemplo, " +
        "'amanhã', 'sexta-feira' ou informar a data.");
    }
    if (!campos.hora) {
      return salvarERetornar_(id, estado, "E qual horário seria melhor para você? " +
        "Pode escrever, por exemplo, 'às duas da tarde'.");
    }

    var ocupados = BotRepository.listarAgendamentosDoDia(campos.data).filter(function(item) {
      return String(item.codigoFuncionario) === String(campos.codigoFuncionario);
    });
    if (!BotRules.horarioDisponivel(campos.hora, campos.duracao, ocupados)) {
      campos.hora = "";
      estado.etapa = "pedido";
      return salvarERetornar_(id, estado, "Esse horário não está disponível com " +
        campos.nomeFuncionario + ". Qual outro horário funciona para você?");
    }

    estado.etapa = "confirmacao";
    salvarSessao_(id, estado);
    return retorno_("Perfeito! Encontrei esta opção:\n\n" +
      "📌 Serviço: " + campos.nomeServico + "\n" +
      "👤 Profissional: " + campos.nomeFuncionario + "\n" +
      "📅 Data: " + campos.dataExibicao + "\n" +
      "🕒 Horário: " + campos.hora + "\n\n" +
      "Posso confirmar esse agendamento? Responda 'pode confirmar' ou 'não'.", id);
  }

  function confirmarAgendamento_(id, estado) {
    var campos = estado.campos;
    var cliente = BotRepository.buscarClientePorCodigo(estado.cliente.codigo);
    var servico = BotRepository.listarServicos().filter(function(item) {
      return String(item.codigo) === String(campos.codigoServico);
    })[0];
    var profissional = BotRepository.listarFuncionarios().filter(function(item) {
      return String(item.codigo) === String(campos.codigoFuncionario);
    })[0];

    if (!cliente || !servico || !profissional) {
      estado.etapa = "pedido";
      estado.campos = {};
      salvarSessao_(id, estado);
      return retorno_("Um dos cadastros foi alterado. Vamos atualizar seu pedido. " +
        "Qual serviço deseja agendar?", id);
    }

    var ocupados = BotRepository.listarAgendamentosDoDia(campos.data).filter(function(item) {
      return String(item.codigoFuncionario) === String(campos.codigoFuncionario);
    });
    if (!BotRules.horarioDisponivel(campos.hora, servico.tempo, ocupados)) {
      campos.hora = "";
      estado.etapa = "pedido";
      salvarSessao_(id, estado);
      return retorno_("Esse horário acabou de ficar indisponível. Qual outro horário " +
        "você prefere?", id);
    }

    var resultado = AgendamentoService.cadastrar({
      data: campos.data,
      hora: campos.hora,
      codigo_funcionario: profissional.codigo,
      codigo_cliente: cliente.codigo,
      codigo_servico: servico.codigo,
      status: "AGENDADO"
    });
    estado.etapa = "concluido";
    estado.campos = {};
    salvarSessao_(id, estado);
    return retorno_("Agendamento registrado com sucesso! 🎉\n" + resultado +
      "\n\nSe precisar de outro horário, é só me contar.", id);
  }

  function listarNomes_(itens) {
    if (!itens || !itens.length) return "nenhuma opção cadastrada no momento";
    return itens.map(function(item) { return item.nome; }).join(", ");
  }
  function salvarERetornar_(id, estado, mensagem) {
    salvarSessao_(id, estado);
    return retorno_(mensagem, id);
  }
  function retorno_(mensagem, id) { return { mensagem: mensagem, sessaoId: id }; }
  function carregarSessao_(id) {
    if (!/^[a-zA-Z0-9-]{20,80}$/.test(id)) return null;
    var conteudo = CacheService.getScriptCache().get(PREFIXO_CACHE + id);
    if (!conteudo) return null;
    try { return JSON.parse(conteudo); } catch (erro) { return null; }
  }
  function salvarSessao_(id, estado) {
    CacheService.getScriptCache().put(PREFIXO_CACHE + id,
      JSON.stringify(estado), DURACAO_SESSAO_SEGUNDOS);
  }

  return { iniciar: iniciar, processar: processar };
})();

/** Inicia uma sessão do BOT e devolve a primeira mensagem. */
function botIniciarConversa() { return BotService.iniciar(); }

/** Ponto de entrada da interface; o estado permanece armazenado no servidor. */
function botProcessarMensagem(mensagem, sessaoId) {
  return BotService.processar(mensagem, sessaoId);
}