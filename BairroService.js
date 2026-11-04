/**
 * Entidade: Bairro
 * Camada: Service — Camada de Serviço
 * Responsabilidade: coordenar validação, localização e cadastro de bairros.
 * Dependências: BairroValidator, BairroRepository e LockService.
 */
var BairroService = (function() {
  /** Cadastra um bairro pelo fluxo tradicional, preservado por compatibilidade.
   * @param {string} nome Nome informado pela interface.
   * @return {string} Mensagem com o código cadastrado.
   */
  function cadastrar(nome) {
    var nomeValidado = BairroValidator.validarCadastro(nome);
    var codigo = BairroRepository.salvar(nomeValidado);
    return "Bairro cadastrado com sucesso! Código: " + codigo;
  }

  /** Localiza o bairro ou cadastra quando não existir.
   * O bloqueio evita duplicidade entre execuções simultâneas deste caso de uso.
   * @param {string} nome Nome recebido da origem dos dados.
   * @return {{codigo: string|number, nome: string, criado: boolean}} Resultado.
   * @throws {Error} Se a validação, consulta, bloqueio ou gravação falhar.
   */
  function localizarOuCadastrar(nome) {
    var nomeValidado = BairroValidator.validarCadastro(nome);
    var bloqueio = LockService.getScriptLock();
    bloqueio.waitLock(10000);
    try {
      var existente = BairroRepository.buscarPorNome(nomeValidado);
      if (existente) {
        return {codigo: existente.codigo, nome: existente.nome, criado: false};
      }
      var codigo = BairroRepository.salvar(nomeValidado);
      return {codigo: codigo, nome: nomeValidado, criado: true};
    } finally {
      bloqueio.releaseLock();
    }
  }

  return {cadastrar: cadastrar, localizarOuCadastrar: localizarOuCadastrar};
})();

/** Mantém o ponto de entrada público já utilizado pela interface.
 * @param {string} nome Nome do bairro.
 * @return {string} Mensagem de sucesso.
 */
function cadastrarBairro(nome) {
  return BairroService.cadastrar(nome);
}
