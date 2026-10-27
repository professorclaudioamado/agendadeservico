/**
 * Entidade: GmailAgendamento
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar a leitura manual de solicitações por e-mail, validar os dados,
 * localizar os cadastros por nome exato e chamar o fluxo existente de
 * AgendamentoService para registrar cada agendamento.
 *
 * Dependências principais:
 * - GmailAgendamentoRepository
 * - GmailAgendamentoValidator
 * - AgendamentoRepository
 * - AgendamentoService
 */
var GmailAgendamentoService = (function() {
  /**
   * Verifica e processa mensagens pendentes encontradas na caixa de entrada.
   *
   * Cada mensagem é tratada isoladamente. Mensagens inválidas ou com nomes
   * inexistentes/ambíguos não são marcadas como processadas, permitindo
   * corrigir o cadastro ou o e-mail e tentar novamente.
   *
   * @return {Object} Resumo com contagens e resultados por mensagem.
   */
  function verificarEmailsAgendamento() {
    var mensagens = GmailAgendamentoRepository.listarMensagensPendentes();
    var resumo = {
      mensagensAnalisadas: 0,
      criados: 0,
      comErros: 0,
      resultados: []
    };

    for (var i = 0; i < mensagens.length; i++) {
      var mensagem = mensagens[i];
      resumo.mensagensAnalisadas++;

      try {
        var analise = GmailAgendamentoValidator.analisarCorpo(
          mensagem.getPlainBody()
        );

        if (analise.erros.length) {
          throw new Error(analise.erros.join(" "));
        }

        var funcionario = localizarUnicoPorNome_(
          AgendamentoRepository.listarFuncionarios(),
          analise.profissional,
          "profissional"
        );
        var cliente = localizarUnicoPorNome_(
          AgendamentoRepository.listarClientes(),
          analise.cliente,
          "cliente"
        );
        var servico = localizarUnicoPorNome_(
          AgendamentoRepository.listarServicos(),
          analise.servico,
          "serviço"
        );

        var resposta = AgendamentoService.cadastrar({
          data: analise.dataISO,
          hora: analise.hora,
          codigo_funcionario: funcionario.codigo,
          codigo_cliente: cliente.codigo,
          codigo_servico: servico.codigo,
          status: "AGENDADO"
        });

        // Marcar somente depois de a gravação retornar sucesso.
        GmailAgendamentoRepository.marcarComoProcessada(mensagem);
        resumo.criados++;
        resumo.resultados.push({
          sucesso: true,
          mensagem: "Agendamento criado para " + analise.cliente +
            " — " + analise.servico + ", " + analise.data + " às " +
            analise.hora + ". " + resposta
        });
      } catch (erro) {
        resumo.comErros++;
        resumo.resultados.push({
          sucesso: false,
          mensagem: "E-mail recebido em " +
            Utilities.formatDate(mensagem.getDate(), Session.getScriptTimeZone(),
              "dd/MM/yyyy HH:mm") + ": " +
            (erro && erro.message ? erro.message : String(erro))
        });
      }
    }

    return resumo;
  }

  /**
   * Localiza exatamente um cadastro pelo nome, sem aproximações.
   *
   * @param {Object[]} registros Registros carregados do repositório.
   * @param {string} nome Nome informado no e-mail.
   * @param {string} tipo Tipo de cadastro para a mensagem de erro.
   * @return {Object} Registro correspondente.
   * @throws {Error} Quando não há correspondência única.
   * @private
   */
  function localizarUnicoPorNome_(registros, nome, tipo) {
    var encontrados = registros.filter(function(registro) {
      return String(registro.nome || "").trim() === String(nome).trim();
    });

    if (encontrados.length === 0) {
      throw new Error("Não foi encontrado " + tipo +
        ' com o nome exato "' + nome + '" na planilha.');
    }
    if (encontrados.length > 1) {
      throw new Error("Há mais de um " + tipo +
        ' com o nome "' + nome + '". Verifique os cadastros.');
    }
    return encontrados[0];
  }

  return { verificarEmailsAgendamento: verificarEmailsAgendamento };
})();

/**
 * Ponto de entrada usado pelo botão da tela Agenda e pelo editor Apps Script.
 *
 * @return {Object} Resultado resumido do processamento de e-mails.
 */
function verificarEmailsAgendamento() {
  return GmailAgendamentoService.verificarEmailsAgendamento();
}
