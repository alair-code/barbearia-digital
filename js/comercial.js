function iniciarComercial() {
  const c = window.configuracaoBarbearia || {};
  const $ = (s) => document.querySelector(s);
  const pagamento = c.pagamento || { antecipadoOpcional: false, percentual: 30, provedor: 'mercado_pago' };
  const pagamentoDisponivel = pagamento.antecipadoOpcional === true;

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

  const nav = document.querySelector('.navegacao');
  if (nav && !document.querySelector('[data-nav-agendar]')) {
    const a = document.createElement('a');
    a.className = 'botao botao-destaque';
    a.href = '#';
    a.dataset.navAgendar = '1';
    a.textContent = 'Agendar agora';
    a.addEventListener('click', (e) => { e.preventDefault(); abrir(); });
    nav.appendChild(a);
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
      try {
        await navigator.clipboard.writeText(campo.value);
        const botao = modal.querySelector('#copiar-pix');
        botao.textContent = 'Pix copiado';
        setTimeout(() => { botao.textContent = 'Copiar Pix'; }, 1800);
      } catch {
        campo.select();
        document.execCommand('copy');
      }
    });
  }

  function abrir(servicoInicial = '') {
    let modal = $('#modal-agendamento');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-agendamento';
      modal.className = 'modal-agendamento';
      const campoPagamento = pagamentoDisponivel
        ? `<label>Pagamento<select name="pagamentoAntecipado"><option value="nao">Não, pagar no atendimento</option><option value="sim">Sim, pagar ${pagamento.percentual || 30}% antecipado via Pix</option></select></label>`
        : '';
      const avisoPagamento = pagamentoDisponivel
        ? `<div class="aviso-pagamento">Pagamento online protegido pelo Mercado Pago. O sistema só confirma o agendamento após receber a confirmação do gateway.</div>`
        : `<div class="aviso-pagamento">Pagamento no atendimento. O agendamento será registrado e você receberá as orientações pelo WhatsApp.</div>`;
      modal.innerHTML = `<form class="form-agendamento" id="form-agendamento"><button type="button" class="fechar-agendamento" aria-label="Fechar">Fechar ×</button><h3>Agende seu atendimento</h3><p>Sua solicitação será registrada no sistema e encaminhada para atendimento.</p><div class="form-grid"><label>Nome<input name="nome" required autocomplete="name" placeholder="Seu nome"></label><label>E-mail<input name="email" type="email" autocomplete="email" placeholder="voce@email.com"></label><label>Telefone<input name="telefone" required autocomplete="tel" placeholder="(00) 00000-0000"></label><label>Serviço<select name="servico" required>${(c.servicos || []).map((s) => `<option value="${s.nome}">${s.nome}</option>`).join('')}</select></label><label>Data preferida<input type="date" name="data" required></label><label>Horário preferido<input type="time" name="hora" required></label>${campoPagamento}<label>Observação<textarea name="observacao" placeholder="Alguma preferência? (opcional)"></textarea></div>${avisoPagamento}<div class="form-acoes"><button type="button" class="fechar-agendamento">Cancelar</button><button class="botao botao-destaque" type="submit">Confirmar agendamento</button></div></form>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.fechar-agendamento')) modal.classList.remove('aberto'); });
      modal.querySelector('[name="pagamentoAntecipado"]')?.addEventListener('change', (e) => {
        const email = modal.querySelector('[name="email"]');
        if (email) email.required = e.target.value === 'sim';
      });
      modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const botao = form.querySelector('button[type="submit"]');
        const dados = new FormData(form);
        const data = dados.get('data');
        const hora = dados.get('hora');
        const inicio = new Date(`${data}T${hora}:00`);
        const querPagamento = pagamentoDisponivel && dados.get('pagamentoAntecipado') === 'sim';
        const payload = {
          nome: dados.get('nome'),
          email: dados.get('email'),
          telefone: dados.get('telefone'),
          servico: dados.get('servico'),
          inicio: inicio.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          observacoes: dados.get('observacao') || '',
          pagamentoAntecipado: querPagamento
        };
        botao.disabled = true;
        botao.textContent = 'Registrando...';
        try {
          const response = await fetch('/api/agendamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const resultado = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(resultado.erro || 'Não foi possível registrar o horário.');

          if (querPagamento) {
            botao.textContent = 'Gerando Pix...';
            const pagamentoResponse = await fetch('/api/pagamentos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agendamentoId: resultado.agendamento.id, email: payload.email })
            });
            const pagamentoResultado = await pagamentoResponse.json().catch(() => ({}));
            if (!pagamentoResponse.ok) throw new Error(pagamentoResultado.erro || 'Não foi possível gerar o Pix.');
            modal.classList.remove('aberto');
            form.reset();
            abrirPagamento(pagamentoResultado, payload.nome);
            return;
          }

          const texto = `Olá! Meu nome é ${payload.nome}. Solicitei o agendamento de ${payload.servico} para ${data} às ${hora}. Protocolo: ${resultado.agendamento?.id || 'pendente'}.${payload.observacoes ? ` Observação: ${payload.observacoes}` : ''}`;
          window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
          modal.classList.remove('aberto');
          form.reset();
        } catch (erro) {
          const texto = `Olá! Meu nome é ${payload.nome}. Quero agendar ${payload.servico} para ${data} às ${hora}.${payload.observacoes ? ` Observação: ${payload.observacoes}` : ''}`;
          window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
          alert(`O WhatsApp foi aberto para não perder sua solicitação. O registro automático não foi concluído: ${erro.message}`);
        } finally {
          botao.disabled = false;
          botao.textContent = 'Confirmar agendamento';
        }
      });
    }
    const select = modal.querySelector('[name="servico"]');
    if (servicoInicial && select) select.value = servicoInicial;
    modal.classList.add('aberto');
    modal.querySelector('input')?.focus();
  }

  document.querySelectorAll('[data-link="agendamento"]').forEach((a) => {
    a.href = '#';
    a.addEventListener('click', (e) => { e.preventDefault(); abrir(); });
  });

  const contato = document.querySelector('.contato');
  if (contato && !contato.querySelector('.rodape-links')) {
    const links = document.createElement('div');
    links.className = 'rodape-links';
    links.innerHTML = '<a href="privacidade.html">Privacidade</a><a href="termos.html">Termos de uso</a>';
    contato.appendChild(links);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarComercial);
else iniciarComercial();
