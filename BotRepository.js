/**
 * Entidade: BOT de Agendamento
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Reunir as consultas mínimas necessárias ao atendimento. O acesso ao
 * Google Sheets continua delegado aos Repositories das entidades.
 *
 * Dependências: AgendamentoRepository e ClienteRepository.
 */
var BotRepository = (function() {
  function listarServicos() { return AgendamentoRepository.listarServicos(); }
  function listarFuncionarios() { return AgendamentoRepository.listarFuncionarios(); }
  function buscarClientePorCpf(cpf, finalCelular) {
    return ClienteRepository.buscarResumoPorCpf(cpf, finalCelular);
  }
  function buscarClientePorCodigo(codigo) {
    return AgendamentoRepository.buscarClientePorCodigo(codigo);
  }
  function listarAgendamentosDoDia(dataTexto) {
    return AgendamentoRepository.listarPorData(dataTexto);
  }
  return {
    listarServicos: listarServicos,
    listarFuncionarios: listarFuncionarios,
    buscarClientePorCpf: buscarClientePorCpf,
    buscarClientePorCodigo: buscarClientePorCodigo,
    listarAgendamentosDoDia: listarAgendamentosDoDia
  };
})();