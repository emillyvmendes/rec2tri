# Relatório de Release - Projeto Integrador

## 👥 Integrantes da Equipe
* [Seu Nome / Nome dos Integrantes]

---

## 🎯 1. Objetivo da Sprint
Evolução do Projeto Integrador através da integração com o modelo de inteligência artificial **Google Gemini**, persistência de dados em nuvem utilizando **MongoDB Atlas** e estruturação para deploy em produção.

---

## ☁️ 2. Arquitetura em Nuvem Utilizada
* **Banco de Dados:** MongoDB Atlas (NoSQL).
* **Back-end:** Node.js com Express hospedado no Render.
* **Front-end:** Interface web estática com Marked.js.
* **IA:** Google Generative AI (`gemini-1.5-flash`).

---

## 💻 3. Trecho de Código Chave
Trecho responsável por salvar o prompt, acionar a inteligência artificial do Gemini e persistir a resposta no banco:
```javascript
const enviarMensagem = async (req, res) => {
  try {
    const { texto } = req.body;
    const mensagemUsuario = await Mensagem.create({ role: 'user', conteudo: texto });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const resultado = await model.generateContent(texto);
    const respostaIA = resultado.response.text();

    const mensagemIA = await Mensagem.create({ role: 'model', conteudo: respostaIA });

    return res.status(200).json({ resposta: respostaIA });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro interno ao processar a mensagem com a IA.' });
  }
};