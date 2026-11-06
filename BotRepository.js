/**
 * Entidade: BOT de Agendamento
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Reunir consultas públicas e mínimas necessárias ao atendimento conversacional.
 * O acesso ao Google Sheets permanece delegado aos Repositories das entidades.
 *
 * Dependências:
 * - AgendamentoRepository
 * - ClienteRepository
 */
var BotRepository = (function() {
  function listarServicos() {
    return AgendamentoRepository.listarServicos();
  }

  function listarFuncionarios() {
    return AgendamentoRepository.listarFuncionarios();
  }

  function buscarClientePorCpf(cpf, finalCelular) {
    return ClienteRepository.buscarResumoPorCpf(cpf, finalCelular);
  }

  function listarAgendamentosDoDia(dataTexto) {
    return AgendamentoRepository.listarPorData(dataTexto);
  }

  return {
    listarServicos: listarServicos,
    listarFuncionarios: listarFuncionarios,
    buscarClientePorCpf: buscarClientePorCpf,
    listarAgendamentosDoDia: listarAgendamentosDoDia
  };
})();
