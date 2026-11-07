
'use strict';
// IndexedDB transactions resolve only after commit, including queued draft writes.
const Store=(()=>{
  let db;
  function transaction(store,mode,operation){return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode),request=operation(tx.objectStore(store));
    tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('İşlem iptal edildi'));
  });}
  const put=(key,value)=>transaction('kv','readwrite',s=>value==null?s.delete(key):s.put(value,key));
  return {
    async init(){
      db=await new Promise((resolve,reject)=>{const r=indexedDB.open('fitness-log',1);r.onupgradeneeded=()=>{r.result.createObjectStore('sessions',{keyPath:'id'});r.result.createObjectStore('kv');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      db.onversionchange=()=>db.close();
      const [sessions,program,draft,meta]=await Promise.all([transaction('sessions','readonly',s=>s.getAll()),...['program','draft','meta'].map(k=>transaction('kv','readonly',s=>s.get(k)))]);
      return {sessions,program,draft,meta};
    },
    saveSession:s=>transaction('sessions','readwrite',o=>o.put(s)),
    deleteSession:id=>transaction('sessions','readwrite',o=>o.delete(id)),
    saveProgram:p=>put('program',p),saveDraft:d=>put('draft',d),saveMeta:m=>put('meta',m),
    async saveFinished(session){return new Promise((resolve,reject)=>{const tx=db.transaction(['sessions','kv'],'readwrite');tx.objectStore('sessions').put(session);tx.objectStore('kv').delete('draft');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  };
})();
const WEEKDAYS=['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];
const DESIGN_ICONS={"workout": "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12\"></path></svg>", "progress": "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 19h16M6 15l4-5 4 3 5-7\"></path></svg>", "history": "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"></circle><path d=\"M12 8v4l3 2\"></path></svg>", "program": "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M5 6h14M5 12h14M5 18h9\"></path></svg>", "back": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#E8ECF1\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M15 6l-6 6 6 6\"></path></svg>", "copy": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"></rect><path d=\"M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3\"></path></svg>", "share": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3v12M7 8l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5\"></path></svg>", "warning": "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#F2C14E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 9v4M12 17h.01\"></path><path d=\"M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"></path></svg>", "handle": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#6F7A8A\" stroke-width=\"2\" stroke-linecap=\"round\" aria-label=\"Sürükle\" role=\"img\"><path d=\"M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01\"></path></svg>", "up": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#C9D1DC\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 15l6-6 6 6\"></path></svg>", "down": "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#8E98A7\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\"></path></svg>", "check": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#06140C\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12l5 5 9-10\"></path></svg>", "arrow": "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12h14M13 6l6 6-6 6\"></path></svg>"};
document.documentElement.lang='tr';
const uid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID();}catch(_){}return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);};
const $=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x));
const state={
  program:{
    order:['PUSH','PULL','UPPER','LEGS'],days:{
      PUSH:[],PULL:[],LEGS:[],UPPER:[]
    }
  },sessions:[],draft:null,edit:null,tab:'home',day:'PUSH',exercise:'',mode:'kg',date:today(),busy:false
};
const paths={
  check:'M5 12l4 4L19 6',plus:'M12 5v14M5 12h14',minus:'M5 12h14',note:'M5 3h14v18H5zM8 8h8M8 12h8M8 16h4',trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',workout:'M3 8v8M7 5v14M7 12h10M17 5v14M21 8v8',progress:'M4 19V5M4 19h17M7 14l5-5 4 3 5-7',history:'M4 5v5h5M4 10a8 8 0 1 1 0 5M12 7v5l3 2',program:'M5 4h14v17H5zM9 4V2h6v2M8 9h8M8 13h8M8 17h5',up:'M5 14l7-7 7 7',down:'M5 10l7 7 7-7',close:'M6 6l12 12M6 18L18 6'
};
function el(tag,cls,text) {
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function icon(name){
  if(DESIGN_ICONS[name]){const svg=new DOMParser().parseFromString(DESIGN_ICONS[name].replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '),'image/svg+xml').documentElement;const n=document.importNode(svg,true);n.setAttribute('class','icon');n.setAttribute('aria-hidden','true');n.removeAttribute('aria-label');return n;}
  const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('class','icon');n.setAttribute('aria-hidden','true');const p=document.createElementNS(n.namespaceURI,'path');p.setAttribute('d',paths[name]);n.append(p);return n;
}

function btn(text,fn,cls='',ic) {
  const b=el('button',cls);
  b.type='button';
  if(ic)b.append(icon(ic));
  if(text)b.append(document.createTextNode(text));
  b.onclick=fn;
  return b;
}
function ib(name,label,fn,cls='') {
  const b=btn('',fn,'icon-button '+cls,name);
  b.setAttribute('aria-label',label);
  return b;
}
function field(id,label,value,type='text',fn) {
  const l=el('label','',label),i=el('input');
  i.id=id;
  i.type=type;
  i.value=value??'';
  if(fn)i.oninput=()=>fn(i.value);
  l.append(i);
  return l;
}
function noteField(id,label,value,fn) {
  const l=el('label','',label),t=el('textarea');
  t.id=id;
  t.rows=2;
  t.value=value||'';
  t.oninput=()=>fn(t.value||null);
  l.append(t);
  return l;
}
function today(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmt(n){
  return n==null?'—':n.toLocaleString('tr-TR',{
    maximumFractionDigits:2
  });
}
function date(s,short=false){
  return (s.date_estimated?'~':'')+s.date.split('-').reverse().slice(0,short?2:3).join('.');
}
function num(v){
  if(!String(v).trim())return null;
  const n=Number(String(v).replace(',','.'));
  return Number.isFinite(n)&&n>=0?n:NaN;
}
function sorted(){
  return [...state.sessions].sort((a,b)=>b.date.localeCompare(a.date)||(b.finished_at||'').localeCompare(a.finished_at||''));
}
function names(){
  return [...new Set(sorted().flatMap(s=>s.exercises.map(e=>e.name)))];
}
function last(name,day,exclude){
  for(const s of sorted()){
    if(s.id===exclude||s.day!==day)continue;
    const e=s.exercises.find(x=>x.name===name&&x.sets.length);
    if(e)return {
      s,e
    };
  }
  return null;
}
function setText(s,rir=false,compact=false){
  const cross=compact?'×':' × ';
  return `${fmt(s.kg)}${cross}${fmt(s.reps)}${rir&&s.rir!=null?' @'+(s.rir>=4?'4+':s.rir):''}${rir&&s.note?' · '+s.note:''}`;
}

function counts(s){
  return s.exercises.reduce((a,e)=>a+e.sets.length,0);
}
function notice(text,info=false){
  $('notice').classList.toggle('info',info);
  $('notice').textContent=text;
  clearTimeout(notice.timer);
  notice.timer=setTimeout(()=>$('notice').textContent='',6500);
}
function backup(d){
  try{
    if(d)localStorage.setItem('fitness-log-draft-v1',JSON.stringify(d));
    else localStorage.removeItem('fitness-log-draft-v1');
  }
  catch(_) {
  }
}
function localDraft(){
  try{
    return JSON.parse(localStorage.getItem('fitness-log-draft-v1'));
  }
  catch(_){
    return null;
  }
}
// A global write queue also serializes writes when an import or finish overlaps a debounce.
let writeTail=Promise.resolve();
function write(fn){
  const p=writeTail.then(fn);
  writeTail=p.catch(()=>{
  });
  return p.catch(e=>{
    notice('Kaydedilemedi. Cihazın depolama alanını ve tarayıcı izinlerini kontrol et.');
    throw e;
  });
}
const jobs={
};
function schedule(key,value,save){
  clearTimeout(jobs[key]?.timer);
  const job={
    value:clone(value),save
  };
  jobs[key]=job;
  job.timer=setTimeout(()=>flush(key).catch(()=>{
  }),500);
}
async function flush(key){
  const job=jobs[key];
  if(!job)return;
  clearTimeout(job.timer);
  delete jobs[key];
  await write(()=>job.save(job.value));
}
function changed(){
  if(state.edit)return;
  state.draft._updated_at=Math.max(Date.now(),(state.draft._updated_at||0)+1);
  backup(state.draft);
  schedule('draft',state.draft,x=>Store.saveDraft(x));
  updateHeader();
}
function programChanged(){
  schedule('program',state.program,x=>Store.saveProgram(x));
}
let closeSheet=null;
function sheet(title,build){
  if(closeSheet)closeSheet();
  const prior=document.activeElement,overlay=el('div','overlay'),panel=el('div','sheet');
  panel.role='dialog';
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','sheet-title');
  const h=el('h2','',title);
  h.id='sheet-title';
  const close=ib('close','Kapat',()=>closeSheet());
  close.classList.add('close');
  panel.append(close,h);
  overlay.append(panel);
  $('modal-root').append(overlay);
  const done=()=>{
    if(state.busy)return;
    overlay.remove();
    closeSheet=null;
    if(prior?.isConnected)prior.focus();
  };
  closeSheet=done;
  build(panel,done);
  overlay.onkeydown=e=>{
    if(e.key==='Escape')done();
    if(e.key==='Tab'){
      const a=[...panel.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&!n.closest('.hidden'));
      const first=a[0],last=a[a.length-1];
      if(e.shiftKey&&document.activeElement===first){
        e.preventDefault();
        last.focus();
      }
      else if(!e.shiftKey&&document.activeElement===last){
        e.preventDefault();
        first.focus();
      }
    }
  };
  close.focus();
  return panel;
}
function ask(title,message,action,label='Onayla'){
  sheet(title,(p,done)=>{
    p.append(el('p','',message));
    const actions=el('div','sheet-actions');
    const go=btn(label,async()=>{
      go.disabled=true;
      state.busy=true;
      try{
        await action();
        state.busy=false;
        done();
        render();
      }
      catch(_){
        state.busy=false;
        go.disabled=false;
      }
    },'primary');
    actions.append(go,btn('Geri dön',done));
    p.append(actions);
  });
}
function current(){
  return state.edit||state.draft;
}








// Cable stacks use 5 lb plates (2.26796185 kg), displayed to one decimal.
function stepValue(value,step,dir){
  if(Math.abs(step-2.27)<.001){
    const k=Math.round((value||0)/step)+dir;
    return Math.max(0,Math.round(k*2.26796185*10)/10);
  }
  return Math.max(0,Math.round(((value||0)+dir*step)*100)/100);
}
function newExercise(p,day,exclude){
  const old=last(p.name,day,exclude);
  return {
    name:p.name,load_mode:p.load_mode||'total',target_reps:p.target_reps||null,note:null,_step:p.step||2.5,_base:p.sets||2,sets:Array.from({
      length:p.sets||2
    },(_,i)=>{
      const s=old?.e.sets[Math.min(i,old.e.sets.length-1)];
      return {
        kg:s?.kg??null,reps:s?.reps??null,rir:null,note:null,_done:false
      };
    })
  };
}
function start(day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date)){
    notice('Geçerli bir tarih seç.');
    return;
  }
  state.draft={
    id:uid(),date:state.date,day,note:null,started_at:new Date().toISOString(),finished_at:null,exercises:(state.program.days[day]||[]).map(p=>newExercise(p,day))
  };
  state.activeExercise=0;
  changed();
  go('workout');
}
function exerciseCard(w,e,ei){
  const card=el('article','exercise');
  card.dataset.exercise=e.name;
  const head=el('div','row');
  const heading=el('div','grow'),tags=el('div','exercise-tags');heading.append(el('h3','',e.name));tags.append(loadBadge(e),el('span','badge target-badge',e.target_reps||'Serbest'));head.append(heading,tags);
  card.append(head);
  const prev=last(e.name,w.day,w.id);
  heading.append(el('div','reference',prev?'Geçen '+date(prev.s,true)+': '+prev.e.sets.map(s=>setText(s)).join(' · '):'Geçen: İlk kayıt — kendi başlangıcını belirle.'));
  const upper=Number((e.target_reps||'').split(/[-–]/).pop());
  if(prev&&upper>0&&prev.e.sets.every(s=>s.reps!=null&&s.reps>=upper)&&prev.e.sets.some(s=>s.kg!=null)){
    const kg=stepValue(prev.e.sets.find(s=>s.kg!=null).kg,e._step||2.5,1);
    card.append(btn('Üst sınır ✓ · '+fmt(kg)+' kg dene',()=>{
      e.sets.filter(s=>!s._done).forEach(s=>{
        s.kg=kg;
        s.reps=null;
      });
      changed();
      render();
    },'gold progression-chip'));
  }
  const labels=el('div','values set-labels');for(const text of ['SET','KG','TEKRAR',''])labels.append(el('span','',text));card.append(labels);
  e.sets.forEach((s,si)=>{
    const row=el('div','set '+(s._done?'done':'pending'));
    const values=el('div','values');
    values.append(el('span','setno',String(si+1)));
    for(const [key,label,step] of [['kg','KG',e._step||2.5],['reps','TEKRAR',1]]){
      const box=el('div');
      const group=el('div','stepper'),input=el('input');
      input.id=`set-${ei}-${si}-${key}`;
      input.value=s[key]==null?'':fmt(s[key]);
      input.inputMode=key==='kg'?'decimal':'numeric';
      input.setAttribute('aria-label',`${e.name}, ${si+1}. set ${label}`);
      input.disabled=!!s._done;
      input.oninput=()=>{
        const v=num(input.value);
        input.setCustomValidity(Number.isNaN(v)?'Sıfır veya pozitif bir sayı gir.':'');
        if(!Number.isNaN(v)){
          s[key]=v;
          changed();
        }
      };
      input.onblur=()=>{
        if(!Number.isNaN(num(input.value)))input.value=s[key]==null?'':fmt(s[key]);
      };
      const down=ib('minus',label+' azalt',()=>{
        s[key]=stepValue(s[key],step,-1);
        changed();
        render();
      }),up=ib('plus',label+' artır',()=>{
        s[key]=stepValue(s[key],step,1);
        changed();
        render();
      });
      down.disabled=up.disabled=!!s._done;
      group.append(down,input,up);
      box.append(group);
      values.append(box);
    }
    const check=ib('check',s._done?'Seti düzenle':'Seti onayla',()=>{
      if(!s._done&&[...row.querySelectorAll('input')].some(n=>!n.reportValidity()))return;
      if(!s._done&&(s.reps==null||s.reps<=0)){
        notice('Onaylamak için tekrar sayısını gir.');
        return;
      }
      s._done=!s._done;
      if(s._done&&e.sets.every(x=>x._done))state.activeExercise=nextIncomplete(w,ei);
      changed();
      render();
    },'check');
    check.setAttribute('aria-pressed',String(!!s._done));
    values.append(check);
    row.append(values);
    const tools=el('div','set-tools'),rir=el('div','rir');
    rir.append(el('span','rir-label','RIR'));
    for(let n=0;
    n<=4;
    n++){
      const b=btn('',()=>{
        s.rir=s.rir===n?null:n;
        changed();
        render();
      },s.rir===n?'active':'');
      b.disabled=!!s._done;
      b.setAttribute('aria-label','RIR '+(n===4?'4+':n));
      b.setAttribute('aria-pressed',String(s.rir===n));
      b.append(el('span','rir-chip',n===4?'4+':String(n)));
      rir.append(b);
    }
    if(!s._done)tools.append(rir);
    if(si>=(e._base||2))tools.append(ib('trash','Ekstra seti sil',()=>{
      e.sets.splice(si,1);
      changed();
      render();
    },'danger'));
    if(s._done){ tools.prepend(el('small','',s.rir!=null?'RIR '+(s.rir===4?'4+':s.rir):''),el('small','gold-text',setDelta(s,prev?.e.sets[si]))); }
    row.append(tools);
    card.append(row);
  });
  const actions=el('div','row card-actions');
  actions.append(btn('+ Set',()=>{
    const old=e.sets[e.sets.length-1];
    e.sets.push({
      kg:old?.kg??null,reps:old?.reps??null,rir:null,note:null,_done:false
    });
    changed();
    render();
  },'secondary'));
  for(const text of ['Not','Makine farklı'])actions.append(btn(text,()=>{const s=e.sets.find(x=>!x._done)||e.sets[e.sets.length-1]; sheet('Set notu',(p,done)=>{if(text==='Makine farklı')s.note=[s.note,'Makine farklı'].filter(Boolean).join(' · '); changed(); p.append(noteField('quick-note','Not',s.note,v=>{s.note=v;changed();}));if(text==='Not')p.append(noteField('quick-exercise-note','Hareket notu',e.note,v=>{e.note=v;changed();}));p.append(btn('Tamam',()=>{done();render();},'primary wide spaced'));});},'secondary'));
  card.append(actions);
  return card;
}
function addExercise(w){
  sheet('Hareket ekle',(p,done)=>{
    const all=[...new Set([...names(),...Object.values(state.program.days).flat().map(e=>e.name)])];
    const input=field('exercise-search','Ara veya yeni hareket adı yaz','','text',v=>list(v));
    p.append(input);
    const results=el('div','stack');
    p.append(results);
    function add(name){
      name=name.trim();
      if(!name)return;
      const recent=sorted().flatMap(s=>s.exercises).find(e=>e.name===name);
      const def=Object.values(state.program.days).flat().find(e=>e.name===name)||{name,sets:2,step:2.5,load_mode:recent?.load_mode||'total'};
      w.exercises.push(newExercise(def,w.day,w.id));
      changed();
      done();
      render();
    }
    function list(v){
      results.replaceChildren();
      all.filter(n=>n.toLocaleLowerCase('tr').includes(v.toLocaleLowerCase('tr'))).forEach(n=>results.append(btn(n,()=>add(n),'history-item')));
    }
    p.append(btn('Bu adla ekle',()=>add(input.querySelector('input').value),'primary wide spaced'));
    list('');
  });
}
function cleanSession(w,onlyDone=false){
  const s=clone(w);
  delete s._updated_at;
  s.exercises=s.exercises.map(e=>({
    name:e.name,load_mode:e.load_mode||'total',target_reps:e.target_reps,note:e.note,sets:e.sets.filter(x=>!onlyDone||x._done).map(x=>({
      kg:x.kg,reps:x.reps,rir:x.rir,note:x.note
    }))
  })).filter(e=>e.sets.length);
  return s;
}
async function clearDraft(){
  if(jobs.draft){
    clearTimeout(jobs.draft.timer);
    delete jobs.draft;
  }
  await write(()=>Store.saveDraft(null));
  state.draft=null;
  backup(null);
}
function upsert(s){
  const i=state.sessions.findIndex(x=>x.id===s.id);
  if(i<0)state.sessions.push(s);
  else state.sessions[i]=s;
}


function detail(s){
  sheet(s.day+' · '+date(s),(p,done)=>{
    if(s.note)p.append(el('p','note',s.note));
    if(s.rating)p.append(el('p','muted',ratingText(s.rating)));
    if(duration(s))p.append(el('p','muted',duration(s))); 
    s.exercises.forEach(e=>{
      const d=el('div','rule');
      d.append(el('h3','',e.name),loadBadge(e));
      e.sets.forEach(x=>d.append(el('p','numeric note',setText(x,true))));
      if(e.note)d.append(el('p','muted note',e.note));
      p.append(d);
    });
    p.append(btn('Düzenle',()=>{
      done();
      state.edit=clone(s);
      state.edit.exercises.forEach(e=>{
        const def=state.program.days[s.day]?.find(x=>x.name===e.name);
        e._step=def?.step||2.5;
        e._base=def?.sets||e.sets.length;
        e.sets.forEach(x=>x._done=true);
      });
      go('workout');
    },'primary wide'),btn('Sil',()=>{
      done();
      ask('Seansı sil?',date(s)+' tarihli '+s.day+' kaydı silinecek.',async()=>{
        await write(()=>Store.deleteSession(s.id));
        state.sessions=state.sessions.filter(x=>x.id!==s.id);
      },'Seansı sil');
    },'danger wide'));
  });
}
async function saveEdit(){
  if(state.busy)return;
  state.busy=true;
  try{
    const s=cleanSession(state.edit);
    await write(()=>Store.saveSession(s));
    upsert(s);
    state.edit=null;
    go('history');
  }
  catch(_){
  }
  finally{
    state.busy=false;
    render();
  }
}










function validateImport(data){
  if(!data||!['fitness-log/v1','fitness-log/v2'].includes(data.schema)||!Array.isArray(data.sessions))throw new Error('fitness-log/v1 veya v2 şeması ve sessions dizisi gerekli.');
  const str=x=>x==null||typeof x==='string';
  const number=x=>x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=0);
  const sessions=data.sessions.map(s=>{
    if(!s||typeof s.id!=='string'||!s.id||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||Number.isNaN(Date.parse(s.date))||typeof s.day!=='string'||!str(s.note)||!Array.isArray(s.exercises))throw new Error('Geçersiz seans.');
    const out={
      id:s.id,date:s.date,day:s.day,note:s.note??null,exercises:s.exercises.map(e=>{
        if(!e||typeof e.name!=='string'||!str(e.target_reps)||!str(e.note)||!Array.isArray(e.sets))throw new Error('Geçersiz hareket.');
        return {
          name:e.name,load_mode:importMode(e),target_reps:e.target_reps??null,note:e.note??null,sets:e.sets.map(x=>{
            if(!x||!number(x.kg)||!number(x.reps)||!number(x.rir)||!str(x.note))throw new Error('Geçersiz set.');
            return {
              kg:x.kg,reps:x.reps,rir:x.rir,note:x.note??null
            };
          })
        };
      })
    };
    if(s.rating){out.rating={};for(const k of ['energy','pump','sleep']){const n=s.rating[k]??null;if(n!==null&&(!Number.isInteger(n)||n<1||n>5))throw new Error('Geçersiz puan.');out.rating[k]=n;}}
    for(const k of ['date_estimated','week','started_at','finished_at'])if(s[k]!==undefined)out[k]=s[k];
    return out;
  });
  let program=null;
  if(data.program){
    const p=data.program;
    if(!Array.isArray(p.order)||!p.order.length||p.order.some(d=>typeof d!=='string'||!Array.isArray(p.days?.[d]))||new Set(p.order).size!==p.order.length)throw new Error('Geçersiz program.');
    program={
      order:[...p.order],days:{
      }
    };
    for(const d of p.order)program.days[d]=p.days[d].map(e=>{
      if(typeof e.name!=='string'||!e.name.trim()||!str(e.target_reps)||!Number.isInteger(e.sets)||e.sets<1||e.sets>30||typeof e.step!=='number'||!Number.isFinite(e.step)||e.step<=0)throw new Error('Geçersiz program hareketi.');
      return {
        name:e.name,load_mode:importMode(e),target_reps:e.target_reps??null,sets:e.sets,step:e.step
      };
    });
  }
  return {
    sessions:[...new Map(sessions.map(s=>[s.id,s])).values()],program
  };
}
function previewImport(data){
  const existing=data.sessions.filter(s=>state.sessions.some(x=>x.id===s.id)).length;
  sheet('İçe aktarma önizlemesi',(p,done)=>{
    p.append(el('p','',`${data.sessions.length} seans, ${existing} tanesi zaten var (üzerine yazılacak)${existing===data.sessions.length?' · Hepsi zaten var.':''}`));
    let check=null;
    if(data.program){
      const l=el('label');
      check=el('input');
      check.type='checkbox';
      check.id='import-program';
      check.checked=!Object.values(state.program.days).some(a=>a.length);
      l.append(check,document.createTextNode(' Programı da değiştir'));
      p.append(l);
    }
    const status=el('p','numeric spaced'),progress=el('progress');
    progress.id='import-progress';
    progress.setAttribute('aria-label','İçe aktarma ilerlemesi');
    progress.max=data.sessions.length||1;
    progress.value=0;
    p.append(status,progress);
    const go=btn('İçe aktar',async()=>{
      go.disabled=true;
      state.busy=true;
      const replace=check?.checked;
      if(check)check.disabled=true;
      try{
        await flush('program');
        for(let i=0;
        i<data.sessions.length;
        i++){
          await write(()=>Store.saveSession(data.sessions[i]));
          upsert(data.sessions[i]);
          progress.value=i+1;
          status.textContent=`${i+1}/${data.sessions.length}`;
          if(i%5===0)await new Promise(r=>setTimeout(r,0));
        }
        if(replace){
          await write(()=>Store.saveProgram(data.program));
          state.program=clone(data.program);
          state.day=state.program.order[0];
        }
        state.busy=false;
        done();
        render();
        notice('İçe aktarma tamamlandı.',true);
      }
      catch(_){
        state.busy=false;
        go.disabled=false;
        if(check)check.disabled=false;
        status.textContent+=' · Yarım kalan aktarımı yeniden deneyebilirsin.';
      }
    },'primary wide spaced');
    p.append(go,btn('Geri dön',done,'wide'));
  });
}

const DAY_STYLE={PUSH:{color:'#D8343A',abbr:'PS',text:'#FFFFFF',soft:'#20252D',bright:'#EF5A5F',ink:'#FFFFFF'},PULL:{color:'#2F6BDB',abbr:'PL',text:'#FFFFFF',soft:'#20252D',bright:'#6E9BEF',ink:'#FFFFFF'},UPPER:{color:'#E9B800',abbr:'UP',text:'#1A1400',soft:'#3A2E10',bright:'#E9B800',ink:'#F2C14E'},LEGS:{color:'#2E9E5B',abbr:'LG',text:'#06140C',soft:'#1E3A2A',bright:'#5CC28A',ink:'#8FE0B0'}};
const dayStyle=d=>DAY_STYLE[d.toUpperCase()]||{color:'#8E98A7',abbr:d.slice(0,2).toUpperCase(),text:'#0F1216',soft:'#20252D',bright:'#C9D1DC',ink:'#E8ECF1'};
const volume=s=>s.exercises.flatMap(e=>e.sets).reduce((n,x)=>n+(x.kg==null?0:x.kg*(x.reps||0)),0);
const ton=n=>(n/1000).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})+' t';
const bestSet=e=>[...e.sets].filter(s=>s.kg!=null).sort((a,b)=>b.kg-a.kg||(b.reps||0)-(a.reps||0))[0];
function importMode(e){
  if(e.load_mode!==undefined&&!['single','total'].includes(e.load_mode))throw new Error('Geçersiz load_mode.');
  const empty=!Object.values(state.program.days).some(a=>a.length);
  return e.load_mode||(empty&&/single (arm|hand|cable)|dumbbells?|dumbells?/i.test(e.name)?'single':'total');
}
function loadBadge(e){return el('span','badge '+(e.load_mode==='single'?'gold':''),e.load_mode==='single'?'TEK':'TOPLAM');}
function badge(day){const n=colored(el('span','day-badge',dayStyle(day).abbr),day);return n;}

function colored(n,day){const d=dayStyle(day);n.style.setProperty('--day',d.color);n.style.setProperty('--day-text',d.text);n.style.setProperty('--day-soft',d.soft);n.style.setProperty('--day-bright',d.bright);n.style.setProperty('--day-ink',d.ink);return n;}

function ratingText(r){return [['energy','Enerji'],['pump','Pump'],['sleep','Uyku']].map(([k,l])=>l+': '+(r[k]??'—')).join(' · ');}
function duration(s){if(!s.started_at)return '';const n=(new Date(s.finished_at||Date.now())-new Date(s.started_at))/60000;return Number.isFinite(n)?Math.max(0,Math.floor(n))+' dk':'';}
function setDelta(s,old){if(!old)return '';if(s.kg!=null&&old.kg!=null&&s.kg>old.kg)return '+'+fmt(s.kg-old.kg)+' kg';if(s.kg===old.kg&&s.reps>old.reps)return '+'+fmt(s.reps-old.reps)+' tekrar';return '';}
function records(s){
  const earlier=sorted().filter(x=>x.id!==s.id&&(x.date<s.date||(x.date===s.date&&(x.finished_at||'')<(s.finished_at||''))));
  return s.exercises.flatMap(e=>{const best=bestSet(e),old=earlier.flatMap(x=>x.exercises.filter(y=>y.name===e.name).flatMap(y=>y.sets)).filter(x=>x.kg!=null);const previous=old.length?Math.max(...old.map(x=>x.kg)):null;return best&&previous!==null&&best.kg>previous?[{name:e.name,best,previous,s}]:[];});
}
function metricCards(items){const n=el('div','metrics');for(const [value,label]of items){const c=el('div'),number=el('strong','number');number.append(value instanceof Node?value:document.createTextNode(value));c.append(number,el('small','',label));n.append(c);}return n;}

function go(route){if(location.hash!=='#'+route)history.pushState(null,'','#'+route);enterRoute(route);}

function updateHeader(){
  const h=$('header'),w=current();h.replaceChildren();h.className='header-'+state.tab;
  if(state.tab==='workout'&&w){
    colored(h,w.day);const r=el('div','row'),text=el('div','grow'),dateControl=el('div','date-control');
    const picker=datePicker(w.date,v=>{if(v){w.date=v;delete w.date_estimated;changed();render();}},'header-date');
    dateControl.append(btn(dayName(weekday(w,true))+' '+date(w,true)+' · '+duration(w),picker.open,'header-date'),picker.input);
    text.append(el('h1','',w.day),dateControl);r.append(ib('back','Ana ekrana dön',()=>go('home'),'back'),badge(w.day),text,btn(state.edit?'Kaydet':'Bitir',()=>state.edit?saveEdit():finish(),'finish-pill'));h.append(r);
    const sets=w.exercises.flatMap(e=>e.sets),done=sets.filter(s=>s._done).length,pr=el('div','row workout-progress'),bar=el('progress');bar.max=sets.length||1;bar.value=done;bar.setAttribute('aria-label','Onaylanan setler');pr.append(bar,el('span','',done+'/'+sets.length+' set'));h.append(pr);return;
  }
  if(state.tab==='finish'&&w){const r=el('div','row finish-eyebrow');r.append(ib('back','Antrenmana dön',()=>go('workout'),'back'),badge(w.day),el('span','eyebrow grow',weekday(w,true).toLocaleUpperCase('tr')+' · '+date(w,true)));h.append(r,el('h1','finish-title',dayName(w.day)+' bitti'));return;}
  if(state.tab==='summary'){const p=summaryPeriod(),r=el('div','row'),t=el('div','grow');t.append(el('h1','','Son 4 hafta'),el('small','',date({date:p.start},true)+' – '+date({date:p.end},true)+' · '+p.sessions.length+' seans · '+p.sessions.reduce((a,s)=>a+counts(s),0)+' set'));r.append(ib('back','Ana ekrana dön',()=>go('home'),'back'),t);h.append(r);return;}
  const r=el('div','row title-row'),t=el('div','grow');
  if(state.tab==='home'){const now=new Date(),label=now.toLocaleDateString('tr-TR',{weekday:'long'}).toLocaleUpperCase('tr')+' · '+now.getDate()+' '+now.toLocaleDateString('tr-TR',{month:'long'}).toLocaleUpperCase('tr');t.append(el('div','eyebrow',label));}
  t.append(el('h1','',({home:'Fitness Log',progress:'İlerleme',history:'Geçmiş',program:'Program'})[state.tab]));r.append(t);
  if(state.tab==='home'){const plates=el('div','plates');Object.values(DAY_STYLE).forEach(d=>{const p=el('span');p.style.background=d.color;plates.append(p);});r.append(plates);}
  if(state.tab==='history')r.append(el('small','header-count',state.sessions.length+' seans'));
  if(state.tab==='program')r.append(btn('Sıra: '+state.program.order.map(dayName).join(' → '),editOrder,'order-button'));
  h.append(r);
}

function render(){
  if(!['home','workout','finish','summary','progress','history','program'].includes(state.tab))state.tab='home';
  document.querySelector('.shell').dataset.route=state.tab;updateHeader();const n=$('tabs');n.replaceChildren();n.hidden=['workout','finish','summary'].includes(state.tab);
  for(const [key,title,ic]of [['home','Antrenman','workout'],['progress','İlerleme','progress'],['history','Geçmiş','history'],['program','Program','program']]){const active=state.tab===key,b=btn(title,()=>go(key),active?'active':'',ic);b.setAttribute('aria-current',active?'page':'false');n.append(b);}
  const m=$('main');m.replaceChildren();m.classList.add('screen-'+state.tab);for(const key of ['home','workout','finish','summary','progress','history','program'])if(key!==state.tab)m.classList.remove('screen-'+key);
  ({home:homeView,workout:workoutView,finish:finishView,summary:summaryView,progress:progressView,history:historyView,program:programView})[state.tab](m);
  if(state.busy)document.querySelectorAll('.shell button,.shell input,.shell textarea').forEach(n=>n.disabled=true);
}

function historyRow(s,parent){
  const b=btn('',()=>detail(s),'history-item row'),text=el('div','grow'),head=el('div','row'),name=el('strong','',dayName(s.day)),rs=records(s);if(rs.length)name.append(el('span','record-label','REKOR'));
  head.append(name,el('span','history-date'+(s.date_estimated?' muted':''),s.date_estimated?date(s,true):weekday(s)+' '+date(s,true)));
  const tops=s.exercises.map(e=>({e,t:bestSet(e)})).filter(x=>x.t).sort((a,b)=>b.t.kg-a.t.kg).slice(0,2);text.append(head,el('small','block',counts(s)+' set · '+tops.map(x=>x.e.name+' '+setText(x.t)).join(' · ')));b.append(badge(s.day),text);parent.append(b);
}

function homeView(m){
  if(state.draft){const w=state.draft,done=w.exercises.flatMap(e=>e.sets).filter(s=>s._done).length;m.append(btn('Devam eden antrenman: '+w.day+' · '+done+'/'+counts(w)+' set',()=>go('workout'),'resume wide'));}
  const monday=new Date(today()+'T00:00:00');monday.setDate(monday.getDate()-((monday.getDay()+6)%7));const sunday=new Date(monday);sunday.setDate(sunday.getDate()+7);
  const week=sorted().filter(s=>new Date(s.date+'T00:00:00')>=monday&&new Date(s.date+'T00:00:00')<sunday),completed=new Set(week.map(s=>s.day)),card=el('section','card week-card'),r=el('div','row'),count=el('strong','week-count',String(state.program.order.filter(d=>completed.has(d)).length));count.append(el('span','muted','/'+state.program.order.length));r.append(el('span','eyebrow','BU HAFTA'),count);card.append(r);
  const bars=el('div','week-bars');for(const d of state.program.order){const c=el('div'),bar=el('div','week-bar'),done=week.find(s=>s.day===d),label=el('span',done?'':'muted',dayName(d));if(done){bar.style.background=dayStyle(d).color;label.append(el('span','week-weekday',' '+weekday(done)));}c.append(bar,label);bars.append(c);}card.append(bars,metricCards([[String(week.reduce((a,s)=>a+counts(s),0)),'çalışma seti'],[tonValue(week.reduce((a,s)=>a+volume(s),0)),'toplam hacim'],[String(week.flatMap(records).length),'yeni rekor']]));m.append(card);
  const order=state.program.order,next=order[(order.indexOf(sorted()[0]?.day)+1)%order.length]||order[0];
  if(next){const lastDay=sorted().find(s=>s.day===next),list=state.program.days[next]||[],hero=colored(btn('',()=>startSafely(next),'hero'),next),hr=el('div','row');hr.append(el('span','eyebrow','SIRADAKİ'),el('small','',lastDay?'son: '+date(lastDay,true):'İlk antrenman'));const title=el('div','row hero-line'),start=el('span','start-pill','Başlat');start.append(icon('arrow'));title.append(el('strong','hero-title',next),start);hero.append(hr,title,el('span','hero-exercises',list.length+' hareket · '+list.slice(0,4).map(e=>e.name).join(' · ')+(list.length>4?'…':'')));m.append(hero);}
  const dateRow=el('div','date-control home-date'),picker=datePicker(state.date,v=>{state.date=v;render();},'start-date');dateRow.append(btn('Tarih: '+(state.date===today()?'Bugün':date({date:state.date},true))+' ▾',picker.open),picker.input);m.append(dateRow);
  const days=el('div','days other-days');order.filter(d=>d!==next).forEach(d=>days.append(colored(btn(dayName(d),()=>startSafely(d),'day-button'),d)));m.append(days);
  if(!Object.values(state.program.days).some(a=>a.length))m.append(el('p','empty','Programın boş. Program ekranından hareket ekle veya JSON geçmişini içe aktar.'));
  const recent=el('section','records');recent.append(el('h2','eyebrow','SON REKORLAR'));const cutoff=new Date(today()+'T00:00:00');cutoff.setDate(cutoff.getDate()-30);const rs=sorted().filter(s=>new Date(s.date+'T00:00:00')>=cutoff&&s.date<=today()).flatMap(records).slice(0,3);rs.forEach(x=>{const row=el('div','row record-row'),txt=el('div','grow');txt.append(el('strong','',x.name),el('small','block',dayName(x.s.day)+' · '+date(x.s,true)+' · önceki '+fmt(x.previous)));row.append(txt,el('strong','number gold-text',setText(x.best)));recent.append(row);});if(!rs.length)recent.append(el('p','muted','Son 30 günde yeni rekor yok.'));m.append(recent);
  const history=el('section','recents');history.append(el('h2','eyebrow','SON ANTRENMANLAR'));sorted().slice(0,5).forEach(s=>recentRow(s,history));m.append(history,btn('Son 4 haftanın özeti',()=>go('summary'),'outline wide'));
}

function startSafely(day){if(state.draft){sheet('Devam eden antrenman var',(p,done)=>{p.append(btn('Antrenmana dön',()=>{done();go('workout');},'primary wide'),btn('Taslağı sil ve yeni başlat',()=>{done();ask('Taslağı sil?',state.draft.day+' taslağı kaldırılacak.',async()=>{await clearDraft();start(day);},'Sil ve başlat');},'danger wide'));});}else start(day);}
function workoutView(m){
  const w=current();if(!w){m.append(el('p','empty','Devam eden antrenman yok.'),btn('Ana ekrana dön',()=>go('home'),'primary wide'));return;}colored(m,w.day);
  if(state.edit)m.append(el('p','badge','Geçmiş kaydı düzenleniyor'),btn('Düzenlemeyi bırak',()=>{state.edit=null;go('history');},'secondary'),field('workout-date','Tarih',w.date,'date',v=>{if(v){w.date=v;delete w.date_estimated;}}));
  let active=state.activeExercise;if(active==null||active>=w.exercises.length)active=firstIncomplete(w);state.activeExercise=active;
  const complete=e=>e.sets.length&&e.sets.every(s=>s._done);
  const compact=(e,i,done)=>{const b=btn('',()=>{state.activeExercise=i;render();},'compact row '+(done?'completed':'upcoming')),t=el('div','grow'),prev=last(e.name,w.day,w.id);t.append(el('strong','',e.name),el('small','block',done?e.sets.map(s=>setText(s)).join(' · '):prev?'Geçen '+prev.e.sets.map(s=>setText(s)).join(' · '):'Geçen: İlk kayıt'));if(done){const c=el('span','complete-check');c.append(icon('check'));b.append(c,t);const delta=e.sets.map((s,j)=>setDelta(s,prev?.e.sets[j])).find(Boolean);if(delta)b.append(el('span','gold-text compact-delta',delta));}else b.append(el('span','upcoming-number',String(i+1)),t,loadBadge(e));return b;};
  w.exercises.forEach((e,i)=>{if(i!==active&&complete(e))m.append(compact(e,i,true));});if(w.exercises[active])m.append(exerciseCard(w,w.exercises[active],active));
  if(w.exercises.some((e,i)=>i!==active&&!complete(e)))m.append(el('h2','eyebrow','SIRADA'));w.exercises.forEach((e,i)=>{if(i!==active&&!complete(e))m.append(compact(e,i,false));});
  m.append(btn('Hareket ekle',()=>addExercise(w),'secondary wide','plus'),noteField('session-note','Seans notu',w.note,v=>{w.note=v;changed();}));if(!state.edit)m.append(btn('Antrenmanı iptal et',()=>ask('Antrenmanı iptal et?','Bu antrenmanın taslağı silinecek.',async()=>{await clearDraft();go('home');},'Taslağı sil'),'danger wide'));
}

function finish(){
  const w=state.draft;if(!w)return;const sets=w.exercises.flatMap(e=>e.sets),pending=sets.filter(s=>!s._done).length;
  if(!sets.some(s=>s._done)){notice('Henüz onaylanan set yok. Taslağın korunuyor.');return;}
  const proceed=()=>{w.finished_at=new Date().toISOString();changed();go('finish');};
  if(pending)sheet('Onaylanmamış setler',(p,done)=>{p.append(el('p','',pending+' set onaylanmadı. Yalnızca onaylı setler kaydedilecek.'),btn('Onaylanmamışları at ve bitir',()=>{done();proceed();},'primary wide'),btn('Antrenmana dön',done,'wide'));});else proceed();
}
function finishView(m){
  const w=state.draft;if(!w){m.append(el('p','empty','Kaydedilecek antrenman yok.'),btn('Ana ekran',()=>go('home'),'primary'));return;}colored(m,w.day);const s=cleanSession(w,true);m.append(metricCards([[String(counts(s)),'set'],[tonValue(volume(s)),'hacim'],[String(s.exercises.length),'hareket']]));
  records(s).forEach(x=>{const c=el('section','record row'),t=el('div','grow');t.append(el('span','eyebrow gold-text','YENİ REKOR'),el('strong','block',x.name),el('small','','önceki en iyi '+fmt(x.previous)+' kg'));c.append(t,el('strong','number gold-text',setText(x.best)));m.append(c);});
  if(duration(s))m.append(el('p','muted duration','Süre: '+duration(s)));
  const ratings=el('section','ratings');ratings.append(el('h2','eyebrow','BUGÜN NASILDI?'));w.rating=w.rating||{energy:null,pump:null,sleep:null};for(const [key,label]of [['energy','Enerji'],['pump','Pump'],['sleep','Dün geceki uyku']]){const group=el('div','rating'),buttons=el('div','rating-buttons');group.append(el('strong','',label));for(let n=1;n<=5;n++){const b=btn(String(n),()=>{w.rating[key]=w.rating[key]===n?null:n;changed();render();},w.rating[key]===n?'selected':'');b.setAttribute('aria-label',label+' '+n);b.setAttribute('aria-pressed',String(w.rating[key]===n));buttons.append(b);}group.append(buttons);ratings.append(group);}ratings.append(el('p','muted','İsteğe bağlı. Boş bırakırsan da kaydedilir.'));m.append(ratings);
  const actions=el('div','finish-actions');actions.append(btn('Kaydet',()=>saveFinish('home'),'primary wide'),btn('Son 4 haftanın özetini çıkar',()=>saveFinish('summary'),'outline wide'));m.append(actions);
}

async function saveFinish(route){if(state.busy||!state.draft)return;state.busy=true;render();try{await flush('draft');const s=cleanSession(state.draft,true);if(!counts(s))throw new Error('Boş seans');await write(()=>Store.saveFinished(s));upsert(s);state.draft=null;backup(null);go(route);}catch(e){notice('Seans kaydedilemedi. Taslağın korunuyor.');}finally{state.busy=false;render();}}
function historyView(m){
  const filters=el('div','history-filters');for(const d of ['Hepsi',...state.program.order]){const b=colored(btn(d==='Hepsi'?d:dayName(d),()=>{state.filter=d;render();},(state.filter||'Hepsi')===d?'active':''),d);filters.append(b);}m.append(filters);
  const sessions=sorted().filter(s=>!state.filter||state.filter==='Hepsi'||s.day===state.filter),months=[...new Set(sessions.map(s=>s.date.slice(0,7)))];for(const month of months){const ss=sessions.filter(s=>s.date.startsWith(month)),group=el('section','history-month'),h=el('div','month row'),card=el('div','history-card');h.append(el('h2','eyebrow',new Date(month+'-15T12:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}).toLocaleUpperCase('tr')),el('small','',ss.some(s=>s.date_estimated)?'tarihler tahmini':ss.length+' seans · '+ss.reduce((n,s)=>n+counts(s),0)+' set'));ss.forEach(s=>historyRow(s,card));group.append(h,card);m.append(group);}if(!sessions.length)m.append(el('p','empty','Henüz kayıt yok.'));
}

function summaryText(detailed=false){
  const end=today(),cut=new Date(end+'T00:00:00');cut.setDate(cut.getDate()-27);const startDate=`${cut.getFullYear()}-${String(cut.getMonth()+1).padStart(2,'0')}-${String(cut.getDate()).padStart(2,'0')}`;
  const ss=[...sorted()].reverse().filter(s=>s.date>=startDate&&s.date<=end),lines=[];
  if(detailed)lines.push('Bu metin bir antrenman günlüğü özetidir; kg değerlerinde TEK = tek taraf / tek dumbbell, TOPLAM = iki tarafın toplamı. ~ işareti tahmini tarihi belirtir. Hacim yazılan kg × tekrar toplamıdır.','');
  lines.push('SON 4 HAFTA ('+date({date:startDate},true)+'–'+date({date:end},true)+')',ss.length+' seans · haftada ~'+(ss.length/4).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})+' gün · '+ss.reduce((a,s)=>a+counts(s),0)+' set');
  for(const d of state.program.order){const ds=ss.filter(s=>s.day===d);if(ds.length<=2)lines.push(dayName(d)+' sadece '+ds.length+' kez'+(ds.length?' ('+ds.map(s=>date(s,true)).join(', ')+')':''));}
  const ns=[...new Set(ss.flatMap(s=>s.exercises.map(e=>e.name)))],risers=[],stalled=[];
  for(const name of ns){const rows=ss.flatMap(s=>s.exercises.filter(e=>e.name===name).map(e=>({s,e,t:bestSet(e)}))).filter(r=>r.t);if(rows.length<2)continue;const first=rows[0].t,lastSet=rows[rows.length-1].t;if(lastSet.kg>first.kg)risers.push({text:name+'  '+setText(first,false,true)+' → '+setText(lastSet,false,true),diff:lastSet.kg-first.kg});let same=1;for(let i=rows.length-2;i>=0;i--){if(rows[i].t.kg!==lastSet.kg)break;same++;}if(same>=3){const tail=rows.slice(-same);if(tail.slice(1).every((r,i)=>(r.t.reps||0)<=(tail[i].t.reps||0)))stalled.push(name+'  '+fmt(lastSet.kg)+' kg · '+same+' seanstır aynı; '+setText(tail[0].t,false,true)+' → '+setText(lastSet,false,true));}}
  lines.push('','ARTANLAR',...risers.sort((a,b)=>b.diff-a.diff).slice(0,5).map(x=>x.text));if(!risers.length)lines.push('Karşılaştırılabilir artış yok.');lines.push('','YERİNDE SAYANLAR',...(stalled.length?stalled:['En az 3 seanslık duraklama yok.']));
  lines.push('','NOTLAR');let notes=0;for(const s of ss){for(const r of records(s)){lines.push(date(s,true)+' Rekor: '+r.name+' '+setText(r.best,false,true));notes++;}for(const text of [s.note,...s.exercises.flatMap(e=>[e.note&&e.name+': '+e.note,...e.sets.filter(x=>x.note).map(x=>e.name+': '+x.note)])].filter(Boolean)){lines.push(date(s,true)+' '+text.slice(0,140));notes++;}}if(!notes)lines.push('Dönemde rekor veya not yok.');
  const ratings=[['energy','Enerji'],['pump','Pump'],['sleep','Uyku']].flatMap(([k,l])=>{const values=ss.map(s=>s.rating?.[k]).filter(n=>n!=null);return values.length?[l+' '+fmt(values.reduce((a,b)=>a+b,0)/values.length)+'/5 ('+values.length+' seans)']:[];});if(ratings.length)lines.push('','ORTALAMA PUANLAR',ratings.join(' · '));
  if(detailed){lines.push('','TÜM SEANSLAR');for(const s of ss){lines.push('',date(s)+' '+dayName(s.day)+(duration(s)?' · '+duration(s):''));for(const e of s.exercises){lines.push(e.name+' ['+(e.load_mode==='single'?'TEK':'TOPLAM')+'] · hedef '+(e.target_reps||'serbest'),e.sets.map(x=>setText(x,true,true)).join(' · '));if(e.note)lines.push('Hareket notu: '+e.note);}if(s.note)lines.push('Seans notu: '+s.note);if(s.rating)lines.push(ratingText(s.rating));}}
  return lines.join('\n');
}
function summaryView(m){
  const tabs=el('div','segmented summary-tabs');for(const [key,title]of [['coach','Koç için'],['detail','Claude için (detaylı)']]){const b=btn(title,()=>{state.summaryMode=key;render();},(state.summaryMode||'coach')===key?'active':'');b.setAttribute('aria-pressed',String((state.summaryMode||'coach')===key));tabs.append(b);}m.append(tabs);
  const text=summaryText(state.summaryMode==='detail'),area=el('textarea','summary-text');area.readOnly=true;area.value=text;area.id='summary-text';area.setAttribute('aria-label','Son dört hafta özeti');const actions=el('div','summary-actions');actions.append(btn('Kopyala',async()=>{try{await navigator.clipboard.writeText(text);notice('Kopyalandı.',true);}catch(_){area.focus();area.select();area.setSelectionRange(0,area.value.length);notice('Metin seçildi. Kopyala seçeneğini kullan.',true);}},'copy-button','copy'));
  if(navigator.share)actions.append(btn('Paylaş',async()=>{try{await navigator.share({text});}catch(e){if(e.name!=='AbortError')notice('Paylaşılamadı. Kopyala seçeneğini kullan.');}},'outline','share'));m.append(area,actions);
}

function progressView(m){
  const all=[...new Set([...names(),...Object.values(state.program.days).flat().map(e=>e.name)])];if(!all.includes(state.exercise))state.exercise=all[0]||'';
  const select=btn('',()=>sheet('Hareket seç',(p,done)=>{const list=el('div'),show=q=>{list.replaceChildren();all.filter(n=>n.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))).forEach(name=>{const ds=exerciseDays(name),b=btn('',()=>{state.exercise=name;done();render();},'history-item row'),dot=colored(el('span','dot'),ds[0]||''),t=el('div');t.append(el('strong','',name),el('small','block',ds.map(dayName).join(' · ')));b.append(dot,t);list.append(b);});};p.append(field('progress-search','Hareket ara','','search',show),list);show('');}),'selector wide row');const ds=exerciseDays(state.exercise);select.append(colored(el('span','dot'),ds[0]||''),el('strong','grow',state.exercise||'Hareket seç'),el('small','',ds.map(dayName).join(' · ')),icon('down'));const selection=el('section','exercise-select');selection.append(el('h2','eyebrow','HAREKET'),select);m.append(selection);
  const rows=sorted().flatMap(s=>s.exercises.filter(e=>e.name===state.exercise).map(e=>({s,e}))),valid=rows.filter(r=>bestSet(r.e));if(!rows.length){m.append(el('p','empty','Bu hareket için henüz kayıt yok.'));return;}
  if(valid.length){const best=[...valid].sort((a,b)=>bestSet(b.e).kg-bestSet(a.e).kg||(bestSet(b.e).reps||0)-(bestSet(a.e).reps||0))[0],latest=bestSet(valid[0].e),firstRow=valid[valid.length-1],first=bestSet(firstRow.e),diff=latest.kg-first.kg,month=new Date(firstRow.s.date+'T12:00:00').toLocaleDateString('tr-TR',{month:'long'}).toLocaleUpperCase('tr'),stats=el('div','progress-stats');for(const [label,value,note,cls]of [['EN İYİ',setText(bestSet(best.e)),date(best.s,true),'gold-text'],['SON',setText(latest),date(valid[0].s,true),''],[month+"'DAN",(diff>=0?'+':'')+fmt(diff)+' kg',fmt(first.kg)+' → '+fmt(latest.kg),'increase']]){const c=el('div');c.append(el('span','stat-label',label),el('strong','number '+cls,value),el('small','',note));stats.append(c);}m.append(stats);}
  const card=el('section','chart-card'),toggles=el('div','chart-toggles');for(const [key,title]of [['kg','En ağır set'],['rm','Tahmini 1RM']])toggles.append(btn(title,()=>{state.mode=key;render();},state.mode===key?'active':''));card.append(toggles);
  const points=[...rows].reverse().map(r=>{const values=r.e.sets.filter(x=>x.kg!=null&&(state.mode==='kg'||(x.reps>0&&x.reps<=12))).map(x=>state.mode==='kg'?x.kg:x.kg*(1+x.reps/30));return {...r,value:values.length?Math.max(...values):null};}).filter(p=>p.value!=null);if(points.length)chart(card,points);else card.append(el('p','empty','Grafik için uygun set yok. Epley hesabı 1–12 tekrar kullanır.'));m.append(card);
  const list=el('section','progress-sessions');list.append(el('h2','eyebrow','SEANSLAR'));rows.forEach(({s,e})=>{const row=btn('',()=>detail(s),'progress-row'),day=colored(el('span','day-label',dayName(s.day)),s.day);row.append(el('small','',date(s,true)),el('strong','',e.sets.map(x=>setText(x)).join(' · ')),day);list.append(row);});m.append(list);
}

function chart(parent,points){
  const ns='http://www.w3.org/2000/svg',svg=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
  const graph=svg('svg',{viewBox:'0 0 352 200',class:'chart',role:'group','aria-label':state.exercise+' '+(state.mode==='kg'?'en ağır set':'tahmini 1RM')+' grafiği'}),values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),pad=Math.max(max*.05,.1),lo=min-pad,hi=max+pad,times=points.map(p=>Date.parse(p.s.date+'T12:00:00')),tmin=times[0],span=times[times.length-1]-tmin,x=i=>span?34+(times[i]-tmin)/span*308:188,y=v=>176-(v-lo)/(hi-lo)*160;
  colored(graph,exerciseDays(state.exercise)[0]||points[points.length-1].s.day);
  let run=null;const runs=[];points.forEach((p,i)=>{if(p.s.date_estimated){if(run===null)run=i;}else if(run!==null){runs.push([run,i-1]);run=null;}});if(run!==null)runs.push([run,points.length-1]);
  for(const [a,b]of runs){const left=a?((x(a-1)+x(a))/2):34,right=b<points.length-1?((x(b)+x(b+1))/2):342;graph.append(svg('rect',{x:left,y:16,width:Math.max(1,right-left),height:160,fill:'var(--estimated-band)',class:'estimated-band'}));}
  // Round ticks at their true data coordinates; keep the data domain at +/-5%.
  const raw=(hi-lo)/3,power=10**Math.floor(Math.log10(raw));let tick=[1,2,2.5,5,10].map(n=>n*power).find(n=>Math.floor(hi/n)-Math.ceil(lo/n)+1<=4&&Math.floor(hi/n)-Math.ceil(lo/n)+1>=3);if(!tick)tick=[1,2,2.5,5,10].map(n=>n*power).find(n=>n>=raw)||power*10;
  for(let v=Math.ceil(lo/tick)*tick;v<=hi+tick*.00001;v+=tick){const value=Number(v.toPrecision(12)),yy=y(value);graph.append(svg('line',{x1:34,x2:342,y1:yy,y2:yy,class:'gridline'}),svg('text',{x:28,y:yy+4,'text-anchor':'end',class:'y-tick'},fmt(value)));}
  const path=points.map((p,i)=>(i?'L':'M')+x(i)+','+y(p.value)).join(' ');graph.append(svg('path',{d:path+' L'+x(points.length-1)+',176 L'+x(0)+',176 Z',fill:'var(--day)','fill-opacity':'.12'}),svg('path',{d:path,class:'plot'}));const months=new Map();points.forEach((p,i)=>{const key=p.s.date.slice(0,7);if(!months.has(key))months.set(key,i);});let lastX=-100;for(const i of months.values()){if(x(i)-lastX<65)continue;graph.append(svg('text',{x:x(i),y:190,'text-anchor':i===0?'start':'middle'},new Date(points[i].s.date+'T12:00:00').toLocaleDateString('tr-TR',{month:'short'})));lastX=x(i);}
  const tip=el('p','reference chart-tip','Noktaya dokun · '+(state.mode==='kg'?'En ağır set (kg)':'Epley: kg × (1 + tekrar/30), tekrar ≤ 12'));tip.setAttribute('aria-live','polite');const best=values.indexOf(max);points.forEach((p,i)=>{if(i===best||i===points.length-1)graph.append(svg('circle',{cx:x(i),cy:y(p.value),r:i===points.length-1?5:4,fill:i===best?'var(--gold)':'var(--day-bright)',stroke:i===points.length-1?'var(--bg)':'none','stroke-width':i===points.length-1?2:0}));const hit=svg('circle',{cx:x(i),cy:y(p.value),r:22,fill:'transparent',tabindex:0,role:'button','aria-label':date(p.s)+' '+fmt(p.value)+' kg'}),show=()=>{tip.textContent=date(p.s)+' · '+p.e.sets.map(s=>setText(s,true)).join(' · ');};hit.onclick=show;hit.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();show();}};graph.append(hit);});parent.append(graph);if(runs.length)parent.append(el('small','estimated-label','~ tahmini tarihler'));parent.append(tip);
}

function programView(m){
  const p=state.program;if(!p.order.includes(state.day))state.day=p.order[0];
  const daysSince=state.meta.last_export_at?Math.floor((Date.now()-Date.parse(state.meta.last_export_at))/86400000):null;if(daysSince===null||daysSince>=14){const banner=el('div','backup row'),text=el('div','grow');text.append(el('strong','',daysSince===null?'Henüz yedek alınmadı':'Son yedek '+daysSince+' gün önce'),el('small','block','Veriler sadece bu telefonda duruyor.'));banner.append(icon('warning'),text,btn('Yedekle',()=>exportData(),'gold'));m.append(banner);}
  const tabs=el('div','days program-tabs');p.order.forEach(d=>{const b=colored(btn(d,()=>{state.day=d;state.programOpen=null;render();},'day-button '+(state.day===d?'selected':'')),d);b.setAttribute('aria-pressed',String(state.day===d));tabs.append(b);});m.append(tabs);
  const list=p.days[state.day]||[],container=el('section','program-list');list.forEach((e,i)=>{const open=state.programOpen===i,row=el('div','program-item'),toggle=open?el('div','row wide program-toggle'):btn('',()=>{state.programOpen=i;render();},'row wide program-toggle'),text=el('div','grow');text.append(el('strong','',e.name),el('small','block',open?'düzenleniyor':(e.target_reps||'Serbest')+' · '+e.sets+' set · ±'+fmt(e.step)));if(open){const name=el('input','program-name');name.id='program-name-'+i;name.value=e.name;name.setAttribute('aria-label','Hareket adı');name.oninput=()=>{if(name.value.trim()){e.name=name.value.trim();programChanged();}};text.replaceChildren(name,el('small','block','düzenleniyor'));}toggle.append(text);if(open)toggle.append(ib('up','Düzenlemeyi kapat',()=>{state.programOpen=null;render();}));else toggle.append(loadBadge(e),icon('handle'));toggle.setAttribute('aria-expanded',String(open));row.append(toggle);
    if(open){const fields=el('div','fields');for(const [key,label]of [['target_reps','HEDEF'],['sets','SET'],['step','ADIM KG']]){const f=field('program-'+i+'-'+key,label,key==='step'?fmt(e[key]):e[key],'text',v=>{if(key==='target_reps'){e[key]=v||null;programChanged();}else{const n=num(v),valid=key==='sets'?Number.isInteger(n)&&n>0&&n<=30:Number.isFinite(n)&&n>0;f.querySelector('input').setCustomValidity(valid?'':'Geçerli bir değer gir.');if(valid){e[key]=n;programChanged();}}});if(key!=='target_reps')f.querySelector('input').inputMode=key==='step'?'decimal':'numeric';fields.append(f);}row.append(fields,el('p','mode-label','KİLOYU NASIL YAZIYORSUN?'));const modes=el('div','load-modes');for(const [mode,label]of [['single','Tek taraf'],['total','İki taraf toplamı']]){const b=btn(label,()=>{e.load_mode=mode;programChanged();render();},(e.load_mode||'total')===mode?'selected':'');b.setAttribute('aria-pressed',String((e.load_mode||'total')===mode));modes.append(b);}row.append(modes);const actions=el('div','row edit-actions');for(const [dir,ic]of [[-1,'up'],[1,'down']]){const b=ib(ic,'Hareketi '+(dir<0?'yukarı':'aşağı')+' taşı',()=>{[list[i],list[i+dir]]=[list[i+dir],list[i]];state.programOpen=i+dir;programChanged();render();});b.disabled=i+dir<0||i+dir>=list.length;actions.append(b);}actions.append(ib('trash','Hareketi sil',()=>ask('Hareketi sil?',e.name+' programdan kaldırılacak.',async()=>{list.splice(i,1);state.programOpen=null;programChanged();},'Kaldır'),'danger'));row.append(actions);}container.append(row);
  });m.append(container,btn('Hareket ekle',()=>{list.push({name:'Yeni hareket',target_reps:'6-9',sets:2,step:2.5,load_mode:'total'});p.days[state.day]=list;state.programOpen=list.length-1;programChanged();render();},'add-program wide','plus'));dataView(m);
}

function exportPayload(){return {schema:'fitness-log/v2',units:'kg',exported_at:new Date().toISOString(),readme:'Tarihler YYYY-MM-DD; date_estimated=true tahmini tarihtir. Setler: kg, reps, rir, note; kg=null vücut ağırlığı olabilir. load_mode: single=tek taraf/tek dumbbell, total=iki taraf toplamı. Eski kayıtlarda varsayılan total. rating: energy/pump/sleep, isteğe bağlı 1–5 veya null. Program: gün sırası, hareket adı, hedef tekrar, set sayısı, kg artış adımı. Hacim yazılan kg×tekrar toplamıdır.',program:clone(state.program),sessions:sorted().map(s=>({...clone(s),exercises:s.exercises.map(e=>({...clone(e),load_mode:e.load_mode||'total'}))}))};}
async function exportData(){
  try{await flush('program');const text=JSON.stringify(exportPayload(),null,2),filename='fitness-log-'+today()+'.json',file=new File([text],filename,{type:'application/json'});let shared=false;
    if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Fitness Log yedeği'});shared=true;}catch(e){if(e.name==='AbortError')return;}}
    if(!shared){const url=URL.createObjectURL(file),a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
    state.meta.last_export_at=new Date().toISOString();await Store.saveMeta(state.meta);notice('Yedek dışa aktarıldı.',true);if(state.tab==='program')render();
  }catch(e){notice('Dışa aktarılamadı. Lütfen tekrar dene.');}
}
function dataView(m){const actions=el('div','data-actions'),input=el('input');input.type='file';input.id='import-file';input.hidden=true;input.accept='.json,application/json';input.onchange=async()=>{if(!input.files[0])return;try{previewImport(validateImport(JSON.parse(await input.files[0].text())));}catch(e){notice('İçe aktarılamadı: '+e.message);}input.value='';};actions.append(btn('JSON dışa aktar',()=>exportData(),'outline'),btn('İçe aktar',()=>input.click(),'outline'),input);m.append(actions);}

async function setupServiceWorker(){
  if(!('serviceWorker'in navigator))return;
  try{const registration=await navigator.serviceWorker.register('./sw.js');let waiting;
    const show=w=>{if(!w||!navigator.serviceWorker.controller)return;waiting=w;const bar=$('update');bar.hidden=false;bar.replaceChildren(el('span','','Yeni sürüm hazır · '),btn('Yenile',()=>waiting.postMessage({type:'SKIP_WAITING'})));};
    show(registration.waiting);registration.addEventListener('updatefound',()=>{const w=registration.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed')show(registration.waiting||w);});});let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(waiting&&!reloading){reloading=true;location.reload();}});
  }catch(e){notice('Çevrimdışı kurulum tamamlanamadı. İlk açılışta bağlantı ve HTTPS gerekli.');}
}
async function boot(){
  try{const data=await Store.init();state.program=data.program||state.program;state.sessions=data.sessions||[];state.draft=data.draft||null;state.meta=data.meta||{last_export_at:null,schema_version:2};
    for(const e of Object.values(state.program.days).flat())e.load_mode=e.load_mode||'total';
    const local=localDraft();if(local&&state.sessions.some(s=>s.id===local.id)){backup(null);}else if(local&&Array.isArray(local.exercises)&&(!state.draft||(local.id===state.draft.id&&(local._updated_at||0)>(state.draft._updated_at||0)))){state.draft=local;await Store.saveDraft(local);}
    state.tab=location.hash.slice(1)||'home';if(state.tab==='finish'&&!state.draft)state.tab='home';selectFirstIncomplete();render();
    setupServiceWorker();
    if(state.meta.persist_requested===undefined){let granted=false;try{granted=!!(await navigator.storage?.persist?.());}catch(_){}state.meta.persist_requested=true;state.meta.persist_granted=granted;state.meta.schema_version=2;await Store.saveMeta(state.meta);}
  }catch(e){$('main').replaceChildren(el('p','empty','Veriye ulaşılamıyor. Tarayıcının yerel depolama izinlerini kontrol et.'),btn('Yeniden dene',()=>location.reload(),'primary'));}
}
window.addEventListener('hashchange',()=>{if(!state.busy)enterRoute(location.hash.slice(1)||'home');});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flush('draft').catch(()=>{});flush('program').catch(()=>{});}});
window.addEventListener('pagehide',()=>{flush('draft').catch(()=>{});flush('program').catch(()=>{});});
setInterval(()=>{if(state.tab==='workout'&&current())updateHeader();},30000);
window.addEventListener('unhandledrejection',()=>notice('İşlem tamamlanamadı. Verilerini kontrol edip yeniden dene.'));
function dayName(day){return day.slice(0,1).toLocaleUpperCase('tr')+day.slice(1).toLocaleLowerCase('tr');}

function weekday(s,full=false){const d=new Date(s.date+'T12:00:00');return full?d.toLocaleDateString('tr-TR',{weekday:'long'}):WEEKDAYS[d.getDay()];}

function firstIncomplete(w){return Math.max(0,w?.exercises.findIndex(e=>e.sets.some(s=>!s._done))??0);}

function nextIncomplete(w,after){const n=w.exercises.findIndex((e,i)=>i>after&&e.sets.some(s=>!s._done));return n>=0?n:firstIncomplete(w);}

function selectFirstIncomplete(){if(current())state.activeExercise=firstIncomplete(current());}

function enterRoute(route){
  if(!['home','workout','finish','summary','progress','history','program'].includes(route))route='home';
  const previous=state.tab,changedRoute=state.renderedRoute!==route;
  if(route!=='workout')state.edit=null;
  if(route==='workout'&&changedRoute){if(previous==='finish'&&state.draft){state.draft.finished_at=null;changed();}selectFirstIncomplete();}
  state.tab=route;render();
  if(changedRoute){const main=$('main');main.scrollTop=0;main.classList.remove('route-enter');void main.offsetWidth;main.classList.add('route-enter');}
  state.renderedRoute=route;
}

function tonValue(value){const n=el('span','ton-value',ton(value).replace(' t',''));n.append(el('span','unit',' t'));return n;}

function datePicker(value,onChange,id){
  const input=el('input','native-date');input.id=id;input.type='date';input.value=value;input.tabIndex=-1;input.setAttribute('aria-label','Antrenman tarihi');input.onchange=()=>onChange(input.value);
  const open=()=>{try{if(input.showPicker)input.showPicker();else{input.focus();input.click();}}catch(_){input.focus();input.click();}};
  return {input,open};
}

function summaryPeriod(){const end=today(),cut=new Date(end+'T00:00:00');cut.setDate(cut.getDate()-27);const start=`${cut.getFullYear()}-${String(cut.getMonth()+1).padStart(2,'0')}-${String(cut.getDate()).padStart(2,'0')}`;return {start,end,sessions:sorted().filter(s=>s.date>=start&&s.date<=end)};}

function recentRow(s,parent){const b=btn('',()=>detail(s),'recent-row row'),t=el('div','grow'),rs=records(s);t.append(el('strong','',dayName(s.day)),el('small','block',date(s,true)+' · '+counts(s)+' set · '+ton(volume(s))));b.append(badge(s.day),t,el('span',rs.length?'gold-text':'secondary-text',rs.length?rs.length+' rekor':s.exercises.length+' hareket'));parent.append(b);}

function exerciseDays(name){return [...new Set([...state.program.order.filter(d=>state.program.days[d].some(e=>e.name===name)),...state.sessions.filter(s=>s.exercises.some(e=>e.name===name)).map(s=>s.day)])];}

function editOrder(){const p=state.program;sheet('Gün sırası',(panel,done)=>{const draw=()=>{panel.querySelector('.order-list')?.remove();const list=el('div','order-list');p.order.forEach((d,i)=>{const r=el('div','row rule');r.append(badge(d),el('strong','grow',dayName(d)));for(const [dir,ic]of [[-1,'up'],[1,'down']]){const b=ib(ic,dayName(d)+(dir<0?' yukarı':' aşağı'),()=>{[p.order[i],p.order[i+dir]]=[p.order[i+dir],p.order[i]];programChanged();draw();});b.disabled=i+dir<0||i+dir>=p.order.length;r.append(b);}list.append(r);});panel.append(list);};draw();panel.append(btn('Tamam',()=>{done();render();},'primary wide'));});}

boot();
