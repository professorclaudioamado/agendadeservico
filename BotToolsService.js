/**
 * Entidade: BOT de Agendamento
 * Camada: Service — Ferramentas autorizadas da IA
 *
 * Responsabilidade:
 * Disponibilizar consultas de leitura que a IA pode solicitar durante a
 * conversa. A IA nunca acessa o Google Sheets diretamente e não recebe
 * permissão para gravar, alterar ou cancelar dados.
 *
 * Dependências: BotRepository, BotRules e BotValidator.
 */
var BotToolsService = (function() {
  function listarFerramentas() {
    return [
      ferramenta_("consultar_servicos",
        "Consulta os serviços cadastrados, incluindo preço e duração.",
        { type: "object", properties: {}, required: [], additionalProperties: false }),
      ferramenta_("consultar_profissionais",
        "Consulta os profissionais cadastrados.",
        { type: "object", properties: {}, required: [], additionalProperties: false }),
      ferramenta_("consultar_agenda",
        "Consulta agendamentos registrados em uma data. Data no formato AAAA-MM-DD. Pode filtrar por profissional.",
        {
          type: "object",
          properties: {
            data: { type: "string", description: "Data AAAA-MM-DD." },
            profissional: { type: "string", description: "Nome do profissional, opcional." }
          },
          required: ["data"],
          additionalProperties: false
        }),
      ferramenta_("verificar_horario",
        "Verifica conflito de um horário específico considerando a duração do serviço. Não confirma que o horário esteja dentro do expediente do profissional.",
        {
          type: "object",
          properties: {
            servico: { type: "string" },
            profissional: { type: "string" },
            data: { type: "string", description: "Data AAAA-MM-DD." },
            hora: { type: "string", description: "Horário HH:MM." }
          },
          required: ["servico", "profissional", "data", "hora"],
          additionalProperties: false
        })
    ];
  }

  /**
   * Despacha a solicitação por um registro explícito de funções permitidas.
   * @param {string} nome Nome da ferramenta solicitada pelo modelo.
   * @param {Object} argumentos Argumentos já convertidos de JSON.
   * @return {Object} Resultado da consulta autorizada.
   */
  function executar(nome, argumentos) {
    var executor = executores_[String(nome || "")];
    if (typeof executor !== "function") {
      throw new Error("A IA solicitou uma ferramenta não autorizada.");
    }
    if (!argumentos || typeof argumentos !== "object" || Array.isArray(argumentos)) {
      throw new Error("Os argumentos da consulta são inválidos.");
    }
    return executor(argumentos);
  }

  var executores_ = {
    consultar_servicos: function() {
      return {
        servicos: BotRepository.listarServicos().map(function(item) {
          return {
            nome: String(item.nome),
            valor: Number(item.valor) || 0,
            duracao_minutos: Number(item.tempo) || 0
          };
        })
      };
    },
    consultar_profissionais: function() {
      return {
        profissionais: BotRepository.listarFuncionarios().map(function(item) {
          return { nome: String(item.nome) };
        })
      };
    },
    consultar_agenda: function(args) {
      var data = validarDataISO_(args.data);
      var profissional = args.profissional ? localizarProfissional_(args.profissional) : null;
      var agendamentos = BotRepository.listarAgendamentosDoDia(data);
      if (profissional) {
        agendamentos = agendamentos.filter(function(item) {
          return String(item.codigoFuncionario) === String(profissional.codigo);
        });
      }
      var nomes = {};
      BotRepository.listarFuncionarios().forEach(function(item) {
        nomes[String(item.codigo)] = item.nome;
      });
      return {
        data: data,
        agendamentos: agendamentos.map(function(item) {
          return {
            profissional: nomes[String(item.codigoFuncionario)] || "Profissional cadastrado",
            hora: item.hora,
            duracao_minutos: Number(item.duracao) || 30
          };
        })
      };
    },
    verificar_horario: function(args) {
      var data = validarDataISO_(args.data);
      var hora = BotValidator.validarHora(args.hora);
      var servico = localizarServico_(args.servico);
      var profissional = localizarProfissional_(args.profissional);
      var agendamentos = BotRepository.listarAgendamentosDoDia(data).filter(function(item) {
        return String(item.codigoFuncionario) === String(profissional.codigo);
      });
      return {
        disponivel_na_agenda: BotRules.horarioDisponivel(hora, servico.tempo, agendamentos),
        servico: servico.nome,
        profissional: profissional.nome,
        data: data,
        hora: hora,
        duracao_minutos: Number(servico.tempo) || 30,
        limite_consulta: "Verifica apenas conflitos registrados. Expediente, intervalos e folgas não estão cadastrados nesta integração."
      };
    }
  };

  function ferramenta_(nome, descricao, parametros) {
    return { type: "function", function: { name: nome, description: descricao, parameters: parametros } };
  }
  function localizarServico_(nome) {
    var item = BotRules.localizarPorNome(BotRepository.listarServicos(), nome);
    if (!item) throw new Error("O serviço não corresponde a um único cadastro.");
    return item;
  }
  function localizarProfissional_(nome) {
    var item = BotRules.localizarPorNome(BotRepository.listarFuncionarios(), nome);
    if (!item) throw new Error("O profissional não corresponde a um único cadastro.");
    return item;
  }
  function validarDataISO_(valor) {
    var texto = String(valor || "");
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(texto)) throw new Error("Informe uma data válida no formato AAAA-MM-DD.");
    var p = texto.split("-").map(Number);
    var data = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (data.getUTCFullYear() !== p[0] || data.getUTCMonth() !== p[1] - 1 || data.getUTCDate() !== p[2]) {
      throw new Error("A data solicitada não existe.");
    }
    return texto;
  }
  return { listarFerramentas: listarFerramentas, executar: executar };
})();
