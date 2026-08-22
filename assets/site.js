const translations={};
let currentLang='pt';
function setLang(lang){currentLang=lang;document.documentElement.lang=lang;document.querySelectorAll('[data-pt][data-en]').forEach(el=>{el.innerHTML=el.dataset[lang]});document.querySelectorAll('.lang-toggle button').forEach(button=>button.classList.toggle('active',button.dataset.lang===lang));document.querySelectorAll('a[data-lang-link]').forEach(link=>{const base=link.getAttribute('href').split('?')[0];link.href=lang==='en'?base+'?lang=en':base})}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.lang-toggle button').forEach(button=>button.addEventListener('click',()=>setLang(button.dataset.lang)));const query=new URLSearchParams(location.search).get('lang');setLang(query==='en'||query==='pt'?query:'pt');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))});
document.addEventListener('DOMContentLoaded',()=>{const canvas=document.getElementById('particle-canvas');if(!canvas||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const ctx=canvas.getContext('2d');let width,height,particles=[];const count=70,linkDistance=150;function resize(){const dpr=Math.min(devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();width=Math.max(rect.width,innerWidth);height=Math.max(rect.height,innerHeight);canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}function init(){resize();particles=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.4+.6}))}function frame(){ctx.clearRect(0,0,width,height);for(const p of particles){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>width)p.vx*=-1;if(p.y<0||p.y>height)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(184,147,90,.55)';ctx.fill()}for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){const a=particles[i],b=particles[j],dx=a.x-b.x,dy=a.y-b.y,distance=Math.hypot(dx,dy);if(distance<linkDistance){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(184,147,90,${(1-distance/linkDistance)*.18})`;ctx.lineWidth=1;ctx.stroke()}}requestAnimationFrame(frame)}addEventListener('resize',resize);init();frame()});

const typeformConsentKey='mp-typeform-consent-v1';
const typeformConsentLifetime=180*24*60*60*1000;

function getTypeformConsent(){
  try{
    const saved=JSON.parse(localStorage.getItem(typeformConsentKey));
    if(!saved||!['accepted','rejected'].includes(saved.choice)||Date.now()-saved.savedAt>typeformConsentLifetime){
      localStorage.removeItem(typeformConsentKey);
      return null;
    }
    return saved.choice;
  }catch(error){
    localStorage.removeItem(typeformConsentKey);
    return null;
  }
}

function saveTypeformConsent(choice){
  localStorage.setItem(typeformConsentKey,JSON.stringify({choice,savedAt:Date.now()}));
}

function loadTypeform(){
  if(document.querySelector('script[data-typeform-embed]'))return;
  document.querySelectorAll('.typeform-consent-placeholder').forEach(el=>el.remove());
  const script=document.createElement('script');
  script.src='https://embed.typeform.com/next/embed.js';
  script.async=true;
  script.dataset.typeformEmbed='true';
  document.body.appendChild(script);
}

function showTypeformPlaceholder(){
  document.querySelectorAll('.typeform-shell').forEach(shell=>{
    if(shell.querySelector('.typeform-consent-placeholder'))return;
    const placeholder=document.createElement('div');
    placeholder.className='typeform-consent-placeholder';
    placeholder.innerHTML='<p data-pt="O formulário está protegido pelas suas preferências de cookies." data-en="The form is protected by your cookie preferences."></p><button class="btn btn-ghost" type="button" data-cookie-manage data-pt="Gerir cookies" data-en="Manage cookies">Gerir cookies</button>';
    shell.appendChild(placeholder);
  });
  document.querySelectorAll('[data-cookie-manage]').forEach(button=>button.addEventListener('click',showTypeformBanner));
  setLang(currentLang);
}

function hideTypeformBanner(){
  document.querySelector('.cookie-banner')?.remove();
}

function showTypeformBanner(){
  hideTypeformBanner();
  const banner=document.createElement('aside');
  banner.className='cookie-banner';
  banner.setAttribute('role','dialog');
  banner.setAttribute('aria-labelledby','cookie-banner-title');
  banner.innerHTML='<div class="cookie-banner-copy"><h2 id="cookie-banner-title" data-pt="Cookies" data-en="Cookies">Cookies</h2><p><span data-pt="Usamos cookies para carregar e melhorar o formulário." data-en="We use cookies to load and improve the form.">Usamos cookies para carregar e melhorar o formulário.</span> <a href="../politica-de-cookies.html" data-pt="Saber mais" data-en="Learn more">Saber mais</a></p></div><div class="cookie-banner-actions"><button class="btn btn-ghost" type="button" data-cookie-reject data-pt="Recusar" data-en="Reject">Recusar</button><button class="btn btn-primary" type="button" data-cookie-accept data-pt="Aceitar" data-en="Accept">Aceitar</button></div>';
  document.body.appendChild(banner);
  banner.querySelector('[data-cookie-accept]').addEventListener('click',()=>{
    saveTypeformConsent('accepted');
    hideTypeformBanner();
    loadTypeform();
  });
  banner.querySelector('[data-cookie-reject]').addEventListener('click',()=>{
    saveTypeformConsent('rejected');
    hideTypeformBanner();
    showTypeformPlaceholder();
  });
  setLang(currentLang);
  banner.querySelector('[data-cookie-accept]').focus();
}

document.addEventListener('DOMContentLoaded',()=>{
  if(!document.querySelector('[data-tf-widget]'))return;
  const params=new URLSearchParams(location.search);
  if(params.get('cookies')==='manage'){
    localStorage.removeItem(typeformConsentKey);
    params.delete('cookies');
    history.replaceState({},'',`${location.pathname}${params.size?`?${params}`:''}${location.hash}`);
  }
  const consent=getTypeformConsent();
  if(consent==='accepted')loadTypeform();
  else{
    showTypeformPlaceholder();
    if(consent===null)showTypeformBanner();
  }
});
