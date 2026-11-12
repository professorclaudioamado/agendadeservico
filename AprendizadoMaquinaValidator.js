/**
 * Entidade: AprendizadoMaquina
 * Camada: Validator — Validador.
 *
 * Responsabilidade: validar parâmetros e características selecionadas antes
 * de salvar configurações, treinar ou avaliar modelos.
 * Dependências: nenhuma.
 */
var AprendizadoMaquinaValidator = (function() {
  var FEATURES = ["antecedenciaDias", "hora", "diaSemana", "funcionario", "servico", "cliente"];

  /** Valida a configuração recebida pela interface administrativa. */
  function validarConfiguracao(config) {
    if (!config || config.modelo !== "KNN") throw new Error("Selecione o modelo K-NN.");
    var k = Number(config.k);
    if (!Number.isInteger(k) || k < 1 || k > 50) throw new Error("K deve ser um inteiro entre 1 e 50.");
    if (!Array.isArray(config.features) || !config.features.length) {
      throw new Error("Selecione ao menos uma característica.");
    }
    config.features.forEach(function(feature) {
      if (FEATURES.indexOf(feature) === -1) throw new Error("Característica não reconhecida: " + feature);
      var peso = Number(config.pesos && config.pesos[feature] != null ? config.pesos[feature] : 1);
      if (!isFinite(peso) || peso < 0 || peso > 5) throw new Error("O peso de cada característica deve ficar entre 0 e 5.");
      if (peso === 0) throw new Error("As características selecionadas precisam ter peso maior que zero.");
    });
    var limiar = Number(config.limiar);
    if (!(limiar > 0 && limiar < 1)) throw new Error("O limiar deve estar entre 0 e 1.");
    return true;
  }

  return { validarConfiguracao: validarConfiguracao, featuresPermitidas: FEATURES.slice() };
})();
