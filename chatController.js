const { GoogleGenerativeAI } = require('@google/generative-ai');
const Mensagem = require('../models/Mensagem');

// Inicializa a instância do Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Envia mensagem para a IA e salva no MongoDB
const enviarMensagem = async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ erro: 'O campo "texto" é obrigatório.' });
    }

    // 1. Salva a mensagem do usuário no banco
    const mensagemUsuario = await Mensagem.create({
      role: 'user',
      conteudo: texto,
    });

    // 2. Envia para o Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const resultado = await model.generateContent(texto);
    const respostaIA = resultado.response.text();

    // 3. Salva a resposta da IA no banco
    const mensagemIA = await Mensagem.create({
      role: 'model',
      conteudo: respostaIA,
    });

    // 4. Devolve a resposta estruturada para o cliente
    return res.status(200).json({
      resposta: respostaIA,
      usuario: mensagemUsuario,
      ia: mensagemIA,
    });
  } catch (error) {
    console.error('Erro em enviarMensagem:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar a mensagem com a IA.' });
  }
};

// Busca o histórico de mensagens
const listarHistorico = async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataCriacao: 1 });
    return res.status(200).json(mensagens);
  } catch (error) {
    console.error('Erro em listarHistorico:', error);
    return res.status(500).json({ erro: 'Erro ao carregar o histórico de mensagens.' });
  }
};

// ================= FASE 2: BOTÃO RESET =================
// Apaga todas as mensagens do banco de dados
const limparHistorico = async (req, res) => {
  try {
    await Mensagem.deleteMany({});
    return res.status(200).json({ mensagem: 'Histórico apagado com sucesso!' });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    return res.status(500).json({ erro: 'Erro ao apagar o histórico de mensagens.' });
  }
};

module.exports = {
  enviarMensagem,
  listarHistorico,
  limparHistorico, // Não esqueça de exportar aqui!
};