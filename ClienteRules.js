/**
 * Entidade: Cliente
 * Camada: Rules — Regras de Negócio
 *
 * Responsabilidade:
 * Aplicar regras do cadastro de Cliente que dependem de referências de
 * negócio já consultadas pelo Repository, sem acessar diretamente a planilha.
 *
 * Dependências principais:
 * - ClienteValidator: valida formato e normaliza os dados de entrada.
 * - ClienteRepository: fornece os registros de cidade e bairro existentes.
 */
var ClienteRules = (function() {

  /**
   * Confirma que os códigos de cidade e bairro selecionados existem.
   *
   * @param {Object} cliente Dados normalizados do cliente.
   * @param {Object|null} cidade Cidade encontrada pelo Repository.
   * @param {Object|null} bairro Bairro encontrado pelo Repository.
   * @return {void}
   * @throws {Error} Quando cidade ou bairro não existem mais na planilha.
   */
  function validarReferencias(cliente, cidade, bairro) {
    if (!cidade || String(cidade.codigo).trim() !== String(cliente.codigo_cidade).trim()) {
      throw new Error("A cidade selecionada não existe mais na planilha.");
    }

    if (!bairro || String(bairro.codigo).trim() !== String(cliente.codigo_bairro).trim()) {
      throw new Error("O bairro selecionado não existe mais na planilha.");
    }
  }

  return {
    validarReferencias: validarReferencias
  };

})();
