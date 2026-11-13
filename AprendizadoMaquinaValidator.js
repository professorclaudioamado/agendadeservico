/**
 * Entidade: AprendizadoMaquina
 * Camada: Validator — Validador.
 *
 * Responsabilidade:
 * Validar características e parâmetros dos algoritmos K-NN e Árvore de
 * Decisão antes de persistir configurações ou iniciar treinamentos.
 *
 * Dependências: nenhuma.
 */
var AprendizadoMaquinaValidator = (function() {
  var FEATURES = ["antecedenciaDias", "hora", "diaSemana", "funcionario", "servico", "cliente"];

  /**
   * Valida a configuração de acordo com o algoritmo selecionado.
   *
   * @param {Object} config Configuração recebida pela interface ou Repository.
   * @return {boolean} true quando todos os parâmetros são válidos.
   * @throws {Error} Quando o algoritmo, característica ou parâmetro é inválido.
   */
  function validarConfiguracao(config) {
    if (!config) throw new Error("Informe a configuração do modelo.");
    var modelo = String(config.modelo || "KNN").toUpperCase();
    if (modelo !== "KNN" && modelo !== "ARVORE_DECISAO") {
      throw new Error("Selecione K-NN ou Árvore de Decisão.");
    }
    if (!Array.isArray(config.features) || !config.features.length) {
      throw new Error("Selecione ao menos uma característica.");
    }
    config.features.forEach(function(feature) {
      if (FEATURES.indexOf(feature) === -1) throw new Error("Característica não reconhecida: " + feature);
      if (modelo === "KNN") {
        var peso = Number(config.pesos && config.pesos[feature] != null ? config.pesos[feature] : 1);
        if (!isFinite(peso) || peso <= 0 || peso > 5) {
          throw new Error("O peso de cada característica do K-NN deve ficar entre 0 e 5.");
        }
      }
    });

    if (modelo === "KNN") {
      var k = Number(config.k);
      if (!Number.isInteger(k) || k < 1 || k > 50) throw new Error("K deve ser um inteiro entre 1 e 50.");
      var limiar = Number(config.limiar);
      if (!(limiar > 0 && limiar < 1)) throw new Error("O limiar deve estar entre 0 e 1.");
    } else {
      var profundidade = Number(config.profundidadeMaxima);
      var minimoDivisao = Number(config.minimoParaDividir);
      var minimoFolha = Number(config.minimoPorFolha);
      if (!Number.isInteger(profundidade) || profundidade < 1 || profundidade > 10) {
        throw new Error("A profundidade máxima deve ser um inteiro entre 1 e 10.");
      }
      if (!Number.isInteger(minimoDivisao) || minimoDivisao < 2 || minimoDivisao > 100) {
        throw new Error("O mínimo para dividir deve ser um inteiro entre 2 e 100.");
      }
      if (!Number.isInteger(minimoFolha) || minimoFolha < 1 || minimoFolha > 50) {
        throw new Error("O mínimo por folha deve ser um inteiro entre 1 e 50.");
      }
      if (minimoDivisao < minimoFolha * 2) {
        throw new Error("O mínimo para dividir deve comportar pelo menos duas folhas.");
      }
    }
    return true;
  }

  return { validarConfiguracao: validarConfiguracao, featuresPermitidas: FEATURES.slice() };
})();
