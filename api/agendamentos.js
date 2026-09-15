const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

function resposta(res, status, corpo) {
  res.status(status).json(corpo);
}

function limpar(valor, limite = 500) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return resposta(res, 200, {
      ok: true,
      bancoConfigurado: Boolean(process.env.DATABASE_URL),
      mensagem: 'API de agendamentos disponível.'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return resposta(res, 405, { ok: false, erro: 'Método não permitido.' });
  }

  if (!sql) {
    return resposta(res, 503, { ok: false, erro: 'Banco de dados não configurado no ambiente.' });
  }

  try {
    const body = req.body || {};
    const nome = limpar(body.nome, 120);
    const telefone = limpar(body.telefone, 40);
    const email = limpar(body.email, 160) || null;
    const servico = limpar(body.servico, 120);
    const inicio = limpar(body.inicio, 40);
    const observacoes = limpar(body.observacoes, 1000) || null;
    const timezone = limpar(body.timezone, 80) || 'America/Sao_Paulo';

    if (!nome || nome.length < 2 || !telefone || !servico || !inicio) {
      return resposta(res, 400, { ok: false, erro: 'Nome, telefone, serviço e horário são obrigatórios.' });
    }

    const dataInicio = new Date(inicio);
    if (Number.isNaN(dataInicio.getTime())) {
      return resposta(res, 400, { ok: false, erro: 'Data e horário inválidos.' });
    }

    if (dataInicio.getTime() < Date.now() - 60000) {
      return resposta(res, 400, { ok: false, erro: 'O horário informado já passou.' });
    }

    const clienteRows = await sql`
      insert into clientes (nome, telefone, email)
      values (${nome}, ${telefone}, ${email})
      returning id
    `;

    const clienteId = clienteRows[0].id;
    const servicoRows = await sql`
      select id, nome, duracao_minutos, preco
      from servicos
      where lower(nome) = lower(${servico}) and ativo = true
      limit 1
    `;

    if (!servicoRows[0]) {
      return resposta(res, 400, { ok: false, erro: 'Serviço não encontrado ou indisponível.' });
    }

    const agendamentoRows = await sql`
      insert into agendamentos (cliente_id, servico_id, inicio, timezone, status, observacoes)
      values (${clienteId}, ${servicoRows[0].id}, ${dataInicio.toISOString()}, ${timezone}, 'pendente', ${observacoes})
      returning id, inicio, status
    `;

    return resposta(res, 201, {
      ok: true,
      agendamento: agendamentoRows[0]
    });
  } catch (erro) {
    if (erro && erro.code === '23505') {
      return resposta(res, 409, { ok: false, erro: 'Este horário já possui uma solicitação de agendamento.' });
    }

    console.error('Falha ao criar agendamento:', erro);
    return resposta(res, 500, { ok: false, erro: 'Não foi possível registrar o agendamento.' });
  }
};
