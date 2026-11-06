/* MAGNA Properties — site (PT)
   Sem cookies e sem armazenamento no dispositivo. A origem da visita (UTM e site de onde veio)
   é passada entre páginas no próprio link, e só é enviada se a pessoa preencher um formulário. */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const PAGE=document.body.dataset.page||'inicio';
const FORMS_ENDPOINT='https://magna-forms.magnaproperties.workers.dev/';
const WA='https://wa.me/351935904830';
const EN=(document.documentElement.lang||'').startsWith('en');
const T=(pt,en)=>EN?en:pt;
const PATHS={'/en/':'inicio','/en/invest/':'investir','/en/markets/':'mercados','/en/markets/loule/':'loule','/en/markets/faro/':'faro','/en/markets/olhao/':'olhao','/en/about/':'sobre','/en/contact/':'contactos','/en/present-a-deal/':'vender','/en/privacy-policy.html':'privacidade','/en/cookie-policy.html':'cookies','/':'inicio','/investir/':'investir','/mercados/':'mercados','/mercados/loule/':'loule','/mercados/faro/':'faro','/mercados/olhao/':'olhao','/quem-somos/':'sobre','/contactos/':'contactos','/vender/':'vender','/politica-de-privacidade.html':'privacidade','/politica-de-cookies.html':'cookies'};

/* ---------- origem da visita (só em memória e nos links internos) ---------- */
const UTM=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const q=new URLSearchParams(location.search);
const ATTR=(function(){
  const t={};
  UTM.forEach(k=>{const v=q.get(k);if(v)t[k]=v.slice(0,120)});
  let ref='',prev='';
  try{if(document.referrer){const u=new URL(document.referrer);if(u.hostname!==location.hostname)ref=u.hostname;else prev=PATHS[u.pathname]||''}}catch(e){}
  t.referrer=(q.get('mg_ref')||ref).slice(0,120);
  t.landing=(q.get('mg_land')||location.pathname).slice(0,200);
  return {first:t,visit:t,prev};
})();
// Página em que a pessoa estava quando decidiu contactar-nos (ex.: veio de Loulé para o formulário).
const fromPage=(ATTR.prev&&ATTR.prev!==PAGE)?ATTR.prev:PAGE;
// Leva a origem para as páginas seguintes, sem a guardar no dispositivo.
(function(){
  const carry=new URLSearchParams();
  UTM.forEach(k=>{if(ATTR.first[k])carry.set(k,ATTR.first[k])});
  if(ATTR.first.referrer)carry.set('mg_ref',ATTR.first.referrer);
  if(![...carry.keys()].length)return;
  carry.set('mg_land',ATTR.first.landing);
  $$('a[href^="/"]').forEach(a=>{const u=new URL(a.getAttribute('href'),location.origin);carry.forEach((v,k)=>u.searchParams.set(k,v));a.setAttribute('href',u.pathname+u.search+u.hash)});
})();

/* ---------- menu móvel, copiar, medição (desligada) ---------- */
function track(){} // Sem Google Analytics: nada é enviado.
const burger=$('.burger');
if(burger)burger.addEventListener('click',()=>{const n=$('#mnav'),o=n.dataset.open!=='true';n.dataset.open=o;burger.setAttribute('aria-expanded',o)});
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-copy]');
  if(c){try{navigator.clipboard.writeText(c.dataset.copy).then(()=>{const s=c.querySelector('span')||c;s.textContent=T('Copiado','Copied')},()=>{})}catch(err){}}
});

/* ---------- verificação anti-spam (Cloudflare Turnstile) ----------
   Desenhada só quando é precisa: no "Quero investir" só no último passo. Só se vê se o
   Cloudflare pedir interação, e desaparece logo a seguir ao "Sucesso!". */
function tsRender(el){
  if(!el||el.dataset.wid||!window.turnstile)return;
  el.dataset.wid=window.turnstile.render(el,{sitekey:el.dataset.sitekey,language:el.dataset.language||'auto',appearance:'interaction-only','refresh-expired':'auto',
    callback:()=>setTimeout(()=>{el.style.display='none'},1200),
    'expired-callback':()=>{el.style.display=''},'error-callback':()=>{el.style.display=''}});
}
function tsToken(el){try{return(el&&el.dataset.wid&&window.turnstile&&window.turnstile.getResponse(el.dataset.wid))||''}catch(e){return ''}}
function tsReset(el){if(el&&el.dataset.wid&&window.turnstile){el.style.display='';try{window.turnstile.reset(el.dataset.wid)}catch(e){}}}
window.magnaTS=function(){$$('[data-turnstile]').forEach(el=>{if(!el.closest('#invform'))tsRender(el)});const s4=document.querySelector('#invform fieldset[data-step="4"]');if(s4&&!s4.hidden)tsRender($('#invform [data-turnstile]'))};
if(window.turnstile)window.magnaTS();

/* ---------- envio para o Worker (Cloudflare) → Notion e MailerLite ---------- */
function validPhone(v){const d=(v||'').replace(/[^\d+]/g,'');return /^\+?\d{9,15}$/.test(d)}
async function sendLead(kind,data,form,btn,errEl){
  if(btn.disabled)return false;
  const hp=form.querySelector('input[name=website]');
  const tsEl=form.querySelector('[data-turnstile]');tsRender(tsEl);
  const tok=()=>tsToken(tsEl);
  const body={form:kind,site_lang:EN?'en':'pt',source_page:fromPage,attribution:{first:ATTR.first,visit:ATTR.visit},turnstile:'',website:hp?hp.value:'',...data};
  const old=btn.innerHTML;btn.disabled=true;btn.innerHTML=T('A enviar…','Sending…');errEl.textContent='';
  try{
    if(body.website)return true;
    // Espera até 10 s pelo código da verificação anti-spam (pode ainda estar a ser gerado).
    if(!tok()&&window.turnstile){btn.innerHTML=T('A verificar…','Checking…');for(let i=0;i<20&&!tok();i++)await new Promise(r=>setTimeout(r,500));btn.innerHTML=T('A enviar…','Sending…');}
    body.turnstile=tok();
    if(!body.turnstile)throw new Error(window.turnstile?'turnstile':'turnstile-blocked');
    const r=await fetch(FORMS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)throw new Error(j.error==='turnstile'?'turnstile-rejected':(j.error||('HTTP '+r.status)));
    return true;
  }catch(e){
    errEl.innerHTML=e.message==='turnstile-blocked'
      ?T('A verificação anti-spam não carregou. Se usa um bloqueador de anúncios ou de privacidade, desative-o para este site e recarregue a página, ou <a href="'+WA+'" target="_blank" rel="noopener">fale connosco por WhatsApp</a>.','The anti-spam check did not load. If you use an ad or privacy blocker, turn it off for this site and reload the page, or <a href="'+WA+'" target="_blank" rel="noopener">message us on WhatsApp</a>.')
      :(e.message==='turnstile'||e.message==='turnstile-rejected')
      ?T('Aguarde um instante pela verificação anti-spam e tente novamente. Se não funcionar, <a href="'+WA+'" target="_blank" rel="noopener">fale connosco por WhatsApp</a>.','Please wait a moment for the anti-spam check and try again. If it still fails, <a href="'+WA+'" target="_blank" rel="noopener">message us on WhatsApp</a>.')
      :T('Não conseguimos enviar o pedido. Tente novamente ou <a href="'+WA+'" target="_blank" rel="noopener">fale connosco por WhatsApp</a>.','We could not send your request. Please try again or <a href="'+WA+'" target="_blank" rel="noopener">message us on WhatsApp</a>.');
    tsReset(tsEl);
    return false;
  }finally{btn.disabled=false;btn.innerHTML=old;}
}
const EMAIL_OK=v=>/^\S+@\S+\.\S+$/.test(v);

/* ---------- formulário "Quero investir" (4 passos) ---------- */
const inv=$('#invform');
if(inv){
  let step=1;
  const showStep=n=>{step=n;$$('fieldset[data-step]',inv).forEach(f=>f.hidden=+f.dataset.step!==n);$('#inv-prog').style.width=(n*25)+'%';$('#inv-back').hidden=n===1;$('#inv-next').innerHTML=n===4?T('Enviar pedido','Send request'):T('Continuar →','Continue →');$('#inv-err').textContent='';if(n===4)tsRender($('[data-turnstile]',inv));};
  const err=t=>{$('#inv-err').textContent=t};
  inv.addEventListener('submit',async e=>{e.preventDefault();
    if(step===1&&!$$('input[name=area]:checked',inv).length)return err(T('Escolha pelo menos um concelho.','Choose at least one municipality.'));
    if(step===2&&!$('input[name=strategy]:checked',inv))return err(T('Escolha uma estratégia (ou “Ainda não sei”).','Choose a strategy (or “Not sure yet”).'));
    if(step===3&&!$('input[name=capital]:checked',inv))return err(T('Indique o intervalo de capital.','Choose a capital range.'));
    if(step===4){
      if(!$('#i-name').value.trim())return err(T('Indique o seu nome.','Enter your name.'));
      if(!EMAIL_OK($('#i-email').value))return err(T('O email não parece válido. Verifique se tem “@” e domínio.','The email looks invalid. Check the “@” and the domain.'));
      if(!validPhone($('#i-phone').value))return err(T('Indique um telefone válido (com indicativo, se não for português).','Enter a valid phone number, with the country code if it is not Portuguese.'));
      if(!$('#i-priv').checked)return err(T('Para o contactarmos, confirme que leu a Política de Privacidade.','So we can contact you, please confirm you have read the Privacy Policy.'));
      const d={name:$('#i-name').value.trim(),email:$('#i-email').value.trim(),phone:$('#i-phone').value.trim(),areas:$$('input[name=area]:checked',inv).map(i=>i.value),strategy:$('input[name=strategy]:checked',inv).value,capital:$('input[name=capital]:checked',inv).value,bank_credit:$('#k-fin').checked,preferred_lang:$('#i-lang').value,privacy:true,report:$('#i-mkt').checked};
      if(!await sendLead('investir',d,inv,$('#inv-next'),$('#inv-err')))return;
      track('generate_lead');
      inv.hidden=true;$('.progress').hidden=true;$('#inv-done').hidden=false;return;
    }
    showStep(step+1);
  });
  $('#inv-back').addEventListener('click',()=>showStep(step-1));
  $('#a-any').addEventListener('change',e=>{if(e.target.checked)$$('input[name=area]:not(#a-any)',inv).forEach(i=>i.checked=false)});
  $$('input[name=area]:not(#a-any)',inv).forEach(i=>i.addEventListener('change',()=>{if(i.checked)$('#a-any').checked=false}));
}

/* ---------- formulário "Apresentar negócio" ---------- */
const vf=$('#vform');
if(vf)vf.addEventListener('submit',async e=>{e.preventDefault();const er=$('#v-err');
  if(!$('#v-name').value.trim()||!$('#v-phone').value.trim()){er.textContent=T('Indique o nome e o telefone / WhatsApp.','Enter your name and phone / WhatsApp.');return}
  if(!EMAIL_OK($('#v-email').value)){er.textContent=T('O email não parece válido. Verifique se tem “@” e domínio.','The email looks invalid. Check the “@” and the domain.');return}
  if(!validPhone($('#v-phone').value)){er.textContent=T('Indique um telefone válido (com indicativo, se não for português).','Enter a valid phone number, with the country code if it is not Portuguese.');return}
  if(!$('#v-priv').checked){er.textContent=T('Confirme que leu a Política de Privacidade.','Please confirm you have read the Privacy Policy.');return}
  const d={name:$('#v-name').value.trim(),email:$('#v-email').value.trim(),phone:$('#v-phone').value.trim(),property_type:$('#v-type').value,municipality:$('#v-area').value,role:$('#v-who').value,privacy:true};
  if(!await sendLead('vender',d,vf,$('#v-send'),er))return;
  vf.hidden=true;$('#v-done').hidden=false;});

/* ---------- formulário do relatório trimestral ---------- */
const rf=$('#rform');
if(rf)rf.addEventListener('submit',async e=>{e.preventDefault();const er=$('#r-err');
  if(!$('#r-name').value.trim()){er.textContent=T('Indique o seu nome.','Enter your name.');return}
  if(!EMAIL_OK($('#r-email').value)){er.textContent=T('O email não parece válido. Verifique se tem “@” e domínio.','The email looks invalid. Check the “@” and the domain.');return}
  const d={name:$('#r-name').value.trim(),email:$('#r-email').value.trim(),report:true};
  if(!await sendLead('relatorio',d,rf,$('#r-send'),er))return;
  rf.hidden=true;$('#r-done').hidden=false;});

/* ---------- Gerir dados: pedido RGPD por email ---------- */
const gd=$('#gdform');
if(gd)gd.addEventListener('submit',e=>{e.preventDefault();
  const name=$('#req-name').value.trim(),email=$('#req-email').value.trim(),sel=$('#req-type'),detail=$('#req-detail').value.trim();
  if(!name||!EMAIL_OK(email)||!sel.value){$('#req-err').textContent=T('Preencha o nome, um email válido e o tipo de pedido.','Enter your name, a valid email and the type of request.');return}
  $('#req-err').textContent='';
  const label=sel.options[sel.selectedIndex].text;
  const body=T('Nome: ','Name: ')+name+'\nEmail: '+email+T('\nPedido: ','\nRequest: ')+label+(detail?'\n\n'+detail:'')+'\n\n---\n'+location.host+location.pathname;
  location.href='mailto:info@magnaproperties.pt?subject='+encodeURIComponent(T('Pedido RGPD — ','GDPR request — ')+label)+'&body='+encodeURIComponent(body);
  setTimeout(()=>{$('#req-done').hidden=false},800);
});

/* ---------- rede animada do topo da página inicial ---------- */
(function(){const c=$('#net');if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const x=c.getContext('2d'),hero=c.parentElement;let w,h,P=[],Q=[],run=true,raf,t=0,m={x:0,y:0,on:false};const LD=170,MR=230;
 function size(){const r=hero.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;c.width=w*d;c.height=h*d;x.setTransform(d,0,0,d,0,0)}
 function init(){size();const n=Math.round(Math.min(140,Math.max(48,w*h/10000)));P=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,r:Math.random()*1.6+1,ph:Math.random()*6.28}));Q=[]}
 function f(){t+=.016;x.clearRect(0,0,w,h);const pairs=[];
  for(const p of P){if(m.on){const dx=m.x-p.x,dy=m.y-p.y,d=Math.hypot(dx,dy);if(d<MR&&d>1){p.vx+=dx/d*.006;p.vy+=dy/d*.006}}
   const s=Math.hypot(p.vx,p.vy);if(s>.9){p.vx*=.9/s;p.vy*=.9/s}else if(s<.18){p.vx*=1.04;p.vy*=1.04}
   p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1}
  x.lineWidth=1;
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<LD){x.strokeStyle=`rgba(212,169,106,${(1-d/LD)*.3})`;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();if(d<LD*.7)pairs.push([a,b])}}
  if(m.on)for(const p of P){const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<MR){x.strokeStyle=`rgba(232,196,130,${(1-d/MR)*.45})`;x.beginPath();x.moveTo(m.x,m.y);x.lineTo(p.x,p.y);x.stroke()}}
  if(pairs.length&&Q.length<6&&Math.random()<.05){const pr=pairs[Math.floor(Math.random()*pairs.length)];Q.push({a:pr[0],b:pr[1],k:0})}
  Q=Q.filter(q=>(q.k+=.012)<1);
  for(const q of Q){const px=q.a.x+(q.b.x-q.a.x)*q.k,py=q.a.y+(q.b.y-q.a.y)*q.k;const g=x.createRadialGradient(px,py,0,px,py,9);g.addColorStop(0,'rgba(255,226,170,.75)');g.addColorStop(1,'rgba(212,169,106,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,9,0,6.283);x.fill()}
  for(const p of P){const al=.5+.3*Math.sin(t*1.2+p.ph);x.fillStyle=`rgba(222,182,118,${al})`;x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill()}
  if(run)raf=requestAnimationFrame(f)}
 hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();m.x=e.clientX-r.left;m.y=e.clientY-r.top;m.on=true});
 hero.addEventListener('pointerleave',()=>{m.on=false});
 new IntersectionObserver(es=>{run=es[0].isIntersecting;cancelAnimationFrame(raf);if(run){if(!w||w<10)init();else size();raf=requestAnimationFrame(f)}}).observe(c);
 document.addEventListener('visibilitychange',()=>{run=!document.hidden;cancelAnimationFrame(raf);if(run)raf=requestAnimationFrame(f)});
 addEventListener('resize',init);init();f();
})();

/* ---------- gráfico de Loulé: 17 em 100 ---------- */
(function(){const s=$('#ill-loule');if(!s)return;let h='';for(let i=0;i<100;i++){const col=Math.floor(i/5),row=i%5;h+=`<rect class="sq${i<17?' on':''}" x="${col*11}" y="${30+row*11}" width="8" height="8" rx="1"/>`}s.innerHTML=h})();

/* ---------- gráficos dos mercados: animam uma vez quando aparecem ---------- */
(function(){if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
 document.documentElement.classList.add('anim');
 $$('#ill-loule .sq').forEach((s,i)=>{s.style.transitionDelay=s.classList.contains('on')?`${0.5+i*0.09}s, ${0.6+i*0.09}s`:`${i*0.006}s`});
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const s=e.target;io.unobserve(s);s.classList.add('play');
   const n=s.querySelector('.ill-num');if(n){const t0=performance.now(),dur=2200;const tick=now=>{const k=Math.min(1,(now-t0)/dur),v=Math.round(73*(1-Math.pow(1-k,3)));n.textContent=v+'%';if(k<1)requestAnimationFrame(tick)};n.textContent='0%';requestAnimationFrame(tick)}
 }),{threshold:.55});
 $$('.mk-row .ill').forEach(s=>io.observe(s));
})();

/* ---------- WhatsApp e barra móvel aparecem depois do primeiro ecrã ---------- */
function onScroll(){document.documentElement.classList.toggle('scrolled',scrollY>innerHeight*.6)}
addEventListener('scroll',onScroll,{passive:true});onScroll();
})();
