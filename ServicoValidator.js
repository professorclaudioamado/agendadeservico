/**
 * Entidade: Serviço
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar e normalizar os dados recebidos para cadastrar um serviço,
 * sem acessar o Google Sheets.
 *
 * As mensagens e os critérios de validação preservam o comportamento
 * anterior da função cadastrarServico(nome, valor, tempo).
 */
var ServicoValidator = (function() {
  /**
   * Valida os dados do formulário e devolve os valores normalizados.
   *
   * @param {string} nome Nome do serviço.
   * @param {string|number} valor Valor monetário informado.
   * @param {string|number} tempo Duração em minutos.
   * @return {{nome: string, valor: number, tempo: number}} Dados validados.
   * @throws {Error} Quando nome, valor ou tempo forem inválidos.
   */
  function validarCadastro(nome, valor, tempo) {
    if (!nome || String(nome).trim() === "") {
      throw new Error("Informe o nome do serviço.");
    }

    var valorTexto = String(valor == null ? "" : valor).trim();
    var tempoTexto = String(tempo == null ? "" : tempo).trim();
    var valorNumerico = Number(valorTexto.replace(",", "."));
    var tempoNumerico = Number(tempoTexto);

    if (
      valorTexto === "" ||
      !isFinite(valorNumerico) ||
      valorNumerico < 0
    ) {
      throw new Error("Informe um valor válido para o serviço.");
    }

    if (
      tempoTexto === "" ||
      !isFinite(tempoNumerico) ||
      tempoNumerico <= 0 ||
      Math.floor(tempoNumerico) !== tempoNumerico
    ) {
      throw new Error("O tempo deve ser um número inteiro maior que zero.");
    }

    return {
      nome: String(nome).trim().toUpperCase(),
      valor: valorNumerico,
      tempo: tempoNumerico
    };
  }

  return {
    validarCadastro: validarCadastro
  };
})();
