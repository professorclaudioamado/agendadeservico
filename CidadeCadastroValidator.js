/**
 * Entidade: Cidade
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar e normalizar os dados recebidos para cadastrar uma cidade,
 * sem acessar o Google Sheets.
 *
 * Dependências principais: nenhuma.
 */
var CidadeValidator = (function() {
  /**
   * Unidades federativas aceitas pelo cadastro atual.
   */
  var ESTADOS_VALIDOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES",
    "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
    "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO"
  ];

  /**
   * Valida e normaliza os dados do cadastro de cidade.
   *
   * @param {string} nome Nome da cidade informado pela interface.
   * @param {string} estado Sigla da unidade federativa.
   * @return {{nome: string, estado: string}} Dados prontos para persistência.
   * @throws {Error} Quando nome ou estado forem inválidos.
   */
  function validarCadastro(nome, estado) {
    if (!nome || String(nome).trim() === "") {
      throw new Error("Informe o nome da cidade.");
    }

    if (!estado || String(estado).trim() === "") {
      throw new Error("Informe o estado da cidade.");
    }

    var cidade = {
      nome: String(nome).trim().toUpperCase(),
      estado: String(estado).trim().toUpperCase()
    };

    if (ESTADOS_VALIDOS.indexOf(cidade.estado) === -1) {
      throw new Error("Informe uma sigla válida de estado, como MS ou SP.");
    }

    return cidade;
  }

  return {
    validarCadastro: validarCadastro
  };
})();
