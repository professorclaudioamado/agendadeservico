/**
 * Entidade: Cliente
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar o caso de uso de cadastro de cliente e as consultas necessárias
 * às listas de cidades e bairros, sem acessar diretamente o Google Sheets.
 *
 * Dependências principais:
 * - ClienteValidator
 * - ClienteRules
 * - ClienteRepository
 */
var ClienteService = (function() {

  /**
   * Retorna cidades para a lista suspensa do formulário.
   *
   * @return {Object[]} Cidades cadastradas.
   */
  function listarCidades() {
    return ClienteRepository.listarCidades();
  }

  /**
   * Retorna bairros para a lista suspensa do formulário.
   *
   * @return {Object[]} Bairros cadastrados.
   */
  function listarBairros() {
    return ClienteRepository.listarBairros();
  }

  /**
   * Executa o caso de uso "Cadastrar Cliente".
   *
   * Fluxo:
   * 1. valida e normaliza os dados recebidos;
   * 2. consulta cidade e bairro no Repository;
   * 3. aplica as regras de negócio;
   * 4. solicita ao Repository a gravação do cliente;
   * 5. devolve a mensagem de sucesso mantendo o contrato da interface.
   *
   * @param {Object} dados Dados recebidos do formulário.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando dados ou referências são inválidos.
   */
  function cadastrar(dados) {
    var cliente = ClienteValidator.validarCadastro(dados);

    var cidade = ClienteRepository.buscarCidadePorCodigo(cliente.codigo_cidade);
    var bairro = ClienteRepository.buscarBairroPorCodigo(cliente.codigo_bairro);

    ClienteRules.validarReferencias(cliente, cidade, bairro);

    var codigo = ClienteRepository.salvar(cliente);
    return "Cliente cadastrado com sucesso! Código: " + codigo;
  }

  return {
    listarCidades: listarCidades,
    listarBairros: listarBairros,
    cadastrar: cadastrar
  };

})();


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run utilizado pelo index.html.
 *
 * @return {Object[]} Cidades disponíveis para seleção.
 */
function listarCidadesSelecao() {
  return ClienteService.listarCidades();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run utilizado pelo index.html.
 *
 * @return {Object[]} Bairros disponíveis para seleção.
 */
function listarBairrosSelecao() {
  return ClienteService.listarBairros();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém o nome original chamado pelo index.html.
 *
 * @param {Object} dados Dados do formulário de cliente.
 * @return {string} Mensagem de sucesso.
 */
function cadastrarCliente(dados) {
  return ClienteService.cadastrar(dados);
}
