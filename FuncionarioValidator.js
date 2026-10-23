/**
 * Entidade: Funcionário
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar os dados de entrada do cadastro de funcionário antes que
 * qualquer operação de persistência seja executada.
 *
 * Dependências principais: nenhuma.
 */
var FuncionarioValidator = (function() {
  /**
   * Valida e normaliza o nome do funcionário.
   *
   * @param {string} nome Nome informado pela interface.
   * @return {string} Nome sem espaços nas extremidades e em maiúsculas.
   * @throws {Error} Quando o nome não é informado ou contém apenas espaços.
   */
  function validarCadastro(nome) {
    if (!nome || String(nome).trim() === "") {
      throw new Error("Informe o nome do funcionário.");
    }

    return String(nome).trim().toUpperCase();
  }

  return {
    validarCadastro: validarCadastro
  };
})();
