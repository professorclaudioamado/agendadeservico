/**
 * Entidade: AprendizadoMaquina
 * Camada: Validator — Validador.
 *
 * Responsabilidade:
 * Validar características e parâmetros dos algoritmos K-NN, Árvore de
 * Decisão e Regressão Logística antes de persistir configurações ou treinar.
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
    if (modelo !== "KNN" && modelo !== "ARVORE_DECISAO" && modelo !== "REGRESSAO_LOGISTICA") {
      throw new Error("Selecione K-NN, Árvore de Decisão ou Regressão Logística.");
    }
    if (!Array.isArray(config.features) || !config.features.length) {
      throw new Error("Selecione ao menos uma característica.");
    }
    if (config.features.some(function(feature, indice) { return config.features.indexOf(feature) !== indice; })) {
      throw new Error("Não repita características na configuração do modelo.");
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
    } else if (modelo === "ARVORE_DECISAO") {
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
    } else {
      var regularizacao = Number(config.regularizacao);
      var taxaAprendizado = Number(config.taxaAprendizado);
      var iteracoesMaximas = Number(config.iteracoesMaximas);
      var tolerancia = Number(config.tolerancia);
      var limiarLogistico = Number(config.limiar);
      if (!isFinite(regularizacao) || regularizacao < 0 || regularizacao > 100) {
        throw new Error("A regularização L2 deve ficar entre 0 e 100.");
      }
      if (!isFinite(taxaAprendizado) || taxaAprendizado <= 0 || taxaAprendizado > 1) {
        throw new Error("A taxa de aprendizado deve ser maior que 0 e no máximo 1.");
      }
      if (!Number.isInteger(iteracoesMaximas) || iteracoesMaximas < 100 || iteracoesMaximas > 50000) {
        throw new Error("O máximo de iterações deve ser um inteiro entre 100 e 50000.");
      }
      if (!isFinite(tolerancia) || tolerancia <= 0 || tolerancia > 0.01) {
        throw new Error("A tolerância deve ser maior que 0 e no máximo 0,01.");
      }
      if (!isFinite(limiarLogistico) || limiarLogistico <= 0 || limiarLogistico >= 1) {
        throw new Error("O limiar da Regressão Logística deve estar entre 0 e 1.");
      }
    }
    return true;
  }

  return { validarConfiguracao: validarConfiguracao, featuresPermitidas: FEATURES.slice() };
})();
