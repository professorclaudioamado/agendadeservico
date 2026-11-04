/**
 * Entidade: Cliente
 * Camada: Service — Camada de Serviço
 * Responsabilidade: consultar a API ViaCEP e normalizar os dados do endereço.
 * Dependência: UrlFetchApp do Google Apps Script.
 */
var ClienteCepService = (function() {
  var URL_BASE = "https://viacep.com.br/ws/";

  /** Consulta um CEP e devolve os dados normalizados.
   * @param {string} cep CEP com ou sem hífen.
   * @return {{cep:string,logradouro:string,bairro:string,localidade:string,uf:string}}
   * @throws {Error} Quando o CEP é inválido, não existe ou a API falha.
   */
  function consultar(cep) {
    var cepNormalizado = String(cep || "").replace(/\D/g, "");
    if (!/^\d{8}$/.test(cepNormalizado)) {
      throw new Error("Informe um CEP válido com oito números.");
    }

    var resposta;
    try {
      resposta = UrlFetchApp.fetch(URL_BASE + cepNormalizado + "/json/", {
        method: "get",
        muteHttpExceptions: true
      });
    } catch (erro) {
      throw new Error("Não foi possível consultar o ViaCEP. Verifique sua conexão e tente novamente.");
    }

    if (resposta.getResponseCode() !== 200) {
      throw new Error("O serviço ViaCEP está indisponível no momento. Tente novamente.");
    }

    var dados;
    try {
      dados = JSON.parse(resposta.getContentText());
    } catch (erro) {
      throw new Error("O ViaCEP retornou uma resposta inválida.");
    }

    if (!dados || dados.erro === true) {
      throw new Error("CEP não encontrado. Confira o número ou preencha o endereço manualmente.");
    }

    return {
      cep: String(dados.cep || cepNormalizado),
      logradouro: String(dados.logradouro || ""),
      bairro: String(dados.bairro || ""),
      localidade: String(dados.localidade || ""),
      uf: String(dados.uf || "").toUpperCase()
    };
  }

  return {consultar: consultar};
})();

/** Ponto de entrada público utilizado pela interface via google.script.run.
 * @param {string} cep CEP informado no formulário.
 * @return {Object} Dados normalizados do endereço.
 */
function consultarCepCliente(cep) {
  return ClienteCepService.consultar(cep);
}
