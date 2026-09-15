function iniciarComercial() {
  const c = window.configuracaoBarbearia || {};
  const $ = (s) => document.querySelector(s);
  const pagamento = c.pagamento || { antecipadoOpcional: false, percentual: 30, provedor: 'mercado_pago' };
  const pagamentoDisponivel = pagamento.antecipadoOpcional === true;
  let catalogo = { servicos: [], barbeiros: [] };

  const servicos = [...document.querySelectorAll('#lista-servicos .servico')];
  servicos.forEach((card, i) => {
    const s = (c.servicos || [])[i];
    if (!s) return;
    const meta = document.createElement('div');
    meta.className = 'meta-servico';
    meta.innerHTML = `<span>${s.duracao || 'Atendimento personalizado'}</span><span class="badge-premium">Disponível</span>`;
    card.appendChild(meta);
    const a = document.createElement('a');
    a.className = 'agendar-servico';
    a.href = '#';
    a.textContent = 'Agendar este serviço';
    a.addEventListener('click', (e) => { e.preventDefault(); abrir(s.nome); });
    card.appendChild(a);
  });

  const sobre = document.querySelector('.numeros');
  if (sobre && c.estatisticas) sobre.innerHTML = c.estatisticas.slice(0, 4).map((x) => `<div><strong>${x.valor}</strong><span>${x.rotulo}</span></div>`).join('');

  const equipe = document.querySelector('#profissionais');
  if (equipe && c.avaliacoes && !equipe.querySelector('.avaliacoes-premium')) {
    const palco = document.createElement('div');
    palco.className = 'avaliacoes-premium';
    palco.innerHTML = c.avaliacoes.map((a) => `<article class="avaliacao-card"><div class="estrelas" aria-label="${a.nota} de 5 estrelas">${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)}</div><p>“${a.texto}”</p><strong>${a.nome}</strong></article>`).join('');
    const heading = equipe.querySelector('.cabecalho-secao');
    if (heading) heading.insertAdjacentElement('afterend', palco);
  }

  async function carregarCatalogo() {
    try {
      const r = await fetch('/api/catalogo', { headers: { Accept: 'application/json' } });
      const data = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(data.servicos)) catalogo = data;
    } catch { /* a configuração local continua como fallback visual */ }
  }

  async function carregarHorarios(modal) {
    const data = modal.querySelector('[name="data"]')?.value;
    const servico = modal.querySelector('[name="servico"]')?.value;
    const selectHora = modal.querySelector('[name="hora"]');
    const aviso = modal.querySelector('[data-disponibilidade]');
    if (!selectHora || !data || !servico) return;
    selectHora.disabled = true;
    selectHora.innerHTML = '<option value="">Consultando horários...</option>';
    if (aviso) aviso.textContent = '';
    try {
      const r = await fetch(`/api/disponibilidade?data=${encodeURIComponent(data)}&servico=${encodeURIComponent(servico)}`, { headers: { Accept: 'application/json' } });
      const resultado = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resultado.erro || 'Não foi possível consultar os horários.');
      const horarios = resultado.horarios || [];
      selectHora.innerHTML = horarios.length
        ? `<option value="">Selecione um horário</option>${horarios.map((h) => `<option value="${h.valor}">${h.exibicao}</option>`).join('')}`
        : '<option value="">Nenhum horário disponível</option>';
      selectHora.disabled = !horarios.length;
      if (aviso) aviso.textContent = horarios.length ? `${horarios.length} horário(s) disponível(is).` : 'Não há horários livres para esta data e serviço.';
    } catch (erro) {
      selectHora.innerHTML = '<option value="">Não foi possível carregar</option>';
      if (aviso) aviso.textContent = erro.message;
    }
  }

  function abrirPagamento(resultado, nome) {
    let modal = $('#modal-pagamento');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-pagamento';
      modal.className = 'modal-agendamento';
      document.body.appendChild(modal);
    }
    const pagamentoPix = resultado.pagamento || {};
    modal.innerHTML = `<div class="form-agendamento pagamento-pix"><button type="button" class="fechar-agendamento" aria-label="Fechar">Fechar ×</button><h3>Pagamento via Pix</h3><p>${nome}, sua reserva foi criada. Pague ${pagamentoPix.valor ? `R$ ${Number(pagamentoPix.valor).toFixed(2).replace('.', ',')}` : 'o valor indicado'} para confirmar o horário.</p>${pagamentoPix.qrCodeBase64 ? `<img class="pix-qr" src="data:image/png;base64,${pagamentoPix.qrCodeBase64}" alt="QR Code para pagamento Pix">` : ''}<label class="pix-copia-label">Pix Copia e Cola<input id="pix-copia-cola" value="${pagamentoPix.qrCode || ''}" readonly></label><div class="form-acoes"><button type="button" class="botao botao-destaque" id="copiar-pix">Copiar Pix</button>${pagamentoPix.ticketUrl ? `<a class="botao" href="${pagamentoPix.ticketUrl}" target="_blank" rel="noopener">Abrir pagamento</a>` : ''}</div><small>Após o pagamento, o Mercado Pago notificará o sistema automaticamente.</small></div>`;
    modal.classList.add('aberto');
    modal.querySelector('.fechar-agendamento')?.addEventListener('click', () => modal.classList.remove('aberto'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('aberto'); }, { once: true });
    modal.querySelector('#copiar-pix')?.addEventListener('click', async () => {
      const campo = modal.querySelector('#pix-copia-cola');
      try { await navigator.clipboard.writeText(campo.value); modal.querySelector('#copiar-pix').textContent = 'Pix copiado'; } catch { campo.select(); document.execCommand('copy'); }
    });
  }

  function abrir(servicoInicial = '') {
    let modal = $('#modal-agendamento');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-agendamento';
      modal.className = 'modal-agendamento';
      const campoPagamento = pagamentoDisponivel ? `<label>Pagamento<select name="pagamentoAntecipado"><option value="nao">Não, pagar no atendimento</option><option value="sim">Sim, pagar ${pagamento.percentual || 30}% antecipado via Pix</option></select></label>` : '';
      const avisoPagamento = pagamentoDisponivel ? `<div class="aviso-pagamento">Pagamento online protegido pelo Mercado Pago.</div>` : `<div class="aviso-pagamento">Pagamento no atendimento. O agendamento será registrado e você receberá as orientações pelo WhatsApp.</div>`;
      modal.innerHTML = `<form class="form-agendamento" id="form-agendamento"><button type="button" class="fechar-agendamento" aria-label="Fechar">Fechar ×</button><h3>Agende seu atendimento</h3><p>Sua solicitação será registrada no sistema e encaminhada para atendimento.</p><div class="form-grid"><label>Nome<input name="nome" required autocomplete="name" placeholder="Seu nome"></label><label>E-mail<input name="email" type="email" autocomplete="email" placeholder="voce@email.com"></label><label>Telefone<input name="telefone" required autocomplete="tel" placeholder="(00) 00000-0000"></label><label>Serviço<select name="servico" required></select></label><label>Data preferida<input type="date" name="data" required></label><label>Horário disponível<select name="hora" required disabled><option value="">Selecione a data e o serviço</option></select></label>${campoPagamento}<label>Observação<textarea name="observacao" placeholder="Alguma preferência? (opcional)"></textarea></label></div><div data-disponibilidade class="aviso-pagamento" aria-live="polite"></div>${avisoPagamento}<div class="form-acoes"><button type="button" class="fechar-agendamento">Cancelar</button><button class="botao botao-destaque" type="submit">Confirmar agendamento</button></div></form>`;
      document.body.appendChild(modal);
      const selectServico = modal.querySelector('[name="servico"]');
      const lista = catalogo.servicos.length ? catalogo.servicos : (c.servicos || []).map((s) => ({ nome: s.nome }));
      selectServico.innerHTML = lista.map((s) => `<option value="${s.nome}">${s.nome}</option>`).join('');
      const dataInput = modal.querySelector('[name="data"]');
      dataInput.min = new Date().toISOString().slice(0, 10);
      modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.fechar-agendamento')) modal.classList.remove('aberto'); });
      selectServico.addEventListener('change', () => carregarHorarios(modal));
      dataInput.addEventListener('change', () => carregarHorarios(modal));
      modal.querySelector('[name="pagamentoAntecipado"]')?.addEventListener('change', (e) => { const email = modal.querySelector('[name="email"]'); if (email) email.required = e.target.value === 'sim'; });
      modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const botao = form.querySelector('button[type="submit"]');
        const dados = new FormData(form);
        const data = dados.get('data');
        const hora = dados.get('hora');
        if (!hora) return alert('Selecione um horário disponível.');
        const inicio = new Date(hora);
        if (Number.isNaN(inicio.getTime())) return alert('Selecione um horário válido.');
        const querPagamento = pagamentoDisponivel && dados.get('pagamentoAntecipado') === 'sim';
        const payload = { nome: dados.get('nome'), email: dados.get('email'), telefone: dados.get('telefone'), servico: dados.get('servico'), inicio: inicio.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, observacoes: dados.get('observacao') || '', pagamentoAntecipado: querPagamento };
        botao.disabled = true; botao.textContent = 'Registrando...';
        try {
          const response = await fetch('/api/agendamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const resultado = await response.json().catch(() => ({}));
          if (!response.ok) { if (response.status === 409) await carregarHorarios(modal); throw new Error(resultado.erro || 'Não foi possível registrar o horário.'); }
          if (querPagamento) {
            botao.textContent = 'Gerando Pix...';
            const pagamentoResponse = await fetch('/api/pagamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agendamentoId: resultado.agendamento.id, email: payload.email }) });
            const pagamentoResultado = await pagamentoResponse.json().catch(() => ({}));
            if (!pagamentoResponse.ok) throw new Error(pagamentoResultado.erro || 'Não foi possível gerar o Pix.');
            modal.classList.remove('aberto'); form.reset(); abrirPagamento(pagamentoResultado, payload.nome); return;
          }
          const texto = `Olá! Meu nome é ${payload.nome}. Solicitei o agendamento de ${payload.servico} para ${data} às ${new Date(hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Protocolo: ${resultado.agendamento?.id || 'pendente'}.${payload.observacoes ? ` Observação: ${payload.observacoes}` : ''}`;
          window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
          modal.classList.remove('aberto'); form.reset();
        } catch (erro) {
          alert(erro.message || 'Não foi possível concluir o agendamento.');
        } finally { botao.disabled = false; botao.textContent = 'Confirmar agendamento'; }
      });
    }
    const select = modal.querySelector('[name="servico"]');
    if (servicoInicial && select) select.value = servicoInicial;
    const dataInput = modal.querySelector('[name="data"]');
    if (!dataInput.value) dataInput.value = new Date().toISOString().slice(0, 10);
    modal.classList.add('aberto');
    carregarHorarios(modal);
    modal.querySelector('input')?.focus();
  }

  document.querySelectorAll('[data-link="agendamento"]').forEach((a) => {
    a.href = '#';
    a.textContent = 'Agendar agora';
    a.addEventListener('click', (e) => { e.preventDefault(); abrir(); });
  });
  const contato = document.querySelector('.contato');
  if (contato && !contato.querySelector('.rodape-links')) { const links = document.createElement('div'); links.className = 'rodape-links'; links.innerHTML = '<a href="privacidade.html">Privacidade</a><a href="termos.html">Termos de uso</a>'; contato.appendChild(links); }
  carregarCatalogo();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarComercial); else iniciarComercial();
