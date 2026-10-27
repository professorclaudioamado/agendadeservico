/**
 * Entidade: GmailAgendamento
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Consultar mensagens do Gmail que possam representar solicitações de
 * agendamento e entregar somente mensagens cujo assunto seja exatamente
 * "AGENDAMENTO", desconsiderando diferenças entre maiúsculas e minúsculas.
 *
 * Nesta primeira etapa, o arquivo apenas lê o Gmail. Não grava na planilha,
 * não altera mensagens e não marca mensagens como lidas ou processadas.
 *
 * Dependências principais:
 * - GmailApp, serviço nativo do Google Apps Script.
 */
var GmailAgendamentoRepository = (function() {
  var ASSUNTO_ESPERADO = "AGENDAMENTO";
  var MAX_CONVERSAS_POR_EXECUCAO = 100;

  /**
   * Pesquisa conversas candidatas e retorna mensagens com assunto exato.
   *
   * O Gmail pesquisa por assunto para reduzir os resultados; em seguida,
   * cada mensagem é conferida individualmente para excluir assuntos como
   * "Re: AGENDAMENTO" ou "AGENDAMENTO urgente".
   *
   * @return {GoogleAppsScript.Gmail.GmailMessage[]} Mensagens encontradas.
   * @throws {Error} Quando a consulta ao Gmail falha.
   */
  function listarMensagensComAssuntoAgendamento() {
    var conversas = GmailApp.search(
      "subject:AGENDAMENTO",
      0,
      MAX_CONVERSAS_POR_EXECUCAO
    );
    var mensagensEncontradas = [];

    for (var i = 0; i < conversas.length; i++) {
      var mensagens = conversas[i].getMessages();

      for (var j = 0; j < mensagens.length; j++) {
        var assunto = String(mensagens[j].getSubject() || "")
          .trim()
          .toUpperCase();

        if (assunto === ASSUNTO_ESPERADO) {
          mensagensEncontradas.push(mensagens[j]);
        }
      }
    }

    return mensagensEncontradas;
  }

  return {
    listarMensagensComAssuntoAgendamento: listarMensagensComAssuntoAgendamento
  };
})();
