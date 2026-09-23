const express = require('express');
const router = express.Router();const chatRoutes = require('./routes/chatRoutes');
// POST /api/chat/enviar -> Envia prompt para a IA
router.post('/enviar', chatController.enviarMensagem);

// GET /api/chat/historico -> Retorna o histórico de mensagens
router.get('/historico', chatController.listarHistorico);

// DELETE /api/chat/limpar -> Limpa todas as mensagens
router.delete('/limpar', chatController.limparHistorico);

// GET /api/chat/ranking -> Retorna o Top 10 jogadores
router.get('/ranking', chatController.obterRanking);

module.exports = router;