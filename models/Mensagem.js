const mongoose = require('mongoose');

// Schema para armazenar tanto as mensagens do usuário quanto as da IA
const MensagemSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'model'],
    required: true,
  },
  conteudo: {
    type: String,
    required: true,
  },
  dataCriacao: {
    type: Date,
    default: Date.now,
  },
});

const Mensagem = mongoose.model('Mensagem', MensagemSchema);

module.exports = Mensagem;