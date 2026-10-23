/**
 * Entidade: Agendamento
 * Camada: Rules — Regras de Negócio
 *
 * Responsabilidade:
 * Centralizar regras próprias do domínio de Agendamento.
 *
 * Regras atualmente existentes no sistema:
 * - status aceitos para o agendamento;
 * - funcionário, cliente e serviço selecionados precisam existir;
 * - o valor do agendamento vem do cadastro do serviço;
 * - a data é convertida de forma segura antes de ser persistida.
 *
 * Este arquivo não acessa diretamente o Google Sheets.
 */
var AgendamentoRules = (function() {

  /**
   * Status permitidos pela regra atual do sistema.
   */
  var STATUS_VALIDOS = [
    "AGENDADO",
    "CONFIRMADO",
    "CONCLUÍDO",
    "CANCELADO"
  ];


  /**
   * Normaliza o status recebido da interface.
   *
   * @param {*} status Status informado.
   * @return {string} Status sem espaços externos e em letras maiúsculas.
   */
  function normalizarStatus(status) {
    return String(status).trim().toUpperCase();
  }


  /**
   * Valida se o status pertence à lista aceita pelo sistema.
   *
   * @param {string} status Status já normalizado.
   * @return {void}
   * @throws {Error} Quando o status não é permitido.
   */
  function validarStatus(status) {
    if (STATUS_VALIDOS.indexOf(status) === -1) {
      throw new Error("Selecione um status válido.");
    }
  }


  /**
   * Garante que as entidades relacionadas selecionadas ainda existem.
   *
   * Essa validação é importante porque a interface pode ter carregado
   * uma lista e, antes da gravação, algum cadastro pode ter sido alterado
   * ou removido da planilha.
   *
   * @param {Object|null} funcionario Funcionário encontrado pelo Repository.
   * @param {Object|null} cliente Cliente encontrado pelo Repository.
   * @param {Object|null} servico Serviço encontrado pelo Repository.
   * @return {void}
   * @throws {Error} Quando alguma referência não existe.
   */
  function validarReferencias(funcionario, cliente, servico) {
    if (!funcionario) {
      throw new Error("O funcionário selecionado não foi encontrado.");
    }

    if (!cliente) {
      throw new Error("O cliente selecionado não foi encontrado.");
    }

    if (!servico) {
      throw new Error("O serviço selecionado não foi encontrado.");
    }
  }


  /**
   * Converte a data textual do formulário em um objeto Date.
   *
   * O horário 12:00 é utilizado para preservar o comportamento do código
   * original e reduzir problemas de interpretação de data/fuso ao gravar
   * somente o dia na planilha.
   *
   * @param {string} dataTexto Data no formato AAAA-MM-DD.
   * @return {Date} Data pronta para persistência.
   */
  function criarDataPlanilha(dataTexto) {
    var partes = dataTexto.split("-");

    return new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2]),
      12, 0, 0
    );
  }


  /**
   * Obtém o valor que deve ser usado no agendamento.
   *
   * Regra importante:
   * o valor não é confiado ao formulário. Ele é obtido do cadastro
   * do serviço localizado pelo Repository.
   *
   * @param {Object} servico Serviço encontrado no cadastro.
   * @return {number} Valor atual do serviço.
   */
  function obterValorServico(servico) {
    return Number(servico.valor) || 0;
  }


  return {
    normalizarStatus: normalizarStatus,
    validarStatus: validarStatus,
    validarReferencias: validarReferencias,
    criarDataPlanilha: criarDataPlanilha,
    obterValorServico: obterValorServico
  };

})();
