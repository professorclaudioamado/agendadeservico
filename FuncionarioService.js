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

  /** Consulta um funcionário pelo código. @param {number|string} codigo Código. @return {{codigo:number, nome:string}} Dados do funcionário. */
  function consultar(codigo) {
    if (codigo === null || codigo === undefined || String(codigo).trim() === "") throw new Error("Selecione um funcionário.");
    var funcionario = FuncionarioRepository.buscarPorCodigo(codigo);
    if (!funcionario) throw new Error("Funcionário não encontrado.");
    return funcionario;
  }

  /** Atualiza funcionário existente após validação. @param {number|string} codigo Código. @param {string} nome Novo nome. @return {string} Confirmação. */
  function atualizar(codigo, nome) {
    if (codigo === null || codigo === undefined || String(codigo).trim() === "") throw new Error("Selecione um funcionário para editar.");
    FuncionarioRepository.atualizar(codigo, FuncionarioValidator.validarCadastro(nome));
    return "Funcionário atualizado com sucesso!";
  }

  /** Exclui funcionário pelo código. @param {number|string} codigo Código. @return {string} Confirmação. */
  function excluir(codigo) {
    if (codigo === null || codigo === undefined || String(codigo).trim() === "") throw new Error("Selecione um funcionário para excluir.");
    FuncionarioRepository.excluir(codigo);
    return "Funcionário excluído com sucesso!";
  }

  return { cadastrar: cadastrar, consultar: consultar, atualizar: atualizar, excluir: excluir };
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
