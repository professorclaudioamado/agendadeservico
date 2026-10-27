/**
 * Entidade: GmailAgendamento
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Extrair e validar os campos do e-mail que solicita um agendamento.
 * Não acessa Gmail nem Google Sheets.
 *
 * Campos esperados:
 * - Cliente: nome exato do cadastro;
 * - Serviço: nome exato do cadastro;
 * - Profissional: nome exato do cadastro;
 * - Data: DD/MM/AAAA;
 * - Horário: HH:MM.
 */
var GmailAgendamentoValidator = (function() {
  /**
   * Extrai os campos e verifica os formatos básicos da solicitação.
   *
   * @param {string} corpo Texto simples do e-mail.
   * @return {Object} Campos extraídos e lista de erros.
   */
  function analisarCorpo(corpo) {
    var texto = String(corpo || "");
    var cliente = extrairCampo_(texto, "Cliente");
    var servico = extrairCampo_(texto, "Serviço");
    var profissional = extrairCampo_(texto, "Profissional");
    var data = extrairCampo_(texto, "Data");
    var hora = extrairCampo_(texto, "Horário");
    var erros = [];
    var dataISO = "";

    if (!cliente) erros.push("Campo Cliente ausente ou vazio.");
    if (!servico) erros.push("Campo Serviço ausente ou vazio.");
    if (!profissional) erros.push("Campo Profissional ausente ou vazio.");

    if (!data) {
      erros.push("Campo Data ausente ou vazio.");
    } else {
      dataISO = converterDataParaISO_(data);
      if (!dataISO) erros.push("Data inválida. Use DD/MM/AAAA.");
    }

    if (!hora) {
      erros.push("Campo Horário ausente ou vazio.");
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      erros.push("Horário inválido. Use HH:MM.");
    }

    return {
      cliente: cliente,
      servico: servico,
      profissional: profissional,
      data: data,
      dataISO: dataISO,
      hora: hora,
      erros: erros
    };
  }

  /**
   * Obtém o conteúdo de um campo identificado por "Nome: valor".
   *
   * @param {string} corpo Texto completo do e-mail.
   * @param {string} nomeCampo Nome do campo.
   * @return {string} Valor do campo ou vazio.
   * @private
   */
  function extrairCampo_(corpo, nomeCampo) {
    var linhas = String(corpo || "").split(/\r?\n/);
    var esperado = String(nomeCampo).trim().toLowerCase();

    for (var i = 0; i < linhas.length; i++) {
      var correspondencia = linhas[i].match(/^\s*([^:]+)\s*:\s*(.*?)\s*$/);
      if (correspondencia &&
          correspondencia[1].trim().toLowerCase() === esperado) {
        return correspondencia[2].trim();
      }
    }
    return "";
  }

  /**
   * Converte DD/MM/AAAA para AAAA-MM-DD e rejeita datas inexistentes.
   *
   * @param {string} dataTexto Data informada no e-mail.
   * @return {string} Data ISO ou vazio.
   * @private
   */
  function converterDataParaISO_(dataTexto) {
    var partes = String(dataTexto).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!partes) return "";

    var dia = Number(partes[1]);
    var mes = Number(partes[2]);
    var ano = Number(partes[3]);
    var teste = new Date(ano, mes - 1, dia);

    if (teste.getFullYear() !== ano ||
        teste.getMonth() !== mes - 1 ||
        teste.getDate() !== dia) {
      return "";
    }

    return String(ano).padStart(4, "0") + "-" +
      String(mes).padStart(2, "0") + "-" +
      String(dia).padStart(2, "0");
  }

  return { analisarCorpo: analisarCorpo };
})();
