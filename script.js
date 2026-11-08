'use strict';
/* ===== Configuración ===== */
const TOTAL = 10;            // operaciones por partida
const PTS = 10;              // puntos por acierto
const PRAISE = ['¡Muy bien!','¡Excelente!','¡Maravilloso!','¡Fantástico!','¡Lo lograste!','¡Eres genial!'];
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random()*n);

let G = null;   // estado de la partida
let run = 0;    // identificador de ejecución: invalida temporizadores al reiniciar o salir

/* ===== Audio (Web Audio API). Solo suena un efecto a la vez ===== */
let ac = null, live = [];
function stopSound(){ live.forEach(o=>{ try{o.stop();}catch(e){} }); live = []; }
function play(notes, type='triangle', vol=.18){
  try{
    ac = ac || new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended') ac.resume();
    stopSound();                                   // corta el sonido anterior
    notes.forEach(([f,t,d])=>{
      const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime+t;
      o.type = type; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(vol,s); g.gain.exponentialRampToValueAtTime(.001,s+d);
      o.start(s); o.stop(s+d+.02); live.push(o);
    });
  }catch(e){}
}
const sCount = () => play([[660,0,.2]]);
const sGo    = () => play([[784,0,.15],[1047,.15,.3]]);
const sOk    = () => play([[523,0,.15],[659,.13,.15],[784,.26,.3]]);
const sBad   = () => play([[250,0,.25],[200,.22,.35]],'sine',.12);
const sWin   = () => play([[523,0,.18],[659,.16,.18],[784,.32,.18],[1047,.48,.2],[784,.7,.15],[1047,.85,.5]]);

/* ===== Pantallas ===== */
function screen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
}
function home(){ run++; stopSound(); closeAll(); $('rain').innerHTML=''; screen('sWelcome'); }
function closeAll(){ document.querySelectorAll('dialog[open]').forEach(d=>d.close()); }

/* ===== Generación de operaciones =====
   Minuendo, sustraendo y resultado entre 0 y 10, sin negativos y sin repetir en la partida */
function genOps(){
  const all = [];
  for(let a=0;a<=10;a++) for(let b=0;b<=a;b++) all.push([a,b]);
  for(let i=all.length-1;i>0;i--){ const j=rnd(i+1); [all[i],all[j]]=[all[j],all[i]]; }
  return all.slice(0,TOTAL);
}

/* ===== Inicio: cuenta regresiva 3, 2, 1 ===== */
async function begin(){
  const id = ++run;
  closeAll(); $('rain').innerHTML='';
  G = {q:0, ok:0, bad:0, score:0, locked:true, ops:genOps(), cur:null};
  screen('sCount');
  const cd = $('cd');
  for(const t of ['3','2','1']){
    cd.className=''; void cd.offsetWidth; cd.className='pop';
    cd.textContent = t; sCount();
    await wait(800); if(id!==run) return;
  }
  cd.className='go'; cd.textContent='¡COMENZAMOS!'; sGo();
  await wait(650); if(id!==run) return;
  screen('sGame'); updateStats(); nextQ();
}

/* ===== Desarrollo del juego ===== */
function updateStats(){
  $('tQ').textContent = Math.min(G.q,TOTAL);
  $('tOk').textContent = G.ok; $('tBad').textContent = G.bad; $('tScore').textContent = G.score;
  $('bar').style.width = ((G.ok+G.bad)/TOTAL*100)+'%';   // avanza tras cada respuesta
}
function setLocked(v){
  G.locked = v;
  ['bSend','bReset','bExit'].forEach(id=>$(id).disabled = v);
  $('ans').readOnly = v;
}
function nextQ(){
  if(G.q>=TOTAL) return finish();
  G.cur = G.ops[G.q++];
  $('nA').textContent = G.cur[0]; $('nB').textContent = G.cur[1];
  const inp = $('ans'); inp.value=''; $('op').className='op';
  $('fb').className=''; $('fb').textContent='';
  setLocked(false); updateStats(); inp.focus();
}
function submit(){
  if(!G || G.locked) return;                       // cada operación se valida una sola vez
  const v = $('ans').value.trim();
  if(v===''){                                       // no se aceptan respuestas vacías
    $('fb').className='r'; $('fb').textContent='Escribe tu respuesta primero 😊';
    $('op').classList.add('shake'); setTimeout(()=>$('op').classList.remove('shake'),400);
    $('ans').focus(); return;
  }
  setLocked(true);
  const [a,b] = G.cur, right = a-b, id = run, fb = $('fb');
  if(Number(v)===right){
    G.ok++; G.score += PTS;
    $('op').classList.add('ok'); fb.className='g';
    fb.innerHTML = PRAISE[rnd(PRAISE.length)]+' ⭐<small style="color:#2a7d0d">¡Respuesta correcta!</small>';
    sOk(); rainStars(18);
  }else{
    G.bad++;
    $('op').classList.add('no'); fb.className='r';
    fb.innerHTML = `¡Vamos, tú puedes!<small>${a} − ${b} = ${right}. La respuesta correcta es ${right}</small>`;
    sBad();
  }
  updateStats();
  const ok = Number(v)===right;
  wait(ok?1700:3000).then(()=>{ if(id===run) nextQ(); });   // pausa para ver la corrección
}

/* ===== Resultados finales ===== */
function finish(){
  setLocked(true);
  const pct = Math.round(G.ok/TOTAL*100), perfect = G.ok===TOTAL;
  const d = $('dRes');
  d.innerHTML = `<h2>🏁 Resultados finales</h2>
  ${perfect?'<div class="trophy">🏆</div><div class="badge">Partida perfecta</div>':'<div class="trophy">🌈</div>'}
  <table class="res" style="margin:.4rem auto">
   <tr><td>Operaciones realizadas</td><td>${TOTAL}</td></tr>
   <tr><td>Respuestas correctas</td><td>${G.ok}</td></tr>
   <tr><td>Respuestas incorrectas</td><td>${G.bad}</td></tr>
   <tr><td>Puntaje</td><td>${G.score} / 100</td></tr>
   <tr><td>Porcentaje de aciertos</td><td>${pct}%</td></tr></table>
  <p class="msg">${perfect?'¡FELICITACIONES! ¡LO HICISTE EXCELENTE!':'¡Vamos, tú puedes! Sigue practicando y cada vez lo harás mejor'}</p>
  <button class="btn big" id="again">VOLVER A JUGAR</button>
  <button class="btn red" id="out">SALIR</button>`;
  d.showModal();
  $('again').onclick = begin; $('out').onclick = home;
  if(perfect){ sWin(); rainStars(70); }            // celebración solo en partida perfecta
}
function rainStars(n){
  const box = $('rain'), set = ['⭐','🌟','✨'];
  for(let i=0;i<n;i++){
    const e = document.createElement('i');
    e.textContent = set[rnd(3)];
    e.style.cssText = `left:${rnd(100)}%;font-size:${18+rnd(22)}px;animation-duration:${1.6+Math.random()*1.6}s;animation-delay:${Math.random()*.8}s`;
    box.appendChild(e);
  }
  setTimeout(()=>{ if(box.children.length) box.innerHTML=''; },3800);
}

/* ===== Eventos ===== */
$('bStart').onclick = begin;
$('bSend').onclick = submit;
$('ans').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); submit(); } });
$('ans').addEventListener('input',e=>{ e.target.value = e.target.value.replace(/\D/g,'').slice(0,2); }); // solo enteros no negativos
$('bExit').onclick = () => $('dExit').showModal();
$('exitNo').onclick = () => { $('dExit').close(); $('ans').focus(); };
$('exitYes').onclick = home;
$('bReset').onclick = () => $('dReset').showModal();
$('resetNo').onclick = () => { $('dReset').close(); $('ans').focus(); };
$('resetYes').onclick = begin;                     // reinicia todo y vuelve a la cuenta regresiva
$('dRes').addEventListener('cancel',e=>e.preventDefault());   // los resultados se cierran solo con sus botones
