/**
 * Entidade: GmailAgendamento
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Extrair e validar os campos definidos no formato de e-mail de solicitação
 * de agendamento, sem consultar Gmail ou Google Sheets.
 *
 * Campos esperados no corpo:
 * - Cliente: nome do cliente;
 * - Serviço: nome do serviço;
 * - Data: DD/MM/AAAA;
 * - Horário: HH:MM.
 */
var GmailAgendamentoValidator = (function() {

  /**
   * Extrai e valida os campos do corpo de um e-mail.
   *
   * @param {string} corpo Texto simples do e-mail.
   * @return {{cliente:string, servico:string, data:string, hora:string,
   *           dataISO:string, erros:string[]}} Resultado da análise.
   */
  function analisarCorpo(corpo) {
    var texto = String(corpo || "");
    var cliente = extrairCampo_(texto, "Cliente");
    var servico = extrairCampo_(texto, "Serviço");
    var data = extrairCampo_(texto, "Data");
    var hora = extrairCampo_(texto, "Horário");
    var erros = [];
    var dataISO = "";

    if (!cliente) erros.push("Campo Cliente ausente ou vazio.");
    if (!servico) erros.push("Campo Serviço ausente ou vazio.");

    if (!data) {
      erros.push("Campo Data ausente ou vazio.");
    } else {
      dataISO = converterDataParaISO_(data);
      if (!dataISO) {
        erros.push("Data inválida. Use o formato DD/MM/AAAA.");
      }
    }

    if (!hora) {
      erros.push("Campo Horário ausente ou vazio.");
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      erros.push("Horário inválido. Use o formato HH:MM.");
    }

    return {
      cliente: cliente,
      servico: servico,
      data: data,
      hora: hora,
      dataISO: dataISO,
      erros: erros
    };
  }

  /**
   * Localiza o valor de um campo no corpo, ignorando maiúsculas/minúsculas.
   * Considera o valor até o final da linha.
   *
   * @param {string} corpo Corpo do e-mail.
   * @param {string} nomeCampo Nome do campo esperado.
   * @return {string} Valor encontrado ou texto vazio.
   * @private
   */
  function extrairCampo_(corpo, nomeCampo) {
    var linhas = String(corpo || "").split(/\r?\n/);
    var campoEsperado = String(nomeCampo).trim().toLowerCase();

    for (var i = 0; i < linhas.length; i++) {
      var correspondencia = linhas[i].match(/^\s*([^:]+)\s*:\s*(.*?)\s*$/);

      if (
        correspondencia &&
        correspondencia[1].trim().toLowerCase() === campoEsperado
      ) {
        return correspondencia[2].trim();
      }
    }

    return "";
  }

  /**
   * Converte DD/MM/AAAA para AAAA-MM-DD somente quando a data existe.
   *
   * @param {string} dataTexto Data textual do e-mail.
   * @return {string} Data ISO ou texto vazio para data inválida.
   * @private
   */
  function converterDataParaISO_(dataTexto) {
    var correspondencia = String(dataTexto).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!correspondencia) return "";

    var dia = Number(correspondencia[1]);
    var mes = Number(correspondencia[2]);
    var ano = Number(correspondencia[3]);
    var dataTeste = new Date(ano, mes - 1, dia);

    if (
      dataTeste.getFullYear() !== ano ||
      dataTeste.getMonth() !== mes - 1 ||
      dataTeste.getDate() !== dia
    ) {
      return "";
    }

    return String(ano).padStart(4, "0") + "-" +
      String(mes).padStart(2, "0") + "-" +
      String(dia).padStart(2, "0");
  }

  return {
    analisarCorpo: analisarCorpo
  };
})();
