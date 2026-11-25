/**
 * Entidade: PrevisaoAgendamentos
 * Camada: Rules — Regras de Negócio.
 *
 * Responsabilidade:
 * Converter datas de cadastro em uma série diária contínua, preencher dias
 * sem novos registros com zero e preparar janelas temporais para a MLP.
 * Não acessa Google Sheets.
 *
 * Dependências: nenhuma.
 */
var PrevisaoAgendamentosRules = (function() {
  var UM_DIA = 24 * 60 * 60 * 1000;

  /** Converte Date, DD/MM/AAAA ou AAAA-MM-DD em data local ao meio-dia. */
  function converterData(valor) {
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12);
    }
    var texto = String(valor || "").trim();
    var partes;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
      partes = texto.split("/");
      return criarData_(Number(partes[2]), Number(partes[1]), Number(partes[0]));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      partes = texto.split("-");
      return criarData_(Number(partes[0]), Number(partes[1]), Number(partes[2]));
    }
    return null;
  }

  /** Cria uma data e rejeita combinações inválidas, como 31/02. */
  function criarData_(ano, mes, dia) {
    var data = new Date(ano, mes - 1, dia, 12);
    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
    return data;
  }

  /** Formata uma data local como chave estável AAAA-MM-DD. */
  function chaveData(data) {
    return data.getFullYear() + "-" +
      String(data.getMonth() + 1).padStart(2, "0") + "-" +
      String(data.getDate()).padStart(2, "0");
  }

  /**
   * Conta registros por Data_cadastro e inclui todos os dias até hoje.
   * Dias sem cadastros são representados por quantidade zero.
   *
   * @param {Object[]} registros Linhas normalizadas pelo Repository.
   * @param {Date=} hoje Data final opcional para testes.
   * @return {Object[]} Série cronológica {data, chave, quantidade}.
   */
  function gerarSerieDiaria(registros, hoje) {
    var contagens = {};
    var menor = null;
    var final = converterData(hoje || new Date());

    (registros || []).forEach(function(registro) {
      var data = converterData(registro.dataCadastro);
      if (!data || data.getTime() > final.getTime()) return;
      var chave = chaveData(data);
      contagens[chave] = (contagens[chave] || 0) + 1;
      if (!menor || data.getTime() < menor.getTime()) menor = data;
    });

    if (!menor) return [];

    var serie = [];
    for (var cursor = menor; cursor.getTime() <= final.getTime(); cursor = new Date(cursor.getTime() + UM_DIA)) {
      var dataAtual = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 12);
      var chaveAtual = chaveData(dataAtual);
      serie.push({
        data: dataAtual,
        chave: chaveAtual,
        quantidade: contagens[chaveAtual] || 0
      });
    }
    return serie;
  }

  /**
   * Transforma a série em pares de entrada/saída para previsão de um dia.
   * A escala logarítmica reduz a influência de picos muito altos.
   *
   * @param {Object[]} serie Série diária contínua.
   * @param {number} janela Quantidade de dias usados como entrada.
   * @return {{amostras:Object[], escala:number}} Dados normalizados.
   */
  function criarJanelas(serie, janela, diasParaEscala) {
    var maior = 0;
    var limiteEscala = diasParaEscala == null ? (serie || []).length : Math.max(0, Math.min((serie || []).length, Number(diasParaEscala)));
    (serie || []).slice(0, limiteEscala).forEach(function(item) {
      maior = Math.max(maior, Number(item.quantidade) || 0);
    });
    var escala = Math.max(1, Math.log1p(maior));
    var amostras = [];
    for (var i = janela; i < serie.length; i++) {
      var entrada = [];
      for (var j = i - janela; j < i; j++) {
        entrada.push(Math.log1p(Math.max(0, Number(serie[j].quantidade) || 0)) / escala);
      }
      amostras.push({
        entrada: entrada,
        alvo: Math.log1p(Math.max(0, Number(serie[i].quantidade) || 0)) / escala,
        dataAlvo: serie[i].chave,
        quantidadeReal: Number(serie[i].quantidade) || 0
      });
    }
    return { amostras: amostras, escala: escala };
  }

  /** Converte a saída normalizada da rede para uma contagem não negativa. */
  function desnormalizarQuantidade(valor, escala) {
    var normalizado = Math.max(0, Number(valor) || 0);
    return Math.max(0, Math.round(Math.expm1(normalizado * escala)));
  }

  return {
    converterData: converterData,
    chaveData: chaveData,
    gerarSerieDiaria: gerarSerieDiaria,
    criarJanelas: criarJanelas,
    desnormalizarQuantidade: desnormalizarQuantidade
  };
})();
