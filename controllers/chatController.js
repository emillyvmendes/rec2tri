const { GoogleGenerativeAI } = require('@google/generative-ai');
const Mensagem = require('../models/Mensagem');
const Jogador = require('../models/Jogador');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// FASE 2: Ferramenta Local (Adicionar/Remover XP)
// ==========================================
async function adicionarXP({ nickname, quantidade }) {
  console.log(`🎮 [TOOL CALL] Jogador: ${nickname} | XP a alterar: ${quantidade}`);
  
  const nomeLimpo = nickname ? nickname.trim() : "Anônimo";
  const qtd = Number(quantidade) || 0;

  try {
    // Procura o jogador ou cria se não existir
    let jogador = await Jogador.findOne({ nome: nomeLimpo });

    if (!jogador) {
      jogador = new Jogador({ nome: nomeLimpo, xp: Math.max(0, qtd) });
    } else {
      jogador.xp = Math.max(0, jogador.xp + qtd); // Garante que o XP nunca fique negativo
    }

    await jogador.save();
    console.log(`✅ XP atualizado com sucesso para ${nomeLimpo}. Total XP: ${jogador.xp}`);

    return {
      status: "sucesso",
      nickname: nomeLimpo,
      xpAtual: jogador.xp,
      mensagem: `O XP de ${nomeLimpo} agora é ${jogador.xp}.`
    };
  } catch (error) {
    console.error("❌ Erro ao atualizar XP no banco:", error);
    return { status: "erro", mensagem: "Não foi possível atualizar o XP." };
  }
}

// ==========================================
// Declaração da Ferramenta para o Gemini
// ==========================================
const declaracaoXP = {
  name: "adicionarXP",
  description: "Adiciona ou remove pontos de XP do jogador com base em seu desempenho nas charadas de tecnologia. Use quantidade positiva (ex: 50) para acertos e negativa (ex: -10) se ele pedir a resposta.",
  parameters: {
    type: "OBJECT",
    properties: {
      nickname: {
        type: "STRING",
        description: "O apelido (nickname) atual do jogador."
      },
      quantidade: {
        type: "NUMBER",
        description: "A quantidade de XP a ser somada (positivo) ou subtraída (negativo)."
      }
    },
    required: ["nickname", "quantidade"]
  }
};

// ==========================================
// Controlador de Mensagens com System Instruction
// ==========================================
const enviarMensagem = async (req, res) => {
  try {
    const { texto, nickname } = req.body;

    if (!texto) {
      return res.status(400).json({ erro: 'O campo "texto" é obrigatório.' });
    }

    const jogadorNome = nickname ? nickname.trim() : "Jogador";

    // 1. Salva a mensagem do usuário no MongoDB
    await Mensagem.create({
      role: 'user',
      conteudo: `[${jogadorNome}]: ${texto}`,
    });

    // 2. Instancia o modelo com a regra do jogo (System Instruction)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `Você é o Guardião de um cofre de conhecimento tecnológico. Seu objetivo é propor charadas desafiadoras sobre programação, computação e tecnologia. 
      O jogador atual se chama "${jogadorNome}". 
      - Se o usuário acertar a charada, você DEVE obrigatoriamente chamar a função 'adicionarXP' passando o nickname dele e quantidade 50.
      - Se o usuário desistir ou pedir a resposta, chame a função 'adicionarXP' passando o nickname e quantidade -10.
      - Nunca revele numericamente o total exato de pontos que ele tem na resposta em texto, apenas comemore ou avise de forma imersiva que ele ganhou ou perdeu XP, e continue o jogo propondo a próxima charada.`
    });

    const promptFinal = `[Jogador: ${jogadorNome}] Mensagem: ${texto}`;
    const resultado = await model.generateContent(promptFinal);
    let respostaIA = resultado.response.text();

    // Verificação de intenção da IA ou execução direta baseada no texto gerado
    // (Se a IA sugerir pontuar ou se acertou a charada, podemos garantir a chamada da ferramenta se necessário, ou deixar que o fluxo responda)
    
    // 3. Salva a resposta da IA no MongoDB
    const mensagemIA = await Mensagem.create({
      role: 'model',
      conteudo: respostaIA,
    });

    return res.status(200).json({
      resposta: respostaIA,
      ia: mensagemIA,
    });

  } catch (error) {
    console.error('❌ Erro detalhado em enviarMensagem:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar a mensagem com a IA.' });
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

// ==========================================
// FASE 4: Rota do Hall da Fama (Top 10)
// ==========================================
const obterRanking = async (req, res) => {
  try {
    const topJogadores = await Jogador.find()
      .sort({ xp: -1 }) // Ordena do maior para o menor XP
      .limit(10);        // Pega apenas os Top 10

    return res.status(200).json(topJogadores);
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    return res.status(500).json({ erro: 'Erro ao carregar o ranking de jogadores.' });
  }
};

module.exports = {
  enviarMensagem,
  listarHistorico,
  limparHistorico,
  obterRanking,
};