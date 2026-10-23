/**
 * Entidade: Cidade
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar o caso de uso de cadastro de cidade, delegando a validação ao
 * Validator e a persistência ao Repository.
 *
 * Dependências principais:
 * - CidadeValidator
 * - CidadeRepository
 */
var CidadeService = (function() {
  /**
   * Cadastra uma cidade após validar e normalizar os dados.
   *
   * @param {string} nome Nome da cidade.
   * @param {string} estado Sigla da unidade federativa.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando os dados forem inválidos ou a gravação falhar.
   */
  function cadastrar(nome, estado) {
    var cidade = CidadeValidator.validarCadastro(nome, estado);
    var codigo = CidadeRepository.salvar(cidade);

    return "Cidade cadastrada com sucesso! Código: " + codigo;
  }

  return {
    cadastrar: cadastrar
  };
})();

/**
 * Ponto de entrada público mantido para compatibilidade com index.html.
 *
 * @param {string} nome Nome da cidade informado pela interface.
 * @param {string} estado Sigla da unidade federativa.
 * @return {string} Mensagem de sucesso do cadastro.
 */
function cadastrarCidade(nome, estado) {
  return CidadeService.cadastrar(nome, estado);
}
