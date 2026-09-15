const { neon } = require('@neondatabase/serverless');

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const INICIO_ATENDIMENTO = 9;
const FIM_ATENDIMENTO = 19;
const INTERVALO_MINUTOS = 15;

function resposta(res, status, corpo) {
  res.status(status).json(corpo);
}

function limpar(valor, limite = 120) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}

function dataLocalValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(new Date(`${valor}T12:00:00-03:00`).getTime());
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return resposta(res, 405, { ok: false, erro: 'Método não permitido.' });
  }

  if (!sql) {
    return resposta(res, 503, { ok: false, erro: 'Banco de dados não configurado no ambiente.' });
  }

  const data = limpar(req.query?.data, 10);
  const servico = limpar(req.query?.servico);

  if (!data || !dataLocalValida(data) || !servico) {
    return resposta(res, 400, { ok: false, erro: 'Informe uma data válida e o serviço.' });
  }

  try {
    const servicoRows = await sql`
      select id, nome, duracao_minutos
      from servicos
      where lower(nome) = lower(${servico}) and ativo = true
      limit 1
    `;

    if (!servicoRows[0]) {
      return resposta(res, 404, { ok: false, erro: 'Serviço não encontrado ou indisponível.' });
    }

    const duracao = Math.max(INTERVALO_MINUTOS, Number(servicoRows[0].duracao_minutos) || INTERVALO_MINUTOS);
    const diaSemana = new Date(`${data}T12:00:00-03:00`).getDay();

    if (diaSemana === 0) {
      return resposta(res, 200, { ok: true, data, servico: servicoRows[0].nome, duracaoMinutos: duracao, horarios: [] });
    }

    const inicioDia = `${data}T00:00:00-03:00`;
    const fimDia = `${data}T23:59:59-03:00`;
    const ocupados = await sql`
      select inicio, fim
      from agendamentos
      where status in ('pendente', 'confirmado')
        and inicio < ${fimDia}::timestamptz
        and fim > ${inicioDia}::timestamptz
      order by inicio
    `;

    const horarios = [];
    const agora = Date.now();
    const primeiro = INICIO_ATENDIMENTO * 60;
    const ultimoInicio = FIM_ATENDIMENTO * 60 - duracao;

    for (let minutos = primeiro; minutos <= ultimoInicio; minutos += INTERVALO_MINUTOS) {
      const hora = String(Math.floor(minutos / 60)).padStart(2, '0');
      const minuto = String(minutos % 60).padStart(2, '0');
      const inicio = new Date(`${data}T${hora}:${minuto}:00-03:00`);
      const fim = new Date(inicio.getTime() + duracao * 60000);

      if (inicio.getTime() <= agora) continue;

      const ocupado = ocupados.some((item) => {
        const ocupadoInicio = new Date(item.inicio).getTime();
        const ocupadoFim = new Date(item.fim).getTime();
        return inicio.getTime() < ocupadoFim && fim.getTime() > ocupadoInicio;
      });

      if (!ocupado) horarios.push({ valor: inicio.toISOString(), exibicao: `${hora}:${minuto}` });
    }

    return resposta(res, 200, {
      ok: true,
      data,
      servico: servicoRows[0].nome,
      duracaoMinutos: duracao,
      horarioFuncionamento: `${String(INICIO_ATENDIMENTO).padStart(2, '0')}:00–${String(FIM_ATENDIMENTO).padStart(2, '0')}:00`,
      horarios
    });
  } catch (erro) {
    console.error('Falha ao consultar disponibilidade:', erro);
    return resposta(res, 500, { ok: false, erro: 'Não foi possível consultar os horários disponíveis.' });
  }
};
