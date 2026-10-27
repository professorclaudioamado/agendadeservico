/**
 * Entidade: GmailAgendamento
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Consultar mensagens do Gmail com assunto exato "AGENDAMENTO" e marcar
 * como processada a conversa cuja solicitação foi gravada com sucesso.
 *
 * O acesso ao Gmail permanece direto pelo serviço nativo GmailApp do
 * Google Apps Script. Não depende de plugins ou conectores externos.
 *
 * Dependências principais:
 * - GmailApp
 */
var GmailAgendamentoRepository = (function() {
  var ASSUNTO_ESPERADO = "AGENDAMENTO";
  var ROTULO_PROCESSADO = "AGENDAMENTO_PROCESSADO";
  var MAX_CONVERSAS_POR_EXECUCAO = 100;

  /**
   * Lista mensagens ainda não marcadas como processadas, na caixa de entrada.
   *
   * @return {GoogleAppsScript.Gmail.GmailMessage[]} Mensagens candidatas.
   */
  function listarMensagensPendentes() {
    var consulta = "in:inbox subject:AGENDAMENTO -label:" + ROTULO_PROCESSADO;
    var conversas = GmailApp.search(consulta, 0, MAX_CONVERSAS_POR_EXECUCAO);
    var mensagensEncontradas = [];

    for (var i = 0; i < conversas.length; i++) {
      var mensagens = conversas[i].getMessages();

      for (var j = 0; j < mensagens.length; j++) {
        var mensagem = mensagens[j];
        var assunto = String(mensagem.getSubject() || "").trim().toUpperCase();

        if (assunto === ASSUNTO_ESPERADO && mensagem.isInInbox()) {
          mensagensEncontradas.push(mensagem);
        }
      }
    }

    return mensagensEncontradas;
  }

  /**
   * Marca a conversa como processada depois que o agendamento foi gravado.
   *
   * O rótulo impede que a mesma conversa seja considerada em verificações
   * futuras. A mensagem não é apagada nem marcada como lida.
   *
   * @param {GoogleAppsScript.Gmail.GmailMessage} mensagem Mensagem processada.
   * @return {void}
   */
  function marcarComoProcessada(mensagem) {
    var rotulo = GmailApp.getUserLabelByName(ROTULO_PROCESSADO);

    if (!rotulo) {
      rotulo = GmailApp.createLabel(ROTULO_PROCESSADO);
    }

    mensagem.getThread().addLabel(rotulo);
  }

  return {
    listarMensagensPendentes: listarMensagensPendentes,
    marcarComoProcessada: marcarComoProcessada
  };
})();
