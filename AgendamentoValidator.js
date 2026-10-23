/**
 * Entidade: Agendamento
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar os dados de entrada recebidos no caso de uso de Agendamento.
 *
 * Este arquivo valida:
 * - presença dos campos obrigatórios;
 * - formato e existência da data;
 * - formato da hora.
 *
 * Importante:
 * Regras de negócio, como os status permitidos, pertencem a
 * AgendamentoRules.js e não a este arquivo.
 */
var AgendamentoValidator = (function() {

  /**
   * Valida os dados necessários para cadastrar um agendamento.
   *
   * @param {Object} dados Dados recebidos da interface.
   * @return {void}
   * @throws {Error} Quando algum dado obrigatório ou formato é inválido.
   */
  function validarCadastro(dados) {
    if (!dados) {
      throw new Error("Os dados do agendamento não foram recebidos.");
    }

    validarCamposObrigatorios_(dados);
    validarData_(String(dados.data).trim());
    validarHora_(String(dados.hora).trim());
  }


  /**
   * Confere os campos obrigatórios do formulário.
   *
   * @param {Object} dados Dados recebidos da interface.
   * @return {void}
   * @throws {Error} Quando um campo obrigatório não foi preenchido.
   * @private
   */
  function validarCamposObrigatorios_(dados) {
    var campos = [
      ["data", "Data"],
      ["hora", "Hora"],
      ["codigo_funcionario", "Funcionário"],
      ["codigo_cliente", "Cliente"],
      ["codigo_servico", "Serviço"],
      ["status", "Status"]
    ];

    for (var i = 0; i < campos.length; i++) {
      var chave = campos[i][0];

      if (dados[chave] == null || String(dados[chave]).trim() === "") {
        throw new Error("Preencha o campo: " + campos[i][1] + ".");
      }
    }
  }


  /**
   * Valida uma data no formato AAAA-MM-DD e confirma que ela existe.
   *
   * Exemplo válido: 2026-10-13.
   *
   * @param {string} dataTexto Data informada pela interface.
   * @return {void}
   * @throws {Error} Quando o formato é inválido ou a data não existe.
   * @private
   */
  function validarData_(dataTexto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataTexto)) {
      throw new Error("Informe uma data válida.");
    }

    var partes = dataTexto.split("-");

    var dataTeste = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

    if (
      dataTeste.getFullYear() !== Number(partes[0]) ||
      dataTeste.getMonth() !== Number(partes[1]) - 1 ||
      dataTeste.getDate() !== Number(partes[2])
    ) {
      throw new Error("A data informada não existe.");
    }
  }


  /**
   * Valida o horário no formato HH:MM.
   *
   * @param {string} horaTexto Horário informado pela interface.
   * @return {void}
   * @throws {Error} Quando o horário não está no formato esperado.
   * @private
   */
  function validarHora_(horaTexto) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaTexto)) {
      throw new Error("Informe a hora no formato HH:MM.");
    }
  }


  return {
    validarCadastro: validarCadastro
  };

})();
