const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// POST /api/chat/enviar -> Envia prompt para a IA
router.post('/enviar', chatController.enviarMensagem);

// GET /api/chat/historico -> Retorna o histórico de mensagens
router.get('/historico', chatController.listarHistorico);

// DELETE /api/chat/limpar -> Limpa todas as mensagens (Fase 2)
router.delete('/limpar', chatController.limparHistorico);

module.exports = router;