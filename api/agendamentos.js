const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const PAGAMENTO_ANTECIPADO_PERCENTUAL = 30;
const INICIO_ATENDIMENTO = 9;
const FIM_ATENDIMENTO = 19;
const INTERVALO_MINUTOS = 15;

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
      pagamentoAntecipado: {
        disponivel: true,
        opcional: true,
        percentual: PAGAMENTO_ANTECIPADO_PERCENTUAL
      },
      horarioFuncionamento: '09:00–19:00',
      intervaloMinutos: INTERVALO_MINUTOS,
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
    const solicitarPagamentoAntecipado = body.pagamentoAntecipado === true;

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

    const hora = dataInicio.getHours();
    const minuto = dataInicio.getMinutes();
    if (hora < INICIO_ATENDIMENTO || hora >= FIM_ATENDIMENTO || minuto % INTERVALO_MINUTOS !== 0 || dataInicio.getSeconds() !== 0) {
      return resposta(res, 400, { ok: false, erro: 'Escolha um horário dentro do funcionamento, em intervalos de 15 minutos.' });
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
    const duracaoMinutos = Number(servicoSelecionado.duracao_minutos) || 15;
    const fim = new Date(dataInicio.getTime() + duracaoMinutos * 60000);
    const limiteFim = new Date(dataInicio);
    limiteFim.setHours(FIM_ATENDIMENTO, 0, 0, 0);

    if (fim.getTime() > limiteFim.getTime()) {
      return resposta(res, 400, { ok: false, erro: 'Esse serviço ultrapassa o horário de funcionamento. Escolha outro horário.' });
    }

    const valorServico = Number(servicoSelecionado.preco) || 0;
    const valorAntecipado = solicitarPagamentoAntecipado
      ? Number((valorServico * PAGAMENTO_ANTECIPADO_PERCENTUAL / 100).toFixed(2))
      : 0;
    const pagamentoStatus = solicitarPagamentoAntecipado ? 'aguardando_pagamento' : 'nao_solicitado';

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
      insert into agendamentos (
        cliente_id, servico_id, inicio, fim, timezone, status, observacoes,
        pagamento_status, pagamento_percentual, pagamento_valor
      )
      values (
        ${clienteId}, ${servicoSelecionado.id}, ${dataInicio.toISOString()}, ${fim.toISOString()},
        ${timezone}, 'pendente', ${observacoes}, ${pagamentoStatus},
        ${PAGAMENTO_ANTECIPADO_PERCENTUAL}, ${valorAntecipado}
      )
      returning id, inicio, fim, status, pagamento_status, pagamento_percentual, pagamento_valor
    `;

    return resposta(res, 201, {
      ok: true,
      mensagem: solicitarPagamentoAntecipado
        ? 'Agendamento registrado e aguardando pagamento antecipado.'
        : 'Agendamento registrado com sucesso.',
      duracaoMinutos,
      pagamento: {
        solicitado: solicitarPagamentoAntecipado,
        percentual: PAGAMENTO_ANTECIPADO_PERCENTUAL,
        valor: valorAntecipado,
        status: pagamentoStatus,
        integrado: false
      },
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
