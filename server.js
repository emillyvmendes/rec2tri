require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Conexão com o MongoDB (suporta MongoDB Atlas ou local)
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-gemini';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch((err) => console.error('❌ Erro na conexão com o MongoDB:', err));

// Registro das rotas
app.use('/api/chat', chatRoutes);

// Inicialização da aplicação
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});