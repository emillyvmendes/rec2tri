const mongoose = require('mongoose');

const JogadorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  xp: {
    type: Number,
    default: 0,
  },
  dataCriacao: {
    type: Date,
    default: Date.now,
  },
});

const Jogador = mongoose.model('Jogador', JogadorSchema);

module.exports = Jogador;