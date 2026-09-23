const { GoogleGenerativeAI } = require('@google/generative-ai');
const Mensagem = require('../models/Mensagem');

// Inicializa a instância do Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// FASE 1: Criando a "Ferramenta" (A Ação Local)
// ==========================================
async function buscarClimaTempoReal({ cidade }) {
  console.log(`🌍 [TOOL CALL] Executando buscarClimaTempoReal para: ${cidade}`);
  
  // Se quiser usar a OpenWeatherMap real no futuro:
  // const apiKey = process.env.WEATHER_API_KEY;
  // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`);
  // const data = await response.json();
  
  // Simulador inteligente para testes imediatos sem travar na chave da OpenWeatherMap:
  const cidadeLimpa = cidade ? cidade.trim() : "Desconhecida";
  
  return {
    cidade: cidadeLimpa,
    temperatura: "24°C",
    condicao: "Parcialmente nublado com brisa",
    umidade: "65%",
    mensagem: `O clima atual em ${cidadeLimpa} é de 24°C, parcialmente nublado.`
  };
}

// Mapeamento de funções locais disponíveis para o bot executar
const funcoesDisponiveis = {
  buscarClimaTempoReal: buscarClimaTempoReal
};

// ==========================================
// FASE 2: O Manual de Instruções (Declaration)
// ==========================================
const declaracaoClima = {
  name: "buscarClimaTempoReal",
  description: "Obtém a temperatura exata e o clima atual de uma cidade. Use sempre que o usuário perguntar sobre o tempo, meteorologia ou temperatura de algum lugar.",
  parameters: {
    type: "OBJECT",
    properties: {
      cidade: {
        type: "STRING",
        description: "O nome da cidade. Ex: Assis Chateaubriand, Curitiba, São Paulo, Tokyo."
      }
    },
    required: ["cidade"]
  }
};

// ==========================================
// FASE 3 & 4: Conectando a Ferramenta e o Loop Lógico
// ==========================================
const enviarMensagem = async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ erro: 'O campo "texto" é obrigatório.' });
    }

    // 1. Salva a mensagem do usuário no banco
    await Mensagem.create({
      role: 'user',
      conteudo: texto,
    });

    // Inicializa o modelo com a ferramenta injetada (Fase 3) e o seu modelo preferido
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash-lite', // Usando o modelo que você especificou
      tools: [{ functionDeclarations: [declaracaoClima] }] 
    });

    // Criamos uma sessão de chat simulada com o histórico do banco para contexto
    const historicoBanco = await Mensagem.find().sort({ dataCriacao: 1 });
    const historicoFormatado = historicoBanco.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.conteudo }]
    }));

    const chat = model.startChat({ history: historicoFormatado });

    // Envia a mensagem inicial para o Gemini
    let resultado = await chat.sendMessage(texto);
    let resposta = resultado.response;

    // FASE 4: O Loop de Conversação (Verifica se a IA pediu para chamar uma função)
    const chamadaFuncao = resposta.functionCalls ? resposta.functionCalls() : null;

    if (chamadaFuncao && chamadaFuncao.length > 0) {
      const pedido = chamadaFuncao[0];
      const nomeFuncao = pedido.name;
      const argumentos = pedido.args;

      console.log(`🤖 A IA decidiu chamar a função: ${nomeFuncao}`, argumentos);

      if (funcoesDisponiveis[nomeFuncao]) {
        // Executa a função local JavaScript
        const resultadoFuncao = await funcoesDisponiveis[nomeFuncao](argumentos);

        // Envia o resultado de volta para o Gemini usando a estrutura functionResponse
        const resultadoFinalIA = await chat.sendMessage([
          {
            functionResponse: {
              name: nomeFuncao,
              response: { output: resultadoFuncao }
            }
          }
        ]);

        var respostaIA = resultadoFinalIA.response.text();
      } else {
        var respostaIA = `Erro: A função ${nomeFuncao} não foi encontrada no servidor.`;
      }
    } else {
      // Se for uma conversa normal sem pedido de ferramenta
      var respostaIA = resposta.text();
    }

    // 3. Salva a resposta final da IA no banco
    const mensagemIA = await Mensagem.create({
      role: 'model',
      conteudo: respostaIA,
    });

    // 4. Devolve a resposta estruturada para o cliente
    return res.status(200).json({
      resposta: respostaIA,
      ia: mensagemIA,
    });

  } catch (error) {
    console.error('Erro em enviarMensagem com Function Calling:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar a ferramenta com a IA.' });
  }
};

const listarHistorico = async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataCriacao: 1 });
    return res.status(200).json(mensagens);
  } catch (error) {
    console.error('Erro em listarHistorico:', error);
    return res.status(500).json({ erro: 'Erro ao carregar o histórico.' });
  }
};

const limparHistorico = async (req, res) => {
  try {
    await Mensagem.deleteMany({});
    return res.status(200).json({ mensagem: 'Histórico apagado com sucesso!' });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    return res.status(500).json({ erro: 'Erro ao apagar o histórico.' });
  }
};

module.exports = {
  enviarMensagem,
  listarHistorico,
  limparHistorico,
};