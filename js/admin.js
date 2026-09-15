(() => {
  const tokenInput = document.querySelector('#token');
  const statusEl = document.querySelector('#status');
  const painel = document.querySelector('#painel');
  const agenda = document.querySelector('#agenda');
  const servicos = document.querySelector('#servicos');
  const barbeiros = document.querySelector('#barbeiros');
  const filtro = document.querySelector('#filtro');
  let token = sessionStorage.getItem('adminToken') || '';
  tokenInput.value = token;

  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mensagem = (texto, erro = false) => { statusEl.textContent = texto; statusEl.className = `status ${erro ? 'erro' : 'ok'}`; };

  async function carregar() {
    if (!token) return mensagem('Informe o token administrativo.', true);
    mensagem('Carregando...');
    const query = filtro.value ? `?status=${encodeURIComponent(filtro.value)}` : '';
    const r = await fetch(`/api/admin${query}`, { headers: { 'x-admin-token': token } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { painel.hidden = true; return mensagem(data.erro || 'Não autorizado.', true); }
    painel.hidden = false;
    mensagem('Painel atualizado.');
    renderAgenda(data.agendamentos || []);
    servicos.innerHTML = data.servicos?.length ? data.servicos.map((s) => `<p><strong>${escapeHtml(s.nome)}</strong> — ${escapeHtml(s.duracao_minutos)} min — R$ ${Number(s.preco).toFixed(2).replace('.', ',')} — ${s.ativo ? 'ativo' : 'inativo'}</p>`).join('') : '<div class="vazio">Nenhum serviço.</div>';
    barbeiros.innerHTML = data.barbeiros?.length ? data.barbeiros.map((b) => `<p><strong>${escapeHtml(b.nome)}</strong>${b.especialidade ? ` — ${escapeHtml(b.especialidade)}` : ''} — ${b.ativo ? 'ativo' : 'inativo'}</p>`).join('') : '<div class="vazio">Nenhum barbeiro.</div>';
  }

  function renderAgenda(lista) {
    if (!lista.length) return agenda.innerHTML = '<div class="vazio">Nenhum agendamento encontrado.</div>';
    agenda.innerHTML = `<table class="tabela"><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>${lista.map((a) => `<tr><td>${new Date(a.inicio).toLocaleString('pt-BR')}</td><td><strong>${escapeHtml(a.cliente_nome)}</strong><br>${escapeHtml(a.telefone)}${a.email ? `<br>${escapeHtml(a.email)}` : ''}</td><td>${escapeHtml(a.servico_nome)}<br><small>${escapeHtml(a.status)}</small></td><td>${escapeHtml(a.pagamento_status)}</td><td><div class="acoes">${['pendente','confirmado','concluido','cancelado'].map((s) => `<button data-id="${a.id}" data-status="${s}">${s}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>`;
    agenda.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => alterarStatus(b.dataset.id, b.dataset.status)));
  }

  async function alterarStatus(id, status) {
    const r = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ id, status }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return mensagem(data.erro || 'Não foi possível alterar o status.', true);
    await carregar();
  }

  document.querySelector('#entrar').addEventListener('click', async () => { token = tokenInput.value.trim(); if (token) sessionStorage.setItem('adminToken', token); else sessionStorage.removeItem('adminToken'); await carregar(); });
  document.querySelector('#atualizar').addEventListener('click', carregar);
  document.querySelector('#filtro').addEventListener('change', carregar);
  document.querySelector('#sair').addEventListener('click', () => { token = ''; sessionStorage.removeItem('adminToken'); tokenInput.value = ''; painel.hidden = true; mensagem('Sessão encerrada.'); });
  if (token) carregar();
})();
