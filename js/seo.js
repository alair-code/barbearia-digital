(function(){
  const c=window.configuracaoBarbearia||{};
  const seo=c.seo||{};
  const titulo=seo.titulo||c.nome||document.title;
  const descricao=c.descricao||'Corte, barba e estilo com atendimento profissional.';
  document.title=titulo;
  const setMeta=(name,content)=>{let el=document.querySelector(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=content};
  setMeta('description',descricao);if(seo.palavrasChave)setMeta('keywords',seo.palavrasChave);
  const setOg=(property,content)=>{let el=document.querySelector(`meta[property="${property}"]`);if(!el){el=document.createElement('meta');el.setAttribute('property',property);document.head.appendChild(el)}el.content=content};
  setOg('og:title',titulo);setOg('og:description',descricao);setOg('og:site_name',c.nome||titulo);setOg('og:locale','pt_BR');
  const schema={'@context':'https://schema.org','@type':'BarberShop',name:c.nome||'Barbearia',description:descricao,telephone:c.telefone||'',email:c.email||'',url:location.origin,address:{'@type':'PostalAddress',streetAddress:c.endereco||'',addressLocality:c.cidade||'',addressRegion:c.estado||'BR',addressCountry:c.pais||'BR'},priceRange:'$$',sameAs:[c.instagram,c.facebook,c.tiktok].filter(x=>x&&x!=='#')};
  let script=document.getElementById('schema-local-business');if(!script){script=document.createElement('script');script.id='schema-local-business';script.type='application/ld+json';document.head.appendChild(script)}script.textContent=JSON.stringify(schema);
  if(!document.querySelector('link[data-comercial-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='css/comercial.css';l.dataset.comercialCss='1';document.head.appendChild(l)}
  if(!document.querySelector('script[data-comercial-js]')){const s=document.createElement('script');s.src='js/comercial.js';s.dataset.comercialJs='1';document.body.appendChild(s)}
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visivel');observer.unobserve(entry.target)}}),{threshold:.12}):null;
  if(observer)document.querySelectorAll('.secao>*,.cta>*,.diferenciais article').forEach(el=>{el.classList.add('revelar');observer.observe(el)});
})();