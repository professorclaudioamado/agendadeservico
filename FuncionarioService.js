/**
 * Entidade: Funcionário
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar o caso de uso de cadastro de funcionário, delegando a
 * validação ao Validator e a persistência ao Repository.
 *
 * Dependências principais:
 * - FuncionarioValidator
 * - FuncionarioRepository
 */
var FuncionarioService = (function() {
  /**
   * Cadastra um funcionário após validar e normalizar o nome.
   *
   * @param {string} nome Nome recebido da interface.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando os dados são inválidos ou a gravação falha.
   */
  function cadastrar(nome) {
    var nomeValidado = FuncionarioValidator.validarCadastro(nome);
    var codigo = FuncionarioRepository.salvar(nomeValidado);

    return "Funcionário cadastrado com sucesso! Código: " + codigo;
  }

  return {
    cadastrar: cadastrar
  };
})();

/**
 * Ponto de entrada público mantido para compatibilidade com index.html.
 *
 * @param {string} nome Nome do funcionário informado pela interface.
 * @return {string} Mensagem de sucesso do cadastro.
 */
function cadastrarFuncionario(nome) {
  return FuncionarioService.cadastrar(nome);
}
