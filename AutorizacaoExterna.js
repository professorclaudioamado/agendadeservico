/**
 * Executar manualmente UMA VEZ no editor do Apps Script para autorizar
 * chamadas externas (UrlFetchApp), necessárias à integração com a Groq.
 *
 * Esta função não lê e-mails, não chama a Groq e não cria agendamentos.
 * Ela apenas faz uma requisição simples ao Google para solicitar o escopo.
 */
function autorizarRequisicoesExternas() {
  var resposta = UrlFetchApp.fetch("https://www.google.com/generate_204", {
    method: "get",
    muteHttpExceptions: true
  });

  Logger.log("Teste de acesso externo concluído. HTTP: " +
    resposta.getResponseCode());

  return "Acesso externo autorizado. Você já pode testar o botão de IA.";
}
