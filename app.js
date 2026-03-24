var GAS_URL = "https://script.google.com/macros/s/AKfycbx1e8kPvxZfNCHCVrHmDoFJT7kS47J-7iJKOnXsv_yxhaoG3DvRaopjATkkaie-lA/exec";

// ── STATE ─────────────────────────────────────────────────────────
var emp="", allItems=[], lf="all", cardRegistry=[];
var camStream=null, camAnimFrame=null, camRunning=false, camDevices=[];
var firstCamDeviceId=null; // FIX: speichert DeviceId von Kamera 0
var scanMode="einlagern"; // "einlagern" | "verkauf" | "einkauf"
var curCat="", curType="";
var stepCur=1, stepTotal=5;
var probChoice=null, probType=null;
var photos=[];
var editingItem=null, isEditMode=false;
var testRowNum=-1, timerInterval=null;
var SNAMES={konsole:["Barcode","Name","Details","Mängel","Mitarbeiter"],spiel:["Barcode","Titel","Details","Mängel","Mitarbeiter"],handy:["Barcode","Modell","Details","Mängel","Mitarbeiter"],pc:["Barcode","Modell","Details","Mängel","Mitarbeiter"]};

// ================================================================
// API CALLS
// GET  → kleine Requests ohne Fotos (login, stats, laden, löschen)
// POST → save/update mit Fotos (Base64 zu groß für URL)
// ================================================================
function gasGet(action, data, onSuccess, onError) {
  var params = Object.assign({action: action}, data || {});
  var urlParams = [];
  for (var k in params) {
    var v = params[k];
    if (v !== null && v !== undefined && typeof v === "object") v = JSON.stringify(v);
    urlParams.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v == null ? "" : v)));
  }
  fetch(GAS_URL + "?" + urlParams.join("&"), {method:"GET"})
    .then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
    .then(function(result){if(onSuccess)onSuccess(result);})
    .catch(function(e){if(onError)onError(String(e));else toast("Fehler: "+e,"err");});
}

function gasPost(action, data, onSuccess, onError) {
  var payload = Object.assign({action: action}, data || {});
  fetch(GAS_URL, {
    method: "POST",
    headers: {"Content-Type": "text/plain"},
    body: JSON.stringify(payload)
  })
  .then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
  .then(function(result){if(onSuccess)onSuccess(result);})
  .catch(function(e){if(onError)onError(String(e));else toast("Fehler: "+e,"err");});
}

// Automatisch POST wenn Fotos enthalten, sonst GET
function gasCall(action, data, onSuccess, onError) {
  var hasFotos = data && Array.isArray(data.fotos) && data.fotos.length > 0;
  if (hasFotos) {
    gasPost(action, data, onSuccess, onError);
  } else {
    gasGet(action, data, onSuccess, onError);
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────
function initEmp(){
  // Check for activation token in URL
  var params=new URLSearchParams(window.location.search);
  var activate=params.get("activate");
  if(activate){showActivationFlow(activate);return;}
  var s=document.getElementById("emp-scr");if(s)s.classList.remove("hidden");
  setTimeout(function(){var i=document.getElementById("emp-in");if(i)i.focus();},200);
}
function togglePwVis(){var i=document.getElementById("pw-in"),e=document.getElementById("pw-eye");if(!i||!e)return;var h=i.type==="password";i.type=h?"text":"password";e.innerHTML=h?'<i class="bi bi-eye-slash"></i>':'<i class="bi bi-eye"></i>';}
function showLoginErr(msg){var e=document.getElementById("pw-err"),m=document.getElementById("pw-err-msg");if(m)m.textContent=msg;if(e)e.style.display="block";}
var empRolle="mitarbeiter";
function applyEmp(n,rolle){emp=n.trim();empRolle=rolle||"mitarbeiter";var b=document.getElementById("emp-name");if(b)b.textContent=emp;var s=document.getElementById("emp-scr");if(s)s.classList.add("hidden");try{setGreeting();}catch(e){}try{fillMA();}catch(e){}
// Show owner-only UI
var ownerEls=document.querySelectorAll(".owner-only");ownerEls.forEach(function(el){el.style.display=empRolle==="owner"?"block":"none";});
var ownerInline=document.querySelectorAll(".owner-only-inline");ownerInline.forEach(function(el){el.style.display=empRolle==="owner"?"inline-flex":"none";});
  saveSession(n, rolle||"mitarbeiter");
}
function changeEmp(){emp="";var i=document.getElementById("emp-in"),p=document.getElementById("pw-in");if(i)i.value="";if(p)p.value="";var e=document.getElementById("pw-err");if(e)e.style.display="none";var s=document.getElementById("emp-scr");if(s)s.classList.remove("hidden");setTimeout(function(){var x=document.getElementById("emp-in");if(x)x.focus();},150);
  clearSession();
}
function fillMA(){var e=document.getElementById("f-ma");if(e)e.value=emp;}
(function(){
  var b=document.getElementById("btn-emp"),i=document.getElementById("emp-in"),p=document.getElementById("pw-in");
  if(b)b.addEventListener("click",doLogin);
  if(i)i.addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("pw-in").focus();});
  if(p)p.addEventListener("keydown",function(e){if(e.key==="Enter")doLogin();});
})();

// ── GREETING ─────────────────────────────────────────────────────
function setGreeting(){var h=new Date().getHours(),g,emoji;if(h>=5&&h<10){g="GUTEN MORGEN";emoji="☀️";}else if(h>=10&&h<12){g="GUTEN VORMITTAG";emoji="🌤️";}else if(h>=12&&h<14){g="GUTEN MITTAG";emoji="🌞";}else if(h>=14&&h<18){g="GUTEN NACHMITTAG";emoji="⛅";}else if(h>=18&&h<22){g="GUTEN ABEND";emoji="🌆";}else{g="GUTE NACHT";emoji="🌙";}document.getElementById("g-time").textContent=g+" "+emoji;document.getElementById("g-name").textContent=emp;updateMyStats();}
function updateMyStats(){if(!emp)return;var today=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});var total=0,todayCount=0,defekte=0;allItems.forEach(function(item){if((item.mitarbeiter||"").toLowerCase()===emp.toLowerCase()){total++;if(item.datum&&item.datum.startsWith(today.split(".")[0]+"."+today.split(".")[1]))todayCount++;}if(item.type==="defekt"&&(item.mitarbeiter||"").toLowerCase()===emp.toLowerCase())defekte++;});var t=document.getElementById("my-total");if(t)t.textContent=total;var td=document.getElementById("my-today");if(td)td.textContent=todayCount;var df=document.getElementById("my-defekte");if(df)df.textContent=defekte;var nf=document.getElementById("my-notifs");if(nf)nf.textContent=notifications.length;}

// ── TABS ─────────────────────────────────────────────────────────
document.querySelectorAll(".bnav-btn").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".bnav-btn").forEach(function(x){x.classList.remove("on");});document.querySelectorAll(".panel").forEach(function(x){x.classList.remove("on");});b.classList.add("on");var p=document.getElementById(b.dataset.tab);if(p)p.classList.add("on");if(b.dataset.tab==="home-panel"){setGreeting();loadStats();}if(b.dataset.tab==="list-panel"&&allItems.length===0)loadAll();if(b.dataset.tab==="search-panel"){initSearch();if(allItems.length===0){loadAll();setTimeout(function(){if(allItems.length>0)renderSearchResults(allItems);},2500);}else{renderSearchResults(allItems);}}if(b.dataset.tab==="handel-panel"){loadHandel();}if(b.dataset.tab==="analyse-panel"){renderAnalysePanel();}});});
function goTabFn(id,lfMode){document.querySelectorAll(".bnav-btn").forEach(function(b){b.classList.toggle("on",b.dataset.tab===id);});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id===id);});if(lfMode){lf=lfMode;renderList();}if(id==="list-panel"&&allItems.length===0)loadAll();if(id==="home-panel"){setGreeting();loadStats();}}

// ── STATS ─────────────────────────────────────────────────────────
function loadStats(){gasGet("getStats",{},function(r){if(!r||!r.ok)return;var s=r.stats||{};document.getElementById("st-sw").textContent=(s.konsolen||0)+(s.spiele||0);document.getElementById("st-h").textContent=s.handys||0;document.getElementById("st-pc").textContent=s.pcs||0;document.getElementById("st-def").textContent=s.defekte||0;document.getElementById("st-heu").textContent=s.heute||0;var ve=document.getElementById("st-vk");if(ve)ve.textContent=s.verkauf||0;var ee=document.getElementById("st-ek");if(ee)ee.textContent=s.einkauf||0;},function(){});}

// ── KATEGORIE ─────────────────────────────────────────────────────
function selCat(cat){curCat=cat;isEditMode=false;editingItem=null;document.getElementById("mode-chooser").style.display="none";document.getElementById("cat-chooser").style.display="none";document.getElementById("sw-sub").style.display="none";document.getElementById("main-stepper").style.display="none";if(cat==="spielwaren"){document.getElementById("sw-sub").style.display="block";}else{startStepper(cat);}}
function resetFlow(){stopCam();document.getElementById("mode-chooser").style.display="block";document.getElementById("cat-chooser").style.display="none";document.getElementById("sw-sub").style.display="none";document.getElementById("main-stepper").style.display="none";isEditMode=false;editingItem=null;resetStepperState();}

// ── STEPPER ───────────────────────────────────────────────────────
function startStepper(type, prefillItem){
  curType=type;isEditMode=!!prefillItem;editingItem=prefillItem||null;
  stepCur=(type==="spiel"||type==="handy")?2:1;
  resetStepperState();
  document.getElementById("main-stepper").style.display="block";
  configS2(type);configS3(type);buildDots();updateProgress();showStep(stepCur);fillMA();
  if(prefillItem){prefillStepper(prefillItem,type);}
}

function prefillStepper(item,type){
  var si=document.getElementById("f-scanid");if(si)si.value=item.scanId||"";
  var nm=document.getElementById("f-name");if(nm)nm.value=item.name||item.spiel||item.modell||"";
  var ma=document.getElementById("f-ma");if(ma)ma.value=item.mitarbeiter||emp;
  var ep=document.getElementById("f-einkaufspreis");if(ep)ep.value=item.einkaufspreis||"";
  var wt=document.getElementById("f-warentyp");if(wt&&item.warentyp)wt.value=item.warentyp;
  setTimeout(function(){
    if(type==="konsole"){sv("f-gb",item.speicherGB);sv("f-farbe",item.farbe);}
    else if(type==="spiel"){sv("f-sys",item.system);sv("f-zustand",item.zustand);sv("f-usk",item.usk);sv("f-sprache",item.sprache);sv("f-hinweise",item.hinweise);}
    else if(type==="handy"){sv("f-gb",item.speicherGB);sv("f-ram",item.ram);sv("f-farbe",item.farbe);sv("f-netz",item.netzwerk);sv("f-imei",item.imei);sv("f-zustand",item.zustand);}
    else if(type==="pc"){if(item.typ_){selPCTyp(item.typ_);}setTimeout(function(){sv("f-cpu",item.prozessor);sv("f-ram",item.ram);sv("f-gb",item.speicherGB);sv("f-stype",item.speicherTyp);sv("f-gpu",item.grafikkarte);sv("f-mb",item.mainboard);sv("f-psu",item.netzteil);sv("f-os",item.betriebssystem);sv("f-zustand",item.zustand);},60);}
    if(item.problemTyp&&item.problemTyp!==""){
      selProb("ja");
      setTimeout(function(){
        if(item.problemTyp==="physisch"||item.problemTyp==="software"){selProbType(item.problemTyp);}
        else{document.getElementById("prob-descr-row").style.display="block";}
        sv("f-prob-beschr",item.problemBeschr);
        if(item.fotos&&item.fotos.length>0){photos=item.fotos.map(function(b64){return{b64:b64,name:"foto.jpg"};});renderAllPhotos();document.getElementById("photo-row").style.display="block";}
      },60);
    } else {selProb("nein");}
  },120);
}
function sv(id,val){var el=document.getElementById(id);if(!el||val===undefined||val===null)return;el.value=String(val);}

function configS2(t){var tt={konsole:"Name der Konsole",spiel:"Spieltitel",handy:"Gerätemodell",pc:"Modell"};var ss={konsole:"z.B. PlayStation 5 Slim",spiel:"z.B. Zelda: Tears of the Kingdom",handy:"z.B. Samsung Galaxy S24",pc:"z.B. Dell XPS 15"};document.getElementById("s2-title").textContent=tt[t]||"Name";document.getElementById("s2-lbl").textContent=(tt[t]||"Name")+" *";document.getElementById("f-name").placeholder=ss[t]||"";document.getElementById("s2-sub").textContent="Vollständige Bezeichnung eingeben.";document.getElementById("s2-extra").innerHTML="";}
function configS3(t){
  var h="";
  if(t==="konsole"){document.getElementById("s3-title").textContent="Speicher & Farbe";h='<div class="row g-2 mb-3"><div class="col-6"><label class="fl">Speicher (GB)</label><input type="number" id="f-gb" class="fc" placeholder="z.B. 825"/></div><div class="col-6"><label class="fl">Farbe</label><input type="text" id="f-farbe" class="fc" placeholder="z.B. Weiß"/></div></div>';}
  else if(t==="spiel"){document.getElementById("s3-title").textContent="Spiel-Details";h='<div class="mb-3"><label class="fl">System / Plattform</label>'+selHTML("f-sys",["PlayStation 5","PlayStation 4","PlayStation 3","Xbox Series X/S","Xbox One","Xbox 360","Nintendo Switch","Nintendo 3DS","Nintendo Wii","Nintendo Wii U","Game Boy Advance","Nintendo DS","PC","Sonstiges"])+'</div><div class="row g-2 mb-3"><div class="col-4"><label class="fl">USK</label>'+selHTML("f-usk",["","USK 0","USK 6","USK 12","USK 16","USK 18"])+'</div><div class="col-4"><label class="fl">Sprache</label>'+selHTML("f-sprache",["Deutsch","Englisch","Multilingual","Sonstiges"])+'</div><div class="col-4"><label class="fl" style="display:flex;align-items:center;gap:4px">Zustand <button type="button" onclick="showZustandInfo()" style="width:17px;height:17px;background:var(--blue);border:none;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;cursor:pointer;flex-shrink:0;padding:0">i</button></label>'+selHTML("f-zustand",["Neuwertig","Sehr gut","Gut","Akzeptabel","Defekt"])+'</div></div><div class="mb-3"><label class="fl">Hinweise</label><textarea id="f-hinweise" class="fc" placeholder="z.B. Cover fehlt…"></textarea></div>';}
  else if(t==="handy"){document.getElementById("s3-title").textContent="Technische Daten";h='<div class="row g-2 mb-3"><div class="col-6"><label class="fl">Speicher (GB)</label><input type="number" id="f-gb" class="fc" placeholder="z.B. 256"/></div><div class="col-6"><label class="fl">RAM (GB)</label><input type="number" id="f-ram" class="fc" placeholder="z.B. 8"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Farbe</label><input type="text" id="f-farbe" class="fc" placeholder="z.B. Midnight Black"/></div><div class="col-6"><label class="fl">Netzwerk</label>'+selHTML("f-netz",["","4G/LTE","5G","Dual-SIM 5G","Sonstiges"])+'</div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Zustand</label>'+selHTML("f-zustand",["Neuwertig","Sehr gut","Gut","Akzeptabel","Defekt"])+'</div><div class="col-6"><label class="fl">IMEI (optional)</label><input type="text" id="f-imei" class="fc" placeholder="15-stellig"/></div></div>';}
  else if(t==="pc"){document.getElementById("s3-title").textContent="Hardware-Spezifikationen";h='<div class="mb-3"><label class="fl">Typ – Bitte zuerst wählen</label><div class="cg2"><button class="cbtn" id="pc-l" onclick="selPCTyp(\'Laptop\')"><span class="ci">💻</span>Laptop</button><button class="cbtn" id="pc-d" onclick="selPCTyp(\'Desktop\')"><span class="ci">🖥️</span>Desktop</button></div><input type="hidden" id="f-pc-typ" value=""/></div><div id="pc-fields-wrap" style="display:none"></div>';}
  document.getElementById("s3-fields").innerHTML=h;
}
function selHTML(id,opts){return'<select id="'+id+'" class="fc"><option value="">– Auswählen –</option>'+opts.map(function(o){return o?'<option>'+o+'</option>':'';}).join("")+'</select>';}
function selPCTyp(v){
  document.getElementById("f-pc-typ").value=v;
  document.getElementById("pc-l").className="cbtn"+(v==="Laptop"?" sel":"");
  document.getElementById("pc-d").className="cbtn"+(v==="Desktop"?" sel":"");
  var wrap=document.getElementById("pc-fields-wrap");if(!wrap)return;wrap.style.display="block";
  var lf='<div class="row g-2 mb-3"><div class="col-6"><label class="fl">Marke / Modell *</label><input type="text" id="f-brand" class="fc" placeholder="z.B. Dell XPS 15"/></div><div class="col-6"><label class="fl">Bildschirmgröße</label><input type="text" id="f-screen" class="fc" placeholder="z.B. 15,6 Zoll"/></div></div><div class="mb-3"><label class="fl">Prozessor</label><input type="text" id="f-cpu" class="fc" placeholder="z.B. Intel Core i7-13700H"/></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">RAM (GB)</label><input type="number" id="f-ram" class="fc" placeholder="z.B. 16"/></div><div class="col-6"><label class="fl">Speicher (GB)</label><input type="number" id="f-gb" class="fc" placeholder="z.B. 512"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Grafikkarte</label><input type="text" id="f-gpu" class="fc" placeholder="z.B. RTX 4060"/></div><div class="col-6"><label class="fl">Akku-Zustand</label>'+selHTML("f-battery",["Sehr gut","Gut","Ok","Schwach","Defekt"])+'</div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Betriebssystem</label>'+selHTML("f-os",["Windows 11","Windows 10","macOS","Linux","Ohne OS"])+'</div><div class="col-6"><label class="fl">Zustand</label>'+selHTML("f-zustand",["Neuwertig","Wie neu","Sehr gut","Gut","Gebraucht","Defekt"])+'</div></div>';
  var df='<div class="mb-3"><label class="fl">Prozessor *</label><input type="text" id="f-cpu" class="fc" placeholder="z.B. Intel Core i7-13700K"/></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">RAM (GB)</label><input type="number" id="f-ram" class="fc" placeholder="z.B. 32"/></div><div class="col-6"><label class="fl">Speicher (GB)</label><input type="number" id="f-gb" class="fc" placeholder="z.B. 1000"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Speichertyp</label>'+selHTML("f-stype",["SSD","HDD","SSD+HDD","NVMe SSD"])+'</div><div class="col-6"><label class="fl">Grafikkarte</label><input type="text" id="f-gpu" class="fc" placeholder="z.B. RTX 4070"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Mainboard</label><input type="text" id="f-mb" class="fc" placeholder="z.B. ASUS ROG Z790"/></div><div class="col-6"><label class="fl">Netzteil (W)</label><input type="number" id="f-psu" class="fc" placeholder="z.B. 650"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Betriebssystem</label>'+selHTML("f-os",["Windows 11","Windows 10","Linux","Ohne OS"])+'</div><div class="col-6"><label class="fl">Anschlüsse</label><input type="text" id="f-ports" class="fc" placeholder="z.B. USB 3.2, HDMI, DP"/></div></div><div class="mb-3"><label class="fl">Zustand</label>'+selHTML("f-zustand",["Neuwertig","Wie neu","Sehr gut","Gut","Gebraucht","Defekt"])+'</div>';
  wrap.innerHTML=(v==="Desktop"?df:lf);
}
function buildDots(){var c=document.getElementById("step-dots");c.innerHTML="";for(var i=1;i<=stepTotal;i++){var d=document.createElement("div");d.className="sdot"+(i===1?" act":"");d.id="sd"+i;c.appendChild(d);}}
function updateProgress(){
  var pct=Math.round((stepCur/stepTotal)*100);
  document.getElementById("prog-bar").style.width=pct+"%";
  document.getElementById("prog-label").textContent=(isEditMode?"✏️ ":"")+"Schritt "+stepCur+" von "+stepTotal;
  var nn=SNAMES[curType]||[];document.getElementById("prog-name").textContent=nn[stepCur-1]||"";
  for(var i=1;i<=stepTotal;i++){var d=document.getElementById("sd"+i);if(d)d.className="sdot"+(i<stepCur?" done":i===stepCur?" act":"");}
  document.getElementById("btn-back").disabled=false;
  var last=(stepCur===stepTotal);
  document.getElementById("btn-next").style.display=last?"none":"inline-flex";
  var sb=document.getElementById("btn-save-step");sb.style.display=last?"inline-flex":"none";
  sb.innerHTML=isEditMode?'<i class="bi bi-pencil-fill me-1"></i>Aktualisieren':'<i class="bi bi-cloud-upload-fill me-1"></i>Speichern';
}
function showStep(n){for(var i=1;i<=stepTotal;i++){var el=document.getElementById("st-s"+i);if(el){el.classList.remove("on");if(i===n)el.classList.add("on");}}}
function stepNext(){
  if(stepCur===1){if(!document.getElementById("f-scanid").value.trim()){showD("s1-diag","Barcode eingeben oder scannen.","derr");return;}hideD("s1-diag");
    // Pre-fill name from EK check context
    if(window._ekCheckPreFillName){setTimeout(function(){var nEl=document.getElementById("f-name");if(nEl&&!nEl.value)nEl.value=window._ekCheckPreFillName;window._ekCheckPreFillName=null;},50);}
  }
  if(stepCur===2&&!document.getElementById("f-name").value.trim()){toast("Name eingeben.","err");return;}
  if(stepCur===4){if(!probChoice){toast("Mängel auswählen.","err");return;}if(probChoice==="ja"&&!probType){toast("Mangeltyp auswählen.","err");return;}if(probType==="physisch"&&photos.length===0){toast("Mindestens 1 Foto erforderlich.","err");return;}}
  if(stepCur<stepTotal){stepCur++;updateProgress();showStep(stepCur);window.scrollTo({top:0,behavior:"smooth"});
    if(stepCur===5){updatePriceSuggest();}
  }
}
function stepBack(){
  if(stepCur>1){stepCur--;updateProgress();showStep(stepCur);window.scrollTo({top:0,behavior:"smooth"});}
  else{stopCam();document.getElementById("main-stepper").style.display="none";if(isEditMode){isEditMode=false;editingItem=null;goTabFn("list-panel");}else if(curCat==="spielwaren"){document.getElementById("sw-sub").style.display="block";}else{document.getElementById("cat-chooser").style.display="block";}resetStepperState();}
}

// ── MÄNGEL ───────────────────────────────────────────────────────
function selProb(v){probChoice=v;document.getElementById("pb-nein").className="cbtn"+(v==="nein"?" sel-g":"");document.getElementById("pb-ja").className="cbtn"+(v==="ja"?" sel-r":"");document.getElementById("prob-type-row").style.display=v==="ja"?"block":"none";if(v==="nein"){document.getElementById("prob-descr-row").style.display="none";document.getElementById("photo-row").style.display="none";probType=null;photos=[];renderAllPhotos();}}
function selProbType(v){probType=v;document.getElementById("pb-phys").className="cbtn"+(v==="physisch"?" sel-r":"");document.getElementById("pb-soft").className="cbtn"+(v==="software"?" sel":"");document.getElementById("prob-descr-row").style.display="block";document.getElementById("photo-row").style.display=v==="physisch"?"block":"none";if(v==="physisch"){showPhotoGuide(curType);}}

// ================================================================
// KAMERA FIX: Kamera 0 immer direkt verwenden
// ================================================================
function camStart(){
  var startBtn=document.getElementById("btn-cam-start"),stopBtn=document.getElementById("btn-cam-stop");
  startBtn.disabled=true;startBtn.innerHTML='<span class="spin"></span>&nbsp;Starte…';
  document.getElementById("scan-err").style.display="none";

  // Check cam-preselect first (visible dropdown)
  var preselEl=document.getElementById("cam-preselect");
  if(preselEl&&preselEl.value&&!firstCamDeviceId){firstCamDeviceId=preselEl.value;}
  // FIX: Wenn wir schon die DeviceId von Kamera 0 kennen, direkt verwenden
  // Sonst erst Geräteliste holen, Kamera 0 auswählen, dann starten
  if(firstCamDeviceId){
    _startCamWithDevice(firstCamDeviceId);
  } else {
    navigator.mediaDevices.enumerateDevices()
      .then(function(devices){
        var videoDevices=devices.filter(function(d){return d.kind==="videoinput";});
        if(videoDevices.length>0){
          // Kamera 0 = erste Kamera (auf dem Handy ist das die Rückkamera)
          // Falls Label verfügbar: bevorzuge "back" / "environment"
          var chosen=videoDevices[0];
          for(var i=0;i<videoDevices.length;i++){
            if(/back|rear|environment|rück/i.test(videoDevices[i].label)){chosen=videoDevices[i];break;}
          }
          firstCamDeviceId=chosen.deviceId||null;
          camDevices=videoDevices;
          _fillCamSelect(videoDevices, chosen.deviceId);
          _startCamWithDevice(chosen.deviceId||null);
        } else {
          _startCamWithDevice(null);
        }
      })
      .catch(function(){
        // enumerateDevices fehlgeschlagen → direkt mit environment starten
        _startCamWithDevice(null);
      });
  }
}

function _startCamWithDevice(deviceId){
  var constraints;
  if(deviceId){
    constraints={video:{deviceId:{exact:deviceId},width:{ideal:1280},height:{ideal:720}}};
  } else {
    constraints={video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}};
  }
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){
      camStream=stream;camRunning=true;
      var video=document.getElementById("cam-video");video.srcObject=stream;
      document.getElementById("cam-wrap").style.display="block";
      var startBtn=document.getElementById("btn-cam-start"),stopBtn=document.getElementById("btn-cam-stop");
      startBtn.style.display="none";stopBtn.style.display="inline-flex";

      // Nach getUserMedia: jetzt Labels verfügbar → Dropdown aktualisieren
      if(camDevices.length===0){
        navigator.mediaDevices.enumerateDevices().then(function(devices){
          camDevices=devices.filter(function(d){return d.kind==="videoinput";});
          if(camDevices.length>0&&!firstCamDeviceId){
            var chosen=camDevices[0];
            for(var i=0;i<camDevices.length;i++){if(/back|rear|environment|rück/i.test(camDevices[i].label)){chosen=camDevices[i];break;}}
            firstCamDeviceId=chosen.deviceId||null;
          }
          _fillCamSelect(camDevices, deviceId);
        }).catch(function(){});
      }

      video.onloadedmetadata=function(){video.play().then(function(){camScanLoop();}).catch(function(){camScanLoop();});};
    })
    .catch(function(err){
      var startBtn=document.getElementById("btn-cam-start");
      startBtn.disabled=false;startBtn.innerHTML='<i class="bi bi-camera-video-fill me-1"></i>Kamera starten';
      var msg=String(err),text;
      if(/NotAllowed|Permission|denied/i.test(msg))text="Kamerazugriff verweigert. Chrome → Adressleiste → 🔒 → Kamera → Zulassen → Seite neu laden.";
      else if(/NotFound|DevicesNotFound|NotReadableError/i.test(msg))text="Keine Kamera gefunden oder bereits in Benutzung.";
      else text="Kamera-Fehler: "+msg;
      var errEl=document.getElementById("scan-err"),msgEl=document.getElementById("scan-err-msg");
      if(errEl&&msgEl){msgEl.textContent=text;errEl.style.display="block";}
    });
}

function _fillCamSelect(devices, selectedDeviceId){
  if(devices.length<=1)return;
  var sel=document.getElementById("cam-select");
  sel.innerHTML="";
  devices.forEach(function(d,i){
    var opt=document.createElement("option");opt.value=d.deviceId;
    var lbl=d.label||("Kamera "+(i+1));
    var back=/back|rear|environment|rück/i.test(lbl);
    opt.textContent=(back?"🔙 ":"🤳 ")+lbl;
    if(d.deviceId===selectedDeviceId)opt.selected=true;
    sel.appendChild(opt);
  });
  document.getElementById("cam-select-row").style.display="block";
}

var zxingReader=null,scanLastCode="",scanConfirmCnt=0,SCAN_CONFIRM_NEEDED=3;
function getZxingReader(){if(!zxingReader){try{var hints=new Map();hints.set(ZXingBrowser.DecodeHintType.POSSIBLE_FORMATS,[ZXingBrowser.BarcodeFormat.EAN_13,ZXingBrowser.BarcodeFormat.EAN_8,ZXingBrowser.BarcodeFormat.UPC_A,ZXingBrowser.BarcodeFormat.UPC_E,ZXingBrowser.BarcodeFormat.CODE_128,ZXingBrowser.BarcodeFormat.CODE_39,ZXingBrowser.BarcodeFormat.CODE_93,ZXingBrowser.BarcodeFormat.CODABAR,ZXingBrowser.BarcodeFormat.ITF,ZXingBrowser.BarcodeFormat.QR_CODE,ZXingBrowser.BarcodeFormat.DATA_MATRIX,ZXingBrowser.BarcodeFormat.AZTEC,ZXingBrowser.BarcodeFormat.PDF_417]);hints.set(ZXingBrowser.DecodeHintType.TRY_HARDER,true);zxingReader=new ZXingBrowser.BrowserMultiFormatReader(hints);}catch(e){zxingReader=null;}}return zxingReader;}
function camScanLoop(){if(!camRunning)return;var video=document.getElementById("cam-video"),canvas=document.getElementById("cam-canvas");if(!video||!canvas||video.readyState<2){camAnimFrame=requestAnimationFrame(camScanLoop);return;}canvas.width=video.videoWidth;canvas.height=video.videoHeight;var ctx=canvas.getContext("2d");ctx.drawImage(video,0,0,canvas.width,canvas.height);var detectedCode=null,reader=getZxingReader();if(reader){try{var res=reader.decodeFromCanvas(canvas);if(res&&res.getText())detectedCode=res.getText().trim();}catch(e){}}if(!detectedCode&&typeof BarcodeDetector!=="undefined"){var det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code","data_matrix","pdf417","aztec","codabar"]});det.detect(canvas).then(function(codes){if(codes&&codes.length>0)processDetectedCode(codes[0].rawValue.trim());if(camRunning)camAnimFrame=requestAnimationFrame(camScanLoop);}).catch(function(){if(camRunning)camAnimFrame=requestAnimationFrame(camScanLoop);});return;}if(detectedCode){processDetectedCode(detectedCode);}else{if(scanConfirmCnt>0){scanConfirmCnt=0;scanLastCode="";updateScanStatus("");}}if(camRunning)camAnimFrame=requestAnimationFrame(camScanLoop);}
function processDetectedCode(code){if(code===scanLastCode){scanConfirmCnt++;var dots="";for(var i=0;i<scanConfirmCnt;i++)dots+="●";for(var j=scanConfirmCnt;j<SCAN_CONFIRM_NEEDED;j++)dots+="○";updateScanStatus("Prüfe: "+dots+"  "+code.substring(0,20));}else{scanLastCode=code;scanConfirmCnt=1;updateScanStatus("Erkenne: "+code.substring(0,20));}if(scanConfirmCnt>=SCAN_CONFIRM_NEEDED){scanLastCode="";scanConfirmCnt=0;camStop();camOnCode(code);}}
function updateScanStatus(msg){var hint=document.getElementById("cam-hint");if(!hint)return;if(!msg){hint.textContent="Halte Barcode in den Rahmen";hint.style.background="rgba(0,0,0,.7)";}else{hint.textContent=msg;hint.style.background="rgba(88,166,255,.8)";}}
function camStop(){camRunning=false;scanLastCode="";scanConfirmCnt=0;if(camAnimFrame){cancelAnimationFrame(camAnimFrame);camAnimFrame=null;}if(camStream){camStream.getTracks().forEach(function(t){t.stop();});camStream=null;}var video=document.getElementById("cam-video");if(video)video.srcObject=null;document.getElementById("cam-wrap").style.display="none";document.getElementById("cam-select-row").style.display="none";var sb=document.getElementById("btn-cam-start"),st=document.getElementById("btn-cam-stop");if(sb){sb.style.display="inline-flex";sb.disabled=false;sb.innerHTML='<i class="bi bi-camera-video-fill me-1"></i>Kamera starten';}if(st)st.style.display="none";}
function camSwitchDevice(){
  var sel=document.getElementById("cam-select");
  firstCamDeviceId=sel&&sel.value?sel.value:null;
  camStop();setTimeout(function(){_startCamWithDevice(firstCamDeviceId);},300);
}
function camOnCode(code){code=(code||"").trim();var inp=document.getElementById("f-scanid");if(inp)inp.value=code;var okEl=document.getElementById("scan-ok"),valEl=document.getElementById("scan-ok-val");if(okEl&&valEl){valEl.textContent=code;okEl.style.display="block";}try{if(navigator.vibrate)navigator.vibrate([80]);}catch(e){}toast("✓ Barcode: "+code,"ok",3000);}
function stopCam(){camStop();}

// ── FOTOS ─────────────────────────────────────────────────────────
function triggerPhotoInput(mode){var id=mode==="cam"?"f-photo-cam":"f-photo-gallery";var el=document.getElementById(id);if(!el){toast("Foto-Input nicht gefunden.","err");return;}el.onchange=function(){if(this.files&&this.files[0])processPhotoFile(this.files[0]);this.value="";};el.click();}
function processPhotoFile(file){if(!file)return;if(file.size>15*1024*1024){toast("Max. 15 MB pro Foto.","err");return;}var name=(file.name||"foto.jpg").replace(/[^a-zA-Z0-9._-]/g,"_");var img=new Image(),url=URL.createObjectURL(file);img.onload=function(){URL.revokeObjectURL(url);var MAX=800,w=img.width,h=img.height;if(w>MAX||h>MAX){if(w>h){h=Math.round(h*(MAX/w));w=MAX;}else{w=Math.round(w*(MAX/h));h=MAX;}}var canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;var ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);var b64=canvas.toDataURL("image/jpeg",0.72);if(!b64||b64.indexOf("base64,")===-1){toast("Bild konnte nicht verarbeitet werden.","err");return;}photos.push({b64:b64,name:name});renderAllPhotos();toast("Foto hinzugefügt ✅","ok",2000);};img.onerror=function(){toast("Bild konnte nicht geladen werden.","err");};img.src=url;}
function renderAllPhotos(){var mw=document.getElementById("photo-main-wrap"),thumbs=document.getElementById("photo-thumbs");if(!mw||!thumbs)return;mw.innerHTML="";thumbs.innerHTML="";if(photos.length===0){renderAddThumbBtn();return;}mw.innerHTML='<div class="photo-main-preview"><img src="'+photos[0].b64+'"/><button class="rm-main-photo" onclick="removePhoto(0)">✕ Entfernen</button></div>';for(var i=1;i<photos.length;i++){var div=document.createElement("div");div.className="photo-thumb";div.innerHTML='<img src="'+photos[i].b64+'"/><button class="rm-thumb" onclick="removePhoto('+i+')">✕</button>';thumbs.appendChild(div);}renderAddThumbBtn();}
function renderAddThumbBtn(){var t=document.getElementById("photo-thumbs");if(!t)return;var btn=document.createElement("div");btn.className="add-thumb";btn.innerHTML='<i class="bi bi-plus"></i>';btn.onclick=function(){triggerPhotoInput("gallery");};t.appendChild(btn);}
function removePhoto(idx){photos.splice(idx,1);renderAllPhotos();}

// ── SAVE ──────────────────────────────────────────────────────────
function doSave(){
  var btn=document.getElementById("btn-save-step"),orig=btn.innerHTML;setBL(btn,true);
  var scanId=document.getElementById("f-scanid").value.trim();
  var name=document.getElementById("f-name").value.trim();
  var ma=document.getElementById("f-ma").value||emp;
  var probTyp=probChoice==="nein"?"":probType||"";
  var probD=probChoice==="nein"?"":(gv("f-prob-beschr"));
  var fotoB64arr=photos.map(function(p){return p.b64;});
  var d={scanId:scanId,mitarbeiter:ma,problemTyp:probTyp,problemBeschr:probD,fotos:fotoB64arr,
         einkaufspreis:gv("f-einkaufspreis"),warentyp:gv("f-warentyp")||"Gebrauchtware"};
  var fn="";

  if(curType==="konsole"){d.name=name;d.speicherGB=gv("f-gb");d.farbe=gv("f-farbe");fn=isEditMode?"updateKonsole":"saveKonsole";}
  else if(curType==="spiel"){d.spiel=name;d.system=gv("f-sys");d.zustand=gv("f-zustand");d.usk=gv("f-usk");d.sprache=gv("f-sprache");d.hinweise=gv("f-hinweise");fn=isEditMode?"updateSpiel":"saveSpiel";}
  else if(curType==="handy"){d.modell=name;d.speicherGB=gv("f-gb");d.ram=gv("f-ram");d.farbe=gv("f-farbe");d.netzwerk=gv("f-netz");d.imei=gv("f-imei");d.zustand=gv("f-zustand");fn=isEditMode?"updateHandy":"saveHandy";}
  else if(curType==="pc"){var pcTyp=gv("f-pc-typ");d.modell=(gv("f-brand")||name);d.typ=pcTyp;d.prozessor=gv("f-cpu");d.ram=gv("f-ram");d.speicherGB=gv("f-gb");d.speicherTyp=gv("f-stype");d.grafikkarte=gv("f-gpu");d.mainboard=gv("f-mb");d.netzteil=gv("f-psu");d.anschluesse=gv("f-ports");d.betriebssystem=gv("f-os");d.zustand=gv("f-zustand");if(pcTyp==="Laptop"){d.anschluesse=gv("f-screen")+" | Akku: "+gv("f-battery");}fn=isEditMode?"updatePC":"savePC";}

  if(!fn){setBL(btn,false,orig);toast("Kein Typ ausgewählt.","err");return;}
  if(isEditMode&&editingItem)d.rowIndex=editingItem.rowIndex;

  // POST für alle save/update (Fotos können dabei sein oder auch nicht)
  gasPost(fn,d,
    function(r){setBL(btn,false,orig);if(r&&r.ok){if(window._afterSaveCallback){var _cbSave=window._afterSaveCallback;window._afterSaveCallback=null;_cbSave(r.scanId||gv("f-scanid"));}toast(r.msg,"ok");addNotification(isEditMode?"✏️ Aktualisiert":"✅ Eingelagert",r.msg,"info");allItems=[];loadStats();isEditMode=false;editingItem=null;setTimeout(function(){loadAll();resetFlow();goTabFn("list-panel");},700);}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}},
    function(e){setBL(btn,false,orig);toast("Fehler: "+e,"err");}
  );
}

function resetStepperState(){probChoice=null;probType=null;photos=[];["f-scanid","f-name","f-ma","f-prob-beschr","f-einkaufspreis"].forEach(function(id){var e=document.getElementById(id);if(e)e.value="";});var mw=document.getElementById("photo-main-wrap");if(mw)mw.innerHTML="";var pt=document.getElementById("photo-thumbs");if(pt)pt.innerHTML="";var ptr=document.getElementById("prob-type-row");if(ptr)ptr.style.display="none";var pdr=document.getElementById("prob-descr-row");if(pdr)pdr.style.display="none";var phr=document.getElementById("photo-row");if(phr)phr.style.display="none";var pn=document.getElementById("pb-nein");if(pn)pn.className="cbtn";var pj=document.getElementById("pb-ja");if(pj)pj.className="cbtn";// Fix 1: Barcode-Banner zurücksetzen
var so=document.getElementById("scan-ok");if(so)so.style.display="none";var sv2=document.getElementById("scan-ok-val");if(sv2)sv2.textContent="";// Fix 2: Mängel-Buttons zurücksetzen
var pp=document.getElementById("pb-phys");if(pp)pp.className="cbtn";var ps=document.getElementById("pb-soft");if(ps)ps.className="cbtn";stopCam();}

// ── LAGER ─────────────────────────────────────────────────────────
function loadAll(){document.getElementById("list-body").innerHTML='<div class="empty"><span class="spin-b"></span><p>Lade…</p></div>';allItems=[];var done=0,total=5,kd=[],sd=[],hd=[],pd=[],dd=[];function tryR(){done++;if(done<total)return;allItems=kd.concat(sd,hd,pd,dd);renderList();checkLongStorageItems();buildWeekChart();buildKAProgress();updateMyStats();}gasGet("getAllKonsolen",{},function(r){if(r&&r.ok)kd=r.data||[];tryR();},function(){tryR();});gasGet("getAllSpiele",{},function(r){if(r&&r.ok)sd=r.data||[];tryR();},function(){tryR();});gasGet("getAllHandys",{},function(r){if(r&&r.ok)hd=r.data||[];tryR();},function(){tryR();});gasGet("getAllPCs",{},function(r){if(r&&r.ok)pd=r.data||[];tryR();},function(){tryR();});gasGet("getAllDefekte",{},function(r){if(r&&r.ok)dd=r.data||[];tryR();},function(){tryR();});}
function renderList(){cardRegistry=[];var q=document.getElementById("list-q").value.toLowerCase();var f=allItems.filter(function(i){var tm=true;if(lf==="spielwaren")tm=(i.type==="konsole"||i.type==="spiel");else if(lf==="handy")tm=(i.type==="handy");else if(lf==="pc")tm=(i.type==="pc");else if(lf==="defekt")tm=(i.type==="defekt");if(!tm)return false;if(!q)return true;var n=i.name||i.spiel||i.modell||i.geraet||"";return n.toLowerCase().includes(q)||String(i.scanId||"").toLowerCase().includes(q)||(i.mitarbeiter||"").toLowerCase().includes(q);});document.getElementById("list-count").textContent=f.length+" Einträge";var cntEl=document.getElementById("lager-cat-count");if(cntEl)cntEl.textContent="("+f.length+" Artikel)";if(!f.length){document.getElementById("list-body").innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Nichts gefunden.</p></div>';return;}document.getElementById("list-body").innerHTML=f.map(function(i){return mkCard(i);}).join("");}
var lfArr=["all","spielwaren","handy","pc","defekt"],lfLabels={"all":"Gesamtes Lager","spielwaren":"🎮 Spielwaren","handy":"📱 Handys","pc":"💻 PCs & Laptops","defekt":"⚠️ Defekte Geräte"};
function setLF(m){lf=m;var tabs=document.querySelectorAll(".ltab");var idx=lfArr.indexOf(m);tabs.forEach(function(t,i){t.classList.toggle("on",i===idx);});var hdr=document.getElementById("lager-category-header"),lbl=document.getElementById("lager-cat-label");if(hdr&&lbl){if(m==="all"){hdr.style.display="none";}else{hdr.style.display="block";lbl.textContent=lfLabels[m]||m;}}renderList();}

function mkCard(item){
  // Fix 7: Kleinanzeigen Status
  var kaStatus=item.kleinanzeigen||"";
  var kaIsDone=kaStatus.toLowerCase().includes("hochgeladen")||kaStatus==="ja";
  var avLabel=kaIsDone?"✓ Bei Kleinanzeigen":"✗ Noch nicht hochgeladen";
  var avc=kaIsDone?"av-v":"av-n", avi=kaIsDone?"bi-check-circle-fill":"bi-x-circle-fill";
  // Kategorien Badge
  var katBadge="";
  if(item.kategorien&&String(item.kategorien).includes("|")){
    katBadge='<span class="ic-badge" style="background:rgba(248,81,73,.15);color:var(--red);margin-left:4px">🔧 Defekt</span>';
  }
  var nm=item.name||item.spiel||item.modell||item.geraet||"–";
  var tmap={konsole:["ib-k","🕹️ Konsole"],spiel:["ib-sp","💿 Spiel"],handy:["ib-h","📱 Handy"],pc:["ib-pc","💻 PC/Laptop"],defekt:["ib-def","⚠️ Defekt"]};
  var tm=tmap[item.type]||["","–"];
  var chips="";
  if(item.einkaufspreis&&String(item.einkaufspreis).trim()&&item.einkaufspreis!="0")chips+='<span class="chip" style="border-color:rgba(63,185,80,.3);color:var(--green)"><i class="bi bi-tag"></i>&nbsp;<b>EK: '+esc(String(item.einkaufspreis))+'€</b></span>';
  if(item.scanId)chips+='<span class="chip"><i class="bi bi-upc"></i>&nbsp;<b>'+esc(String(item.scanId))+'</b></span>';
  if(item.speicherGB)chips+='<span class="chip"><i class="bi bi-hdd"></i>&nbsp;<b>'+esc(item.speicherGB)+'GB</b></span>';
  if(item.ram)chips+='<span class="chip"><i class="bi bi-memory"></i>&nbsp;<b>'+esc(item.ram)+'GB RAM</b></span>';
  if(item.farbe)chips+='<span class="chip"><i class="bi bi-palette2"></i>&nbsp;<b>'+esc(item.farbe)+'</b></span>';
  if(item.system)chips+='<span class="chip"><i class="bi bi-display"></i>&nbsp;<b>'+esc(item.system)+'</b></span>';
  if(item.typ_)chips+='<span class="chip"><i class="bi bi-laptop"></i>&nbsp;<b>'+esc(item.typ_)+'</b></span>';
  if(item.prozessor)chips+='<span class="chip"><i class="bi bi-cpu"></i>&nbsp;<b>'+esc(item.prozessor)+'</b></span>';
  if(item.grafikkarte)chips+='<span class="chip"><i class="bi bi-gpu-card"></i>&nbsp;<b>'+esc(item.grafikkarte)+'</b></span>';
  if(item.zustand)chips+='<span class="chip"><i class="bi bi-star"></i>&nbsp;<b>'+esc(item.zustand)+'</b></span>';
  if(item.mitarbeiter)chips+='<span class="chip"><i class="bi bi-person"></i>&nbsp;<b>'+esc(item.mitarbeiter)+'</b></span>';
  if(item.datum)chips+='<span class="chip"><i class="bi bi-calendar3"></i>&nbsp;<b>'+esc(item.datum)+'</b></span>';
  if(item.problemTyp&&item.type!=="defekt")chips+='<span class="chip" style="border-color:rgba(248,81,73,.3);color:var(--red)"><i class="bi bi-exclamation-triangle-fill"></i>&nbsp;<b>'+esc(item.problemTyp)+'</b></span>';
  var note=item.problemBeschr||item.hinweise||"";
  if(item.type==="defekt"){chips+='<span class="chip"><i class="bi bi-box-arrow-in-right"></i>&nbsp;<b>'+esc(item.ursprung||"")+'</b></span>';note=item.problemBeschr||"";}
  var rIdx=cardRegistry.length;
  var fotosHtml="";
  if(item.fotos&&item.fotos.length>0){fotosHtml='<div class="card-fotos">';item.fotos.forEach(function(b64,fi){fotosHtml+='<div class="card-foto" onclick="openLightbox('+rIdx+','+fi+')"><img src="'+esc(b64)+'" loading="lazy"/></div>';});fotosHtml+='</div>';}
  cardRegistry.push(item);
  var actions='<div class="ic-actions">';
  if(item.type!=="defekt"){actions+='<button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation();openEditStepper('+rIdx+')"><i class="bi bi-pencil-fill me-1"></i>Bearbeiten</button><button class="btn btn-outline-danger btn-sm" onclick="confirmDelete('+rIdx+')"><i class="bi bi-trash3"></i></button>';}
  else{actions+='<button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation();confirmDeleteDefekt('+rIdx+')"><i class="bi bi-trash3 me-1"></i>Löschen</button>';}
  actions+='</div>';
  return '<div class="ic" onclick="openDetail('+rIdx+')" style="cursor:pointer"><div class="ic-top"><div class="ic-name">'+esc(nm)+'</div><div style="display:flex;gap:4px;align-items:center"><span class="ic-badge '+tm[0]+'">'+tm[1]+'</span>'+katBadge+'</div></div><div class="chips">'+chips+(item.type!=="defekt"?'<span class="av-badge '+avc+'"><i class="bi '+avi+' me-1"></i>'+avLabel+'</span>':'')+' </div>'+(note?'<div style="font-size:12px;color:var(--text2);margin-bottom:4px"><i class="bi bi-chat-text me-1"></i>'+esc(note)+'</div>':"")+fotosHtml+actions+'</div>';
}

function openLightbox(itemIdx,fotoIdx){var item=cardRegistry[itemIdx];if(!item||!item.fotos||!item.fotos[fotoIdx])return;var lb=document.createElement("div");lb.className="lightbox";lb.innerHTML='<img src="'+esc(item.fotos[fotoIdx])+'" alt="Foto"/>';lb.onclick=function(){lb.remove();};document.body.appendChild(lb);}

function openEditStepper(rIdx){var item=cardRegistry[rIdx];if(!item)return;document.querySelectorAll(".bnav-btn").forEach(function(b){b.classList.toggle("on",b.dataset.tab==="scan-panel");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="scan-panel");});document.getElementById("mode-chooser").style.display="none";document.getElementById("cat-chooser").style.display="none";document.getElementById("sw-sub").style.display="none";curCat=item.type==="konsole"||item.type==="spiel"?"spielwaren":item.type;startStepper(item.type,item);}

function confirmDelete(rIdx){var item=cardRegistry[rIdx];if(!item)return;var nm=item.name||item.spiel||item.modell||"?";document.getElementById("del-modal-text").textContent='"'+nm+'" wirklich löschen?';document.getElementById("del-modal-confirm").onclick=function(){closeDelModal();doDelete(item);};document.getElementById("del-modal").classList.add("open");}
function confirmDeleteDefekt(rIdx){var item=cardRegistry[rIdx];if(!item)return;document.getElementById("del-modal-text").textContent='"'+(item.geraet||"?")+'" wirklich löschen?';document.getElementById("del-modal-confirm").onclick=function(){closeDelModal();doDeleteDefekt(item);};document.getElementById("del-modal").classList.add("open");}
function closeDelModal(){document.getElementById("del-modal").classList.remove("open");}
function doDelete(item){var fns={konsole:"deleteKonsole",spiel:"deleteSpiel",handy:"deleteHandy",pc:"deletePC"};var fn=fns[item.type];if(!fn){toast("Nicht verfügbar.","err");return;}gasGet(fn,{rowIndex:item.rowIndex},function(r){if(r&&r.ok){toast(r.msg,"ok");allItems=[];loadAll();loadStats();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}},function(e){toast("Fehler: "+e,"err");});}
function doDeleteDefekt(item){gasGet("deleteDefekt",{rowIndex:item.rowIndex},function(r){if(r&&r.ok){toast(r.msg,"ok");allItems=[];loadAll();loadStats();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}},function(e){toast("Fehler: "+e,"err");});}

// ── SUCHE ─────────────────────────────────────────────────────────
var recentSearches=[],searchResults=[];
function initSearch(){try{var s=localStorage.getItem("smp_recent");if(s)recentSearches=JSON.parse(s)||[];}catch(e){}renderRecentChips();}
function saveRecentSearch(q){if(!q||q.length<2)return;recentSearches=recentSearches.filter(function(r){return r!==q;});recentSearches.unshift(q);if(recentSearches.length>5)recentSearches=recentSearches.slice(0,5);try{localStorage.setItem("smp_recent",JSON.stringify(recentSearches));}catch(e){}renderRecentChips();}
function renderRecentChips(){var box=document.getElementById("recent-searches"),wrap=document.getElementById("recent-chips");if(!box||!wrap)return;if(!recentSearches||recentSearches.length===0){box.style.display="none";return;}box.style.display="block";wrap.innerHTML=recentSearches.map(function(r,i){return'<button onclick="useRecent('+i+')" style="background:var(--bg3);border:1px solid var(--border2);color:var(--blue);border-radius:20px;padding:4px 11px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;"><i class="bi bi-clock-history" style="font-size:10px"></i>'+esc(r)+'</button>';}).join("");}
function useRecent(idx){var q=recentSearches[idx];document.getElementById("s-bc-in").value=q;doSearch();}

function doSearch(){var q=document.getElementById("s-bc-in").value.trim();if(!q){renderSearchResults(allItems);return;}saveRecentSearch(q);liveSearch(q);}
function applySearchSort(){renderSearchResults(searchResults.length>0?searchResults:allItems);}
function renderSearchResults(items){searchResults=items||[];var cat=document.getElementById("search-cat")?document.getElementById("search-cat").value:"all";var sort=document.getElementById("search-sort")?document.getElementById("search-sort").value:"neu";var filtered=searchResults.filter(function(i){if(cat==="all")return true;if(cat==="spielwaren")return i.type==="konsole"||i.type==="spiel";return i.type===cat;});filtered=filtered.slice().sort(function(a,b){var na=a.name||a.spiel||a.modell||a.geraet||"",nb=b.name||b.spiel||b.modell||b.geraet||"",da=a.datum||"",db=b.datum||"";if(sort==="neu")return db.localeCompare(da);if(sort==="alt")return da.localeCompare(db);if(sort==="az")return na.localeCompare(nb,"de");if(sort==="za")return nb.localeCompare(na,"de");return 0;});var countEl=document.getElementById("search-count");if(countEl){countEl.style.display="block";countEl.textContent=filtered.length+" Ergebnisse";}cardRegistry=[];if(!filtered.length){document.getElementById("search-out").innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Ergebnisse.</p></div>';return;}document.getElementById("search-out").innerHTML=filtered.map(function(i){return mkCard(i);}).join("");}
document.getElementById("s-bc-in").addEventListener("keydown",function(e){if(e.key==="Enter")doSearch();});

// ── DIAGNOSE ─────────────────────────────────────────────────────
function test1(){var b=document.getElementById("bt1"),o=b.innerHTML;setBL(b,true);var x=document.getElementById("t1o");x.className="diag dinf";x.textContent="Warte…";x.style.display="block";gasGet("verbindungstest",{},function(r){setBL(b,false,o);if(r&&r.ok){x.className="diag dok";x.textContent="✅ "+(r.msg||"OK")+" – "+(r.zeit||"");}else{x.className="diag derr";x.textContent="❌ Fehler: "+(r?JSON.stringify(r):"keine Antwort");}},function(e){setBL(b,false,o);x.className="diag derr";x.textContent="❌ "+String(e);});}
function test2(){var b=document.getElementById("bt2"),o=b.innerHTML;setBL(b,true);var x=document.getElementById("t2o");x.className="diag dinf";x.textContent="Prüfe…";x.style.display="block";gasGet("sheetTest",{},function(r){setBL(b,false,o);if(r&&r.ok){x.className="diag dok";x.textContent="✅ Sheet: "+(r.name||"OK");}else{x.className="diag derr";x.textContent="❌ "+(r&&r.fehler?r.fehler:JSON.stringify(r));}},function(e){setBL(b,false,o);x.className="diag derr";x.textContent="❌ "+String(e);});}
function test3(){var b=document.getElementById("bt3"),o=b.innerHTML;setBL(b,true);var x=document.getElementById("t3o");x.className="diag dinf";x.textContent="Schreibe Testzeile…";x.style.display="block";gasGet("saveTestzeile",{},function(r){setBL(b,false,o);if(r&&r.ok){testRowNum=r.rowNum;x.className="diag dok";x.textContent="✅ "+r.msg+" – wird in 3s gelöscht…";startTestTimer(3);}else{x.className="diag derr";x.textContent="❌ "+(r?r.fehler:"?");}},function(e){setBL(b,false,o);x.className="diag derr";x.textContent="❌ "+e;});}
function startTestTimer(sec){var box=document.getElementById("test-timer-box"),bar=document.getElementById("timer-bar"),cnt=document.getElementById("timer-cnt");box.classList.add("show");var remaining=sec*10,total=remaining;if(timerInterval)clearInterval(timerInterval);timerInterval=setInterval(function(){remaining--;cnt.textContent=Math.ceil(remaining/10);bar.style.width=Math.round((remaining/total)*100)+"%";if(remaining<=0){clearInterval(timerInterval);timerInterval=null;box.classList.remove("show");if(testRowNum>0){gasGet("deleteTestzeile",{rowNum:testRowNum},function(r){var x=document.getElementById("t3o");x.className=r.ok?"diag dok":"diag derr";x.textContent=r.ok?"✅ Testzeile gelöscht.":"❌ Löschen fehlgeschlagen: "+(r.fehler||"?");testRowNum=-1;},function(){});}}},100);}

// ── UTILS ────────────────────────────────────────────────────────
function gv(id){var e=document.getElementById(id);return e?e.value:"";}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function setBL(btn,on,orig){if(on){btn.disabled=true;btn.innerHTML='<span class="spin"></span>';}else{btn.disabled=false;if(orig)btn.innerHTML=orig;}}
function showD(id,msg,cls){var e=document.getElementById(id);if(!e)return;e.className="diag "+(cls||"derr");e.textContent=msg;e.style.display="block";}
function hideD(id){var e=document.getElementById(id);if(e)e.style.display="none";}
function toast(msg,t,d){d=d||4000;var w=document.getElementById("toasts"),el=document.createElement("div");var c=t==="ok"?"tok":t==="err"?"terr":"tinf",ic=t==="ok"?"✅":t==="err"?"❌":"💡";el.className="tm "+c;el.innerHTML="<span>"+ic+"</span><span>"+msg+"</span>";w.appendChild(el);setTimeout(function(){el.style.opacity="0";el.style.transform="translateY(7px)";setTimeout(function(){el.remove();},300);},d);}
function showZustandInfo(){var info=[["Neuwertig","Neu & originalverpackt, unbenutzt"],["Sehr gut","Mit Originalverpackung, kaum Gebrauchsspuren"],["Gut","Leichte Gebrauchsspuren, vollständig mit Hülle"],["Akzeptabel","Sichtbare Kratzer/Gebrauch, funktionsfähig"],["Defekt","Funktioniert nicht oder stark beschädigt"]];var rows=info.map(function(r){return'<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-weight:700;color:var(--blue);min-width:90px;font-size:13px">'+r[0]+'</span><span style="font-size:13px;color:var(--text2)">'+r[1]+'</span></div>';}).join("");var overlay=document.createElement("div");overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)";var inner=document.createElement("div");inner.style.cssText="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;max-width:400px;width:100%";var hd=document.createElement("div");hd.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px";var ttl=document.createElement("span");ttl.style.cssText="font-size:16px;font-weight:700;color:var(--text)";ttl.textContent="Zustand-Erklärung";var xbtn=document.createElement("button");xbtn.textContent="✕";xbtn.style.cssText="background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:14px";xbtn.onclick=function(){overlay.remove();};hd.appendChild(ttl);hd.appendChild(xbtn);inner.appendChild(hd);var rd=document.createElement("div");rd.innerHTML=rows;inner.appendChild(rd);overlay.appendChild(inner);overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};document.body.appendChild(overlay);}

// ── BENACHRICHTIGUNGEN ────────────────────────────────────────────
var notifications=[];
function loadNotifications(){try{var s=localStorage.getItem("smp_notifs");if(s)notifications=JSON.parse(s)||[];}catch(e){}updateNotifBadge();checkLongStorageItems();}
function saveNotifications(){try{localStorage.setItem("smp_notifs",JSON.stringify(notifications.slice(0,50)));}catch(e){}}
function addNotification(title,body,type){var notif={id:Date.now(),title:title,body:body,type:type||"info",time:new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}),read:false};notifications.unshift(notif);saveNotifications();updateNotifBadge();}
function updateNotifBadge(){var unread=notifications.filter(function(n){return!n.read;}).length;var badge=document.getElementById("notif-count-badge");if(badge){if(unread>0){badge.style.display="flex";badge.textContent=unread>9?"9+":unread;}else{badge.style.display="none";}}}
function openNotifications(){notifications.forEach(function(n){n.read=true;});saveNotifications();updateNotifBadge();renderNotifList();document.getElementById("notif-overlay").classList.add("open");}
function closeNotifications(){document.getElementById("notif-overlay").classList.remove("open");}
function renderNotifList(){var list=document.getElementById("notif-list");if(!notifications||notifications.length===0){list.innerHTML='<div class="notif-empty"><i class="bi bi-bell-slash"></i><p>Keine Benachrichtigungen</p></div>';return;}list.innerHTML=notifications.map(function(n){var cls=n.type==="alert"?"alert":n.type==="warn"?"warn":"";return'<div class="notif-item '+cls+'"><div class="notif-title">'+esc(n.title)+'</div><div class="notif-body">'+esc(n.body)+'</div><div class="notif-time">'+esc(n.time)+'</div><button class="notif-rm" onclick="removeNotif('+n.id+')">✕</button></div>';}).join("");}
function removeNotif(id){notifications=notifications.filter(function(n){return n.id!==id;});saveNotifications();renderNotifList();updateNotifBadge();}
function clearAllNotifications(){if(!confirm("Alle Benachrichtigungen löschen?"))return;notifications=[];saveNotifications();renderNotifList();updateNotifBadge();}
function checkLongStorageItems(){if(!allItems||allItems.length===0)return;var now=new Date(),threshold=30;allItems.forEach(function(item){if(!item.datum)return;var parts=item.datum.split(".");if(parts.length<3)return;var d=new Date(parts[2].split(" ")[0],parts[1]-1,parts[0]);if(isNaN(d))return;var days=Math.floor((now-d)/(1000*60*60*24));if(days>=threshold){var nm=item.name||item.spiel||item.modell||item.geraet||"Unbekannt";var already=notifications.find(function(n){return n.body&&n.body.indexOf(nm)>-1&&n.title.indexOf("Lager")>-1;});if(!already)addNotification("⏳ Lange im Lager",'"'+nm+'" lagert seit '+days+' Tagen.',"warn");}});}

// ================================================================
// SCAN MODE
// ================================================================
function setMode(mode){
  scanMode=mode;
  document.getElementById("mode-chooser").style.display="none";
  if(mode==="einlagern"){
    document.getElementById("cat-chooser").style.display="block";
  } else {
    // Direkt Barcode-Scanner für Verkauf/Einkauf
    _openHandelScan(mode);
  }
}
function resetToMode(){
  stopCam();
  document.getElementById("mode-chooser").style.display="block";
  document.getElementById("cat-chooser").style.display="none";
  document.getElementById("sw-sub").style.display="none";
  document.getElementById("main-stepper").style.display="none";
  // Hide handel scan wrap
  var hw=document.getElementById("handel-scan-wrap");if(hw)hw.style.display="none";
  isEditMode=false;editingItem=null;
  resetStepperState();
}

// Öffnet Scan direkt für Verkauf/Einkauf
function _openHandelScan(mode){
  var el=document.getElementById("handel-scan-wrap");
  if(!el){
    var wrap=document.createElement("div");
    wrap.id="handel-scan-wrap";
    wrap.innerHTML='<div class="card"><div class="card-head"><h2>'+(mode==="verkauf"?"💸 Verkauf":"🛒 Einkauf")+'</h2><button class="btn btn-sm btn-outline-secondary" onclick="resetToMode()">✕</button></div><div class="card-body"><p style="font-size:13px;color:var(--text2);margin-bottom:12px">Barcode scannen oder direkt eingeben:</p><div class="d-flex gap-2 mb-3"><input type="text" id="handel-scan-input" class="fc" placeholder="Barcode / Scan-ID (optional)"/></div><div class="d-flex gap-2"><button class="btn btn-outline-secondary flex-fill" onclick="openHandelFormFromScan(\''+mode+'\',\'\')">Ohne Barcode</button><button class="btn '+(mode==="verkauf"?"btn-success":"btn-primary")+' flex-fill" onclick="openHandelFormFromScan(\''+mode+'\',document.getElementById(\'handel-scan-input\').value)">Weiter</button></div></div></div>';
    document.getElementById("scan-panel").querySelector(".wrap").appendChild(wrap);
  } else {
    el.style.display="block";
    el.querySelector("h2").textContent=(mode==="verkauf"?"💸 Verkauf":"🛒 Einkauf");
  }
}
function openHandelFormFromScan(mode, scanId){
  var el=document.getElementById("handel-scan-wrap");if(el)el.style.display="none";
  document.getElementById("mode-chooser").style.display="block";
  // Switch to handel panel and open form
  goTabFn("handel-panel");
  setHandelTab(mode==="verkauf"?"verkauf":"einkauf");
  if(mode==="verkauf"){openVerkaufForm(null,scanId||"");}
  else{openEinkaufForm(null,scanId||"");}
}

// ================================================================
// CAMERA PRESELECT – sichtbar vor dem Starten
// ================================================================
function initCamPreselect(){
  var sel=document.getElementById("cam-preselect");if(!sel)return;
  navigator.mediaDevices.enumerateDevices().then(function(devices){
    var vids=devices.filter(function(d){return d.kind==="videoinput";});
    sel.innerHTML="";
    if(vids.length===0){sel.innerHTML='<option value="">Keine Kamera gefunden</option>';return;}
    vids.forEach(function(d,i){
      var opt=document.createElement("option");
      opt.value=d.deviceId;
      var lbl=d.label||("Kamera "+(i+1));
      var back=/back|rear|environment|rück/i.test(lbl);
      opt.textContent=(back?"🔙 ":"🤳 ")+lbl;
      if(i===0||back)opt.selected=true;
      sel.appendChild(opt);
    });
    // Set firstCamDeviceId to selected
    if(!firstCamDeviceId&&sel.value)firstCamDeviceId=sel.value;
  }).catch(function(){
    var sel2=document.getElementById("cam-preselect");
    if(sel2)sel2.innerHTML='<option value="">Bitte Kamerazugriff erlauben</option>';
  });
}

// ================================================================
// HANDEL: VERKAUF + EINKAUF
// ================================================================
var allVerkauf=[], allEinkauf=[], currentHandelTab="verkauf";
var editVerkaufItem=null, editEinkaufItem=null;

function setHandelTab(tab){
  currentHandelTab=tab;
  document.getElementById("htab-vk").className="ltab"+(tab==="verkauf"?" on":"");
  document.getElementById("htab-ek").className="ltab"+(tab==="einkauf"?" on":"");
  document.getElementById("handel-vk").style.display=tab==="verkauf"?"block":"none";
  document.getElementById("handel-ek").style.display=tab==="einkauf"?"block":"none";
}

function loadHandel(){
  gasGet("getAllVerkauf",{},function(r){if(r&&r.ok){allVerkauf=r.data||[];renderVerkaufList();}},function(){});
  gasGet("getAllEinkauf",{},function(r){if(r&&r.ok){allEinkauf=r.data||[];renderEinkaufList();}},function(){});
}

function filterHandel(type){
  if(type==="verkauf")renderVerkaufList();
  else renderEinkaufList();
}

function renderVerkaufList(){
  var q=(document.getElementById("vk-search")||{value:""}).value.toLowerCase();
  var items=q?allVerkauf.filter(function(r){return(r.kunde||"").toLowerCase().includes(q)||(r.produkte||"").toLowerCase().includes(q)||(r.scanId||"").toLowerCase().includes(q)||(r.sendenummer||"").toLowerCase().includes(q);}):allVerkauf;
  var el=document.getElementById("vk-body");
  if(!items.length){el.innerHTML='<div class="empty"><i class="bi bi-cash-coin"></i><p>Keine Verkäufe gefunden</p></div>';return;}
  el.innerHTML=items.map(function(v,i){return mkHandelCard(v,"verkauf",i);}).join("");
}

function renderEinkaufList(){
  var q=(document.getElementById("ek-search")||{value:""}).value.toLowerCase();
  var items=q?allEinkauf.filter(function(r){return(r.kunde||"").toLowerCase().includes(q)||(r.produkte||"").toLowerCase().includes(q)||(r.scanId||"").toLowerCase().includes(q)||(r.zimmer||"").toLowerCase().includes(q);}):allEinkauf;
  var el=document.getElementById("ek-body");
  if(!items.length){el.innerHTML='<div class="empty"><i class="bi bi-cart"></i><p>Keine Einkäufe gefunden</p></div>';return;}
  el.innerHTML=items.map(function(v,i){return mkHandelCard(v,"einkauf",i);}).join("");
}

function mkHandelCard(item,type,idx){
  var nm=item.produkte||"–";
  var statusCls="sb-"+((item.status||"").toLowerCase().replace(/\s+/g,"").replace(/ä/g,"ae").replace(/ü/g,"ue").replace(/ö/g,"oe"));
  var lsDot=getLsDot(item.lieferstatus||"");
  var isVk=(type==="verkauf");
  var chips='<span class="chip"><i class="bi bi-calendar3"></i>&nbsp;<b>'+esc(item.datum||"")+'</b></span>';
  chips+='<span class="chip"><i class="bi bi-person"></i>&nbsp;<b>'+esc(item.kunde||"–")+'</b></span>';
  if(item.preis)chips+='<span class="chip"><i class="bi bi-currency-euro"></i>&nbsp;<b>'+esc(item.preis)+'€</b></span>';
  if(item.plattform)chips+='<span class="chip"><i class="bi bi-shop"></i>&nbsp;<b>'+esc(item.plattform)+'</b></span>';
  if(isVk&&item.bestellnr)chips+='<span class="chip"><i class="bi bi-hash"></i>&nbsp;<b>'+esc(item.bestellnr)+'</b></span>';
  if(!isVk&&item.zimmer)chips+='<span class="chip" style="color:var(--yellow)"><i class="bi bi-door-open"></i>&nbsp;<b>Zimmer: '+esc(item.zimmer)+'</b></span>';
  if(item.mitarbeiter)chips+='<span class="chip"><i class="bi bi-person-badge"></i>&nbsp;<b>'+esc(item.mitarbeiter)+'</b></span>';
  // Sendenummer mit Lieferstatus
  var sendeHtml="";
  if(item.sendenummer){
    var trackUrl=getTrackingUrl(item.versanddienstleister,item.sendenummer);
    sendeHtml='<div style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:12px;color:var(--text2)">'+lsDot+'<span>'+esc(item.lieferstatus||"Ausstehend")+'</span>'+
    (trackUrl?'<a href="'+trackUrl+'" target="_blank" style="color:var(--blue);margin-left:4px"><i class="bi bi-box-arrow-up-right"></i> '+esc(item.sendenummer)+'</a>':'<span style="color:var(--text3)"> – '+esc(item.sendenummer)+'</span>')+'</div>';
  } else {
    sendeHtml='<div style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:12px;color:var(--text3)">'+lsDot+' '+esc(item.lieferstatus||"Ausstehend")+'</div>';
  }
  return'<div class="handel-card"><div class="hc-top"><div class="hc-name">'+esc(nm)+'</div><span class="status-badge '+statusCls+'">'+esc(item.status||"–")+'</span></div><div class="hc-meta">'+chips+'</div>'+sendeHtml+'<div class="ic-actions" style="margin-top:8px"><button class="btn btn-outline-primary btn-sm" onclick="openHandelEdit(\''+type+'\','+idx+')"><i class="bi bi-pencil-fill me-1"></i>Bearbeiten</button></div></div>';
}

function getLsDot(ls){
  var c="ls-ausstehend";
  var l=(ls||"").toLowerCase();
  if(l.includes("bearbeit"))c="ls-inbearbeitung";
  else if(l.includes("versend"))c="ls-versendet";
  else if(l.includes("unterweg"))c="ls-unterwegs";
  else if(l.includes("zugestell"))c="ls-zugestellt";
  else if(l.includes("problem"))c="ls-problem";
  return'<span class="ls-dot '+c+'"></span>';
}

function getTrackingUrl(vdl,nr){
  var v=(vdl||"").toLowerCase();
  if(v.includes("dhl"))return"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode="+encodeURIComponent(nr);
  if(v.includes("hermes"))return"https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#"+encodeURIComponent(nr);
  if(v.includes("dpd"))return"https://tracking.dpd.de/status/de_DE/parcel/"+encodeURIComponent(nr);
  if(v.includes("ups"))return"https://www.ups.com/track?tracknum="+encodeURIComponent(nr);
  if(v.includes("gls"))return"https://gls-group.eu/track/"+encodeURIComponent(nr);
  return"";
}

function openHandelEdit(type,idx){
  if(type==="verkauf"){openVerkaufForm(allVerkauf[idx]);}
  else{openEinkaufForm(allEinkauf[idx]);}
}

// VERKAUF FORM

function closeVKModal(){document.getElementById("vk-modal").classList.remove("open");editVerkaufItem=null;}

// Fix 4: Lieferstatus dynamisch – Sendenummer-Feld erscheint bei Versendet+
function onVKLieferstatusChange(){
  var ls=gv("vk-lieferstatus");
  var needSende=["Versendet","Unterwegs","Zugestellt"].indexOf(ls)>-1;
  var wrap=document.getElementById("vk-sende-wrap");
  if(wrap)wrap.style.display=needSende?"block":"none";
  if(needSende)onVKSendeInput();
}
function onVKSendeInput(){
  var nr=gv("vk-sende").trim();
  var vdl=gv("vk-vdl");
  var trackDiv=document.getElementById("vk-track-link");
  var trackA=document.getElementById("vk-track-a");
  if(!nr||!trackDiv||!trackA){if(trackDiv)trackDiv.style.display="none";return;}
  var url=getTrackingUrl(vdl,nr);
  if(url){trackA.href=url;trackDiv.style.display="block";}
  else{trackDiv.style.display="none";}
}

// Fix 1: Produkt aus Lager wählen
var vkPickerActive=false;
function openVKProductPicker(){
  // Build picker overlay
  var items=allItems.filter(function(i){return i.type!=="defekt"&&i.type!=="verkauf";});
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;flex-direction:column;padding:16px;overflow:hidden";
  overlay.id="vk-picker-overlay";
  overlay.innerHTML='<div style="background:var(--bg2);border-radius:var(--r);overflow:hidden;flex:1;display:flex;flex-direction:column;max-height:90vh">'
    +'<div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">'
    +'<span style="font-size:14px;font-weight:700;color:var(--text)">📦 Produkt aus Lager wählen</span>'
    +'<button onclick="document.getElementById(\'vk-picker-overlay\').remove()" style="background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer">✕</button></div>'
    +'<div style="padding:10px 14px;border-bottom:1px solid var(--border)"><input type="text" id="vk-picker-search" class="fc" placeholder="Suchen…" oninput="filterVKPicker()" style="font-size:13px"/></div>'
    +'<div id="vk-picker-list" style="overflow-y:auto;flex:1;padding:8px"></div>'
    +'</div>';
  document.body.appendChild(overlay);
  // Render items
  window._vkPickerItems=items;
  renderVKPickerList(items);
}
function renderVKPickerList(items){
  var el=document.getElementById("vk-picker-list"); if(!el)return;
  if(!items.length){el.innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Artikel</p></div>';return;}
  el.innerHTML=items.map(function(item,i){
    var nm=item.name||item.spiel||item.modell||"–";
    var sub=[item.datum,item.mitarbeiter,item.zustand].filter(Boolean).join(" · ");
    return'<div onclick="selectVKProduct('+i+')" style="padding:10px 13px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'">'+
      '<div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(nm)+'</div>'+
      '<div style="font-size:11px;color:var(--text3)">'+esc(sub)+'  ·  ID: '+esc(item.scanId||"–")+'</div></div>';
  }).join("");
}
function filterVKPicker(){
  var q=(document.getElementById("vk-picker-search")||{value:""}).value.toLowerCase();
  var filtered=q?(window._vkPickerItems||[]).filter(function(i){var nm=i.name||i.spiel||i.modell||"";return nm.toLowerCase().includes(q)||(i.scanId||"").toLowerCase().includes(q);}):window._vkPickerItems||[];
  renderVKPickerList(filtered);
}
function selectVKProduct(idx){
  var item=(window._vkPickerItems||[])[idx]; if(!item)return;
  var nm=item.name||item.spiel||item.modell||"";
  sv2("vk-produkte",nm);
  // scanId is editable now
  var scanEl=document.getElementById("vk-scanid");
  if(scanEl){scanEl.removeAttribute("readonly");scanEl.value=item.scanId||"";}
  var pi=document.getElementById("vk-product-info");
  if(pi){
    var info=[item.datum,item.mitarbeiter,"Zustand: "+(item.zustand||"–")].filter(Boolean).join(" · ");
    pi.textContent="✓ Aus Lager: "+info; pi.style.display="block";
  }
  var ol=document.getElementById("vk-picker-overlay");if(ol)ol.remove();
}

// Fix 1: Barcode Scanner für Verkauf
var vkScanStream=null, vkScanRunning=false, vkScanFrame=null;
function openVKScanner(){
  var overlay=document.createElement("div");
  overlay.id="vk-scan-overlay";
  overlay.className="scan-overlay";
  overlay.innerHTML='<div class="scan-overlay-video"><video id="vk-scan-video" autoplay playsinline muted></video><canvas id="vk-scan-canvas" style="display:none"></canvas><div class="scan-overlay-frame"><div></div></div><div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:600">Produkt scannen</div></div><div style="margin-top:16px;text-align:center"><p style="color:var(--text2);font-size:13px;margin-bottom:12px">Barcode wird automatisch erkannt</p><button class="btn btn-outline-light" onclick="closeVKScanner()"><i class="bi bi-x-circle me-1"></i>Abbrechen</button></div>';
  document.body.appendChild(overlay);
  var video=document.getElementById("vk-scan-video");
  var constraints={video:firstCamDeviceId?{deviceId:{exact:firstCamDeviceId}}:{facingMode:{ideal:"environment"}}};
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
    vkScanStream=stream;vkScanRunning=true;
    video.srcObject=stream;
    video.onloadedmetadata=function(){video.play().then(function(){_vkScanLoop();});};
  }).catch(function(err){toast("Kamera: "+String(err),"err");closeVKScanner();});
}
function closeVKScanner(){
  vkScanRunning=false;
  if(vkScanFrame){cancelAnimationFrame(vkScanFrame);vkScanFrame=null;}
  if(vkScanStream){vkScanStream.getTracks().forEach(function(t){t.stop();});vkScanStream=null;}
  var ol=document.getElementById("vk-scan-overlay");if(ol)ol.remove();
}
function _vkScanLoop(){
  if(!vkScanRunning)return;
  var video=document.getElementById("vk-scan-video"),canvas=document.getElementById("vk-scan-canvas");
  if(!video||video.readyState<2){vkScanFrame=requestAnimationFrame(_vkScanLoop);return;}
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
  var reader=getZxingReader();var detected=null;
  if(reader){try{var res=reader.decodeFromCanvas(canvas);if(res&&res.getText())detected=res.getText().trim();}catch(e){}}
  if(detected){
    closeVKScanner();
    // Suche in Lager nach dieser Scan-ID
    var found=allItems.filter(function(i){return i.type!=="defekt"&&String(i.scanId||"")===detected;});
    if(found.length>0){
      // Produkt direkt befüllen
      var item=found[0];
      var nm=item.name||item.spiel||item.modell||"";
      sv2("vk-produkte",nm);
      var scanEl=document.getElementById("vk-scanid");if(scanEl){scanEl.removeAttribute("readonly");scanEl.value=detected;}
      var pi=document.getElementById("vk-product-info");
      if(pi){pi.textContent="✓ Gefunden: "+nm+" (Scan-ID: "+detected+")";pi.style.display="block";}
      toast("✓ Produkt gefunden: "+nm,"ok");
    } else {
      // Scan-ID nicht im Lager – trotzdem eintragen
      var scanEl2=document.getElementById("vk-scanid");if(scanEl2){scanEl2.removeAttribute("readonly");scanEl2.value=detected;}
      var pi2=document.getElementById("vk-product-info");
      if(pi2){pi2.textContent="⚠️ Scan-ID "+detected+" nicht im Lager gefunden – bitte Produkt manuell eingeben.";pi2.style.display="block";}
      toast("Scan-ID erkannt: "+detected,"inf");
    }
    try{if(navigator.vibrate)navigator.vibrate([80]);}catch(e){}
    return;
  }
  if(vkScanRunning)vkScanFrame=requestAnimationFrame(_vkScanLoop);
}
function saveVKForm() {
  var d = document.getElementById("vk-diag"); if(d) d.style.display="none";
  var produkte = vkScannedItems.length>0
    ? vkScannedItems.map(function(i){return i.name;}).join(", ")
    : gv("vk-produkte").trim();
  var scanIds = vkScannedItems.length>0
    ? vkScannedItems.map(function(i){return i.scanId;}).filter(Boolean).join(", ")
    : gv("vk-scanid");
  var ekPreis = vkScannedItems.length>0
    ? vkScannedItems.reduce(function(s,i){return s+i.ekPreis;},0).toFixed(2)
    : gv("vk-ep")||"";
  if(!produkte){var dg=document.getElementById("vk-diag");dg.className="diag derr";dg.textContent="Bitte Produkt eingeben.";dg.style.display="block";return;}
  if(!gv("vk-preis")){var dg=document.getElementById("vk-diag");dg.className="diag derr";dg.textContent="Bitte Preis eingeben.";dg.style.display="block";return;}
  var data = {
    produkte: produkte, scanIds: scanIds, verkaufspreis: gv("vk-preis"),
    einkaufspreis: ekPreis, versandkosten: gv("vk-versand")||"0",
    plattform: gv("vk-plattform"), kunde: gv("vk-kunde"),
    angebotsnr: gv("vk-bestellnr"), bezahlMit: gv("vk-bezahlt"),
    geldErhalten: gv("vk-geld"),
    versand: gv("vk-abholung")==="Abholung"?"Abholung":"Versand",
    abholung: gv("vk-abholung")==="Abholung"?"JA":"NEIN",
    status: gv("vk-status"), lieferstatus: gv("vk-lieferstatus"),
    sendenummer: gv("vk-sende"), versanddienstleister: gv("vk-vdl"),
    mitarbeiter: gv("vk-ma")||emp, hinweise: gv("vk-hinweise"),
    datum: new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})
      +" "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})
  };
  var btn = document.getElementById("vk-save-btn"); setBL(btn,true);
  var action = editVerkaufItem ? "updateVerkauf" : "saveVerkauf";
  if(editVerkaufItem) data.rowIndex = editVerkaufItem.rowIndex;
  gasPost(action, data, function(r){
    setBL(btn,false);
    if(r&&r.ok){
      closeVKModal();
      vkScannedItems=[];
      loadHandel();
      // Show success message based on status
      var marge = parseFloat(r.marge||0);
      var status = data.status;
      var msg = "";
      if(status==="Abgeschlossen"||status==="Verkauft"||status==="Versendet"){
        msg = marge>0
          ? "🎉 Glückwunsch! Du hast einen Verkauf mit +" + marge.toFixed(2) + "€ Gewinn abgeschlossen!"
          : marge===0
          ? "✅ Verkauf gespeichert. Nullsumme – kein Verlust, kein Gewinn."
          : "⚠️ Verkauf gespeichert. Verlust: " + marge.toFixed(2) + "€ – Preis prüfen!";
      } else if(status==="Vorgemerkt"){
        msg = marge>0
          ? "📝 Glückwunsch! Du hast eine Bestellung mit +" + marge.toFixed(2) + "€ Gewinn vorgemerkt – viel Erfolg!"
          : "📝 Verkauf vorgemerkt.";
      } else {
        msg = "✅ " + (r.msg||"Gespeichert.");
      }
      showSuccessToast(msg, marge);
    } else {
      var dg=document.getElementById("vk-diag");
      dg.className="diag derr";dg.textContent=r?r.fehler:"Fehler";dg.style.display="block";
      setBL(btn,false);
    }
  }, function(e){ setBL(btn,false); var dg=document.getElementById("vk-diag");dg.className="diag derr";dg.textContent="Verbindungsfehler: "+e;dg.style.display="block"; });
}

function showSuccessToast(msg, marge) {
  var overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)";
  var color = marge>0?"var(--acc)":marge<0?"var(--col-r)":"var(--w3)";
  var numDisplay = marge>0?"+"+marge.toFixed(2)+"€":"✅";
  var inner = document.createElement("div");
  inner.style.cssText = "background:var(--b2);border:1px solid "+color+";border-radius:14px;max-width:380px;width:100%;padding:24px 20px;text-align:center;box-shadow:0 0 40px rgba(0,255,136,.1)";
  inner.innerHTML = '<div style="font-size:48px;letter-spacing:3px;color:'+color+';line-height:1;margin-bottom:10px">'+esc(numDisplay)+'</div>'
    +(marge>0?'<div style="font-size:13px;color:var(--acc);font-weight:700;margin-bottom:10px;font-family:monospace">GEWINN</div>':"")
    +'<div style="font-size:13px;color:var(--w2);line-height:1.6;margin-bottom:18px">'+esc(msg)+'</div>';
  var btn = document.createElement("button");
  btn.style.cssText = "background:var(--acc);color:#000;border:none;border-radius:6px;padding:11px 28px;font-size:16px;letter-spacing:1.5px;cursor:pointer;width:100%;font-weight:700";
  btn.textContent = "OK →";
  btn.onclick = function(){ overlay.remove(); };
  inner.appendChild(btn);
  overlay.appendChild(inner);
  overlay.onclick = function(e){ if(e.target===this) this.remove(); };
  document.body.appendChild(overlay);
}

// EINKAUF FORM




function deleteHandelEntry(type){
  var item=(type==="verkauf")?editVerkaufItem:editEinkaufItem;
  if(!item||!confirm("Wirklich löschen?"))return;
  gasGet("delete"+(type==="verkauf"?"Verkauf":"Einkauf"),{rowIndex:item.rowIndex},function(r){
    if(r&&r.ok){toast(r.msg,"ok");if(type==="verkauf"){closeVKModal();}else{closeEKModal();}loadHandel();}
    else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}

// Helper: set value safely
function sv2(id,val){var el=document.getElementById(id);if(!el)return;el.value=String(val===null||val===undefined?"":val);}

// ================================================================
// KLEINANZEIGEN PANEL
// ================================================================
function renderKAPanel(){
  if(!allItems.length){loadAll();setTimeout(function(){_buildKAPanel();},2000);}
  else{_buildKAPanel();}
}
function _buildKAPanel(){
  var relevant=allItems.filter(function(i){return i.type!=="defekt";});
  var done=relevant.filter(function(i){return(i.kleinanzeigen||"").toLowerCase().includes("hochgeladen")||i.kleinanzeigen==="ja";}).length;
  var todo=relevant.length-done;
  var pct=relevant.length>0?Math.round((done/relevant.length)*100):0;
  var dc=document.getElementById("ka-done-cnt");if(dc)dc.textContent=done;
  var tc=document.getElementById("ka-todo-cnt");if(tc)tc.textContent=todo;
  var bar=document.getElementById("ka-prog-bar");if(bar)bar.style.width=pct+"%";

  // Filter
  var q=(document.getElementById("ka-search")||{value:""}).value.toLowerCase();
  var filtered=q?relevant.filter(function(i){var nm=i.name||i.spiel||i.modell||"";return nm.toLowerCase().includes(q)||(i.scanId||"").toLowerCase().includes(q);}):relevant;

  var el=document.getElementById("ka-body");
  if(!filtered.length){el.innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Artikel</p></div>';return;}
  el.innerHTML=filtered.map(function(item){
    var nm=item.name||item.spiel||item.modell||"–";
    var isDone=(item.kleinanzeigen||"").toLowerCase().includes("hochgeladen")||item.kleinanzeigen==="ja";
    var kaClass=isDone?"ka-done":"ka-todo";
    var tgClass=isDone?"done":"todo";
    var tgTxt=isDone?"✓ Hochgeladen":"✗ Nicht hochgeladen";
    var typ=item.type;var ri=item.rowIndex;
    return'<div class="ka-item '+kaClass+'" id="ka-'+typ+'-'+ri+'">'+
      '<div><div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(nm)+'</div>'+
      '<div style="font-size:11px;color:var(--text3);margin-top:2px">'+esc(item.datum||"")+'  ·  '+esc(item.mitarbeiter||"")+'</div></div>'+
      '<button class="ka-toggle '+tgClass+'" onclick="toggleKA(\''+typ+'\','+ri+','+(!isDone)+')" data-type="'+typ+'" data-row="'+ri+'">'+tgTxt+'</button></div>';
  }).join("");
}
function filterKA(){_buildKAPanel();}

function toggleKA(type,rowIndex,setDone){
  var status=setDone?"hochgeladen":"nicht hochgeladen";
  gasGet("updateKleinanzeigen",{type:type,rowIndex:rowIndex,status:status},function(r){
    if(r&&r.ok){
      // Update local cache
      for(var i=0;i<allItems.length;i++){if(allItems[i].type===type&&allItems[i].rowIndex===rowIndex){allItems[i].kleinanzeigen=status;break;}}
      _buildKAPanel();
      buildKAProgress();
      toast(setDone?"✅ Als hochgeladen markiert":"Als ausstehend markiert",setDone?"ok":"inf",2000);
    }else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}


// ================================================================
// 1. GLOBAL KAMERA-AUSWAHL (shared für alle Scanner)
// ================================================================
// initCamPreselect already defined - it fills #cam-preselect
// All scanner functions already use firstCamDeviceId
// The search scanner and vk scanner also use firstCamDeviceId ✓
// Additional: make cam-preselect update propagate
function onCamPreselect(){
  var sel=document.getElementById("cam-preselect");
  if(sel&&sel.value){firstCamDeviceId=sel.value;}
}

// ================================================================
// VK STEPPER
// ================================================================
var vkStep=1, vkTotalSteps=5;

function vkStepNav(dir){
  // Validate current step
  if(dir>0){
    if(vkStep===1){
      if(!gv("vk-produkte").trim()){var d=document.getElementById("vk-diag");d.className="diag derr";d.textContent="Bitte Produkt eingeben.";d.style.display="block";return;}
      if(!gv("vk-preis")){var d=document.getElementById("vk-diag");d.className="diag derr";d.textContent="Bitte Preis eingeben.";d.style.display="block";return;}
    }
    if(vkStep===2&&!gv("vk-plattform")){var d=document.getElementById("vk-diag");d.className="diag derr";d.textContent="Bitte Plattform auswählen.";d.style.display="block";return;}
    if(vkStep===3&&!gv("vk-bezahlt")){var d=document.getElementById("vk-diag");d.className="diag derr";d.textContent="Bitte Bezahlmethode wählen.";d.style.display="block";return;}
    if(vkStep===4&&gv("vk-status")==="Versendet"&&!gv("vk-sende")){var d=document.getElementById("vk-diag");d.className="diag derr";d.textContent="Bitte Sendenummer eintragen.";d.style.display="block";return;}
  }
  var d=document.getElementById("vk-diag");if(d)d.style.display="none";
  vkStep=Math.max(1,Math.min(vkTotalSteps,vkStep+dir));
  _renderVKStep();
}

function _renderVKStep(){
  for(var i=1;i<=vkTotalSteps;i++){
    var el=document.getElementById("vks-"+i);
    if(el)el.style.display=(i===vkStep?"block":"none");
  }
  var pct=Math.round((vkStep/vkTotalSteps)*100);
  var pb=document.getElementById("vk-prog");if(pb)pb.style.width=pct+"%";
  var sl=document.getElementById("vk-step-lbl");if(sl)sl.textContent="Schritt "+vkStep+" von "+vkTotalSteps;
  var snames=["Produkt","Plattform","Bezahlung","Versand","Abschluss"];
  var sn=document.getElementById("vk-step-name");if(sn)sn.textContent=snames[vkStep-1]||"";
  var bb=document.getElementById("vk-back-btn");if(bb)bb.disabled=(vkStep===1);
  var nb=document.getElementById("vk-next-btn");if(nb)nb.style.display=(vkStep<vkTotalSteps?"inline-flex":"none");
  var sb=document.getElementById("vk-save-btn");if(sb)sb.style.display=(vkStep===vkTotalSteps?"inline-flex":"none");
  // Step 3: update payment options based on platform
  if(vkStep===3)_updateVKBezahlOpts();
  // Step 4: update lieferstatus wrap
  if(vkStep===4){onVKLieferstatusChange();calcAndShowMarge();}
  // Step 5: show summary
  if(vkStep===5)_buildVKSummary();
  // Step 2: show platform sub-hint
  if(vkStep===2){var p=gv("vk-plattform");if(p)_highlightVKPlattform(p);}
}

function selVKPlattform(p){
  sv2("vk-plattform",p);
  _highlightVKPlattform(p);
}
function _highlightVKPlattform(p){
  ["ka","eb","ab","so"].forEach(function(id){var el=document.getElementById("vkp-"+id);if(el)el.className="cbtn";});
  var map={Kleinanzeigen:"ka",eBay:"eb",Abholung:"ab",Sonstiges:"so"};
  var el=document.getElementById("vkp-"+(map[p]||"so"));if(el)el.className="cbtn vk-sel";
}

function _updateVKBezahlOpts(){
  var p=gv("vk-plattform");
  var opts={
    Kleinanzeigen:["PayPal","Überweisung","Bar (Abholung)"],
    eBay:["eBay-Zahlung","PayPal"],
    Abholung:["Bar"],
    Sonstiges:["PayPal","Überweisung","Bar","Sonstiges"]
  };
  var list=opts[p]||opts.Sonstiges;
  var wrap=document.getElementById("vk-bezahl-opts");if(!wrap)return;
  var cur=gv("vk-bezahlt");
  // Use data-val to avoid onclick string escaping issues
  wrap.innerHTML=list.map(function(o){
    var isSel=(cur===o);
    return'<button class="cbtn'+(isSel?" vk-sel":"")+'" data-bezahl="'+esc(o)+'">'+esc(o)+'</button>';
  }).join("");
  // Event delegation
  wrap.onclick=function(e){
    var btn=e.target.closest("[data-bezahl]");
    if(!btn)return;
    selVKBezahl(btn.getAttribute("data-bezahl"));
  };
  var sub=document.getElementById("vks-3-sub");
  if(sub){var hints={Kleinanzeigen:"PayPal oder Überweisung bereithalten.",eBay:"Zahlung über eBay-System.",Abholung:"Barzahlung bei Übergabe."};sub.textContent=hints[p]||"Zahlungsart wählen.";}
}

function selVKBezahl(v){
  sv2("vk-bezahlt",v);
  _updateVKBezahlOpts();
}

function selVKStatus(v){
  sv2("vk-status",v);
  ["vm","vk","vs","ab"].forEach(function(id){var el=document.getElementById("vkst-"+id);if(el)el.className="cbtn";});
  var map={Vorgemerkt:"vm",Verkauft:"vk",Versendet:"vs",Abgeschlossen:"ab"};
  var el=document.getElementById("vkst-"+(map[v]||"vm"));if(el)el.className="cbtn vk-sel";
  onVKLieferstatusChange();
}

function _buildVKSummary(){
  var s=document.getElementById("vk-summary");if(!s)return;
  var items=[
    ["Produkt",gv("vk-produkte")],["Preis",gv("vk-preis")?"€"+gv("vk-preis"):"–"],
    ["Plattform",gv("vk-plattform")],["Käufer",gv("vk-kunde")||"–"],
    ["Bezahlt mit",gv("vk-bezahlt")||"–"],["Status",gv("vk-status")],
    ["Versand",gv("vk-abholung")]
  ];
  if(gv("vk-sende"))items.push(["Sendenummer",gv("vk-sende")]);
  s.innerHTML=items.map(function(r){return'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px"><span style="color:var(--text2)">'+esc(r[0])+'</span><span style="font-weight:700;color:var(--text)">'+esc(r[1])+'</span></div>';}).join("");
}



// ================================================================
// PRODUCT DETAIL OVERLAY (Fix 5)
// ================================================================
var detailItem=null;

function openDetail(rIdx){
  var item=cardRegistry[rIdx];if(!item)return;
  detailItem=item;
  var nm=item.name||item.spiel||item.modell||item.geraet||"–";
  document.getElementById("detail-header-title").textContent=nm;
  document.getElementById("detail-title").textContent=nm;
  // Edit button
  var eb=document.getElementById("detail-edit-btn");
  if(eb)eb.onclick=function(){closeDetail();openEditStepper(rIdx);};

  // Price
  var sugPrice=_getSuggestedPrice(item);
  var kaPreis=item.kaPreis||"";
  var kaTyp=item.kaPreisTyp||"";
  var pp=document.getElementById("detail-price");
  var ps=document.getElementById("detail-price-sub");
  if(kaPreis){
    pp.textContent=kaPreis+"€"+(kaTyp?" ("+kaTyp+")":"");
    pp.style.color="var(--acc)";
    var subParts=[];
    if(item.einkaufspreis && parseFloat(item.einkaufspreis)>0) subParts.push("EK: "+item.einkaufspreis+"€");
    if(sugPrice) subParts.push("Empfehlung: "+sugPrice);
    ps.textContent=subParts.join(" · ");
  } else if(item.einkaufspreis && parseFloat(item.einkaufspreis)>0){
    // Show EK price when no KA price set
    pp.textContent=item.einkaufspreis+"€";
    pp.style.color="var(--col-y)";
    ps.textContent="Einkaufspreis"+(sugPrice?" · Empfehlung: "+sugPrice:"");
  } else if(sugPrice){
    pp.textContent=sugPrice;
    pp.style.color="var(--col-y)";
    ps.textContent="Vorgeschlagener Verkaufspreis";
  } else {
    pp.textContent="Kein Preis eingetragen";
    pp.style.color="var(--w4)";
    ps.textContent="Einkaufspreis im Stepper nachtragen";
  }

  // Kleinanzeigen Badge
  var kab=document.getElementById("detail-ka-badge");
  var isDone=(item.kleinanzeigen||"").toLowerCase().includes("hochgeladen")||item.kleinanzeigen==="ja";
  kab.innerHTML=isDone?'<span class="av-badge av-v"><i class="bi bi-check-circle-fill me-1"></i>Bei Kleinanzeigen hochgeladen</span>':'<span class="av-badge av-n"><i class="bi bi-x-circle-fill me-1"></i>Noch nicht hochgeladen</span>';

  // Photo tabs
  var photoTabsEl=document.getElementById("detail-photo-tabs");
  var heroEl=document.getElementById("detail-hero");
  var thumbsEl=document.getElementById("detail-thumbs");
  var kaFotos=item.kaFotos||[];
  var defFotos=item.fotos||[];
  // Show photo tab switcher
  if(photoTabsEl){
    var hasBoth=kaFotos.length>0 && defFotos.length>0;
    photoTabsEl.style.display=hasBoth?"flex":"none";
    if(hasBoth){
      photoTabsEl.innerHTML="";
    [["anzeige","📸 ANZEIGENFOTOS"],["defekt","⚠️ DEFEKTFOTOS"]].forEach(function(pair){
      var btn=document.createElement("button");
      btn.id="ftab-"+pair[0];
      btn.style.cssText="flex:1;padding:7px 6px;border:none;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.5px;background:"+(pair[0]==="anzeige"?"var(--b3)":"none")+";color:"+(pair[0]==="anzeige"?"var(--acc)":"var(--w4)")+";border-bottom:"+(pair[0]==="anzeige"?"2px solid var(--acc)":"2px solid transparent");
      btn.textContent=pair[1];
      (function(mode){btn.onclick=function(){detailShowFotoTab(mode);};})(pair[0]);
      photoTabsEl.appendChild(btn);
    });
    }
  }
  var _detailFotoMode="anzeige";
  function detailShowFotoTab(mode){
    _detailFotoMode=mode;
    ["anzeige","defekt"].forEach(function(t){
      var btn=document.getElementById("ftab-"+t);
      if(btn){
        btn.style.background=t===mode?"var(--b3)":"none";
        btn.style.color=t===mode?"var(--acc)":"var(--w4)";
        btn.style.borderBottom=t===mode?"2px solid var(--acc)":"2px solid transparent";
      }
    });
    var showFotos=mode==="anzeige"?kaFotos:defFotos;
    if(showFotos.length>0){
      heroEl.innerHTML='<img src="'+esc(showFotos[0])+'" style="width:100%;height:100%;object-fit:cover"/>';
      heroEl.className="detail-hero";
      if(showFotos.length>1){
        thumbsEl.style.display="flex";
        thumbsEl.innerHTML=showFotos.map(function(b,i){return'<div class="detail-photo-thumb'+(i===0?" active":"")+'" data-src="'+esc(b)+'"><img src="'+esc(b)+'"/></div>';}).join("");
        thumbsEl.onclick=function(e){var t=e.target.closest(".detail-photo-thumb");if(!t)return;detailSetHeroImg(t,t.getAttribute("data-src"));};
      } else {thumbsEl.style.display="none";}
    } else {
      heroEl.className="detail-hero-empty";heroEl.innerHTML="📦";
      thumbsEl.style.display="none";
    }
  };
  window.detailSetHeroImg=function(el,src){
    heroEl.innerHTML='<img src="'+esc(src)+'" style="width:100%;height:100%;object-fit:cover"/>';
    thumbsEl.querySelectorAll(".detail-photo-thumb").forEach(function(t){t.classList.remove("active");});
    el.classList.add("active");
  };
  var allFotos=kaFotos.concat(defFotos);
  // Initial display: show anzeige fotos first, fallback to defekt
  if(kaFotos.length>0){ detailShowFotoTab("anzeige"); }
  else if(defFotos.length>0){ detailShowFotoTab("defekt"); }
  else { heroEl.className="detail-hero-empty";heroEl.innerHTML="📦"; thumbsEl.style.display="none"; }

  // KA Photos separate
  var upWrap=document.getElementById("detail-upload-photos-wrap");
  var upEl=document.getElementById("detail-upload-photos");
  if(kaFotos.length>0){
    upWrap.style.display="block";
    upEl.innerHTML=kaFotos.map(function(b,i){return'<div class="card-foto" onclick="openLightboxDirect(\'"+b+"\')" style="width:64px;height:64px"><img src="'+esc(b)+'"/></div>';}).join("");
  } else {upWrap.style.display="none";}

  // Links
  var linksWrap=document.getElementById("detail-links-wrap");
  var linksEl=document.getElementById("detail-links");
  var links=item.kaLinks||[];
  if(typeof links==="string")try{links=JSON.parse(links);}catch(e){links=links?[links]:[];}
  if(links.length>0){
    linksWrap.style.display="block";
    linksEl.innerHTML=links.map(function(l){return'<a href="'+esc(l)+'" target="_blank" class="btn btn-outline-primary btn-sm w-100 mb-1"><i class="bi bi-box-arrow-up-right me-1"></i>'+esc(l.length>40?l.substring(0,40)+"…":l)+'</a>';}).join("");
  } else {linksWrap.style.display="none";}

  // Specs
  var specs=_buildSpecs(item);
  document.getElementById("detail-specs").innerHTML=specs;

  // Defekt fotos
  var dw=document.getElementById("detail-defekt-wrap");
  var df=document.getElementById("detail-defekt-fotos");
  if(defFotos.length>0){
    dw.style.display="block";
    df.innerHTML=defFotos.map(function(b){return'<div class="card-foto" onclick="openLightboxDirect(\'"+b+"\')" style="width:64px;height:64px"><img src="'+esc(b)+'"/></div>';}).join("");
  } else {dw.style.display="none";}

  // Notes
  var note=item.problemBeschr||item.hinweise||"";
  var nw=document.getElementById("detail-notes");
  if(note){nw.style.display="block";nw.innerHTML='<i class="bi bi-chat-text me-1"></i>'+esc(note);}
  else{nw.style.display="none";}

  document.getElementById("detail-overlay").classList.add("open");
}

function detailSetHero(idx){
  var item=detailItem;if(!item)return;
  var kaFotos=item.kaFotos||[];var defFotos=item.fotos||[];
  var all=kaFotos.concat(defFotos);
  if(!all[idx])return;
  var heroEl=document.getElementById("detail-hero");
  heroEl.innerHTML='<img src="'+esc(all[idx])+'" style="width:100%;height:100%;object-fit:cover"/>';
  document.querySelectorAll("#detail-thumbs .detail-photo-thumb").forEach(function(el,i){el.classList.toggle("active",i===idx);});
}

function openLightboxDirect(b64){
  var lb=document.createElement("div");lb.className="lightbox";lb.innerHTML='<img src="'+esc(b64)+'" alt="Foto"/>';lb.onclick=function(){lb.remove();};document.body.appendChild(lb);
}

function closeDetail(){
  document.getElementById("detail-overlay").classList.remove("open");
  detailItem=null;
}

function detailEdit(){
  // handled by onclick on edit button
}

function _getSuggestedPrice(item){
  var PREISE={konsole:{Neuwertig:"180–250€","Sehr gut":"120–180€",Gut:"80–130€",Akzeptabel:"40–80€",Defekt:"10–30€"},spiel:{Neuwertig:"25–45€","Sehr gut":"15–25€",Gut:"8–15€",Akzeptabel:"3–8€",Defekt:"1–3€"},handy:{Neuwertig:"200–400€","Sehr gut":"120–200€",Gut:"70–120€",Akzeptabel:"30–70€",Defekt:"10–30€"},pc:{Neuwertig:"400–800€","Sehr gut":"250–400€",Gut:"150–250€",Akzeptabel:"80–150€",Defekt:"20–60€"}};
  var t=PREISE[item.type];if(!t)return"";
  return t[item.zustand]||"";
}

function _buildSpecs(item){
  var rows=[];
  function row(k,v){if(v&&String(v).trim())rows.push('<div class="detail-spec"><span class="detail-spec-key">'+esc(k)+'</span><span class="detail-spec-val">'+esc(String(v))+'</span></div>');}
  row("Datum",item.datum);row("Mitarbeiter",item.mitarbeiter);row("Zustand",item.zustand);
  if(item.type==="konsole"){row("Speicher",item.speicherGB?(item.speicherGB+" GB"):"");row("Farbe",item.farbe);}
  if(item.type==="spiel"){row("System",item.system);row("USK",item.usk);row("Sprache",item.sprache);}
  if(item.type==="handy"){row("Speicher",item.speicherGB?(item.speicherGB+" GB"):"");row("RAM",item.ram?(item.ram+" GB"):"");row("Farbe",item.farbe);row("Netzwerk",item.netzwerk);row("IMEI",item.imei);}
  if(item.type==="pc"){row("Typ",item.typ_);row("Prozessor",item.prozessor);row("RAM",item.ram?(item.ram+" GB"):"");row("Speicher",item.speicherGB?(item.speicherGB+" GB"):"");row("GPU",item.grafikkarte);row("OS",item.betriebssystem);}
  if(item.problemTyp)row("Problemtyp",item.problemTyp);
  row("Kategorien",item.kategorien);
  if(item.scanId)row("Scan-ID",item.scanId);
  return rows.join("");
}

// ================================================================
// UPLOAD WIZARD
// ================================================================
var uwStep=1, uwTotalSteps=3, uwSelectedItems=[], uwPhotos=[], uwPlattform="";

function openUploadWizard(){
  uwStep=1;uwSelectedItems=[];uwPhotos=[];uwPlattform="";
  document.getElementById("mode-chooser").style.display="block";
  // If allItems empty, load first
  if(!allItems.length){loadAll();setTimeout(function(){_initUWItems();},2000);}
  else{_initUWItems();}
  document.getElementById("upload-wizard").classList.add("open");
  _renderUWStep();
}
function closeUploadWizard(){
  document.getElementById("upload-wizard").classList.remove("open");
}
function _initUWItems(){
  // Only items not yet uploaded
  window._uwAllItems=allItems.filter(function(i){
    return i.type!=="defekt"&&!(i.kleinanzeigen||"").toLowerCase().includes("hochgeladen")&&i.kleinanzeigen!=="ja";
  });
  _renderUWItemList(window._uwAllItems);
}
function filterUWItems(){
  var q=(document.getElementById("uw-search")||{value:""}).value.toLowerCase();
  var items=window._uwAllItems||[];
  _renderUWItemList(q?items.filter(function(i){var nm=i.name||i.spiel||i.modell||"";return nm.toLowerCase().includes(q)||(i.scanId||"").toLowerCase().includes(q);}):items);
}
function _renderUWItemList(items){
  var el=document.getElementById("uw-items");if(!el)return;
  if(!items.length){el.innerHTML='<div class="empty"><i class="bi bi-check-circle"></i><p>Alle Artikel bereits hochgeladen!</p></div>';return;}
  el.innerHTML=items.map(function(item,idx){
    var nm=item.name||item.spiel||item.modell||"–";
    var isSelected=uwSelectedItems.some(function(s){return s.rowIndex===item.rowIndex&&s.type===item.type;});
    var chk=isSelected?'<div class="upload-item-check checked"><i class="bi bi-check"></i></div>':'<div class="upload-item-check"></div>';
    return'<div class="upload-item" data-type="'+esc(item.type)+'" data-row="'+item.rowIndex+'" onclick="uwItemClick(this)">'+chk
      +'<div><div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(nm)+'</div>'
      +'<div style="font-size:11px;color:var(--text3)">'+esc(item.datum||"")+' · '+esc(item.zustand||"")+'</div></div></div>';
  }).join("");
  _updateUWSelCount();
}
function uwItemClick(el){
  var type=el.getAttribute("data-type");
  var rowIndex=parseInt(el.getAttribute("data-row"));
  toggleUWItem(el,type,rowIndex);
}
function toggleUWItem(el,type,rowIndex){
  var idx=uwSelectedItems.findIndex(function(s){return s.rowIndex===rowIndex&&s.type===type;});
  var item=(window._uwAllItems||[]).find(function(i){return i.rowIndex===rowIndex&&i.type===type;});
  if(!item)return;
  if(idx>-1){uwSelectedItems.splice(idx,1);}else{uwSelectedItems.push(item);}
  // Update UI
  var check=el.querySelector(".upload-item-check");
  var isNowSelected=uwSelectedItems.some(function(s){return s.rowIndex===rowIndex&&s.type===type;});
  if(check){check.className="upload-item-check"+(isNowSelected?" checked":"");check.innerHTML=isNowSelected?'<i class="bi bi-check"></i>':""; }
  _updateUWSelCount();
}
function _updateUWSelCount(){var el=document.getElementById("uw-selected-cnt");if(el)el.textContent=uwSelectedItems.length;}

function selUWPlattform(p){
  uwPlattform=p;
  sv2("uw-plattform",p);
  ["ka","eb","fb","so"].forEach(function(id){var el=document.getElementById("uwp-"+id);if(el)el.className="cbtn";});
  var map={Kleinanzeigen:"ka",eBay:"eb",Facebook:"fb",Sonstiges:"so"};
  var el=document.getElementById("uwp-"+(map[p]||"so"));if(el)el.className="cbtn vk-sel";
  _renderUWPriceList();
}
function _renderUWPriceList(){
  var el=document.getElementById("uw-price-list");if(!el)return;
  el.innerHTML=uwSelectedItems.map(function(item,i){
    var nm=item.name||item.spiel||item.modell||"–";
    var sug=_getSuggestedPrice(item);
    return'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">'+esc(nm)+'</div>'
      +(sug?'<div style="font-size:11px;color:var(--text3);margin-bottom:5px">Vorschlag: '+esc(sug)+'</div>':"")
      +'<div style="display:flex;gap:6px;align-items:center">'
      +'<input type="number" class="fc" id="uw-preis-'+i+'" placeholder="Preis (€)" style="flex:1"/>'
      +'<select class="fc" id="uw-typ-'+i+'" style="max-width:120px"><option value="VB">VB</option><option value="Festpreis">Festpreis</option></select>'
      +'</div></div>';
  }).join("");
}

function _renderUWLinkList(){
  var el=document.getElementById("uw-link-list");if(!el)return;
  el.innerHTML=uwSelectedItems.map(function(item,i){
    var nm=item.name||item.spiel||item.modell||"–";
    return'<div style="margin-bottom:10px">'
      +'<label class="fl" style="margin-bottom:4px">'+esc(nm)+' – Anzeigen-Link</label>'
      +'<input type="url" class="fc" id="uw-link-'+i+'" placeholder="https://www.kleinanzeigen.de/…"/></div>';
  }).join("");
}

function uwStepNav(dir){
  var d=document.getElementById("uw-diag");if(d)d.style.display="none";
  if(dir>0){
    if(uwStep===1&&uwSelectedItems.length===0){if(d){d.className="diag derr";d.textContent="Bitte mind. 1 Artikel auswählen.";d.style.display="block";}return;}
    if(uwStep===2&&!uwPlattform){if(d){d.className="diag derr";d.textContent="Bitte Plattform auswählen.";d.style.display="block";}return;}
  }
  uwStep=Math.max(1,Math.min(uwTotalSteps,uwStep+dir));
  _renderUWStep();
}
function _renderUWStep(){
  for(var i=1;i<=uwTotalSteps;i++){var el=document.getElementById("uws-"+i);if(el)el.style.display=(i===uwStep?"block":"none");}
  var pct=Math.round((uwStep/uwTotalSteps)*100);
  var pb=document.getElementById("uw-prog");if(pb)pb.style.width=pct+"%";
  var sl=document.getElementById("uw-step-lbl");if(sl)sl.textContent="Schritt "+uwStep+" von "+uwTotalSteps;
  var bb=document.getElementById("uw-back-btn");if(bb)bb.disabled=(uwStep===1);
  var nb=document.getElementById("uw-next-btn");if(nb)nb.style.display=(uwStep<uwTotalSteps?"inline-flex":"none");
  var sb=document.getElementById("uw-save-btn");if(sb)sb.style.display=(uwStep===uwTotalSteps?"inline-flex":"none");
  if(uwStep===2){_renderUWPriceList();}
  if(uwStep===3){_renderUWLinkList();}
}

function triggerUWPhoto(){
  var inp=document.createElement("input");inp.type="file";inp.accept="image/*";
  inp.onchange=function(){if(this.files&&this.files[0])_processUWPhoto(this.files[0]);};
  inp.click();
}
function _processUWPhoto(file){
  var img=new Image(),url=URL.createObjectURL(file);
  img.onload=function(){
    URL.revokeObjectURL(url);
    var MAX=800,w=img.width,h=img.height;
    if(w>MAX||h>MAX){if(w>h){h=Math.round(h*(MAX/w));w=MAX;}else{w=Math.round(w*(MAX/h));h=MAX;}}
    var canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    canvas.getContext("2d").drawImage(img,0,0,w,h);
    var b64=canvas.toDataURL("image/jpeg",0.72);
    uwPhotos.push(b64);_renderUWPhotoThumbs();
  };
  img.src=url;
}
function _renderUWPhotoThumbs(){
  var el=document.getElementById("uw-photo-thumbs");if(!el)return;
  el.innerHTML=uwPhotos.map(function(b,i){
    return'<div class="photo-thumb"><img src="'+esc(b)+'"/><button class="rm-thumb" onclick="uwPhotos.splice('+i+',1);_renderUWPhotoThumbs()">✕</button></div>';
  }).join('')+('<div class="add-thumb" onclick="triggerUWPhoto()"><i class="bi bi-plus"></i></div>');
}

function saveUploadWizard(){
  if(!uwSelectedItems.length){toast("Keine Artikel ausgewählt","err");return;}
  var btn=document.getElementById("uw-save-btn");if(btn)btn.disabled=true;
  var saved=0,total=uwSelectedItems.length;
  uwSelectedItems.forEach(function(item,i){
    var preis=(document.getElementById("uw-preis-"+i)||{value:""}).value;
    var typ=(document.getElementById("uw-typ-"+i)||{value:"VB"}).value;
    var link=(document.getElementById("uw-link-"+i)||{value:""}).value;
    // Build update data
    var d={type:item.type,rowIndex:item.rowIndex,status:"hochgeladen",
           kaPreis:preis,kaPreisTyp:typ,
           kaLinks:link?JSON.stringify([link]):JSON.stringify([]),
           kaFotos:JSON.stringify(uwPhotos),
           plattform:uwPlattform};
    gasGet("updateKleinanzeigen",d,function(r){
      if(r&&r.ok){
        // Update local cache
        for(var j=0;j<allItems.length;j++){
          if(allItems[j].type===item.type&&allItems[j].rowIndex===item.rowIndex){
            allItems[j].kleinanzeigen="hochgeladen";
            allItems[j].kaPreis=preis;allItems[j].kaPreisTyp=typ;
            allItems[j].kaLinks=link?[link]:[];
            allItems[j].kaFotos=uwPhotos;
            break;
          }
        }
      }
      saved++;
      if(saved===total){
        toast(total+" Artikel als hochgeladen markiert ✅","ok");
        closeUploadWizard();
        buildKAProgress();
        renderList();
        if(btn)btn.disabled=false;
      }
    },function(){saved++;if(saved===total&&btn)btn.disabled=false;});
  });
}



// ================================================================
// MITARBEITER STATS & PROFIL
// ================================================================
var mitarbeiterStats = [];

function loadMitarbeiterStats() {
  gasGet("getMitarbeiterStats", {}, function(r) {
    if (!r || !r.ok) return;
    mitarbeiterStats = r.data || [];
    renderTeamPerf();
  }, function() {});
}

function renderTeamPerf() {
  var el = document.getElementById("team-perf-body");
  if (!el) return;
  if (!mitarbeiterStats.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">Keine Daten</div>';
    return;
  }
  var maxE = Math.max.apply(null, mitarbeiterStats.map(function(m){return m.eingelagert||0;})) || 1;
  el.innerHTML = mitarbeiterStats.slice(0,8).map(function(m) {
    var ini = (m.name||"?").split(" ").map(function(w){return w[0]||"";}).join("").toUpperCase().substring(0,2);
    var pct = Math.round(((m.eingelagert||0)/maxE)*100);
    return '<div class="perf-row">'
      + '<div class="perf-avatar" style="cursor:pointer" onclick="openProfilFor(this.dataset.name)" data-name="' + esc(m.name) + '">' + esc(ini) + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:3px">'
      + '<span style="font-size:12px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.name) + '</span>'
      + '<span style="font-size:11px;color:var(--text3);white-space:nowrap">'
      + (m.eingelagert||0) + '📦 ' + (m.verkauft||0) + '💸</span>'
      + '</div>'
      + '<div class="perf-bar-wrap"><div class="perf-bar" style="width:' + pct + '%"></div></div>'
      + '</div></div>';
  }).join("");
}

function openProfil() {
  openProfilFor(emp);
}

function openProfilFor(name) {
  if (!name) return;
  var stat = mitarbeiterStats.find(function(m) { return m.name === name; });
  var ini = name.split(" ").map(function(w){return w[0]||"";}).join("").toUpperCase().substring(0,2);
  var av = document.getElementById("profil-avatar"); if(av) av.textContent = ini;
  var pn = document.getElementById("profil-name"); if(pn) pn.textContent = name;
  var pe = document.getElementById("ps-eingelagert"); if(pe) pe.textContent = stat ? (stat.eingelagert||0) : "–";
  var pv = document.getElementById("ps-verkauft"); if(pv) pv.textContent = stat ? (stat.verkauft||0) : "–";
  var pr = document.getElementById("ps-retouren"); if(pr) pr.textContent = stat ? (stat.retouren||0) : "–";
  // 7-day stats
  var sevenAgo=new Date();sevenAgo.setDate(sevenAgo.getDate()-7);
  var ein7=0,vk7=0;
  allItems.forEach(function(item){if((item.mitarbeiter||"").toLowerCase()!==name.toLowerCase())return;if(!item.datum)return;var pts=item.datum.split(".");if(pts.length<3)return;var dd=new Date(pts[2].split(" ")[0],pts[1]-1,pts[0]);if(dd>=sevenAgo)ein7++;});
  (allVerkauf||[]).forEach(function(v){if((v.mitarbeiter||"").toLowerCase()!==name.toLowerCase())return;if(!v.datum)return;var pts=v.datum.split(".");if(pts.length<3)return;var dd=new Date(pts[2].split(" ")[0],pts[1]-1,pts[0]);if(dd>=sevenAgo)vk7++;});
  var p7e=document.getElementById("ps-7d-eingelagert");if(p7e)p7e.textContent=ein7;
  var p7v=document.getElementById("ps-7d-verkauft");if(p7v)p7v.textContent=vk7;
  // Load activity log
  var logEl = document.getElementById("profil-log");
  if (logEl) logEl.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px"><span class="spin-b"></span> Lade…</div>';
  gasGet("getActivityLog", {mitarbeiter: name}, function(r) {
    if (!logEl) return;
    if (!r || !r.ok || !r.data || !r.data.length) {
      logEl.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">Keine Aktivitäten</div>';
      return;
    }
    logEl.innerHTML = "";
    r.data.forEach(function(entry) {
      var dotCls = "log-" + (entry.typ||"info");
      var isLager = entry.typ==="lager" && entry.details;
      var item = document.createElement("div");
      item.className = "log-item";
      if(isLager) item.style.cursor = "pointer";
      item.innerHTML = '<div class="log-dot ' + dotCls + '"></div>'
        + '<div style="flex:1">'
        + '<div style="font-size:12px;font-weight:700;color:var(--w1)">' + esc(entry.aktion||"") + '</div>'
        + '<div style="font-size:11px;color:var(--w3)">' + esc(entry.details||"") + '</div>'
        + '<div style="font-size:10px;color:var(--w4);margin-top:1px;font-family:monospace">' + esc(entry.datum||"") + '</div></div>'
        + (isLager ? '<div style="font-size:10px;color:var(--acc);font-family:monospace;white-space:nowrap;align-self:center">→ LAGER</div>' : "");
      if(isLager){
        (function(details,typ){
          item.onclick = function(){
            // Close profil, go to lager, search for item
            document.getElementById("profil-overlay").classList.remove("open");
            goTabFn("list-panel","all");
            var cat = typ==="lager"?"all":"all";
            setTimeout(function(){
              var qEl = document.getElementById("list-q");
              if(qEl){ qEl.value=details; renderList(); }
            }, 150);
          };
        })(entry.details, entry.typ);
      }
      logEl.appendChild(item);
    });
  }, function() {});
  document.getElementById("profil-overlay").classList.add("open");
}

// ================================================================
// REKLAMATION
// ================================================================
var editRTItem = null;







// ================================================================
// GLOBAL CAMERA PICKER
// ================================================================
function initGlobalCamList() {
  _fillCamSelects();
}

function refreshCamList() {
  // Request camera permission first (needed to get labels)
  navigator.mediaDevices.getUserMedia({video:true}).then(function(stream){
    stream.getTracks().forEach(function(t){t.stop();});
    _fillCamSelects();
  }).catch(function(){_fillCamSelects();});
}

function _fillCamSelects() {
  if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then(function(devices){
    var vids = devices.filter(function(d){return d.kind==="videoinput";});
    var targets = [
      document.getElementById("cam-preselect"),
      document.getElementById("global-cam-select")
    ];
    targets.forEach(function(sel){
      if(!sel) return;
      var prev = sel.value;
      sel.innerHTML = "";
      if(!vids.length){
        sel.innerHTML='<option value="">Keine Kamera gefunden</option>';
        return;
      }
      vids.forEach(function(d,i){
        var opt = document.createElement("option");
        opt.value = d.deviceId;
        var lbl = d.label || ("Kamera "+(i+1));
        var back = /back|rear|environment|rück/i.test(lbl);
        opt.textContent = (back?"🔙 ":"🤳 ")+lbl;
        if(d.deviceId===prev) opt.selected=true;
        sel.appendChild(opt);
      });
      // Auto-select back camera if nothing was previously selected
      if(!prev){
        var backOpt = Array.from(sel.options).find(function(o){return /back|rear|environment|rück/i.test(o.textContent);});
        if(backOpt) backOpt.selected=true;
        else if(sel.options.length>0) sel.options[0].selected=true;
      }
      if(sel.value && !firstCamDeviceId) firstCamDeviceId=sel.value;
    });
  }).catch(function(){});
}

function showGlobalCamBar() {
  var bar = document.getElementById("global-cam-bar");
  if (bar) { bar.style.display = "flex"; }
}
function hideGlobalCamBar() {
  var bar = document.getElementById("global-cam-bar");
  if (bar) bar.style.display = "none";
}
function onGlobalCamChange() {
  var sel = document.getElementById("global-cam-select");
  if (sel && sel.value) {
    firstCamDeviceId = sel.value;
    var pre = document.getElementById("cam-preselect");
    if (pre) pre.value = sel.value;
  }
}

// ================================================================
// VERKAUF MARGE ANZEIGE im VK Stepper Step 4
// ================================================================
function calcAndShowMarge() {
  var vp = parseFloat(gv("vk-preis")||0);
  var ep = parseFloat(gv("vk-ep")||0);
  var vs = parseFloat(gv("vk-versand")||0);
  var plattform = gv("vk-plattform")||"";
  var feeRates = {"eBay":0.13,"Kleinanzeigen":0,"Facebook":0,"Abholung":0,"Sonstiges":0};
  var fee = Math.round(vp * (feeRates[plattform]||0) * 100) / 100;
  var marge = Math.round((vp - ep - vs - fee) * 100) / 100;
  var box = document.getElementById("vk-marge-box");
  var val = document.getElementById("vk-marge-val");
  var sub = document.getElementById("vk-marge-sub");
  if (!box) return;
  if (vp > 0 && ep > 0) {
    box.style.display = "block";
    box.className = "marge-badge " + (marge >= 0 ? "marge-pos" : "marge-neg");
    val.textContent = (marge >= 0 ? "+" : "") + marge.toFixed(2) + " €";
    var msg = marge > 0 ? "🎉 Glückwunsch! Gewinn erzielt." : marge === 0 ? "⚠️ Nullsumme – kein Gewinn." : "❌ Verlust! Preis prüfen.";
    if (fee > 0) msg += " (Gebühr: " + fee.toFixed(2) + "€)";
    sub.textContent = msg;
  } else {
    box.style.display = "none";
  }
}

// VK Stepper Einkaufspreis: injected directly into HTML step 4 and saveVKForm

// loadMitarbeiterStats is called from home panel refresh button and setGreeting

// Einkaufspreis chip is added inline in mkCard directly



// ================================================================
// PHASE 2: ACCOUNT SYSTEM
// ================================================================
function openAccModal(){
  setAccTab("team");
  loadServerAccounts();
  document.getElementById("acc-modal").classList.add("open");
  // Show/hide invite tab based on role
  var inviteTab = document.getElementById("acctab-invite");
  if(inviteTab) inviteTab.style.display = empRolle==="owner" ? "block" : "none";
}

function setAccTab(tab){
  ["team","invite","reports"].forEach(function(t){
    var btn = document.getElementById("acctab-"+t);
    var panel = document.getElementById("accpanel-"+t);
    var isActive = t===tab;
    if(btn){
      btn.style.background = isActive?"var(--b3)":"none";
      btn.style.color = isActive?"var(--acc)":"var(--w4)";
      btn.style.borderBottom = isActive?"2px solid var(--acc)":"2px solid transparent";
    }
    if(panel) panel.style.display = isActive?"block":"none";
  });
}
// closeAccModal replaced by Phase 2 version

function loadServerAccounts(){
  gasGet("getAccounts",{},function(r){
    if(!r||!r.ok) return;
    renderServerAccounts(r.data||[]);
  },function(){});
}




function sendInvite(){
  var name=document.getElementById("acc-name-in").value.trim();
  var email=document.getElementById("acc-email-in").value.trim();
  var rolle=document.getElementById("acc-rolle-in").value;
  var diag=document.getElementById("acc-diag");
  if(!name||!email){diag.className="diag derr";diag.textContent="Name und E-Mail erforderlich.";diag.style.display="block";return;}
  var btn=document.querySelector("#acc-modal .btn-primary");setBL(btn,true);
  gasGet("createAccount",{name:name,email:email,rolle:rolle},function(r){
    setBL(btn,false);
    if(r&&r.ok){
      diag.className="diag dok";diag.textContent="✅ "+r.msg;diag.style.display="block";
      document.getElementById("acc-name-in").value="";
      document.getElementById("acc-email-in").value="";
      loadServerAccounts();
    } else {
      diag.className="diag derr";diag.textContent="❌ "+(r?r.fehler:"Fehler");diag.style.display="block";
    }
  },function(e){setBL(btn,false);toast("Fehler: "+e,"err");});
}

function deleteServerAccount(email){
  if(!confirm("Account von "+email+" wirklich löschen?")) return;
  gasGet("deleteAccount",{email:email},function(r){
    if(r&&r.ok){toast(r.msg,"ok");loadServerAccounts();}
    else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}

function triggerPDFExport(){
  var btn=event.target;var orig=btn.innerHTML;setBL(btn,true);
  gasGet("triggerMonthlyExport",{},function(r){
    setBL(btn,false,orig);
    if(r&&r.ok)toast(r.msg,"ok",5000);
    else toast("Fehler: "+(r?r.fehler:"?"),"err");
  },function(e){setBL(btn,false,orig);toast("Fehler: "+e,"err");});
}

// ================================================================
// PHASE 2: ACTIVATION FLOW
// ================================================================
function showActivationFlow(token){
  document.getElementById("act-token").value=token;
  var s=document.getElementById("emp-scr");if(s)s.classList.add("hidden");
  var ao=document.getElementById("activation-overlay");if(ao)ao.style.display="block";
}

function doActivation(){
  var token=document.getElementById("act-token").value;
  var name=document.getElementById("act-name").value.trim();
  var pw=document.getElementById("act-pw").value;
  var pw2=document.getElementById("act-pw2").value;
  var chk=document.getElementById("act-chk").checked;
  var diag=document.getElementById("act-diag");
  diag.style.display="none";
  if(!name){diag.className="diag derr";diag.textContent="Bitte Namen eingeben.";diag.style.display="block";return;}
  if(pw.length<6){diag.className="diag derr";diag.textContent="Passwort mind. 6 Zeichen.";diag.style.display="block";return;}
  if(pw!==pw2){diag.className="diag derr";diag.textContent="Passwörter stimmen nicht überein.";diag.style.display="block";return;}
  if(!chk){diag.className="diag derr";diag.textContent="Bitte Haftungserklärung akzeptieren.";diag.style.display="block";return;}
  var btn=document.getElementById("act-btn");setBL(btn,true);
  gasPost("activateAccount",{token:token,password:pw,name:name},function(r){
    setBL(btn,false);
    if(r&&r.ok){
      diag.className="diag dok";
      diag.textContent="✅ "+r.msg;
      diag.style.display="block";
      btn.innerHTML="<i class='bi bi-house-fill me-1'></i>Zur App";
      btn.onclick=function(){
        document.getElementById("activation-overlay").style.display="none";
        // Auto-fill name and show login
        var ni=document.getElementById("emp-in");if(ni)ni.value=r.name||name;
        var s=document.getElementById("emp-scr");if(s)s.classList.remove("hidden");
        // Clean URL
        history.replaceState({},"",location.pathname);
      };
    } else {
      diag.className="diag derr";diag.textContent="❌ "+(r?r.fehler:"Fehler.");diag.style.display="block";
    }
  },function(e){setBL(btn,false);var d=document.getElementById("act-diag");d.className="diag derr";d.textContent="Verbindungsfehler: "+e;d.style.display="block";});
}

// ================================================================
// PHASE 2: PFLICHT-BENACHRICHTIGUNGEN
// ================================================================
var pendingNotifs=[], currentNotifIdx=0;

function checkUnconfirmedNotifs(){
  if(!emp) return;
  gasGet("getUnconfirmed",{mitarbeiter:emp},function(r){
    if(!r||!r.ok) return;
    var unconf=(r.data||[]).filter(function(n){return n.typ!=="email"&&n.typ!=="success";});
    if(!unconf.length) return;
    pendingNotifs=unconf;
    currentNotifIdx=0;
    showNextMandatoryNotif();
  },function(){});
}

function showNextMandatoryNotif(){
  if(currentNotifIdx>=pendingNotifs.length){
    document.getElementById("mandatory-notif-overlay").style.display="none";
    return;
  }
  var n=pendingNotifs[currentNotifIdx];
  document.getElementById("mn-titel").textContent=n.titel||"Benachrichtigung";
  document.getElementById("mn-body").textContent=n.body||"";
  document.getElementById("mn-date").textContent=n.erstellt||"";
  document.getElementById("mn-counter").textContent=(currentNotifIdx+1)+" von "+pendingNotifs.length+" ausstehend";
  document.getElementById("mandatory-notif-overlay").style.display="flex";
}

function confirmCurrentNotif(){
  var n=pendingNotifs[currentNotifIdx];
  if(!n) return;
  gasGet("confirmNotification",{id:n.id},function(r){
    if(r&&r.ok){
      currentNotifIdx++;
      showNextMandatoryNotif();
    } else {
      toast("Bestätigung fehlgeschlagen.","err");
    }
  },function(){currentNotifIdx++;showNextMandatoryNotif();});
}

// ================================================================
// PHASE 2: PROFIL – CHANGE PASSWORD
// ================================================================
// addAccount handled in Phase 2

function deleteAccount(idx){
  var accs=getAccounts();
  if(!confirm('"'+accs[idx].name+'" wirklich löschen?'))return;
  accs.splice(idx,1);saveAccounts(accs);renderAccList();
}

function toggleAccPw(){
  var i=document.getElementById("acc-pw-in"),e=document.getElementById("acc-pw-eye");
  if(!i||!e)return;var h=i.type==="password";i.type=h?"text":"password";
  e.innerHTML=h?'<i class="bi bi-eye-slash"></i>':'<i class="bi bi-eye"></i>';
}

// Login: lokale Accounts (name+pw) ODER Admin (beliebiger Name + Master-Passwort via GAS)
function doLogin(){
  var input=(document.getElementById("emp-in")||{value:""}).value.trim();
  var pw=(document.getElementById("pw-in")||{value:""}).value.trim();
  var btn=document.getElementById("btn-emp");
  if(!input){showLoginErr("Bitte E-Mail oder Name eingeben.");return;}
  if(!pw){showLoginErr("Bitte Passwort eingeben.");return;}
  setBL(btn,true);
  gasGet("checkPassword",{password:pw,name:input},
    function(r){
      setBL(btn,false);
      if(r&&r.ok){
        document.getElementById("pw-err").style.display="none";
        var loginName=r.name||input;
        if(r.name&&input.indexOf("@")>-1)loginName=r.name;
        applyEmp(loginName,r.rolle||"mitarbeiter");
        toast("Hey "+loginName+" 🚀","ok");
        loadStats();
        checkUnconfirmedNotifs();
      } else {
        showLoginErr("❌ "+(r&&r.fehler?r.fehler:"Falsches Passwort."));
        var p=document.getElementById("pw-in");if(p)p.focus();
      }
    },
    function(e){setBL(btn,false);showLoginErr("⚠️ Verbindungsfehler: "+String(e));}
  );
}

// ── FEATURE: FOTO-ANLEITUNG je Kategorie (Fix 4) ──────────────────
var FOTO_GUIDES={
  konsole:[
    "Vorderseite der Konsole (Gesamtbild)",
    "Beschädigte Stelle aus nächster Nähe",
    "Anschlüsse / Ports (HDMI, USB etc.)",
    "Seriennummer-Aufkleber (Unterseite)"
  ],
  handy:[
    "Display gerade von vorne (Kratzer sichtbar?)",
    "Rückseite (Kamera-Bereich, Gehäuse)",
    "Seiten / Rahmen (Dellen, Kratzer)",
    "Lade-Port aus nächster Nähe"
  ],
  pc:[
    "Gesamtbild des Geräts (Vorderseite)",
    "Beschädigte Stelle aus nächster Nähe",
    "Alle Anschlüsse / I/O-Ports",
    "Seriennummer-Aufkleber"
  ],
  defekt:[
    "Gesamtbild des defekten Geräts",
    "Defekte Stelle aus nächster Nähe",
    "Zweite Perspektive des Defekts"
  ]
};

function showPhotoGuide(type){
  var box=document.getElementById("photo-guide-box");if(!box)return;
  var guide=FOTO_GUIDES[type]||FOTO_GUIDES.defekt;
  box.innerHTML='<div class="photo-guide-title"><i class="bi bi-camera-fill" style="font-size:14px"></i>Foto-Anleitung für '+type.charAt(0).toUpperCase()+type.slice(1)+'</div>'+
    guide.map(function(g,i){return'<div class="photo-guide-item"><div class="photo-guide-num">'+(i+1)+'</div><span>'+esc(g)+'</span></div>';}).join("");
}

// ── FEATURE: PREISVORSCHLAG (Fix 8a) ──────────────────────────────
var PREISE={
  konsole:{Neuwertig:[180,250],Sehrg:[120,180],"Sehr gut":[120,180],Gut:[80,130],Akzeptabel:[40,80],Defekt:[10,30]},
  spiel:{Neuwertig:[25,45],"Sehr gut":[15,25],Gut:[8,15],Akzeptabel:[3,8],Defekt:[1,3]},
  handy:{Neuwertig:[200,400],"Sehr gut":[120,200],Gut:[70,120],Akzeptabel:[30,70],Defekt:[10,30]},
  pc:{Neuwertig:[400,800],"Sehr gut":[250,400],Gut:[150,250],Akzeptabel:[80,150],Defekt:[20,60]}
};

function updatePriceSuggest(){
  var box=document.getElementById("price-suggest-box"),val=document.getElementById("price-suggest-val");
  if(!box||!val)return;
  var zustand=gv("f-zustand")||"";
  var cat=curType;
  var table=PREISE[cat];
  if(!table||!zustand){box.style.display="none";return;}
  var range=table[zustand]||null;
  if(!range){box.style.display="none";return;}
  val.textContent=range[0]+"€ – "+range[1]+"€";
  box.style.display="flex";
}

// ── FEATURE: WÖCHENTLICHER MINI-CHART (Fix 9) ─────────────────────
function buildWeekChart(){
  var chartEl=document.getElementById("week-chart"),labelEl=document.getElementById("week-labels");
  var totalEl=document.getElementById("chart-total");
  if(!chartEl||!allItems.length)return;
  var days=["Mo","Di","Mi","Do","Fr","Sa","So"];
  var counts=[];
  var now=new Date();
  var todayIdx=(now.getDay()+6)%7; // 0=Mo
  for(var i=6;i>=0;i--){
    var d=new Date(now);d.setDate(d.getDate()-i);
    var ds=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
    var cnt=allItems.filter(function(item){return item.datum&&item.datum.startsWith(ds.split(".")[0]+"."+ds.split(".")[1]);}).length;
    counts.push({cnt:cnt,day:days[(d.getDay()+6)%7],isToday:i===0});
  }
  var maxCnt=Math.max.apply(null,counts.map(function(c){return c.cnt;}));
  chartEl.innerHTML=counts.map(function(c){
    var h=maxCnt>0?Math.max(4,Math.round((c.cnt/maxCnt)*44)):4;
    return'<div class="mini-bar'+(c.isToday?" today":"")+(maxCnt===0?" ":" ")+'" style="height:'+h+'px" title="'+c.cnt+' Artikel"></div>';
  }).join("");
  labelEl.innerHTML=counts.map(function(c){
    return'<span style="flex:1;font-size:9px;color:'+(c.isToday?'var(--green)':'var(--text3)')+';text-align:center;font-weight:'+(c.isToday?'700':'400')+'">'+c.day+'</span>';
  }).join("");
  var total7=counts.reduce(function(s,c){return s+c.cnt;},0);
  if(totalEl)totalEl.textContent=total7+" diese Woche";
}

// ── FEATURE: KLEINANZEIGEN FORTSCHRITT (Fix 9) ────────────────────
function buildKAProgress(){
  var bar=document.getElementById("kl-bar"),pct=document.getElementById("kl-pct");
  var done=document.getElementById("kl-done"),todo=document.getElementById("kl-todo");
  if(!bar||!allItems.length)return;
  var relevant=allItems.filter(function(i){return i.type!=="defekt";});
  var hochgeladen=relevant.filter(function(i){return String(i.verfuegbarkeit||"").indexOf("Nicht")===-1&&String(i.verfuegbarkeit||"").length>0;}).length;
  var total=relevant.length;
  var p=total>0?Math.round((hochgeladen/total)*100):0;
  bar.style.width=p+"%";
  if(pct)pct.textContent=p+"% hochgeladen";
  if(done)done.textContent=hochgeladen+" hochgeladen";
  if(todo)todo.textContent=(total-hochgeladen)+" ausstehend";
}

// ── FEATURE: SEARCH SCANNER (Fix 6) ───────────────────────────────
var searchScanStream=null,searchScanRunning=false,searchScanFrame=null;

function openSearchScanner(){
  var overlay=document.getElementById("search-scan-overlay");
  overlay.classList.remove("hidden");
  var video=document.getElementById("search-scan-video");
  var constraints={video:firstCamDeviceId?{deviceId:{exact:firstCamDeviceId}}:{facingMode:{ideal:"environment"}}};
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
    searchScanStream=stream;searchScanRunning=true;
    video.srcObject=stream;
    video.onloadedmetadata=function(){video.play().then(function(){searchScanLoopStart();});};
  }).catch(function(err){
    toast("Kamera: "+String(err),"err");
    closeSearchScanner();
  });
}

function closeSearchScanner(){
  searchScanRunning=false;
  if(searchScanFrame){cancelAnimationFrame(searchScanFrame);searchScanFrame=null;}
  if(searchScanStream){searchScanStream.getTracks().forEach(function(t){t.stop();});searchScanStream=null;}
  var video=document.getElementById("search-scan-video");if(video)video.srcObject=null;
  document.getElementById("search-scan-overlay").classList.add("hidden");
}

function searchScanLoopStart(){
  var video=document.getElementById("search-scan-video"),canvas=document.getElementById("search-scan-canvas");
  if(!searchScanRunning)return;
  if(!video||video.readyState<2){searchScanFrame=requestAnimationFrame(searchScanLoopStart);return;}
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  var ctx=canvas.getContext("2d");ctx.drawImage(video,0,0,canvas.width,canvas.height);
  var reader=getZxingReader();var detected=null;
  if(reader){try{var res=reader.decodeFromCanvas(canvas);if(res&&res.getText())detected=res.getText().trim();}catch(e){}}
  if(detected){
    closeSearchScanner();
    document.getElementById("s-bc-in").value=detected;
    doSearch();
    toast("✓ Barcode: "+detected,"ok",2500);
    try{if(navigator.vibrate)navigator.vibrate([80]);}catch(e){}
    return;
  }
  if(searchScanRunning)searchScanFrame=requestAnimationFrame(searchScanLoopStart);
}

// ── FEATURE: SMARTE BENACHRICHTIGUNGEN (Fix 5) ────────────────────
function runSmartNotifications(){
  if(!allItems||allItems.length===0)return;
  var now=new Date();
  var nichtHochgeladen=allItems.filter(function(i){return i.type!=="defekt"&&(String(i.verfuegbarkeit||"").indexOf("Nicht")>-1||String(i.verfuegbarkeit||"").length===0);}).length;
  // Wenn 10+ Artikel noch nicht bei Kleinanzeigen
  if(nichtHochgeladen>=10){
    var already=notifications.find(function(n){return n.title.indexOf("Kleinanzeigen")>-1;});
    if(!already){addNotification("📢 Kleinanzeigen ausstehend",nichtHochgeladen+" Artikel noch nicht bei Kleinanzeigen hochgeladen.","warn");}
  }
  // Wöchentliche Zusammenfassung (Samstag)
  if(now.getDay()===6){
    var woche=allItems.filter(function(i){
      if(!i.datum)return false;
      var parts=i.datum.split(".");if(parts.length<3)return false;
      var d=new Date(parts[2].split(" ")[0],parts[1]-1,parts[0]);
      return(now-d)<7*24*60*60*1000;
    }).length;
    var alreadyW=notifications.find(function(n){return n.title.indexOf("Woche")>-1&&n.time&&n.time.indexOf(now.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}))>-1;});
    if(!alreadyW&&woche>0){addNotification("📊 Wochenrückblick","Diese Woche wurden "+woche+" Artikel eingelagert. Weiter so!","info");}
  }
  // Defekte ohne Bearbeitung
  var alteDefekte=allItems.filter(function(i){
    if(i.type!=="defekt")return false;
    if(!i.datum)return false;
    var parts=i.datum.split(".");if(parts.length<3)return false;
    var d=new Date(parts[2].split(" ")[0],parts[1]-1,parts[0]);
    return(now-d)>14*24*60*60*1000;
  }).length;
  if(alteDefekte>0){
    var alreadyD=notifications.find(function(n){return n.title.indexOf("Defekte")>-1&&n.title.indexOf("Bearbeitung")>-1;});
    if(!alreadyD){addNotification("🔧 Defekte ohne Bearbeitung",alteDefekte+" defekte Geräte warten seit über 14 Tagen auf Bearbeitung.","alert");}
  }
}

// ================================================================
// CHINA ENTRIES - localStorage persistence
// ================================================================
function loadChinaEntries(){
  try{var s=localStorage.getItem("smp_china");if(s)chinaEntries=JSON.parse(s)||[];}catch(e){}
}


// ================================================================
// EINKAUF STEPPER
// ================================================================
var ekStep = 1, ekTotalSteps = 4;

function openEinkaufForm(item) {
  editEinkaufItem = item || null;
  ekStep = 1;
  ekTotalSteps = 2;
  var title = document.getElementById("ek-modal-title");
  if(title) title.textContent = item ? "✏️ EINKAUF BEARBEITEN" : "🛒 EINKAUF";
  var delBtn = document.getElementById("ek-del-btn");
  if(delBtn) delBtn.style.display = item ? "inline-flex" : "none";

  // Init dynamic product list
  window._ekProductLines = item ? (item.produkte||"").split(",").map(function(p){return p.trim();}).filter(Boolean) : [""];
  if(!window._ekProductLines.length) window._ekProductLines = [""];
  _renderEKProductList();

  sv2("ek-kunde", item ? (item.kunde||item.lieferant||"") : "");
  sv2("ek-preis", item ? item.preis : "");
  sv2("ek-plattform", item ? item.plattform : "Kleinanzeigen");
  sv2("ek-zimmer", item ? item.zimmer : "");
  sv2("ek-sende", item ? item.sendenummer : "");
  sv2("ek-vdl", item ? item.versanddienstleister : "");
  sv2("ek-abholung", item ? item.abholung : "NEIN");
  sv2("ek-ma", item ? item.mitarbeiter : emp);
  sv2("ek-hinweise", item ? item.hinweise : "");
  selEKVersand((item && item.abholung === "JA") ? "Abholung" : "Versand");
  var stornoSec = document.getElementById("ek-storno-section");
  if(stornoSec) stornoSec.style.display = item ? "block" : "none";
  var d = document.getElementById("ek-diag"); if(d) d.style.display = "none";
  _renderEKStep();
  document.getElementById("ek-modal").classList.add("open");
}

function _renderEKProductList() {
  var wrap = document.getElementById("ek-produkte-list"); if(!wrap) return;
  if(!window._ekProductLines) window._ekProductLines = [""];
  wrap.innerHTML = "";
  window._ekProductLines.forEach(function(val, idx) {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:5px;margin-bottom:6px;align-items:center";
    var inp = document.createElement("input");
    inp.type = "text";
    inp.className = "fc";
    inp.placeholder = idx === 0 ? "Produktname eingeben..." : "Weiteres Produkt...";
    inp.value = val;
    inp.style.flex = "1";
    inp.setAttribute("data-idx", idx);
    inp.oninput = function() {
      var i = parseInt(this.getAttribute("data-idx"));
      window._ekProductLines[i] = this.value;
      // Add new line if this is the last field and has content
      if(i === window._ekProductLines.length - 1 && this.value.trim().length > 0) {
        window._ekProductLines.push("");
        _renderEKProductList();
        // Focus the new input
        setTimeout(function(){
          var inputs = document.querySelectorAll("#ek-produkte-list input");
          if(inputs.length) inputs[inputs.length-1].focus();
        }, 50);
      }
    };
    row.appendChild(inp);
    // Remove button (not for first)
    if(idx > 0) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = "background:none;border:1px solid var(--e2);color:var(--w4);border-radius:4px;padding:0 8px;height:40px;cursor:pointer;font-size:16px;flex-shrink:0";
      btn.innerHTML = "×";
      btn.onclick = (function(i){ return function(){
        window._ekProductLines.splice(i,1);
        if(!window._ekProductLines.length) window._ekProductLines = [""];
        _renderEKProductList();
      };})(idx);
      row.appendChild(btn);
    }
    wrap.appendChild(row);
  });
}

function _getEKProductsString() {
  return (window._ekProductLines||[""]).map(function(p){return p.trim();}).filter(Boolean).join(", ");
}

function closeEKModal() {
  document.getElementById("ek-modal").classList.remove("open");
}

function _renderEKStep() {
  for(var i=1; i<=4; i++) {
    var el = document.getElementById("eks-"+i);
    if(el) el.style.display = (i===ekStep ? "block" : "none");
  }
  var pct = Math.round((ekStep/(ekTotalSteps||2))*100);
  var pb = document.getElementById("ek-prog"); if(pb) pb.style.width = pct+"%";
  var sl = document.getElementById("ek-step-lbl"); if(sl) sl.textContent = "STEP "+ekStep+"/"+(ekTotalSteps||2);
  var snames = ["ARTIKEL","VERSAND"];
  var sn = document.getElementById("ek-step-name"); if(sn) sn.textContent = snames[ekStep-1]||"";
  var bb = document.getElementById("ek-back-btn"); if(bb) bb.disabled = (ekStep===1);
  var nb = document.getElementById("ek-next-btn"); if(nb) nb.style.display = (ekStep<(ekTotalSteps||2) ? "inline-flex" : "none");
  var sb = document.getElementById("ek-save-btn"); if(sb) sb.style.display = (ekStep===(ekTotalSteps||2) ? "inline-flex" : "none");
}

function ekStepNav(dir) {
  var d = document.getElementById("ek-diag"); if(d) d.style.display = "none";
  if(dir > 0) {
    if(ekStep === 1) {
      var produkte = _getEKProductsString();
      if(!produkte) { showEKDiag("Bitte mind. 1 Produkt eingeben."); return; }
      if(!gv("ek-kunde").trim()) { showEKDiag("Bitte Kunde eingeben."); return; }
      // Show products summary in step 2
      setTimeout(function(){
        var s = document.getElementById("ek-products-summary");
        if(s){
          var lines = (window._ekProductLines||[]).map(function(p){return p.trim();}).filter(Boolean);
          s.innerHTML = "<strong>ARTIKEL:</strong><br>" + lines.map(function(p,i){return (i+1)+". "+esc(p);}).join("<br>");
          s.style.display = "block";
        }
      }, 50);
    }
  }
  ekStep = Math.max(1, Math.min(ekTotalSteps, ekStep + dir));
  _renderEKStep();
}

function showEKDiag(msg) {
  var d = document.getElementById("ek-diag");
  if(d) { d.className="diag derr"; d.textContent=msg; d.style.display="block"; }
}

function selEKVersand(type) {
  sv2("ek-abholung", type==="Abholung" ? "JA" : "NEIN");
  ["versand","abholung"].forEach(function(id){
    var el = document.getElementById("ekv-"+id);
    if(el) el.className = "cbtn";
  });
  var active = document.getElementById("ekv-"+(type==="Abholung"?"abholung":"versand"));
  if(active) active.className = "cbtn vk-sel";
  var vf = document.getElementById("ek-versand-fields");
  var af = document.getElementById("ek-abholung-fields");
  if(vf) vf.style.display = type==="Abholung" ? "none" : "block";
  if(af) af.style.display = type==="Abholung" ? "block" : "none";
}

function selEKStatus(status) {
  sv2("ek-status", status);
  ["bestellt","bezahlt","versendet","angekommen"].forEach(function(id){
    var el = document.getElementById("ekst-"+id);
    if(el) el.className = "cbtn";
  });
  var map = {Bestellt:"bestellt",Bezahlt:"bezahlt",Versendet:"versendet",Angekommen:"angekommen"};
  var el = document.getElementById("ekst-"+(map[status]||"bestellt"));
  if(el) el.className = "cbtn vk-sel";
}

function selEKZustand(z) {
  sv2("ek-zustand", z);
  ["ok","beschaedigt"].forEach(function(id){
    var el = document.getElementById("ek-zust-"+id);
    if(el) el.className = "cbtn";
  });
  var map = {Einwandfrei:"ok",Beschädigt:"beschaedigt"};
  var el = document.getElementById("ek-zust-"+(map[z]||"ok"));
  if(el) el.className = "cbtn vk-sel";
  var sf = document.getElementById("ek-schaden-field");
  if(sf) sf.style.display = z==="Beschädigt" ? "block" : "none";
}

function onEKSendeInput() {
  var sende = gv("ek-sende").trim();
  var vdl = gv("ek-vdl");
  // Auto-detect carrier
  if(!vdl && sende.length > 5) {
    var detected = "";
    if(/^1Z[A-Z0-9]{16}$/.test(sende)) detected = "UPS";
    else if(/^\d{20}$/.test(sende)) detected = "DHL";
    else if(/^[0-9]{14,15}$/.test(sende)) detected = "Hermes";
    else if(/^[0-9]{14}$/.test(sende)) detected = "DPD";
    if(detected) sv2("ek-vdl", detected);
  }
  // Build tracking link
  var links = {DHL:"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode="+sende,Hermes:"https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#"+sende,DPD:"https://tracking.dpd.de/parcelstatus?query="+sende,UPS:"https://www.ups.com/track?tracknum="+sende,GLS:"https://gls-group.eu/track/"+sende};
  var link = links[gv("ek-vdl")||vdl];
  var tl = document.getElementById("ek-track-link");
  var ta = document.getElementById("ek-track-a");
  if(tl && ta && link && sende) { ta.href=link; tl.style.display="block"; }
  else if(tl) { tl.style.display="none"; }
}

function _buildEKChecklist() {
  var el = document.getElementById("ek-checklist-wrap"); if(!el) return;
  var rawText = gv("ek-produkte");
  var products = rawText.split("\n").map(function(p){return p.trim();}).filter(Boolean);
  if(!products.length) { 
    el.innerHTML='<div style="font-size:11px;color:var(--w4);font-family:monospace;padding:8px 0">Keine Artikel aus Schritt 1</div>'; 
    return; 
  }
  el.innerHTML = products.map(function(p,i){
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--e1)">'
      +'<div onclick="toggleEKCheck(this)" style="width:22px;height:22px;border-radius:4px;border:1.5px solid var(--e2);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s" data-checked="0"></div>'
      +'<span style="font-size:13px;font-weight:600;color:var(--w1)">'+esc(p)+'</span></div>';
  }).join("");
}

function toggleEKCheck(el) {
  var checked = el.getAttribute("data-checked")==="1";
  el.setAttribute("data-checked", checked?"0":"1");
  el.style.background = checked ? "" : "var(--acc)";
  el.style.borderColor = checked ? "var(--e2)" : "var(--acc)";
  el.innerHTML = checked ? "" : '<i class="bi bi-check" style="color:#000;font-size:13px"></i>';
}

function _buildEKSummary() {
  var el = document.getElementById("ek-summary"); if(!el) return;
  var rawProdukte = gv("ek-produkte");
  var productLines = rawProdukte.split("\n").map(function(p){return p.trim();}).filter(Boolean);
  var lines = [
    "PRODUKT: " + (productLines.join(", ")||"–"),
    "LIEFERANT: " + (gv("ek-kunde")||"–"),
    "PREIS: " + (gv("ek-preis")||"–") + "€",
    "PLATTFORM: " + (gv("ek-plattform")||"–"),
    "ZIMMER: " + (gv("ek-zimmer")||"–"),
    "STATUS: " + (gv("ek-status")||"–"),
    "LIEFERART: " + (gv("ek-abholung")==="JA"?"Selbstabholung":"Versand"),
  ];
  if(gv("ek-sende")) lines.push("TRACKING: "+gv("ek-sende"));
  el.innerHTML = lines.join("<br>");
}

function stornoEinkauf() {
  var grund = gv("ek-storno-grund");
  if(!grund) { showEKDiag("Bitte Storno-Grund wählen."); return; }
  if(!editEinkaufItem) { showEKDiag("Kein Einkauf zum Stornieren."); return; }
  var notiz = gv("ek-storno-notiz");
  var alteHinweise = editEinkaufItem.hinweise || "";
  var stornoText = "STORNO: " + grund + (notiz ? " - " + notiz : "");
  var neueHinweise = alteHinweise ? alteHinweise + " | " + stornoText : stornoText;
  var data = { rowIndex: editEinkaufItem.rowIndex, status: "Storniert", hinweise: neueHinweise };
  gasPost("updateEinkauf", data, function(r){
    if(r&&r.ok){ toast("Einkauf storniert","ok"); closeEKModal(); loadHandel(); }
    else { showEKDiag(r?r.fehler:"Fehler"); }
  }, function(e){ showEKDiag("Verbindungsfehler: "+e); });
}

function saveEKForm() {
  var d = document.getElementById("ek-diag"); if(d) d.style.display = "none";
  var produkte = _getEKProductsString();
  if(!produkte) { showEKDiag("Bitte Produkte eingeben."); return; }
  var data = {
    produkte: produkte,
    kunde: gv("ek-kunde"),
    preis: gv("ek-preis"),
    plattform: gv("ek-plattform"),
    zimmer: gv("ek-zimmer"),
    sendenummer: gv("ek-sende"),
    versanddienstleister: gv("ek-vdl"),
    abholung: gv("ek-abholung"),
    status: "Vorgemerkt",
    lieferstatus: "Ausstehend",
    mitarbeiter: gv("ek-ma") || emp,
    hinweise: gv("ek-hinweise"),
    warentyp: "Gebrauchtware"
  };
  var btn = document.getElementById("ek-save-btn"); setBL(btn, true);
  if(editEinkaufItem) {
    data.rowIndex = editEinkaufItem.rowIndex;
    data.status = editEinkaufItem.status || "Vorgemerkt";
    gasPost("updateEinkauf", data, function(r){
      setBL(btn, false);
      if(r&&r.ok){ toast("Einkauf aktualisiert ✅","ok"); closeEKModal(); loadHandel(); }
      else { showEKDiag(r ? r.fehler : "Fehler beim Speichern"); }
    }, function(e){ setBL(btn,false); showEKDiag("Verbindungsfehler: "+e); });
  } else {
    gasPost("saveEinkauf", data, function(r){
      setBL(btn, false);
      if(r&&r.ok){
        toast("📋 Einkauf vorgemerkt! Scanne Artikel beim Eintreffen über EINKAUF CHECK.","ok",4000);
        closeEKModal(); loadHandel();
      } else { showEKDiag(r ? r.fehler : "Fehler beim Speichern"); }
    }, function(e){ setBL(btn,false); showEKDiag("Verbindungsfehler: "+e); });
  }
}


// ================================================================
// VERKAUF: SCAN-PER-ITEM + PER-ITEM PROFIT
// ================================================================
var vkScannedItems = [];  // [{name, scanId, ekPreis, vkPreis, rowIndex, type}]
var vkScannerActive = false;
var vkScannerStream = null;

function openVKScannerAdd() {
  var wrap = document.getElementById("vk-scan-add-wrap");
  if(!wrap) return;
  wrap.style.display = "block";
  var video = document.getElementById("vk-scan-add-video");
  if(!video) return;
  navigator.mediaDevices.getUserMedia({video:{deviceId:firstCamDeviceId?{exact:firstCamDeviceId}:undefined,facingMode:"environment"}})
    .then(function(stream){
      vkScannerStream = stream;
      video.srcObject = stream;
      vkScannerActive = true;
      _vkScanAddLoop();
    }).catch(function(e){ toast("Kamera: "+e.message,"err"); wrap.style.display="none"; });
}

function stopVKScannerAdd() {
  vkScannerActive = false;
  if(vkScannerStream){ vkScannerStream.getTracks().forEach(function(t){t.stop();}); vkScannerStream=null; }
  var wrap = document.getElementById("vk-scan-add-wrap");
  if(wrap) wrap.style.display = "none";
}

function _vkScanAddLoop() {
  if(!vkScannerActive) return;
  var video = document.getElementById("vk-scan-add-video");
  var canvas = document.getElementById("vk-scan-add-canvas");
  if(!video||!canvas||video.readyState<2){ requestAnimationFrame(_vkScanAddLoop); return; }
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  var ctx = canvas.getContext("2d"); ctx.drawImage(video,0,0);
  try {
    var bd = new BarcodeDetector({formats:["ean_13","ean_8","code_128","upc_a","upc_e"]});
    bd.detect(canvas).then(function(codes){
      if(codes.length>0 && vkScannerActive){
        var bc = codes[0].rawValue;
        stopVKScannerAdd();
        sv2("vk-scan-add-input", bc);
        vkScanAdd();
      } else { requestAnimationFrame(_vkScanAddLoop); }
    }).catch(function(){ requestAnimationFrame(_vkScanAddLoop); });
  } catch(e) {
    // Fallback: ZXing
    try {
      var reader = getZxingReader();
      var img = new Image(); img.src = canvas.toDataURL();
      img.onload = function(){
        reader.decodeFromImage(img).then(function(res){
          if(res && vkScannerActive){
            stopVKScannerAdd();
            sv2("vk-scan-add-input", res.getText());
            vkScanAdd();
          } else { requestAnimationFrame(_vkScanAddLoop); }
        }).catch(function(){ requestAnimationFrame(_vkScanAddLoop); });
      };
    } catch(e2){ requestAnimationFrame(_vkScanAddLoop); }
  }
}

function vkScanAdd() {
  var input = (document.getElementById("vk-scan-add-input")||{value:""}).value.trim();
  if(!input) return;
  // Search in allItems
  var found = allItems.filter(function(i){
    return i.scanId && i.scanId.toLowerCase()===input.toLowerCase();
  });
  if(!found.length) {
    // Try partial search
    found = allItems.filter(function(i){
      var nm = i.name||i.spiel||i.modell||"";
      return nm.toLowerCase().includes(input.toLowerCase());
    });
  }
  if(!found.length) {
    // Try loading from GAS
    gasGet("searchByBarcode",{barcode:input},function(r){
      if(r&&r.ok){
        var all=[].concat(r.konsolen||[],r.spiele||[],r.handys||[],r.pcs||[]);
        if(all.length>0){ _addVKItem(all[0]); }
        else { toast("Artikel nicht im Lager gefunden","err"); }
      }
    },function(){ toast("Verbindungsfehler","err"); });
    return;
  }
  _addVKItem(found[0]);
  sv2("vk-scan-add-input","");
}

function _addVKItem(item) {
  var nm = item.name||item.spiel||item.modell||"–";
  // Check if already added
  if(vkScannedItems.some(function(x){return x.rowIndex===item.rowIndex&&x.type===item.type;})){
    toast("Artikel bereits in der Liste","err"); return;
  }
  vkScannedItems.push({name:nm, scanId:item.scanId||"", ekPreis:parseFloat(item.einkaufspreis||0), vkPreis:0, rowIndex:item.rowIndex, type:item.type});
  _renderVKItemsList();
  toast(nm+" hinzugefügt ✓","ok",2000);
}

function _renderVKItemsList() {
  var el = document.getElementById("vk-items-list"); if(!el) return;
  if(!vkScannedItems.length){ el.innerHTML=""; _updateVKTotals(); return; }
  el.innerHTML = '<div class="slabel" style="margin-bottom:6px">'+vkScannedItems.length+' ARTIKEL</div>'
    + vkScannedItems.map(function(item,i){
      var profit = item.vkPreis - item.ekPreis;
      var profitColor = profit>0?"var(--acc)":profit<0?"var(--col-r)":"var(--w4)";
      return '<div style="background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:9px 11px;margin-bottom:6px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        +'<div style="font-size:13px;font-weight:700;color:var(--w1)">'+esc(item.name)+'</div>'
        +'<button onclick="removeVKItem('+i+')" style="background:none;border:none;color:var(--w4);cursor:pointer;font-size:14px;padding:0"><i class="bi bi-x"></i></button></div>'
        +'<div style="display:flex;gap:6px;align-items:center">'
        +'<div style="flex:1"><div style="font-size:9px;color:var(--w4);font-family:monospace;margin-bottom:2px">EK-PREIS</div>'
        +'<div style="font-size:12px;font-weight:700;color:var(--w3);font-family:monospace">'+item.ekPreis.toFixed(2)+'€</div></div>'
        +'<div style="flex:1.5"><div style="font-size:9px;color:var(--w4);font-family:monospace;margin-bottom:2px">VK-PREIS (€)</div>'
        +'<input type="number" class="fc" placeholder="0.00" step="0.01" value="'+(item.vkPreis||"")+'" '
        +'style="padding:6px 8px;font-family:monospace;font-size:12px" '
        +'data-idx="'+i+'" onchange="setVKItemPrice(this)" oninput="setVKItemPrice(this)"/></div>'
        +(item.vkPreis>0?'<div style="text-align:right"><div style="font-size:9px;color:var(--w4);font-family:monospace;margin-bottom:2px">GEWINN</div>'
        +'<div style="font-size:13px;font-weight:800;color:'+profitColor+';font-family:monospace">'+(profit>=0?"+":"")+profit.toFixed(2)+'€</div></div>':"")
        +'</div></div>';
    }).join("");
  _updateVKTotals();
}

function setVKItemPrice(input) {
  var idx = parseInt(input.getAttribute("data-idx"));
  if(isNaN(idx)||!vkScannedItems[idx]) return;
  vkScannedItems[idx].vkPreis = parseFloat(input.value)||0;
  _updateVKTotals();
  // Update profit display inline
  var wrap = input.closest("div[style*='background:var(--b3)']");
  if(wrap){
    var item = vkScannedItems[idx];
    var profit = item.vkPreis - item.ekPreis;
    var profitDiv = wrap.querySelector("div[style*='GEWINN']");
    // Re-render this item only
    _renderVKItemsList();
  }
}

function removeVKItem(idx) {
  vkScannedItems.splice(idx,1);
  _renderVKItemsList();
}

function updateVKTotals() { _updateVKTotals(); }

function _updateVKTotals() {
  // Sum from scanned items OR manual price
  var totalVK = 0, totalEK = 0;
  if(vkScannedItems.length > 0) {
    vkScannedItems.forEach(function(item){ totalVK+=item.vkPreis; totalEK+=item.ekPreis; });
    // Push sum to vk-preis field
    if(totalVK>0) sv2("vk-preis", totalVK.toFixed(2));
    if(totalEK>0) sv2("vk-ep", totalEK.toFixed(2));
    // Fill vk-produkte and vk-scanid
    var names = vkScannedItems.map(function(i){return i.name;}).join(", ");
    var ids = vkScannedItems.map(function(i){return i.scanId;}).filter(Boolean).join(", ");
    sv2("vk-produkte", names);
    var scanEl = document.getElementById("vk-scanid");
    if(scanEl){ scanEl.removeAttribute("readonly"); scanEl.value=ids; }
  } else {
    totalVK = parseFloat(gv("vk-preis")||0);
    totalEK = parseFloat(gv("vk-ep")||0);
  }
  var vs = parseFloat(gv("vk-versand")||0);
  var totalDisplay = document.getElementById("vk-total-display");
  if(totalDisplay) totalDisplay.textContent = "∑ "+totalVK.toFixed(2)+"€";
  calcAndShowMarge();
}

function openVerkaufForm(item, prefillScanId) {
  editVerkaufItem = item || null;
  vkStep = 1;
  vkScannedItems = [];
  var title = document.getElementById("vk-modal-title");
  if(title) title.textContent = item ? "✏️ VERKAUF BEARBEITEN" : "💸 VERKAUF";
  var delBtn = document.getElementById("vk-del-btn"); if(delBtn) delBtn.style.display = item?"inline-flex":"none";
  sv2("vk-produkte", item?item.produkte:"");
  sv2("vk-scanid", item?item.scanId:(prefillScanId||""));
  sv2("vk-preis", item?(item.verkaufspreis||item.preis||""):"");
  sv2("vk-versand", item?(item.versandkosten||item.versand||""):"");
  sv2("vk-plattform", item?item.plattform:"");
  sv2("vk-kunde", item?item.kunde:"");
  sv2("vk-bestellnr", item?(item.angebotsnr||item.bestellnr||""):"");
  sv2("vk-bezahlt", item?(item.bezahlMit||item.schonBezahlt||""):"");
  sv2("vk-geld", item?item.geldErhalten:"");
  sv2("vk-abholung", item?(item.abholung==="JA"?"Abholung":"Versand"):"Versand");
  sv2("vk-status", item?item.status:"Vorgemerkt");
  sv2("vk-lieferstatus", item?item.lieferstatus:"Ausstehend");
  sv2("vk-sende", item?item.sendenummer:"");
  sv2("vk-vdl", item?item.versanddienstleister:"");
  sv2("vk-ma", item?item.mitarbeiter:emp);
  sv2("vk-hinweise", item?item.hinweise:"");
  sv2("vk-ep", item?(item.einkaufspreis||""):"");
  var pi = document.getElementById("vk-product-info"); if(pi){pi.style.display="none";pi.textContent="";}
  var chips = document.getElementById("vk-multi-chips"); if(chips) chips.innerHTML="";
  var itemsList = document.getElementById("vk-items-list"); if(itemsList) itemsList.innerHTML="";
  if(item&&item.plattform) _highlightVKPlattform(item.plattform);
  if(item&&item.status) selVKStatus(item.status);
  var d = document.getElementById("vk-diag"); if(d) d.style.display="none";
  _renderVKStep();
  document.getElementById("vk-modal").classList.add("open");
}


// ================================================================
// FIX: SESSION PERSISTENCE (auto-login 8h)
// ================================================================
function saveSession(name, rolle) {
  try {
    var session = {name:name, rolle:rolle, ts:Date.now()};
    localStorage.setItem("smp_session", JSON.stringify(session));
  } catch(e){}
}
function loadSession() {
  try {
    var s = localStorage.getItem("smp_session");
    if(!s) return null;
    var session = JSON.parse(s);
    var age = (Date.now() - session.ts) / 1000 / 3600;
    if(age > 8) { localStorage.removeItem("smp_session"); return null; }
    return session;
  } catch(e){ return null; }
}
function clearSession() {
  try { localStorage.removeItem("smp_session"); } catch(e){}
}

// ================================================================
// FIX: ACCOUNT RESEND INVITE + DELETE IMPROVEMENTS
// ================================================================
function resendInvite(email, name) {
  if(!confirm("Einladung erneut an " + email + " senden?")) return;
  gasGet("resetPassword",{email:email}, function(r){
    if(r&&r.ok){ toast("Einladung erneut gesendet ✓","ok"); }
    else { toast("Fehler: "+(r?r.fehler:"?"),"err"); }
  }, function(e){ toast("Verbindungsfehler","err"); });
}

function renderServerAccounts(accs) {
  var list = document.getElementById("acc-list"); if(!list) return;
  if(!accs||!accs.length){
    list.innerHTML='<div style="text-align:center;padding:16px;color:var(--w4);font-family:monospace;font-size:10px">KEINE ACCOUNTS</div>';
    return;
  }
  list.innerHTML = "";
  accs.forEach(function(a){
    var ini=(a.name||"?").split(" ").map(function(w){return w[0]||"";}).join("").toUpperCase().substring(0,2);
    var statusColor = a.status==="aktiv"?"var(--acc)":a.status==="eingeladen"?"var(--col-y)":"var(--col-r)";
    var statusLabel = a.status==="aktiv"?"AKTIV":a.status==="eingeladen"?"EINGELADEN":"GESPERRT";
    var item = document.createElement("div");
    item.className = "acc-item";
    item.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
      +'<div class="acc-avatar">'+esc(ini)+'</div>'
      +'<div>'
      +'<div style="font-size:13px;font-weight:700;color:var(--w1)">'+esc(a.name)+'</div>'
      +'<div style="font-size:10px;color:var(--w4);font-family:monospace">'+esc(a.email||"")+'</div>'
      +'<div style="display:flex;gap:6px;align-items:center;margin-top:2px">'
      +'<span style="font-size:9px;font-weight:700;color:'+statusColor+';font-family:monospace">'+statusLabel+'</span>'
      +'<span style="font-size:9px;color:var(--w4);font-family:monospace">'+esc(a.rolle||"mitarbeiter")+'</span>'
      +'</div></div></div>'
      +'<div style="display:flex;gap:5px"></div>';
    // Add resend button if invited
    var btnWrap = item.querySelector("div[style*='gap:5px']");
    if(a.status==="eingeladen"){
      var resendBtn = document.createElement("button");
      resendBtn.className="btn btn-outline-primary btn-sm";
      resendBtn.title="Erneut einladen";
      resendBtn.innerHTML='<i class="bi bi-envelope-arrow-up"></i>';
      resendBtn.onclick=(function(email,name){return function(){resendInvite(email,name);};})(a.email,a.name);
      btnWrap.appendChild(resendBtn);
    }
    if(empRolle==="owner"){
      var delBtn = document.createElement("button");
      delBtn.className="btn btn-outline-danger btn-sm";
      delBtn.title="Löschen";
      delBtn.innerHTML='<i class="bi bi-trash3"></i>';
      delBtn.onclick=(function(email){return function(){deleteServerAccount(email);};})(a.email);
      btnWrap.appendChild(delBtn);
    }
    list.appendChild(item);
  });
}

function renderAccList(accs){ renderServerAccounts(accs); }

// ================================================================
// FIX: LAGER ITEM AGE COLOR
// ================================================================
function getDaysOld(datum) {
  if(!datum) return 0;
  var parts = datum.split(".");
  if(parts.length < 3) return 0;
  var d = new Date(parts[2].split(" ")[0], parts[1]-1, parts[0]);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ================================================================
// FIX: DEBOUNCED SEARCH
// ================================================================
var _searchTimeout = null;
function liveSearch(q) {
  clearTimeout(_searchTimeout);
  _searchTimeout = setTimeout(function(){ doSearch(); }, 280);
}

// ================================================================
// FIX: ENTER KEY IMPROVEMENTS
// ================================================================
function setupEnterKeys() {
  // Login form
  var pwIn = document.getElementById("pw-in");
  if(pwIn) pwIn.addEventListener("keydown", function(e){
    if(e.key==="Enter") doLogin();
  });
  var empIn = document.getElementById("emp-in");
  if(empIn) empIn.addEventListener("keydown", function(e){
    if(e.key==="Enter") document.getElementById("pw-in").focus();
  });
  // Search
  var sIn = document.getElementById("s-bc-in");
  if(sIn) sIn.addEventListener("keydown", function(e){
    if(e.key==="Enter") doSearch();
  });
  var listQ = document.getElementById("list-q");
  if(listQ) listQ.addEventListener("keydown", function(e){
    if(e.key==="Enter") renderList();
  });
  // VK scan add
  // Already handled inline
}

// ================================================================
// FIX: KEYBOARD SHORTCUTS
// ================================================================
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", function(e){
    // Escape closes any open modal
    if(e.key==="Escape"){
      var openModals = document.querySelectorAll(".moverlay.open, .detail-overlay.open");
      openModals.forEach(function(m){ m.classList.remove("open"); });
      var notif = document.getElementById("notif-overlay");
      if(notif && notif.classList.contains("open")) closeNotifications();
      return;
    }
    // Only if no input is focused
    if(document.activeElement && ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) return;
    if(e.ctrlKey||e.metaKey){
      if(e.key==="k"){ e.preventDefault(); goTabFn("search-panel"); setTimeout(function(){ var el=document.getElementById("s-bc-in"); if(el) el.focus(); },100); }
    }
  });
}

// ================================================================
// FIX: PROFIL - SHOW ACCOUNT INFO
// ================================================================
function enrichProfilWithAccountInfo(name) {
  // Get account info from server accounts list
  gasGet("getAccounts",{},function(r){
    if(!r||!r.ok) return;
    var acc = (r.data||[]).find(function(a){ return a.name.toLowerCase()===name.toLowerCase(); });
    if(!acc) return;
    var sub = document.getElementById("profil-sub-info");
    if(sub){
      sub.innerHTML = '<div style="display:flex;gap:12px;justify-content:center;margin-top:8px;flex-wrap:wrap">'
        +'<div style="text-align:center"><div style="font-size:9px;color:var(--w4);font-family:monospace;letter-spacing:.5px">ROLLE</div><div style="font-size:11px;font-weight:700;color:var(--acc);font-family:monospace">'+(acc.rolle||"mitarbeiter").toUpperCase()+'</div></div>'
        +'<div style="text-align:center"><div style="font-size:9px;color:var(--w4);font-family:monospace;letter-spacing:.5px">STATUS</div><div style="font-size:11px;font-weight:700;color:var(--acc);font-family:monospace">'+(acc.status||"aktiv").toUpperCase()+'</div></div>'
        +'<div style="text-align:center"><div style="font-size:9px;color:var(--w4);font-family:monospace;letter-spacing:.5px">EMAIL</div><div style="font-size:11px;color:var(--w2)">'+esc(acc.email||"–")+'</div></div>'
        +'<div style="text-align:center"><div style="font-size:9px;color:var(--w4);font-family:monospace;letter-spacing:.5px">ERSTELLT</div><div style="font-size:11px;color:var(--w2)">'+esc(acc.erstellt||"–")+'</div></div>'
        +'</div>';
    }
  },function(){});
}

// Session save is called directly in the load handler and login


// ================================================================
// EINKAUF CHECK FLOW
// ================================================================
var ekCheckStep=1,ekCheckItem=null,ekCheckList=[],ekCheckCurrentIdx=-1;

function openEKCheck(){
  ekCheckStep=1;ekCheckItem=null;ekCheckList=[];ekCheckCurrentIdx=-1;
  window._afterSaveCallback=null;
  var mc=document.getElementById("mode-chooser");
  var ep=document.getElementById("ek-check-panel");
  if(mc)mc.style.display="none";
  if(ep)ep.style.display="block";
  _renderEKCheckStep();
  _loadEKCheckList();
}

function closeEKCheck(){
  var mc=document.getElementById("mode-chooser");
  var ep=document.getElementById("ek-check-panel");
  if(mc)mc.style.display="block";
  if(ep)ep.style.display="none";
  ekCheckStep=1;ekCheckItem=null;
  window._afterSaveCallback=null;
}

function _renderEKCheckStep(){
  var s1=document.getElementById("ek-check-step1");
  var s2=document.getElementById("ek-check-step2");
  var hdr=document.getElementById("ek-check-header-title");
  if(s1)s1.style.display=ekCheckStep===1?"block":"none";
  if(s2)s2.style.display=ekCheckStep===2?"block":"none";
  if(hdr)hdr.textContent=ekCheckStep===1?"EINKAUF WÄHLEN":"ARTIKEL EINLAGERN";
}

function _loadEKCheckList(){
  var listEl=document.getElementById("ek-check-einkauf-list");
  if(!listEl)return;
  listEl.innerHTML='<div style="text-align:center;padding:24px"><span class="spin-b"></span><div style="font-size:10px;color:var(--w4);margin-top:8px;font-family:monospace">LADE...</div></div>';
  gasGet("getAllEinkauf",{},function(r){
    if(!r||!r.ok){listEl.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>VERBINDUNGSFEHLER</p></div>';return;}
    var pending=(r.data||[]).filter(function(e){return e.status!=="Abgeschlossen"&&e.status!=="Storniert";});
    if(!pending.length){listEl.innerHTML='<div class="empty"><i class="bi bi-check-circle"></i><p>ALLE ABGESCHLOSSEN ✅</p></div>';return;}
    listEl.innerHTML="";
    pending.forEach(function(ek){
      var products=(ek.produkte||"").split(",").map(function(p){return p.trim();}).filter(Boolean);
      var card=document.createElement("div");
      card.className="ic";
      card.style.cssText="cursor:pointer;margin-bottom:8px;border-left:3px solid var(--col-b)";
      var sc={Vorgemerkt:"#666",Bestellt:"var(--col-y)",Bezahlt:"var(--col-b)",Versendet:"var(--col-b)",Angekommen:"var(--acc)"}[ek.status]||"#666";
      card.innerHTML='<div class="ic-top"><div class="ic-name">'+esc(ek.kunde||"Unbekannt")+'</div>'
        +'<span style="font-size:9px;font-weight:700;color:'+sc+';font-family:monospace">'+esc(ek.status||"–")+'</span></div>'
        +'<div class="chips">'
        +(ek.zimmer?'<span class="chip" style="color:var(--col-b);border-color:rgba(77,159,255,.3)">📍 '+esc(ek.zimmer)+'</span>':"")
        +(ek.preis?'<span class="chip" style="font-family:monospace">'+esc(ek.preis)+'€</span>':"")
        +'<span class="chip">'+products.length+' Artikel</span></div>'
        +'<div style="font-size:11px;color:var(--w3);margin-top:4px">'
        +products.slice(0,3).map(function(p){return esc(p);}).join(" · ")
        +(products.length>3?' <span style="color:var(--w4)">+'+( products.length-3)+' weitere</span>':"")
        +'</div>';
      card.onclick=(function(e){return function(){_selectEKCheckItem(e);};})(ek);
      card.onmouseover=function(){this.style.background="var(--b3)";};
      card.onmouseout=function(){this.style.background="";};
      listEl.appendChild(card);
    });
  },function(){listEl.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>VERBINDUNGSFEHLER</p></div>';});
}

function _selectEKCheckItem(ek){
  ekCheckItem=ek;
  ekCheckStep=2;
  var products=(ek.produkte||"").split(",").map(function(p){return p.trim();}).filter(Boolean);
  if(!ekCheckList.length||!ekCheckList[0]||ekCheckList[0]._eid!==ek.rowIndex){
    ekCheckList=products.map(function(name){return{name:name,eingelagert:false,scanId:"",_eid:ek.rowIndex};});
  }
  _renderEKCheckStep();
  _renderEKCheckInfoBar();
  _renderEKCheckItems();
}

function _renderEKCheckInfoBar(){
  var el=document.getElementById("ek-check-info");if(!el||!ekCheckItem)return;
  var done=ekCheckList.filter(function(i){return i.eingelagert;}).length;
  var total=ekCheckList.length;
  var pct=total>0?Math.round(done/total*100):0;
  el.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    +'<div><div style="font-size:10px;font-weight:700;color:var(--acc);font-family:monospace;letter-spacing:.5px">'
    +(ekCheckItem.zimmer?"📍 "+esc(ekCheckItem.zimmer):"KEIN ZIMMER")+'</div>'
    +'<div style="font-size:14px;font-weight:700;color:var(--w1);margin-top:1px">'+esc(ekCheckItem.kunde||"–")+'</div></div>'
    +'<div style="text-align:right"><div style="font-size:22px;font-weight:800;color:'+(done===total&&total>0?"var(--acc)":"var(--w1)")+';font-family:monospace">'+done+"/"+total+'</div>'
    +'<div style="font-size:9px;color:var(--w4);font-family:monospace">EINGELAGERT</div></div></div>'
    +'<div style="background:var(--e1);border-radius:99px;height:3px;overflow:hidden">'
    +'<div style="height:100%;background:var(--acc);border-radius:99px;width:'+pct+'%;transition:width .4s"></div></div>';
}

function _renderEKCheckItems(){
  var el=document.getElementById("ek-check-items");
  var cb=document.getElementById("ek-check-complete");
  if(!el)return;
  el.innerHTML="";
  var done=ekCheckList.filter(function(i){return i.eingelagert;}).length;
  ekCheckList.forEach(function(item,idx){
    var row=document.createElement("div");
    row.style.cssText="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--e1)";
    if(item.eingelagert){
      row.innerHTML='<div style="width:26px;height:26px;border-radius:50%;background:var(--acc);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        +'<i class="bi bi-check" style="color:#000;font-size:15px"></i></div>'
        +'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--acc)">'+esc(item.name)+'</div>'
        +(item.scanId?'<div style="font-size:10px;color:var(--w4);font-family:monospace">'+esc(item.scanId)+' · EINGELAGERT</div>':'')
        +'</div><i class="bi bi-check-circle-fill" style="color:var(--acc);font-size:18px"></i>';
    } else {
      row.style.cursor="pointer";
      row.innerHTML='<div style="width:26px;height:26px;border-radius:50%;border:2px solid var(--e3);flex-shrink:0"></div>'
        +'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--w1)">'+esc(item.name)+'</div>'
        +'<div style="font-size:10px;color:var(--col-b);font-family:monospace">ANTIPPEN → EINLAGERN</div></div>'
        +'<i class="bi bi-chevron-right" style="color:var(--w4);font-size:13px"></i>';
      row.onclick=(function(i){return function(){_startEKItemEinlagern(i);};})(idx);
      row.onmouseover=function(){this.style.background="var(--b3)";};
      row.onmouseout=function(){this.style.background="";};
    }
    el.appendChild(row);
  });
  if(cb)cb.style.display=(done===ekCheckList.length&&ekCheckList.length>0)?"block":"none";
  _renderEKCheckInfoBar();
}

function _startEKItemEinlagern(itemIdx){
  ekCheckCurrentIdx=itemIdx;
  var item=ekCheckList[itemIdx];
  if(!item||item.eingelagert)return;
  // Register callback for after doSave
  window._afterSaveCallback=function(savedScanId){
    ekCheckList[ekCheckCurrentIdx].eingelagert=true;
    ekCheckList[ekCheckCurrentIdx].scanId=savedScanId||"";
    window._afterSaveCallback=null;
    toast(esc(item.name)+" eingelagert ✅","ok",2500);
    // Return to EK check list
    goTabFn("scan-panel");
    setTimeout(function(){
      var mc=document.getElementById("mode-chooser");
      var ep=document.getElementById("ek-check-panel");
      if(mc)mc.style.display="none";
      if(ep)ep.style.display="block";
      ekCheckStep=2;
      _renderEKCheckStep();
      _renderEKCheckInfoBar();
      _renderEKCheckItems();
    },200);
  };
  // Store name to pre-fill
  window._ekCheckPreFillName=item.name;
  // Navigate to scan panel einlagern
  goTabFn("scan-panel");
  setTimeout(function(){
    resetToMode();
    setMode("einlagern");
    toast('📦 Einlagern: "'+esc(item.name)+'" dann Kategorie wählen',"inf",7000);
  },200);
}

function completeEKCheck(){
  if(!ekCheckItem)return;
  var allDone=ekCheckList.every(function(i){return i.eingelagert;});
  if(!allDone&&!confirm("Nicht alle Artikel eingelagert. Trotzdem abschließen?"))return;
  var btn=document.getElementById("ek-check-complete-btn");
  if(btn)setBL(btn,true);
  gasPost("updateEinkauf",{rowIndex:ekCheckItem.rowIndex,status:"Abgeschlossen",lieferstatus:"Zugestellt"},
    function(r){
      if(btn)setBL(btn,false);
      if(r&&r.ok){toast("🎉 Einkauf abgeschlossen!","ok",4000);closeEKCheck();loadHandel();}
      else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
    },function(){if(btn)setBL(btn,false);toast("Verbindungsfehler","err");});
}


// ================================================================
// REKLAMATION STEPPER
// ================================================================
var rtStep = 1, rtTotalSteps = 3;

function openRTModal(item, prefillVerkauf) {
  window.editRTItem = item || null;
  rtStep = 1;
  sv2("rt-produkt", item ? item.produkt : (prefillVerkauf ? prefillVerkauf.produkte||"" : ""));
  sv2("rt-kunde",   item ? item.kunde   : (prefillVerkauf ? prefillVerkauf.kunde||""   : ""));
  sv2("rt-scanid",  item ? (item.scanId||item.scanIds||"") : "");
  sv2("rt-grund",   item ? item.grund   : "");
  sv2("rt-status",  item ? item.status  : "Offen");
  sv2("rt-erstattung", item ? (item.erstattung||"") : "");
  sv2("rt-hinweise",   item ? (item.hinweise||"")   : "");
  sv2("rt-ma",         item ? (item.mitarbeiter||emp) : emp);
  sv2("rt-verkauf-zeile", item ? (item.verkaufZeile||"") : (prefillVerkauf ? prefillVerkauf.rowIndex||"" : ""));
  // Reset grund buttons
  ["defekt","falsch","beschaedigt","nonfunc","sonstiges"].forEach(function(id){
    var el=document.getElementById("rtg-"+id); if(el) el.className="cbtn";
  });
  if(item && item.grund) selRTGrund(item.grund);
  var d=document.getElementById("rt-diag"); if(d) d.style.display="none";
  _renderRTStep();
  document.getElementById("rt-modal").classList.add("open");
}

function closeRTModal() {
  document.getElementById("rt-modal").classList.remove("open");
  window.editRTItem = null;
}

function _renderRTStep() {
  for(var i=1;i<=rtTotalSteps;i++){
    var el=document.getElementById("rts-"+i);
    if(el) el.style.display=(i===rtStep?"block":"none");
  }
  var pct=Math.round((rtStep/rtTotalSteps)*100);
  var pb=document.getElementById("rt-prog"); if(pb) pb.style.width=pct+"%";
  var sl=document.getElementById("rt-step-lbl"); if(sl) sl.textContent="STEP "+rtStep+"/"+rtTotalSteps;
  var snames=["PRODUKT","GRUND & STATUS","ABSCHLUSS"];
  var sn=document.getElementById("rt-step-name"); if(sn) sn.textContent=snames[rtStep-1]||"";
  var bb=document.getElementById("rt-back-btn"); if(bb) bb.disabled=(rtStep===1);
  var nb=document.getElementById("rt-next-btn"); if(nb) nb.style.display=(rtStep<rtTotalSteps?"inline-flex":"none");
  var sb=document.getElementById("rt-save-btn"); if(sb) sb.style.display=(rtStep===rtTotalSteps?"inline-flex":"none");
  if(rtStep===3) _buildRTSummary();
}

function rtStepNav(dir) {
  var d=document.getElementById("rt-diag"); if(d) d.style.display="none";
  if(dir>0){
    if(rtStep===1 && !gv("rt-produkt").trim()){
      var dg=document.getElementById("rt-diag");
      dg.className="diag derr"; dg.textContent="Bitte Produkt eingeben."; dg.style.display="block"; return;
    }
    if(rtStep===2 && !gv("rt-grund")){
      var dg=document.getElementById("rt-diag");
      dg.className="diag derr"; dg.textContent="Bitte Reklamationsgrund wählen."; dg.style.display="block"; return;
    }
  }
  rtStep=Math.max(1,Math.min(rtTotalSteps,rtStep+dir));
  _renderRTStep();
}

function _buildRTSummary() {
  var el=document.getElementById("rt-summary"); if(!el) return;
  el.innerHTML=
    "PRODUKT: "+(gv("rt-produkt")||"–")+"<br>"+
    "KUNDE: "+(gv("rt-kunde")||"–")+"<br>"+
    "GRUND: "+(gv("rt-grund")||"–")+"<br>"+
    "STATUS: "+(gv("rt-status")||"–")+"<br>"+
    (gv("rt-erstattung")?"ERSTATTUNG: "+gv("rt-erstattung")+"€<br>":"")+
    "MITARBEITER: "+(gv("rt-ma")||emp||"–");
}

function selRTGrund(grund) {
  sv2("rt-grund", grund);
  ["defekt","falsch","beschaedigt","nonfunc","sonstiges"].forEach(function(id){
    var el=document.getElementById("rtg-"+id); if(el) el.className="cbtn";
  });
  var map={
    "Defekt erhalten":"defekt","Falsches Produkt":"falsch",
    "Beschädigte Verpackung":"beschaedigt","Nicht funktionsfähig":"nonfunc","Sonstiges":"sonstiges"
  };
  var el=document.getElementById("rtg-"+(map[grund]||"sonstiges"));
  if(el) el.className="cbtn vk-sel";
}

function openRTScanner() {
  var el=document.getElementById("rt-scanid"); if(el) el.focus();
  toast("Barcode scannen oder manuell eingeben","inf",2000);
}

function saveRTForm() {
  var d=document.getElementById("rt-diag"); if(d) d.style.display="none";
  var grund=gv("rt-grund");
  if(!gv("rt-produkt").trim()){
    var dg=document.getElementById("rt-diag");
    dg.className="diag derr"; dg.textContent="Bitte Produkt eingeben."; dg.style.display="block"; return;
  }
  if(!grund){
    var dg=document.getElementById("rt-diag");
    dg.className="diag derr"; dg.textContent="Bitte Grund wählen."; dg.style.display="block"; return;
  }
  var data={
    produkt:     gv("rt-produkt"),
    kunde:       gv("rt-kunde"),
    scanId:      gv("rt-scanid"),
    grund:       grund,
    status:      gv("rt-status"),
    erstattung:  gv("rt-erstattung"),
    hinweise:    gv("rt-hinweise"),
    mitarbeiter: gv("rt-ma")||emp,
    verkaufZeile:gv("rt-verkauf-zeile")||""
  };
  var btn=document.getElementById("rt-save-btn"); setBL(btn,true);
  if(window.editRTItem){
    data.rowIndex=window.editRTItem.rowIndex;
    gasPost("updateRetoure",data,function(r){
      setBL(btn,false);
      if(r&&r.ok){ toast(r.msg||"Aktualisiert","ok"); closeRTModal(); }
      else{ var dg=document.getElementById("rt-diag"); dg.className="diag derr"; dg.textContent=r?r.fehler:"Fehler"; dg.style.display="block"; }
    },function(e){ setBL(btn,false); toast("Fehler: "+e,"err"); });
  } else {
    gasPost("saveRetoure",data,function(r){
      setBL(btn,false);
      if(r&&r.ok){
        toast(r.msg||"Reklamation gespeichert","ok");
        addNotification("⚠️ Reklamation",data.produkt+" – "+grund,"alert");
        closeRTModal();
      } else {
        var dg=document.getElementById("rt-diag"); dg.className="diag derr"; dg.textContent=r?r.fehler:"Fehler"; dg.style.display="block";
      }
    },function(e){ setBL(btn,false); toast("Fehler: "+e,"err"); });
  }
}

window.addEventListener("load",function(){
  var no=document.getElementById("notif-overlay");if(no)no.addEventListener("click",function(e){if(e.target===this)closeNotifications();});
  var dm=document.getElementById("del-modal");if(dm)dm.addEventListener("click",function(e){if(e.target===this)closeDelModal();});
  var am=document.getElementById("acc-modal");if(am)am.addEventListener("click",function(e){if(e.target===this)closeAccModal();});
  var vm2=document.getElementById("vk-modal");if(vm2)vm2.addEventListener("click",function(e){if(e.target===this)closeVKModal();});
  var em=document.getElementById("ek-modal");if(em)em.addEventListener("click",function(e){if(e.target===this)closeEKModal();});
  var rt=document.getElementById("rt-modal");if(rt)rt.addEventListener("click",function(e){if(e.target===this)closeRTModal();});
  var cm=document.getElementById("china-modal");if(cm)cm.addEventListener("click",function(e){if(e.target===this)closeChinaModal();});
  var vmo=document.getElementById("vk-multi-overlay");if(vmo)vmo.addEventListener("click",function(e){if(e.target===this)closeVKMulti();});
  // Check for saved session (auto-login)
  var savedSession = loadSession();
  if(savedSession && savedSession.name) {
    applyEmp(savedSession.name, savedSession.rolle||"mitarbeiter");
    loadStats();
    checkUnconfirmedNotifs();
  } else {
    initEmp();
  }
  initSearch();loadNotifications();loadChinaEntries();
  setupEnterKeys();
  setupKeyboardShortcuts();
  setTimeout(initGlobalCamList,300);
  setTimeout(runSmartNotifications,3000);
  setInterval(runSmartNotifications,24*60*60*1000);
});


// ================================================================
// ANALYSE + CHINA + MULTISELECT
// ================================================================
var analyseTab="guv",chinaEntries=[],editChinaIdx=-1;

function setAnalyseTab(tab){
  analyseTab=tab;
  ["guv","china","ka","rt"].forEach(function(t){
    var b=document.getElementById("atab-"+t);var e=document.getElementById("an-"+t);
    if(b)b.className="ltab"+(t===tab?" on":"");
    if(e)e.style.display=t===tab?"block":"none";
  });
  if(tab==="guv")buildGUV();
  if(tab==="china")buildChinaList();
  if(tab==="ka"){if(!allItems.length)loadAll();setTimeout(function(){renderKAPanel();_buildKAPanel();},allItems.length?0:1500);}
  if(tab==="rt")buildRetourenList();
}
function renderAnalysePanel(){
  if(!allVerkauf||!allVerkauf.length){gasGet("getAllVerkauf",{},function(r){if(r&&r.ok){allVerkauf=r.data||[];setAnalyseTab(analyseTab||"guv");}},function(){});}
  else{setAnalyseTab(analyseTab||"guv");}
}
function fmtEur(v){var n=parseFloat(v||0);return isNaN(n)?"–":n.toFixed(2)+"€";}
function buildGUV(){
  function _el(id){return document.getElementById(id);}
  var filter=(document.getElementById("an-filter-month")||{value:"all"}).value;
  var vkData=(allVerkauf||[]).filter(function(v){
    if(filter==="all")return true;if(!v.datum)return false;
    var now=new Date(),m=now.getMonth()+1,y=now.getFullYear();
    var pts=v.datum.split(".");var vm=parseInt(pts[1]||0),vy=parseInt((pts[2]||"").split(" ")[0]);
    if(filter==="thismonth")return vm===m&&vy===y;
    if(filter==="lastmonth"){var lm=m===1?12:m-1,ly=m===1?y-1:y;return vm===lm&&vy===ly;}
    return true;
  });
  var totalVP=0,totalMarge=0;
  vkData.forEach(function(v){totalVP+=parseFloat(v.verkaufspreis||0);totalMarge+=parseFloat(v.marge||0);});
  if(_el("an-gewinn"))elG("an-gewinn").textContent=fmtEur(totalMarge>0?totalMarge:0);
  if(elG("an-verlust"))elG("an-verlust").textContent=fmtEur(totalMarge<0?Math.abs(totalMarge):0);
  if(elG("an-umsatz"))elG("an-umsatz").textContent=fmtEur(totalVP);
  if(elG("an-marge-avg"))elG("an-marge-avg").textContent=vkData.length>0?(totalMarge/vkData.length).toFixed(2)+"€":"–";
  buildMonthlyChart();
  var tbody=elG("an-vk-table");
  if(tbody){
    if(!vkData.length){tbody.innerHTML='<div class="empty" style="padding:20px"><i class="bi bi-inbox"></i><p>Keine Verkäufe</p></div>';return;}
    tbody.innerHTML='<table class="an-table"><thead><tr><th>Produkt</th><th>VK</th><th>EK</th><th>Marge</th><th>Plattform</th></tr></thead><tbody>'
      +vkData.slice().sort(function(a,b){return parseFloat(b.marge||0)-parseFloat(a.marge||0);}).map(function(v){var m=parseFloat(v.marge||0);return'<tr><td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(v.produkte||"–")+'</td><td>'+fmtEur(v.verkaufspreis)+'</td><td>'+fmtEur(v.einkaufspreis)+'</td><td class="'+(m>=0?"an-pos":"an-neg")+'">'+(m>=0?"+":"")+m.toFixed(2)+'€</td><td>'+esc(v.plattform||"–")+'</td></tr>';}).join("")+'</tbody></table>';
  }
  var vld=elG("an-verlust-detail");
  if(vld){
    var neg=vkData.filter(function(v){return parseFloat(v.marge||0)<0;});
    var noEK=vkData.filter(function(v){return !parseFloat(v.einkaufspreis||0);});
    var h="";
    if(neg.length)h+=neg.map(function(v){return'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--b1);font-size:12px"><span>'+esc(v.produkte||"–")+'</span><span class="an-neg">'+parseFloat(v.marge||0).toFixed(2)+'€</span></div>';}).join("");
    if(noEK.length)h+='<div style="font-size:12px;color:var(--amber);margin-top:7px">⚠️ '+noEK.length+' Verkäufe ohne EK</div>';
    vld.innerHTML=h||'<div style="font-size:12px;color:var(--green)">✅ Keine Verluste</div>';
  }
}
function buildMonthlyChart(){
  var bE=document.getElementById("an-chart-bars"),lE=document.getElementById("an-chart-labels");
  if(!bE||!lE)return;
  var months=[],now=new Date();
  for(var i=5;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({m:d.getMonth()+1,y:d.getFullYear(),label:["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][d.getMonth()],marge:0});}
  (allVerkauf||[]).forEach(function(v){if(!v.datum)return;var pts=v.datum.split(".");months.forEach(function(mo){if(mo.m===parseInt(pts[1]||0)&&mo.y===parseInt((pts[2]||"").split(" ")[0]))mo.marge+=parseFloat(v.marge||0);});});
  var maxA=Math.max.apply(null,months.map(function(m){return Math.abs(m.marge)||0;}).concat([1]));
  bE.innerHTML=months.map(function(mo){var pct=Math.max(4,Math.round((Math.abs(mo.marge)/maxA)*76));return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:80px"><div style="font-size:9px;color:var(--t3);margin-bottom:2px">'+(mo.marge>=0?"+":"")+Math.round(mo.marge)+'</div><div class="an-bar" style="background:'+(mo.marge>=0?"var(--blue)":"var(--red)")+';height:'+pct+'px;width:100%"></div></div>';}).join("");
  lE.innerHTML=months.map(function(mo){return'<span style="flex:1;font-size:9px;color:var(--t3);text-align:center">'+mo.label+'</span>';}).join("");
}
function buildRetourenList(){
  gasGet("getAllRetouren",{},function(r){
    var el=document.getElementById("an-rt-list");if(!el)return;
    if(!r||!r.ok||!r.data||!r.data.length){el.innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Reklamationen</p></div>';return;}
    var data=r.data;
    el.innerHTML=data.map(function(rt){
      var sC={"Offen":"var(--amber)","In Bearbeitung":"var(--blue)",Erstattet:"var(--green)",Abgelehnt:"var(--red)"}[rt.status]||"var(--t3)";
      return'<div class="ic" style="cursor:pointer"><div class="ic-top"><div class="ic-name">'+esc(rt.produkt||"–")+'</div><span style="font-size:11px;font-weight:600;color:'+sC+'">'+esc(rt.status||"–")+'</span></div><div class="chips"><span class="chip"><b>'+esc(rt.kunde||"–")+'</b></span><span class="chip">'+esc(rt.datum||"–")+'</span>'+(rt.erstattung?'<span class="chip" style="color:var(--red)">'+esc(rt.erstattung)+'€</span>':"")+' <span class="chip">'+esc(rt.grund||"–")+'</span></div></div>';
    }).join("");
    Array.from(el.querySelectorAll(".ic")).forEach(function(node,i){node.onclick=function(){openRTModal(data[i]);};});
  },function(){});
}
function openChinaForm(idx){
  editChinaIdx=(idx!==undefined)?idx:-1;var item=idx!==undefined?chinaEntries[idx]:null;
  sv2("cn-desc",item?item.desc:"");sv2("cn-qty",item?item.qty:"");sv2("cn-wert",item?item.wert:"");
  sv2("cn-fracht",item?item.fracht:"");sv2("cn-zoll",item?item.zoll:"");sv2("cn-supplier",item?item.supplier:"");
  sv2("cn-status",item?item.status:"Bestellt");sv2("cn-date",item?item.date:new Date().toISOString().split("T")[0]);
  sv2("cn-track",item?item.track:"");sv2("cn-notes",item?item.notes:"");
  var d=document.getElementById("china-diag");if(d)d.style.display="none";
  var db=document.getElementById("cn-del-btn");if(db)db.style.display=item?"inline-flex":"none";
  calcChinaCosts();document.getElementById("china-modal").classList.add("open");
}
function closeChinaModal(){document.getElementById("china-modal").classList.remove("open");}
function calcChinaCosts(){
  var w=parseFloat(gv("cn-wert")||0),f=parseFloat(gv("cn-fracht")||0),z=parseFloat(gv("cn-zoll")||0),q=parseInt(gv("cn-qty")||1)||1,t=w+f+z;
  var box=document.getElementById("cn-cost-summary");if(box)box.style.display=t>0?"block":"none";
  var tp=document.getElementById("cn-total-preview");if(tp)tp.textContent=t.toFixed(2)+"€";
  var pi=document.getElementById("cn-per-item");if(pi)pi.textContent=(t/q).toFixed(2)+"€/Stück";
}
function saveChinaEntry(){
  var desc=gv("cn-desc").trim();if(!desc){var d=document.getElementById("china-diag");d.className="diag derr";d.textContent="Beschreibung erforderlich.";d.style.display="block";return;}
  var w=parseFloat(gv("cn-wert")||0),f=parseFloat(gv("cn-fracht")||0),z=parseFloat(gv("cn-zoll")||0);
  var e={desc:desc,qty:gv("cn-qty"),wert:w,fracht:f,zoll:z,total:w+f+z,supplier:gv("cn-supplier"),status:gv("cn-status"),date:gv("cn-date"),track:gv("cn-track"),notes:gv("cn-notes")};
  if(editChinaIdx>-1){chinaEntries[editChinaIdx]=e;}else{chinaEntries.push(e);}
  try{localStorage.setItem("smp_china",JSON.stringify(chinaEntries));}catch(ex){}
  closeChinaModal();buildChinaList();toast("Gespeichert ✅","ok");
}
function deleteChinaEntry(){
  if(editChinaIdx<0||!confirm("Import löschen?"))return;
  chinaEntries.splice(editChinaIdx,1);
  try{localStorage.setItem("smp_china",JSON.stringify(chinaEntries));}catch(e){}
  closeChinaModal();buildChinaList();
}
function buildChinaList(){
  var tC=0,tZ=0,tF=0;chinaEntries.forEach(function(c){tC+=c.total||0;tZ+=c.zoll||0;tF+=c.fracht||0;});
  function elG(id){return document.getElementById(id);}
  if(elC("cn-total-cost"))elC("cn-total-cost").textContent=tC.toFixed(2)+"€";
  if(elC("cn-total-zoll"))elC("cn-total-zoll").textContent=tZ.toFixed(2)+"€";
  if(elC("cn-total-fracht"))elC("cn-total-fracht").textContent=tF.toFixed(2)+"€";
  var list=elC("an-china-list");if(!list)return;
  if(!chinaEntries.length){list.innerHTML='<div class="empty"><i class="bi bi-box-seam"></i><p>Keine China-Importe</p></div>';return;}
  var sC={Bestellt:"var(--amber)",Unterwegs:"var(--blue)",Angekommen:"var(--teal)",Eingelagert:"var(--green)"};
  list.innerHTML=chinaEntries.map(function(c,i){
    return'<div class="china-item" onclick="openChinaForm('+i+')">'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:13px;font-weight:600;color:var(--t1)">'+esc(c.desc||"–")+'</span><span style="font-size:10px;font-weight:600;color:'+(sC[c.status]||"var(--t3)")+'">'+esc(c.status||"–")+'</span></div>'
      +'<div class="chips">'+(c.qty?'<span class="chip"><b>'+esc(c.qty)+'×</b></span>':"")+'<span class="chip"><b>'+((c.total||0).toFixed(2))+'€</b></span>'+(c.zoll?'<span class="chip" style="color:var(--amber)">Zoll '+c.zoll.toFixed(2)+'€</span>':"")+( c.supplier?'<span class="chip">'+esc(c.supplier)+'</span>':"")+'</div></div>';
  }).join("");
}
var vkmSelected=[];
function openVKMultiSelect(){vkmSelected=[];var items=allItems.filter(function(i){return i.type!=="defekt";});if(!items.length){loadAll();setTimeout(function(){_renderVKMList(allItems.filter(function(i){return i.type!=="defekt";}));},1500);}else{_renderVKMList(items);}document.getElementById("vk-multi-overlay").classList.add("open");_updateVKMCount();}
function closeVKMulti(){document.getElementById("vk-multi-overlay").classList.remove("open");}
function filterVKMulti(){var q=(document.getElementById("vkm-search")||{value:""}).value.toLowerCase();var items=allItems.filter(function(i){return i.type!=="defekt";});_renderVKMList(q?items.filter(function(i){var n=i.name||i.spiel||i.modell||"";return n.toLowerCase().includes(q)||(i.scanId||"").toLowerCase().includes(q);}):items);}
function _renderVKMList(items){var el=document.getElementById("vkm-list");if(!el)return;if(!items.length){el.innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Artikel</p></div>';return;}el.innerHTML=items.map(function(item){var nm=item.name||item.spiel||item.modell||"–";var isSel=vkmSelected.some(function(s){return s.rowIndex===item.rowIndex&&s.type===item.type;});return'<div class="vkm-item'+(isSel?" selected":"")+'" data-type="'+esc(item.type)+'" data-row="'+item.rowIndex+'" onclick="toggleVKMItem(this)"><div class="vkm-check">'+(isSel?"✓":"")+'</div><div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--t1)">'+esc(nm)+'</div><div style="font-size:10px;color:var(--t3)">'+esc(item.datum||"")+(item.einkaufspreis?" · EK: "+item.einkaufspreis+"€":"")+'</div></div></div>';}).join("");}
function toggleVKMItem(el){var type=el.getAttribute("data-type"),row=parseInt(el.getAttribute("data-row"));var item=allItems.find(function(i){return i.type===type&&i.rowIndex===row;});if(!item)return;var idx=vkmSelected.findIndex(function(s){return s.rowIndex===row&&s.type===type;});if(idx>-1){vkmSelected.splice(idx,1);el.className="vkm-item";el.querySelector(".vkm-check").textContent="";}else{vkmSelected.push(item);el.className="vkm-item selected";el.querySelector(".vkm-check").textContent="✓";}_updateVKMCount();}
function _updateVKMCount(){var cnt=document.getElementById("vkm-cnt");if(cnt)cnt.textContent=vkmSelected.length;var ek=vkmSelected.reduce(function(s,i){return s+parseFloat(i.einkaufspreis||0);},0);var et=document.getElementById("vkm-ek-total");if(et)et.textContent=ek.toFixed(2)+"€";}
function applyVKMulti(){if(!vkmSelected.length){toast("Mind. 1 Artikel wählen","err");return;}var names=vkmSelected.map(function(i){return i.name||i.spiel||i.modell||"–";}).join(", ");var scanIds=vkmSelected.map(function(i){return i.scanId||"";}).filter(Boolean).join(", ");var totalEK=vkmSelected.reduce(function(s,i){return s+parseFloat(i.einkaufspreis||0);},0);sv2("vk-produkte",names);var sEl=document.getElementById("vk-scanid");if(sEl){sEl.removeAttribute("readonly");sEl.value=scanIds;}var epEl=document.getElementById("vk-ep");if(epEl)epEl.value=totalEK.toFixed(2);var chips=document.getElementById("vk-multi-chips");if(chips)chips.innerHTML=vkmSelected.map(function(item){var nm=item.name||item.spiel||item.modell||"–";return'<span style="background:var(--s3);border:1px solid var(--b2);border-radius:4px;padding:2px 7px;font-size:11px;color:var(--t2)">'+esc(nm)+'</span>';}).join("");var pi=document.getElementById("vk-product-info");if(pi){pi.textContent=vkmSelected.length+" Artikel · EK: "+totalEK.toFixed(2)+"€";pi.style.display="block";}closeVKMulti();toast(vkmSelected.length+" Artikel übernommen","ok",2500);}


// ── Compatibility aliases ─────────────────────────
function closeAccModal(){document.getElementById("acc-modal").classList.remove("open");}
function openDelModal(msg,fn){
  var d=document.getElementById("del-modal");
  var t=document.getElementById("del-modal-text");
  var c=document.getElementById("del-modal-confirm");
  if(t)t.textContent=msg||"Wirklich löschen?";
  if(c){c.onclick=function(){if(fn)fn();closeDelModal();};}
  if(d)d.classList.add("open");
}
