/**
 * Entidade: Agendamento
 * Camada: Repository — Repositório
 *
 * Responsabilidade:
 * Centralizar todo o acesso ao Google Sheets necessário ao fluxo
 * de Agendamento.
 *
 * Este arquivo:
 * - lê FUNCIONARIOS;
 * - lê CLIENTES;
 * - lê SERVICOS;
 * - grava AGENDA;
 * - valida os cabeçalhos dessas abas;
 * - gera o próximo código do agendamento.
 *
 * Nenhuma regra de interface deve ficar neste arquivo.
 */
var AgendamentoRepository = (function() {

  var ABA_FUNCIONARIOS = "FUNCIONARIOS";
  var ABA_CLIENTES = "CLIENTES";
  var ABA_SERVICOS = "SERVICOS";
  var ABA_AGENDA = "AGENDA";


  /**
   * Retorna os funcionários disponíveis para o Agendamento.
   *
   * @return {Object[]} Lista com codigo e nome.
   */
  function listarFuncionarios() {
    var aba = obterAba_(ABA_FUNCIONARIOS);

    verificarCabecalhos_(aba, ["Código", "Nome"]);

    if (aba.getLastRow() < 2) {
      return [];
    }

    var dados = aba
      .getRange(2, 1, aba.getLastRow() - 1, 2)
      .getDisplayValues();

    var resultado = [];

    for (var i = 0; i < dados.length; i++) {
      if (dados[i][0].trim() !== "" && dados[i][1].trim() !== "") {
        resultado.push({
          codigo: dados[i][0].trim(),
          nome: dados[i][1].trim()
        });
      }
    }

    return resultado;
  }


  /**
   * Retorna os clientes disponíveis para o Agendamento.
   *
   * Para a lista suspensa são necessários apenas código e nome,
   * embora a aba CLIENTES possua outros campos.
   *
   * @return {Object[]} Lista com codigo e nome.
   */
  function listarClientes() {
    var aba = obterAba_(ABA_CLIENTES);

    verificarCabecalhos_(aba, [
      "Código", "Nome", "CPF", "Dt_aniversario", "Endereço",
      "Número", "Codigo_cidade", "Codigo_bairro", "CEP",
      "Celular", "E-mail", "Status_financeiro"
    ]);

    if (aba.getLastRow() < 2) {
      return [];
    }

    var dados = aba
      .getRange(2, 1, aba.getLastRow() - 1, 2)
      .getDisplayValues();

    var resultado = [];

    for (var i = 0; i < dados.length; i++) {
      if (dados[i][0].trim() !== "" && dados[i][1].trim() !== "") {
        resultado.push({
          codigo: dados[i][0].trim(),
          nome: dados[i][1].trim()
        });
      }
    }

    return resultado;
  }


  /**
   * Retorna os serviços disponíveis para o Agendamento.
   *
   * @return {Object[]} Lista com codigo, nome, valor e tempo.
   */
  function listarServicos() {
    var aba = obterAba_(ABA_SERVICOS);

    verificarCabecalhos_(aba, ["Código", "Nome", "Valor", "Tempo"]);

    if (aba.getLastRow() < 2) {
      return [];
    }

    var dados = aba
      .getRange(2, 1, aba.getLastRow() - 1, 4)
      .getValues();

    var resultado = [];

    for (var i = 0; i < dados.length; i++) {
      if (dados[i][0] !== "" && dados[i][1] !== "") {
        resultado.push({
          codigo: String(dados[i][0]),
          nome: String(dados[i][1]),
          valor: Number(dados[i][2]) || 0,
          tempo: Number(dados[i][3]) || 0
        });
      }
    }

    return resultado;
  }


  /**
   * Busca um funcionário pelo código.
   *
   * @param {string} codigo Código recebido da interface.
   * @return {Object|null} Funcionário encontrado ou null.
   */
  function buscarFuncionarioPorCodigo(codigo) {
    return buscarPorCodigo_(listarFuncionarios(), codigo);
  }


  /**
   * Busca um cliente pelo código.
   *
   * @param {string} codigo Código recebido da interface.
   * @return {Object|null} Cliente encontrado ou null.
   */
  function buscarClientePorCodigo(codigo) {
    return buscarPorCodigo_(listarClientes(), codigo);
  }


  /**
   * Busca um serviço pelo código.
   *
   * @param {string} codigo Código recebido da interface.
   * @return {Object|null} Serviço encontrado ou null.
   */
  function buscarServicoPorCodigo(codigo) {
    return buscarPorCodigo_(listarServicos(), codigo);
  }


  /**
   * Persiste um novo agendamento na aba AGENDA.
   *
   * @param {Object} agendamento Dados já validados e preparados pelo Service.
   * @return {number} Código gerado para o novo agendamento.
   */
  function salvar(agendamento) {
    var aba = obterAba_(ABA_AGENDA);

    verificarCabecalhos_(aba, [
      "Código", "Data", "Hora", "Codigo_funcionario",
      "Codigo_cliente", "Codigo_servico", "Valor", "Status"
    ]);

    var codigoAgendamento = gerarProximoCodigo_(aba);

    aba.appendRow([
      codigoAgendamento,
      agendamento.data,
      agendamento.hora,
      agendamento.codigoFuncionario,
      agendamento.codigoCliente,
      agendamento.codigoServico,
      agendamento.valor,
      agendamento.status
    ]);

    var ultimaLinha = aba.getLastRow();

    // Formata somente a linha recém-gravada.
    aba.getRange(ultimaLinha, 2).setNumberFormat("dd/MM/yyyy");
    aba.getRange(ultimaLinha, 7).setNumberFormat('"R$" #,##0.00');

    return codigoAgendamento;
  }


  /**
   * Procura uma entidade em uma lista usando o código.
   *
   * @param {Object[]} itens Lista de entidades.
   * @param {*} codigo Código procurado.
   * @return {Object|null} Item encontrado ou null.
   * @private
   */
  function buscarPorCodigo_(itens, codigo) {
    var codigoTexto = String(codigo).trim();

    for (var i = 0; i < itens.length; i++) {
      if (String(itens[i].codigo).trim() === codigoTexto) {
        return itens[i];
      }
    }

    return null;
  }


  /**
   * Obtém uma aba do arquivo ativo.
   *
   * @param {string} nome Nome exato da aba.
   * @return {GoogleAppsScript.Spreadsheet.Sheet} Aba encontrada.
   * @throws {Error} Quando a aba não existe.
   * @private
   */
  function obterAba_(nome) {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(nome);

    if (!aba) {
      throw new Error("A aba " + nome + " não foi encontrada.");
    }

    return aba;
  }


  /**
   * Confere os títulos das colunas antes de ler ou gravar.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba verificada.
   * @param {string[]} esperados Cabeçalhos esperados em ordem.
   * @return {void}
   * @throws {Error} Quando a estrutura da aba não corresponde ao esperado.
   * @private
   */
  function verificarCabecalhos_(aba, esperados) {
    if (aba.getLastRow() < 1) {
      throw new Error("A aba " + aba.getName() + " não possui cabeçalhos.");
    }

    var cabecalhos = aba
      .getRange(1, 1, 1, esperados.length)
      .getDisplayValues()[0];

    for (var i = 0; i < esperados.length; i++) {
      var encontrado = String(cabecalhos[i]).trim().toLowerCase();
      var esperado = esperados[i].trim().toLowerCase();

      // Mantém a tolerância do código original para "Codigo" sem acento.
      if (i === 0 && encontrado === "codigo") {
        continue;
      }

      if (encontrado !== esperado) {
        throw new Error(
          "Confira a coluna " + (i + 1) +
          " da aba " + aba.getName() +
          ". Título esperado: " + esperados[i]
        );
      }
    }
  }


  /**
   * Calcula o próximo código numérico disponível na coluna A.
   *
   * Mantém exatamente a estratégia usada no sistema original:
   * encontra o maior código existente e soma 1.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba AGENDA.
   * @return {number} Próximo código.
   * @private
   */
  function gerarProximoCodigo_(aba) {
    var ultimaLinha = aba.getLastRow();

    if (ultimaLinha < 2) {
      return 1;
    }

    var codigos = aba
      .getRange(2, 1, ultimaLinha - 1, 1)
      .getValues();

    var maiorCodigo = 0;

    for (var i = 0; i < codigos.length; i++) {
      var atual = Number(codigos[i][0]);

      if (!isNaN(atual) && atual > maiorCodigo) {
        maiorCodigo = atual;
      }
    }

    return maiorCodigo + 1;
  }


  return {
    listarFuncionarios: listarFuncionarios,
    listarClientes: listarClientes,
    listarServicos: listarServicos,
    buscarFuncionarioPorCodigo: buscarFuncionarioPorCodigo,
    buscarClientePorCodigo: buscarClientePorCodigo,
    buscarServicoPorCodigo: buscarServicoPorCodigo,
    salvar: salvar
  };

})();
