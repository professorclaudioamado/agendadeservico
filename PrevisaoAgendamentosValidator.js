/**
 * Entidade: PrevisaoAgendamentos
 * Camada: Validator — Validador.
 *
 * Responsabilidade:
 * Validar os parâmetros usados na previsão diária de novos agendamentos.
 * Não acessa Google Sheets nem executa cálculos de treinamento.
 *
 * Dependências: nenhuma.
 */
var PrevisaoAgendamentosValidator = (function() {
  /**
   * Confere os limites dos parâmetros antes de salvar ou treinar o modelo.
   *
   * @param {Object} config Parâmetros recebidos pela interface.
   * @return {boolean} true quando a configuração é válida.
   * @throws {Error} Quando algum parâmetro está fora dos limites.
   */
  function validarConfiguracao(config) {
    if (!config) throw new Error("Informe os parâmetros da rede neural.");

    var janela = Number(config.janelaDias);
    var neuronios = Number(config.neuronios);
    var epocas = Number(config.epocas);
    var taxa = Number(config.taxaAprendizado);

    if (!Number.isInteger(janela) || janela < 3 || janela > 30) {
      throw new Error("A janela histórica deve ser um inteiro entre 3 e 30 dias.");
    }
    if (!Number.isInteger(neuronios) || neuronios < 2 || neuronios > 64) {
      throw new Error("A quantidade de neurônios deve ser um inteiro entre 2 e 64.");
    }
    if (!Number.isInteger(epocas) || epocas < 50 || epocas > 3000) {
      throw new Error("A quantidade de épocas deve ser um inteiro entre 50 e 3000.");
    }
    if (!isFinite(taxa) || taxa < 0.0001 || taxa > 0.1) {
      throw new Error("A taxa de aprendizado deve ficar entre 0,0001 e 0,1.");
    }
    return true;
  }

  return { validarConfiguracao: validarConfiguracao };
})();
