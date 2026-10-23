/**
 * Entidade: Bairro
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar e normalizar os dados recebidos para cadastrar um bairro,
 * sem acessar diretamente o Google Sheets.
 *
 * Dependências principais: nenhuma.
 */
var BairroValidator = (function() {
  /**
   * Valida e normaliza o nome do bairro.
   *
   * @param {string} nome Nome informado pela interface.
   * @return {string} Nome sem espaços externos e em letras maiúsculas.
   * @throws {Error} Quando o nome não é informado.
   */
  function validarCadastro(nome) {
    if (!nome || String(nome).trim() === "") {
      throw new Error("Informe o nome do bairro.");
    }

    return String(nome).trim().toUpperCase();
  }

  return {
    validarCadastro: validarCadastro
  };
})();
