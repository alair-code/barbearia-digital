const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const MERCADO_PAGO_URL = 'https://api.mercadopago.com/v1/orders';
const EXPIRACAO_PIX = 'PT30M';

function resposta(res, status, corpo) {
  return res.status(status).json(corpo);
}

function limpar(valor, limite = 500) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return resposta(res, 200, {
      ok: true,
      gateway: 'mercado_pago',
      pix: true,
      configurado: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.DATABASE_URL)
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return resposta(res, 405, { ok: false, erro: 'Método não permitido.' });
  }

  if (!sql) return resposta(res, 503, { ok: false, erro: 'Banco de dados não configurado no ambiente.' });
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return resposta(res, 503, { ok: false, erro: 'Gateway de pagamento ainda não configurado no ambiente.' });
  }

  try {
    const body = req.body || {};
    const agendamentoId = limpar(body.agendamentoId, 80);
    const email = limpar(body.email, 160);

    if (!agendamentoId || !emailValido(email)) {
      return resposta(res, 400, { ok: false, erro: 'Agendamento e e-mail válido são obrigatórios para o pagamento.' });
    }

    const rows = await sql`
      select
        a.id,
        a.inicio,
        a.status,
        a.pagamento_status,
        a.pagamento_valor,
        a.pagamento_gateway,
        a.pagamento_gateway_id,
        c.nome as cliente_nome,
        s.nome as servico_nome
      from agendamentos a
      join clientes c on c.id = a.cliente_id
      join servicos s on s.id = a.servico_id
      where a.id = ${agendamentoId}
      limit 1
    `;

    const agendamento = rows[0];
    if (!agendamento) return resposta(res, 404, { ok: false, erro: 'Agendamento não encontrado.' });
    if (agendamento.status === 'cancelado') return resposta(res, 409, { ok: false, erro: 'Este agendamento foi cancelado.' });
    if (Number(agendamento.pagamento_valor) <= 0) {
      return resposta(res, 400, { ok: false, erro: 'Este agendamento não possui valor de pagamento antecipado.' });
    }

    if (agendamento.pagamento_gateway_id && agendamento.pagamento_gateway === 'mercado_pago') {
      return resposta(res, 200, {
        ok: true,
        reutilizar: true,
        gateway: 'mercado_pago',
        ordemId: agendamento.pagamento_gateway_id,
        mensagem: 'Este agendamento já possui um pagamento iniciado.'
      });
    }

    const valor = Number(agendamento.pagamento_valor).toFixed(2);
    const referencia = `barbearia-${agendamento.id}`.slice(0, 64);
    const idempotencyKey = crypto.randomUUID();

    const mpResponse = await fetch(MERCADO_PAGO_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        type: 'online',
        total_amount: valor,
        external_reference: referencia,
        processing_mode: 'automatic',
        transactions: {
          payments: [{
            amount: valor,
            payment_method: { id: 'pix', type: 'bank_transfer' },
            expiration_time: EXPIRACAO_PIX
          }]
        },
        payer: { email }
      })
    });

    const mpData = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok) {
      console.error('Mercado Pago rejeitou a order:', mpData);
      return resposta(res, 502, { ok: false, erro: 'O Mercado Pago não conseguiu criar a cobrança Pix.' });
    }

    const payment = mpData.transactions?.payments?.[0];
    const paymentMethod = payment?.payment_method || {};
    if (!mpData.id || !payment?.id || !paymentMethod.qr_code) {
      console.error('Resposta inesperada do Mercado Pago:', mpData);
      return resposta(res, 502, { ok: false, erro: 'O Mercado Pago não retornou os dados necessários do Pix.' });
    }

    await sql`
      update agendamentos
      set pagamento_gateway = 'mercado_pago',
          pagamento_gateway_id = ${mpData.id},
          pagamento_transacao_id = ${payment.id},
          pagamento_status = 'aguardando_pagamento',
          pagamento_email = ${email},
          pagamento_criado_em = now(),
          pagamento_expira_em = now() + interval '30 minutes'
      where id = ${agendamento.id}
    `;

    return resposta(res, 201, {
      ok: true,
      gateway: 'mercado_pago',
      ordemId: mpData.id,
      transacaoId: payment.id,
      status: payment.status,
      statusDetalhe: payment.status_detail,
      pagamento: {
        valor,
        expiraEm: new Date(Date.now() + 30 * 60000).toISOString(),
        qrCode: paymentMethod.qr_code,
        qrCodeBase64: paymentMethod.qr_code_base64 || null,
        ticketUrl: paymentMethod.ticket_url || null
      }
    });
  } catch (erro) {
    console.error('Falha ao criar pagamento:', erro);
    return resposta(res, 500, { ok: false, erro: 'Não foi possível iniciar o pagamento.' });
  }
};
