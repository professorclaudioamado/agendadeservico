/**
 * Entidade: BOT de Agendamento
 * Camada: Validator — Validador
 *
 * Responsabilidade:
 * Validar e normalizar os dados recebidos durante a conversa.
 * Não acessa planilhas nem executa regras de disponibilidade.
 */
var BotValidator = (function() {
  function normalizarTexto(valor) {
    return String(valor == null ? "" : valor).trim();
  }

  function normalizarCpf(valor) {
    return normalizarTexto(valor).replace(/\D/g, "");
  }

  function validarCpf(valor) {
    var cpf = normalizarCpf(valor);
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf) || !cpfValido_(cpf)) {
      throw new Error("Informe um CPF válido com 11 números.");
    }
    return cpf;
  }

  /**
   * Confere os dois dígitos verificadores do CPF.
   *
   * @param {string} cpf CPF com onze dígitos.
   * @return {boolean} Verdadeiro quando os dígitos verificadores conferem.
   * @private
   */
  function cpfValido_(cpf) {
    var numeros = cpf.split("").map(Number);
    var soma = 0;
    for (var i = 0; i < 9; i++) soma += numeros[i] * (10 - i);
    var primeiro = (soma * 10) % 11;
    if (primeiro === 10) primeiro = 0;
    if (primeiro !== numeros[9]) return false;

    soma = 0;
    for (var j = 0; j < 10; j++) soma += numeros[j] * (11 - j);
    var segundo = (soma * 10) % 11;
    if (segundo === 10) segundo = 0;
    return segundo === numeros[10];
  }

  function validarData(valor) {
    var data = normalizarTexto(valor);
    var partes = data.split("/");
    if (partes.length !== 3 || !/^\d{2}$/.test(partes[0]) ||
        !/^\d{2}$/.test(partes[1]) || !/^\d{4}$/.test(partes[2])) {
      throw new Error("Informe a data no formato DD/MM/AAAA.");
    }
    var d = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    if (d.getFullYear() !== Number(partes[2]) ||
        d.getMonth() !== Number(partes[1]) - 1 ||
        d.getDate() !== Number(partes[0])) {
      throw new Error("A data informada não existe.");
    }
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (d < hoje) throw new Error("A data precisa ser hoje ou uma data futura.");
    return partes[2] + "-" + partes[1] + "-" + partes[0];
  }

  function validarHora(valor) {
    var hora = normalizarTexto(valor);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      throw new Error("Informe o horário no formato HH:MM.");
    }
    return hora;
  }

  return {
    normalizarTexto: normalizarTexto,
    validarCpf: validarCpf,
    validarData: validarData,
    validarHora: validarHora
  };
})();
