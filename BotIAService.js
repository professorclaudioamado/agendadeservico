/**
 * Entidade: BOT de Agendamento
 * Camada: Service de IA — Interpretação e chamadas de ferramentas
 *
 * Responsabilidade:
 * Conversar com a API Groq, permitir que o modelo escolha consultas
 * autorizadas e devolver uma resposta natural acompanhada dos campos
 * estruturados do pedido. A IA não acessa planilhas nem executa gravações.
 *
 * Dependências: BotToolsService, UrlFetchApp, PropertiesService, Utilities e Session.
 */
var BotIAService = (function() {
  var URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
  var MODELO_GROQ = "openai/gpt-oss-20b";
  var LIMITE_MENSAGEM = 800;
  var MAXIMO_CICLOS_FERRAMENTAS = 5;

  /**
   * Interpreta a mensagem e executa consultas solicitadas pelo modelo.
   * @param {string} mensagem Texto enviado pelo cliente.
   * @param {Object} contexto Dados já validados da sessão.
   * @return {Object} Resposta natural e campos do agendamento.
   */
  function interpretarMensagem(mensagem, contexto) {
    var texto = String(mensagem || "").trim();
    contexto = contexto || {};
    if (!texto || texto.length > LIMITE_MENSAGEM) {
      throw new Error("Envie uma mensagem de até " + LIMITE_MENSAGEM + " caracteres.");
    }

    var chave = PropertiesService.getScriptProperties().getProperty("GROQ_API_KEY");
    if (!chave) {
      throw new Error("A integração com a IA ainda não está configurada. Verifique GROQ_API_KEY nas Propriedades do Script.");
    }

    var hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var instrucao = [
      "Você é o assistente virtual da Agenda de Serviços. Converse em português do Brasil, com clareza e cordialidade.",
      "Interprete a intenção do cliente considerando o histórico e os dados já informados.",
      "Você pode chamar ferramentas de consulta para obter dados reais dos cadastros e da agenda. Escolha as ferramentas adequadas à pergunta; não simule nem invente resultados.",
      "Sempre consulte as ferramentas antes de responder sobre serviços, preços, duração, profissionais, agendamentos ou conflitos de horário.",
      "Use somente dados retornados pelas ferramentas. Nunca invente serviços, preços, profissionais, agendamentos ou disponibilidade.",
      "A ferramenta de horário verifica conflitos já registrados, não o expediente, folgas ou intervalos do profissional. Explique esse limite quando relevante e nunca declare um horário livre com base apenas na ausência de conflito.",
      "Não solicite nem exponha CPF, telefone ou outros dados pessoais nesta etapa; a identificação já foi feita pelo servidor.",
      "Se o cliente estiver montando um agendamento, extraia apenas os campos que ele informou ou que estejam inequívocos. Preserve os dados anteriores quando não houver correção.",
      "IMPORTANTE: uma pergunta informativa não apaga nem suspende um pedido de agendamento em andamento.",
      "Se a mesma mensagem mencionar um serviço e também perguntar quais profissionais existem, quais horários há ou pedir outra informação, extraia o serviço mencionado no campo servico E responda à pergunta informativa.",
      "Exemplo: se o cliente disser que quer cortar o cabelo e perguntar quais profissionais estão disponíveis, consulte os profissionais, responda à pergunta e retorne servico com o nome exato do serviço correspondente ao cadastro. Não deixe servico vazio só porque a intenção principal também é informativa.",
      "Quando CONTEXTO_DA_SESSAO já tiver serviço, profissional, data ou hora, não os descarte por causa de uma pergunta informativa. Só extraia um valor diferente quando o cliente claramente corrigir ou substituir o dado.",
      "Use os nomes de servicos_cadastrados e profissionais_cadastrados para relacionar expressões coloquiais aos nomes exatos da planilha. Não invente nem crie nomes.",
      "Datas relativas devem usar a data atual fornecida no contexto e retornar AAAA-MM-DD. Horários devem retornar HH:MM em 24 horas.",
      "Só indique confirmacao=sim após autorização inequívoca para registrar o resumo apresentado pelo servidor. Não diga que registrou ou confirmou um agendamento.",
      "Se a pergunta for informativa, responda diretamente usando os resultados consultados, sem obrigar o cliente a iniciar um agendamento.",
      "Ao final, retorne somente um objeto JSON com mensagem, intencao, servico, profissional, data, hora e confirmacao.",
      "intencao deve ser agendar, confirmar, cancelar ou outro. confirmacao deve ser sim, nao ou nenhuma. Campos sem informação nova devem ser strings vazias.",
      "A data atual do projeto é " + hoje + "."
    ].join(" ");

    var mensagens = [
      { role: "system", content: instrucao },
      {
        role: "user",
        content: "CONTEXTO_DA_SESSAO:\n" + JSON.stringify({
          campos_ja_informados: contexto.campos || {},
          servicos_cadastrados: (contexto.servicos || []).map(function(item) { return item.nome; }),
          profissionais_cadastrados: (contexto.profissionais || []).map(function(item) { return item.nome; }),
          servico_e_profissional_sao_dados_de_cadastro: true
        }) + "\n\nMENSAGEM_DO_CLIENTE:\n" + texto
      }
    ];

    var ferramentas = BotToolsService.listarFerramentas();
    var respostaFinal = null;

    for (var ciclo = 0; ciclo <= MAXIMO_CICLOS_FERRAMENTAS; ciclo++) {
      respostaFinal = chamarGroq_(chave, mensagens, ferramentas);
      var mensagemModelo = respostaFinal.message;
      var chamadas = mensagemModelo.tool_calls || [];

      if (!chamadas.length) {
        return interpretarRespostaFinal_(mensagemModelo.content);
      }
      if (ciclo === MAXIMO_CICLOS_FERRAMENTAS) {
        throw new Error("A IA atingiu o limite de consultas para esta mensagem. Reformule o pedido.");
      }

      mensagens.push(mensagemModelo);
      chamadas.forEach(function(chamada) {
        var nome = chamada.function && chamada.function.name;
        var argumentos;
        var resultado;
        try {
          argumentos = JSON.parse(chamada.function.arguments || "{}");
          resultado = BotToolsService.executar(nome, argumentos);
        } catch (erroFerramenta) {
          resultado = { erro: String(erroFerramenta && erroFerramenta.message || "Não foi possível executar a consulta.") };
        }
        mensagens.push({
          role: "tool",
          tool_call_id: chamada.id,
          content: JSON.stringify(resultado)
        });
      });
    }
    throw new Error("A IA não concluiu a resposta.");
  }

  /**
   * Envia uma etapa da conversa à API Groq.
   * @param {string} chave Chave privada armazenada no Script Properties.
   * @param {Object[]} mensagens Histórico da chamada atual.
   * @param {Object[]} ferramentas Ferramentas autorizadas.
   * @return {Object} Mensagem retornada pelo modelo.
   */
  function chamarGroq_(chave, mensagens, ferramentas) {
    var payload = {
      model: MODELO_GROQ,
      messages: mensagens,
      tools: ferramentas,
      tool_choice: "auto",
      reasoning_effort: "low",
      reasoning_format: "hidden",
      max_completion_tokens: 1600,
      stream: false
    };
    var resposta = UrlFetchApp.fetch(URL_GROQ, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + chave },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var codigoHTTP = resposta.getResponseCode();
    var corpo = resposta.getContentText() || "";
    if (codigoHTTP < 200 || codigoHTTP >= 300) {
      var detalhe = "";
      try {
        var erroAPI = JSON.parse(corpo);
        detalhe = erroAPI && erroAPI.error && erroAPI.error.message ? String(erroAPI.error.message) : "";
      } catch (erroLeitura) {
        detalhe = "";
      }
      detalhe = detalhe.replace(/[\r\n\t]+/g, " ").substring(0, 450);
      throw new Error("A API Groq retornou HTTP " + codigoHTTP +
        (detalhe ? ": " + detalhe : ". Consulte a chave, o modelo e os limites da conta."));
    }

    var objeto;
    try { objeto = JSON.parse(corpo); }
    catch (erroJSON) { throw new Error("A Groq retornou uma resposta que não é JSON válido."); }
    if (!objeto.choices || !objeto.choices.length || !objeto.choices[0].message) {
      throw new Error("A Groq não retornou o resultado esperado.");
    }
    var escolha = objeto.choices[0];
    if (escolha.finish_reason === "length") throw new Error("A resposta da Groq foi interrompida por limite de tamanho.");
    if (escolha.message.refusal) throw new Error("A Groq recusou a solicitação.");
    return escolha;
  }

  /**
   * Normaliza a resposta final do modelo sem confiar nos campos recebidos.
   * @param {string} conteudo Conteúdo final enviado pelo modelo.
   * @return {Object} Campos permitidos e validados estruturalmente.
   */
  function interpretarRespostaFinal_(conteudo) {
    var texto = String(conteudo || "").trim();
    if (!texto) throw new Error("A Groq retornou uma resposta vazia.");
    var dados;
    try {
      dados = JSON.parse(texto);
    } catch (erroJSON) {
      // Resposta natural é permitida para perguntas gerais; não cria campos de agendamento.
      return respostaVazia_(texto);
    }
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      return respostaVazia_(texto);
    }
    var resultado = {
      mensagem: typeof dados.mensagem === "string" ? dados.mensagem.substring(0, 1800) : "",
      intencao: typeof dados.intencao === "string" ? dados.intencao : "outro",
      servico: typeof dados.servico === "string" ? dados.servico : "",
      profissional: typeof dados.profissional === "string" ? dados.profissional : "",
      data: typeof dados.data === "string" ? dados.data : "",
      hora: typeof dados.hora === "string" ? dados.hora : "",
      confirmacao: typeof dados.confirmacao === "string" ? dados.confirmacao : "nenhuma"
    };
    if (["agendar", "confirmar", "cancelar", "outro"].indexOf(resultado.intencao) === -1) resultado.intencao = "outro";
    if (["sim", "nao", "nenhuma"].indexOf(resultado.confirmacao) === -1) resultado.confirmacao = "nenhuma";
    return resultado;
  }

  function respostaVazia_(mensagem) {
    return {
      mensagem: String(mensagem || "").substring(0, 1800),
      intencao: "outro",
      servico: "",
      profissional: "",
      data: "",
      hora: "",
      confirmacao: "nenhuma"
    };
  }

  return { interpretarMensagem: interpretarMensagem };
})();
