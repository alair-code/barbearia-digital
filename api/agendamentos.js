const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const INTERVALO_ENTRE_ATENDIMENTOS_MINUTOS = 15;

function resposta(res, status, corpo) {
  res.status(status).json(corpo);
}

function limpar(valor, limite = 500) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}

function telefoneValido(valor) {
  return /^\+?[0-9\s().-]{8,25}$/.test(valor);
}

function emailValido(valor) {
  return !valor || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return resposta(res, 200, {
      ok: true,
      bancoConfigurado: Boolean(process.env.DATABASE_URL),
      intervaloEntreAtendimentosMinutos: INTERVALO_ENTRE_ATENDIMENTOS_MINUTOS,
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

    if (!telefoneValido(telefone)) {
      return resposta(res, 400, { ok: false, erro: 'Informe um telefone válido.' });
    }

    if (!emailValido(email)) {
      return resposta(res, 400, { ok: false, erro: 'Informe um e-mail válido.' });
    }

    const dataInicio = new Date(inicio);
    if (Number.isNaN(dataInicio.getTime())) {
      return resposta(res, 400, { ok: false, erro: 'Data e horário inválidos.' });
    }

    if (dataInicio.getTime() < Date.now() - 60000) {
      return resposta(res, 400, { ok: false, erro: 'O horário informado já passou.' });
    }

    const servicoRows = await sql`
      select id, nome, duracao_minutos, preco
      from servicos
      where lower(nome) = lower(${servico}) and ativo = true
      limit 1
    `;

    if (!servicoRows[0]) {
      return resposta(res, 400, { ok: false, erro: 'Serviço não encontrado ou indisponível.' });
    }

    const servicoSelecionado = servicoRows[0];
    const fim = new Date(
      dataInicio.getTime() +
      (Number(servicoSelecionado.duracao_minutos) + INTERVALO_ENTRE_ATENDIMENTOS_MINUTOS) * 60000
    );

    const conflitoRows = await sql`
      select id
      from agendamentos
      where status in ('pendente', 'confirmado')
        and tstzrange(inicio, fim, '[)') && tstzrange(${dataInicio.toISOString()}, ${fim.toISOString()}, '[)')
      limit 1
    `;

    if (conflitoRows[0]) {
      return resposta(res, 409, {
        ok: false,
        codigo: 'HORARIO_INDISPONIVEL',
        erro: 'Este horário já está ocupado. Escolha outro horário.'
      });
    }

    const clienteRows = await sql`
      insert into clientes (nome, telefone, email)
      values (${nome}, ${telefone}, ${email})
      returning id
    `;

    const clienteId = clienteRows[0].id;
    const agendamentoRows = await sql`
      insert into agendamentos (cliente_id, servico_id, inicio, fim, timezone, status, observacoes)
      values (${clienteId}, ${servicoSelecionado.id}, ${dataInicio.toISOString()}, ${fim.toISOString()}, ${timezone}, 'pendente', ${observacoes})
      returning id, inicio, fim, status
    `;

    return resposta(res, 201, {
      ok: true,
      mensagem: 'Agendamento registrado com sucesso.',
      intervaloEntreAtendimentosMinutos: INTERVALO_ENTRE_ATENDIMENTOS_MINUTOS,
      agendamento: agendamentoRows[0]
    });
  } catch (erro) {
    if (erro && (erro.code === '23P01' || erro.code === '23505')) {
      return resposta(res, 409, {
        ok: false,
        codigo: 'HORARIO_INDISPONIVEL',
        erro: 'Este horário acabou de ser ocupado. Escolha outro horário.'
      });
    }

    console.error('Falha ao criar agendamento:', erro);
    return resposta(res, 500, { ok: false, erro: 'Não foi possível registrar o agendamento.' });
  }
};
