const { GoogleGenerativeAI } = require('@google/generative-ai');
const Mensagem = require('../models/Mensagem');

// Inicializa a instância do Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// FASE 1: Ferramenta Local (Clima)
// ==========================================
async function buscarClimaTempoReal({ cidade }) {
  console.log(`🌍 [TOOL CALL SIMULADA] Buscando clima para: ${cidade}`);
  const cidadeLimpa = cidade ? cidade.trim() : "Curitiba";
  
  return {
    cidade: cidadeLimpa,
    temperatura: "24°C",
    condicao: "Parcialmente nublado com brisa",
    umidade: "65%",
    mensagem: `O clima atual em ${cidadeLimpa} é de 24°C, parcialmente nublado com brisa.`
  };
}

// ==========================================
// Controlador Principal Atualizado
// ==========================================
const enviarMensagem = async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ erro: 'O campo "texto" é obrigatório.' });
    }

    // 1. Salva a mensagem do usuário no MongoDB
    await Mensagem.create({
      role: 'user',
      conteudo: texto,
    });

    // 2. Instancia o modelo atualizado e compatível
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let promptParaIA = texto;
    let respostaIA = "";

    // Verifica se a pergunta envolve clima/temperatura para acionar a ferramenta
    const textoMinusculo = texto.toLowerCase();
    if (textoMinusculo.includes('clima') || textoMinusculo.includes('tempo') || textoMinusculo.includes('temperatura')) {
      let cidadeAlvo = "Curitiba";
      if (textoMinusculo.includes('em ')) {
        const partes = texto.split(/ em /i);
        if (partes[1]) {
          cidadeAlvo = partes[1].replace('?', '').trim();
        }
      }

      // Executa a função local de clima
      const dadosClima = await buscarClimaTempoReal({ cidade: cidadeAlvo });
      
      // Injeta o resultado da ferramenta no prompt para a IA redigir a resposta
      promptParaIA = `${texto} (Contexto do sistema - Dados de clima em tempo real obtidos via ferramenta local: ${dadosClima.mensagem})`;
    }

    // Envia o prompt para o modelo gerar o conteúdo
    const resultado = await model.generateContent(promptParaIA);
    respostaIA = resultado.response.text();

    // 3. Salva a resposta final da IA no MongoDB
    const mensagemIA = await Mensagem.create({
      role: 'model',
      conteudo: respostaIA,
    });

    // 4. Retorna a resposta para o front-end
    return res.status(200).json({
      resposta: respostaIA,
      ia: mensagemIA,
    });

  } catch (error) {
    console.error('❌ Erro detalhado em enviarMensagem:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar a mensagem com a IA: ' + error.message });
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
    console.error('Erro em limparHistorico:', error);
    return res.status(500).json({ erro: 'Erro ao apagar o histórico.' });
  }
};

module.exports = {
  enviarMensagem,
  listarHistorico,
  limparHistorico,
};