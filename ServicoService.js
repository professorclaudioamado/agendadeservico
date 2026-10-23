/**
 * Entidade: Serviço
 * Camada: Service — Serviço de aplicação
 *
 * Responsabilidade:
 * Coordenar o cadastro de serviço, encaminhando os dados ao Validator e
 * delegando a persistência ao Repository.
 */
var ServicoService = (function() {
  /**
   * Executa o caso de uso de cadastro de serviço.
   * @param {string} nome Nome do serviço.
   * @param {string|number} valor Valor informado no formulário.
   * @param {string|number} tempo Duração em minutos.
   * @return {string} Mensagem de sucesso com o código gerado.
   */
  function cadastrar(nome, valor, tempo) {
    var servico = ServicoValidator.validarCadastro(nome, valor, tempo);
    var codigo = ServicoRepository.salvar(servico);
    return "Serviço cadastrado com sucesso! Código: " + codigo;
  }

  return {
    cadastrar: cadastrar
  };
})();

/**
 * Ponto de entrada público mantido para compatibilidade com index.html.
 *
 * @param {string} nome Nome do serviço.
 * @param {string|number} valor Valor do serviço.
 * @param {string|number} tempo Duração em minutos.
 * @return {string} Mensagem de sucesso do cadastro.
 */
function cadastrarServico(nome, valor, tempo) {
  return ServicoService.cadastrar(nome, valor, tempo);
}
