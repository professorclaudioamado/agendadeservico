/**
 * Entidade: Agendamento
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar os casos de uso da Agenda de Atendimento.
 *
 * Dependências principais:
 * - AgendamentoValidator
 * - AgendamentoRules
 * - AgendamentoRepository
 *
 * O Service não acessa diretamente o Google Sheets.
 */
var AgendamentoService = (function() {

  /**
   * Retorna funcionários para a lista suspensa da Agenda.
   *
   * @return {Object[]} Funcionários disponíveis.
   */
  function listarFuncionarios() {
    return AgendamentoRepository.listarFuncionarios();
  }


  /**
   * Retorna clientes para a lista suspensa da Agenda.
   *
   * @return {Object[]} Clientes disponíveis.
   */
  function listarClientes() {
    return AgendamentoRepository.listarClientes();
  }


  /**
   * Retorna serviços para a lista suspensa da Agenda.
   *
   * @return {Object[]} Serviços disponíveis.
   */
  function listarServicos() {
    return AgendamentoRepository.listarServicos();
  }


  /**
   * Executa o caso de uso "Cadastrar Agendamento".
   *
   * Fluxo:
   * 1. valida dados de entrada;
   * 2. normaliza os dados;
   * 3. aplica regras de negócio;
   * 4. consulta as referências necessárias;
   * 5. monta os dados de persistência;
   * 6. solicita a gravação ao Repository.
   *
   * @param {Object} dados Dados recebidos da interface.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando qualquer validação ou regra falhar.
   */
  function cadastrar(dados) {
    AgendamentoValidator.validarEdicao(dados);

    var dataTexto = String(dados.data).trim();
    var horaTexto = String(dados.hora).trim();
    var codigoFuncionario = String(dados.codigo_funcionario).trim();
    var codigoCliente = String(dados.codigo_cliente).trim();
    var codigoServico = String(dados.codigo_servico).trim();
    var status = AgendamentoRules.normalizarStatus(dados.status);

    AgendamentoRules.validarStatus(status);

    var funcionario = AgendamentoRepository
      .buscarFuncionarioPorCodigo(codigoFuncionario);

    var cliente = AgendamentoRepository
      .buscarClientePorCodigo(codigoCliente);

    var servico = AgendamentoRepository
      .buscarServicoPorCodigo(codigoServico);

    AgendamentoRules.validarReferencias(
      funcionario,
      cliente,
      servico
    );

    var agendamento = {
      data: AgendamentoRules.criarDataPlanilha(dataTexto),
      hora: horaTexto,
      codigoFuncionario: Number(codigoFuncionario),
      codigoCliente: Number(codigoCliente),
      codigoServico: Number(codigoServico),

      // Regra preservada do código original:
      // o valor vem do cadastro do serviço, e não do formulário.
      valor: AgendamentoRules.obterValorServico(servico),

      status: status
    };

    var codigoAgendamento = AgendamentoRepository.salvar(agendamento);

    return "Agendamento cadastrado com sucesso! Código: " +
      codigoAgendamento;
  }



  /** Consulta um agendamento pelo código para exibição ou edição. */
  function consultar(codigo) {
    var agendamento = AgendamentoRepository.buscarPorCodigo(codigo);
    if (!agendamento) throw new Error("Agendamento não encontrado.");
    return agendamento;
  }


  /**
   * Atualiza os dados completos de um agendamento existente.
   * @param {number|string} codigo Código do registro.
   * @param {Object} dados Dados recebidos da interface.
   * @return {string} Mensagem de confirmação.
   */
  function atualizar(codigo, dados) {
    AgendamentoValidator.validarCadastro(dados);
    var status = AgendamentoRules.normalizarStatus(dados.status);
    AgendamentoRules.validarStatus(status);
    var funcionario = AgendamentoRepository.buscarFuncionarioPorCodigo(dados.codigo_funcionario);
    var cliente = AgendamentoRepository.buscarClientePorCodigo(dados.codigo_cliente);
    var servico = AgendamentoRepository.buscarServicoPorCodigo(dados.codigo_servico);
    AgendamentoRules.validarReferencias(funcionario, cliente, servico);
    AgendamentoRepository.atualizar(codigo, {
      data: AgendamentoRules.criarDataPlanilha(String(dados.data).trim()),
      hora: String(dados.hora).trim(),
      codigoFuncionario: Number(dados.codigo_funcionario),
      codigoCliente: Number(dados.codigo_cliente),
      codigoServico: Number(dados.codigo_servico),
      valor: AgendamentoRules.obterValorServico(servico),
      status: status
    });
    return "Agendamento " + codigo + " atualizado com sucesso.";
  }


  /** Altera somente o status, sem modificar os demais dados. */
  function alterarStatus(codigo, novoStatus) {
    var status = AgendamentoRules.normalizarStatus(novoStatus);
    AgendamentoRules.validarStatus(status);
    consultar(codigo);
    AgendamentoRepository.atualizarStatus(codigo, status);
    return "Status do agendamento " + codigo + " alterado para " + status + ".";
  }


  return {
    consultar: consultar,
    atualizar: atualizar,
    alterarStatus: alterarStatus,
    listarFuncionarios: listarFuncionarios,
    listarClientes: listarClientes,
    listarServicos: listarServicos,
    cadastrar: cadastrar
  };

})();


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém o mesmo nome utilizado pelo index.html antes da refatoração.
 * Dessa forma, o frontend não precisa ser alterado.
 *
 * @return {Object[]} Funcionários disponíveis para a Agenda.
 */
function listarFuncionariosAgenda() {
  return AgendamentoService.listarFuncionarios();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run existente no index.html.
 *
 * @return {Object[]} Clientes disponíveis para a Agenda.
 */
function listarClientesAgenda() {
  return AgendamentoService.listarClientes();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run existente no index.html.
 *
 * @return {Object[]} Serviços disponíveis para a Agenda.
 */
function listarServicosAgenda() {
  return AgendamentoService.listarServicos();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém o nome original chamado pelo frontend.
 *
 * @param {Object} dados Dados do formulário de agendamento.
 * @return {string} Mensagem de sucesso.
 */
function cadastrarAgendamento(dados) {
  return AgendamentoService.cadastrar(dados);
}


/** PONTO DE ENTRADA DA INTERFACE: consulta um agendamento pelo código. */
function consultarAgendamento(codigo) {
  return AgendamentoService.consultar(codigo);
}

/** PONTO DE ENTRADA DA INTERFACE: atualiza os dados de um agendamento. */
function atualizarAgendamento(codigo, dados) {
  return AgendamentoService.atualizar(codigo, dados);
}

/** PONTO DE ENTRADA DA INTERFACE: altera somente o status do agendamento. */
function alterarStatusAgendamento(codigo, status) {
  return AgendamentoService.alterarStatus(codigo, status);
}
