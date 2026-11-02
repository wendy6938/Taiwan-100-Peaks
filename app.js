
const DATA = window.BAIYUE_DATA;
const REG = DATA.regions;
const PEAKS = DATA.peaks.map((p,i)=>({rank:i+1,name:p[0],h:p[1],reg:REG[p[2]],lat:p[3],lon:p[4]}));
const BYNAME = Object.fromEntries(PEAKS.map(p=>[p.name,p]));
const $ = id=>document.getElementById(id);
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today = ()=>new Date().toLocaleDateString("sv-SE");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- state ----------
let rec = {}, mine = {}, myNick = "", myId = null, viewId = null;
let others = {}, nicks = {}, names = {}, cheers = {}, myCheers = {};
let canEdit = false, signedIn = false, userCap = null, showAllFriends = false;
let tab = "home", filt = "all", q = "", openRegs = new Set(), mapReg = null, sheetPeak = null, editing = false;
let save = async()=>{}, saveCheers = async()=>{};
const ME = ()=> myId || "__me";
const isMine = ()=> !viewId || viewId===myId || viewId==="__me";
const bookOwner = ()=> isMine() ? myId : viewId;

// ---------- art ----------
const BEAR = (mood="happy")=>`<svg viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="30" cy="30" r="16" fill="#2b2420"/><circle cx="90" cy="30" r="16" fill="#2b2420"/>
  <circle cx="30" cy="30" r="7" fill="#5a4a40"/><circle cx="90" cy="30" r="7" fill="#5a4a40"/>
  <ellipse cx="60" cy="66" rx="44" ry="40" fill="#2b2420"/>
  <ellipse cx="60" cy="80" rx="20" ry="15" fill="#d9b48f"/>
  <ellipse cx="60" cy="72" rx="7" ry="5" fill="#2b2420"/>
  ${mood==="wow"?'<ellipse cx="60" cy="86" rx="4" ry="5" fill="#7a3b33"/>':'<path d="M53 84 Q60 90 67 84" stroke="#2b2420" stroke-width="2.5" fill="none" stroke-linecap="round"/>'}
  ${mood==="sleep"?'<path d="M34 58 Q40 62 46 58M74 58 Q80 62 86 58" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>':'<circle cx="40" cy="58" r="5" fill="#fff"/><circle cx="80" cy="58" r="5" fill="#fff"/><circle cx="41" cy="59" r="2.5" fill="#2b2420"/><circle cx="81" cy="59" r="2.5" fill="#2b2420"/>'}
  <ellipse cx="30" cy="74" rx="7" ry="4" fill="#f29a8e" opacity=".75"/><ellipse cx="90" cy="74" rx="7" ry="4" fill="#f29a8e" opacity=".75"/>
  <path d="M38 104 L60 114 L82 104" stroke="#f6efe4" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const FLOWER = (x,y,s=1,c="#f2a3b3")=>`<g transform="translate(${x},${y}) scale(${s})">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-6" rx="4" ry="6" fill="${c}" transform="rotate(${a})"/>`).join("")}<circle r="2.6" fill="#f7d46b"/></g>`;
const MTN = `<svg viewBox="0 0 40 40" aria-hidden="true"><path class="t" d="M20 6 Q21.5 6 23 8.5 L35 31 Q36 34 33 34 H7 Q4 34 5 31 L17 8.5 Q18.5 6 20 6Z"/><path class="c" d="M15.2 15.5 L17.8 10 Q20 7 22.2 10 L24.8 15.5 L22 14 L20 16 L18 14Z"/><g class="f"><line x1="20" y1="7" x2="20" y2="0.5" stroke="var(--ink)" stroke-width="1.3"/><path d="M20 0.8 L26 2.6 L20 4.4Z" fill="var(--stamp)"/></g><g class="face"><circle cx="16.5" cy="25" r="1.3" fill="var(--ink)"/><circle cx="23.5" cy="25" r="1.3" fill="var(--ink)"/><path d="M18.5 27.6 Q20 29 21.5 27.6" stroke="var(--ink)" stroke-width="1" fill="none" stroke-linecap="round"/></g></svg>`;
$("bearTop").innerHTML = BEAR();
document.getElementById("pines").innerHTML = [[70,182,1],[96,180,.75],[330,176,.9],[356,174,1.15],[384,176,.7],[690,178,1],[716,176,.8],[1040,166,1.1],[1068,168,.8],[1150,168,.9]]
  .map(([x,y,k],i)=>`<rect x="${x-1.6*k}" y="${y-10*k}" width="${3.2*k}" height="${11*k}" rx="${1.6*k}" fill="#8a6a50"/>`+(i%3===1
    ? `<ellipse cx="${x}" cy="${y-17*k}" rx="${10*k}" ry="${11*k}" fill="var(--hd-tree)"/><ellipse cx="${x-3*k}" cy="${y-21*k}" rx="${3.5*k}" ry="${2.5*k}" fill="var(--hd-snow)" opacity=".25"/>`
    : `<path d="M${x} ${y-34*k} C${x+4*k} ${y-30*k} ${x+12*k} ${y-14*k} ${x+12*k} ${y-10*k} C${x+12*k} ${y-6*k} ${x-12*k} ${y-6*k} ${x-12*k} ${y-10*k} C${x-12*k} ${y-14*k} ${x-4*k} ${y-30*k} ${x} ${y-34*k}Z" fill="var(--hd-tree)"/>`)).join("");

// ---------- badges ----------
const has = n=>!!rec[n];
const set = names=>({have:names.filter(has).length, need:names.length});
const BADGES = [
  {id:"first", icon:"初", name:"第一座百岳", calc:c=>({have:Math.min(c,1),need:1})},
  {id:"c10", icon:"10", name:"十座達成", calc:c=>({have:Math.min(c,10),need:10})},
  {id:"c30", icon:"30", name:"三十座達成", calc:c=>({have:Math.min(c,30),need:30})},
  {id:"c50", icon:"半", name:"半百達成", calc:c=>({have:Math.min(c,50),need:50})},
  {id:"c100", icon:"百", name:"百岳完登", calc:c=>({have:c,need:100})},
  {id:"wuyue", icon:"五嶽", name:"台灣五嶽", calc:()=>set(["玉山主峰","雪山主峰","南湖大山","秀姑巒山","北大武山"])},
  {id:"sanjian", icon:"三尖", name:"台灣三尖", calc:()=>set(["中央尖山","大霸尖山","達芬尖山"])},
  {id:"c3800", icon:"3800", name:"3800 俱樂部", calc:()=>set(PEAKS.filter(p=>p.h>=3800).map(p=>p.name))},
  {id:"yushan", icon:"玉", name:"玉山群峰", calc:()=>set(["玉山主峰","玉山東峰","玉山北峰","玉山南峰","玉山西峰"])},
  {id:"hehuan", icon:"合歡", name:"合歡五峰", calc:()=>set(["合歡主峰","合歡東峰","合歡北峰","合歡西峰","石門山"])},
  {id:"qilai", icon:"奇萊", name:"奇萊三峰", calc:()=>set(["奇萊北峰","奇萊主山","奇萊南峰"])},
  ...REG.map((r,i)=>({id:"reg"+i, icon:r.split("·")[0].slice(0,2), name:r+" 制霸", calc:()=>set(PEAKS.filter(p=>p.reg===r).map(p=>p.name))})),
  {id:"cheer", icon:"♥", name:"收到山友打氣", calc:()=>({have:Math.min(1,cheersFor(bookOwner()).length),need:1})},
];
function badgeState(){ const c = Object.keys(rec).length; return BADGES.map(b=>{ const s=b.calc(c); return {...b, ...s, ok:s.have>=s.need}; }); }
const badgeHTML = (b,cls="")=>`<div class="badge ${b.ok?"":"locked"} ${cls}"><div class="em">${esc(b.icon)}</div><div>${esc(b.name)}</div>${b.ok?"":`<small>${b.have}/${b.need}</small>`}</div>`;

// ---------- cheers ----------
// cheers/<authorId> = {c: {"<targetId>~<rank>": {l:true, m:"...", t:ms}}}
function cheersFor(target, peak){
  const out=[]; if(!target) return out;
  for(const a in cheers){ const c=cheers[a]; for(const k in c){ const [t,r]=k.split("~"); if(t===target && (!peak || +r===peak.rank)) out.push({from:a, rank:+r, ...c[k]}); } }
  return out.sort((x,y)=>(x.t||0)-(y.t||0));
}

// ---------- labels ----------
const label = id=> (id===myId||id==="__me") ? (myNick||"我") : (nicks[id]||names[id]||"山友");

// ---------- render ----------
function render(){
  rec = isMine() ? mine : (others[viewId]||{});
  canEdit = isMine();
  const done = PEAKS.filter(p=>rec[p.name]);
  const bs = badgeState();
  $("bookName").textContent = isMine() ? (myNick? myNick+" 的":"我的") : label(viewId)+" 的";
  $("back").hidden = isMine();
  $("nameBtn").hidden = !isMine() || !$("nameForm").hidden;
  $("nameBtn").textContent = myNick ? "✎ 改名字" : "✎ 設定名字";
  $("cnt").textContent = done.length;
  $("pct").textContent = done.length+"%";
  $("bar").style.width = done.length+"%";
  $("sum").textContent = done.reduce((s,p)=>s+p.h,0).toLocaleString()+" m";
  $("bcount").textContent = bs.filter(b=>b.ok).length+" / "+bs.length;
  const n = done.length;
  $("say").innerHTML = `<div class="bearMini">${BEAR(n?"happy":"sleep")}</div><div class="bubble">${
    !isMine() ? `這是 ${esc(label(viewId))} 的登頂簿，點爬過的山可以幫他打氣！`
    : n===0 ? "還沒有登頂紀錄，第一座想爬哪裡呢？點小山開始記錄吧。"
    : n<10 ? `已經 ${n} 座了！再 ${10-n} 座就能拿到「十座達成」徽章。`
    : n<100 ? `${n} 座！離百岳完登還有 ${100-n} 座，慢慢來，安全第一。`
    : "百岳完登！你是最強的山友！"}</div>`;

  $("grid").innerHTML = PEAKS.map(p=>`<button class="tri${rec[p.name]?" done":""}" data-peak="${p.rank}" title="${p.rank}. ${esc(p.name)} ${p.h}m" aria-label="${esc(p.name)}${rec[p.name]?"，已完登":""}">${MTN}</button>`).join("");

  renderFriends(); renderMap(); renderAcc();
  $("badges").innerHTML = bs.map(b=>badgeHTML(b)).join("");

  const logs = done.filter(p=>rec[p.name].d).sort((a,b)=>rec[b.name].d.localeCompare(rec[a.name].d));
  $("log").innerHTML = logs.length ? logs.map(p=>{ const h=cheersFor(bookOwner(),p).filter(c=>c.l).length;
      return `<button class="logRow" data-peak="${p.rank}"><span class="d num">${esc(rec[p.name].d)}</span><span class="ln">${esc(p.name)} <span class="num" style="color:var(--muted)">${p.h}m</span>${rec[p.name].n?`<small>${esc(rec[p.name].n)}</small>`:""}</span>${h?`<span class="hearts">♥ ${h}</span>`:""}</button>`; }).join("")
    : `<div class="emptyArt"><div class="bearMini">${BEAR("sleep")}</div><div>${isMine()?"還沒有紀錄喔。到「百岳」或「地圖」點一座山，按「登頂囉！」就會出現在這裡。":"還沒有登頂紀錄喔。"}</div></div>`;
}

function renderFriends(){
  const sec=$("friendsSec");
  if(!signedIn){ sec.hidden=false; $("friends").innerHTML=`<div class="note">這個 app 還沒連上雲端，紀錄只存在這台裝置，山友看不到。</div>`; return; }
  const ids = Object.keys(others).filter(id=>id!==myId && (Object.keys(others[id]).length || nicks[id]));
  const meId = ME();
  sec.hidden=false;
  let list=[{id:meId,r:mine}].concat(ids.map(id=>({id,r:others[id]}))).map(x=>({...x,n:Object.keys(x.r).length})).sort((a,b)=>b.n-a.n);
  const total=list.length; if(!showAllFriends && total>5){ const meRow=list.find(x=>x.id===meId); list=list.slice(0,5); if(!list.includes(meRow)) list[4]=meRow; }
  $("friends").innerHTML = list.map((x,i)=>`<button class="reg friend" data-u="${esc(x.id)}" aria-pressed="${bookOwner()===x.id}">
    <div class="top"><span>${i<3&&x.n?`<span class="rankDot">${i+1}</span>`:""}${esc(label(x.id))}${x.id===meId&&myNick?"（我）":""}</span><span class="num">${x.n}/100</span></div>
    <div class="bar"><i style="width:${x.n}%"></i></div></button>`).join("")
    + (total>5?`<button class="mark moreBtn" id="moreFriends">${showAllFriends?"收起":"看全部 "+total+" 位山友"}</button>`:"")
    + (ids.length?"":`<div class="note" style="grid-column:1/-1">把網址傳給山友，他們打開就能開始記錄（不用註冊），會出現在這裡。</div>`);
}

// ---------- map ----------
const K=100, LON0=119.95, LAT0=25.35, CX=Math.cos(23.7*Math.PI/180);
const px = lon=>(lon-LON0)*CX*K, py = lat=>(LAT0-lat)*K;
const ISLAND = "M"+DATA.island.map(([x,y])=>px(x).toFixed(1)+" "+py(y).toFixed(1)).join("L")+"Z";
let vb = [0,0,192,350], vbAnim = null;
function targetVB(){
  if(!mapReg) return [0,0,192,350];
  const ps = PEAKS.filter(p=>p.reg===mapReg);
  let x0=Math.min(...ps.map(p=>px(p.lon))), x1=Math.max(...ps.map(p=>px(p.lon))), y0=Math.min(...ps.map(p=>py(p.lat))), y1=Math.max(...ps.map(p=>py(p.lat)));
  const pad=6; x0-=pad; x1+=pad; y0-=pad; y1+=pad;
  let w=x1-x0, h=y1-y0; const want=192/350;
  if(w/h<want){ const nw=h*want; x0-=(nw-w)/2; w=nw; } else { const nh=w/want; y0-=(nh-h)/2; h=nh; }
  return [x0,y0,w,h];
}
function animateVB(){
  const to=targetVB(), from=vb.slice(), t0=performance.now(), dur=reduce?0:450;
  cancelAnimationFrame(vbAnim);
  const step=t=>{ const k=dur?Math.min(1,(t-t0)/dur):1, e=1-Math.pow(1-k,3); vb=from.map((v,i)=>v+(to[i]-v)*e); drawMap(); if(k<1) vbAnim=requestAnimationFrame(step); };
  vbAnim=requestAnimationFrame(step);
}
function renderMap(){
  $("mapRegions").innerHTML = REG.map(r=>{ const all=PEAKS.filter(p=>p.reg===r), d=all.filter(p=>rec[p.name]).length;
    return `<button class="reg" data-mapreg="${esc(r)}" aria-pressed="${mapReg===r}"><div class="top"><span>${esc(r)}</span><span class="num">${d}/${all.length}</span></div><div class="bar"><i style="width:${d/all.length*100}%"></i></div></button>`; }).join("");
  drawMap();
}
function drawMap(){
  const m=$("map"); m.setAttribute("viewBox", vb.map(v=>v.toFixed(2)).join(" "));
  const s = vb[2]/192;  // zoom scale
  const r = 2.4*s, showLbl = s<0.5;
  const cities = [["台北",121.52,25.04],["台中",120.68,24.15],["花蓮",121.6,23.98],["嘉義",120.45,23.48],["台東",121.14,22.76],["高雄",120.3,22.63]];
  m.innerHTML = `<rect class="sea" x="-50" y="-50" width="300" height="460"/>
    <path class="land" d="${ISLAND}" style="stroke-width:${0.8*s}"/>
    ${s>0.6?cities.map(([n,lo,la])=>`<text class="city" x="${px(lo)}" y="${py(la)}" font-size="${7*s}" text-anchor="middle">${n}</text>`).join(""):""}
    ${PEAKS.slice().reverse().map(p=>{ const d=rec[p.name], x=px(p.lon), y=py(p.lat);
      const shape = d ? `<path class="dot" d="M${x} ${y-r*1.6} L${x+r*1.4} ${y+r} L${x-r*1.4} ${y+r}Z" stroke-width="${0.5*s}" stroke-linejoin="round"/>` : `<circle class="dot" cx="${x}" cy="${y}" r="${r*.75}" stroke-width="${0.6*s}"/>`;
      return `<g class="pk${d?" done":""}${sheetPeak===p.rank?" sel":""}" data-peak="${p.rank}" tabindex="0" role="button" aria-label="${esc(p.name)} ${p.h} 公尺${d?"，已完登":""}"><circle cx="${x}" cy="${y}" r="${r*2.2}" fill="transparent"/>${shape}${showLbl?`<text class="lbl" x="${x}" y="${y-r*2}" font-size="${5.5*s}" stroke-width="${1.6*s}" text-anchor="middle">${esc(p.name)}</text>`:""}</g>`; }).join("")}`;
}
$("zoomAll").addEventListener("click",()=>{ mapReg=null; renderMap(); animateVB(); });
$("map").addEventListener("keydown",e=>{ const g=e.target.closest(".pk"); if(g&&(e.key==="Enter"||e.key===" ")){ e.preventDefault(); openSheet(+g.dataset.peak); } });

// ---------- peaks accordion ----------
function renderAcc(){
  const match = p=>(filt==="all"||(filt==="done")===!!rec[p.name]) && (!q||p.name.includes(q));
  $("acc").innerHTML = REG.map(r=>{
    const all=PEAKS.filter(p=>p.reg===r), d=all.filter(p=>rec[p.name]).length, shown=all.filter(match);
    if(!shown.length) return "";
    const open = q || openRegs.has(r);
    return `<div class="grp${open?" open":""}"><button class="grpHead" data-grp="${esc(r)}" aria-expanded="${!!open}">
      <div><div>${esc(r)}</div><div class="bar"><i style="width:${d/all.length*100}%"></i></div></div><span class="num">${d}/${all.length}</span><span class="chev">›</span></button>
      ${open?`<div class="tiles">${shown.map(p=>{ const h=cheersFor(bookOwner(),p).filter(c=>c.l).length;
        return `<button class="tile${rec[p.name]?" done":""}" data-peak="${p.rank}"><span class="tn">${esc(p.name)}</span><span class="th num">#${p.rank} · ${p.h.toLocaleString()} m</span>${rec[p.name]?'<span class="mini">登頂</span>':""}${h?`<span class="hearts">♥${h}</span>`:""}</button>`; }).join("")}</div>`:""}
    </div>`; }).join("") || `<div class="emptyArt"><div class="bearMini">${BEAR("wow")}</div><div>找不到符合的山。</div></div>`;
}

// ---------- sheet ----------
function openSheet(rank){ sheetPeak=rank; editing=false; $("scrim").hidden=false; renderSheet(); drawMap(); setTimeout(()=>$("sheet").querySelector("button,input")?.focus(),30); }
function closeSheet(){ sheetPeak=null; $("scrim").hidden=true; drawMap(); }
function renderSheet(){
  if(sheetPeak==null) return;
  const p=PEAKS[sheetPeak-1], r=rec[p.name], owner=bookOwner();
  const cs = cheersFor(owner,p), likes=cs.filter(c=>c.l).length, msgs=cs.filter(c=>c.m);
  const my = myCheers[owner+"~"+p.rank]||{};
  const canCheer = signedIn && !isMine() && r;
  $("sheet").innerHTML = `
    <h3 id="sheetTitle">${esc(p.name)}${r?'<span class="hanko">登<br>頂</span>':""}</h3>
    <div class="meta"><span class="chip num">${p.h.toLocaleString()} m</span><span class="chip">百岳第 ${p.rank} 高</span><span class="chip">${esc(p.reg)}</span>${r?'<span class="chip ok">已完登</span>':'<span class="chip">還沒爬</span>'}</div>
    ${r && !(isMine()&&editing) ? `<div class="recbox"><b>日期</b>${esc(r.d||"未填")}${r.n?`<br><b>備註</b>${esc(r.n)}`:""}</div>`:""}
    ${isMine() && (editing||!r) ? `<form id="recForm">
        <label>登頂日期<input type="date" id="fDate" value="${esc(r?.d||today())}"></label>
        <label>備註<input type="text" id="fNote" value="${esc(r?.n||"")}" maxlength="120" placeholder="同行、路線、天氣…"></label>
        <div class="btns"><button class="mark save big" type="submit">${r?"更新紀錄":"登頂囉！"}</button>${r?`<button class="mark del" type="button" data-act="unsummit">取消完登</button>`:""}</div>
      </form>` : isMine() ? `<div class="btns"><button class="mark" data-act="edit">✎ 編輯紀錄</button></div>`:""}
    ${r||likes||msgs.length ? `<div class="cheers"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-weight:400">山友打氣</b><span class="hearts">♥ ${likes}</span>
      ${canCheer?`<button class="heart" data-act="like" aria-pressed="${!!my.l}">${my.l?"♥ 已按讚":"♡ 按讚"}</button>`:""}</div>
      ${msgs.map(c=>`<div class="cheer"><b>${esc(label(c.from))}</b><span>${esc(c.m)}</span></div>`).join("")}
      ${canCheer?`<form id="cheerForm" class="btns"><input type="text" id="cMsg" maxlength="40" value="${esc(my.m||"")}" placeholder="留一句話，例如：好強！" style="flex:1 1 160px"><button class="mark" type="submit">${my.m?"更新留言":"送出"}</button></form>`:""}
      ${!likes&&!msgs.length&&!canCheer?`<div class="hint">還沒有人打氣。</div>`:""}
      ${!signedIn&&!isMine()?"":(!signedIn?`<div class="hint">連上雲端後，山友才看得到你的紀錄，也能互相打氣。</div>`:"")}
    </div>`:""}
    <div class="btns" style="justify-content:flex-end"><button class="mark del" data-act="close">關閉</button></div>`;
}
$("scrim").addEventListener("click",e=>{ if(e.target.id==="scrim") closeSheet(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(!$("party").hidden) endParty(); else if(!$("scrim").hidden) closeSheet(); } });
$("sheet").addEventListener("click",e=>{
  const b=e.target.closest("button[data-act]"); if(!b) return;
  const p=PEAKS[sheetPeak-1], a=b.dataset.act;
  if(a==="close") closeSheet();
  if(a==="edit"){ editing=true; renderSheet(); }
  if(a==="unsummit"){ delete mine[p.name]; editing=false; render(); renderSheet(); save(); }
  if(a==="like"){ const k=viewId+"~"+p.rank, c={...(myCheers[k]||{})}; c.l=!c.l; c.t=Date.now(); setCheer(k,c); }
});
$("sheet").addEventListener("submit",e=>{
  e.preventDefault(); const p=PEAKS[sheetPeak-1];
  if(e.target.id==="recForm"){
    const isNew = !mine[p.name];
    const before = badgeState().filter(b=>b.ok).map(b=>b.id);
    mine[p.name]={d:$("fDate").value||today(), n:$("fNote").value.trim().slice(0,120)};
    editing=false; render(); save();
    if(isNew){ closeSheet(); const nb=badgeState().filter(b=>b.ok&&!before.includes(b.id)); party(p,nb); } else renderSheet();
  }
  if(e.target.id==="cheerForm"){ const k=viewId+"~"+p.rank, c={...(myCheers[k]||{})}; c.m=$("cMsg").value.trim().slice(0,40); c.t=Date.now(); setCheer(k,c); }
});
function setCheer(k,c){ if(!c.l && !c.m) delete myCheers[k]; else myCheers[k]=c; cheers[myId]=myCheers; render(); renderSheet(); saveCheers(); }

// ---------- celebration ----------
let petalRun=null;
function party(p,newBadges){
  const n=Object.keys(mine).length;
  $("party").innerHTML = `<div class="bigStamp">登<br>頂</div><div class="t1">${esc(p.name)} ${p.h.toLocaleString()} m</div><div class="t2">第 ${n} 座百岳，恭喜！</div>
    ${newBadges.length?`<div class="newb">${newBadges.map(b=>badgeHTML(b,"mini")).join("")}</div><div class="t2">解鎖新徽章！</div>`:""}
    <div class="bearMini" style="width:64px;animation:rise .5s .6s both">${BEAR("wow")}</div><div class="hint">點一下繼續</div>`;
  $("party").hidden=false;
  if(!reduce) petals();
  clearTimeout(party.t); party.t=setTimeout(endParty, newBadges.length?6000:3800);
}
function endParty(){ $("party").hidden=true; $("petals").hidden=true; cancelAnimationFrame(petalRun); }
$("party").addEventListener("click", endParty);
function petals(){
  const c=$("petals"); c.hidden=false; const dpr=devicePixelRatio||1; c.width=innerWidth*dpr; c.height=innerHeight*dpr;
  const g=c.getContext("2d"); g.scale(dpr,dpr);
  const cols=["#f2a3b3","#f7c6cf","#e8845c","#f7d46b","#a9c79a"];
  const P=Array.from({length:70},()=>({x:Math.random()*innerWidth,y:-20-Math.random()*innerHeight*.6,vy:1.2+Math.random()*2,vx:-.6+Math.random()*1.2,a:Math.random()*6,va:-.05+Math.random()*.1,s:5+Math.random()*6,c:cols[Math.random()*cols.length|0]}));
  const t0=performance.now();
  const step=t=>{ g.clearRect(0,0,innerWidth,innerHeight);
    for(const q of P){ q.y+=q.vy; q.x+=q.vx+Math.sin((t+q.a*300)/500)*.6; q.a+=q.va;
      g.save(); g.translate(q.x,q.y); g.rotate(q.a); g.fillStyle=q.c; g.beginPath(); g.ellipse(0,0,q.s,q.s*.6,0,0,Math.PI*2); g.fill(); g.restore(); }
    if(t-t0<4500) petalRun=requestAnimationFrame(step); else { c.hidden=true; } };
  petalRun=requestAnimationFrame(step);
}

// ---------- events ----------
function setTab(t){ tab=t; for(const b of document.querySelectorAll("#tabs button")) b.setAttribute("aria-pressed", b.dataset.tab===t);
  for(const id of ["home","map","peaks","badges","log"]) $("v-"+id).hidden = id!==t;
  if(location.hash.slice(1)!==t){ try{ history.replaceState(null,"","#"+t); }catch(e){} } }
document.addEventListener("click", e=>{
  const t=e.target.closest("button, .pk"); if(!t) return;
  if(t.dataset.tab){ setTab(t.dataset.tab); window.scrollTo({top:0}); return; }
  if(t.dataset.peak && !t.closest("#sheet")){ openSheet(+t.dataset.peak); return; }
  if(t.dataset.mapreg){ mapReg = mapReg===t.dataset.mapreg?null:t.dataset.mapreg; renderMap(); animateVB(); return; }
  if(t.dataset.grp){ const r=t.dataset.grp; openRegs.has(r)?openRegs.delete(r):openRegs.add(r); renderAcc(); return; }
  if(t.dataset.f){ filt=t.dataset.f; for(const b of document.querySelectorAll("#filter button")) b.setAttribute("aria-pressed",b.dataset.f===filt); renderAcc(); return; }
  if(t.id==="moreFriends"){ showAllFriends=!showAllFriends; renderFriends(); return; }
  if(t.dataset.u){ viewId = (t.dataset.u===myId||t.dataset.u==="__me")?null:t.dataset.u; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(t.id==="back"){ viewId=null; render(); }
});
$("q").addEventListener("input",e=>{ q=e.target.value.trim(); renderAcc(); });
$("nameBtn").addEventListener("click",()=>{ $("nameForm").hidden=false; $("nameBtn").hidden=true; $("nameInput").value=myNick; $("nameInput").focus(); });
$("nameCancel").addEventListener("click",()=>{ $("nameForm").hidden=true; render(); });
$("nameForm").addEventListener("submit",e=>{ e.preventDefault(); myNick=cleanNick($("nameInput").value); $("nameForm").hidden=true; render(); save(); });
addEventListener("hashchange",()=>{ const h=location.hash.slice(1); if(["home","map","peaks","badges","log"].includes(h)) setTab(h); });
{ const h=location.hash.slice(1); if(["home","map","peaks","badges","log"].includes(h)) setTab(h); }
openRegs.add(REG[0]);

// ---------- storage ----------
// Cloud: Supabase (anonymous sign-in, optional email). Without config it runs fully on this device.
const LS="baiyue-progress-v1";
function lsRead(){ try{ return JSON.parse(localStorage.getItem(LS)||"{}"); }catch(e){ return {}; } }
function lsNick(){ try{ return localStorage.getItem(LS+"-nick")||""; }catch(e){ return ""; } }
function lsWrite(){ try{ localStorage.setItem(LS,JSON.stringify(mine)); localStorage.setItem(LS+"-nick",myNick); }catch(e){} }
function clean(o){ const out={}; if(o&&typeof o==="object") for(const p of PEAKS){ const r=o[p.name]; if(r&&typeof r==="object") out[p.name]={d:String(r.d||"").slice(0,10), n:String(r.n||"").slice(0,120)}; } return out; }
function cleanNick(v){ return String(v||"").replace(/\s+/g," ").trim().slice(0,20); }
const setSync=t=>{ $("sync").textContent=t; };

mine=clean(lsRead()); myNick=cleanNick(lsNick()); render(); setSync("載入中…");
function localMode(msg){ signedIn=false; save=async()=>lsWrite(); render(); renderAccount(); setSync(msg||"紀錄存在這台裝置"); }

let sb=null, account=null, recovering=false, linkSent="";   // account: {email, anon}
const pwInput=(id,ph)=>`<input type="password" id="${id}" required minlength="6" autocomplete="${id==="loginPw"?"current-password":"new-password"}" placeholder="${ph}" aria-label="${ph}">`;
function renderAccount(){
  const box=$("account"); if(!box) return;
  if(!sb){ box.innerHTML=`<div class="note">這個 app 還沒連上雲端資料庫，紀錄只存在這台裝置。</div>`; return; }
  const loginBlock = `<details class="acctMore"><summary>已經綁定過 Email？用 Email 和密碼登入</summary>
      <form class="acctForm acctCol" id="loginForm"><input type="email" id="loginEmail" required autocomplete="email" placeholder="綁定的 Email" aria-label="Email">${pwInput("loginPw","密碼")}<button class="mark save" type="submit">登入</button></form>
      <div class="btns"><button class="mark del" type="button" id="forgotBtn">忘記密碼／還沒設定密碼</button></div>
      <div class="hint">登入後，這台裝置目前的紀錄會合併到那個帳號。</div></details>`;
  if(recovering){
    box.innerHTML=`<div class="acctTxt"><b>設定新密碼</b><br>帳號：${esc(account?.email||"")}</div>
      <form class="acctForm acctCol" id="newPwForm">${pwInput("newPw","新密碼（至少 6 個字）")}<button class="mark save" type="submit">儲存密碼</button></form>
      <div class="hint" id="acctMsg"></div>`; return;
  }
  if(account && !account.anon){
    box.innerHTML=`<div class="acctTxt"><b>已綁定</b> ${esc(account.email||"")}<br>在其他手機或電腦打開 app，用這個 Email 和密碼登入，就會看到同一份紀錄。</div>
      <details class="acctMore"><summary>設定／更改密碼</summary>
        <form class="acctForm acctCol" id="newPwForm">${pwInput("newPw","新密碼（至少 6 個字）")}<button class="mark" type="submit">儲存密碼</button></form></details>
      <div class="btns"><button class="mark del" type="button" id="logoutBtn">登出這台裝置</button></div><div class="hint" id="acctMsg"></div>`; return;
  }
  box.innerHTML = `
    ${account ? (linkSent ? `<div class="acctTxt"><b>確認信已寄到</b> ${esc(linkSent)}<br>請打開信、點確認連結（在 Safari 打開也沒關係），再回到這裡按下面的按鈕。</div>
        <div class="btns"><button class="mark save" type="button" id="linkDone">我已經點了確認連結</button><button class="mark del" type="button" id="linkRestart">換一個 Email</button></div>`
      : `<div class="acctTxt"><b>免註冊使用中</b><br>紀錄已同步到雲端，但只認得這台裝置。綁定 Email 之後，換手機或電腦也找得回來。</div>
        <form class="acctForm" id="linkForm"><input type="email" id="linkEmail" required autocomplete="email" placeholder="you@example.com" aria-label="Email"><button class="mark" type="submit">綁定 Email</button></form>`)
    : `<div class="acctTxt">不用註冊，取名字或標記第一座山時，就會自動建立你的登頂簿。</div>`}
    ${loginBlock}
    <div class="hint" id="acctMsg"></div>`;
}
const msg=t=>{ const m=$("acctMsg"); if(m) m.textContent=t; };
document.addEventListener("submit", async e=>{
  if(!sb) return;
  const redirect = location.origin+location.pathname;
  if(e.target.id==="linkForm"){ e.preventDefault(); const email=$("linkEmail").value.trim();
    const {error}=await sb.auth.updateUser({email},{emailRedirectTo:redirect});
    if(error){ msg(/already|registered|exists/i.test(error.message)?"這個 Email 已經綁定過了，請改用下面的「用 Email 和密碼登入」。":"綁定失敗："+error.message); return; }
    linkSent=email; renderAccount(); }
  if(e.target.id==="newPwForm"){ e.preventDefault(); const password=$("newPw").value;
    const {error}=await sb.auth.updateUser({password});
    if(error){ msg("密碼設定失敗："+error.message); return; }
    recovering=false; renderAccount(); msg("密碼已儲存！在其他裝置用 Email 和這組密碼登入就好。"); }
  if(e.target.id==="loginForm"){ e.preventDefault(); const email=$("loginEmail").value.trim(), password=$("loginPw").value;
    msg("登入中…");
    // remove this device's anonymous duplicate first; its records stay on this device and merge into the account after login
    const wasAnon = account?.anon, oldId = myId;
    if(wasAnon && oldId){ await sb.from("cheers").delete().eq("author",oldId); await sb.from("profiles").delete().eq("id",oldId); }
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){ if(wasAnon && oldId && (Object.keys(mine).length||myNick)) await sb.from("profiles").upsert({id:oldId,nick:myNick,peaks:mine,updated_at:new Date().toISOString()});
      msg(/invalid/i.test(error.message)?"Email 或密碼不對。還沒設定過密碼的話，請按「忘記密碼／還沒設定密碼」。":"登入失敗："+error.message); return; }
    msg("登入成功，正在載入你的紀錄…"); setTimeout(()=>location.reload(),300); }
});
document.addEventListener("click", async e=>{
  if(!sb) return;
  if(e.target.id==="linkRestart"){ linkSent=""; renderAccount(); return; }
  if(e.target.id==="linkDone"){ const {data,error}=await sb.auth.refreshSession();
    const u=data?.user; if(!error && u && u.email && !u.is_anonymous){ account={email:u.email,anon:false}; linkSent=""; renderAccount(); msg("綁定完成！請在上面「設定／更改密碼」設一組密碼，換裝置時用來登入。"); const d=document.querySelector("#account details"); if(d) d.open=true; }
    else msg("還沒確認成功，請再點一次信裡的連結，或稍等一下再按。"); return; }
  if(e.target.id==="forgotBtn"){ const email=$("loginEmail")?.value.trim();
    if(!email){ msg("請先在上面輸入 Email，再按這個按鈕。"); $("loginEmail")?.focus(); return; }
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    msg(error?"寄送失敗："+error.message+"（免費方案每小時只能寄幾封，請稍後再試）":"已寄出設定密碼的信。請點信裡的連結（會在瀏覽器打開），設定好密碼後，回到 app 用 Email 和密碼登入。"); return; }
  if(e.target.id==="logoutBtn"){ await sb.auth.signOut(); try{ localStorage.removeItem(LS); localStorage.removeItem(LS+"-nick"); }catch(_){} location.reload(); }
});

(async()=>{
  const cfg=window.BAIYUE_CONFIG||{};
  if(!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return localMode();
  try{
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    let {data:{session}}=await sb.auth.getSession();
    signedIn=true;
    if(session){ const u=session.user; myId=u.id; account={email:u.email, anon:!!u.is_anonymous}; }
    sb.auth.onAuthStateChange((ev,s)=>{
      if(ev==="PASSWORD_RECOVERY"){ recovering=true; if(s?.user){ myId=s.user.id; account={email:s.user.email,anon:false}; } renderAccount(); setTab("home"); setTimeout(()=>$("account")?.scrollIntoView({block:"center"}),100); return; }
      if(s?.user && myId && s.user.id!==myId && !recovering) location.reload();
      else if(s?.user){ account={email:s.user.email,anon:!!s.user.is_anonymous}; renderAccount(); } });
    if(session){ sb.auth.getUser().then(({data})=>{ const u=data?.user; if(u && u.id===myId){ account={email:u.email,anon:!!u.is_anonymous}; renderAccount(); } }); }
    renderAccount();
    // create the (anonymous) user only when this person first saves something
    let ensuring=null;
    const ensureUser=async()=>{
      if(myId) return true;
      ensuring ||= sb.auth.signInAnonymously().then(r=>{ if(r.error){ setSync("雲端登入失敗，先存在這台裝置"); return false; }
        myId=r.data.user.id; account={email:null,anon:true}; renderAccount(); return true; });
      return ensuring;
    };

    let busy=false, pending=false, first=true;
    const push=async()=>{
      if(busy){ pending=true; return; } busy=true;
      if(!await ensureUser()){ busy=false; return; }
      const {error}=await sb.from("profiles").upsert({id:myId,nick:myNick,peaks:mine,updated_at:new Date().toISOString()});
      setSync(error?"同步失敗，已先存在這台裝置":"已同步・山友看得到你的進度");
      busy=false; if(pending){ pending=false; push(); }
    };
    save=async()=>{ lsWrite(); push(); };
    saveCheers=async()=>{
      if(!await ensureUser()) return;
      // write only the keys that changed since last sync
      for(const k of new Set([...Object.keys(syncedCheers),...Object.keys(myCheers)])){
        const a=syncedCheers[k], b=myCheers[k]; if(JSON.stringify(a)===JSON.stringify(b)) continue;
        const [target,rank]=k.split("~");
        const {error} = b ? await sb.from("cheers").upsert({author:myId,target,rank:+rank,liked:!!b.l,msg:b.m||"",updated_at:new Date().toISOString()})
                          : await sb.from("cheers").delete().match({author:myId,target,rank:+rank});
        if(error){ setSync("打氣送出失敗，請再試一次"); return; }
      }
      syncedCheers=JSON.parse(JSON.stringify(myCheers));
    };
    let syncedCheers={};

    const load=async()=>{
      const [pr,cr]=await Promise.all([sb.from("profiles").select("id,nick,peaks"), sb.from("cheers").select("author,target,rank,liked,msg,updated_at")]);
      if(pr.error){ if(first) localMode("雲端暫時連不上，先存在這台裝置"); return; }
      const map={}, nk={};
      for(const row of pr.data){ map[row.id]=clean(row.peaks); nk[row.id]=cleanNick(row.nick); }
      const all={};
      for(const c of (cr.data||[])){ if(!c.liked && !c.msg) continue; (all[c.author] ||= {})[`${c.target}~${c.rank}`]={l:!!c.liked,m:String(c.msg||"").slice(0,40),t:Date.parse(c.updated_at)||0}; }
      others=map; nicks=nk; cheers=all;
      if(first){
        first=false;
        const had=myId?map[myId]:undefined;
        mine=Object.assign({},mine,had||{});
        const localNick=myNick; if(nk[myId]) myNick=nk[myId]; lsWrite();
        if(had ? (Object.keys(mine).length!==Object.keys(had).length || (!nk[myId]&&localNick)) : (Object.keys(mine).length||myNick)) await push();
        else setSync("已同步・山友看得到你的進度");
      } else if(!busy && map[myId]){ mine=map[myId]; myNick=nk[myId]||""; lsWrite(); }
      myCheers=all[myId]||{}; syncedCheers=JSON.parse(JSON.stringify(myCheers));
      render(); renderSheet();
    };
    await load();
    let t=null; const soon=()=>{ clearTimeout(t); t=setTimeout(load,400); };
    sb.channel("baiyue").on("postgres_changes",{event:"*",schema:"public",table:"profiles"},soon)
      .on("postgres_changes",{event:"*",schema:"public",table:"cheers"},soon).subscribe();
    document.addEventListener("visibilitychange",()=>{ if(!document.hidden) soon(); });
  }catch(e){ console.error(e); localMode("雲端暫時連不上，先存在這台裝置"); }
})();

// ---------- offline / install ----------
if("serviceWorker" in navigator && location.protocol==="https:"){
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then(r=>r.update()).catch(()=>{});
  // a new version took over: reload once so the page runs the new files
  let reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(hadController && !reloaded){ reloaded=true; location.reload(); } });
}
