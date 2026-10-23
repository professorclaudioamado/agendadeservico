/**
 * Entidade: Cliente
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar e normalizar os dados recebidos para cadastrar um cliente.
 *
 * Dependências principais:
 * - Nenhuma. Este arquivo não acessa o Google Sheets.
 *
 * Observação:
 * A existência dos códigos de cidade e bairro é verificada pelo fluxo
 * de cadastro, pois essa confirmação exige consultar os dados armazenados.
 */
var ClienteValidator = (function() {

  /**
   * Valida os campos do cadastro e devolve um objeto normalizado.
   *
   * @param {Object} dados Dados recebidos do formulário de cliente.
   * @return {Object} Dados validados e normalizados para persistência.
   * @throws {Error} Quando um campo obrigatório ou formato é inválido.
   */
  function validarCadastro(dados) {
    if (!dados) {
      throw new Error("Os dados do cliente não foram recebidos.");
    }

    validarCamposObrigatorios_(dados);

    var cliente = normalizarDados_(dados);

    validarCpf_(cliente.cpf);
    validarDataNascimento_(cliente.dt_aniversario);
    validarCodigoReferencia_(cliente.codigo_cidade, "cidade");
    validarCodigoReferencia_(cliente.codigo_bairro, "bairro");
    validarEmail_(cliente.email);

    return cliente;
  }


  /**
   * Confere a presença de todos os campos obrigatórios.
   *
   * @param {Object} dados Dados recebidos da interface.
   * @return {void}
   * @throws {Error} Quando um campo obrigatório está vazio.
   * @private
   */
  function validarCamposObrigatorios_(dados) {
    var campos = [
      ["nome", "Nome completo"],
      ["cpf", "CPF"],
      ["dt_aniversario", "Data de nascimento"],
      ["endereco", "Endereço"],
      ["numero", "Número"],
      ["codigo_cidade", "Cidade"],
      ["codigo_bairro", "Bairro"],
      ["cep", "CEP"],
      ["celular", "Celular"],
      ["email", "E-mail"],
      ["status_financeiro", "Status financeiro"]
    ];

    for (var i = 0; i < campos.length; i++) {
      var chave = campos[i][0];
      if (dados[chave] == null || String(dados[chave]).trim() === "") {
        throw new Error("Preencha o campo: " + campos[i][1] + ".");
      }
    }
  }


  /**
   * Normaliza os valores sem consultar ou alterar a planilha.
   *
   * @param {Object} dados Dados originais do formulário.
   * @return {Object} Cópia normalizada dos campos do cliente.
   * @private
   */
  function normalizarDados_(dados) {
    return {
      nome: String(dados.nome).trim().toUpperCase(),
      cpf: String(dados.cpf).replace(/\D/g, ""),
      dt_aniversario: String(dados.dt_aniversario).trim(),
      endereco: String(dados.endereco).trim().toUpperCase(),
      numero: String(dados.numero).trim().toUpperCase(),
      codigo_cidade: String(dados.codigo_cidade).trim(),
      codigo_bairro: String(dados.codigo_bairro).trim(),
      cep: String(dados.cep).trim(),
      celular: String(dados.celular).trim(),
      email: String(dados.email).trim().toUpperCase(),
      status_financeiro: String(dados.status_financeiro).trim().toUpperCase()
    };
  }


  /**
   * Valida o formato do CPF, preservando a regra atual do sistema.
   * Esta etapa verifica 11 dígitos, não o dígito verificador matemático.
   *
   * @param {string} cpf CPF já normalizado.
   * @return {void}
   * @throws {Error} Quando o CPF não contém 11 números.
   * @private
   */
  function validarCpf_(cpf) {
    if (!/^\d{11}$/.test(cpf)) {
      throw new Error("O CPF deve conter 11 números.");
    }
  }


  /**
   * Confirma formato AAAA-MM-DD e existência da data de nascimento.
   *
   * @param {string} data Data de nascimento.
   * @return {void}
   * @throws {Error} Quando o formato é inválido ou a data não existe.
   * @private
   */
  function validarDataNascimento_(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new Error("Informe uma data de nascimento válida.");
    }

    var partes = data.split("-");
    var ano = Number(partes[0]);
    var mes = Number(partes[1]);
    var dia = Number(partes[2]);
    var dataTeste = new Date(ano, mes - 1, dia);

    if (
      dataTeste.getFullYear() !== ano ||
      dataTeste.getMonth() !== mes - 1 ||
      dataTeste.getDate() !== dia
    ) {
      throw new Error("A data de nascimento informada não existe.");
    }
  }


  /**
   * Valida que um código de referência contém apenas números.
   * A existência do registro é verificada fora deste arquivo.
   *
   * @param {string} codigo Código informado.
   * @param {string} entidade Nome da entidade relacionada.
   * @return {void}
   * @throws {Error} Quando o código não é numérico.
   * @private
   */
  function validarCodigoReferencia_(codigo, entidade) {
    if (!/^\d+$/.test(codigo)) {
      if (entidade === "cidade") {
        throw new Error("Selecione uma cidade válida.");
      }
      throw new Error("Selecione um bairro válido.");
    }
  }


  /**
   * Valida o formato básico do endereço de e-mail.
   *
   * @param {string} email E-mail normalizado.
   * @return {void}
   * @throws {Error} Quando o e-mail não corresponde ao formato esperado.
   * @private
   */
  function validarEmail_(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }
  }


  return {
    validarCadastro: validarCadastro
  };

})();
