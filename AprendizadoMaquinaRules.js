/**
 * Entidade: AprendizadoMaquina
 * Camada: Rules — Regras de Negócio.
 *
 * Responsabilidade: transformar registros da Agenda em exemplos de treino,
 * excluir estados sem resultado, preparar atributos e separar dados em ordem
 * cronológica. Não acessa Google Sheets.
 * Dependências: nenhuma.
 */
var AprendizadoMaquinaRules = (function() {
  /** Converte datas da planilha (dd/MM/yyyy ou Date) em Date válido. */
  function converterData(valor) {
    if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
    var partes = String(valor || "").split("/");
    if (partes.length !== 3) return null;
    var data = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]), 12);
    return isNaN(data.getTime()) ? null : data;
  }

  /** Converte hora exibida em número decimal de horas. */
  function converterHora(valor) {
    var partes = String(valor || "").split(":");
    if (partes.length < 2) return null;
    var hora = Number(partes[0]), minuto = Number(partes[1]);
    if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;
    return hora + minuto / 60;
  }

  /**
   * Prepara exemplos rotulados. CANCELADO, AGENDADO e CONFIRMADO não são
   * resultados de comparecimento e ficam fora do treinamento.
   * Registros sem Data_cadastro são excluídos somente se antecedência estiver ativa.
   */
  function prepararExemplos(registros, config) {
    var exemplos = [];
    var excluidos = { statusSemResultado: 0, dataInvalida: 0, cadastroAusente: 0, horaInvalida: 0 };
    registros.forEach(function(r) {
      var status = String(r.status || "").trim().toUpperCase();
      if (status !== "FALTOU" && status !== "CONCLUÍDO") { excluidos.statusSemResultado++; return; }
      var data = converterData(r.data);
      var hora = converterHora(r.hora);
      if (!data || hora === null) { excluidos.dataInvalida++; return; }
      var cadastro = converterData(r.dataCadastro);
      var features = {
        antecedenciaDias: cadastro ? Math.max(0, Math.round((data.getTime() - cadastro.getTime()) / 86400000)) : null,
        hora: hora,
        diaSemana: data.getDay(),
        funcionario: String(r.codigoFuncionario || ""),
        servico: String(r.codigoServico || ""),
        cliente: String(r.codigoCliente || "")
      };
      if (config.features.indexOf("antecedenciaDias") !== -1 && features.antecedenciaDias === null) {
        excluidos.cadastroAusente++; return;
      }
      var incompleto = config.features.some(function(f) { return features[f] === null || features[f] === ""; });
      if (incompleto) { excluidos.horaInvalida++; return; }
      exemplos.push({ data: data.getTime(), features: features, rotulo: status === "FALTOU" ? 1 : 0 });
    });
    exemplos.sort(function(a, b) { return a.data - b.data; });
    return { exemplos: exemplos, excluidos: excluidos };
  }

  /** Divide cronologicamente em treino, validação e teste (60/20/20). */
  function dividirTemporal(exemplos) {
    if (exemplos.length < 10) throw new Error("São necessários ao menos 10 exemplos válidos para avaliação temporal.");
    var treinoFim = Math.floor(exemplos.length * 0.6);
    var validacaoFim = Math.floor(exemplos.length * 0.8);
    return {
      treino: exemplos.slice(0, treinoFim),
      validacao: exemplos.slice(treinoFim, validacaoFim),
      teste: exemplos.slice(validacaoFim)
    };
  }

  return { prepararExemplos: prepararExemplos, dividirTemporal: dividirTemporal, converterData: converterData, converterHora: converterHora };
})();
