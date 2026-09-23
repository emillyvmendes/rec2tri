const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const autenticarToken = require('../middlewares/authMiddleware'); // <--- ADICIONADO

// Rotas protegidas pelo token JWT
router.post('/enviar', autenticarToken, chatController.enviarMensagem);
router.get('/historico', autenticarToken, chatController.listarHistorico);
router.delete('/limpar', autenticarToken, chatController.limparHistorico);
router.get('/ranking', autenticarToken, chatController.obterRanking);

module.exports = router;