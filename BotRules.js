/**
 * Entidade: BOT de Agendamento
 * Camada: Rules — Regras de Negócio
 *
 * Responsabilidade:
 * Interpretar escolhas simples da conversa e verificar conflitos de horário.
 * A confirmação final sempre passa pelo AgendamentoService existente.
 */
var BotRules = (function() {
  function localizarPorNome(itens, texto) {
    var termo = normalizar_(texto);
    if (!termo) return null;
    var encontrados = itens.filter(function(item) {
      return normalizar_(item.nome) === termo;
    });
    return encontrados.length === 1 ? encontrados[0] : null;
  }

  function horarioDisponivel(hora, duracao, agendamentos) {
    var inicio = minutos_(hora);
    var fim = inicio + Math.max(1, Number(duracao) || 30);
    for (var i = 0; i < agendamentos.length; i++) {
      var existente = agendamentos[i];
      var outroInicio = minutos_(existente.hora);
      var outroFim = outroInicio + Math.max(1, Number(existente.duracao) || 30);
      if (inicio < outroFim && outroInicio < fim) return false;
    }
    return true;
  }

  function minutos_(hora) {
    var p = String(hora).split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function normalizar_(texto) {
    return String(texto == null ? "" : texto).trim().toLocaleLowerCase("pt-BR")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  return {
    localizarPorNome: localizarPorNome,
    horarioDisponivel: horarioDisponivel
  };
})();
