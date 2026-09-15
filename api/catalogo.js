const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }
  if (!sql) return res.status(503).json({ ok: false, erro: 'Banco de dados não configurado no ambiente.' });
  try {
    const [servicos, barbeiros] = await Promise.all([
      sql`select id, nome, descricao, duracao_minutos, preco from servicos where ativo = true order by nome`,
      sql`select id, nome, especialidade from barbeiros where ativo = true order by nome`
    ]);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, servicos, barbeiros });
  } catch (erro) {
    console.error('Falha ao carregar catálogo:', erro);
    return res.status(500).json({ ok: false, erro: 'Não foi possível carregar o catálogo.' });
  }
};
