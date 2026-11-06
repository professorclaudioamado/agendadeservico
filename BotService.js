/**
 * Entidade: BOT de Agendamento
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Conduzir a conversa por etapas e coordenar o cadastro usando os Services
 * existentes. Nenhuma operação de planilha é executada diretamente aqui.
 *
 * Dependências:
 * - BotRepository
 * - BotValidator
 * - BotRules
 * - AgendamentoService
 */
var BotService = (function() {
  function processar(mensagem, sessao) {
    var texto = BotValidator.normalizarTexto(mensagem);
    var estado = sessao && typeof sessao === "object" ? sessao : { etapa: "inicio" };

    if (/^(reiniciar|começar|comecar|cancelar)$/i.test(texto)) {
      return respostaInicial();
    }

    try {
      switch (estado.etapa || "inicio") {
        case "inicio":
          estado.etapa = "cpf";
          return retorno("Olá! Vou ajudar você a solicitar um agendamento. Para localizar seu cadastro, informe seu CPF (somente números).", estado);

        case "cpf":
          estado.cpf = BotValidator.validarCpf(texto);
          estado.cliente = BotRepository.buscarClientePorCpf(estado.cpf);
          if (!estado.cliente) {
            estado.etapa = "cpf";
            estado.cpf = "";
            return retorno("Não encontrei um cadastro com esse CPF. Confira os números ou procure a equipe para realizar seu cadastro. Digite REINICIAR para tentar novamente.", estado);
          }
          estado.etapa = "servico";
          estado.servicos = BotRepository.listarServicos();
          return retorno("Cadastro localizado, " + estado.cliente.nome + ". Qual serviço deseja? " + listarNomes_(estado.servicos), estado);

        case "servico":
          var servico = BotRules.localizarPorNome(BotRepository.listarServicos(), texto);
          if (!servico) return retorno("Não identifiquei o serviço. Digite exatamente um destes nomes: " + listarNomes_(BotRepository.listarServicos()), estado);
          estado.codigoServico = servico.codigo;
          estado.nomeServico = servico.nome;
          estado.duracao = servico.tempo;
          estado.etapa = "funcionario";
          estado.funcionarios = BotRepository.listarFuncionarios();
          return retorno("Certo. Com qual profissional deseja agendar? " + listarNomes_(estado.funcionarios), estado);

        case "funcionario":
          var funcionario = BotRules.localizarPorNome(BotRepository.listarFuncionarios(), texto);
          if (!funcionario) return retorno("Não identifiquei o profissional. Digite exatamente um destes nomes: " + listarNomes_(BotRepository.listarFuncionarios()), estado);
          estado.codigoFuncionario = funcionario.codigo;
          estado.nomeFuncionario = funcionario.nome;
          estado.etapa = "data";
          return retorno("Qual data prefere? Use DD/MM/AAAA.", estado);

        case "data":
          estado.data = BotValidator.validarData(texto);
          estado.dataExibicao = texto;
          estado.etapa = "hora";
          return retorno("Qual horário prefere? Use HH:MM (por exemplo, 14:30).", estado);

        case "hora":
          estado.hora = BotValidator.validarHora(texto);
          var ocupados = BotRepository.listarAgendamentosDoDia(estado.data)
            .filter(function(item) {
              return String(item.codigoFuncionario) === String(estado.codigoFuncionario);
            });
          if (!BotRules.horarioDisponivel(estado.hora, estado.duracao, ocupados)) {
            return retorno("Esse horário conflita com outro agendamento desse profissional. Informe outro horário em HH:MM.", estado);
          }
          estado.etapa = "confirmacao";
          return retorno("Confira seu pedido:\nServiço: " + estado.nomeServico +
            "\nProfissional: " + estado.nomeFuncionario +
            "\nData: " + estado.dataExibicao +
            "\nHorário: " + estado.hora +
            "\n\nDigite SIM para solicitar o agendamento ou NÃO para recomeçar.", estado);

        case "confirmacao":
          if (/^(nao|não)$/i.test(texto)) return respostaInicial("Tudo bem. Vamos começar novamente.");
          if (!/^sim$/i.test(texto)) return retorno("Responda SIM para confirmar ou NÃO para recomeçar.", estado);

          // Revalida cadastros e conflito imediatamente antes de gravar.
          var clienteAtual = BotRepository.buscarClientePorCpf(estado.cpf);
          var servicoAtual = BotRepository.listarServicos().filter(function(x) {
            return String(x.codigo) === String(estado.codigoServico);
          })[0];
          var funcionarioAtual = BotRepository.listarFuncionarios().filter(function(x) {
            return String(x.codigo) === String(estado.codigoFuncionario);
          })[0];
          if (!clienteAtual || !servicoAtual || !funcionarioAtual) {
            return respostaInicial("Um dos cadastros foi alterado durante a conversa. Vamos iniciar novamente.");
          }
          var conflitosAtuais = BotRepository.listarAgendamentosDoDia(estado.data)
            .filter(function(item) {
              return String(item.codigoFuncionario) === String(estado.codigoFuncionario);
            });
          if (!BotRules.horarioDisponivel(estado.hora, servicoAtual.tempo, conflitosAtuais)) {
            estado.etapa = "hora";
            return retorno("O horário acabou de ficar indisponível. Informe outro horário em HH:MM.", estado);
          }
          var resultado = AgendamentoService.cadastrar({
            data: estado.data,
            hora: estado.hora,
            codigo_funcionario: estado.codigoFuncionario,
            codigo_cliente: clienteAtual.codigo,
            codigo_servico: servicoAtual.codigo,
            status: "AGENDADO"
          });
          return retorno("Solicitação registrada! " + resultado + " A equipe poderá entrar em contato para confirmar os detalhes. Obrigado!", { etapa: "concluido" });

        case "concluido":
          return respostaInicial("Seu pedido já foi registrado. Se precisar de outro, vamos começar novamente.");

        default:
          return respostaInicial();
      }
    } catch (erro) {
      return retorno(erro && erro.message ? erro.message : "Não consegui processar essa resposta. Tente novamente.", estado);
    }
  }

  function respostaInicial(prefixo) {
    return retorno((prefixo ? prefixo + "\n\n" : "") +
      "Olá! Sou o assistente de agendamento. Para começar, informe seu CPF (somente números).", { etapa: "cpf" });
  }

  function retorno(mensagem, sessao) {
    return { mensagem: mensagem, sessao: sessao };
  }

  function listarNomes_(itens) {
    if (!itens || !itens.length) return "No momento não há opções cadastradas. Entre em contato com a equipe.";
    return itens.map(function(item) { return item.nome; }).join(", ");
  }

  return { processar: processar };
})();

/**
 * Único ponto de entrada público do BOT.
 *
 * @param {string} mensagem Texto enviado pelo visitante.
 * @param {Object} sessao Estado da conversa devolvido pelo servidor.
 * @return {{mensagem:string,sessao:Object}} Próxima resposta e estado.
 */
function botProcessarMensagem(mensagem, sessao) {
  return BotService.processar(mensagem, sessao);
}
