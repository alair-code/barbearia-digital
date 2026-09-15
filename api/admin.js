const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const STATUS_VALIDOS = new Set(['pendente', 'confirmado', 'concluido', 'cancelado']);

function autorizado(req) {
  const token = process.env.ADMIN_API_TOKEN;
  const recebido = req.headers['x-admin-token'] || '';
  return Boolean(token && recebido && recebido === token);
}

function resposta(res, status, corpo) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(corpo);
}

module.exports = async function handler(req, res) {
  if (!process.env.ADMIN_API_TOKEN) return resposta(res, 503, { ok: false, erro: 'ADMIN_API_TOKEN não configurado.' });
  if (!autorizado(req)) return resposta(res, 401, { ok: false, erro: 'Acesso administrativo não autorizado.' });
  if (!sql) return resposta(res, 503, { ok: false, erro: 'Banco de dados não configurado no ambiente.' });

  try {
    if (req.method === 'GET') {
      const status = typeof req.query?.status === 'string' ? req.query.status : '';
      const agendamentos = status && STATUS_VALIDOS.has(status)
        ? await sql`select a.id, a.inicio, a.fim, a.status, a.observacoes, a.pagamento_status, a.pagamento_valor, c.nome as cliente_nome, c.telefone, c.email, s.nome as servico_nome, b.nome as barbeiro_nome from agendamentos a join clientes c on c.id = a.cliente_id join servicos s on s.id = a.servico_id left join barbeiros b on b.id = a.barbeiro_id where a.status = ${status} order by a.inicio desc limit 200`
        : await sql`select a.id, a.inicio, a.fim, a.status, a.observacoes, a.pagamento_status, a.pagamento_valor, c.nome as cliente_nome, c.telefone, c.email, s.nome as servico_nome, b.nome as barbeiro_nome from agendamentos a join clientes c on c.id = a.cliente_id join servicos s on s.id = a.servico_id left join barbeiros b on b.id = a.barbeiro_id order by a.inicio desc limit 200`;
      const [servicos, barbeiros] = await Promise.all([
        sql`select id, nome, descricao, duracao_minutos, preco, ativo from servicos order by nome`,
        sql`select id, nome, especialidade, ativo from barbeiros order by nome`
      ]);
      return resposta(res, 200, { ok: true, agendamentos, servicos, barbeiros });
    }

    if (req.method === 'PATCH') {
      const id = typeof req.body?.id === 'string' ? req.body.id : '';
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      if (!id || !STATUS_VALIDOS.has(status)) return resposta(res, 400, { ok: false, erro: 'Informe um agendamento e um status válido.' });
      const rows = await sql`update agendamentos set status = ${status} where id = ${id} returning id, status`;
      if (!rows[0]) return resposta(res, 404, { ok: false, erro: 'Agendamento não encontrado.' });
      return resposta(res, 200, { ok: true, agendamento: rows[0] });
    }

    return resposta(res, 405, { ok: false, erro: 'Método não permitido.' });
  } catch (erro) {
    console.error('Falha administrativa:', erro);
    return resposta(res, 500, { ok: false, erro: 'Não foi possível concluir a operação administrativa.' });
  }
};
