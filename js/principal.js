const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
document.addEventListener('DOMContentLoaded',()=>{
  const c=window.configuracaoBarbearia;
  $$('[data-config]').forEach(e=>{const k=e.dataset.config;if(c[k]!==undefined)e.textContent=c[k]});
  $$('[data-link]').forEach(e=>{const k=e.dataset.link;if(k==='whatsapp')e.href=`https://wa.me/${c.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de agendar um horário na barbearia.')}`;else if(k==='email')e.href=`mailto:${c.email}`;else if(c[k]!==undefined)e.href=c[k]});
  $('#ano').textContent=new Date().getFullYear();
  $('#lista-servicos').innerHTML=c.servicos.map(s=>`<article class="servico"><span class="icone">${s.icone}</span><strong class="preco">${s.preco}</strong><h3>${s.nome}</h3><p>${s.descricao}</p></article>`).join('');
  $('#lista-profissionais').innerHTML=c.profissionais.map(p=>`<article class="profissional"><img loading="lazy" decoding="async" src="${p.imagem}" alt="${p.nome} — ${p.descricao}"><div class="profissional-info"><h3>${p.nome}</h3><p>${p.descricao}</p></div></article>`).join('');
  $('#lista-precos').innerHTML=c.precos.map(p=>`<div class="linha-preco"><strong>${p.nome} ${p.destaque?'<span class="badge">Mais popular</span>':''}</strong><span>${p.descricao}</span><b class="valor">${p.valor}</b></div>`).join('');
  $('#lista-galeria').innerHTML=c.galeria.map((x,i)=>`<button type="button" data-imagem="${i}" aria-label="Abrir imagem ${i+1} da galeria"><img loading="lazy" decoding="async" src="${x}" alt="Galeria da ${c.nome} — imagem ${i+1}"></button>`).join('');
  const header=$('.cabecalho'),top=$('#voltar-topo');
  const atualizarScroll=()=>{header.classList.toggle('scrolled',scrollY>30);top.classList.toggle('visivel',scrollY>500)};
  addEventListener('scroll',atualizarScroll,{passive:true});atualizarScroll();
  top.onclick=()=>scrollTo({top:0,behavior:'smooth'});
});