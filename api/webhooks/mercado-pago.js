const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

function resposta(res, status, corpo) {
  return res.status(status).json(corpo);
}

function parseSignature(header) {
  return String(header || '').split(',').reduce((acc, item) => {
    const [key, value] = item.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

function assinaturaValida(req, requestId, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = parseSignature(req.headers['x-signature']);
  const ts = signature.ts;
  const v1 = signature.v1;
  if (!ts || !v1 || !requestId || !dataId) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return resposta(res, 405, { ok: false, erro: 'Método não permitido.' });
  }
  if (!sql || !process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return resposta(res, 503, { ok: false, erro: 'Gateway não configurado.' });
  }

  try {
    const body = req.body || {};
    const dataId = String(body.data?.id || req.query?.['data.id'] || '');
    const requestId = String(req.headers['x-request-id'] || '');
    if (!assinaturaValida(req, requestId, dataId)) {
      return resposta(res, 401, { ok: false, erro: 'Assinatura do webhook inválida.' });
    }
    if (body.type !== 'order' && body.type !== 'payment') {
      return resposta(res, 200, { ok: true, ignorado: true });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
    });
    const order = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok) {
      console.error('Falha ao consultar order no Mercado Pago:', order);
      return resposta(res, 502, { ok: false, erro: 'Não foi possível consultar o pagamento.' });
    }

    const externalReference = String(order.external_reference || '');
    if (!externalReference.startsWith('barbearia-')) return resposta(res, 200, { ok: true, ignorado: true });

    const agendamentoId = externalReference.replace(/^barbearia-/, '');
    const payment = order.transactions?.payments?.[0];
    const status = payment?.status || order.status;

    let pagamentoStatus = 'aguardando_pagamento';
    let agendamentoStatus = 'pendente';
    if (['processed', 'approved', 'completed'].includes(status)) {
      pagamentoStatus = 'pago';
      agendamentoStatus = 'confirmado';
    } else if (['cancelled', 'canceled', 'expired', 'rejected'].includes(status)) {
      pagamentoStatus = 'expirado';
      agendamentoStatus = 'cancelado';
    }

    await sql`
      update agendamentos
      set pagamento_status = ${pagamentoStatus},
          status = ${agendamentoStatus},
          pagamento_atualizado_em = now()
      where id = ${agendamentoId}
    `;

    return resposta(res, 200, { ok: true, agendamentoId, pagamentoStatus, agendamentoStatus });
  } catch (erro) {
    console.error('Falha ao processar webhook Mercado Pago:', erro);
    return resposta(res, 500, { ok: false, erro: 'Falha ao processar notificação.' });
  }
};
