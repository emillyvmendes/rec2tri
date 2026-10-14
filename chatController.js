const { GoogleGenerativeAI } = require('@google/generative-ai');
const Mensagem = require('../models/Mensagem');
const Jogador = require('../models/Jogador');
const Usuario = require('../models/Usuario');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const enviarMensagem = async (req, res) => {
  try {
    const { texto, nickname } = req.body;

    if (!texto) {
      return res.status(400).json({ erro: 'O campo "texto" é obrigatório.' });
    }

    // 1. Descobre o nome limpo do usuário ativo
    let jogadorNome = nickname;
    if (!jogadorNome && req.usuario?.id) {
      const userDoc = await Usuario.findById(req.usuario.id);
      if (userDoc) jogadorNome = userDoc.nome;
    }
    jogadorNome = jogadorNome ? jogadorNome.trim() : "Jogador Anônimo";

    // 2. Salva a mensagem do usuário no histórico
    await Mensagem.create({
      role: 'user',
      conteudo: `[${jogadorNome}]: ${texto}`,
    });

    // 3. ATUALIZAÇÃO SEGURA DO RANKING NO MONGODB
    let registroJogador = await Jogador.findOne({ nome: jogadorNome });
    
    if (!registroJogador) {
      registroJogador = new Jogador({
        nome: jogadorNome,
        xp: 100 // Pontos iniciais garantidos para aparecer no ranking
      });
    } else {
      registroJogador.xp += 50; // Soma mais 50 pontos a cada mensagem
    }
    
    await registroJogador.save();
    console.log(`🎯 [RANKING SALVO] O jogador "${jogadorNome}" agora tem ${registroJogador.xp} XP no MongoDB!`);

    // 4. Processa a resposta com o Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `Você é o Guardião de um cofre de conhecimento tecnológico. Proponha charadas de programação e tecnologia para o jogador "${jogadorNome}".`
    });

    const resultado = await model.generateContent(`[Jogador: ${jogadorNome}] Mensagem: ${texto}`);
    const respostaIA = resultado.response.text();

    // 5. Salva a resposta da IA
    await Mensagem.create({
      role: 'model',
      conteudo: respostaIA,
    });

    return res.status(200).json({
      resposta: respostaIA,
    });

  } catch (error) {
    console.error('❌ Erro crítico em enviarMensagem:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar a mensagem com a IA.' });
  }
};

const listarHistorico = async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataCriacao: 1 });
    return res.status(200).json(mensagens);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao carregar o histórico.' });
  }
};

const limparHistorico = async (req, res) => {
  try {
    await Mensagem.deleteMany({});
    return res.status(200).json({ mensagem: 'Histórico apagado com sucesso!' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao apagar o histórico.' });
  }
};

const obterRanking = async (req, res) => {
  try {
    const topJogadores = await Jogador.find({})
      .sort({ xp: -1 })
      .limit(10);

    console.log(`🏆 [RANKING SOLICITADO] Jogadores retornados:`, topJogadores);
    return res.status(200).json(topJogadores);
  } catch (error) {
    console.error('❌ Erro ao buscar ranking:', error);
    return res.status(500).json({ erro: 'Erro ao carregar o ranking.' });
  }
};

module.exports = {
  enviarMensagem,
  listarHistorico,
  limparHistorico,
  obterRanking,
};