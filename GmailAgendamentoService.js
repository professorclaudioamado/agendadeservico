/**
 * Entidade: GmailAgendamento
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar a primeira etapa da integração: ler e-mails com assunto exato
 * "AGENDAMENTO", analisar o corpo e registrar um diagnóstico nos logs.
 *
 * Importante:
 * Esta etapa é somente de leitura. Nenhum agendamento é gravado na planilha,
 * nenhuma mensagem é alterada e ainda não há marcação persistente de mensagens
 * processadas. A inclusão automática será desenvolvida após validar este fluxo.
 *
 * Dependências principais:
 * - GmailAgendamentoRepository
 * - GmailAgendamentoValidator
 */
var GmailAgendamentoService = (function() {

  /**
   * Analisa as mensagens encontradas e registra resultados sem gravar dados.
   *
   * @return {{mensagensAnalisadas:number, validas:number, comErros:number}}
   *         Contagem de mensagens analisadas nesta execução.
   */
  function verificarEmailsAgendamento() {
    var mensagens = GmailAgendamentoRepository
      .listarMensagensComAssuntoAgendamento();
    var resumo = {
      mensagensAnalisadas: 0,
      validas: 0,
      comErros: 0
    };

    for (var i = 0; i < mensagens.length; i++) {
      var mensagem = mensagens[i];
      var analise = GmailAgendamentoValidator.analisarCorpo(
        mensagem.getPlainBody()
      );

      resumo.mensagensAnalisadas++;
      if (analise.erros.length === 0) {
        resumo.validas++;
      } else {
        resumo.comErros++;
      }

      // Não registrar o corpo completo nem outros dados pessoais desnecessários.
      Logger.log(JSON.stringify({
        etapa: "DIAGNOSTICO_GMAIL_AGENDAMENTO",
        messageId: mensagem.getId(),
        assunto: mensagem.getSubject(),
        remetente: mensagem.getFrom(),
        recebidaEm: mensagem.getDate().toISOString(),
        cliente: analise.cliente,
        servico: analise.servico,
        dataOriginal: analise.data,
        dataISO: analise.dataISO,
        hora: analise.hora,
        validaFormatoEmail: analise.erros.length === 0,
        pendencias: analise.erros,
        observacao: "Etapa de diagnóstico: nenhum agendamento foi gravado."
      }));
    }

    Logger.log("Resumo da verificação de e-mails: " + JSON.stringify(resumo));
    return resumo;
  }

  return {
    verificarEmailsAgendamento: verificarEmailsAgendamento
  };
})();

/**
 * Ponto de entrada público para execução manual pelo editor do Apps Script.
 *
 * Execute esta função na primeira etapa para conferir os resultados nos logs.
 * Ela não cria agendamentos nem modifica mensagens do Gmail.
 *
 * @return {{mensagensAnalisadas:number, validas:number, comErros:number}}
 *         Resumo da análise realizada.
 */
function verificarEmailsAgendamento() {
  return GmailAgendamentoService.verificarEmailsAgendamento();
}
