


var GAS_URL = "https://script.google.com/macros/s/AKfycbyKrrlwjrVJtZNC2T13ueWe7QKD5vXNv9Hmj90GuyczHxqtrB8Skf_ddlPxK761qA/exec";

// ── STATE ─────────────────────────────────────────────────────────
var emp="", allItems=[], lf="all", cardRegistry=[];
var camStream=null, camAnimFrame=null, camRunning=false, camDevices=[];
var firstCamDeviceId=null; // FIX: speichert DeviceId von Kamera 0
var scanMode="einlagern"; // "einlagern" | "verkauf" | "einkauf"
var curCat="", curType="";
var forcedSpielSystem="";
var stepCur=1, stepTotal=5;
var probChoice=null, probType=null;
var photos=[];
var editingItem=null, isEditMode=false;
var testRowNum=-1, timerInterval=null;
var SNAMES={konsole:["Barcode","Name","Details","Mängel","Mitarbeiter"],spiel:["Barcode","Titel","Details","Mängel","Mitarbeiter"],controller:["Barcode","Controller","Details","Mängel","Mitarbeiter"],handy:["Barcode","Modell","Details","Mängel","Mitarbeiter"],pc:["Barcode","Modell","Details","Mängel","Mitarbeiter"]};
var setMembershipByScanId={},setRowsCache=[];
var restrictedActivationMode=false,restrictedActivationCtx=null;
var expandedTaskId="",expandedTaskSubtasks={};

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
function ensureProfileSetupOverlay(){
  if(document.getElementById("profile-setup-overlay"))return;
  var ov=document.createElement("div");
  ov.id="profile-setup-overlay";
  ov.style.cssText="display:none;position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:10002;padding:16px;overflow-y:auto";
  ov.innerHTML='<div style="max-width:440px;margin:20px auto;background:var(--b2);border:1px solid var(--acc);border-radius:14px;padding:22px 18px">'+
    '<div style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:2px;color:var(--acc);margin-bottom:4px">PROFIL AKTIVIEREN</div>'+
    '<p style="font-size:11px;color:var(--w4);margin-bottom:14px;font-family:Space Mono,monospace">Neues Passwort setzen und Hinweise bestätigen.</p>'+
    '<div class="diag" id="psu-diag" style="display:none"></div>'+
    '<label class="fl">MITARBEITER</label><div id="psu-name" style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--w1)"></div>'+
    '<label class="fl">NEUES PASSWORT *</label><input type="password" id="psu-pw1" class="fc mb-2" autocomplete="new-password"/>'+
    '<label class="fl">PASSWORT WIEDERHOLEN *</label><input type="password" id="psu-pw2" class="fc mb-3" autocomplete="new-password"/>'+
    '<div style="background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:12px;margin-bottom:12px;font-size:11px;color:var(--w3);line-height:1.6">'+
    '<a href="#" id="psu-clause-link" target="_blank" rel="noopener" style="color:var(--acc);font-weight:700;text-decoration:underline">Haftungs- und Nutzungshinweise öffnen →</a>'+
    '<p style="margin:8px 0 0;font-size:10px">Bitte den Link anklicken, um die Bestätigungen freizuschalten.</p></div>'+
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:11px;color:var(--w3);margin-bottom:8px;cursor:pointer">'+
    '<input type="checkbox" id="psu-chk-read" disabled style="margin-top:2px"/> <span>Ich habe die Hinweise gelesen.</span></label>'+
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:11px;color:var(--w3);margin-bottom:14px;cursor:pointer">'+
    '<input type="checkbox" id="psu-chk-final" disabled style="margin-top:2px"/> <span>Ich bestätige die verbindliche Kenntnisnahme.</span></label>'+
    '<button type="button" class="btn btn-primary w-100 fw-bold" id="psu-btn" disabled>PROFIL SPEICHERN</button></div>';
  document.body.appendChild(ov);
  document.getElementById("psu-clause-link").addEventListener("click",function(e){
    var u=this.getAttribute("data-href")||"#";
    if(u&&u!=="#"){e.preventDefault();openNativeKlauselTab(u);}
    window._psuClauseRead=true;
    var cr=document.getElementById("psu-chk-read");if(cr)cr.disabled=false;
  });
  document.getElementById("psu-chk-read").addEventListener("change",function(){
    var f=document.getElementById("psu-chk-final");if(f)f.disabled=!this.checked;
    _psuUpdateBtn();
  });
  document.getElementById("psu-chk-final").addEventListener("change",function(){_psuUpdateBtn();});
  document.getElementById("psu-btn").addEventListener("click",submitProfileSetup);
}
function _psuUpdateBtn(){
  var b=document.getElementById("psu-btn");
  if(!b)return;
  var r=document.getElementById("psu-chk-read"),f=document.getElementById("psu-chk-final");
  b.disabled=!(r&&r.checked&&f&&f.checked);
}
function showProfileSetupOverlay(ctx){
  ensureProfileSetupOverlay();
  window._psuName=ctx.name||"";
  window._psuCurrentPw=ctx.currentPassword||"";
  var nm=document.getElementById("psu-name");if(nm)nm.textContent=ctx.name||"";
  var link=document.getElementById("psu-clause-link");
  if(link){link.setAttribute("data-href",ctx.klauselUrl||("#"));link.setAttribute("href",ctx.klauselUrl||("#"));}
  ["psu-pw1","psu-pw2"].forEach(function(id){var el=document.getElementById(id);if(el)el.value="";});
  var cr=document.getElementById("psu-chk-read"),cf=document.getElementById("psu-chk-final");
  if(cr){cr.checked=false;cr.disabled=true;}if(cf){cf.checked=false;cf.disabled=true;}
  window._psuClauseRead=false;
  var d=document.getElementById("psu-diag");if(d)d.style.display="none";
  document.getElementById("profile-setup-overlay").style.display="block";
  _psuUpdateBtn();
}
function submitProfileSetup(){
  var p1=(document.getElementById("psu-pw1")||{value:""}).value;
  var p2=(document.getElementById("psu-pw2")||{value:""}).value;
  var dg=document.getElementById("psu-diag"),btn=document.getElementById("psu-btn");
  if(p1.length<6){if(dg){dg.className="diag derr";dg.textContent="Neues Passwort mind. 6 Zeichen.";dg.style.display="block";}return;}
  if(p1!==p2){if(dg){dg.className="diag derr";dg.textContent="Passwörter stimmen nicht überein.";dg.style.display="block";}return;}
  if(!document.getElementById("psu-chk-final").checked){if(dg){dg.className="diag derr";dg.textContent="Bitte beide Kästchen bestätigen.";dg.style.display="block";}return;}
  if(dg)dg.style.display="none";
  setBL(btn,true);
  gasPost("completeProfileSetup",{
    name:window._psuName||"",
    currentPassword:window._psuCurrentPw||"",
    newPassword:p1,
    newPassword2:p2,
    klauselAkzeptiert:true
  },function(r){
    setBL(btn,false);
    if(r&&r.ok){
      var ov=document.getElementById("profile-setup-overlay");if(ov)ov.style.display="none";
      if(window._psuPendingLoginName){ applyEmp(window._psuPendingLoginName,window._psuPendingLoginRolle||"mitarbeiter"); loadStats(); checkUnconfirmedNotifs(); }
      window._psuPendingLoginName=""; window._psuPendingLoginRolle="";
      toast("Profil aktiv ✅","ok");
    }else{
      if(dg){dg.className="diag derr";dg.textContent=r?r.fehler:"Fehler";dg.style.display="block";}
    }
  },function(e){setBL(btn,false);if(dg){dg.className="diag derr";dg.textContent=String(e);dg.style.display="block";}});
}
var empRolle="mitarbeiter";
function normalizeRole(role){
  var r=String(role||"").toLowerCase().trim();
  if(r==="owner")r="inhaber";
  if(["mitarbeiter","senior","co-chef","inhaber"].indexOf(r)===-1)r="mitarbeiter";
  return r;
}
function isOwner(){return normalizeRole(empRolle)==="inhaber";}
function isCoChief(){return normalizeRole(empRolle)==="co-chef";}
function canManageEmployees(){var r=normalizeRole(empRolle);return r==="inhaber"||r==="co-chef";}

function openNativeKlauselTab(fallbackUrl){
  var w=window.open("about:blank","_blank");
  if(!w){if(fallbackUrl)window.open(fallbackUrl,"_blank");return;}
  var render=function(payload){
    var title=(payload&&payload.title)||"Haftungs- und Nutzungsklausel";
    var ps=(payload&&payload.paragraphs)||[];
    var pts=(payload&&payload.points)||[];
    var html='<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#101a2a 0,#070b11 52%,#05070b 100%);color:#e6edf3;font-family:Space Mono,Inter,system-ui,sans-serif;padding:18px}.wrap{max-width:980px;margin:0 auto}.card{background:linear-gradient(180deg,#0f1724,#0b111b);border:1px solid rgba(88,166,255,.22);box-shadow:0 14px 60px rgba(0,0,0,.45);border-radius:16px;padding:22px}.head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}.badge{font-size:10px;color:#7fb7ff;border:1px solid rgba(127,183,255,.35);padding:4px 8px;border-radius:999px}.brand{font-family:Bebas Neue,Impact,sans-serif;letter-spacing:2px;font-size:26px;color:#58a6ff}.title{margin:0 0 8px;font-size:25px}.p,li{line-height:1.7;color:#c3ccd8;font-size:13px}.btn{display:inline-flex;margin-top:12px;background:#2381ff;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;border:1px solid rgba(255,255,255,.14)}</style></head><body><div class="wrap"><div class="card"><div class="head"><div class="brand">STOCKMASTER PRO</div><span class="badge">RECHTLICHER HINWEIS</span></div><h1 class="title">'+esc(title)+'</h1>'+(ps.map(function(t){return"<p class=\"p\">"+esc(t)+"</p>";}).join(""))+'<ul>'+(pts.map(function(t){return"<li>"+esc(t)+"</li>";}).join(""))+'</ul><a class="btn" href="#" onclick="window.close();return false;">Schließen</a></div></div></body></html>';
    w.document.open();w.document.write(html);w.document.close();
  };
  gasGet("getKlauselContent",{},function(r){if(r&&r.ok)render(r);else render(null);},function(){render(null);});
}
function ensureKlauselGateOverlay(){
  if(document.getElementById("klausel-gate-overlay"))return;
  var ov=document.createElement("div");
  ov.id="klausel-gate-overlay";
  ov.style.cssText="display:none;position:fixed;inset:0;z-index:10080;background:rgba(0,0,0,.97);padding:16px;overflow:auto";
  ov.innerHTML='<div style="max-width:520px;margin:20px auto;background:linear-gradient(180deg,#0f1724,#0b111b);border:1px solid rgba(88,166,255,.26);border-radius:14px;padding:16px"><div style="font-family:Bebas Neue,sans-serif;font-size:26px;color:var(--acc);letter-spacing:2px">KLAUSEL BESTÄTIGEN</div><div style="font-size:12px;color:var(--w3);margin-bottom:10px">Nur diese Seite ist bis zur Bestätigung verfügbar.</div><div id="kg-name" style="font-size:13px;color:var(--w2);margin-bottom:12px"></div><div class="diag" id="kg-diag" style="display:none"></div><button class="btn btn-outline-primary w-100 mb-2" onclick="openNativeKlauselTab(restrictedActivationCtx&&restrictedActivationCtx.klauselUrl||\'\')">Klausel öffnen</button><label style="display:flex;gap:8px;align-items:flex-start;color:var(--w3);font-size:12px;margin-bottom:10px"><input type="checkbox" id="kg-check" style="margin-top:2px"/> Ich habe die Klausel gelesen und stimme zu.</label><button class="btn btn-success w-100" id="kg-confirm" onclick="confirmKlauselGate()">Bestätigen</button></div>';
  document.body.appendChild(ov);
}
function ensureKlauselPanelUI(){
  if(!document.getElementById("klausel-panel")){
    var panel=document.createElement("section");
    panel.className="panel";
    panel.id="klausel-panel";
    panel.innerHTML='<div class="wrap"><div id="klausel-panel-body"></div></div>';
    var main=document.querySelector("main");
    if(main)main.appendChild(panel);
  }
  var nav=document.querySelector(".bnav");
  if(nav&&!nav.querySelector('.bnav-btn[data-tab="klausel-panel"]')){
    var btn=document.createElement("button");
    btn.className="bnav-btn";
    btn.dataset.tab="klausel-panel";
    btn.style.display="none";
    btn.innerHTML='<i class="bi bi-file-earmark-text"></i><span>Klausel</span>';
    btn.addEventListener("click",function(){goTabFn("klausel-panel");renderKlauselPanel();});
    nav.appendChild(btn);
  }
}
function renderKlauselPanel(){
  ensureKlauselPanelUI();
  var body=document.getElementById("klausel-panel-body");if(!body)return;
  body.innerHTML='<div style="max-width:900px;margin:0 auto;padding:10px 0"><div style="font-family:Bebas Neue,sans-serif;font-size:28px;color:var(--acc);letter-spacing:2px">KLAUSEL</div><div style="font-size:12px;color:var(--w4);margin-bottom:10px">Vor Freischaltung muss die Klausel akzeptiert werden.</div><div id="klausel-live-content" style="background:#0d1520;border:1px solid var(--e1);border-radius:10px;padding:12px;min-height:220px;font-size:12px;color:var(--w3);line-height:1.7"></div><div style="display:flex;gap:8px;align-items:center;margin-top:12px"><label style="display:flex;gap:8px;align-items:center;color:var(--w3)"><input type="checkbox" id="klausel-accept"/> Ich akzeptiere die Klausel</label><button id="klausel-accept-btn" class="btn btn-success btn-sm" disabled onclick="confirmKlauselGate()">Bestätigen</button></div></div>';
  var chk=document.getElementById("klausel-accept");
  var btn=document.getElementById("klausel-accept-btn");
  if(chk&&btn)chk.addEventListener("change",function(){btn.disabled=!this.checked;});
  gasGet("getKlauselContent",{},function(r){
    var el=document.getElementById("klausel-live-content");if(!el)return;
    var ps=(r&&r.ok&&r.paragraphs)?r.paragraphs:[];
    var pts=(r&&r.ok&&r.points)?r.points:[];
    el.innerHTML=(ps.map(function(p){return '<p style="margin:0 0 8px">'+esc(p)+'</p>';}).join(""))+'<ul style="margin:6px 0 0 16px">'+pts.map(function(p){return '<li>'+esc(p)+'</li>';}).join("")+'</ul>';
  },function(){});
}
function setRestrictedActivationMode(on,ctx){
  restrictedActivationMode=!!on;
  restrictedActivationCtx=on?(ctx||{}):null;
  ensureKlauselGateOverlay();
  ensureKlauselPanelUI();
  var ov=document.getElementById("klausel-gate-overlay");
  if(ov){
    ov.style.display=on?"block":"none";
    var nm=document.getElementById("kg-name");if(nm)nm.textContent=on?("Mitarbeiter: "+(ctx&&ctx.name?ctx.name:"")):"";
    var ck=document.getElementById("kg-check");if(ck)ck.checked=false;
    var dg=document.getElementById("kg-diag");if(dg)dg.style.display="none";
  }
  var tabs=document.querySelectorAll(".bnav-btn");
  tabs.forEach(function(b){
    var allow=b.dataset.tab==="klausel-panel";
    b.style.opacity=(on&&!allow)?"0.45":"1";
    b.style.pointerEvents=(on&&!allow)?"none":"";
  });
  var kb=document.querySelector('.bnav-btn[data-tab="klausel-panel"]');if(kb)kb.style.display=on?"inline-flex":"none";
  if(ov)ov.style.display="none";
  if(on){goTabFn("klausel-panel");renderKlauselPanel();}
}
function confirmKlauselGate(){
  if(!restrictedActivationCtx)return;
  var chk=document.getElementById("klausel-accept")||document.getElementById("kg-check");
  var dg=document.getElementById("kg-diag");
  if(!chk||!chk.checked){if(dg){dg.className="diag derr";dg.textContent="Bitte zuerst bestätigen.";dg.style.display="block";}return;}
  var btn=document.getElementById("kg-confirm");setBL(btn,true);
  gasPost("confirmKlauselActivation",{name:restrictedActivationCtx.name||"",password:restrictedActivationCtx.password||"",klauselAkzeptiert:true},function(r){
    setBL(btn,false);
    if(r&&r.ok){
      setRestrictedActivationMode(false);
      clearSession();
      changeEmp();
      toast("Account aktiviert. Bitte neu einloggen.","ok");
      var kb=document.querySelector('.bnav-btn[data-tab="klausel-panel"]');if(kb)kb.style.display="none";
    }else{
      if(dg){dg.className="diag derr";dg.textContent=r&&r.fehler?r.fehler:"Aktivierung fehlgeschlagen.";dg.style.display="block";}
    }
  },function(e){
    setBL(btn,false);
    if(dg){dg.className="diag derr";dg.textContent=String(e);dg.style.display="block";}
  });
}
function applyEmp(n,rolle){emp=n.trim();empRolle=rolle||"mitarbeiter";var b=document.getElementById("emp-name");if(b)b.textContent=emp;var s=document.getElementById("emp-scr");if(s)s.classList.add("hidden");try{setGreeting();}catch(e){}try{fillMA();}catch(e){}
// Show owner-only UI
var ownerEls=document.querySelectorAll(".owner-only");ownerEls.forEach(function(el){el.style.display=isOwner()?"block":"none";});
var ownerInline=document.querySelectorAll(".owner-only-inline");ownerInline.forEach(function(el){el.style.display=isOwner()?"inline-flex":"none";});
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
function updateMyStats(){if(!emp)return;var items=Array.isArray(allItems)?allItems:[];var notifArr=Array.isArray(notifications)?notifications:[];var today=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});var total=0,todayCount=0,defekte=0;items.forEach(function(item){if((item.mitarbeiter||"").toLowerCase()===emp.toLowerCase()){total++;if(item.datum&&item.datum.startsWith(today.split(".")[0]+"."+today.split(".")[1]))todayCount++;}if(item.type==="defekt"&&(item.mitarbeiter||"").toLowerCase()===emp.toLowerCase())defekte++;});var t=document.getElementById("my-total");if(t)t.textContent=total;var td=document.getElementById("my-today");if(td)td.textContent=todayCount;var df=document.getElementById("my-defekte");if(df)df.textContent=defekte;var nf=document.getElementById("my-notifs");if(nf)nf.textContent=notifArr.length;}

// Falls HTML durch Copy/Paste verschachtelt ist (z.B. list-panel in scan-panel),
// verschieben wir die Hauptpanels auf Top-Level, damit Tabs immer erreichbar sind.
function normalizePanelHierarchy(){
  var ids=["home-panel","scan-panel","list-panel","handel-panel","analyse-panel"];
  for(var i=0;i<ids.length;i++){
    var el=document.getElementById(ids[i]);
    if(!el)continue;
    var p=el.parentElement,insidePanel=false;
    while(p&&p!==document.body){
      if(p.classList&&p.classList.contains("panel")){insidePanel=true;break;}
      p=p.parentElement;
    }
    if(insidePanel)document.body.appendChild(el);
  }
}

function normalizeOverlayHierarchy(){
  var ids=[
    "vk-modal","ek-modal","del-modal","acc-modal","rt-modal","china-modal","vk-multi-overlay","upload-wizard",
    "profil-overlay","detail-overlay","notif-overlay","search-scan-overlay","mandatory-notif-overlay","activation-overlay","global-cam-bar"
  ];
  for(var i=0;i<ids.length;i++){
    var el=document.getElementById(ids[i]);
    if(!el)continue;
    if(el.parentElement!==document.body)document.body.appendChild(el);
  }
}

function ensureScanFlowNodes(){
  var scanPanel=document.getElementById("scan-panel");
  if(!scanPanel)return false;
  var wrap=scanPanel.querySelector(".wrap");
  if(!wrap){wrap=document.createElement("div");wrap.className="wrap";scanPanel.appendChild(wrap);}
  var ids=["mode-chooser","ek-check-panel","cat-chooser","sw-sub","main-stepper"];
  for(var i=0;i<ids.length;i++){
    var el=document.getElementById(ids[i]);
    if(!el)continue;
    if(el.parentElement!==wrap)wrap.appendChild(el);
  }
  return true;
}

// ── TABS ─────────────────────────────────────────────────────────
normalizePanelHierarchy();
normalizeOverlayHierarchy();
ensureScanFlowNodes();
document.querySelectorAll(".bnav-btn").forEach(function(b){b.addEventListener("click",function(){if(restrictedActivationMode&&b.dataset.tab!=="klausel-panel"){toast("Nur Klausel-Bereich verfügbar.","err");return;}document.querySelectorAll(".bnav-btn").forEach(function(x){x.classList.remove("on");});document.querySelectorAll(".panel").forEach(function(x){x.classList.remove("on");});b.classList.add("on");var p=document.getElementById(b.dataset.tab);if(p)p.classList.add("on");if(b.dataset.tab==="home-panel"){setGreeting();loadStats();if(!allItems.length){loadAll();}else{buildKAProgress();buildWeekChart();updateMyStats();}}if(b.dataset.tab==="list-panel"&&allItems.length===0)loadAll();if(b.dataset.tab==="search-panel"){initSearch();if(allItems.length===0){loadAll();setTimeout(function(){if(allItems.length>0)renderSearchResults(allItems);},2500);}else{renderSearchResults(allItems);}}if(b.dataset.tab==="handel-panel"){loadHandel();}if(b.dataset.tab==="analyse-panel"){renderAnalysePanel();}if(b.dataset.tab==="sets-panel"){renderSetsPanel();}if(b.dataset.tab==="klausel-panel"){renderKlauselPanel();}});});
function goTabFn(id,lfMode){if(restrictedActivationMode&&id!=="klausel-panel"){toast("Nur Klausel-Bereich verfügbar.","err");return;}document.querySelectorAll(".bnav-btn").forEach(function(b){b.classList.toggle("on",b.dataset.tab===id);});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id===id);});if(lfMode){lf=lfMode;renderList();}if(id==="list-panel"&&allItems.length===0)loadAll();if(id==="home-panel"){setGreeting();loadStats();if(!allItems.length){loadAll();}else{buildKAProgress();buildWeekChart();updateMyStats();}}if(id==="sets-panel"){renderSetsPanel();}if(id==="klausel-panel"){renderKlauselPanel();}}
function ensureSetsPanelUI(){
  if(document.getElementById("sets-panel"))return;
  var panel=document.createElement("section");
  panel.id="sets-panel";
  panel.className="panel";
  panel.innerHTML='<div class="wrap"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0;color:var(--acc)">Sets</h3><button class="btn btn-outline-secondary btn-sm" onclick="renderSetsPanel()">Aktualisieren</button></div><div id="sets-list"></div></div>';
  document.body.appendChild(panel);
  var bnav=document.querySelector(".bnav");
  if(bnav&&!document.getElementById("bnav-sets-btn")){
    var btn=document.createElement("button");
    btn.id="bnav-sets-btn";
    btn.className="bnav-btn";
    btn.dataset.tab="sets-panel";
    btn.innerHTML='<i class="bi bi-box-seam"></i><span>Sets</span>';
    btn.addEventListener("click",function(){goTabFn("sets-panel");renderSetsPanel();});
    bnav.appendChild(btn);
  }
}
function renderSetsPanel(){
  var out=document.getElementById("sets-list");if(!out)return;
  gasGet("getSetBundles",{},function(r){
    var sets=(r&&r.ok)?(r.data||[]):[];
    window._setsPanelData=sets;
    if(!sets.length){out.innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Sets gespeichert.</p></div>';return;}
    out.innerHTML=sets.map(function(s,ix){
      var items=(s.items||[]).map(function(i){return i.name||i.scanId;}).join(", ");
      return '<div class="ic"><div class="ic-top"><div class="ic-name">'+esc(s.name||s.setId||("Set "+ix))+' <span style="font-size:10px;color:var(--w4)">#'+esc(s.setId||"")+'</span></div><span class="chip">'+esc(s.plattform||"-")+'</span></div><div style="font-size:11px;color:var(--w3)">'+esc(items.substring(0,250))+(items.length>250?"…":"")+'</div><div style="margin-top:8px;display:flex;gap:6px"><button class="btn btn-outline-primary btn-sm" onclick="exportSetInlineForKA('+ix+')">Für Kleinanzeigen</button><button class="btn btn-outline-secondary btn-sm" onclick="editSetInline('+ix+')">Bearbeiten</button><button class="btn btn-outline-danger btn-sm" onclick="deleteSetInline('+ix+')">Löschen</button></div></div>';
    }).join("");
    window._setsPanelData=sets;
  },function(){out.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>Sets konnten nicht geladen werden.</p></div>';});
}
function editSetInline(ix){
  var s=(window._setsPanelData||[])[ix];if(!s)return;
  var n=prompt("Set-Name:",s.name||"");if(n===null)return;
  var z=prompt("Zustand:",s.zustand||"")||s.zustand||"";
  gasPost("updateSetBundle",{rowIndex:s.rowIndex,name:n,zustand:z,plattform:s.plattform,budget:s.budget,items:s.items,notizen:s.notizen},function(r){
    if(r&&r.ok){toast("Set aktualisiert.","ok");renderSetsPanel();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}
function deleteSetInline(ix){
  var s=(window._setsPanelData||[])[ix];if(!s)return;
  if(!confirm("Set löschen?"))return;
  gasGet("deleteSetBundle",{rowIndex:s.rowIndex},function(r){
    if(r&&r.ok){toast("Set gelöscht.","ok");renderSetsPanel();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}
function exportSetInlineForKA(ix){
  var s=(window._setsPanelData||[])[ix];if(!s)return;
  var txt=(s.name||"Set")+" | "+(s.plattform||"")+" | "+(s.items||[]).map(function(i){return i.name||i.scanId;}).join(", ");
  try{navigator.clipboard.writeText(txt);}catch(e){}
  toast("Set-Text kopiert.","ok");
}

// ── STATS ─────────────────────────────────────────────────────────
function loadStats(){gasGet("getStats",{},function(r){if(!r||!r.ok)return;var s=r.stats||{};document.getElementById("st-sw").textContent=(s.konsolen||0)+(s.spiele||0);document.getElementById("st-h").textContent=s.handys||0;document.getElementById("st-pc").textContent=s.pcs||0;document.getElementById("st-def").textContent=s.defekte||0;document.getElementById("st-heu").textContent=s.heute||0;var ve=document.getElementById("st-vk");if(ve)ve.textContent=s.verkauf||0;var ee=document.getElementById("st-ek");if(ee)ee.textContent=s.einkauf||0;},function(){});}

// ── KATEGORIE ─────────────────────────────────────────────────────
function selCat(cat){curCat=cat;isEditMode=false;editingItem=null;document.getElementById("mode-chooser").style.display="none";document.getElementById("cat-chooser").style.display="none";document.getElementById("sw-sub").style.display="none";document.getElementById("main-stepper").style.display="none";if(cat==="spielwaren"){document.getElementById("sw-sub").style.display="block";}else{startStepper(cat);}}
function selControllerMode(){forcedSpielSystem="Controller";selCat("controller");}
function ensureControllerOption(){
  var grid=document.querySelector("#sw-sub .cat-grid");
  if(!grid||document.getElementById("sw-controller-btn"))return;
  var btn=document.createElement("button");
  btn.id="sw-controller-btn";
  btn.className="cat-btn cb-sw";
  btn.innerHTML='<span class="ci">🎮</span>CONTROLLER';
  btn.onclick=function(){selControllerMode();};
  grid.appendChild(btn);
}
function resetFlow(){stopCam();document.getElementById("mode-chooser").style.display="block";document.getElementById("cat-chooser").style.display="none";document.getElementById("sw-sub").style.display="none";document.getElementById("main-stepper").style.display="none";isEditMode=false;editingItem=null;forcedSpielSystem="";resetStepperState();}

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

function configS2(t){var tt={konsole:"Name der Konsole",spiel:"Spieltitel",controller:"Controller",handy:"Gerätemodell",pc:"Modell"};var ss={konsole:"z.B. PlayStation 5 Slim",spiel:"z.B. Zelda: Tears of the Kingdom",controller:"z.B. PS5 DualSense",handy:"z.B. Samsung Galaxy S24",pc:"z.B. Dell XPS 15"};document.getElementById("s2-title").textContent=tt[t]||"Name";document.getElementById("s2-lbl").textContent=(tt[t]||"Name")+" *";document.getElementById("f-name").placeholder=ss[t]||"";document.getElementById("s2-sub").textContent="Vollständige Bezeichnung eingeben.";document.getElementById("s2-extra").innerHTML="";}
function configS3(t){
  var h="";
  if(t==="konsole"){document.getElementById("s3-title").textContent="Speicher & Farbe";h='<div class="row g-2 mb-3"><div class="col-6"><label class="fl">Speicher (GB)</label><input type="number" id="f-gb" class="fc" placeholder="z.B. 825"/></div><div class="col-6"><label class="fl">Farbe</label><input type="text" id="f-farbe" class="fc" placeholder="z.B. Weiß"/></div></div>';}
  else if(t==="spiel"){document.getElementById("s3-title").textContent="Spiel-Details";h='<div class="mb-3"><label class="fl">System / Plattform</label>'+selHTML("f-sys",["PlayStation 5","PlayStation 4","PlayStation 3","Xbox Series X/S","Xbox One","Xbox 360","Nintendo Switch","Nintendo 3DS","Nintendo Wii","Nintendo Wii U","Game Boy Advance","Nintendo DS","PC","Sonstiges"])+'</div><div class="row g-2 mb-3"><div class="col-4"><label class="fl">USK</label>'+selHTML("f-usk",["","USK 0","USK 6","USK 12","USK 16","USK 18"])+'</div><div class="col-4"><label class="fl">Sprache</label>'+selHTML("f-sprache",["Deutsch","Englisch","Multilingual","Sonstiges"])+'</div><div class="col-4"><label class="fl" style="display:flex;align-items:center;gap:4px">Zustand <button type="button" onclick="showZustandInfo()" style="width:17px;height:17px;background:var(--blue);border:none;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;cursor:pointer;flex-shrink:0;padding:0">i</button></label>'+selHTML("f-zustand",["Neuwertig","Sehr gut","Gut","Akzeptabel","Defekt"])+'</div></div><div class="mb-3"><label class="fl">Hinweise</label><textarea id="f-hinweise" class="fc" placeholder="z.B. Cover fehlt…"></textarea></div>';}
  else if(t==="controller"){document.getElementById("s3-title").textContent="Controller-Details";h='<div class="row g-2 mb-3"><div class="col-6"><label class="fl">Plattform *</label>'+selHTML("f-sys",["PlayStation","Xbox","Nintendo","PC","Universal"])+'</div><div class="col-6"><label class="fl">Verbindung</label>'+selHTML("f-conn",["Wireless","Bluetooth","USB-C","Micro-USB","Kabel"])+'</div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Marke *</label><input type="text" id="f-brand-c" class="fc" placeholder="z.B. Sony"/></div><div class="col-6"><label class="fl">Modell</label><input type="text" id="f-model-c" class="fc" placeholder="z.B. DualSense V2"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Zustand</label>'+selHTML("f-zustand",["Neuwertig","Sehr gut","Gut","Akzeptabel","Defekt"])+'</div><div class="col-6"><label class="fl">Stickdrift</label>'+selHTML("f-drift",["Nein","Leicht","Stark"])+'</div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Originalverpackung</label>'+selHTML("f-box-c",["Nein","Ja"])+'</div><div class="col-6"><label class="fl">Zubehör</label><input type="text" id="f-acc-c" class="fc" placeholder="z.B. Ladekabel, Dock"/></div></div><div class="mb-3"><label class="fl">Hinweise</label><textarea id="f-hinweise" class="fc" placeholder="z.B. Trigger klemmt leicht"></textarea></div>';}
  else if(t==="handy"){document.getElementById("s3-title").textContent="Technische Daten";h='<div class="row g-2 mb-3"><div class="col-6"><label class="fl">Speicher (GB)</label><input type="number" id="f-gb" class="fc" placeholder="z.B. 256"/></div><div class="col-6"><label class="fl">RAM (GB)</label><input type="number" id="f-ram" class="fc" placeholder="z.B. 8"/></div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Farbe</label><input type="text" id="f-farbe" class="fc" placeholder="z.B. Midnight Black"/></div><div class="col-6"><label class="fl">Netzwerk</label>'+selHTML("f-netz",["","4G/LTE","5G","Dual-SIM 5G","Sonstiges"])+'</div></div><div class="row g-2 mb-3"><div class="col-6"><label class="fl">Zustand</label>'+selHTML("f-zustand",["Neuwertig","Sehr gut","Gut","Akzeptabel","Defekt"])+'</div><div class="col-6"><label class="fl">IMEI (optional)</label><input type="text" id="f-imei" class="fc" placeholder="15-stellig"/></div></div>';}
  else if(t==="pc"){document.getElementById("s3-title").textContent="Hardware-Spezifikationen";h='<div class="mb-3"><label class="fl">Typ – Bitte zuerst wählen</label><div class="cg2"><button class="cbtn" id="pc-l" onclick="selPCTyp(\'Laptop\')"><span class="ci">💻</span>Laptop</button><button class="cbtn" id="pc-d" onclick="selPCTyp(\'Desktop\')"><span class="ci">🖥️</span>Desktop</button></div><input type="hidden" id="f-pc-typ" value=""/></div><div id="pc-fields-wrap" style="display:none"></div>';}
  document.getElementById("s3-fields").innerHTML=h;
  if((t==="controller"||forcedSpielSystem==="Controller")&&document.getElementById("f-sys")&&forcedSpielSystem==="Controller"){document.getElementById("f-sys").value="PlayStation";}
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
  if(stepCur===1){if(curType!=="controller"&&!document.getElementById("f-scanid").value.trim()){showD("s1-diag","Barcode eingeben oder scannen.","derr");return;}hideD("s1-diag");
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
function processPhotoFile(file){if(!file)return;if(file.size>15*1024*1024){toast("Max. 15 MB pro Foto.","err");return;}if(photos.length>=10){toast("Maximal 10 Bilder pro Produkt.","err");return;}var name=(file.name||"foto.jpg").replace(/[^a-zA-Z0-9._-]/g,"_");var img=new Image(),url=URL.createObjectURL(file);img.onload=function(){URL.revokeObjectURL(url);var MAX=1200,w=img.width,h=img.height;if(w>MAX||h>MAX){if(w>h){h=Math.round(h*(MAX/w));w=MAX;}else{w=Math.round(w*(MAX/h));h=MAX;}}var canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;var ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);var b64=canvas.toDataURL("image/jpeg",0.78);if(!b64||b64.indexOf("base64,")===-1){toast("Bild konnte nicht verarbeitet werden.","err");return;}photos.push({b64:b64,name:name});renderAllPhotos();toast("Foto hinzugefügt ✅","ok",2000);};img.onerror=function(){toast("Bild konnte nicht geladen werden.","err");};img.src=url;}
function renderAllPhotos(){var mw=document.getElementById("photo-main-wrap"),thumbs=document.getElementById("photo-thumbs");if(!mw||!thumbs)return;mw.innerHTML="";thumbs.innerHTML="";if(photos.length===0){renderAddThumbBtn();return;}mw.innerHTML='<div class="photo-main-preview" style="max-height:120px"><img src="'+photos[0].b64+'" style="max-height:120px;object-fit:cover"/><div style="display:flex;gap:6px;position:absolute;right:6px;bottom:6px"><button class="rm-main-photo" onclick="movePhoto(0,1)" style="position:static">↓</button><button class="rm-main-photo" onclick="removePhoto(0)" style="position:static">✕</button></div></div>';for(var i=1;i<photos.length;i++){var div=document.createElement("div");div.className="photo-thumb";div.style.width="48px";div.style.height="48px";div.style.position="relative";div.innerHTML='<img src="'+photos[i].b64+'" style="object-fit:cover"/><button class="rm-thumb" onclick="removePhoto('+i+')">✕</button><button class="rm-thumb" style="right:22px" onclick="movePhoto('+i+','+(i-1)+')">↑</button>';thumbs.appendChild(div);}renderAddThumbBtn();}
function renderAddThumbBtn(){var t=document.getElementById("photo-thumbs");if(!t)return;var btn=document.createElement("div");btn.className="add-thumb";btn.innerHTML='<i class="bi bi-plus"></i>';btn.onclick=function(){triggerPhotoInput("gallery");};t.appendChild(btn);}
function removePhoto(idx){photos.splice(idx,1);renderAllPhotos();}
function movePhoto(from,to){from=parseInt(from,10);to=parseInt(to,10);if(isNaN(from)||isNaN(to)||from<0||to<0||from>=photos.length||to>=photos.length||from===to)return;var it=photos.splice(from,1)[0];photos.splice(to,0,it);renderAllPhotos();}

// ── SAVE ──────────────────────────────────────────────────────────
function doSave(){
  var btn=document.getElementById("btn-save-step"),orig=btn.innerHTML;setBL(btn,true);
  var scanId=document.getElementById("f-scanid").value.trim();
  var name=document.getElementById("f-name").value.trim();
  var ma=document.getElementById("f-ma").value||emp;
  var probTyp=probChoice==="nein"?"":probType||"";
  var probD=probChoice==="nein"?"":(gv("f-prob-beschr"));
  var fotoB64arr=photos.map(function(p){return p.b64;});
  if(fotoB64arr.length>10){setBL(btn,false,orig);toast("Maximal 10 Bilder erlaubt.","err");return;}
  if(curType==="controller"&&!scanId){scanId="CTRL-"+Date.now();}
  var d={scanId:scanId,mitarbeiter:ma,problemTyp:probTyp,problemBeschr:probD,fotos:fotoB64arr,
         einkaufspreis:gv("f-einkaufspreis"),warentyp:gv("f-warentyp")||"Gebrauchtware"};
  var fn="";

  if(curType==="konsole"){d.name=name;d.speicherGB=gv("f-gb");d.farbe=gv("f-farbe");fn=isEditMode?"updateKonsole":"saveKonsole";}
  else if(curType==="spiel"){d.spiel=name;d.system=gv("f-sys");d.zustand=gv("f-zustand");d.usk=gv("f-usk");d.sprache=gv("f-sprache");d.hinweise=gv("f-hinweise");fn=isEditMode?"updateSpiel":"saveSpiel";}
  else if(curType==="controller"){d.spiel=name;d.system="Controller-"+(gv("f-sys")||"Universal");d.zustand=gv("f-zustand");d.usk="";d.sprache="";d.hinweise=["Plattform: "+(gv("f-sys")||"-"),"Marke: "+(gv("f-brand-c")||"-"),"Modell: "+(gv("f-model-c")||"-"),"Verbindung: "+(gv("f-conn")||"-"),"Stickdrift: "+(gv("f-drift")||"Nein"),"OVP: "+(gv("f-box-c")||"Nein"),"Zubehör: "+(gv("f-acc-c")||"-"),gv("f-hinweise")||""].join(" | ");fn=isEditMode?"updateSpiel":"saveSpiel";}
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
var _loadAllBusy=false,_loadAllTs=0,_loadAllCache=[];
var addToSetModalState={item:null,query:"",selectedSetId:""};
var setInfoOverlayState={item:null};
function loadAll(force){
  if(!force&&_loadAllBusy)return;
  var now=Date.now();
  if(!force&&_loadAllCache.length>0&&(now-_loadAllTs)<15000){
    allItems=_loadAllCache.slice();
    renderList();checkLongStorageItems();buildWeekChart();buildKAProgress();updateMyStats();
    return;
  }
  _loadAllBusy=true;
  var listBody=document.getElementById("list-body");
  if(listBody)listBody.innerHTML='<div class="empty"><span class="spin-b"></span><p>Lade…</p></div>';
  allItems=[];
  var done=0,total=6,kd=[],sd=[],hd=[],pd=[],dd=[],sb=[];
  function rebuildSetMembership(rows){
    setMembershipByScanId={};setRowsCache=rows||[];
    (rows||[]).forEach(function(s){
      (s.items||[]).forEach(function(it){
        var sid=String(it.scanId||"").trim();if(!sid)return;
        if(!setMembershipByScanId[sid])setMembershipByScanId[sid]=[];
        setMembershipByScanId[sid].push({setId:s.setId,name:s.name,rowIndex:s.rowIndex,plattform:s.plattform,itemCount:(s.items||[]).length,items:s.items||[]});
      });
    });
  }
  function renderPartial(){
    allItems=kd.concat(sd,hd,pd,dd,sb);
    rebuildSetMembership(sb);
    if(allItems.length>0){renderList();updateMyStats();}
  }
  function tryR(){
    done++;
    renderPartial();
    if(done<total)return;
    allItems=kd.concat(sd,hd,pd,dd,sb);
    rebuildSetMembership(sb);
    _loadAllCache=allItems.slice();
    _loadAllTs=Date.now();
    _loadAllBusy=false;
    renderList();checkLongStorageItems();buildWeekChart();buildKAProgress();updateMyStats();
  }
  gasGet("getAllKonsolen",{},function(r){if(r&&r.ok)kd=r.data||[];tryR();},function(){tryR();});
  gasGet("getAllSpiele",{},function(r){if(r&&r.ok)sd=r.data||[];tryR();},function(){tryR();});
  gasGet("getAllHandys",{},function(r){if(r&&r.ok)hd=r.data||[];tryR();},function(){tryR();});
  gasGet("getAllPCs",{},function(r){if(r&&r.ok)pd=r.data||[];tryR();},function(){tryR();});
  gasGet("getAllDefekte",{},function(r){if(r&&r.ok)dd=r.data||[];tryR();},function(){tryR();});
  gasGet("getSetBundles",{},function(r){if(r&&r.ok)sb=r.data||[];tryR();},function(){tryR();});
}
function renderList(){
  cardRegistry=[];ensureLagerDropdownUI();ensureLagerRedesignStyles();
  var q=(document.getElementById("list-q")||{value:""}).value.toLowerCase();
  var ddMain=(document.getElementById("lager-dd-main")||{value:""}).value;
  var ddSub=(document.getElementById("lager-dd-sub")||{value:""}).value;
  var ddSub2=(document.getElementById("lager-dd-sub2")||{value:""}).value;
  var ddStatus=(document.getElementById("lager-dd-status")||{value:""}).value;
  var f=allItems.filter(function(i){
    if(i.type==="setbundle")return false;
    var tm=true;
    if(lf==="spielwaren")tm=(i.type==="konsole"||i.type==="spiel"||i.type==="controller");
    else if(lf==="handy")tm=(i.type==="handy");
    else if(lf==="pc")tm=(i.type==="pc");
    else if(lf==="defekt")tm=(i.type==="defekt");
    if(!tm)return false;
    if(ddMain==="spielwaren"){
      if(ddSub==="konsole"&&i.type!=="konsole")return false;
      if(ddSub==="spiel"&&i.type!=="spiel")return false;
      if(ddSub==="controller"&&i.type!=="controller")return false;
    }
    if(ddMain==="handy"){
      if(i.type!=="handy")return false;
      if(ddSub&&String(i.modell||"").indexOf(ddSub)!==0)return false;
      if(ddSub2&&String(i.modell||"")!==ddSub2)return false;
    }
    if(ddMain==="pc"){
      if(i.type!=="pc")return false;
      if(ddSub&&String(i.typ_||"").toLowerCase()!==String(ddSub||"").toLowerCase())return false;
    }
    if(ddStatus){
      if(ddStatus==="set"&&!(setMembershipByScanId[String(i.scanId||"").trim()]||[]).length)return false;
      if(ddStatus==="mitbild"&&!(i.fotos&&i.fotos.length))return false;
      if(ddStatus==="ohnebild"&&(i.fotos&&i.fotos.length))return false;
      if(ddStatus==="defekt"&&!String(i.problemTyp||"").trim())return false;
    }
    if(!q)return true;
    var n=i.name||i.spiel||i.modell||i.geraet||"";
    var hay=[n,i.scanId,i.mitarbeiter,i.zustand,i.problemTyp,i.problemBeschr,i.kategorie,i.ursprung,i.notizen].map(function(v){return String(v||"").toLowerCase();}).join(" ");
    return hay.indexOf(q)>-1;
  });
  document.getElementById("list-count").textContent=f.length+" Einträge";
  var cntEl=document.getElementById("lager-cat-count");if(cntEl)cntEl.textContent="("+f.length+" Artikel)";
  renderLagerFilterChips();
  var bodyEl=document.getElementById("list-body");
  if(bodyEl)bodyEl.className="lager-grid";
  if(!f.length){document.getElementById("list-body").innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Nichts gefunden.</p></div>';return;}
  document.getElementById("list-body").innerHTML=f.map(function(i){return mkCard(i);}).join("");
}
var lfArr=["all","spielwaren","handy","pc","defekt"],lfLabels={"all":"Gesamtes Lager","spielwaren":"🎮 Spielwaren","handy":"📱 Handys","pc":"💻 PCs & Laptops","defekt":"⚠️ Defekte Geräte"};
function setLF(m){lf=m;var tabs=document.querySelectorAll("#list-panel .lager-tabs .ltab");var idx=lfArr.indexOf(m);tabs.forEach(function(t,i){t.classList.toggle("on",i===idx);});var hdr=document.getElementById("lager-category-header"),lbl=document.getElementById("lager-cat-label");if(hdr&&lbl){if(m==="all"){hdr.style.display="none";}else{hdr.style.display="block";lbl.textContent=lfLabels[m]||m;}}renderList();}
function ensureLagerDropdownUI(){
  var wrap=document.querySelector("#list-panel .wrap");
  if(!wrap||document.getElementById("lager-dd-wrap"))return;
  var box=document.createElement("div");
  box.id="lager-dd-wrap";
  box.className="lager-topbar";
  box.innerHTML='<div class="lager-topbar-row"><input id="list-q" class="fc lager-search" placeholder="Suchen…"/><select id="lager-dd-main" class="fc lager-sel"><option value="">Kategorie</option><option value="spielwaren">Spielwaren</option><option value="handy">Handys</option><option value="pc">PC</option></select><select id="lager-dd-sub" class="fc lager-sel" style="display:none"></select><select id="lager-dd-sub2" class="fc lager-sel" style="display:none"></select><select id="lager-dd-status" class="fc lager-sel"><option value="">Status</option><option value="set">Teil eines Sets</option><option value="mitbild">Mit Bild</option><option value="ohnebild">Ohne Bild</option><option value="defekt">Defekt-Hinweis</option></select></div><div id="lager-active-chips" class="lager-active-chips"></div>';
  var body=document.getElementById("list-body");
  if(body&&body.parentNode===wrap)wrap.insertBefore(box,body);
  document.getElementById("lager-dd-main").onchange=function(){updateLagerDropdowns();renderList();};
  document.getElementById("lager-dd-sub").onchange=function(){updateLagerDropdowns(true);renderList();};
  document.getElementById("lager-dd-sub2").onchange=function(){renderList();};
  document.getElementById("lager-dd-status").onchange=function(){renderList();};
  document.getElementById("list-q").addEventListener("input",function(){renderList();});
}
function renderLagerFilterChips(){
  var out=document.getElementById("lager-active-chips");if(!out)return;
  var chips=[];
  var q=(document.getElementById("list-q")||{value:""}).value.trim();
  var main=(document.getElementById("lager-dd-main")||{value:""}).value;
  var sub=(document.getElementById("lager-dd-sub")||{value:""}).value;
  var sub2=(document.getElementById("lager-dd-sub2")||{value:""}).value;
  var st=(document.getElementById("lager-dd-status")||{value:""}).value;
  if(q)chips.push({k:"q",v:q,l:"Suche: "+q});
  if(main)chips.push({k:"main",v:main,l:"Kategorie: "+main});
  if(sub)chips.push({k:"sub",v:sub,l:"Typ: "+sub});
  if(sub2)chips.push({k:"sub2",v:sub2,l:"Subtyp: "+sub2});
  if(st)chips.push({k:"status",v:st,l:"Status: "+st});
  out.innerHTML=chips.map(function(c){return'<button class="lager-chip-filter" onclick="removeLagerFilter(\''+esc(c.k)+'\')">'+esc(c.l)+' <span>✕</span></button>';}).join("");
}
function removeLagerFilter(k){
  if(k==="q"){var e=document.getElementById("list-q");if(e)e.value="";}
  if(k==="main"){var e2=document.getElementById("lager-dd-main");if(e2)e2.value="";updateLagerDropdowns();}
  if(k==="sub"){var e3=document.getElementById("lager-dd-sub");if(e3)e3.value="";}
  if(k==="sub2"){var e4=document.getElementById("lager-dd-sub2");if(e4)e4.value="";}
  if(k==="status"){var e5=document.getElementById("lager-dd-status");if(e5)e5.value="";}
  renderList();
}
function ensureLagerRedesignStyles(){
  if(document.getElementById("lager-redesign-style"))return;
  var st=document.createElement("style");
  st.id="lager-redesign-style";
  st.textContent="#list-panel{background:#0a0a0a}.lager-topbar{position:sticky;top:0;z-index:8;background:#0a0a0a;padding:8px 0 12px}.lager-topbar-row{display:flex;gap:8px;flex-wrap:wrap}.lager-search{flex:1;min-width:220px}.lager-sel{min-width:140px;max-width:180px}.lager-active-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.lager-chip-filter{background:#111;border:1px solid #222;color:#9ca3af;border-radius:999px;padding:4px 10px;font-size:11px}.lager-chip-filter span{color:#e5e7eb}.lager-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:12px}.lager-card{background:#111;border:1px solid #222;border-radius:14px;padding:12px;transition:all .18s ease}.lager-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.35);background:#151515}.lager-card-row{display:grid;grid-template-columns:80px 1fr;gap:12px}.lager-thumb{width:80px;height:80px;border-radius:12px;overflow:hidden;background:#0d1117;border:1px solid #222}.lager-thumb img{width:100%;height:100%;object-fit:cover}.lager-title{font-size:15px;font-weight:700;color:#fff;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lager-price{font-size:20px;color:#3fb950;font-weight:800;margin-top:2px}.lager-sub{font-size:11px;color:#9ca3af;margin-top:3px}.lager-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.lager-tag{font-size:10px;color:#9ca3af;border:1px solid #2b2b2b;padding:2px 6px;border-radius:999px}.lager-meta{font-size:10px;color:#6b7280;margin-top:8px;display:flex;gap:10px;flex-wrap:wrap}.lager-sethint{font-size:11px;color:#58a6ff;margin-top:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:rgba(88,166,255,.12);border:1px solid rgba(88,166,255,.35);padding:3px 8px;border-radius:999px}.lager-actions{display:flex;gap:6px;align-items:flex-start}.lager-head{display:flex;justify-content:space-between;gap:8px}.addset-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:10100;display:none;align-items:center;justify-content:center;padding:16px}.addset-modal{width:min(500px,96vw);max-height:80vh;overflow:auto;background:#0f1318;border:1px solid rgba(63,185,80,.35);border-radius:14px;padding:16px;animation:addsetIn .18s ease}.addset-list{margin-top:10px;display:flex;flex-direction:column;gap:8px;max-height:44vh;overflow:auto}.addset-row{padding:10px 12px;background:#11161d;border:1px solid #1f2937;border-radius:10px;cursor:pointer;transition:all .15s ease}.addset-row:hover{border-color:rgba(63,185,80,.6);background:#141a22}.addset-row.selected{border-color:#3fb950;background:rgba(63,185,80,.1)}.addset-row.disabled{opacity:.55;cursor:not-allowed}.setinfo-overlay{position:fixed;inset:0;background:rgba(0,0,0,.64);z-index:10101;display:none;align-items:center;justify-content:center;padding:12px}.setinfo-card{width:min(460px,96vw);background:#11161d;border:1px solid rgba(88,166,255,.35);border-radius:12px;padding:12px;max-height:70vh;overflow:auto}@keyframes addsetIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}";
  document.head.appendChild(st);
}
function updateLagerDropdowns(skipReset){
  var main=document.getElementById("lager-dd-main"),sub=document.getElementById("lager-dd-sub"),sub2=document.getElementById("lager-dd-sub2");
  if(!main||!sub||!sub2)return;
  var m=main.value||"";
  var keepSub=sub.value,keepSub2=sub2.value;
  if(!skipReset){keepSub="";keepSub2="";}
  if(!m){sub.style.display="none";sub2.style.display="none";return;}
  sub.style.display="block";
  if(m==="spielwaren"){
    sub.innerHTML='<option value="">Typ</option><option value="konsole">Konsolen</option><option value="spiel">Spiele</option><option value="controller">Controller</option>';
    sub.value=keepSub;
    sub2.style.display="none";
  }else if(m==="handy"){
    var brands={};allItems.filter(function(i){return i.type==="handy";}).forEach(function(i){var b=(String(i.modell||"").split(" ")[0]||"").trim();if(b)brands[b]=1;});
    var opts=Object.keys(brands).sort();
    sub.innerHTML='<option value="">Marke</option>'+opts.map(function(b){return'<option value="'+esc(b)+'">'+esc(b)+'</option>';}).join("");
    sub.value=keepSub;
    if(sub.value){var models={};allItems.filter(function(i){return i.type==="handy"&&String(i.modell||"").indexOf(sub.value)===0;}).forEach(function(i){models[i.modell]=1;});var mopts=Object.keys(models).sort();sub2.innerHTML='<option value="">Modell</option>'+mopts.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join("");sub2.style.display="block";sub2.value=keepSub2;}else{sub2.style.display="none";}
  }else{
    sub.innerHTML='<option value="">Typ</option><option value="Laptop">Laptop</option><option value="Desktop">Desktop</option>';
    sub.value=keepSub;
    sub2.style.display="none";
  }
}

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
  var tmap={konsole:["ib-k","🕹️ Konsole"],spiel:["ib-sp","💿 Spiel"],controller:["ib-sp","🎮 Controller"],handy:["ib-h","📱 Handy"],pc:["ib-pc","💻 PC/Laptop"],defekt:["ib-def","⚠️ Defekt"],setbundle:["ib-sp","🧩 Set-Bundle"]};
  var tm=tmap[item.type]||["","–"];
  var tags=[];
  if(item.scanId)tags.push("ID "+String(item.scanId));
  if(item.speicherGB)tags.push(String(item.speicherGB)+"GB");
  if(item.ram)tags.push(String(item.ram)+"GB RAM");
  if(item.farbe)tags.push(String(item.farbe));
  if(item.system)tags.push(String(item.system));
  if(item.typ_)tags.push(String(item.typ_));
  if(item.prozessor)tags.push(String(item.prozessor));
  if(item.problemTyp&&item.type!=="defekt")tags.push(String(item.problemTyp));
  var setHintText="";
  var setRefs=[];
  var sid=String(item.scanId||"").trim();
  if(sid&&setMembershipByScanId[sid]&&setMembershipByScanId[sid].length){
    setRefs=(setMembershipByScanId[sid]||[]);
    if(setRefs.length===1)setHintText='Teil eines Sets';
    else setHintText='In '+setRefs.length+' Sets';
  }
  var note=item.problemBeschr||item.hinweise||"";
  if(item.type==="defekt"){tags.push(String(item.ursprung||""));note=item.problemBeschr||"";}
  var rIdx=cardRegistry.length;
  var preview=(item.fotos&&item.fotos[0])?item.fotos[0]:"";
  var priceLabel=(item.kaPreis?String(item.kaPreis)+"€":(item.einkaufspreis?String(item.einkaufspreis)+"€":"Preis offen"));
  var condition=String(item.zustand||"Unbekannt");
  var catLabel=tm[1].replace(/^[^A-Za-z0-9ÄÖÜäöüß]+/,"").trim()||tm[1];
  var shownTags=tags.slice(0,3);
  var tagsHtml=shownTags.map(function(t){return '<span class="lager-tag">'+esc(t)+'</span>';}).join("")+(tags.length>3?'<span class="lager-tag">+'+(tags.length-3)+'</span>':"");
  var meta='<div class="lager-meta"><span>'+esc(item.datum||"")+'</span><span>'+esc(item.mitarbeiter||"")+'</span><span>EK: '+esc(item.einkaufspreis?String(item.einkaufspreis)+"€":"—")+'</span></div>';
  cardRegistry.push(item);
  var actions='<div class="lager-actions">';
  if(item.type!=="defekt"&&item.type!=="setbundle"){actions+='<button class="btn btn-outline-success btn-sm" onclick="event.stopPropagation();openAddToSetModal('+rIdx+')" title="In Set einfügen"><i class="bi bi-plus-circle"></i></button><button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation();openEditStepper('+rIdx+')" title="Bearbeiten"><i class="bi bi-pencil-fill"></i></button><button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation();confirmDelete('+rIdx+')" title="Löschen"><i class="bi bi-trash3"></i></button>';}
  else{actions+='<button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation();confirmDeleteDefekt('+rIdx+')" title="Löschen"><i class="bi bi-trash3"></i></button>';}
  actions+='</div>';
  return '<div class="lager-card" onclick="openDetail('+rIdx+')" style="cursor:pointer"><div class="lager-head"><div class="lager-title">'+esc(nm)+'</div>'+actions+'</div><div class="lager-card-row"><div class="lager-thumb">'+(preview?'<img src="'+esc(preview)+'" loading="lazy"/>':'<div style="font-size:20px;display:flex;align-items:center;justify-content:center;width:100%;height:100%">📦</div>')+'</div><div><div class="lager-price">'+esc(priceLabel)+'</div><div class="lager-sub">'+esc(condition)+' • '+esc(catLabel)+'</div><div class="lager-tags">'+tagsHtml+'</div>'+meta+(note?'<div style="font-size:11px;color:#9ca3af;margin-top:6px">'+esc(note)+'</div>':"")+(setHintText?'<div class="lager-sethint" onclick="event.stopPropagation();openSetInfoOverlay('+rIdx+')"><i class="bi bi-link-45deg"></i>'+esc(setHintText)+'</div>':'')+'</div></div></div>';
}
function getSetRowsCached(){return Array.isArray(setRowsCache)?setRowsCache:[];}
function ensureAddToSetModal(){
  if(document.getElementById("addset-modal-overlay"))return;
  var ov=document.createElement("div");
  ov.id="addset-modal-overlay";
  ov.className="addset-modal-overlay";
  ov.innerHTML='<div class="addset-modal"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="font-size:18px;font-weight:800;color:var(--acc)">Produkt zu Set hinzufügen</div><button class="btn btn-outline-secondary btn-sm" onclick="closeAddToSetModal()">✕</button></div><input id="addset-search" class="fc" placeholder="Sets durchsuchen" style="margin-top:10px"/><div id="addset-list" class="addset-list"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn btn-outline-secondary" onclick="closeAddToSetModal()">Abbrechen</button><button id="addset-confirm" class="btn btn-success" onclick="confirmAddProductToSet()">Hinzufügen</button></div></div>';
  ov.addEventListener("click",function(e){if(e.target===ov)closeAddToSetModal();});
  document.body.appendChild(ov);
  var inp=document.getElementById("addset-search");
  if(inp)inp.addEventListener("input",function(){addToSetModalState.query=this.value||"";renderAddToSetModalList();});
}
function openAddToSetModal(rIdx){
  ensureAddToSetModal();
  var item=cardRegistry[rIdx];if(!item)return;
  addToSetModalState={item:item,query:"",selectedSetId:""};
  var ov=document.getElementById("addset-modal-overlay");if(ov)ov.style.display="flex";
  var inp=document.getElementById("addset-search");if(inp){inp.value="";setTimeout(function(){inp.focus();},30);}
  renderAddToSetModalList();
}
function closeAddToSetModal(){var ov=document.getElementById("addset-modal-overlay");if(ov)ov.style.display="none";}
function renderAddToSetModalList(){
  var out=document.getElementById("addset-list");if(!out)return;
  var sets=getSetRowsCached();
  if(!sets.length){
    out.innerHTML='<div class="empty"><p>Keine Sets vorhanden</p><button class="btn btn-primary btn-sm" onclick="closeAddToSetModal();openSetBuilderFlow()">Set erstellen</button></div>';
    return;
  }
  var q=String(addToSetModalState.query||"").toLowerCase().trim();
  var item=addToSetModalState.item||{};
  var sid=String(item.scanId||"").trim();
  var filtered=sets.filter(function(s){return !q||String(s.name||s.setId||"").toLowerCase().indexOf(q)>-1;});
  out.innerHTML=filtered.map(function(s){
    var items=s.items||[];
    var exists=items.some(function(it){return String(it.scanId||"").trim()===sid;});
    var selected=String(addToSetModalState.selectedSetId||"")===String(s.setId||"");
    return '<div class="addset-row '+(selected?"selected ":"")+(exists?"disabled":"")+'" onclick="'+(exists?'':'selectSetForAdd(\''+String(s.setId||"").replace(/'/g,"")+'\')')+'"><div style="font-size:13px;font-weight:700;color:var(--w1)">'+esc(s.name||s.setId||"Set")+'</div><div style="font-size:11px;color:var(--w4)">'+items.length+' Produkte'+(exists?' • bereits enthalten':'')+'</div></div>';
  }).join("");
}
function selectSetForAdd(setId){addToSetModalState.selectedSetId=setId;renderAddToSetModalList();}
function confirmAddProductToSet(){
  var selId=String(addToSetModalState.selectedSetId||"");if(!selId){toast("Bitte Set wählen.","err");return;}
  var item=addToSetModalState.item;if(!item){closeAddToSetModal();return;}
  var sid=String(item.scanId||"").trim();
  var target=(getSetRowsCached().find(function(s){return String(s.setId||"")===selId;}));
  if(!target){toast("Set nicht gefunden.","err");return;}
  target.items=Array.isArray(target.items)?target.items:[];
  if(target.items.some(function(it){return String(it.scanId||"").trim()===sid;})){toast("Produkt bereits im Set.","inf");return;}
  var addEntry={typ:item.type,name:item.name||item.spiel||item.modell||item.scanId||"Produkt",scanId:sid,ek:parseFloat(item.einkaufspreis||0)||0};
  target.items.push(addEntry);
  if(!setMembershipByScanId[sid])setMembershipByScanId[sid]=[];
  setMembershipByScanId[sid].push({setId:target.setId,name:target.name,rowIndex:target.rowIndex,plattform:target.plattform,itemCount:target.items.length,items:target.items});
  renderList();
  closeAddToSetModal();
  toast("Produkt zum Set hinzugefügt.","ok");
  gasPost("updateSetBundle",{rowIndex:target.rowIndex,name:target.name,plattform:target.plattform,zustand:target.zustand,budget:target.budget,items:target.items,notizen:target.notizen},function(r){
    if(!(r&&r.ok)){target.items=target.items.filter(function(it){return String(it.scanId||"").trim()!==sid;});setMembershipByScanId[sid]=(setMembershipByScanId[sid]||[]).filter(function(x){return String(x.setId||"")!==selId;});renderList();toast("Speichern fehlgeschlagen.","err");}
  },function(){target.items=target.items.filter(function(it){return String(it.scanId||"").trim()!==sid;});setMembershipByScanId[sid]=(setMembershipByScanId[sid]||[]).filter(function(x){return String(x.setId||"")!==selId;});renderList();toast("Speichern fehlgeschlagen.","err");});
}
function ensureSetInfoOverlay(){
  if(document.getElementById("setinfo-overlay"))return;
  var ov=document.createElement("div");
  ov.id="setinfo-overlay";
  ov.className="setinfo-overlay";
  ov.innerHTML='<div class="setinfo-card"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;color:#58a6ff;font-weight:800">Set-Zugehörigkeit</div><button class="btn btn-outline-secondary btn-sm" onclick="closeSetInfoOverlay()">✕</button></div><div id="setinfo-body" style="margin-top:8px"></div></div>';
  ov.addEventListener("click",function(e){if(e.target===ov)closeSetInfoOverlay();});
  document.body.appendChild(ov);
}
function openSetInfoOverlay(rIdx){
  ensureSetInfoOverlay();
  var item=cardRegistry[rIdx];if(!item)return;
  setInfoOverlayState.item=item;
  var sid=String(item.scanId||"").trim();
  var refs=(setMembershipByScanId[sid]||[]);
  var body=document.getElementById("setinfo-body");
  if(body){
    body.innerHTML=!refs.length?'<div class="empty"><p>Keine Set-Zugehörigkeit.</p></div>':refs.map(function(ref){
      var set=(getSetRowsCached().find(function(s){return String(s.setId||"")===String(ref.setId||"");}))||{};
      var products=(set.items||[]).map(function(it){return '<li>'+esc(it.name||it.scanId||"-")+'</li>';}).join("");
      return '<div style="padding:10px;border:1px solid #1f2937;border-radius:10px;margin-bottom:8px"><div style="font-size:13px;font-weight:700;color:var(--w1)">'+esc(ref.name||ref.setId||"Set")+'</div><ul style="margin:6px 0 8px 16px;font-size:11px;color:var(--w3)">'+products+'</ul><button class="btn btn-outline-primary btn-sm" onclick="closeSetInfoOverlay();openSetReference(\''+String(ref.setId||"").replace(/'/g,"")+'\')">Set öffnen</button></div>';
    }).join("");
  }
  var ov=document.getElementById("setinfo-overlay");if(ov)ov.style.display="flex";
}
function closeSetInfoOverlay(){var ov=document.getElementById("setinfo-overlay");if(ov)ov.style.display="none";}
function openSetReference(setId){
  goTabFn("sets-panel");
  setTimeout(function(){
    var rows=document.querySelectorAll("#sets-list .ic");
    for(var i=0;i<rows.length;i++){
      if(rows[i].textContent&&rows[i].textContent.indexOf(setId)>-1){rows[i].style.outline="2px solid #58a6ff";rows[i].scrollIntoView({behavior:"smooth",block:"center"});break;}
    }
  },250);
}

function openLightbox(itemIdx,fotoIdx){var item=cardRegistry[itemIdx];if(!item||!item.fotos||!item.fotos[fotoIdx])return;var lb=document.createElement("div");lb.className="lightbox";lb.innerHTML='<img src="'+esc(item.fotos[fotoIdx])+'" alt="Foto"/>';lb.onclick=function(){lb.remove();};document.body.appendChild(lb);}

function openEditStepper(rIdx){var item=cardRegistry[rIdx];if(!item)return;document.querySelectorAll(".bnav-btn").forEach(function(b){b.classList.toggle("on",b.dataset.tab==="scan-panel");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="scan-panel");});document.getElementById("mode-chooser").style.display="none";document.getElementById("cat-chooser").style.display="none";document.getElementById("sw-sub").style.display="none";curCat=(item.type==="konsole"||item.type==="spiel"||item.type==="controller")?"spielwaren":item.type;startStepper(item.type,item);try{window.scrollTo({top:0,behavior:"smooth"});}catch(e){window.scrollTo(0,0);}}

function confirmDelete(rIdx){var item=cardRegistry[rIdx];if(!item)return;var nm=item.name||item.spiel||item.modell||"?";document.getElementById("del-modal-text").textContent='"'+nm+'" wirklich löschen?';document.getElementById("del-modal-confirm").onclick=function(){closeDelModal();doDelete(item);};document.getElementById("del-modal").classList.add("open");}
function confirmDeleteDefekt(rIdx){var item=cardRegistry[rIdx];if(!item)return;document.getElementById("del-modal-text").textContent='"'+(item.geraet||"?")+'" wirklich löschen?';document.getElementById("del-modal-confirm").onclick=function(){closeDelModal();doDeleteDefekt(item);};document.getElementById("del-modal").classList.add("open");}
function closeDelModal(){document.getElementById("del-modal").classList.remove("open");}
function doDelete(item){var fns={konsole:"deleteKonsole",spiel:"deleteSpiel",controller:"deleteSpiel",handy:"deleteHandy",pc:"deletePC"};var fn=fns[item.type];if(!fn){toast("Nicht verfügbar.","err");return;}gasGet(fn,{rowIndex:item.rowIndex},function(r){if(r&&r.ok){toast(r.msg,"ok");allItems=[];loadAll();loadStats();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}},function(e){toast("Fehler: "+e,"err");});}
function doDeleteDefekt(item){if(String(item.rowIndex||"").indexOf("virtual-")===0){toast("Virtueller Defekt-Eintrag kann nur im Ursprungsartikel bearbeitet werden.","info",2600);return;}gasGet("deleteDefekt",{rowIndex:item.rowIndex},function(r){if(r&&r.ok){toast(r.msg,"ok");allItems=[];loadAll();loadStats();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}},function(e){toast("Fehler: "+e,"err");});}

// ── SUCHE ─────────────────────────────────────────────────────────
var recentSearches=[],searchResults=[];
function initSearch(){try{var s=localStorage.getItem("smp_recent");if(s)recentSearches=JSON.parse(s)||[];}catch(e){}renderRecentChips();}
function saveRecentSearch(q){if(!q||q.length<2)return;recentSearches=recentSearches.filter(function(r){return r!==q;});recentSearches.unshift(q);if(recentSearches.length>5)recentSearches=recentSearches.slice(0,5);try{localStorage.setItem("smp_recent",JSON.stringify(recentSearches));}catch(e){}renderRecentChips();}
function renderRecentChips(){var box=document.getElementById("recent-searches"),wrap=document.getElementById("recent-chips");if(!box||!wrap)return;if(!recentSearches||recentSearches.length===0){box.style.display="none";return;}box.style.display="block";wrap.innerHTML=recentSearches.map(function(r,i){return'<button onclick="useRecent('+i+')" style="background:var(--bg3);border:1px solid var(--border2);color:var(--blue);border-radius:20px;padding:4px 11px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;"><i class="bi bi-clock-history" style="font-size:10px"></i>'+esc(r)+'</button>';}).join("");}
function useRecent(idx){var q=recentSearches[idx];document.getElementById("s-bc-in").value=q;doSearch();}

function doSearch(){var q=document.getElementById("s-bc-in").value.trim();if(!q){renderSearchResults(allItems);return;}saveRecentSearch(q);liveSearch(q);}
function applySearchSort(){renderSearchResults(searchResults.length>0?searchResults:allItems);}
function renderSearchResults(items){searchResults=items||[];var cat=document.getElementById("search-cat")?document.getElementById("search-cat").value:"all";var sort=document.getElementById("search-sort")?document.getElementById("search-sort").value:"neu";var filtered=searchResults.filter(function(i){if(i.type==="setbundle")return false;if(cat==="all")return true;if(cat==="spielwaren")return i.type==="konsole"||i.type==="spiel"||i.type==="controller";return i.type===cat;});filtered=filtered.slice().sort(function(a,b){var na=a.name||a.spiel||a.modell||a.geraet||"",nb=b.name||b.spiel||b.modell||b.geraet||"",da=a.datum||"",db=b.datum||"";if(sort==="neu")return db.localeCompare(da);if(sort==="alt")return da.localeCompare(db);if(sort==="az")return na.localeCompare(nb,"de");if(sort==="za")return nb.localeCompare(na,"de");return 0;});var countEl=document.getElementById("search-count");if(countEl){countEl.style.display="block";countEl.textContent=filtered.length+" Ergebnisse";}cardRegistry=[];if(!filtered.length){document.getElementById("search-out").innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine Ergebnisse.</p></div>';return;}document.getElementById("search-out").innerHTML=filtered.map(function(i){return mkCard(i);}).join("");}
var sBcInEl=document.getElementById("s-bc-in");if(sBcInEl)sBcInEl.addEventListener("keydown",function(e){if(e.key==="Enter")doSearch();});

// ── DIAGNOSE ─────────────────────────────────────────────────────
function test1(){var b=document.getElementById("bt1"),o=b.innerHTML;setBL(b,true);var x=document.getElementById("t1o");x.className="diag dinf";x.textContent="Warte…";x.style.display="block";gasGet("verbindungstest",{},function(r){setBL(b,false,o);if(r&&r.ok){x.className="diag dok";x.textContent="✅ "+(r.msg||"OK")+" – "+(r.zeit||"");}else{x.className="diag derr";x.textContent="❌ Fehler: "+(r?JSON.stringify(r):"keine Antwort");}},function(e){setBL(b,false,o);x.className="diag derr";x.textContent="❌ "+String(e);});}
function test2(){var b=document.getElementById("bt2"),o=b.innerHTML;setBL(b,true);var x=document.getElementById("t2o");x.className="diag dinf";x.textContent="Prüfe…";x.style.display="block";gasGet("sheetTest",{},function(r){setBL(b,false,o);if(r&&r.ok){x.className="diag dok";x.textContent="✅ Sheet: "+(r.name||"OK");}else{x.className="diag derr";x.textContent="❌ "+(r&&r.fehler?r.fehler:JSON.stringify(r));}},function(e){setBL(b,false,o);x.className="diag derr";x.textContent="❌ "+String(e);});}
function test3(){var b=document.getElementById("bt3"),o=b.innerHTML;setBL(b,true);var x=document.getElementById("t3o");x.className="diag dinf";x.textContent="Schreibe Testzeile…";x.style.display="block";gasGet("saveTestzeile",{},function(r){setBL(b,false,o);if(r&&r.ok){testRowNum=r.rowNum;x.className="diag dok";x.textContent="✅ "+r.msg+" – wird in 3s gelöscht…";startTestTimer(3);}else{x.className="diag derr";x.textContent="❌ "+(r?r.fehler:"?");}},function(e){setBL(b,false,o);x.className="diag derr";x.textContent="❌ "+e;});}
function startTestTimer(sec){var box=document.getElementById("test-timer-box"),bar=document.getElementById("timer-bar"),cnt=document.getElementById("timer-cnt");box.classList.add("show");var remaining=sec*10,total=remaining;if(timerInterval)clearInterval(timerInterval);timerInterval=setInterval(function(){remaining--;cnt.textContent=Math.ceil(remaining/10);bar.style.width=Math.round((remaining/total)*100)+"%";if(remaining<=0){clearInterval(timerInterval);timerInterval=null;box.classList.remove("show");if(testRowNum>0){gasGet("deleteTestzeile",{rowNum:testRowNum},function(r){var x=document.getElementById("t3o");x.className=r.ok?"diag dok":"diag derr";x.textContent=r.ok?"✅ Testzeile gelöscht.":"❌ Löschen fehlgeschlagen: "+(r.fehler||"?");testRowNum=-1;},function(){});}}},100);}

// ── UTILS ────────────────────────────────────────────────────────
function gv(id){var e=document.getElementById(id);return e?e.value:"";}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function setBL(btn,on,orig){if(on){btn.disabled=true;btn.innerHTML='<span class="spin"></span>';}else{btn.disabled=false;if(orig)btn.innerHTML=orig;}}
function runRefreshAction(btn, actionName){
  if(!btn) return;
  var icon=btn.querySelector("i");
  if(icon) icon.style.animation="rot .7s linear infinite";
  btn.disabled=true;
  setTimeout(function(){
    try{
      if(actionName==="loadAll") loadAll(true);
      else if(actionName==="loadHandel") loadHandel();
      else if(actionName==="loadMitarbeiterStats") loadMitarbeiterStats();
      else if(actionName==="renderAnalysePanel") renderAnalysePanel();
    }finally{
      setTimeout(function(){
        if(icon) icon.style.animation="";
        btn.disabled=false;
      },350);
    }
  },120);
}
function setupRefreshButtons(){
  var map=[
    {sel:"#list-panel .btn.btn-outline-secondary",act:"loadAll"},
    {sel:"#handel-panel #handel-vk .btn.btn-outline-secondary",act:"loadHandel"},
    {sel:"#handel-panel #handel-ek .btn.btn-outline-secondary",act:"loadHandel"},
    {sel:"#home-panel button[onclick*='loadMitarbeiterStats']",act:"loadMitarbeiterStats"},
    {sel:"#analyse-panel button[onclick*='renderAnalysePanel']",act:"renderAnalysePanel"}
  ];
  map.forEach(function(m){
    document.querySelectorAll(m.sel).forEach(function(btn){
      if(btn.getAttribute("data-refresh-bound")==="1")return;
      btn.setAttribute("data-refresh-bound","1");
      btn.addEventListener("click",function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        runRefreshAction(btn,m.act);
      });
    });
  });
}
function showD(id,msg,cls){var e=document.getElementById(id);if(!e)return;e.className="diag "+(cls||"derr");e.textContent=msg;e.style.display="block";}
function hideD(id){var e=document.getElementById(id);if(e)e.style.display="none";}
function toast(msg,t,d){d=d||4000;var w=document.getElementById("toasts"),el=document.createElement("div");var c=t==="ok"?"tok":t==="err"?"terr":"tinf",ic=t==="ok"?"✅":t==="err"?"❌":"💡";el.className="tm "+c;el.innerHTML="<span>"+ic+"</span><span>"+msg+"</span>";w.appendChild(el);setTimeout(function(){el.style.opacity="0";el.style.transform="translateY(7px)";setTimeout(function(){el.remove();},300);},d);}
function showZustandInfo(){var info=[["Neuwertig","Neu & originalverpackt, unbenutzt"],["Sehr gut","Mit Originalverpackung, kaum Gebrauchsspuren"],["Gut","Leichte Gebrauchsspuren, vollständig mit Hülle"],["Akzeptabel","Sichtbare Kratzer/Gebrauch, funktionsfähig"],["Defekt","Funktioniert nicht oder stark beschädigt"]];var rows=info.map(function(r){return'<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-weight:700;color:var(--blue);min-width:90px;font-size:13px">'+r[0]+'</span><span style="font-size:13px;color:var(--text2)">'+r[1]+'</span></div>';}).join("");var overlay=document.createElement("div");overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)";var inner=document.createElement("div");inner.style.cssText="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;max-width:400px;width:100%";var hd=document.createElement("div");hd.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px";var ttl=document.createElement("span");ttl.style.cssText="font-size:16px;font-weight:700;color:var(--text)";ttl.textContent="Zustand-Erklärung";var xbtn=document.createElement("button");xbtn.textContent="✕";xbtn.style.cssText="background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:14px";xbtn.onclick=function(){overlay.remove();};hd.appendChild(ttl);hd.appendChild(xbtn);inner.appendChild(hd);var rd=document.createElement("div");rd.innerHTML=rows;inner.appendChild(rd);overlay.appendChild(inner);overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};document.body.appendChild(overlay);}

// ── BENACHRICHTIGUNGEN ────────────────────────────────────────────
var notifications=[];
function loadNotifications(){try{var s=localStorage.getItem("smp_notifs");if(s)notifications=JSON.parse(s)||[];}catch(e){}if(!Array.isArray(notifications))notifications=[];updateNotifBadge();checkLongStorageItems();}
function saveNotifications(){if(!Array.isArray(notifications))notifications=[];try{localStorage.setItem("smp_notifs",JSON.stringify(notifications.slice(0,50)));}catch(e){}}
function addNotification(title,body,type,action){if(!Array.isArray(notifications))notifications=[];var notif={id:Date.now(),title:title,body:body,type:type||"info",time:new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}),read:false,action:action||""};notifications.unshift(notif);saveNotifications();updateNotifBadge();}
function updateNotifBadge(){var notifArr=Array.isArray(notifications)?notifications:[];var unread=notifArr.filter(function(n){return!n.read;}).length;var badge=document.getElementById("notif-count-badge");if(badge){if(unread>0){badge.style.display="flex";badge.textContent=unread>9?"9+":unread;}else{badge.style.display="none";}}}
function openNotifications(){if(!Array.isArray(notifications))notifications=[];notifications.forEach(function(n){n.read=true;});saveNotifications();updateNotifBadge();renderNotifList();var ov=document.getElementById("notif-overlay");if(ov)ov.classList.add("open");}
function closeNotifications(){var ov=document.getElementById("notif-overlay");if(ov)ov.classList.remove("open");}
function renderNotifList(){var list=document.getElementById("notif-list");if(!list)return;var notifArr=Array.isArray(notifications)?notifications:[];if(!notifArr.length){list.innerHTML='<div class="notif-empty"><i class="bi bi-bell-slash"></i><p>Keine Benachrichtigungen</p></div>';return;}list.innerHTML=notifArr.map(function(n){var cls=n.type==="alert"?"alert":n.type==="warn"?"warn":"";var actionBtn=n.action==="bestand-pruefmodus"?'<button class="btn btn-outline-primary btn-sm" style="margin-top:8px" onclick="event.stopPropagation();openBestandPruefmodus()">Prüfmodus öffnen</button>':(n.action==="task-open"?'<button class="btn btn-outline-primary btn-sm" style="margin-top:8px" onclick="event.stopPropagation();openTasksMaster()">Tasks öffnen</button>':"");var click=(n.action==="bestand-pruefmodus"?' onclick="openBestandPruefmodus()" ':'');return'<div class="notif-item '+cls+'"'+click+'><div class="notif-title">'+esc(n.title)+'</div><div class="notif-body">'+esc(n.body)+'</div>'+actionBtn+'<div class="notif-time">'+esc(n.time)+'</div><button class="notif-rm" onclick="event.stopPropagation();removeNotif('+n.id+')">✕</button></div>';}).join("");}
function removeNotif(id){if(!Array.isArray(notifications))notifications=[];notifications=notifications.filter(function(n){return n.id!==id;});saveNotifications();renderNotifList();updateNotifBadge();}
function clearAllNotifications(){if(!confirm("Alle Benachrichtigungen löschen?"))return;notifications=[];saveNotifications();renderNotifList();updateNotifBadge();}
function checkLongStorageItems(){if(!Array.isArray(allItems)||allItems.length===0)return;if(!Array.isArray(notifications))notifications=[];var now=new Date(),threshold=30;allItems.forEach(function(item){if(!item.datum)return;var parts=item.datum.split(".");if(parts.length<3)return;var d=new Date(parts[2].split(" ")[0],parts[1]-1,parts[0]);if(isNaN(d))return;var days=Math.floor((now-d)/(1000*60*60*24));if(days>=threshold){var nm=item.name||item.spiel||item.modell||item.geraet||"Unbekannt";var already=notifications.find(function(n){return n.body&&n.body.indexOf(nm)>-1&&n.title.indexOf("Lager")>-1;});if(!already)addNotification("⏳ Lange im Lager",'"'+nm+'" lagert seit '+days+' Tagen.',"warn");}});
try{
  var key="smp_audit_last";
  var last=parseInt(localStorage.getItem(key)||"0",10)||0;
  var everyMs=1000*60*60*24*60; // every two months
  if((Date.now()-last)>everyMs){
    var alreadyAudit=notifications.find(function(n){return n.title&&n.title.indexOf("Bestandskontrolle")>-1&&n.time&&n.time.indexOf(now.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}))>-1;});
    if(!alreadyAudit){
      addNotification("📋 Bestandskontrolle", "Bitte Lagerfächer und aktive Zimmer auf Differenzen prüfen.", "alert","bestand-pruefmodus");
      localStorage.setItem(key,String(Date.now()));
    }
  }
}catch(e){}}
function openBestandPruefmodus(){openBestandsmasterPro();toast("BestandsmasterPro geöffnet.","info",1800);}

// ================================================================
// SCAN MODE
// ================================================================
function setMode(mode){
  ensureScanFlowNodes();
  scanMode=mode;
  var mc=document.getElementById("mode-chooser");
  if(!mc){toast("Scan-Ansicht unvollständig. Bitte Seite neu laden.","err");return;}
  mc.style.display="none";
  if(mode==="einlagern"){
    var cc=document.getElementById("cat-chooser");
    if(cc)cc.style.display="block";
  } else {
    // Direkt Barcode-Scanner für Verkauf/Einkauf
    _openHandelScan(mode);
  }
}
function resetToMode(){
  ensureScanFlowNodes();
  stopCam();
  var mc=document.getElementById("mode-chooser");if(mc)mc.style.display="block";
  var cc=document.getElementById("cat-chooser");if(cc)cc.style.display="none";
  var sw=document.getElementById("sw-sub");if(sw)sw.style.display="none";
  var ms=document.getElementById("main-stepper");if(ms)ms.style.display="none";
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
var handelVkRegistry=[], handelEkRegistry=[];
var editVerkaufItem=null, editEinkaufItem=null;

function parseDeDate(d){
  if(!d) return null;
  var s=String(d).trim();
  var m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if(!m) return null;
  return new Date(parseInt(m[3],10),parseInt(m[2],10)-1,parseInt(m[1],10),0,0,0,0);
}
function inDateRange(itemDate, fromDate, toDate){
  var dt=parseDeDate(itemDate); if(!dt) return false;
  if(fromDate && dt<fromDate) return false;
  if(toDate && dt>toDate) return false;
  return true;
}
function getHandelDateRange(){
  var mode=(document.getElementById("handel-date-mode")||{value:"thismonth"}).value;
  var now=new Date();
  var from=null,to=null;
  if(mode==="thismonth"){
    from=new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0);
    to=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999);
  }else if(mode==="lastmonth"){
    from=new Date(now.getFullYear(),now.getMonth()-1,1,0,0,0,0);
    to=new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999);
  }else if(mode==="custom"){
    var fromIn=(document.getElementById("handel-date-from")||{value:""}).value;
    var toIn=(document.getElementById("handel-date-to")||{value:""}).value;
    if(fromIn){var f=new Date(fromIn+"T00:00:00");if(!isNaN(f))from=f;}
    if(toIn){var t=new Date(toIn+"T23:59:59");if(!isNaN(t))to=t;}
  }
  return {from:from,to:to};
}
function ensureHandelDateFilterUI(){
  var panel=document.getElementById("handel-panel");
  if(!panel || document.getElementById("handel-date-filter-box")) return;
  var wrap=document.createElement("div");
  wrap.id="handel-date-filter-box";
  wrap.style.cssText="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap;background:var(--b2);border:1px solid var(--e1);border-radius:8px;padding:8px 10px";
  wrap.innerHTML=''
    +'<span style="font-size:10px;color:var(--w4);font-family:monospace;letter-spacing:.5px">ZEITFILTER</span>'
    +'<select id="handel-date-mode" class="fc" style="width:auto;min-width:145px;font-size:11px;padding:8px 10px;font-family:\'Space Mono\',monospace;background:var(--b1)">'
    +'<option value="thismonth">DIESER MONAT</option>'
    +'<option value="lastmonth">LETZTER MONAT</option>'
    +'<option value="all">GESAMT</option>'
    +'<option value="custom">ZEITRAUM</option>'
    +'</select>'
    +'<input type="date" id="handel-date-from" class="fc" style="display:none;width:auto;font-size:11px;padding:8px 10px;font-family:\'Space Mono\',monospace"/>'
    +'<input type="date" id="handel-date-to" class="fc" style="display:none;width:auto;font-size:11px;padding:8px 10px;font-family:\'Space Mono\',monospace"/>';
  var target=panel.querySelector(".wrap");
  if(target) target.insertBefore(wrap,target.firstChild);
  var modeEl=document.getElementById("handel-date-mode");
  var fromEl=document.getElementById("handel-date-from");
  var toEl=document.getElementById("handel-date-to");
  function sync(){
    var isCustom=modeEl.value==="custom";
    fromEl.style.display=isCustom?"block":"none";
    toEl.style.display=isCustom?"block":"none";
    loadHandel();
  }
  modeEl.onchange=sync;
  fromEl.onchange=function(){loadHandel();};
  toEl.onchange=function(){loadHandel();};
}

function ensureHandelEkFilterUI(){
  try{
    var row = document.querySelector("#handel-ek .d-flex");
    if(!row) return;
    if(document.getElementById("ek-status-filter")) return;
    var sel = document.createElement("select");
    sel.id = "ek-status-filter";
    sel.className = "fc";
    sel.style.cssText = "width:auto;max-width:160px;font-size:11px;padding:8px 10px;font-family:'Space Mono',monospace";
    ["","Entwurf","Gezahlt","Transit","Bestand","Storniert"].forEach(function(v){
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v ? v.toUpperCase() : "ALLE";
      sel.appendChild(o);
    });
    sel.onchange = function(){ filterHandel("einkauf"); };
    var search = document.getElementById("ek-search");
    if(search && search.parentNode === row){
      row.insertBefore(sel, search.nextSibling);
    } else {
      row.appendChild(sel);
    }
  }catch(e){}
}

function setHandelTab(tab){
  currentHandelTab=tab;
  ensureHandelDateFilterUI();
  document.getElementById("htab-vk").className="ltab"+(tab==="verkauf"?" on":"");
  document.getElementById("htab-ek").className="ltab"+(tab==="einkauf"?" on":"");
  document.getElementById("handel-vk").style.display=tab==="verkauf"?"block":"none";
  document.getElementById("handel-ek").style.display=tab==="einkauf"?"block":"none";
  if(tab==="einkauf") ensureHandelEkFilterUI();
}

function loadHandel(){
  ensureHandelDateFilterUI();
  var dr=getHandelDateRange();
  gasGet("getAllVerkauf",{},function(r){if(r&&r.ok){var raw=r.data||[];allVerkauf=raw.filter(function(x){return inDateRange(x.datum,dr.from,dr.to);});renderVerkaufList();}},function(){});
  gasGet("getAllEinkauf",{},function(r){if(r&&r.ok){var raw=r.data||[];allEinkauf=raw.filter(function(x){return inDateRange(x.datum,dr.from,dr.to);});renderEinkaufList();}},function(){});
}

function filterHandel(type){
  if(type==="verkauf")renderVerkaufList();
  else renderEinkaufList();
}

function renderVerkaufList(){
  var q=(document.getElementById("vk-search")||{value:""}).value.toLowerCase();
  var items=q?allVerkauf.filter(function(r){return(r.kunde||"").toLowerCase().includes(q)||(r.produkte||"").toLowerCase().includes(q)||(r.scanId||"").toLowerCase().includes(q)||(r.sendenummer||"").toLowerCase().includes(q);}):allVerkauf;
  handelVkRegistry = items.slice();
  var el=document.getElementById("vk-body");
  if(!items.length){el.innerHTML='<div class="empty"><i class="bi bi-cash-coin"></i><p>Keine Verkäufe gefunden</p></div>';return;}
  el.innerHTML=items.map(function(v,i){return mkHandelCard(v,"verkauf",i);}).join("");
}

function renderEinkaufList(){
  var q=(document.getElementById("ek-search")||{value:""}).value.toLowerCase();
  var sf = (document.getElementById("ek-status-filter")||{value:""}).value;
  var items = allEinkauf.slice();
  if(sf){
    items = items.filter(function(r){ return String(r.status||"").toLowerCase()===String(sf).toLowerCase(); });
  }
  if(q){
    items = items.filter(function(r){
      return (r.kunde||"").toLowerCase().includes(q) ||
        (r.produkte||"").toLowerCase().includes(q) ||
        (r.scanId||"").toLowerCase().includes(q) ||
        (r.zimmer||"").toLowerCase().includes(q);
    });
  }
  var el=document.getElementById("ek-body");
  handelEkRegistry = items.slice();
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
  if(type==="verkauf"){openVerkaufForm((handelVkRegistry||[])[idx]||allVerkauf[idx]);}
  else{openEinkaufForm((handelEkRegistry||[])[idx]||allEinkauf[idx]);}
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
  var items=allItems
    .filter(function(i){return i.type!=="defekt"&&i.type!=="verkauf";})
    .sort(function(a,b){return _normDateValue(a.datum)-_normDateValue(b.datum);});
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
  _addVKItem(item);
  var pi=document.getElementById("vk-product-info");
  if(pi){
    var info=[item.datum,item.mitarbeiter,"FIFO aktiv (ältester zuerst)"].filter(Boolean).join(" · ");
    pi.textContent="✓ Artikel zur Pick-Liste hinzugefügt · "+info; pi.style.display="block";
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
  var vpNum = parseFloat(data.verkaufspreis||0);
  var epNum = parseFloat(data.einkaufspreis||0);
  var vsNum = parseFloat(data.versandkosten||0);
  var feeRates = {"eBay":0.13,"Kleinanzeigen":0,"Facebook":0,"Abholung":0,"Sonstiges":0};
  var fees = Math.round(vpNum * (feeRates[data.plattform]||0) * 100) / 100;
  data.fees = fees.toFixed(2);
  data.profitNet = (Math.round((vpNum - epNum - vsNum - fees) * 100) / 100).toFixed(2);
  if(vkScannedItems.length){
    var fifoSorted = vkScannedItems.slice().sort(function(a,b){return _normDateValue(a.lagerDatum)-_normDateValue(b.lagerDatum);});
    data.pickedItems = vkScannedItems.map(function(i){
      return {rowIndex:i.rowIndex,type:i.type,scanId:i.scanId,grade:i.conditionGrade};
    });
    data.fifoSource = fifoSorted.map(function(i){return i.scanId||i.name;}).join(", ");
  }
  var soldIds=(String(data.scanIds||"")).split(",").map(function(x){return String(x||"").trim();}).filter(Boolean);
  var hitSetRef=null;
  for(var si=0;si<soldIds.length;si++){
    var sid=soldIds[si];
    if(setMembershipByScanId[sid]&&setMembershipByScanId[sid].length){hitSetRef=setMembershipByScanId[sid][0];break;}
  }
  if(hitSetRef&&!window._vkSetWarnBypass){
    showSetSaleGuard(hitSetRef,function(action){
      if(action==="open_set"){openSetReference(String(hitSetRef.setId||""));return;}
      if(action==="cancel"){return;}
      if(action==="confirm"){window._vkSetWarnBypass=true;saveVKForm();}
    });
    return;
  }
  var btn = document.getElementById("vk-save-btn"); setBL(btn,true);
  var action = editVerkaufItem ? "updateVerkauf" : "saveVerkauf";
  if(editVerkaufItem) data.rowIndex = editVerkaufItem.rowIndex;
  gasPost(action, data, function(r){
    window._vkSetWarnBypass=false;
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
  }, function(e){ window._vkSetWarnBypass=false; setBL(btn,false); var dg=document.getElementById("vk-diag");dg.className="diag derr";dg.textContent="Verbindungsfehler: "+e;dg.style.display="block"; });
}
function ensureSetSaleGuardModal(){
  if(document.getElementById("set-sale-guard-modal"))return;
  var ov=document.createElement("div");
  ov.id="set-sale-guard-modal";
  ov.style.cssText="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10090;align-items:center;justify-content:center;padding:14px";
  ov.innerHTML='<div style="width:min(520px,96vw);background:#0f1724;border:1px solid #58a6ff66;border-radius:12px;padding:14px"><div style="font-size:18px;font-weight:800;color:#58a6ff">Artikel ist Teil eines Sets</div><div id="set-sale-guard-txt" style="font-size:12px;color:var(--w3);margin:8px 0 12px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-outline-secondary btn-sm" onclick="resolveSetSaleGuard(\'cancel\')">Abbrechen</button><button class="btn btn-outline-primary btn-sm" onclick="resolveSetSaleGuard(\'open_set\')">Set ansehen</button><button class="btn btn-danger btn-sm" onclick="resolveSetSaleGuard(\'confirm\')">Trotzdem verkaufen</button></div></div>';
  document.body.appendChild(ov);
}
function showSetSaleGuard(setRef,cb){
  ensureSetSaleGuardModal();
  window._setSaleGuardCallback=cb;
  var ov=document.getElementById("set-sale-guard-modal");
  var tx=document.getElementById("set-sale-guard-txt");
  if(tx)tx.textContent='Set: '+String(setRef.name||setRef.setId||"Unbekannt");
  if(ov)ov.style.display="flex";
}
function resolveSetSaleGuard(action){
  var ov=document.getElementById("set-sale-guard-modal");if(ov)ov.style.display="none";
  var cb=window._setSaleGuardCallback;window._setSaleGuardCallback=null;
  if(typeof cb==="function")cb(action);
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
    Kleinanzeigen:["PayPal","Kleinanzeigen Sicher Bezahlen","Kleinanzeigen SB","Überweisung","eBay","Bar (Abholung)"],
    eBay:["eBay-Zahlung","eBay","PayPal","Kleinanzeigen Sicher Bezahlen","Kleinanzeigen SB"],
    Abholung:["Bar"],
    Sonstiges:["PayPal","Überweisung","Bar","Sonstiges","eBay","Kleinanzeigen Sicher Bezahlen","Kleinanzeigen SB"]
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
  var vp=parseFloat(gv("vk-preis")||0), ep=parseFloat(gv("vk-ep")||0), vs=parseFloat(gv("vk-versand")||0);
  var feeRates={"eBay":0.13,"Kleinanzeigen":0,"Facebook":0,"Abholung":0,"Sonstiges":0};
  var fees=Math.round(vp*(feeRates[gv("vk-plattform")]||0)*100)/100;
  var profit=Math.round((vp-ep-vs-fees)*100)/100;
  var items=[
    ["Produkt",gv("vk-produkte")],["Preis",gv("vk-preis")?"€"+gv("vk-preis"):"–"],
    ["Plattform",gv("vk-plattform")],["Käufer",gv("vk-kunde")||"–"],
    ["Bezahlt mit",gv("vk-bezahlt")||"–"],["Status",gv("vk-status")],
    ["Versand",gv("vk-abholung")],["Gebühren",fees.toFixed(2)+"€"],["Netto-Profit",(profit>=0?"+":"")+profit.toFixed(2)+"€"]
  ];
  if(gv("vk-sende"))items.push(["Sendenummer",gv("vk-sende")]);
  if(vkScannedItems.length)items.push(["FIFO Pick",vkScannedItems.slice().sort(function(a,b){return _normDateValue(a.lagerDatum)-_normDateValue(b.lagerDatum);}).map(function(i){return i.scanId||i.name;}).join(", ")]);
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
  if(eb){
    eb.style.display=(item.type==="defekt"||item.type==="setbundle")?"none":"inline-flex";
    eb.onclick=function(){closeDetail();openEditStepper(rIdx);};
  }

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
      heroEl.style.aspectRatio="4 / 3";heroEl.style.maxHeight="68vh";
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
    heroEl.style.aspectRatio="4 / 3";heroEl.style.maxHeight="68vh";
    heroEl.innerHTML='<img src="'+esc(src)+'" style="width:100%;height:100%;object-fit:cover"/>';
    thumbsEl.querySelectorAll(".detail-photo-thumb").forEach(function(t){t.classList.remove("active");});
    el.classList.add("active");
  };
  var allFotos=kaFotos.concat(defFotos);
  // Initial display: show anzeige fotos first, fallback to defekt
  if(kaFotos.length>0){ detailShowFotoTab("anzeige"); }
  else if(defFotos.length>0){ detailShowFotoTab("defekt"); }
  else { heroEl.className="detail-hero-empty";heroEl.innerHTML="📦"; thumbsEl.style.display="none"; }
  if(heroEl){
    var startX=null,activeList=kaFotos.length?kaFotos:defFotos,activeIdx=0;
    heroEl.ontouchstart=function(e){if(e.touches&&e.touches[0])startX=e.touches[0].clientX;};
    heroEl.ontouchend=function(e){
      if(startX===null||!e.changedTouches||!e.changedTouches[0])return;
      var dx=e.changedTouches[0].clientX-startX;startX=null;
      if(Math.abs(dx)<35||!activeList.length)return;
      if(dx<0)activeIdx=Math.min(activeList.length-1,activeIdx+1);else activeIdx=Math.max(0,activeIdx-1);
      var src=activeList[activeIdx];if(src){heroEl.style.aspectRatio="4 / 3";heroEl.style.maxHeight="68vh";heroEl.innerHTML='<img src="'+esc(src)+'" style="width:100%;height:100%;object-fit:cover"/>';}
    };
  }

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
  row("Datum",item.datum);row("Mitarbeiter",item.mitarbeiter);row("Zustand",item.zustand);row("EK-Preis",item.einkaufspreis?item.einkaufspreis+"€":"");
  if(item.type==="konsole"){row("Speicher",item.speicherGB?(item.speicherGB+" GB"):"");row("Farbe",item.farbe);}
  if(item.type==="spiel"){row("System",item.system);row("USK",item.usk);row("Sprache",item.sprache);}
  if(item.type==="handy"){row("Speicher",item.speicherGB?(item.speicherGB+" GB"):"");row("RAM",item.ram?(item.ram+" GB"):"");row("Farbe",item.farbe);row("Netzwerk",item.netzwerk);row("IMEI",item.imei);}
  if(item.type==="pc"){row("Typ",item.typ_);row("Prozessor",item.prozessor);row("RAM",item.ram?(item.ram+" GB"):"");row("Speicher",item.speicherGB?(item.speicherGB+" GB"):"");row("GPU",item.grafikkarte);row("OS",item.betriebssystem);}
  if(item.type==="controller"){row("System",item.system);row("Hinweise",item.hinweise);}
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
  if(!Array.isArray(mitarbeiterStats))mitarbeiterStats=[];
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

function ensureProfileDashboardStyles(){
  if(document.getElementById("profile-dashboard-style"))return;
  var st=document.createElement("style");
  st.id="profile-dashboard-style";
  st.textContent=".pd-wrap{margin:12px 0 0;display:flex;flex-direction:column;gap:16px}.pd-sec{background:#0f1115;border:1px solid #1f2937;border-radius:14px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.2)}.pd-title{font-size:22px;font-weight:800;color:#fff;margin:0 0 4px}.pd-sub{font-size:12px;color:#8b949e}.pd-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pd-grid-5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.pd-module{background:#0f1115;border:1px solid #222;border-radius:14px;padding:16px;cursor:pointer;transition:all .16s ease}.pd-module:hover{transform:scale(1.02);box-shadow:0 0 20px rgba(0,255,136,.22);border-color:#00ff8866}.pd-module .i{font-size:22px;color:#00ff88}.pd-module .t{font-size:14px;font-weight:700;color:#fff;margin-top:8px}.pd-module .d{font-size:11px;color:#8b949e;margin-top:4px}.pd-kpi{background:#0f1115;border:1px solid #222;border-radius:12px;padding:12px}.pd-kpi .n{font-size:24px;font-weight:900;color:#fff;line-height:1}.pd-kpi .l{font-size:11px;color:#8b949e;margin-top:4px}.pd-kpi .x{font-size:10px;color:#8b949e;margin-top:4px}.pd-kpi .u{color:#00ff88}.pd-kpi .d{color:#f85149}.pd-act{display:flex;flex-direction:column;gap:8px}.pd-act-item{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid #1f2937;border-radius:10px;cursor:pointer;transition:all .14s}.pd-act-item:hover{border-color:#00ff8866;background:#12181f}.pd-act-ic{color:#00ff88;font-size:15px;min-width:18px}.pd-act-t{font-size:12px;color:#e6edf3}.pd-quick{display:flex;gap:8px;flex-wrap:wrap}.pd-quick .btn{border-color:#00ff8866}.pd-log-item{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed #1f2937}.pd-log-item:last-child{border-bottom:none}.pd-log-ic{color:#8b949e}.pd-log-t{font-size:11px;color:#9ca3af}.pd-skeleton{height:14px;background:linear-gradient(90deg,#111 25%,#1b1f24 45%,#111 65%);background-size:200% 100%;animation:pds .9s linear infinite;border-radius:8px}.pd-skeleton.card{height:88px}@keyframes pds{0%{background-position:200% 0}100%{background-position:-200% 0}}@media(max-width:980px){.pd-grid-5{grid-template-columns:repeat(2,minmax(0,1fr))}.pd-grid-3{grid-template-columns:1fr}}";
  document.head.appendChild(st);
}
function _pdParseDate(v){
  if(!v)return null;
  var s=String(v||"");var m=s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);if(!m)return null;
  return new Date(parseInt(m[3],10),parseInt(m[2],10)-1,parseInt(m[1],10));
}
function _pdIsSameDay(d,a){return d&&a&&d.getFullYear()===a.getFullYear()&&d.getMonth()===a.getMonth()&&d.getDate()===a.getDate();}
function _pdRelCount(arr,getDateFn,dayOffset){
  var base=new Date();base.setHours(0,0,0,0);base.setDate(base.getDate()+dayOffset);
  return arr.filter(function(x){var d=getDateFn(x);return _pdIsSameDay(d,base);}).length;
}
function _pdRoleRank(r){r=normalizeRole(r);if(r==="inhaber")return 4;if(r==="co-chef")return 3;if(r==="senior")return 2;return 1;}
function _pdBuildPossibleSets(items){
  var byP={};items.forEach(function(i){if(i.type==="defekt"||i.type==="setbundle")return;var p=_sbDetectPlatform(i)||"Other";if(!byP[p])byP[p]={konsole:0,spiel:0,controller:0};if(i.type==="konsole"||i.type==="spiel"||i.type==="controller")byP[p][i.type]++;});
  var c=0;Object.keys(byP).forEach(function(k){var o=byP[k];if(o.konsole>0&&o.spiel>=2)c++;});
  return c;
}
function _pdRenderSkeleton(root){
  root.innerHTML='<div class="pd-wrap"><div class="pd-sec"><div class="pd-skeleton" style="width:220px"></div><div class="pd-skeleton" style="width:320px;margin-top:8px"></div><div class="pd-skeleton card" style="margin-top:12px"></div></div><div class="pd-grid-3"><div class="pd-skeleton card"></div><div class="pd-skeleton card"></div><div class="pd-skeleton card"></div></div></div>';
}
function _pdRenderDashboard(root,ctx){
  var actions=ctx.actions.slice(0,6).map(function(a){return '<div class="pd-act-item" onclick="'+a.click+'"><div class="pd-act-ic">'+a.icon+'</div><div class="pd-act-t">'+esc(a.text)+'</div></div>';}).join("");
  var modules='<div class="pd-grid-3"><div class="pd-module" onclick="openBestandsmasterPro()"><div class="i"><i class="bi bi-boxes"></i></div><div class="t">BestandsmasterPro</div><div class="d">Bestandsprüfung und Qualitätskontrolle</div></div><div class="pd-module" onclick="openSetBuilderFlow()"><div class="i"><i class="bi bi-cpu"></i></div><div class="t">KIsetMasterPro</div><div class="d">Sets erstellen, optimieren und verwalten</div></div><div class="pd-module" onclick="openTasksMaster()"><div class="i"><i class="bi bi-check2-square"></i></div><div class="t">TasksMasterPro</div><div class="d">Aufgaben steuern und Fortschritt tracken</div></div></div>';
  var kpis=ctx.kpis.map(function(k){return '<div class="pd-kpi"><div class="n">'+esc(String(k.value))+'</div><div class="l">'+esc(k.label)+'</div><div class="x">'+(k.delta>0?'<span class="u">↑ +'+k.delta+'</span>':k.delta<0?'<span class="d">↓ '+k.delta+'</span>':'<span>± 0</span>')+' seit gestern</div></div>';}).join("");
  var quick='<div class="pd-quick"><button class="btn btn-success btn-sm" onclick="goTabFn(\'scan-panel\')"><i class="bi bi-plus-circle me-1"></i>Produkt hinzufügen</button><button class="btn btn-success btn-sm" onclick="goTabFn(\'scan-panel\');setTimeout(function(){try{startCam();}catch(e){}},120)"><i class="bi bi-upc-scan me-1"></i>Scan starten</button><button class="btn btn-success btn-sm" onclick="openTasksMaster()"><i class="bi bi-list-task me-1"></i>Task erstellen</button></div>';
  var logHtml=(ctx.activityGrouped.today.concat(ctx.activityGrouped.yesterday).slice(0,ctx.showAll?999:5)).map(function(e){return '<div class="pd-log-item"><div class="pd-log-ic">'+e.icon+'</div><div><div style="font-size:12px;color:#e6edf3">'+esc(e.title)+'</div><div class="pd-log-t">'+esc(e.time)+' • '+esc(e.details||"")+'</div></div></div>';}).join("")||'<div class="pd-sub">Keine Aktivitäten</div>';
  var recs=ctx.recommendations.map(function(r){return '<div class="pd-act-item" onclick="'+r.click+'"><div class="pd-act-ic"><i class="bi bi-magic"></i></div><div class="pd-act-t">'+esc(r.text)+'</div></div>';}).join("");
  var roleExtra="";
  if(_pdRoleRank(ctx.role)>=3){
    roleExtra+='<div class="pd-sec"><div class="pd-title">Mitarbeiter Übersicht</div><div class="pd-sub">Erledigte Tasks je Mitarbeiter</div><div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">'+ctx.teamTaskStats.map(function(x){return '<div style="border:1px solid #222;border-radius:10px;padding:10px"><div style="font-size:12px;color:#e6edf3">'+esc(x.name)+'</div><div style="font-size:18px;color:#00ff88;font-weight:800">'+x.done+'</div></div>';}).join("")+'</div></div>';
  }
  if(_pdRoleRank(ctx.role)>=4){
    roleExtra+='<div class="pd-sec"><div class="pd-title">Inhaber Kennzahlen</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px"><div class="pd-kpi"><div class="n">'+esc(ctx.owner.monthRevenue.toFixed(2))+'€</div><div class="l">Umsatz Monat</div></div><div class="pd-kpi"><div class="n">'+esc(ctx.owner.monthProfit.toFixed(2))+'€</div><div class="l">Gewinn Monat</div></div><div class="pd-kpi"><div class="n">'+esc(ctx.owner.topEmployee||"–")+'</div><div class="l">Top Mitarbeiter</div></div></div></div>';
  }
  root.innerHTML='<div class="pd-wrap"><div class="pd-sec"><div class="pd-title">Willkommen zurück, '+esc(ctx.name)+'</div><div class="pd-sub">Heute '+ctx.openTasks+' Tasks offen • '+ctx.readyToSell+' Produkte verkaufsbereit</div></div><div class="pd-sec"><div class="pd-title">Deine heutigen Aktionen</div><div class="pd-sub">Wichtigste nächsten Schritte</div><div class="pd-act" style="margin-top:10px">'+actions+'</div></div>'+modules+'<div class="pd-sec"><div class="pd-title">KPIs</div><div class="pd-grid-5" style="margin-top:10px">'+kpis+'</div></div><div class="pd-sec"><div class="pd-title">Schnellaktionen</div>'+quick+'</div><div class="pd-sec"><div class="pd-title">KI Empfehlungen</div><div class="pd-act" style="margin-top:10px">'+recs+'</div></div><div class="pd-sec"><div style="display:flex;justify-content:space-between;align-items:center"><div class="pd-title">Aktivitätslog</div><button class="btn btn-outline-secondary btn-sm" onclick="toggleProfileLogMore()">'+(ctx.showAll?'Weniger':'Mehr anzeigen')+'</button></div><div class="pd-sub">Heute / Gestern</div><div style="margin-top:8px">'+logHtml+'</div></div>'+roleExtra+'</div>';
}
function toggleProfileLogMore(){window._profileShowAllLog=!window._profileShowAllLog;if(window._profileDashboardCtx&&window._profileDashRoot)_pdRenderDashboard(window._profileDashRoot,Object.assign({},window._profileDashboardCtx,{showAll:!!window._profileShowAllLog}));}
function openProfilFor(name) {
  if (!name) return;
  ensureProfileDashboardStyles();
  if(!Array.isArray(mitarbeiterStats))mitarbeiterStats=[];
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
  ensureBestandsmasterBtn();
  var ov=document.getElementById("profil-overlay");
  var container=ov?(ov.querySelector("div[style*='padding:20px 13px']")||ov):null;
  var dash=document.getElementById("profil-dashboard-root");
  if(!dash&&container){dash=document.createElement("div");dash.id="profil-dashboard-root";container.insertBefore(dash,container.children[2]||null);}
  if(dash)_pdRenderSkeleton(dash);
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
    try{
      loadTasks();
      var items=(allItems||[]).filter(function(i){return i.type!=="setbundle";});
      var sales=(allVerkauf||[]);
      var tasks=(tasksCache||[]);
      var ownOpenTasks=tasks.filter(function(t){return t.status!=="closed"&&(String(t.assignee||"").toLowerCase()===String(name||"").toLowerCase()||String(t.owner||"").toLowerCase()===String(name||"").toLowerCase());});
      var noImg=items.filter(function(i){return !i.fotos||!i.fotos.length;});
      var noPrice=items.filter(function(i){return !(parseFloat(i.kaPreis||0)>0||parseFloat(i.einkaufspreis||0)>0);});
      var incompleteSets=(setRowsCache||[]).filter(function(s){return !(s.items||[]).length||!(s.plattform||"").trim();});
      var ownItems=items.filter(function(i){return String(i.mitarbeiter||"").toLowerCase()===String(name||"").toLowerCase();});
      var readyToSell=items.filter(function(i){return (i.fotos&&i.fotos.length)&& (parseFloat(i.kaPreis||0)>0||parseFloat(i.einkaufspreis||0)>0);}).length;
      var inSetCount=Object.keys(setMembershipByScanId||{}).length;
      var day0=function(a){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+a);return d;};
      var today=day0(0),yesterday=day0(-1);
      var entryDate=function(i){return _pdParseDate(i.datum||"");};
      var saleDate=function(v){return _pdParseDate(v.datum||"");};
      var kpis=[
        {label:"Eingelagert",value:ownItems.length,delta:_pdRelCount(ownItems,entryDate,0)-_pdRelCount(ownItems,entryDate,-1)},
        {label:"Verkäufe",value:sales.filter(function(v){return String(v.mitarbeiter||"").toLowerCase()===String(name||"").toLowerCase();}).length,delta:_pdRelCount(sales.filter(function(v){return String(v.mitarbeiter||"").toLowerCase()===String(name||"").toLowerCase();}),saleDate,0)-_pdRelCount(sales.filter(function(v){return String(v.mitarbeiter||"").toLowerCase()===String(name||"").toLowerCase();}),saleDate,-1)},
        {label:"Produkte gesamt",value:items.length,delta:_pdRelCount(items,entryDate,0)-_pdRelCount(items,entryDate,-1)},
        {label:"Im Set",value:inSetCount,delta:0},
        {label:"Ohne Bild",value:noImg.length,delta:_pdRelCount(noImg,entryDate,0)-_pdRelCount(noImg,entryDate,-1)}
      ];
      var warnNoImg=noImg.slice(0,1).map(function(){return{icon:'<i class="bi bi-image"></i>',text:noImg.length+' Produkte ohne Bilder',click:"goTabFn('list-panel','all');var s=document.getElementById('lager-dd-status');if(s){s.value='ohnebild';renderList();}" };});
      var warnNoPrice=noPrice.slice(0,1).map(function(){return{icon:'<i class="bi bi-currency-euro"></i>',text:noPrice.length+' Produkte ohne Preis',click:"goTabFn('list-panel','all');var q=document.getElementById('list-q');if(q){q.value='';renderList();}" };});
      var warnSets=incompleteSets.slice(0,1).map(function(){return{icon:'<i class="bi bi-box-seam"></i>',text:incompleteSets.length+' unvollständige Sets',click:"goTabFn('sets-panel');renderSetsPanel();" };});
      var taskActs=ownOpenTasks.slice(0,3).map(function(t){return{icon:'<i class="bi bi-list-task"></i>',text:t.title||"Offene Task",click:"openTasksMaster()"};});
      var actions=taskActs.concat(warnNoImg,warnNoPrice,warnSets);
      if(!actions.length)actions=[{icon:'<i class="bi bi-check2-circle"></i>',text:"Keine offenen Prioritäten",click:"goTabFn('home-panel')"}];
      var thisMonthStart=new Date();thisMonthStart.setDate(1);thisMonthStart.setHours(0,0,0,0);
      var monthSales=sales.filter(function(v){var d=saleDate(v);return d&&d>=thisMonthStart;});
      var monthRevenue=monthSales.reduce(function(s,v){return s+(parseFloat(v.verkaufspreis||0)||0);},0);
      var monthProfit=monthSales.reduce(function(s,v){return s+(parseFloat(v.marge||v.profitNet||0)||0);},0);
      var byEmp={};monthSales.forEach(function(v){var n=String(v.mitarbeiter||"Unbekannt");byEmp[n]=(byEmp[n]||0)+1;});
      var topEmp=Object.keys(byEmp).sort(function(a,b){return byEmp[b]-byEmp[a];})[0]||"–";
      var teamTaskStats=Object.keys(tasks.reduce(function(m,t){var n=String(t.assignee||t.owner||"Unbekannt");if(!m[n])m[n]=0;if(t.status==="closed")m[n]++;return m;},{})).map(function(n){return{name:n,done:tasks.filter(function(t){return String(t.assignee||t.owner||"Unbekannt")===n&&t.status==="closed";}).length};}).sort(function(a,b){return b.done-a.done;}).slice(0,6);
      var longStale=items.filter(function(i){var d=entryDate(i);if(!d)return false;return (Date.now()-d.getTime())>45*86400000;}).length;
      var recs=[
        {text:noPrice.length+' Produkte ohne Preis',click:"goTabFn('list-panel','all');"},
        {text:_pdBuildPossibleSets(items)+' mögliche Sets erkannt',click:"openSetBuilderFlow()"},
        {text:longStale+' Produkte schwer verkäuflich',click:"goTabFn('list-panel','all');"}
      ];
      var grouped={today:[],yesterday:[]};
      (r.data||[]).forEach(function(e){
        var d=_pdParseDate(e.datum||"");
        var icon=e.typ==="verkauf"?"<i class='bi bi-cash-coin'></i>":e.typ==="lager"?"<i class='bi bi-box-seam'></i>":e.typ==="auth"?"<i class='bi bi-person-check'></i>":"<i class='bi bi-activity'></i>";
        var row={icon:icon,title:e.aktion||"Aktivität",details:e.details||"",time:e.datum||""};
        if(_pdIsSameDay(d,today))grouped.today.push(row);else if(_pdIsSameDay(d,yesterday))grouped.yesterday.push(row);
      });
      if(!grouped.today.length&&r.data&&r.data.length)grouped.today=(r.data.slice(0,3)||[]).map(function(e){return{icon:"<i class='bi bi-activity'></i>",title:e.aktion||"Aktivität",details:e.details||"",time:e.datum||""};});
      if(dash){
        window._profileDashRoot=dash;
        window._profileDashboardCtx={name:name,openTasks:ownOpenTasks.length,readyToSell:readyToSell,actions:actions,kpis:kpis,recommendations:recs,activityGrouped:grouped,showAll:!!window._profileShowAllLog,role:normalizeRole(empRolle),teamTaskStats:teamTaskStats,owner:{monthRevenue:monthRevenue,monthProfit:monthProfit,topEmployee:topEmp}};
        _pdRenderDashboard(dash,window._profileDashboardCtx);
      }
    }catch(err){}
  }, function() {});
  enrichProfilWithAccountInfo(name);
  document.getElementById("profil-overlay").classList.add("open");
}

function ensureBestandsmasterBtn(){
  var ov=document.getElementById("profil-overlay");
  if(!ov||document.getElementById("btn-bestandsmasterpro"))return;
  var container=ov.querySelector("div[style*='padding:20px 13px']")||ov;
  var row=document.createElement("div");
  row.style.cssText="display:none";
  var btn=document.createElement("button");
  btn.id="btn-bestandsmasterpro";
  btn.className="btn btn-outline-primary";
  btn.style.flex="1";
  btn.innerHTML='Zum BestandsmasterPro';
  btn.onclick=function(){openBestandsmasterPro();};
  var btn2=document.createElement("button");
  btn2.id="btn-kisetmasterpro";
  btn2.className="btn btn-outline-primary";
  btn2.style.flex="1";
  btn2.innerHTML='KIsetMasterPro';
  btn2.onclick=function(){openSetBuilderFlow();};
  var btn3=document.createElement("button");
  btn3.id="btn-tasksmasterpro";
  btn3.className="btn btn-outline-primary";
  btn3.style.flex="1";
  btn3.innerHTML='TasksMasterPro';
  btn3.onclick=function(){openTasksMaster();};
  row.appendChild(btn);row.appendChild(btn2);row.appendChild(btn3);
  container.insertBefore(row,container.children[1]||null);
}

function ensureBestandsmasterOverlay(){
  if(document.getElementById("bestandsmaster-overlay"))return;
  var ov=document.createElement("div");
  ov.id="bestandsmaster-overlay";
  ov.style.cssText="display:none;position:fixed;inset:0;background:radial-gradient(circle at 20% 0,#101a2a 0,#070b11 52%,#05070b 100%);z-index:10020;overflow:auto;padding:14px";
  ov.innerHTML='<div style="max-width:980px;margin:0 auto"><div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><button class="btn btn-outline-secondary btn-sm" onclick="closeBestandsmasterPro()">← Zurück zum STKMPro</button><div style="margin-left:auto;font-family:Bebas Neue,sans-serif;letter-spacing:2px;font-size:22px;color:var(--acc)">BESTANDSMASTER PRO</div></div><div style="background:linear-gradient(180deg,#0f1724,#0b111b);border:1px solid rgba(88,166,255,.22);border-radius:12px;padding:12px;margin-bottom:10px"><div style="font-size:12px;color:var(--w3)">Angemeldet als</div><div id="bm-user" style="font-size:18px;font-weight:800;color:var(--acc)"></div></div><div id="bm-body"></div></div>';
  document.body.appendChild(ov);
}
function bmStorageKey(){ return "bmp_checks_"+String(emp||"Unbekannt").toLowerCase(); }
function bmLoad(){ try{return JSON.parse(localStorage.getItem(bmStorageKey())||"[]");}catch(e){return[];} }
function bmSave(arr){ try{localStorage.setItem(bmStorageKey(),JSON.stringify(arr||[]));}catch(e){} }
function openBestandsmasterPro(){ ensureBestandsmasterOverlay(); document.getElementById("bm-user").textContent=emp||"Unbekannt"; document.getElementById("bestandsmaster-overlay").style.display="block"; renderBestandsmasterPro(); }
function closeBestandsmasterPro(){ var ov=document.getElementById("bestandsmaster-overlay"); if(ov)ov.style.display="none"; }
function renderBestandsmasterPro(){
  var body=document.getElementById("bm-body"); if(!body) return;
  var list=bmLoad();
  var done=list.filter(function(c){return c.status==="abgeschlossen";}).length;
  var open=list.length-done;
  body.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="bmNewCheck()">Neue Bestandsprüfung</button><button class="btn btn-outline-secondary btn-sm" onclick="renderBestandsmasterPro()">Aktualisieren</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><div class="chip"><b>Checks:</b> '+list.length+'</div><div class="chip"><b>Offen:</b> '+open+'</div><div class="chip"><b>Abgeschlossen:</b> '+done+'</div></div>'+(list.length?list.map(function(it,idx){var total=(it.items||[]).length;var checked=(it.items||[]).filter(function(x){return x.checked;}).length;var pct=total?Math.round((checked/total)*100):0;return '<div style="background:linear-gradient(180deg,#0f1724,#0b111b);border:1px solid var(--e1);border-radius:10px;padding:10px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+esc(it.name||"Prüfung")+'</b><span class="chip">'+esc(it.status||"offen")+'</span></div><div style="font-size:11px;color:var(--w4);margin-top:2px">'+esc(it.time||"")+'</div><div style="margin-top:6px;height:8px;background:#1a2432;border-radius:999px;overflow:hidden"><div style="height:8px;width:'+pct+'%;background:#2381ff"></div></div><div style="font-size:11px;color:var(--w3);margin-top:4px">'+checked+' / '+total+' Produkte geprüft</div><div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-outline-primary btn-sm" onclick="bmOpenCheck('+idx+')">Öffnen</button><button class="btn btn-outline-danger btn-sm" onclick="bmDelete('+idx+')">Löschen</button></div></div>';}).join(""):'<div class="empty"><i class="bi bi-clipboard2-check"></i><p>Keine Prüfungen vorhanden</p></div>');
}
function bmNewCheck(){
  var list=bmLoad();
  var note=prompt("Name / Notiz zur Prüfung (optional):","")||"";
  var items=(allItems||[]).filter(function(i){return i.type!=="defekt"&&i.type!=="setbundle";}).map(function(i){var cat=i.type==="spiel"?"spiele":i.type==="konsole"?"konsolen":i.type==="controller"?"controller":i.type==="handy"?"handys":"pcs";return{id:"itm-"+(i.type||"x")+"-"+(i.rowIndex||i.scanId||Math.random()),type:i.type,cat:cat,name:i.name||i.spiel||i.modell||i.scanId||"Unbekannt",scanId:i.scanId||"",checked:false,photo:"",note:""};});
  list.unshift({id:"bm-"+Date.now(),name:note||("Prüfung #"+(list.length+1)),time:new Date().toLocaleString("de-DE"),status:"offen",currentCat:"spiele",items:items,by:emp});
  bmSave(list); renderBestandsmasterPro(); addNotification("📋 Bestandskontrolle","Prüfung gespeichert von "+emp+".","info","bestand-pruefmodus");
}
function bmDelete(idx){ var list=bmLoad(); list.splice(idx,1); bmSave(list); renderBestandsmasterPro(); }
function bmOpenCheck(idx){
  var list=bmLoad();var check=list[idx];if(!check)return;
  var body=document.getElementById("bm-body");if(!body)return;
  var cats=["spiele","konsolen","controller","handys","pcs"];
  var current=check.currentCat||cats[0];
  var rows=(check.items||[]).map(function(it,i){return {it:it,i:i};}).filter(function(x){return x.it.cat===current;}).map(function(x){var it=x.it,i=x.i;return '<div style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid var(--e1);border-radius:8px;margin-bottom:6px"><div style="flex:1"><div style="font-size:12px;color:var(--w1);font-weight:700">'+esc(it.name)+'</div><div style="font-size:10px;color:var(--w4)">'+esc(it.scanId||"Kein Barcode")+' · '+esc(it.type||"")+(it.newZustand?' · Neu: '+esc(it.newZustand):'')+'</div></div><button class="btn btn-outline-secondary btn-sm" onclick="bmAddPhoto('+idx+','+i+')">'+(it.photo?"Foto ersetzen":"Foto")+'</button><button class="btn btn-sm '+(it.checked?'btn-success':'btn-outline-primary')+'" onclick="bmToggleItem('+idx+','+i+')">'+(it.checked?'Erledigt':'Abhaken')+'</button></div>';}).join("");
  body.innerHTML='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><button class="btn btn-outline-secondary btn-sm" onclick="renderBestandsmasterPro()">← Zur Übersicht</button><div class="chip">'+esc(check.name)+'</div><div class="chip">Status: '+esc(check.status||"offen")+'</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+cats.map(function(c){return '<button class="btn btn-sm '+(c===current?'btn-primary':'btn-outline-primary')+'" onclick="bmSetCategory('+idx+',\''+c+'\')">'+c.toUpperCase()+'</button>';}).join("")+'</div><div style="margin-bottom:8px"><button class="btn btn-primary btn-sm" onclick="bmFinalizeCheck('+idx+')">Check abschließen</button></div><div>'+(rows||'<div class="empty"><i class="bi bi-inbox"></i><p>Keine Produkte in Kategorie.</p></div>')+'</div>';
}
function bmSetCategory(cIdx,cat){var list=bmLoad();if(!list[cIdx])return;list[cIdx].currentCat=cat;bmSave(list);bmOpenCheck(cIdx);}
function bmAddPhoto(cIdx,iIdx){
  var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.capture="environment";
  inp.onchange=function(){
    if(!this.files||!this.files[0])return;
    var fr=new FileReader();
    fr.onload=function(){
      var list=bmLoad();if(!list[cIdx]||!list[cIdx].items[iIdx])return;
      list[cIdx].items[iIdx].photo=String(fr.result||"");
      bmSave(list);bmOpenCheck(cIdx);
    };
    fr.readAsDataURL(this.files[0]);
  };
  inp.click();
}
function bmToggleItem(cIdx,iIdx){
  var list=bmLoad();if(!list[cIdx]||!list[cIdx].items[iIdx])return;
  var it=list[cIdx].items[iIdx];
  if(!it.photo){toast("Vor dem Abhaken ist ein Foto erforderlich.","err");return;}
  if(!it.checked){
    var ok=confirm("Ist Zustand wie beim Einlagern?");
    if(!ok){
      var z=prompt("Neuen Zustand eingeben (z.B. Defekt, Gut, Sehr gut):","Defekt")||"Defekt";
      it.newZustand=z;
      if(String(z).toLowerCase().indexOf("defekt")>-1){
        createTaskFromBestandIssue(it,"Bestandsprüfung meldet Defekt");
      }
    }
  }
  it.checked=!it.checked;bmSave(list);bmOpenCheck(cIdx);
}
function bmFinalizeCheck(cIdx){
  var list=bmLoad();if(!list[cIdx])return;
  var check=list[cIdx],items=check.items||[];
  if(items.some(function(i){return !i.checked;})){toast("Bitte alle Produkte abhaken.","err");return;}
  check.status="abgeschlossen";check.completedAt=new Date().toLocaleString("de-DE");
  bmSave(list);renderBestandsmasterPro();toast("Bestandsprüfung abgeschlossen ✅","ok");
}
function tasksKey(){return "smp_tasks_v1";}
function loadTasks(){try{tasksCache=JSON.parse(localStorage.getItem(tasksKey())||"[]");}catch(e){tasksCache=[];}if(!Array.isArray(tasksCache))tasksCache=[];tasksCache=tasksCache.map(function(t){if(!t.id)t.id="tsk-"+Date.now()+"-"+Math.floor(Math.random()*9999);if(!Array.isArray(t.subtasks))t.subtasks=[];if(!Array.isArray(t.steps))t.steps=[];if(!t.listId)t.listId="default";if(!t.status)t.status="open";if(typeof t.order!=="number")t.order=0;return t;});}
function saveTasks(){try{localStorage.setItem(tasksKey(),JSON.stringify(tasksCache));}catch(e){}}
function canManageTasks(){var r=normalizeRole(empRolle);return r==="co-chef"||r==="inhaber";}
function tasksListsKey(){return "smp_tasks_lists_v1";}
function loadTaskLists(){var lists=[];try{lists=JSON.parse(localStorage.getItem(tasksListsKey())||"[]");}catch(e){lists=[];}if(!Array.isArray(lists)||!lists.length)lists=[{id:"default",name:"Meine Aufgaben"}];return lists;}
function saveTaskLists(lists){try{localStorage.setItem(tasksListsKey(),JSON.stringify(lists));}catch(e){}}
function createTaskFromBestandIssue(item,title){
  loadTasks();
  tasksCache.unshift({id:"tsk-"+Date.now()+"-"+Math.floor(Math.random()*9999),title:title||"Bestandsproblem",description:"Automatisch aus BestandsmasterPro",status:"open",created:new Date().toLocaleString("de-DE"),owner:emp,assignee:emp,source:"BestandsmasterPro",itemName:item.name||item.scanId||"Unbekannt",itemType:item.type||"",step:1,steps:["Erledigt gemeldet","Prüfung Co-Chef/Inhaber"],deadline:"",repeat:"none",repeatCustomDays:"",subtasks:[],order:Date.now(),listId:"default"});
  saveTasks();
  addNotification("🛠️ Task erstellt","Problem bei Bestandsprüfung: "+(item.name||item.scanId||"Unbekannt"),"alert","task-open");
}
function ensureTasksOverlay(){
  if(document.getElementById("tasksmaster-overlay"))return;
  var ov=document.createElement("div");
  ov.id="tasksmaster-overlay";
  ov.style.cssText="display:none;position:fixed;inset:0;z-index:10055;background:radial-gradient(circle at 20% 0,#101a2a 0,#070b11 52%,#05070b 100%);padding:12px;overflow:auto";
  ov.innerHTML='<div style="max-width:1180px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-family:Bebas Neue,sans-serif;letter-spacing:2px;font-size:28px;color:var(--acc)">TASKSMASTERPRO</div><button class="btn btn-outline-secondary btn-sm" onclick="closeTasksMaster()">Schließen</button></div><div id="tasks-body"></div></div>';
  document.body.appendChild(ov);
}
function openTasksMaster(){if(restrictedActivationMode){toast("Erst Klausel bestätigen.","err");goTabFn("klausel-panel");return;}ensureTasksOverlay();loadTasks();document.getElementById("tasksmaster-overlay").style.display="block";renderTasksMaster();}
function closeTasksMaster(){var ov=document.getElementById("tasksmaster-overlay");if(ov)ov.style.display="none";}
function renderTasksMaster(){
  var body=document.getElementById("tasks-body");if(!body)return;
  loadTasks();
  var lists=loadTaskLists();
  var currentList=tasksCurrentListId||"default";
  var visible=tasksCache.filter(function(t){var allowed=canManageTasks()||String(t.assignee||"").toLowerCase()===String(emp||"").toLowerCase()||String(t.owner||"").toLowerCase()===String(emp||"").toLowerCase();return allowed&&String(t.listId||"default")===currentList;});
  gasGet("getAccounts",{},function(r){
    var acc=(r&&r.ok)?(r.data||[]):[];
    var opts=acc.filter(function(a){return String(a.status||"").toLowerCase()==="aktiv";}).map(function(a){return '<option value="'+esc(a.name)+'">'+esc(a.name)+'</option>';}).join("");
    var listOpts=lists.map(function(l){var active=String(l.id)===String(currentList);return '<button class="btn '+(active?'btn-primary':'btn-outline-secondary')+' btn-sm" style="justify-content:flex-start;text-align:left;margin-bottom:8px" onclick="tasksCurrentListId=\''+esc(l.id)+'\';expandedTaskId=\'\';renderTasksMaster()">'+esc(l.name)+'</button>';}).join("");
    var open=visible.filter(function(t){return t.status!=="closed";}).sort(function(a,b){return (a.order||0)-(b.order||0);});
    var done=visible.filter(function(t){return t.status==="closed";});
    body.innerHTML='<div style="display:grid;grid-template-columns:250px 1fr;gap:16px;min-height:76vh"><aside style="padding:8px 0;border-right:1px solid var(--e1)"><div style="font-size:11px;color:var(--w4);margin:0 0 8px 8px">LISTEN</div>'+listOpts+'<button class="btn btn-outline-secondary btn-sm" onclick="createTaskList()">+ Neue Liste</button></aside><section style="padding:0 4px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:20px;color:var(--w1);font-weight:700">'+esc((lists.find(function(x){return String(x.id)===String(currentList);})||{name:"Meine Aufgaben"}).name)+'</div><div style="display:flex;gap:8px"><select id="task-assignee-in" class="fc" style="max-width:200px">'+opts+'</select><button class="btn btn-outline-secondary btn-sm" onclick="sortTasksByDate()">Nach Datum</button></div></div><div style="border-bottom:1px solid var(--e1);padding:8px 0 12px"><input id="task-title-in" class="fc" placeholder="+ Aufgabe hinzufügen" onkeydown="if(event.key===\'Enter\'){addTask();}" style="background:#0b131d"/><div id="task-compose-extra" style="display:none;margin-top:8px;gap:8px;grid-template-columns:1fr 180px 170px"><input id="task-desc-in" class="fc" placeholder="Beschreibung"/><input id="task-deadline-in" class="fc" type="datetime-local"/><select id="task-repeat-in" class="fc" onchange="toggleTaskRepeatCustom()"><option value="none">Keine Wiederholung</option><option value="daily">Täglich</option><option value="weekly">Wöchentlich</option><option value="monthly">Monatlich</option><option value="custom">Benutzerdefiniert</option></select><input id="task-repeat-custom-in" class="fc" placeholder="Benutzerdefiniert" style="display:none"/><input id="task-subtasks-in" class="fc" placeholder="Subtasks mit ; trennen"/></div><div style="margin-top:8px"><button class="btn btn-outline-secondary btn-sm" onclick="toggleTaskComposer()">Erweiterte Optionen</button></div></div><div id="tasks-open-zone" style="margin-top:8px">'+renderOpenTasksHtml(open)+'</div><details style="margin-top:16px;border-top:1px solid var(--e1);padding-top:8px"><summary style="cursor:pointer;color:var(--w3)">Erledigte Aufgaben ('+done.length+')</summary><div id="tasks-done-grid" style="margin-top:8px">'+renderDoneTasksHtml(done)+'</div></details></section></div>';
    var sel=document.getElementById("task-assignee-in");if(sel&&!sel.value&&emp)sel.value=emp;
    initTaskDnd();
  },function(){body.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>Accounts konnten nicht geladen werden.</p></div>';});
}
function renderOpenTasksHtml(open){
  if(!open.length)return '<div style="padding:16px 8px;color:var(--w4)">Keine offenen Aufgaben</div>';
  return open.map(function(t){
    var canApprove=canManageTasks()&&t.status==="done_waiting";
    var expanded=expandedTaskId===t.id;
    var subs=(t.subtasks||[]).map(function(s,i){return '<label style="display:flex;gap:6px;font-size:11px;color:var(--w3);margin:4px 0"><input type="checkbox" '+(s.done?'checked':'')+' onchange="toggleSubtask(\''+esc(t.id)+'\','+i+')"/> '+esc(s.text)+'</label>';}).join("");
    var subWrap=subs?('<details '+((expandedTaskSubtasks[t.id])?'open':'')+' ontoggle="expandedTaskSubtasks[\''+esc(t.id)+'\']=this.open"><summary style="font-size:11px;color:var(--w4);cursor:pointer">Subtasks</summary><div style="margin-top:4px">'+subs+'</div></details>'):'';
    var expandedPart=expanded?('<div style="padding:8px 0 8px 30px"><input class="fc" style="margin-bottom:8px" value="'+esc(t.description||"")+'" placeholder="Beschreibung" onblur="updateTaskField(\''+esc(t.id)+'\',\'description\',this.value)"/><div style="display:grid;grid-template-columns:200px 170px 1fr;gap:8px;margin-bottom:8px"><input class="fc" type="datetime-local" value="'+esc(t.deadline||"")+'" onblur="updateTaskField(\''+esc(t.id)+'\',\'deadline\',this.value)"/><select class="fc" onchange="updateTaskField(\''+esc(t.id)+'\',\'repeat\',this.value)"><option value="none" '+(t.repeat==="none"?"selected":"")+'>Keine</option><option value="daily" '+(t.repeat==="daily"?"selected":"")+'>Täglich</option><option value="weekly" '+(t.repeat==="weekly"?"selected":"")+'>Wöchentlich</option><option value="monthly" '+(t.repeat==="monthly"?"selected":"")+'>Monatlich</option><option value="custom" '+(t.repeat==="custom"?"selected":"")+'>Custom</option></select><input class="fc" value="'+esc(t.repeatCustomDays||"")+'" placeholder="Custom" onblur="updateTaskField(\''+esc(t.id)+'\',\'repeatCustomDays\',this.value)"/></div>'+subWrap+'<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-outline-danger btn-sm" onclick="deleteTask(\''+esc(t.id)+'\')">Löschen</button>'+(canApprove?'<button class="btn btn-success btn-sm" onclick="taskApprove(\''+esc(t.id)+'\')">Freigeben</button>':'')+'</div></div>'):'';
    return '<div class="task-card '+(t._animDone?'task-done-anim':'')+'" draggable="true" data-task-id="'+esc(t.id)+'" style="border-bottom:1px solid var(--e1);padding:8px 0;transition:all .2s ease"><div style="display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:8px;cursor:pointer" onclick="toggleTaskExpand(\''+esc(t.id)+'\')"><input type="checkbox" '+(t.status!=="open"?'checked':'')+' onclick="event.stopPropagation();taskStepDone(\''+esc(t.id)+'\')"/><div contenteditable="true" onblur="updateTaskField(\''+esc(t.id)+'\',\'title\',this.textContent)" onclick="event.stopPropagation()" style="font-size:14px;color:var(--w1);outline:none">'+esc(t.title)+'</div><div style="font-size:11px;color:var(--w4)">'+esc(t.deadline||"")+'</div></div>'+expandedPart+'</div>';
  }).join("");
}
function renderDoneTasksHtml(done){
  if(!done.length)return '<div style="padding:8px;color:var(--w4)">Keine erledigten Aufgaben</div>';
  return done.map(function(t){return '<div style="border-bottom:1px dashed var(--e1);padding:8px 0;display:grid;grid-template-columns:1fr auto;gap:8px"><div style="font-size:13px;color:#94a3b8;text-decoration:line-through">'+esc(t.title)+'</div><div style="font-size:10px;color:var(--w4)">'+esc(t.approvedAt||t.created||"")+'</div></div>';}).join("");
}
function toggleTaskRepeatCustom(){var s=document.getElementById("task-repeat-in"),c=document.getElementById("task-repeat-custom-in");if(c)c.style.display=(s&&s.value==="custom")?"block":"none";}
function toggleTaskComposer(){var el=document.getElementById("task-compose-extra");if(el)el.style.display=(el.style.display==="none"||!el.style.display)?"grid":"none";}
function toggleTaskExpand(taskId){expandedTaskId=(expandedTaskId===taskId?"":taskId);renderTasksMaster();}
function updateTaskField(taskId,key,val){loadTasks();var t=tasksCache.find(function(x){return x.id===taskId;});if(!t)return;t[key]=String(val||"").trim();saveTasks();}
function addTask(){
  var title=gv("task-title-in").trim(),assignee=gv("task-assignee-in").trim()||emp,desc=gv("task-desc-in").trim(),deadline=gv("task-deadline-in"),rep=gv("task-repeat-in")||"none",rc=gv("task-repeat-custom-in").trim(),listId=tasksCurrentListId||"default";
  if(!title)return;
  var subt=(gv("task-subtasks-in")||"").split(";").map(function(s){return s.trim();}).filter(Boolean).map(function(s){return{text:s,done:false};});
  loadTasks();
  tasksCache.unshift({id:"tsk-"+Date.now()+"-"+Math.floor(Math.random()*9999),title:title,description:desc,status:"open",created:new Date().toLocaleString("de-DE"),owner:emp,assignee:assignee,source:"TasksMasterPro",step:1,steps:["Erledigt gemeldet","Prüfung Co-Chef/Inhaber"],deadline:deadline,repeat:rep,repeatCustomDays:rc,subtasks:subt,order:Date.now(),listId:listId});
  saveTasks();
  ["task-title-in","task-desc-in","task-deadline-in","task-repeat-custom-in","task-subtasks-in"].forEach(function(id){var el=document.getElementById(id);if(el)el.value="";});
  var repEl=document.getElementById("task-repeat-in");if(repEl)repEl.value="none";
  expandedTaskId="";
  renderTasksMaster();
}
function taskStepDone(id){
  loadTasks();var t=tasksCache.find(function(x){return x.id===id;});if(!t)return;
  if(t.status==="open"){t._animDone=true;saveTasks();renderTasksMaster();setTimeout(function(){loadTasks();var tt=tasksCache.find(function(x){return x.id===id;});if(!tt)return;tt.status="done_waiting";tt._animDone=false;saveTasks();renderTasksMaster();},180);}
  else{t.status="open";t._animDone=false;saveTasks();renderTasksMaster();}
  addNotification("✅ Task erledigt gemeldet",t.title,"info","task-open");
}
function taskApprove(id){
  loadTasks();var t=tasksCache.find(function(x){return x.id===id;});if(!t)return;
  t.status="closed";t.approvedBy=emp;t.approvedAt=new Date().toLocaleString("de-DE");
  saveTasks();renderTasksMaster();
}
function toggleSubtask(taskId,idx){loadTasks();var t=tasksCache.find(function(x){return x.id===taskId;});if(!t||!t.subtasks||!t.subtasks[idx])return;t.subtasks[idx].done=!t.subtasks[idx].done;saveTasks();}
function editTask(taskId){loadTasks();var t=tasksCache.find(function(x){return x.id===taskId;});if(!t)return;var nt=prompt("Titel:",t.title||"");if(nt===null)return;var nd=prompt("Details:",t.description||"");t.title=nt;t.description=nd;saveTasks();renderTasksMaster();}
function deleteTask(taskId){if(!confirm("Task löschen?"))return;loadTasks();tasksCache=tasksCache.filter(function(x){return x.id!==taskId;});saveTasks();renderTasksMaster();}
function sortTasksByDate(){loadTasks();tasksCache.sort(function(a,b){return String(a.deadline||"9999").localeCompare(String(b.deadline||"9999"));});tasksCache.forEach(function(t,i){t.order=i+1;});saveTasks();renderTasksMaster();}
function createTaskList(){var lists=loadTaskLists();var n=prompt("Name der Liste:","Neue Liste");if(!n)return;var id="lst-"+Date.now();lists.push({id:id,name:n});saveTaskLists(lists);renderTasksMaster();}
function initTaskDnd(){var zone=document.getElementById("tasks-open-zone");if(!zone)return;var dragId="";zone.querySelectorAll(".task-card").forEach(function(card){card.addEventListener("dragstart",function(){dragId=this.dataset.taskId;});card.addEventListener("dragover",function(e){e.preventDefault();});card.addEventListener("drop",function(e){e.preventDefault();var targetId=this.dataset.taskId;if(!dragId||dragId===targetId)return;loadTasks();var a=tasksCache.find(function(t){return t.id===dragId;}),b=tasksCache.find(function(t){return t.id===targetId;});if(!a||!b)return;var ao=a.order,bo=b.order;a.order=bo;b.order=ao;tasksCache.sort(function(x,y){return (x.order||0)-(y.order||0);});saveTasks();renderTasksMaster();});});}

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
  ensureInviteRoleOptions();
  loadServerAccounts();
  document.getElementById("acc-modal").classList.add("open");
  // Show/hide invite tab based on role
  var inviteTab = document.getElementById("acctab-invite");
  if(inviteTab) inviteTab.style.display = canManageEmployees() ? "block" : "none";
}
function ensureInviteRoleOptions(){
  var sel=document.getElementById("acc-rolle-in");if(!sel)return;
  var wanted=[{v:"mitarbeiter",t:"Mitarbeiter"},{v:"senior",t:"Senior"},{v:"co-chef",t:"Co-Chef"},{v:"inhaber",t:"Inhaber"}];
  sel.innerHTML=wanted.map(function(o){return '<option value="'+o.v+'">'+o.t+'</option>';}).join("");
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
  var pwEl=document.getElementById("acc-pw-in");
  var pw=pwEl?String(pwEl.value||""):"";
  var rolle=document.getElementById("acc-rolle-in").value;
  var diag=document.getElementById("acc-diag");
  if(!name){diag.className="diag derr";diag.textContent="Name erforderlich.";diag.style.display="block";return;}
  if(pw.length>0&&pw.length<6){diag.className="diag derr";diag.textContent="Passwort mind. 6 Zeichen oder leer lassen für reine E-Mail-Einladung.";diag.style.display="block";return;}
  if(!pw&&!email){diag.className="diag derr";diag.textContent="Passwort (mind. 6 Zeichen) oder E-Mail für Einladung angeben.";diag.style.display="block";return;}
  if(!canManageEmployees()){diag.className="diag derr";diag.textContent="Keine Berechtigung zum Verwalten von Mitarbeitern.";diag.style.display="block";return;}
  var btn=document.querySelector("#acc-modal .btn-primary");setBL(btn,true);
  gasGet("createAccount",{name:name,email:email,password:pw,rolle:rolle,actorRole:normalizeRole(empRolle),actorName:emp},function(r){
    setBL(btn,false);
    if(r&&r.ok){
      var warn = r.warn ? (" ⚠️ "+(r.warnMsg||"Einladung konnte nicht automatisch gesendet werden.")) : "";
      diag.className = r.warn ? "diag dinf" : "diag dok";
      diag.textContent = "✅ " + (r.msg||"Gespeichert.") + warn + (r.inviteLink?("  Link: "+r.inviteLink):"");
      diag.style.display="block";
      document.getElementById("acc-name-in").value="";
      document.getElementById("acc-email-in").value="";
      if(pwEl)pwEl.value="";
      loadServerAccounts();
    } else {
      diag.className="diag derr";diag.textContent="❌ "+(r?r.fehler:"Fehler");diag.style.display="block";
    }
  },function(e){setBL(btn,false);toast("Fehler: "+e,"err");});
}

function deleteServerAccount(email){
  if(!confirm("Account von "+email+" wirklich löschen?")) return;
  gasGet("deleteAccount",{email:email,actorRole:normalizeRole(empRolle),actorName:emp},function(r){
    if(r&&r.ok){toast(r.msg,"ok");loadServerAccounts();}
    else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}

function triggerPDFExport(){
  ensureReportRangeUI();
  var btn=event.target;var orig=btn.innerHTML;setBL(btn,true);
  var period=(document.getElementById("report-period")||{value:"thismonth"}).value;
  var month=(document.getElementById("report-month")||{value:""}).value;
  var from=(document.getElementById("report-from")||{value:""}).value;
  var to=(document.getElementById("report-to")||{value:""}).value;
  gasGet("downloadMonthlyReports",{period:period,month:month,from:from,to:to},function(r){
    setBL(btn,false,orig);
    if(r&&r.ok&&Array.isArray(r.files)&&r.files.length){
      r.files.forEach(function(f){
        try{
          var link=document.createElement("a");
          link.href="data:"+(f.mimeType||"application/pdf")+";base64,"+f.base64;
          link.download=f.name||("Bericht_"+Date.now()+".pdf");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }catch(_e){}
      });
      toast("Berichte heruntergeladen.","ok",4200);
    } else toast("Fehler: "+(r?r.fehler:"?"),"err");
  },function(e){setBL(btn,false,orig);toast("Fehler: "+e,"err");});
}

function ensureReportRangeUI(){
  var panel=document.getElementById("accpanel-reports");
  if(!panel||document.getElementById("report-range-box"))return;
  var box=document.createElement("div");
  box.id="report-range-box";
  box.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px";
  box.innerHTML='<select id="report-period" class="fc" style="width:auto;min-width:170px"><option value="thismonth">Dieser Monat</option><option value="lastmonth">Letzter Monat</option><option value="month">Bestimmter Monat</option><option value="custom">Eigener Zeitraum</option></select><input id="report-month" type="month" class="fc" style="display:none;width:auto" /><input id="report-from" type="date" class="fc" style="display:none;width:auto" /><input id="report-to" type="date" class="fc" style="display:none;width:auto" />';
  panel.insertBefore(box,panel.firstChild);
  var sel=document.getElementById("report-period"),m=document.getElementById("report-month"),f=document.getElementById("report-from"),t=document.getElementById("report-to");
  var up=function(){var v=sel.value;m.style.display=v==="month"?"inline-flex":"none";f.style.display=v==="custom"?"inline-flex":"none";t.style.display=v==="custom"?"inline-flex":"none";};
  sel.onchange=up;up();
}

// ================================================================
// PHASE 2: ACTIVATION FLOW
// ================================================================
function showActivationFlow(token){
  clearSession();
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
        clearSession();
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
        applyEmp(loginName,normalizeRole(r.rolle||"mitarbeiter"));
        if(r.activationRequired){
          clearSession();
          setRestrictedActivationMode(true,{name:loginName,password:pw,klauselUrl:r.klauselUrl||"",rolle:normalizeRole(r.rolle||"mitarbeiter")});
          openNativeKlauselTab(r.klauselUrl||"");
          toast("Klausel-Bestätigung erforderlich.","inf");
          return;
        }
        setRestrictedActivationMode(false);
        toast("Hey "+loginName+" 🚀","ok");
        loadStats();
        checkUnconfirmedNotifs();
      } else {
        if(r&&r.accountNotActive){
          document.getElementById("pw-err").style.display="none";
          window._psuPendingLoginName=r.name||input;
          window._psuPendingLoginRolle=normalizeRole(r.rolle||"mitarbeiter");
          showProfileSetupOverlay({name:r.name||input,klauselUrl:r.klauselUrl||"",currentPassword:pw});
          showLoginErr("⚠️ Account noch nicht aktiv.");
          return;
        }
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

// Kleinanzeigen-Zelle: roher Text, "ja", oder JSON aus updateKleinanzeigen
function isItemKleinanzeigenUploaded(item){
  if(!item||item.type==="defekt")return false;
  var k=item.kleinanzeigen;
  if(k&&typeof k==="object"&&k.status!==undefined)k=k.status;
  var s=String(k||"").trim();
  var low=s.toLowerCase();
  if(low.indexOf("hochgeladen")>=0||low==="ja")return true;
  if(s.charAt(0)==="{"){try{var o=JSON.parse(s);var st=String((o&&o.status)||"").toLowerCase();return st.indexOf("hochgeladen")>=0||st==="ja";}catch(e){}}
  return false;
}
// ── FEATURE: KLEINANZEIGEN FORTSCHRITT (Fix 9) ────────────────────
function buildKAProgress(){
  var bar=document.getElementById("kl-bar"),pct=document.getElementById("kl-pct");
  var done=document.getElementById("kl-done"),todo=document.getElementById("kl-todo");
  if(!bar||!allItems.length)return;
  var relevant=allItems.filter(function(i){return i.type!=="defekt";});
  var hochgeladen=relevant.filter(isItemKleinanzeigenUploaded).length;
  var total=relevant.length;
  var p=total>0?Math.round((hochgeladen/total)*100):0;
  bar.style.width=p+"%";
  if(pct)pct.textContent=p+"% hochgeladen";
  if(done)done.textContent=hochgeladen+" hochgeladen";
  if(todo)todo.textContent=(total-hochgeladen)+" ausstehend";
}

// ── FEATURE: SEARCH SCANNER (Fix 6) ───────────────────────────────
var searchScanStream=null,searchScanRunning=false,searchScanFrame=null;
var searchScanOnDetected=null;

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
  searchScanOnDetected=null;
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
    if(typeof searchScanOnDetected==="function"){
      try{searchScanOnDetected(detected);}catch(e){}
    } else {
      document.getElementById("s-bc-in").value=detected;
      doSearch();
    }
    toast("✓ Barcode: "+detected,"ok",2500);
    try{if(navigator.vibrate)navigator.vibrate([80]);}catch(e){}
    return;
  }
  if(searchScanRunning)searchScanFrame=requestAnimationFrame(searchScanLoopStart);
}

// ── FEATURE: SMARTE BENACHRICHTIGUNGEN (Fix 5) ────────────────────
function runSmartNotifications(){
  if(!Array.isArray(allItems)||allItems.length===0)return;
  if(!Array.isArray(notifications))notifications=[];
  var now=new Date();
  var nichtHochgeladen=allItems.filter(function(i){return i.type!=="defekt"&&!isItemKleinanzeigenUploaded(i);}).length;
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

function _normDateValue(dateStr){
  if(!dateStr) return 0;
  var raw = String(dateStr).split(" ")[0];
  var parts = raw.split(".");
  if(parts.length < 3) return 0;
  var d = new Date(parseInt(parts[2],10), parseInt(parts[1],10)-1, parseInt(parts[0],10));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function _getNextZimmerId(){
  var used = {};
  (allEinkauf||[]).forEach(function(e){
    var z = String((e&&e.zimmer)||"").trim();
    if(!z) return;
    var m = z.match(/(\d+)/);
    if(m) used[parseInt(m[1],10)] = true;
  });
  var next = 1;
  while(used[next]) next++;
  return "Zimmer " + String(next).padStart(3,"0");
}

function _deriveEinkaufPhase(){
  var sende = gv("ek-sende").trim();
  var abholung = gv("ek-abholung")==="JA";
  if(sende) return {status:"Transit", lieferstatus:"Unterwegs", phase:"Transit"};
  if(abholung) return {status:"Gezahlt", lieferstatus:"Abholung geplant", phase:"Gezahlt"};
  return {status:"Entwurf", lieferstatus:"Ausstehend", phase:"Entwurf"};
}

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
  sv2("ek-zimmer", item ? item.zimmer : _getNextZimmerId());
  sv2("ek-status", item ? (item.status||"Entwurf") : "Entwurf");
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
  // Keep focus while rerendering
  var active = document.activeElement;
  var focusIdx = -1, caretPos = null;
  if(active && active.tagName==="INPUT" && active.closest && active.closest("#ek-produkte-list")){
    focusIdx = parseInt(active.getAttribute("data-idx")||"-1",10);
    try { caretPos = active.selectionStart; } catch(e){}
  }
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
        // IMPORTANT: keep focus in current input (no jump)
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
  // Restore focus to the input the user was typing in
  if(focusIdx >= 0){
    setTimeout(function(){
      var el2 = document.querySelector('#ek-produkte-list input[data-idx="'+focusIdx+'"]');
      if(el2){
        el2.focus();
        if(caretPos!==null){
          try { el2.setSelectionRange(caretPos, caretPos); } catch(e){}
        }
      }
    }, 0);
  }
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
  var btn=document.querySelector("#ek-storno-section .btn-danger");
  if(btn)setBL(btn,true);
  var data = { rowIndex: editEinkaufItem.rowIndex, grund: grund, notiz: notiz, mitarbeiter: gv("ek-ma")||emp };
  gasPost("stornoEinkauf", data, function(r){
    if(btn)setBL(btn,false);
    if(r&&r.ok){ toast("Einkauf storniert","ok"); closeEKModal(); loadHandel(); }
    else { showEKDiag(r?r.fehler:"Fehler"); }
  }, function(e){ if(btn)setBL(btn,false);showEKDiag("Verbindungsfehler: "+e); });
}

function saveEKForm() {
  var d = document.getElementById("ek-diag"); if(d) d.style.display = "none";
  var produkte = _getEKProductsString();
  if(!produkte) { showEKDiag("Bitte Produkte eingeben."); return; }
  var roomVal = gv("ek-zimmer").trim() || _getNextZimmerId();
  sv2("ek-zimmer", roomVal);
  var productsList = produkte.split(",").map(function(p){return p.trim();}).filter(Boolean);
  var phaseData = _deriveEinkaufPhase();
  var nowStamp = new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  var data = {
    produkte: produkte,
    kunde: gv("ek-kunde"),
    preis: gv("ek-preis"),
    plattform: gv("ek-plattform"),
    zimmer: roomVal,
    sendenummer: gv("ek-sende"),
    versanddienstleister: gv("ek-vdl"),
    abholung: gv("ek-abholung"),
    status: phaseData.status,
    lieferstatus: phaseData.lieferstatus,
    phase: phaseData.phase,
    phaseChangedAt: nowStamp,
    expectedCount: productsList.length,
    receivedCount: editEinkaufItem ? parseInt(editEinkaufItem.receivedCount||0,10)||0 : 0,
    expectedItems: productsList,
    platformOrderId: gv("ek-sende")||"",
    mitarbeiter: gv("ek-ma") || emp,
    hinweise: gv("ek-hinweise"),
    warentyp: "Gebrauchtware"
  };
  var btn = document.getElementById("ek-save-btn"); setBL(btn, true);
  if(editEinkaufItem) {
    data.rowIndex = editEinkaufItem.rowIndex;
    data.status = editEinkaufItem.status || phaseData.status;
    data.phase = data.status;
    gasPost("updateEinkauf", data, function(r){
      setBL(btn, false);
      if(r&&r.ok){ toast("Einkauf aktualisiert ✅","ok"); closeEKModal(); loadHandel(); }
      else { showEKDiag(r ? r.fehler : "Fehler beim Speichern"); }
    }, function(e){ setBL(btn,false); showEKDiag("Verbindungsfehler: "+e); });
  } else {
    gasPost("saveEinkauf", data, function(r){
      setBL(btn, false);
      if(r&&r.ok){
        toast("📋 Einkauf gespeichert. Zimmer automatisch vergeben, Check-In bei Ankunft starten.","ok",4500);
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
  var zust = (item.zustand||"").toLowerCase();
  var grade = zust.indexOf("defekt")>-1 ? "C" : (zust.indexOf("neu")>-1 ? "A" : "B");
  vkScannedItems.push({
    name:nm,
    scanId:item.scanId||"",
    ekPreis:parseFloat(item.einkaufspreis||0),
    vkPreis:0,
    rowIndex:item.rowIndex,
    type:item.type,
    lagerDatum:item.datum||"",
    conditionGrade:grade
  });
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
  vkTotalSteps = 5;
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
  // Hard reset step visibility to avoid stale hidden content
  for(var i=1;i<=8;i++){
    var sEl=document.getElementById("vks-"+i);
    if(sEl)sEl.style.display=(i===1?"block":"none");
  }
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
      +'<div style="font-size:10px;color:var(--w4);font-family:monospace">'+esc((a.email&&String(a.email).indexOf("@noemail.stockmaster")>=0)?"(ohne E-Mail)":(a.email||""))+'</div>'
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
    if(canManageEmployees()){
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
var _ekCheckPendingCache=[];

function ensureEKCheckRoomSearchUI(){
  try{
    var step1 = document.getElementById("ek-check-step1");
    if(!step1) return;
    if(document.getElementById("ek-check-room-search")) return;
    var inp = document.createElement("input");
    inp.id = "ek-check-room-search";
    inp.className = "fc";
    inp.placeholder = "Zimmer suchen (z.B. 001)…";
    inp.style.cssText = "margin-bottom:10px;font-family:'Space Mono',monospace;font-size:12px";
    inp.oninput = function(){ renderEKCheckPendingList(); };
    var list = document.getElementById("ek-check-einkauf-list");
    if(list && list.parentNode === step1){
      step1.insertBefore(inp, list);
    } else {
      step1.appendChild(inp);
    }
  }catch(e){}
}

function renderEKCheckPendingList(){
  var listEl=document.getElementById("ek-check-einkauf-list");
  if(!listEl) return;
  var q = (document.getElementById("ek-check-room-search")||{value:""}).value.trim().toLowerCase();
  var pending = (_ekCheckPendingCache||[]).slice();
  if(q){
    pending = pending.filter(function(ek){
      var z = String(ek.zimmer||"").toLowerCase();
      var k = String(ek.kunde||"").toLowerCase();
      var p = String(ek.produkte||"").toLowerCase();
      return z.includes(q) || k.includes(q) || p.includes(q);
    });
  }
  if(!pending.length){
    listEl.innerHTML='<div class="empty"><i class="bi bi-search"></i><p>NICHTS GEFUNDEN</p></div>';
    return;
  }
  listEl.innerHTML="";
  pending.forEach(function(ek){
    var products=(ek.produkte||"").split(",").map(function(p){return p.trim();}).filter(Boolean);
    var card=document.createElement("div");
    card.className="ic";
    card.style.cssText="cursor:pointer;margin-bottom:8px;border-left:3px solid var(--col-b)";
    var sc={Entwurf:"#666",Gezahlt:"var(--col-b)",Transit:"var(--col-b)",Vorgemerkt:"#666",Bestellt:"var(--col-y)",Bezahlt:"var(--col-b)",Versendet:"var(--col-b)",Unterwegs:"var(--col-b)",Angekommen:"var(--acc)",Bestand:"var(--acc)"}[ek.status]||"#666";
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
}

function openEKCheck(){
  ensureScanFlowNodes();
  ekCheckStep=1;ekCheckItem=null;ekCheckList=[];ekCheckCurrentIdx=-1;
  window._afterSaveCallback=null;
  var mc=document.getElementById("mode-chooser");
  var ep=document.getElementById("ek-check-panel");
  if(mc)mc.style.display="none";
  if(ep)ep.style.display="block";
  ensureEKCheckRoomSearchUI();
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

function _einkaufNeedsInboundCheck(e){
  var st=String(e.status||"").trim();
  if(st==="Storniert"||st==="Bestand"||st==="Abgeschlossen")return false;
  if(st==="Entwurf")return false;
  return true;
}

function _loadEKCheckList(){
  var listEl=document.getElementById("ek-check-einkauf-list");
  if(!listEl)return;
  listEl.innerHTML='<div style="text-align:center;padding:24px"><span class="spin-b"></span><div style="font-size:10px;color:var(--w4);margin-top:8px;font-family:monospace">LADE...</div></div>';
  gasGet("getAllEinkauf",{},function(r){
    if(!r||!r.ok){listEl.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>VERBINDUNGSFEHLER</p></div>';return;}
    var pending=(r.data||[]).filter(_einkaufNeedsInboundCheck);
    if(!pending.length){listEl.innerHTML='<div class="empty"><i class="bi bi-check-circle"></i><p>ALLE ABGESCHLOSSEN ✅</p></div>';return;}
    _ekCheckPendingCache = pending;
    renderEKCheckPendingList();
  },function(){listEl.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>VERBINDUNGSFEHLER</p></div>';});
}

function _selectEKCheckItem(ek){
  ekCheckItem=ek;
  ekCheckStep=2;
  var products=(ek.produkte||"").split(",").map(function(p){return p.trim();}).filter(Boolean);
  if(!ekCheckList.length||!ekCheckList[0]||ekCheckList[0]._eid!==ek.rowIndex){
    ekCheckList=products.map(function(name){return{name:name,eingelagert:false,scanId:"",expectedQty:1,receivedQty:0,_eid:ek.rowIndex};});
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
  var completeBtn=document.getElementById("ek-check-complete-btn");
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
  if(cb)cb.style.display=(ekCheckList.length>0)?"block":"none";
  if(completeBtn)completeBtn.disabled=!(done===ekCheckList.length&&ekCheckList.length>0);
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
    ekCheckList[ekCheckCurrentIdx].receivedQty=1;
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
  if(!allDone){toast("Check-In gesperrt: Bitte alle Artikel scannen (Soll = Ist).","err",3500);return;}
  var btn=document.getElementById("ek-check-complete-btn");
  if(btn)setBL(btn,true);
  gasPost("updateEinkauf",{
      rowIndex:ekCheckItem.rowIndex,status:"Bestand",lieferstatus:"Zugestellt",
      phase:"Bestand",phaseChangedAt:new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),
      expectedCount:ekCheckList.length,receivedCount:ekCheckList.length,
      diffCount:0,checkBy:emp||"",checkCompletedAt:new Date().toISOString()
    },
    function(r){
      if(btn)setBL(btn,false);
      if(r&&r.ok){toast("🎉 Check-In abgeschlossen. Ware in Bestand übernommen!","ok",4200);closeEKCheck();loadHandel();}
      else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
    },function(){if(btn)setBL(btn,false);toast("Verbindungsfehler","err");});
}


// ================================================================
// REKLAMATION STEPPER
// ================================================================
var rtStep = 1, rtTotalSteps = 3;
var rtPhotos = [];

function extractRTVorgang(hin){
  var sep="── Vorgang / Käufer ──";
  var h=hin||"";
  var i=h.indexOf(sep);
  if(i<0)return{hin:h,vorg:""};
  return{hin:h.slice(0,i).trim(),vorg:h.slice(i+sep.length).trim()};
}
function buildRTHinweise(){
  var h=gv("rt-hinweise");
  var v=document.getElementById("rt-vorgang")?gv("rt-vorgang"):"";
  if(v&&String(v).trim())return(h?h+"\n\n":"")+"── Vorgang / Käufer ──\n"+String(v).trim();
  return h;
}
window._rtRemoveFoto=function(ix){if(typeof ix!=="number"||ix<0)return;rtPhotos.splice(ix,1);_renderRTFotoPreviews();};

function ensureRTModalExtras(){
  var s1=document.getElementById("rts-1");
  if(!s1||document.getElementById("rt-vk-pick"))return;
  var box=document.createElement("div");
  box.id="rt-extras-wrap";
  box.innerHTML='<div class="mb-3"><label class="fl">VERKAUF VERKNÜPFEN (optional)</label><select id="rt-vk-pick" class="fc"><option value="">– Laden… –</option></select>'+
    '<div style="font-size:10px;color:var(--w4);margin-top:4px">Bei Auswahl werden Produkt, Kunde, Scan-IDs und VK-Zeile automatisch gesetzt.</div></div>'+
    '<div class="mb-2"><label class="fl">VORGANG / KÄUFER-NACHRICHT</label><textarea id="rt-vorgang" class="fc" rows="2" placeholder="Bestellnr., Chat-Verlauf, Fristen…"></textarea></div>'+
    '<div class="mb-2"><label class="fl">FOTOS (z. B. vom Käufer)</label><input type="file" id="rt-foto-in" accept="image/*" multiple class="fc" style="font-size:11px;padding:8px"/>'+
    '<div id="rt-foto-previews" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div></div>';
  var sub=s1.querySelector(".step-sub");
  if(sub)sub.parentNode.insertBefore(box, sub.nextSibling);
  else s1.appendChild(box);
  document.getElementById("rt-foto-in").addEventListener("change",function(ev){
    var files=ev.target.files;if(!files||!files.length)return;
    var left=files.length,tar=ev.target;
    for(var i=0;i<files.length;i++){
      (function(file){
        var fr=new FileReader();
        fr.onload=function(){
          if(fr.result)rtPhotos.push(fr.result);
          left--;
          if(left<=0){_renderRTFotoPreviews();if(tar)tar.value="";}
        };
        fr.readAsDataURL(file);
      })(files[i]);
    }
  });
}
function _renderRTFotoPreviews(){
  var w=document.getElementById("rt-foto-previews");if(!w)return;
  w.innerHTML=(rtPhotos||[]).map(function(b64,ix){
    var safe=String(b64).replace(/"/g,"&quot;");
    return'<div style="position:relative;width:56px;height:56px;border-radius:6px;overflow:hidden;border:1px solid var(--e2)"><img src="'+safe+'" style="width:100%;height:100%;object-fit:cover" alt=""/><button type="button" onclick="_rtRemoveFoto('+ix+')" style="position:absolute;top:0;right:0;background:rgba(0,0,0,.6);color:#fff;border:none;width:18px;height:18px;font-size:10px;cursor:pointer">×</button></div>';
  }).join("");
}
function loadRTVerkaufOptions(done){
  var sel=document.getElementById("rt-vk-pick");if(!sel)return;
  gasGet("getAllVerkauf",{},function(r){
    if(!r||!r.ok)return;
    allVerkauf=r.data||[];
    sel.innerHTML='<option value="">– Verkauf wählen (optional) –</option>'+
      allVerkauf.map(function(v){
        return'<option value="'+v.rowIndex+'">'+(v.datum||"–")+" · "+esc((v.produkte||"").substring(0,36))+" · "+esc(v.kunde||"")+"</option>";
      }).join("");
    sel.onchange=function(){
      var rv=allVerkauf.find(function(x){return String(x.rowIndex)===String(sel.value);});
      if(rv)fillRTFromVerkauf(rv);
    };
    if(typeof done==="function")done();
  });
}
function fillRTFromVerkauf(v){
  sv2("rt-produkt", v.produkte||"");
  sv2("rt-kunde", v.kunde||"");
  sv2("rt-scanid", (v.scanIds||v.scanId||"").toString().replace(/\s*,\s*/g,", "));
  sv2("rt-verkauf-zeile", String(v.rowIndex||""));
  var vg=document.getElementById("rt-vorgang");
  if(vg&&!vg.value.trim())vg.value="Verknüpfter Verkauf: Zeile "+v.rowIndex+" · Plattform: "+(v.plattform||"–")+" · VK: "+(v.verkaufspreis||"–")+"€";
}

function openRTModal(item, prefillVerkauf) {
  ensureRTModalExtras();
  window.editRTItem = item || null;
  rtStep = 1;
  rtPhotos=[];
  if(item&&item.fotos&&item.fotos.length)rtPhotos=item.fotos.slice();
  _renderRTFotoPreviews();
  var fi=document.getElementById("rt-foto-in");if(fi)fi.value="";
  sv2("rt-produkt", item ? item.produkt : (prefillVerkauf ? prefillVerkauf.produkte||"" : ""));
  sv2("rt-kunde",   item ? item.kunde   : (prefillVerkauf ? prefillVerkauf.kunde||""   : ""));
  sv2("rt-scanid",  item ? (item.scanId||item.scanIds||"") : "");
  sv2("rt-grund",   item ? item.grund   : "");
  sv2("rt-status",  item ? item.status  : "Offen");
  sv2("rt-erstattung", item ? (item.erstattung||"") : "");
  var vg=document.getElementById("rt-vorgang");
  if(item){
    var ex=extractRTVorgang(item.hinweise||"");
    sv2("rt-hinweise",ex.hin);
    if(vg)vg.value=ex.vorg;
  }else{
    sv2("rt-hinweise","");
    if(vg)vg.value="";
  }
  sv2("rt-ma",         item ? (item.mitarbeiter||emp) : emp);
  sv2("rt-verkauf-zeile", item ? (item.verkaufZeile||"") : (prefillVerkauf ? prefillVerkauf.rowIndex||"" : ""));
  if(prefillVerkauf&&!item)fillRTFromVerkauf(prefillVerkauf);
  loadRTVerkaufOptions(function(){
    var vk=document.getElementById("rt-vk-pick");if(vk&&item&&item.verkaufZeile)vk.value=String(item.verkaufZeile);
  });
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
  var vg=document.getElementById("rt-vorgang");
  var vf=vg&&gv("rt-vorgang").trim();
  el.innerHTML=
    "PRODUKT: "+(gv("rt-produkt")||"–")+"<br>"+
    "KUNDE: "+(gv("rt-kunde")||"–")+"<br>"+
    "GRUND: "+(gv("rt-grund")||"–")+"<br>"+
    "STATUS: "+(gv("rt-status")||"–")+"<br>"+
    (vf?"VORGANG: "+esc(vf)+" · ":"")+
    (rtPhotos&&rtPhotos.length?"FOTOS: "+rtPhotos.length+"<br>":"")+
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
  var el=document.getElementById("rt-scanid");
  searchScanOnDetected=function(code){
    if(el){el.value=code;el.focus();}
  };
  openSearchScanner();
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
    hinweise:    buildRTHinweise(),
    mitarbeiter: gv("rt-ma")||emp,
    verkaufZeile:gv("rt-verkauf-zeile")||"",
    fotos:       rtPhotos||[]
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

var setBuilderAnswers={},setBuilderDraft=null,setBuilderStep=1,setBuilderLoading=false;
var setsCache=[],tasksCache=[],setChats=[],setDraftImages=[];
var tasksCurrentListId="default";
function setChatsKey(){return "smp_set_chats_v1";}
function loadSetChats(){try{setChats=JSON.parse(localStorage.getItem(setChatsKey())||"[]");}catch(e){setChats=[];}if(!Array.isArray(setChats))setChats=[];}
function saveSetChats(){try{localStorage.setItem(setChatsKey(),JSON.stringify(setChats.slice(0,100)));}catch(e){}}
function ensureHomeSetBuilderTab(){
  var home=document.getElementById("home-panel");
  if(!home||document.getElementById("home-subtabs"))return;
  var wrap=home.querySelector(".wrap")||home;
  var subt=document.createElement("div");
  subt.id="home-subtabs";
  subt.style.cssText="display:flex;gap:8px;margin:4px 0 12px";
  subt.innerHTML='<button id="home-tab-dashboard" class="ltab on" onclick="setHomeSubtab(\'dashboard\')">Dashboard</button>';
  var sb=document.createElement("div");
  sb.id="home-setbuilder";
  sb.style.display="none";
  sb.innerHTML='';
  var tm=document.createElement("div");
  tm.id="home-tasksmaster";
  tm.style.display="none";
  tm.innerHTML='';
  wrap.insertBefore(subt,wrap.firstChild);
  wrap.insertBefore(sb,subt.nextSibling);
  wrap.insertBefore(tm,sb.nextSibling);
}
function setHomeSubtab(tab){
  var d=document.getElementById("home-tab-dashboard"),box=document.getElementById("home-setbuilder"),tb=document.getElementById("home-tasksmaster");
  if(d)d.className="ltab"+(tab==="dashboard"?" on":"");
  if(box)box.style.display="none";
  if(tb)tb.style.display="none";
}
function ensureSetBuilderOverlay(){
  if(document.getElementById("setbuilder-overlay"))return;
  var ov=document.createElement("div");
  ov.id="setbuilder-overlay";
  ov.style.cssText="display:none;position:fixed;inset:0;z-index:10050;background:radial-gradient(circle at 20% 0,#101a2a 0,#070b11 52%,#05070b 100%);padding:16px;overflow:auto";
  ov.innerHTML='<div style="max-width:920px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-family:Bebas Neue,sans-serif;letter-spacing:2px;font-size:28px;color:var(--acc)">KISETMASTERPRO</div><button class="btn btn-outline-secondary btn-sm" onclick="closeSetBuilderFlow()">Schließen</button></div><div id="sb-flow-body" style="background:linear-gradient(180deg,#0f1724,#0b111b);border:1px solid rgba(88,166,255,.22);border-radius:14px;padding:14px"></div></div>';
  document.body.appendChild(ov);
}
function openSetBuilderFlow(){
  ensureSetBuilderOverlay();
  setBuilderStep=0;setBuilderAnswers={};setBuilderDraft=null;setBuilderLoading=false;
  var nav=document.querySelector(".bnav");if(nav)nav.style.display="none";
  document.getElementById("setbuilder-overlay").style.display="block";
  renderSetBuilderFlow();
}
function closeSetBuilderFlow(){
  var ov=document.getElementById("setbuilder-overlay");if(ov)ov.style.display="none";
  var nav=document.querySelector(".bnav");if(nav)nav.style.display="";
}
function renderSetBuilderFlow(){
  var body=document.getElementById("sb-flow-body");if(!body)return;
  loadSetChats();
  if(setBuilderStep===0){
    body.innerHTML='<div style="font-size:20px;font-weight:800;color:#3fb950;margin-bottom:6px">So funktioniert KIsetMasterPro</div><div style="font-size:12px;color:var(--w3);line-height:1.7">Reiner Chat-Modus für Set-Anfragen + Set/Chat-Verwaltung.</div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary" onclick="setBuilderStep=1;renderSetBuilderFlow()">Chat starten</button><button class="btn btn-outline-primary" onclick="setBuilderStep=99;renderSetBuilderFlow()">Sets verwalten</button></div>';
    return;
  }
  if(setBuilderStep===99){renderSetManager(body);return;}
  if(setBuilderLoading){
    body.innerHTML='<div style="display:flex;gap:10px;align-items:center"><span class="spin-b"></span><div><div style="font-size:16px;color:var(--w1);font-weight:700">Set wird erstellt</div><div style="font-size:12px;color:var(--w3)">Passende Produkte werden kombiniert…</div></div></div>';
    return;
  }
  var chatHtml=setChats.slice(0,20).map(function(c,ix){return '<div style="background:#0f1724;border:1px solid var(--e1);border-radius:8px;padding:8px;margin-bottom:6px"><div style="font-size:11px;color:var(--w2)">'+esc(c.q||"")+'</div><div style="font-size:10px;color:var(--w4);margin-top:2px">'+esc(c.time||"")+'</div><div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-outline-primary btn-sm" onclick="reloadSetChat('+ix+')">Laden</button><button class="btn btn-outline-secondary btn-sm" onclick="editSetChat('+ix+')">Bearbeiten</button><button class="btn btn-outline-danger btn-sm" onclick="deleteSetChat('+ix+')">Löschen</button></div></div>';}).join("");
  body.innerHTML='<div style="font-size:14px;color:#3fb950;font-weight:700;margin-bottom:8px">Set-Chat</div><div style="display:flex;gap:8px"><input id="sb-chat-in" class="fc" placeholder="z.B. PS4 + 3 Spiele + Controller"/><button class="btn btn-outline-primary" onclick="sbHandleChat()">Senden</button><button class="btn btn-outline-secondary" onclick="setBuilderStep=99;renderSetBuilderFlow()">Sets</button></div><div id="sb-chat-out" style="font-size:11px;color:var(--w3);margin-top:8px"></div><hr style="border-color:var(--e1);margin:10px 0"/><div style="font-size:12px;color:var(--w4);margin-bottom:6px">Vorherige Chats</div><div style="max-height:320px;overflow:auto">'+(chatHtml||'<div class="empty"><p>Keine Chats</p></div>')+'</div>';
}
function sbParseRequest(text){
  var q=String(text||"").toLowerCase().trim();
  if(!q)return null;
  if(!/(set|bundle|\+|spiele|spiel|controller|ps4|ps5|xbox|nintendo|switch|pc)/.test(q))return null;
  return {plattform:_sbNormalizePlatform(q)||"PlayStation",games:((q.match(/(\d+)\s*spiel/)||[])[1]|0)||3};
}
function sbHandleChat(){
  var q=gv("sb-chat-in"),out=document.getElementById("sb-chat-out");
  var req=sbParseRequest(q);
  if(!req){if(out)out.textContent="Ich reagiere nur auf Set-Anfragen.";return;}
  setBuilderLoading=true;renderSetBuilderFlow();
  setBuilderAnswers={ziel:"Schneller Verkauf",plattform:req.plattform,budget:"0",zustand:"Gebraucht",gamesReq:req.games};
  buildSetWithAI(function(draft){
    setBuilderLoading=false;
    if(out&&draft){
      out.innerHTML='Set erstellt: '+esc(draft.name)+' · '+draft.items.length+' Produkte · Preisvorschlag: '+esc(draft.priceFast)+' / '+esc(draft.priceMax);
      setChats.unshift({q:q,time:new Date().toLocaleString("de-DE"),draft:draft});
      saveSetChats();
      autoSaveSetBuilderDraft();
    }
  });
}
function reloadSetChat(ix){loadSetChats();var c=setChats[ix];if(!c)return;var inp=document.getElementById("sb-chat-in");if(inp)inp.value=c.q||"";if(c.draft){setBuilderDraft=c.draft;var out=document.getElementById("sb-chat-out");if(out)out.innerHTML='Set geladen: '+esc(setBuilderDraft.name)+' · '+esc(setBuilderDraft.priceFast)+' / '+esc(setBuilderDraft.priceMax);}}
function editSetChat(ix){loadSetChats();var c=setChats[ix];if(!c)return;var n=prompt("Chat bearbeiten:",c.q||"");if(!n)return;c.q=n;setChats[ix]=c;saveSetChats();renderSetBuilderFlow();}
function deleteSetChat(ix){loadSetChats();setChats.splice(ix,1);saveSetChats();renderSetBuilderFlow();}
function confirmSetBundle(){
  if(!setBuilderDraft||!setBuilderDraft.items||!setBuilderDraft.items.length){toast("Kein Set erstellt.","err");return;}
  var setName=gv("sb-set-name").trim()||setBuilderDraft.name;
  gasPost("saveSetBundle",{name:setName,mitarbeiter:emp,plattform:setBuilderDraft.plattform,budget:setBuilderDraft.budget,zustand:setBuilderDraft.zustand,items:setBuilderDraft.items,notizen:"Bestätigt via KIsetMasterPro"},function(r){
    if(r&&r.ok){toast("Set gespeichert ✅","ok");setBuilderDraft=null;loadAll();setBuilderStep=99;renderSetBuilderFlow();}
    else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}
function autoSaveSetBuilderDraft(){
  if(!setBuilderDraft||setBuilderDraft._autoSaved)return;
  var autoName=(setBuilderDraft.name||"")+" #AUTO";
  gasPost("saveSetBundle",{name:autoName,mitarbeiter:emp,plattform:setBuilderDraft.plattform,budget:setBuilderDraft.budget,zustand:setBuilderDraft.zustand,items:setBuilderDraft.items,notizen:"Auto-gespeichert via KIsetMasterPro"},function(r){
    if(r&&r.ok){setBuilderDraft._autoSaved=true;loadAll();renderSetsPanel();}
  },function(){});
}
function sbAddSetImage(){var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=function(){if(!this.files||!this.files[0])return;var fr=new FileReader();fr.onload=function(){if(setDraftImages.length<10)setDraftImages.push(String(fr.result||""));sbRenderSetImages();};fr.readAsDataURL(this.files[0]);};inp.click();}
function sbRenderSetImages(){var el=document.getElementById("sb-set-images");if(!el)return;el.innerHTML=(setDraftImages||[]).map(function(b,i){return'<div class="card-foto" style="width:44px;height:44px"><img src="'+esc(b)+'"/><button class="rm-thumb" onclick="setDraftImages.splice('+i+',1);sbRenderSetImages()">✕</button></div>';}).join("")+'<div class="add-thumb" style="width:44px;height:44px" onclick="sbAddSetImage()"><i class="bi bi-plus"></i></div>';}
function sbAnalyzeSet(){
  if(!setBuilderDraft)return;
  var vals={konsole:70,controller:30,spiel:10,handy:80,pc:150};
  var sum=0;(setBuilderDraft.items||[]).forEach(function(i){sum+=(vals[i.typ]||15);});
  var imgScore=Math.min(20,(setDraftImages||[]).length*4);
  var attr=Math.max(1,Math.min(10,Math.round((sum/25)+(imgScore/10))));
  var fast=(sum*0.95).toFixed(0),max=(sum*1.12).toFixed(0);
  var out=document.getElementById("sb-set-analysis");if(!out)return;
  out.innerHTML='Set sinnvoll und marktgängig.<br>Geschätzter Verkaufspreis:<br>ca. '+fast+'–'+(parseInt(fast,10)+20)+'€ VB (schneller Verkauf)<br>ca. '+max+'–'+(parseInt(max,10)+20)+'€ VB (maximaler Gewinn)<br>Attraktivität: '+attr+'/10<br>Empfehlung: Gute Bilder + Bundle als sofort spielbereit hervorheben.';
}
function _sbNormalizePlatform(s){var t=String(s||"").toLowerCase();if(t.indexOf("playstation")>-1||/\bps\d/.test(t))return"PlayStation";if(t.indexOf("xbox")>-1)return"Xbox";if(t.indexOf("nintendo")>-1||t.indexOf("switch")>-1)return"Nintendo";if(t.indexOf("pc")>-1)return"PC";return"";}
function _sbDetectPlatform(item){
  var text=[item.name,item.spiel,item.modell,item.system,item.hinweise].join(" ").toLowerCase();
  return _sbNormalizePlatform(text);
}
function _sbSoldMap(){
  var map={};(allVerkauf||[]).forEach(function(v){String(v.scanIds||"").split(",").forEach(function(id){id=String(id||"").trim();if(id)map[id]=(map[id]||0)+1;});});
  return map;
}
function buildSetWithAI(onDone){
  var p=setBuilderAnswers.plattform||"PlayStation",budget=parseFloat(setBuilderAnswers.budget||0),ziel=setBuilderAnswers.ziel||"Lager bereinigen",cond=setBuilderAnswers.zustand||"Gebraucht",gamesNeed=parseInt(setBuilderAnswers.gamesReq||3,10)||3;
  if(!allVerkauf||!allVerkauf.length){gasGet("getAllVerkauf",{},function(r){if(r&&r.ok){allVerkauf=r.data||[];buildSetWithAI(onDone);}else if(typeof onDone==="function"){onDone(null);}},function(){if(typeof onDone==="function"){onDone(null);}});return;}
  var sold=_sbSoldMap();
  var stock=(allItems||[]).filter(function(i){return i.type!=="defekt"&&i.type!=="setbundle";});
  var cons=stock.filter(function(i){return i.type==="konsole"&&_sbDetectPlatform(i)===p;}).sort(function(a,b){return (parseFloat(a.einkaufspreis||0)||0)-(parseFloat(b.einkaufspreis||0)||0);});
  var ctrl=stock.filter(function(i){return i.type==="controller"&&_sbDetectPlatform(i)===p;}).sort(function(a,b){return (sold[a.scanId||""]||0)-(sold[b.scanId||""]||0);});
  var games=stock.filter(function(i){return i.type==="spiel"&&_sbDetectPlatform(i)===p;}).sort(function(a,b){
    var sa=sold[a.scanId||""]||0,sb=sold[b.scanId||""]||0;
    var ea=parseFloat(a.einkaufspreis||0)||0,eb=parseFloat(b.einkaufspreis||0)||0;
    if(ziel==="Maximaler Gewinn")return eb-ea;
    if(ziel==="Schneller Verkauf")return sa-sb;
    return sa===sb?ea-eb:sa-sb;
  });
  var picks=[],push=function(arr,n){for(var i=0;i<arr.length&&n>0;i++){if(picks.indexOf(arr[i])===-1){picks.push(arr[i]);n--;}}};
  push(cons,1);push(games,gamesNeed);push(ctrl,1);
  var total=picks.reduce(function(s,i){return s+(parseFloat(i.einkaufspreis||0)||0);},0);
  if(budget>0&&total>budget){picks=picks.filter(function(i){return i.type!=="spiel";});push(games.slice(gamesNeed),1);total=picks.reduce(function(s,i){return s+(parseFloat(i.einkaufspreis||0)||0);},0);}
  if(!picks.length){setBuilderDraft=null;var bd=document.getElementById("sb-flow-body");if(bd)bd.innerHTML='<div class="empty"><i class="bi bi-inbox"></i><p>Keine passenden Produkte für '+esc(p)+'</p></div><button class="btn btn-outline-secondary" onclick="setBuilderStep=1;renderSetBuilderFlow()">Zurück</button>';if(typeof onDone==="function")onDone(null);return;}
  var priceFast=Math.round((total*1.18)*100)/100,priceMax=Math.round((total*1.28)*100)/100;
  setBuilderDraft={name:p+" "+(ziel==="Maximaler Gewinn"?"Profit":"Smart")+" Set",plattform:p,budget:budget,zustand:cond,items:picks.map(function(i){return {typ:i.type,name:i.name||i.spiel||i.modell||i.scanId,scanId:i.scanId||"",ek:parseFloat(i.einkaufspreis||0)||0};}),total:Math.round(total*100)/100,priceFast:priceFast.toFixed(2)+"€ VB (schneller Verkauf)",priceMax:priceMax.toFixed(2)+"€ VB (max Gewinn)"};
  var body=document.getElementById("sb-flow-body");if(!body)return;
  setDraftImages=[];
  body.innerHTML='<div style="font-size:18px;font-weight:800;color:var(--w1);margin-bottom:8px">Set Vorschlag</div><div class="chips" style="margin-bottom:8px"><span class="chip">Plattform: '+esc(p)+'</span><span class="chip">Ziel: '+esc(ziel)+'</span><span class="chip">EK gesamt: '+setBuilderDraft.total+'€</span></div><div style="font-size:12px;color:var(--w3);line-height:1.7;margin-bottom:10px">'+setBuilderDraft.items.map(function(i){return"• "+esc(i.name)+" ("+i.ek+"€)";}).join("<br>")+'</div><div class="chips" style="margin-bottom:10px"><span class="chip">'+esc(setBuilderDraft.priceMax)+'</span><span class="chip">'+esc(setBuilderDraft.priceFast)+'</span></div><div style="display:flex;gap:8px;margin-bottom:8px"><input id="sb-set-name" class="fc" placeholder="Set-Name" value="'+esc(setBuilderDraft.name)+'"/><button class="btn btn-outline-primary" onclick="sbAnalyzeSet()">KI-Einschätzung</button></div><div id="sb-set-images" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sb-set-analysis" style="font-size:11px;color:var(--w3);margin-bottom:10px"></div><div style="display:flex;gap:8px"><button class="btn btn-outline-secondary" onclick="setBuilderStep=1;renderSetBuilderFlow()">Neu berechnen</button><button class="btn btn-success" onclick="confirmSetBundle()">Set speichern</button><button class="btn btn-outline-primary" onclick="setBuilderStep=99;renderSetBuilderFlow()">Sets verwalten</button></div>';
  sbRenderSetImages();
  if(typeof onDone==="function")onDone(setBuilderDraft);
}
function renderSetManager(body){
  gasGet("getSetBundles",{},function(r){
    setsCache=(r&&r.ok)?(r.data||[]):[];
    body.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:18px;font-weight:800;color:var(--w1)">Gespeicherte Sets</div><button class="btn btn-outline-secondary btn-sm" onclick="setBuilderStep=1;renderSetBuilderFlow()">Neues Set</button></div>'+(setsCache.length?setsCache.map(function(s,ix){var items=s.items||[];var txt=items.map(function(i){return (i.name||"")+" ["+(i.scanId||"-")+"]";}).join(", ");return '<div style="background:var(--b2);border:1px solid var(--e1);border-radius:10px;padding:10px;margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b>'+esc(s.name||s.setId)+'</b><span class="chip">'+esc(s.plattform||"-")+'</span></div><div style="font-size:11px;color:var(--w3);margin:6px 0">'+esc(txt.substring(0,220))+(txt.length>220?"…":"")+'</div><div style="display:flex;gap:6px"><button class="btn btn-outline-primary btn-sm" onclick="exportSetForKA('+ix+')">Für Kleinanzeigen</button><button class="btn btn-outline-secondary btn-sm" onclick="editSetFromManager('+ix+')">Bearbeiten</button><button class="btn btn-outline-danger btn-sm" onclick="deleteSetFromManager('+ix+')">Löschen</button></div></div>';}).join(""):'<div class="empty"><i class="bi bi-inbox"></i><p>Keine Sets vorhanden.</p></div>');
  },function(){body.innerHTML='<div class="empty"><i class="bi bi-wifi-off"></i><p>Sets konnten nicht geladen werden.</p></div>';});
}
function editSetFromManager(ix){
  var s=setsCache[ix];if(!s)return;
  var n=prompt("Set-Name:",s.name||"");if(n===null)return;
  var pl=prompt("Plattform:",s.plattform||"")||s.plattform||"";
  gasPost("updateSetBundle",{rowIndex:s.rowIndex,name:n,plattform:pl,zustand:s.zustand,budget:s.budget,items:s.items,notizen:s.notizen},function(r){
    if(r&&r.ok){toast("Set aktualisiert.","ok");setBuilderStep=99;renderSetBuilderFlow();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}
function deleteSetFromManager(ix){
  var s=setsCache[ix];if(!s)return;
  if(!confirm("Set löschen?"))return;
  gasGet("deleteSetBundle",{rowIndex:s.rowIndex},function(r){
    if(r&&r.ok){toast("Set gelöscht.","ok");setBuilderStep=99;renderSetBuilderFlow();}else{toast("Fehler: "+(r?r.fehler:"?"),"err");}
  },function(e){toast("Fehler: "+e,"err");});
}
function exportSetForKA(ix){
  var s=setsCache[ix];if(!s)return;
  var items=(s.items||[]).map(function(i){return i.name||i.scanId;}).join(", ");
  var txt=(s.name||"Set")+" | "+(s.plattform||"")+" | "+items;
  try{navigator.clipboard.writeText(txt);}catch(e){}
  toast("Set-Text für Kleinanzeigen kopiert.","ok");
  goTabFn("list-panel");
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
  ensureControllerOption();
  setupRefreshButtons();
  // Check for saved session (auto-login)
  var hasActivationToken = (new URLSearchParams(window.location.search)).get("activate");
  var savedSession = hasActivationToken ? null : loadSession();
  if(savedSession && savedSession.name) {
    applyEmp(savedSession.name, normalizeRole(savedSession.rolle||"mitarbeiter"));
    loadStats();
    checkUnconfirmedNotifs();
  } else {
    initEmp();
  }
  initSearch();loadNotifications();loadChinaEntries();
  setupEnterKeys();
  setupKeyboardShortcuts();
  ensureHomeSetBuilderTab();
  ensureSetsPanelUI();
  ensureKlauselPanelUI();
  ensureReportRangeUI();
  ensureTasksOverlay();
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
var _guvBuildTries=0;
function buildGUV(){
  function _el(id){return document.getElementById(id);}
  if(!allItems||!allItems.length){
    if(_guvBuildTries<3){_guvBuildTries++;loadAll(true);setTimeout(function(){buildGUV();},600);}
    return;
  }
  _guvBuildTries=0;
  var filter=(document.getElementById("an-filter-month")||{value:"all"}).value;
  var vkData=(allVerkauf||[]).filter(function(v){
    if(filter==="all")return true;if(!v.datum)return false;
    var now=new Date(),m=now.getMonth()+1,y=now.getFullYear();
    var pts=v.datum.split(".");var vm=parseInt(pts[1]||0),vy=parseInt((pts[2]||"").split(" ")[0]);
    if(filter==="thismonth")return vm===m&&vy===y;
    if(filter==="lastmonth"){var lm=m===1?12:m-1,ly=m===1?y-1:y;return vm===lm&&vy===ly;}
    return true;
  });
  var totalVP=0,totalMarge=0,sumNegMarge=0;
  vkData.forEach(function(v){totalVP+=parseFloat(v.verkaufspreis||0);var m=parseFloat(v.marge||0);totalMarge+=m;if(m<0)sumNegMarge+=m;});
  var sumStockEK=0;
  (allItems||[]).forEach(function(i){
    if(i.type==="defekt"||i.type==="verkauf")return;
    var ek=parseFloat(i.einkaufspreis||0);if(!isNaN(ek)&&ek>0)sumStockEK+=ek;
  });
  var verlustDisplay=Math.abs(sumNegMarge)+sumStockEK;
  if(_el("an-gewinn"))_el("an-gewinn").textContent=fmtEur(totalMarge>0?totalMarge:0);
  if(_el("an-verlust")){
    _el("an-verlust").innerHTML='<span style="font-family:Bebas Neue,sans-serif;font-size:26px;letter-spacing:1px;color:var(--col-r)">'+fmtEur(verlustDisplay)+'</span>'+
      '<div style="font-size:9px;color:var(--w4);margin-top:4px;font-family:Space Mono,monospace">inkl. Bestands-EK '+fmtEur(sumStockEK)+(sumNegMarge<0?' · neg. VK '+fmtEur(Math.abs(sumNegMarge)):"")+'</div>';
  }
  if(_el("an-umsatz"))_el("an-umsatz").textContent=fmtEur(totalVP);
  if(_el("an-marge-avg"))_el("an-marge-avg").textContent=vkData.length>0?(totalMarge/vkData.length).toFixed(2)+"€":"–";
  buildMonthlyChart();
  var tbody=_el("an-vk-table");
  if(tbody){
    if(!vkData.length){tbody.innerHTML='<div class="empty" style="padding:20px"><i class="bi bi-inbox"></i><p>Keine Verkäufe</p></div>';return;}
    tbody.innerHTML='<table class="an-table"><thead><tr><th>Produkt</th><th>VK</th><th>EK</th><th>Marge</th><th>Plattform</th></tr></thead><tbody>'
      +vkData.slice().sort(function(a,b){return parseFloat(b.marge||0)-parseFloat(a.marge||0);}).map(function(v){var m=parseFloat(v.marge||0);return'<tr><td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(v.produkte||"–")+'</td><td>'+fmtEur(v.verkaufspreis)+'</td><td>'+fmtEur(v.einkaufspreis)+'</td><td class="'+(m>=0?"an-pos":"an-neg")+'">'+(m>=0?"+":"")+m.toFixed(2)+'€</td><td>'+esc(v.plattform||"–")+'</td></tr>';}).join("")+'</tbody></table>';
  }
  var vld=_el("an-verlust-detail");
  if(vld){
    var neg=vkData.filter(function(v){return parseFloat(v.marge||0)<0;});
    var noEK=vkData.filter(function(v){return !parseFloat(v.einkaufspreis||0);});
    var h='<div style="font-size:11px;color:var(--w4);margin-bottom:8px">Bestands-EK (eingekaufte Ware im Lager): <strong style="color:var(--col-r)">'+fmtEur(sumStockEK)+'</strong></div>';
    if(neg.length)h+=neg.map(function(v){return'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--b1);font-size:12px"><span>'+esc(v.produkte||"–")+'</span><span class="an-neg">'+parseFloat(v.marge||0).toFixed(2)+'€</span></div>';}).join("");
    if(noEK.length)h+='<div style="font-size:12px;color:var(--amber);margin-top:7px">⚠️ '+noEK.length+' Verkäufe ohne EK</div>';
    vld.innerHTML=h||'<div style="font-size:12px;color:var(--w3)">Keine negativen Verkaufsmargen.</div>';
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
      var fc=(rt.fotos&&rt.fotos.length)?'<span class="chip" style="color:var(--col-b)">📷 '+rt.fotos.length+'</span>':"";
      return'<div class="ic" style="cursor:pointer"><div class="ic-top"><div class="ic-name">'+esc(rt.produkt||"–")+'</div><span style="font-size:11px;font-weight:600;color:'+sC+'">'+esc(rt.status||"–")+'</span></div><div class="chips"><span class="chip"><b>'+esc(rt.kunde||"–")+'</b></span><span class="chip">'+esc(rt.datum||"–")+'</span>'+(rt.erstattung?'<span class="chip" style="color:var(--red)">'+esc(rt.erstattung)+'€</span>':"")+fc+' <span class="chip">'+esc(rt.grund||"–")+'</span></div></div>';
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
  if(!Array.isArray(chinaEntries))chinaEntries=[];
  var tC=0,tZ=0,tF=0;chinaEntries.forEach(function(c){tC+=c.total||0;tZ+=c.zoll||0;tF+=c.fracht||0;});
  function elG(id){return document.getElementById(id);}
  if(elG("cn-total-cost"))elG("cn-total-cost").textContent=tC.toFixed(2)+"€";
  if(elG("cn-total-zoll"))elG("cn-total-zoll").textContent=tZ.toFixed(2)+"€";
  if(elG("cn-total-fracht"))elG("cn-total-fracht").textContent=tF.toFixed(2)+"€";
  var list=elG("an-china-list");if(!list)return;
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

