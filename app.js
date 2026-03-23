<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta http-equiv="Permissions-Policy" content="camera=*"/>
<title>StockMaster Pro</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.4/umd/index.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
<style>
/* ═══════════════════════════════════════════════════════
   STOCKMASTER PRO  ·  v4.0
   Aesthetic: High-Contrast Warehouse Terminal
   Font: Bebas Neue (display) + Manrope (body) + Space Mono (data)
   Palette: Chalk-white on carbon-black with neon accents
   Reference: Bloomberg Terminal × Figma Dark × Raycast
═══════════════════════════════════════════════════════ */
:root{
  /* Core surfaces — true blacks */
  --b0:#000000;
  --b1:#0a0a0a;
  --b2:#111111;
  --b3:#1a1a1a;
  --b4:#222222;
  --b5:#2d2d2d;

  /* Borders */
  --e1:#1e1e1e;
  --e2:#2a2a2a;
  --e3:#383838;

  /* Text */
  --w1:#ffffff;
  --w2:#c8c8c8;
  --w3:#707070;
  --w4:#383838;

  /* Accent — single electric green like terminals */
  --acc:#00ff88;
  --acc-d:rgba(0,255,136,.08);
  --acc-b:rgba(0,255,136,.2);

  /* Status colors — muted but readable */
  --col-g:#00ff88;
  --col-r:#ff3b3b;
  --col-y:#ffcc00;
  --col-b:#4d9fff;
  --col-p:#b57bff;
  --col-t:#00d4d4;

  /* Backward compat */
  --bg:var(--b1);--bg1:var(--b1);--bg2:var(--b2);--bg3:var(--b3);--bg4:var(--b4);
  --border:var(--e1);--border2:var(--e2);--border3:var(--e3);
  --text:var(--w1);--text2:var(--w2);--text3:var(--w3);
  --blue:var(--col-b);--blue-d:rgba(77,159,255,.08);--blue-g:rgba(77,159,255,.08);
  --green:var(--col-g);--mint:var(--col-g);--mint-d:rgba(0,255,136,.08);
  --red:var(--col-r);--rose:var(--col-r);--red-d:rgba(255,59,59,.08);--rose-d:rgba(255,59,59,.08);
  --amber:var(--col-y);--yellow:var(--col-y);--orange:var(--col-y);--amber-d:rgba(255,204,0,.08);
  --purple:var(--col-p);--violet:var(--col-p);--violet-d:rgba(181,123,255,.08);
  --teal:var(--col-t);--sky:var(--col-b);--sky-d:rgba(77,159,255,.08);--sky-b:rgba(77,159,255,.2);
  --ink:var(--b0);--ink1:var(--b1);--ink2:var(--b2);--ink3:var(--b3);
  --line:var(--e1);--line2:var(--e2);--line3:var(--e3);
  --t1:var(--w1);--t2:var(--w2);--t3:var(--w3);
  --c-sw:var(--col-y);--c-h:var(--col-g);--c-pc:var(--col-b);--c-def:var(--col-r);

  --font:'Manrope',system-ui,sans-serif;
  --fh:'Bebas Neue','Manrope',sans-serif;
  --fm:'Space Mono',monospace;
  --mono:'Space Mono',monospace;
  --r:6px;--r-sm:4px;--r-lg:10px;--r-xl:14px;
  --shadow:0 2px 12px rgba(0,0,0,.8);
  --shadow-lg:0 8px 40px rgba(0,0,0,.9);
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-tap-highlight-color:transparent}
body{
  background:var(--b0);color:var(--w1);
  font-family:'Manrope',system-ui,sans-serif;
  font-size:14px;line-height:1.5;
  min-height:100vh;overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
::-webkit-scrollbar{width:2px;height:2px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--e3);border-radius:2px}

/* ── TOPBAR ─────────────────────────────────────── */
.topbar{
  position:sticky;top:0;z-index:60;
  height:50px;padding:0 14px;
  background:rgba(0,0,0,.95);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--e1);
  display:flex;align-items:center;justify-content:space-between;
}
.brand{display:flex;align-items:center;gap:10px}
.brand-icon{
  width:28px;height:28px;border-radius:5px;
  background:var(--acc);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;
  box-shadow:0 0 12px rgba(0,255,136,.3);
}
.brand-name{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:var(--w1);line-height:1}
.brand-version{font-family:'Space Mono',monospace;font-size:9px;color:var(--w4);letter-spacing:1px;margin-top:-1px}
.topbar-right{display:flex;align-items:center;gap:8px}
.emp-chip{
  display:flex;align-items:center;gap:7px;
  background:transparent;border:1px solid var(--e2);
  border-radius:4px;padding:5px 10px 5px 7px;
  cursor:pointer;transition:all .12s;
  font-size:12px;font-weight:600;color:var(--w3);
  font-family:'Manrope',sans-serif;
}
.emp-chip:hover{border-color:var(--e3);color:var(--w1)}
.notif-btn{
  width:30px;height:30px;border-radius:4px;
  background:transparent;border:1px solid var(--e2);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all .12s;color:var(--w4);font-size:15px;position:relative;
}
.notif-btn:hover{border-color:var(--acc);color:var(--acc)}
.notif-badge{
  position:absolute;top:-4px;right:-4px;
  background:var(--col-r);color:#fff;
  border-radius:3px;min-width:15px;height:15px;
  font-size:8px;font-weight:700;font-family:'Space Mono',monospace;
  display:none;align-items:center;justify-content:center;
  border:1.5px solid var(--b0);padding:0 2px;
}

/* ── BOTTOM NAV ─────────────────────────────────── */
.bottom-nav{
  position:fixed;bottom:0;left:0;right:0;
  height:56px;
  background:rgba(0,0,0,.97);
  border-top:1px solid var(--e1);
  display:flex;align-items:stretch;z-index:60;
}
.bnav-btn{
  flex:1;border:none;background:none;
  color:var(--w4);
  font-family:'Manrope',sans-serif;font-size:9px;font-weight:600;
  cursor:pointer;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  transition:color .12s;letter-spacing:.8px;text-transform:uppercase;
}
.bnav-btn i{font-size:17px}
.bnav-btn.on{color:var(--acc)}
.home-btn{position:relative;padding-top:0;justify-content:flex-end;padding-bottom:5px}
.home-orb{
  width:40px;height:40px;border-radius:50%;
  background:var(--acc);
  display:flex;align-items:center;justify-content:center;
  margin-top:-12px;
  box-shadow:0 0 0 3px var(--b0),0 0 20px rgba(0,255,136,.4);
  transition:all .2s;
}
.home-orb i{font-size:18px;color:#000}
.home-btn span{font-size:9px;font-weight:600;color:var(--w4);margin-top:3px;letter-spacing:.8px;text-transform:uppercase}
.home-btn.on span{color:var(--acc)}
.home-btn.on .home-orb{box-shadow:0 0 0 3px var(--b0),0 0 28px rgba(0,255,136,.6)}

/* ── PANELS ─────────────────────────────────────── */
.panel{display:none;padding-bottom:72px}.panel.on{display:block}
.wrap{max-width:560px;margin:0 auto;padding:14px 12px}

/* ── SECTION HEADER ─────────────────────────────── */
.sec-head{
  font-family:'Bebas Neue',sans-serif;
  font-size:11px;letter-spacing:3px;color:var(--w4);
  margin-bottom:10px;display:flex;align-items:center;gap:8px;
  text-transform:uppercase;
}
.sec-head::after{content:"";flex:1;height:1px;background:var(--e1)}

/* ── CARDS ──────────────────────────────────────── */
.card{
  background:var(--b2);border:1px solid var(--e1);
  border-radius:var(--r-lg);overflow:hidden;margin-bottom:9px;
}
.card-head{
  padding:10px 13px;border-bottom:1px solid var(--e1);
  display:flex;align-items:center;justify-content:space-between;
}
.card-head h2{font-size:13px;font-weight:700;color:var(--w1);margin:0;letter-spacing:.3px}
.card-body{padding:13px}

/* ── FORM ───────────────────────────────────────── */
.slabel{
  font-size:9px;font-weight:700;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--w4);
  margin-bottom:8px;display:block;font-family:'Space Mono',monospace;
}
.fl{font-size:11px;font-weight:600;color:var(--w3);display:block;margin-bottom:4px;letter-spacing:.2px}
.fc{
  background:var(--b1);border:1px solid var(--e2);
  color:var(--w1);border-radius:var(--r);
  padding:9px 12px;font-family:'Manrope',sans-serif;font-size:13px;
  width:100%;transition:border-color .12s,box-shadow .12s;
  outline:none;-webkit-appearance:none;
}
.fc:focus{border-color:var(--acc);box-shadow:0 0 0 2px rgba(0,255,136,.1)}
.fc::placeholder{color:var(--w4)}
select.fc option{background:var(--b2)}
textarea.fc{resize:vertical;min-height:66px}

/* ── BUTTONS ────────────────────────────────────── */
.btn{font-family:'Manrope',sans-serif!important;font-size:12px!important;font-weight:700!important;letter-spacing:.3px!important}
.btn-sm{font-size:11px!important;padding:5px 10px!important}
.btn-primary{background:var(--acc)!important;border-color:var(--acc)!important;color:#000!important}
.btn-primary:hover{background:#00e67a!important;border-color:#00e67a!important}
.btn-success{background:var(--acc)!important;border-color:var(--acc)!important;color:#000!important}
.btn-success:hover{background:#00e67a!important}
.btn-danger{background:var(--col-r)!important;border-color:var(--col-r)!important;color:#fff!important}
.btn-outline-secondary{border-color:var(--e2)!important;color:var(--w3)!important;background:transparent!important}
.btn-outline-secondary:hover{background:var(--b3)!important;color:var(--w1)!important;border-color:var(--e3)!important}
.btn-outline-primary{border-color:rgba(0,255,136,.3)!important;color:var(--acc)!important;background:transparent!important}
.btn-outline-primary:hover{background:rgba(0,255,136,.06)!important}
.btn-outline-danger{border-color:rgba(255,59,59,.3)!important;color:var(--col-r)!important;background:transparent!important}
.btn-outline-danger:hover{background:rgba(255,59,59,.07)!important}
.btn-outline-success{border-color:rgba(0,255,136,.3)!important;color:var(--acc)!important;background:transparent!important}
.btn-outline-success:hover{background:rgba(0,255,136,.06)!important}

/* ── CHOICE BUTTONS ─────────────────────────────── */
.cbtn{
  border:1px solid var(--e2);border-radius:var(--r);
  background:var(--b1);padding:12px 8px;
  font-family:'Manrope',sans-serif;font-weight:600;font-size:12px;
  cursor:pointer;transition:all .12s;
  text-align:center;display:flex;flex-direction:column;
  align-items:center;gap:5px;color:var(--w3);
}
.cbtn .ci{font-size:20px}
.cbtn:hover,.cbtn.sel{border-color:var(--acc);background:var(--acc-d);color:var(--acc)}
.cbtn.sel-g,.cbtn.vk-sel{border-color:rgba(0,255,136,.3);background:rgba(0,255,136,.06);color:var(--acc)}
.cbtn.sel-r{border-color:rgba(255,59,59,.3);background:rgba(255,59,59,.06);color:var(--col-r)}
.cg2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:4px}

/* ── KPI STRIP ──────────────────────────────────── */
.kpi-strip{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.kpi-tile{
  background:var(--b2);border:1px solid var(--e1);
  border-radius:var(--r-lg);padding:13px 12px 10px;
  position:relative;overflow:hidden;cursor:pointer;
  transition:border-color .15s;
}
.kpi-tile:hover{border-color:var(--e2)}
.kpi-tile::before{
  content:"";position:absolute;bottom:0;left:0;right:0;height:2px;
  background:var(--kpi-col,var(--e2));
}
.kpi-n{
  font-family:'Bebas Neue',sans-serif;
  font-size:36px;line-height:1;margin-bottom:2px;
  color:var(--kpi-col,var(--w1));letter-spacing:1px;
}
.kpi-l{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--w4);font-family:'Space Mono',monospace}
.kpi-ic{position:absolute;right:8px;top:8px;font-size:20px;opacity:.04}
.kpi-wide{grid-column:1/-1}

/* ── GREETING ───────────────────────────────────── */
.greeting{
  padding:16px 13px;margin-bottom:12px;
  background:var(--b2);border:1px solid var(--e1);
  border-radius:var(--r-lg);position:relative;overflow:hidden;
}
.greeting::before{
  content:"";position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(0,255,136,.015) 40px,rgba(0,255,136,.015) 41px),
             repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(0,255,136,.015) 40px,rgba(0,255,136,.015) 41px);
  pointer-events:none;
}
.g-time{
  font-family:'Space Mono',monospace;font-size:10px;
  letter-spacing:2px;text-transform:uppercase;color:var(--acc);
  margin-bottom:4px;
}
.g-name{
  font-family:'Bebas Neue',sans-serif;
  font-size:36px;letter-spacing:3px;color:var(--w1);line-height:1;margin-bottom:2px;
}
.g-sub{font-size:12px;color:var(--w3);font-weight:500}

/* ── QUICK ACTION GRID ──────────────────────────── */
.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px}
.quick-btn{
  background:var(--b2);border:1px solid var(--e1);
  border-radius:var(--r-lg);padding:13px 11px;
  cursor:pointer;transition:all .15s;
  display:flex;align-items:center;gap:10px;text-align:left;
  font-family:'Manrope',sans-serif;
}
.quick-btn:hover{border-color:var(--acc);background:var(--acc-d)}
.quick-icon{
  width:36px;height:36px;border-radius:var(--r);
  display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;
  background:var(--b3);
}
.quick-btn:hover .quick-icon{background:rgba(0,255,136,.12)}
.quick-text{font-size:12px;font-weight:700;color:var(--w1);line-height:1.2;letter-spacing:.1px}
.quick-sub{font-size:10px;color:var(--w3);margin-top:1px}

/* ── LAGER ITEMS ────────────────────────────────── */
.ic{
  background:var(--b2);border:1px solid var(--e1);
  border-left:3px solid var(--e1);
  border-radius:var(--r-lg);padding:11px 12px;
  margin-bottom:7px;transition:all .12s;cursor:pointer;
}
.ic:hover{border-left-color:var(--acc);background:var(--b3)}
.ic.type-konsole{border-left-color:var(--col-y)}
.ic.type-spiel{border-left-color:var(--col-y)}
.ic.type-handy{border-left-color:var(--col-g)}
.ic.type-pc{border-left-color:var(--col-b)}
.ic.type-defekt{border-left-color:var(--col-r)}
.ic-top{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;margin-bottom:6px}
.ic-name{font-size:14px;font-weight:700;color:var(--w1);letter-spacing:-.1px}
.ic-badge{
  font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;
  text-transform:uppercase;letter-spacing:.8px;white-space:nowrap;
  font-family:'Space Mono',monospace;
}
.ib-k,.ib-sp{background:rgba(255,204,0,.1);color:var(--col-y)}
.ib-h{background:rgba(0,255,136,.1);color:var(--acc)}
.ib-pc{background:rgba(77,159,255,.1);color:var(--col-b)}
.ib-def{background:rgba(255,59,59,.1);color:var(--col-r)}

/* ── CHIPS ──────────────────────────────────────── */
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.chip{
  background:var(--b3);border:1px solid var(--e1);
  border-radius:3px;padding:2px 6px;
  font-size:10px;color:var(--w4);
  display:flex;align-items:center;gap:3px;
  font-family:'Space Mono',monospace;
}
.chip b{color:var(--w2);font-weight:400}
.av-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;font-family:'Space Mono',monospace;letter-spacing:.5px}
.av-v{background:rgba(0,255,136,.1);color:var(--acc)}
.av-n{background:rgba(255,59,59,.1);color:var(--col-r)}
.ic-actions{display:flex;gap:5px;justify-content:flex-end;margin-top:5px}

/* ── TABS ───────────────────────────────────────── */
.lager-tabs{
  display:flex;background:var(--b1);
  border:1px solid var(--e1);border-radius:var(--r);
  overflow:hidden;margin-bottom:12px;
}
.ltab{
  flex:1;padding:8px 3px;border:none;background:none;
  font-family:'Manrope',sans-serif;font-size:10px;font-weight:700;
  color:var(--w4);cursor:pointer;transition:all .12s;text-align:center;
  letter-spacing:.5px;text-transform:uppercase;
}
.ltab.on{background:var(--b3);color:var(--w1)}

/* ── PROGRESS ───────────────────────────────────── */
.prog-wrap{padding:11px 13px 0}
.prog-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.prog-label{font-size:9px;font-weight:700;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase}
.prog-name{font-size:9px;font-weight:700;color:var(--acc);font-family:'Space Mono',monospace}
.progress{height:1px;background:var(--e2);border-radius:99px;overflow:hidden}
.progress-bar{height:100%;background:var(--acc);border-radius:99px;transition:width .4s cubic-bezier(.4,0,.2,1)}
.step-dots{display:flex;gap:4px;justify-content:center;padding:7px 0 9px}
.sdot{width:4px;height:4px;border-radius:50%;background:var(--e2);transition:all .3s}
.sdot.done{background:var(--acc);opacity:.3}
.sdot.act{width:12px;border-radius:2px;background:var(--acc)}

/* ── STEPPER ────────────────────────────────────── */
.step{display:none;animation:sIn .15s ease}.step.on{display:block}
@keyframes sIn{from{opacity:0;transform:translateX(4px)}to{opacity:1;transform:translateX(0)}}
.step-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:var(--w1);margin-bottom:2px}
.step-sub{font-size:12px;color:var(--w3);margin-bottom:14px;font-weight:500}

/* ── CAT GRID ───────────────────────────────────── */
.cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px}
.cat-btn{
  border:1px solid var(--e2);border-radius:var(--r-lg);
  background:var(--b1);padding:16px 8px;
  font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:16px;letter-spacing:1.5px;
  cursor:pointer;transition:all .12s;
  text-align:center;display:flex;flex-direction:column;
  align-items:center;gap:7px;color:var(--w4);
}
.cat-btn .ci{font-size:28px}
.cat-btn.cb-sw:hover,.cat-btn.cb-sw.sel{border-color:var(--col-y);background:rgba(255,204,0,.06);color:var(--col-y)}
.cat-btn.cb-h:hover,.cat-btn.cb-h.sel{border-color:var(--acc);background:var(--acc-d);color:var(--acc)}
.cat-btn.cb-pc:hover,.cat-btn.cb-pc.sel{border-color:var(--col-b);background:rgba(77,159,255,.06);color:var(--col-b)}

/* ── AV ROW ─────────────────────────────────────── */
.av-row{display:flex;border-radius:var(--r);overflow:hidden;border:1px solid var(--e2)}
.av-btn{flex:1;padding:9px;background:var(--b1);border:none;font-family:'Manrope',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .12s;color:var(--w4);text-align:center}
.av-btn.on-v{background:rgba(0,255,136,.08);color:var(--acc)}
.av-btn.on-n{background:rgba(255,59,59,.07);color:var(--col-r)}

/* ── PHOTO ZONE ─────────────────────────────────── */
.photo-zone{border:1px dashed var(--e2);border-radius:var(--r);background:var(--b1);overflow:hidden}
.pz-top{padding:16px;text-align:center;cursor:pointer;transition:background .12s}
.pz-top:hover{background:var(--acc-d)}
.pz-top i{font-size:24px;color:var(--w4);display:block;margin-bottom:5px;opacity:.5}
.pz-top .pz-l{font-size:12px;font-weight:600;color:var(--w3)}
.pz-top .pz-s{font-size:10px;color:var(--w4);margin-top:2px}
.pz-btns{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--e1)}
.pz-btn{padding:9px;background:none;border:none;font-family:'Manrope',sans-serif;font-size:12px;font-weight:600;color:var(--acc);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:background .12s}
.pz-btn:first-child{border-right:1px solid var(--e1)}.pz-btn:hover{background:var(--acc-d)}
.photo-main-preview{border-radius:var(--r);overflow:hidden;position:relative;margin-top:8px}
.photo-main-preview img{width:100%;max-height:200px;object-fit:cover;display:block}
.rm-main-photo{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.8);color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;font-family:'Manrope',sans-serif;font-weight:600}
.photo-thumbs{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
.photo-thumb{width:60px;height:60px;border-radius:var(--r);overflow:hidden;position:relative;border:1px solid var(--e2)}
.photo-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.rm-thumb{position:absolute;top:2px;right:2px;background:rgba(0,0,0,.8);color:#fff;border:none;border-radius:3px;width:15px;height:15px;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.add-thumb{width:60px;height:60px;border-radius:var(--r);border:1px dashed var(--e2);background:var(--b1);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--w4);font-size:20px;transition:all .12s}
.add-thumb:hover{border-color:var(--acc);color:var(--acc);background:var(--acc-d)}

/* ── CARD PHOTOS ────────────────────────────────── */
.card-fotos{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.card-foto{width:54px;height:54px;border-radius:var(--r);overflow:hidden;border:1px solid var(--e1);cursor:pointer;transition:border-color .12s}
.card-foto:hover{border-color:var(--acc)}
.card-foto img{width:100%;height:100%;object-fit:cover;display:block}

/* ── LIGHTBOX ───────────────────────────────────── */
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer}
.lightbox img{max-width:100%;max-height:90vh;border-radius:var(--r)}

/* ── TOASTS ─────────────────────────────────────── */
#toasts{position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;width:90%;max-width:320px}
.tm{padding:9px 14px;border-radius:var(--r);font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-lg);animation:tIn .2s ease;pointer-events:none;font-family:'Space Mono',monospace;letter-spacing:.3px}
@keyframes tIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.tok{background:#001a0d;border:1px solid var(--acc);color:var(--acc)}
.terr{background:#1a0000;border:1px solid var(--col-r);color:var(--col-r)}
.tinf{background:#00091a;border:1px solid var(--col-b);color:var(--col-b)}

/* ── DIAGNOSTIC ─────────────────────────────────── */
.diag{padding:8px 12px;border-radius:var(--r);font-size:12px;font-weight:600;margin-bottom:8px;display:none;line-height:1.5;font-family:'Space Mono',monospace;font-size:11px}
.dok{background:rgba(0,255,136,.06);color:var(--acc);border:1px solid rgba(0,255,136,.2)}
.derr{background:rgba(255,59,59,.06);color:var(--col-r);border:1px solid rgba(255,59,59,.2)}
.dinf{background:rgba(77,159,255,.06);color:var(--col-b);border:1px solid rgba(77,159,255,.2)}

/* ── MODALS ─────────────────────────────────────── */
.moverlay{
  position:fixed;inset:0;background:rgba(0,0,0,.8);
  z-index:200;display:flex;align-items:flex-end;
  padding:10px;opacity:0;pointer-events:none;
  transition:opacity .2s;backdrop-filter:blur(4px);
}
.moverlay.open{opacity:1;pointer-events:all}
.msheet{
  background:var(--b2);border:1px solid var(--e2);
  border-radius:var(--r-xl) var(--r-xl) var(--r-lg) var(--r-lg);
  width:100%;max-width:520px;margin:0 auto;
  max-height:88vh;overflow-y:auto;
  box-shadow:var(--shadow-lg);
  animation:sheetUp .2s cubic-bezier(.4,0,.2,1);
}
@keyframes sheetUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
.mhead{
  padding:12px 14px;border-bottom:1px solid var(--e1);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;background:var(--b2);z-index:1;
}
.mhead h3{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:1.5px;color:var(--w1);margin:0}
.mbody{padding:14px}
.mfoot{
  padding:10px 14px;border-top:1px solid var(--e1);
  display:flex;gap:7px;justify-content:flex-end;
  position:sticky;bottom:0;background:var(--b2);
}

/* ── SPINNERS ───────────────────────────────────── */
.spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--acc);border-radius:50%;animation:rot .6s linear infinite;display:inline-block;vertical-align:middle}
.spin-b{width:13px;height:13px;border:2px solid var(--e2);border-top-color:var(--acc);border-radius:50%;animation:rot .6s linear infinite;display:inline-block;vertical-align:middle}
@keyframes rot{to{transform:rotate(360deg)}}

/* ── TIMER ──────────────────────────────────────── */
.test-timer-box{background:rgba(181,123,255,.06);border:1px solid rgba(181,123,255,.2);border-radius:var(--r);padding:10px 12px;margin-top:8px;display:none}
.test-timer-box.show{display:block}
.timer-bar-wrap{background:var(--e2);border-radius:99px;height:3px;overflow:hidden;margin-top:6px}
.timer-bar{height:100%;background:var(--col-p);border-radius:99px;transition:width .1s linear}

/* ── EMPTY ──────────────────────────────────────── */
.empty{text-align:center;padding:40px 16px}
.empty i{font-size:36px;opacity:.1;display:block;margin-bottom:8px;color:var(--w1)}
.empty p{font-size:11px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px}

/* ── PHOTO GUIDE ────────────────────────────────── */
.photo-guide{background:var(--b3);border:1px solid var(--e2);border-radius:var(--r);padding:11px 12px;margin-bottom:10px}
.photo-guide-title{font-size:10px;font-weight:700;color:var(--acc);margin-bottom:6px;display:flex;align-items:center;gap:5px;font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase}
.photo-guide-item{display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;font-size:11px;color:var(--w3)}
.photo-guide-num{width:15px;height:15px;background:var(--acc);color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0;font-family:'Space Mono',monospace}

/* ── BADGES ─────────────────────────────────────── */
.price-badge{background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.2);border-radius:var(--r);padding:9px 12px;margin-top:8px;display:flex;align-items:center;justify-content:space-between}
.price-badge .pv{font-size:18px;font-weight:700;color:var(--acc);font-family:'Space Mono',monospace}
.price-badge .pl{font-size:10px;color:var(--w4);font-family:'Space Mono',monospace}
.marge-badge{padding:9px 12px;border-radius:var(--r);margin-top:8px;text-align:center}
.marge-pos{background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.2)}
.marge-neg{background:rgba(255,59,59,.06);border:1px solid rgba(255,59,59,.2)}
.marge-val{font-size:20px;font-weight:700;font-family:'Space Mono',monospace}
.marge-pos .marge-val{color:var(--acc)}
.marge-neg .marge-val{color:var(--col-r)}

/* ── ACCOUNTS ───────────────────────────────────── */
.acc-item{background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between}
.acc-avatar{width:30px;height:30px;border-radius:50%;background:var(--b4);border:1px solid var(--acc);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--acc);flex-shrink:0;font-family:'Space Mono',monospace}

/* ── NOTIFICATIONS ──────────────────────────────── */
.notif-overlay{position:fixed;top:0;right:0;bottom:0;width:min(300px,100%);background:var(--b1);border-left:1px solid var(--e1);z-index:300;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
.notif-overlay.open{transform:translateX(0)}
.notif-panel{display:flex;flex-direction:column;height:100%}
.notif-head{padding:12px 14px;border-bottom:1px solid var(--e1);display:flex;align-items:center;justify-content:space-between}
.notif-head h3{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--w1);margin:0}
.notif-list{flex:1;overflow-y:auto;padding:10px}
.notif-item{background:var(--b3);border:1px solid var(--e1);border-left:3px solid var(--e3);border-radius:var(--r);padding:10px 12px;margin-bottom:7px;position:relative}
.notif-item.alert{border-left-color:var(--col-r)}
.notif-item.warn{border-left-color:var(--col-y)}
.notif-item.info{border-left-color:var(--acc)}
.notif-title{font-size:12px;font-weight:700;color:var(--w1);margin-bottom:2px}
.notif-body{font-size:11px;color:var(--w3);line-height:1.5}
.notif-time{font-size:9px;color:var(--w4);margin-top:4px;font-family:'Space Mono',monospace}
.notif-rm{position:absolute;top:7px;right:7px;background:none;border:none;color:var(--w4);cursor:pointer;font-size:12px;padding:2px}
.notif-empty{text-align:center;padding:40px 16px}
.notif-empty i{font-size:32px;opacity:.1;display:block;margin-bottom:8px;color:var(--w1)}

/* ── HANDEL CARDS ───────────────────────────────── */
.handel-card{background:var(--b2);border:1px solid var(--e1);border-left:3px solid var(--e1);border-radius:var(--r-lg);padding:12px 13px;margin-bottom:7px;transition:border-color .12s}
.handel-card:hover{border-left-color:var(--acc)}
.hc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;margin-bottom:6px}
.hc-name{font-size:13px;font-weight:700;color:var(--w1)}
.status-badge{padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;white-space:nowrap;font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase}
.sb-vorgemerkt{background:rgba(181,123,255,.1);color:var(--col-p)}
.sb-aktiv,.sb-bestellt{background:rgba(77,159,255,.1);color:var(--col-b)}
.sb-bezahlt,.sb-verkauft,.sb-abgeschlossen{background:rgba(0,255,136,.1);color:var(--acc)}
.sb-versendet,.sb-unterwegs,.sb-angekommen{background:rgba(255,204,0,.1);color:var(--col-y)}
.sb-zugestellt{background:rgba(0,255,136,.1);color:var(--acc)}
.sb-storniert,.sb-problem{background:rgba(255,59,59,.1);color:var(--col-r)}
.ls-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
.ls-ausstehend{background:var(--w4)}
.ls-inbearbeitung{background:var(--col-y)}
.ls-versendet,.ls-unterwegs{background:var(--col-b)}
.ls-zugestellt{background:var(--acc)}
.ls-problem{background:var(--col-r)}

/* ── KA ITEMS ───────────────────────────────────── */
.ka-item{background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.ka-item.ka-done{border-left:3px solid var(--acc)}
.ka-item.ka-todo{border-left:3px solid var(--e2)}
.ka-toggle{background:none;border:1px solid var(--e2);border-radius:var(--r);padding:5px 10px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all .12s;color:var(--w4);text-transform:uppercase;letter-spacing:.5px}
.ka-toggle.done{border-color:rgba(0,255,136,.3);color:var(--acc);background:rgba(0,255,136,.06)}

/* ── ANALYSE ────────────────────────────────────── */
.an-table{width:100%;border-collapse:collapse;font-size:11px;font-family:'Space Mono',monospace}
.an-table th{background:var(--b3);color:var(--w4);font-weight:700;padding:6px 9px;text-align:left;font-size:8px;letter-spacing:1px;white-space:nowrap;position:sticky;top:0;text-transform:uppercase}
.an-table td{padding:7px 9px;border-bottom:1px solid var(--e1);color:var(--w1);vertical-align:middle}
.an-table tr:last-child td{border-bottom:none}
.an-pos{color:var(--acc);font-weight:700}
.an-neg{color:var(--col-r);font-weight:700}
.an-bar{border-radius:3px 3px 0 0;min-width:14px;transition:height .3s}
.china-item{background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:11px 13px;margin-bottom:7px;cursor:pointer;transition:border-color .12s}
.china-item:hover{border-color:var(--acc)}

/* ── MULTI-SELECT ───────────────────────────────── */
.vkm-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border-bottom:1px solid var(--e1);cursor:pointer;transition:background .1s}
.vkm-item:hover{background:var(--b3)}
.vkm-item.selected{background:var(--acc-d)}
.vkm-check{width:17px;height:17px;border-radius:3px;border:1px solid var(--e2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-family:'Space Mono',monospace}
.vkm-item.selected .vkm-check{background:var(--acc);border-color:var(--acc);color:#000}

/* ── UPLOAD ─────────────────────────────────────── */
.upload-item{background:var(--b2);border:1px solid var(--e1);border-radius:var(--r);padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;gap:9px}
.upload-item-check{width:18px;height:18px;border-radius:4px;border:1px solid var(--e2);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer}
.upload-item-check.checked{background:var(--acc);border-color:var(--acc);color:#000;font-size:10px}

/* ── DETAIL OVERLAY ─────────────────────────────── */
.detail-overlay{position:fixed;inset:0;background:var(--b0);z-index:300;overflow-y:auto;display:none}
.detail-overlay.open{display:block}
.detail-hero{width:100%;aspect-ratio:4/3;background:var(--b2);position:relative;overflow:hidden}
.detail-hero img{width:100%;height:100%;object-fit:cover}
.detail-hero-empty{display:flex;align-items:center;justify-content:center;background:var(--b2);color:var(--w4);font-size:44px;width:100%;aspect-ratio:4/3}
.detail-photos{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:var(--b1)}
.detail-photo-thumb{width:50px;height:50px;border-radius:var(--r);overflow:hidden;flex-shrink:0;cursor:pointer;border:2px solid transparent}
.detail-photo-thumb.active{border-color:var(--acc)}
.detail-photo-thumb img{width:100%;height:100%;object-fit:cover}
.detail-body{padding:14px 13px}
.detail-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px;color:var(--w1);margin-bottom:3px}
.detail-price{font-size:22px;font-weight:700;color:var(--acc);margin-bottom:1px;font-family:'Space Mono',monospace}
.detail-price-sub{font-size:10px;color:var(--w4);margin-bottom:12px;font-family:'Space Mono',monospace}
.detail-spec{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--e1);font-size:12px}
.detail-spec-key{color:var(--w4);font-weight:600}
.detail-spec-val{color:var(--w1);font-weight:700;text-align:right;font-family:'Space Mono',monospace;font-size:11px}

/* ── SCAN OVERLAY ───────────────────────────────── */
.scan-overlay{position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.scan-overlay.hidden{display:none}
.scan-overlay-video{width:100%;max-width:360px;border-radius:var(--r-lg);overflow:hidden;position:relative}
.scan-overlay-video video{width:100%;display:block;max-height:60vh;object-fit:cover}
.scan-overlay-frame{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center}
.scan-overlay-frame div{width:65%;height:65%;border:2px solid var(--acc);border-radius:var(--r);box-shadow:0 0 0 2000px rgba(0,0,0,.5),0 0 20px rgba(0,255,136,.3)}

/* ── LOG ────────────────────────────────────────── */
.log-item{padding:6px 0;border-bottom:1px solid var(--e1);display:flex;gap:8px;align-items:flex-start}
.log-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px}
.log-lager{background:var(--col-b)}
.log-verkauf{background:var(--acc)}
.log-einkauf{background:var(--col-y)}
.log-retoure{background:var(--col-r)}
.log-auth,.log-system,.log-info{background:var(--w4)}

/* ── PERF ───────────────────────────────────────── */
.perf-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--e1)}
.perf-row:last-child{border-bottom:none}
.perf-avatar{width:26px;height:26px;border-radius:50%;background:var(--b4);border:1px solid var(--acc);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--acc);flex-shrink:0;cursor:pointer;font-family:'Space Mono',monospace}
.perf-bar-wrap{flex:1;background:var(--e1);border-radius:99px;height:2px;overflow:hidden}
.perf-bar{height:100%;background:var(--acc);border-radius:99px;transition:width .4s}

/* ── LOGIN ──────────────────────────────────────── */
#emp-scr{position:fixed;inset:0;background:var(--b0);z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
#emp-scr::before{content:"";position:fixed;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(0,255,136,.012) 60px,rgba(0,255,136,.012) 61px),repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(0,255,136,.012) 60px,rgba(0,255,136,.012) 61px);pointer-events:none}
#emp-scr.hidden{display:none}
.emp-hero{text-align:center;margin-bottom:28px;position:relative}
.ehi{font-size:40px;display:block;margin-bottom:8px}
.emp-hero h1{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:6px;color:var(--w1);margin-bottom:2px}
.emp-hero p{font-size:11px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:1px}
.emp-form{width:100%;max-width:320px;position:relative}
#pw-err{background:rgba(255,59,59,.06);border:1px solid rgba(255,59,59,.2);border-radius:var(--r);padding:8px 11px;margin-bottom:8px;display:none}
#pw-err-msg{font-size:11px;color:var(--col-r);font-family:'Space Mono',monospace}

/* ── OWNER ONLY ─────────────────────────────────── */
.owner-only{display:none}
.owner-only-inline{display:none}

/* ── OVERLAYS ───────────────────────────────────── */
#mandatory-notif-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9990;flex-direction:column;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
#global-cam-bar{display:none;position:fixed;top:50px;left:0;right:0;z-index:8000;background:rgba(0,0,0,.98);border-bottom:1px solid var(--e1);padding:7px 12px;align-items:center;gap:8px}
</style>
</head>
<body>

<div id="toasts"></div>

<!-- LOGIN -->
<div id="emp-scr">
  <div class="emp-hero">
    <span class="ehi">📦</span>
    <h1>STOCKMASTER</h1>
    <p>// WAREHOUSE MANAGEMENT SYSTEM</p>
  </div>
  <div class="emp-form">
    <div id="pw-err"><span id="pw-err-msg"></span></div>
    <label class="fl" style="font-family:'Space Mono',monospace;letter-spacing:1px">E-MAIL ODER NAME</label>
    <input type="text" id="emp-in" class="fc mb-3" placeholder="identifikation eingeben" style="font-size:14px;padding:12px 14px" autocomplete="email"/>
    <label class="fl" style="font-family:'Space Mono',monospace;letter-spacing:1px">PASSWORT</label>
    <div style="position:relative;margin-bottom:12px">
      <input type="password" id="pw-in" class="fc" placeholder="••••••••••••" style="font-size:14px;padding:12px 44px 12px 14px" autocomplete="current-password"/>
      <button type="button" onclick="togglePwVis()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--w4);cursor:pointer;font-size:16px;padding:0" id="pw-eye"><i class="bi bi-eye"></i></button>
    </div>
    <button class="btn btn-primary w-100 fw-bold" id="btn-emp" style="padding:12px;font-size:13px;letter-spacing:2px">EINLOGGEN →</button>
    <p style="text-align:center;font-size:9px;color:var(--w4);margin-top:12px;font-family:'Space Mono',monospace;letter-spacing:.5px">STOCKMASTER PRO · RETECHNOLOGIES42</p>
  </div>
</div>

<!-- TOPBAR -->
<header class="topbar">
  <div class="brand">
    <div class="brand-icon" style="color:#000;font-weight:900;font-size:12px">▣</div>
    <div>
      <div class="brand-name">STOCKMASTER</div>
      <div class="brand-version">PRO // v4.0</div>
    </div>
  </div>
  <div class="topbar-right">
    <div class="notif-btn" onclick="openNotifications()">
      <i class="bi bi-bell"></i>
      <div class="notif-badge" id="notif-count-badge"></div>
    </div>
    <div class="emp-chip" onclick="openProfil()">
      <i class="bi bi-person-fill" style="font-size:13px;color:var(--acc)"></i>
      <span id="emp-name">–</span>
    </div>
  </div>
</header>

<!-- BOTTOM NAV -->
<nav class="bottom-nav">
  <button class="bnav-btn" data-tab="home-panel"><i class="bi bi-house-fill"></i>Home</button>
  <button class="bnav-btn" data-tab="list-panel"><i class="bi bi-server"></i>Lager</button>
  <button class="bnav-btn home-btn on" data-tab="scan-panel">
    <div class="home-orb"><i class="bi bi-qr-code-scan"></i></div>
    <span>Scan</span>
  </button>
  <button class="bnav-btn" data-tab="handel-panel"><i class="bi bi-arrow-left-right"></i>Handel</button>
  <button class="bnav-btn" data-tab="analyse-panel"><i class="bi bi-bar-chart-fill"></i>Analyse</button>
</nav>

<!-- ═══════════════════ HOME PANEL ═══════════════════ -->
<div class="panel on" id="home-panel">
  <div class="wrap">

    <!-- Greeting -->
    <div class="greeting">
      <div class="g-time" id="g-time">LOADING...</div>
      <div class="g-name" id="g-name">–</div>
      <div class="g-sub" id="g-sub">Bereit für heute?</div>
    </div>

    <!-- KPI Strip -->
    <div class="kpi-strip">
      <div class="kpi-tile" style="--kpi-col:var(--col-y)" onclick="goTabFn('list-panel','spielwaren')">
        <i class="bi bi-controller kpi-ic"></i>
        <div class="kpi-n" id="st-sw">–</div>
        <div class="kpi-l">Spielwaren</div>
      </div>
      <div class="kpi-tile" style="--kpi-col:var(--col-g)" onclick="goTabFn('list-panel','handy')">
        <i class="bi bi-phone kpi-ic"></i>
        <div class="kpi-n" id="st-h">–</div>
        <div class="kpi-l">Handys</div>
      </div>
      <div class="kpi-tile" style="--kpi-col:var(--col-b)" onclick="goTabFn('list-panel','pc')">
        <i class="bi bi-laptop kpi-ic"></i>
        <div class="kpi-n" id="st-pc">–</div>
        <div class="kpi-l">PCs & Laptops</div>
      </div>
      <div class="kpi-tile" style="--kpi-col:var(--col-r)" onclick="goTabFn('list-panel','defekt')">
        <i class="bi bi-tools kpi-ic"></i>
        <div class="kpi-n" id="st-def">–</div>
        <div class="kpi-l">Defekte</div>
      </div>
      <div class="kpi-tile kpi-wide" style="--kpi-col:var(--acc)">
        <i class="bi bi-activity kpi-ic"></i>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div><div class="kpi-n" id="st-heu" style="color:var(--col-p)">–</div><div class="kpi-l">Heute</div></div>
          <div style="text-align:right"><div class="kpi-n" style="font-size:28px;color:var(--acc)" id="st-vk">–</div><div class="kpi-l">Verkäufe</div></div>
          <div style="text-align:right"><div class="kpi-n" style="font-size:28px;color:var(--col-b)" id="st-ek">–</div><div class="kpi-l">Einkäufe</div></div>
        </div>
      </div>
    </div>

    <!-- KA Progress -->
    <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:12px 13px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <span style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--w4);font-family:'Space Mono',monospace">📢 KLEINANZEIGEN STATUS</span>
        <span id="kl-pct" style="font-size:10px;font-weight:700;color:var(--acc);font-family:'Space Mono',monospace">–%</span>
      </div>
      <div style="background:var(--e1);border-radius:99px;height:2px;overflow:hidden">
        <div id="kl-bar" style="height:100%;background:var(--acc);border-radius:99px;transition:width .6s ease;width:0%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:5px">
        <span id="kl-done" style="font-size:9px;color:var(--acc);font-family:'Space Mono',monospace">– hochgeladen</span>
        <span id="kl-todo" style="font-size:9px;color:var(--col-r);font-family:'Space Mono',monospace">– ausstehend</span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="sec-head">Schnellzugriff</div>
    <div class="quick-grid">
      <button class="quick-btn" onclick="goTabFn('scan-panel');setMode('einlagern')">
        <div class="quick-icon"><i class="bi bi-box-arrow-in-down" style="color:var(--acc)"></i></div>
        <div><div class="quick-text">Einlagern</div><div class="quick-sub">Neues Produkt</div></div>
      </button>
      <button class="quick-btn" onclick="goTabFn('handel-panel');setHandelTab('verkauf');openVerkaufForm(null)">
        <div class="quick-icon"><i class="bi bi-cash-stack" style="color:var(--col-g)"></i></div>
        <div><div class="quick-text">Verkauf</div><div class="quick-sub">Artikel verkaufen</div></div>
      </button>
      <button class="quick-btn" onclick="goTabFn('handel-panel');setHandelTab('einkauf');openEinkaufForm(null)">
        <div class="quick-icon"><i class="bi bi-cart-plus" style="color:var(--col-y)"></i></div>
        <div><div class="quick-text">Einkauf</div><div class="quick-sub">Ware ankaufen</div></div>
      </button>
      <button class="quick-btn" onclick="openRTModal(null)">
        <div class="quick-icon"><i class="bi bi-arrow-return-left" style="color:var(--col-r)"></i></div>
        <div><div class="quick-text">Reklamation</div><div class="quick-sub">Rückgabe</div></div>
      </button>
      <button class="quick-btn" onclick="goTabFn('analyse-panel');setAnalyseTab('ka')">
        <div class="quick-icon"><i class="bi bi-megaphone" style="color:var(--col-t)"></i></div>
        <div><div class="quick-text">KA Upload</div><div class="quick-sub">Hochladen</div></div>
      </button>
      <button class="quick-btn owner-only" onclick="openAccModal()">
        <div class="quick-icon"><i class="bi bi-people" style="color:var(--col-p)"></i></div>
        <div><div class="quick-text">Team</div><div class="quick-sub">Mitarbeiter</div></div>
      </button>
      <button class="quick-btn" style="grid-column:1/-1" onclick="goTabFn('analyse-panel');setAnalyseTab('guv')">
        <div class="quick-icon"><i class="bi bi-graph-up" style="color:var(--col-b)"></i></div>
        <div><div class="quick-text">Analyse & Buchhaltung</div><div class="quick-sub">GuV · Gewinn · Verlust · China-Import</div></div>
      </button>
    </div>

    <!-- Team Performance -->
    <div class="sec-head">Team heute</div>
    <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden;margin-bottom:12px">
      <div style="padding:10px 13px;border-bottom:1px solid var(--e1);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--w4);font-family:'Space Mono',monospace;text-transform:uppercase">Performance</span>
        <button onclick="loadMitarbeiterStats()" style="background:none;border:none;color:var(--acc);font-size:12px;cursor:pointer;font-family:'Space Mono',monospace">↻</button>
      </div>
      <div id="team-perf-body" style="padding:8px 13px">
        <div style="font-size:10px;color:var(--w4);text-align:center;padding:10px;font-family:'Space Mono',monospace">↻ AKTUALISIEREN</div>
      </div>
    </div>

    <!-- My Stats -->
    <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:13px;margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:60px;text-align:center;cursor:pointer" onclick="goTabFn('list-panel','all')">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--col-b)" id="my-total">–</div>
        <div style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase">Gesamt</div>
      </div>
      <div style="flex:1;min-width:60px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--acc)" id="my-today">–</div>
        <div style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase">Heute</div>
      </div>
      <div style="flex:1;min-width:60px;text-align:center;cursor:pointer" onclick="goTabFn('list-panel','defekt')">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--col-y)" id="my-defekte">–</div>
        <div style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase">Defekte</div>
      </div>
      <div style="flex:1;min-width:60px;text-align:center;cursor:pointer" onclick="openNotifications()">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--col-p)" id="my-notifs">–</div>
        <div style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase">Hinweise</div>
      </div>
    </div>

  </div>
</div>

<!-- ═══════════════════ SCAN PANEL ═══════════════════ -->
<div class="panel" id="scan-panel">
  <div class="wrap">

    <!-- Mode Chooser -->
    <div id="mode-chooser">
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden">
        <div style="padding:14px 13px;border-bottom:1px solid var(--e1)">
          <div style="font-size:20px;font-weight:800;color:var(--w1);letter-spacing:1px">SCANNER</div>
          <div style="font-size:11px;color:var(--w3);margin-top:2px">Aktion wählen</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          <button onclick="setMode('einlagern')" style="padding:22px 8px;border:none;background:none;font-weight:700;font-size:12px;color:var(--w4);cursor:pointer;border-right:1px solid var(--e1);display:flex;flex-direction:column;align-items:center;gap:8px;letter-spacing:.5px;transition:all .12s" onmouseover="this.style.background='var(--b3)';this.style.color='var(--acc)'" onmouseout="this.style.background='none';this.style.color='var(--w4)'">
            <span style="font-size:30px">📦</span><span>EINLAGERN</span>
            <span style="font-size:9px;color:var(--w4);font-family:monospace">NEUES PRODUKT</span>
          </button>
          <button onclick="openEKCheck()" style="padding:22px 8px;border:none;background:none;font-weight:700;font-size:12px;color:var(--w4);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;letter-spacing:.5px;transition:all .12s" onmouseover="this.style.background='var(--b3)';this.style.color='var(--col-b)'" onmouseout="this.style.background='none';this.style.color='var(--w4)'">
            <span style="font-size:30px">📋</span><span>EINKAUF CHECK</span>
            <span style="font-size:9px;color:var(--w4);font-family:monospace">PAKET PRÜFEN</span>
          </button>
        </div>
      </div>

    <!-- EK Check Panel -->
    <div id="ek-check-panel" style="display:none">
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden">
        <div style="padding:11px 13px;border-bottom:1px solid var(--e1);display:flex;align-items:center;justify-content:space-between">
          <div style="flex:1">
            <div id="ek-check-header-title" style="font-size:16px;font-weight:800;letter-spacing:1px;color:var(--w1)">EINKAUF WÄHLEN</div>
          </div>
          <button onclick="closeEKCheck()" style="background:none;border:1px solid var(--e2);color:var(--w3);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;font-family:monospace">✕ ZURÜCK</button>
        </div>
        <div style="padding:12px 13px">
          <!-- Step 1: Select Einkauf -->
          <div id="ek-check-step1">
            <div style="font-size:11px;color:var(--w3);margin-bottom:10px">Welches Paket ist angekommen? Die Zimmer-Nummer steht auf dem Paket-Label.</div>
            <div id="ek-check-einkauf-list"></div>
          </div>
          <!-- Step 2: Checklist + Einlagern -->
          <div id="ek-check-step2" style="display:none">
            <div id="ek-check-info" style="background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:10px 12px;margin-bottom:12px"></div>
            <div class="slabel">ARTIKEL PRÜFEN & EINLAGERN</div>
            <div style="font-size:11px;color:var(--w3);margin-bottom:10px">Artikel anklicken → einlagern → automatisch abhaken</div>
            <div id="ek-check-items"></div>
            <div id="ek-check-complete" style="display:none;margin-top:12px">
              <div style="background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.2);border-radius:var(--r);padding:11px 13px;text-align:center;margin-bottom:10px">
                <div style="font-size:16px;font-weight:800;color:var(--acc);letter-spacing:1px">✅ ALLE ARTIKEL EINGELAGERT!</div>
                <div style="font-size:11px;color:var(--w3);margin-top:3px">Einkauf als abgeschlossen markieren?</div>
              </div>
              <button id="ek-check-complete-btn" class="btn btn-primary w-100 fw-bold" onclick="completeEKCheck()" style="letter-spacing:1px">EINKAUF ABSCHLIESSEN →</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cat Chooser -->
    <div id="cat-chooser" style="display:none">
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden">
        <div class="card-head">
          <h2>📦 KATEGORIE</h2>
          <button class="btn btn-sm btn-outline-secondary" onclick="resetToMode()"><i class="bi bi-arrow-left"></i></button>
        </div>
        <div class="cat-grid">
          <button class="cat-btn cb-sw" onclick="selCat('spielwaren')"><span class="ci">🎮</span>SPIELWAREN</button>
          <button class="cat-btn cb-h" onclick="selCat('handy')"><span class="ci">📱</span>HANDY</button>
          <button class="cat-btn cb-pc" style="grid-column:1/-1" onclick="selCat('pc')"><span class="ci">💻</span>PC & LAPTOP</button>
          <button class="cat-btn" style="grid-column:1/-1;border-color:rgba(0,255,136,.3);color:var(--acc)" onclick="openUploadWizard()"><span class="ci" style="font-size:20px">📢</span>HOCHLADEN</button>
        </div>
      </div>
    </div>

    <!-- SW Sub -->
    <div id="sw-sub" style="display:none">
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden">
        <div class="card-head">
          <h2>🎮 SPIELWAREN</h2>
          <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('sw-sub').style.display='none';document.getElementById('cat-chooser').style.display='block'"><i class="bi bi-arrow-left"></i></button>
        </div>
        <div class="cat-grid">
          <button class="cat-btn cb-sw" onclick="selCat('konsole')"><span class="ci">🕹️</span>KONSOLE</button>
          <button class="cat-btn cb-sw" onclick="selCat('spiel')"><span class="ci">💿</span>SPIEL</button>
        </div>
      </div>
    </div>

    <!-- Main Stepper -->
    <div id="main-stepper" style="display:none">
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden">
        <div class="prog-wrap">
          <div class="prog-meta">
            <span class="prog-label" id="prog-label">STEP 1/5</span>
            <span class="prog-name" id="prog-name">BARCODE</span>
          </div>
          <div class="progress"><div class="progress-bar" id="prog-bar" style="width:20%"></div></div>
          <div class="step-dots" id="step-dots"></div>
        </div>

        <div style="padding:0 13px 13px">

          <!-- Step 1: Barcode -->
          <div class="step on" id="st-s1">
            <div class="step-title">BARCODE</div>
            <div class="step-sub">EAN scannen oder manuell eingeben.</div>
            <div style="margin-bottom:10px">
              <label class="fl">KAMERA WÄHLEN</label>
              <div style="display:flex;gap:6px">
                <select id="cam-preselect" class="fc" style="font-size:12px;padding:8px 12px;flex:1;font-family:'Space Mono',monospace" onchange="onCamPreselect()">
                  <option value="">– Kamera wählen –</option>
                </select>
                <button class="btn btn-outline-secondary btn-sm" onclick="refreshCamList()"><i class="bi bi-arrow-repeat"></i></button>
              </div>
            </div>
            <div style="display:flex;gap:7px;margin-bottom:12px">
              <button class="btn btn-primary flex-fill fw-bold" id="btn-cam-start" onclick="camStart()"><i class="bi bi-camera-video me-1"></i>KAMERA</button>
              <button class="btn btn-outline-danger" id="btn-cam-stop" onclick="camStop()" style="display:none"><i class="bi bi-stop-circle"></i></button>
            </div>
            <div id="cam-wrap" style="display:none;margin-bottom:10px;border-radius:var(--r-lg);overflow:hidden;position:relative;border:1px solid var(--acc)">
              <video id="cam-video" autoplay playsinline muted style="width:100%;display:block;max-height:240px;object-fit:cover"></video>
              <canvas id="cam-canvas" style="display:none"></canvas>
              <div style="position:absolute;bottom:7px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:var(--acc);border-radius:20px;padding:4px 12px;font-size:10px;font-weight:700;white-space:nowrap;font-family:'Space Mono',monospace" id="cam-hint">BARCODE HALTEN</div>
            </div>
            <div id="cam-select-row" style="display:none;margin-bottom:10px">
              <label class="fl">AKTIVE KAMERA</label>
              <select id="cam-select" class="fc" style="font-size:12px;font-family:'Space Mono',monospace" onchange="camSwitchDevice()"></select>
            </div>
            <div id="scan-err" style="display:none;background:rgba(255,59,59,.06);border:1px solid rgba(255,59,59,.2);border-radius:var(--r);padding:8px 12px;margin-bottom:8px">
              <div id="scan-err-msg" style="font-size:11px;color:var(--col-r);font-family:'Space Mono',monospace"></div>
            </div>
            <label class="fl">MANUELL</label>
            <input type="text" id="f-scanid" class="fc mb-2" placeholder="barcode / ean-code" autocomplete="off" style="font-family:'Space Mono',monospace"/>
            <div id="scan-ok" style="display:none;background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.2);border-radius:var(--r);padding:8px 12px;margin-bottom:4px">
              <div style="font-size:11px;color:var(--acc);font-weight:700;font-family:'Space Mono',monospace">✓ ERKANNT: <span id="scan-ok-val"></span></div>
            </div>
            <div class="diag" id="s1-diag"></div>
          </div>

          <!-- Step 2: Name -->
          <div class="step" id="st-s2">
            <div class="step-title" id="s2-title">NAME</div>
            <div class="step-sub" id="s2-sub">Vollständige Bezeichnung eingeben.</div>
            <label class="fl" id="s2-lbl">NAME *</label>
            <input type="text" id="f-name" class="fc mb-3" placeholder=""/>
            <div id="s2-extra"></div>
          </div>

          <!-- Step 3: Details -->
          <div class="step" id="st-s3">
            <div class="step-title" id="s3-title">DETAILS</div>
            <div id="s3-fields"></div>
          </div>

          <!-- Step 4: Mängel -->
          <div class="step" id="st-s4">
            <div class="step-title">MÄNGEL & FOTOS</div>
            <div class="step-sub">Zustand und Fotos dokumentieren.</div>
            <div class="cg2 mb-3">
              <button class="cbtn" id="pb-nein" onclick="selProb('nein')"><span class="ci">✅</span>KEINE MÄNGEL</button>
              <button class="cbtn" id="pb-ja" onclick="selProb('ja')"><span class="ci">⚠️</span>MÄNGEL</button>
            </div>
            <div id="prob-type-row" style="display:none;margin-bottom:12px">
              <label class="fl mb-2">ART DES MANGELS</label>
              <div class="cg2">
                <button class="cbtn" id="pb-phys" onclick="selProbType('physisch')"><span class="ci">🔧</span>PHYSISCH</button>
                <button class="cbtn" id="pb-soft" onclick="selProbType('software')"><span class="ci">💾</span>SOFTWARE</button>
              </div>
            </div>
            <div id="prob-descr-row" style="display:none;margin-bottom:12px">
              <label class="fl">BESCHREIBUNG</label>
              <textarea id="f-prob-beschr" class="fc" placeholder="mangel beschreiben..." rows="3"></textarea>
            </div>
            <div id="photo-row" style="display:none">
              <label class="fl">FOTOS <span style="background:rgba(255,59,59,.1);color:var(--col-r);font-size:8px;padding:1px 5px;border-radius:2px;font-family:'Space Mono',monospace;letter-spacing:.5px">PFLICHT</span></label>
              <div class="photo-guide" id="photo-guide-box"></div>
              <div class="photo-zone">
                <div class="pz-top" onclick="triggerPhotoInput('gallery')">
                  <i class="bi bi-camera-plus"></i>
                  <div class="pz-l">Fotos hinzufügen</div>
                  <div class="pz-s">Max. 15 MB · JPEG komprimiert</div>
                </div>
                <div class="pz-btns">
                  <button class="pz-btn" onclick="triggerPhotoInput('cam')"><i class="bi bi-camera me-1"></i>KAMERA</button>
                  <button class="pz-btn" onclick="triggerPhotoInput('gallery')"><i class="bi bi-images me-1"></i>GALERIE</button>
                </div>
              </div>
              <div id="photo-main-wrap"></div>
              <div class="photo-thumbs" id="photo-thumbs"></div>
            </div>
          </div>

          <!-- Step 5: Mitarbeiter & Ankauf -->
          <div class="step" id="st-s5">
            <div class="step-title">ANKAUF INFO</div>
            <div class="step-sub">Letzte Details zum Einlagern.</div>
            <label class="fl">MITARBEITER</label>
            <input type="text" id="f-ma" class="fc mb-3"/>
            <div class="row g-2 mb-3">
              <div class="col-7">
                <label class="fl">EINKAUFSPREIS (€)</label>
                <input type="number" id="f-einkaufspreis" class="fc" placeholder="0.00" step="0.01" style="font-family:'Space Mono',monospace"/>
              </div>
              <div class="col-5">
                <label class="fl">WARENTYP</label>
                <select id="f-warentyp" class="fc">
                  <option value="Gebrauchtware">Gebraucht</option>
                  <option value="Neuware">Neuware</option>
                  <option value="China-Import">China-Import</option>
                </select>
              </div>
            </div>
            <div id="price-suggest-box" style="display:none" class="price-badge">
              <div><div class="pl">💡 EMPFOHLENER PREIS</div><div class="pv" id="price-suggest-val">–</div></div>
            </div>
            <div id="s5-extra"></div>
          </div>

        </div>

        <!-- Nav Buttons -->
        <div style="padding:11px 13px;border-top:1px solid var(--e1);display:flex;gap:7px;justify-content:space-between">
          <button class="btn btn-outline-secondary" id="btn-back" onclick="stepBack()" disabled><i class="bi bi-arrow-left me-1"></i>Zurück</button>
          <button class="btn btn-primary px-4 fw-bold" id="btn-next" onclick="stepNext()">Weiter <i class="bi bi-arrow-right ms-1"></i></button>
          <button class="btn btn-primary px-4 fw-bold" id="btn-save-step" style="display:none" onclick="doSave()"><i class="bi bi-check-lg me-1"></i>SPEICHERN</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════ LAGER PANEL ═══════════════════ -->
<div class="panel" id="list-panel">
  <div class="wrap">
    <div style="display:flex;gap:7px;margin-bottom:12px;align-items:center">
      <input type="text" id="list-q" class="fc" placeholder="suchen..." oninput="renderList()" style="flex:1"/>
      <button class="btn btn-outline-secondary" onclick="loadAll()" style="height:40px;width:40px;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="bi bi-arrow-repeat"></i></button>
    </div>
    <div class="lager-tabs">
      <button class="ltab on" onclick="setLF('all')">ALLE</button>
      <button class="ltab" onclick="setLF('spielwaren')">🎮</button>
      <button class="ltab" onclick="setLF('handy')">📱</button>
      <button class="ltab" onclick="setLF('pc')">💻</button>
      <button class="ltab" onclick="setLF('defekt')">⚠</button>
    </div>
    <div id="lager-category-header" style="display:none;margin-bottom:10px;padding:8px 12px;background:var(--b3);border:1px solid var(--e1);border-radius:var(--r)">
      <span id="lager-cat-label" style="font-size:13px;font-weight:700;color:var(--w1)"></span>
      <span id="lager-cat-count" style="font-size:11px;color:var(--w3);margin-left:8px;font-family:'Space Mono',monospace"></span>
    </div>
    <div id="list-count" class="slabel"></div>
    <div id="list-body"><div class="empty"><i class="bi bi-server"></i><p>↻ LADEN</p></div></div>
  </div>
</div>

<!-- Search panel (hidden) -->
<div class="panel" id="search-panel">
  <div class="wrap">
    <span class="slabel">SUCHE & FILTER</span>
    <div class="d-flex gap-2 mb-2">
      <input type="text" id="s-bc-in" class="fc" placeholder="name, barcode, modell..." oninput="liveSearch(this.value)"/>
      <button class="btn btn-outline-secondary" onclick="openSearchScanner()"><i class="bi bi-upc-scan"></i></button>
      <button class="btn btn-primary" onclick="doSearch()"><i class="bi bi-search"></i></button>
    </div>
    <div id="recent-searches" style="display:none;margin-bottom:12px">
      <span class="slabel">ZULETZT GESUCHT</span>
      <div id="recent-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>
    <div class="d-flex gap-2 mb-3 flex-wrap">
      <select id="search-sort" class="fc" style="flex:1;min-width:140px;font-size:12px;padding:8px 10px" onchange="applySearchSort()">
        <option value="neu">Neueste zuerst</option><option value="alt">Älteste zuerst</option>
        <option value="az">Name A→Z</option><option value="za">Name Z→A</option>
      </select>
      <select id="search-cat" class="fc" style="flex:1;min-width:130px;font-size:12px;padding:8px 10px" onchange="applySearchSort()">
        <option value="all">Alle</option><option value="konsole">Konsolen</option>
        <option value="spiel">Spiele</option><option value="handy">Handys</option>
        <option value="pc">PCs</option><option value="defekt">Defekte</option>
      </select>
    </div>
    <div id="search-count" class="slabel" style="display:none"></div>
    <div id="search-out"></div>
  </div>
</div>

<!-- Diagnose panel (hidden) -->
<div class="panel" id="diag-panel">
  <div class="wrap">
    <span class="slabel">VERBINDUNGSDIAGNOSE</span>
    <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:13px;margin-bottom:12px">
      <div class="d-flex gap-2 flex-wrap mb-2">
        <button class="btn btn-primary btn-sm" id="bt1" onclick="test1()"><i class="bi bi-plug me-1"></i>Verbindung</button>
        <button class="btn btn-outline-secondary btn-sm" id="bt2" onclick="test2()"><i class="bi bi-table me-1"></i>Sheet</button>
        <button class="btn btn-outline-secondary btn-sm" id="bt3" onclick="test3()"><i class="bi bi-pencil me-1"></i>Testzeile</button>
      </div>
      <div class="diag" id="t1o"></div>
      <div class="diag" id="t2o"></div>
      <div class="diag" id="t3o"></div>
      <div class="test-timer-box" id="test-timer-box">
        <div class="d-flex justify-content-between align-items-center">
          <span style="font-size:11px;font-weight:600;color:var(--col-p);font-family:'Space Mono',monospace">TESTZEILE LÖSCHT IN <span id="timer-cnt">3</span>s</span>
        </div>
        <div class="timer-bar-wrap mt-2"><div class="timer-bar" id="timer-bar" style="width:100%"></div></div>
      </div>
    </div>
    <div style="background:var(--b2);border:1px solid rgba(255,204,0,.15);border-radius:var(--r-lg);padding:12px 13px">
      <div style="font-size:11px;line-height:2;color:var(--w3);font-family:'Space Mono',monospace">
        <span style="color:var(--col-y)">// KAMERA VERWEIGERT?</span><br>
        Chrome → 🔒 → Kamera → Zulassen → Reload<br><br>
        <span style="color:var(--col-y)">// CODE NICHT AKTIV?</span><br>
        GAS → Bereitstellen → Neue Version
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════ HANDEL PANEL ═══════════════════ -->
<div class="panel" id="handel-panel">
  <div class="wrap">
    <div class="lager-tabs" style="margin-bottom:12px">
      <button class="ltab on" id="htab-vk" onclick="setHandelTab('verkauf')">💸 VERKAUF</button>
      <button class="ltab" id="htab-ek" onclick="setHandelTab('einkauf')">🛒 EINKAUF</button>
    </div>
    <div id="handel-vk">
      <div class="d-flex gap-2 mb-3 align-items-center">
        <input type="text" id="vk-search" class="fc" placeholder="suchen..." oninput="filterHandel('verkauf')" style="flex:1"/>
        <button class="btn btn-primary fw-bold" onclick="openVerkaufForm(null)" style="white-space:nowrap;height:40px"><i class="bi bi-plus me-1"></i>NEU</button>
        <button class="btn btn-outline-danger btn-sm" onclick="openRTModal(null)" title="Reklamation" style="height:40px;padding:0 10px"><i class="bi bi-arrow-return-left"></i></button>
        <button class="btn btn-outline-secondary" onclick="loadHandel()" style="height:40px;width:40px;padding:0;display:flex;align-items:center;justify-content:center"><i class="bi bi-arrow-repeat"></i></button>
      </div>
      <div id="vk-body"><div class="empty"><i class="bi bi-cash-coin"></i><p>↻ LADEN</p></div></div>
    </div>
    <div id="handel-ek" style="display:none">
      <div class="d-flex gap-2 mb-3 align-items-center">
        <input type="text" id="ek-search" class="fc" placeholder="suchen..." oninput="filterHandel('einkauf')" style="flex:1"/>
        <button class="btn btn-primary fw-bold" onclick="openEinkaufForm(null)" style="white-space:nowrap;height:40px"><i class="bi bi-plus me-1"></i>NEU</button>
        <button class="btn btn-outline-secondary" onclick="loadHandel()" style="height:40px;width:40px;padding:0;display:flex;align-items:center;justify-content:center"><i class="bi bi-arrow-repeat"></i></button>
      </div>
      <div id="ek-body"><div class="empty"><i class="bi bi-cart"></i><p>↻ LADEN</p></div></div>
    </div>
  </div>
</div>

<!-- ═══════════════════ ANALYSE PANEL ═══════════════════ -->
<div class="panel" id="analyse-panel">
  <div class="wrap">

    <!-- KPI Strip -->
    <div class="kpi-strip">
      <div class="kpi-tile" style="--kpi-col:var(--col-g)">
        <i class="bi bi-graph-up kpi-ic"></i>
        <div class="kpi-n" id="an-gewinn">–</div>
        <div class="kpi-l">Gesamtgewinn</div>
      </div>
      <div class="kpi-tile" style="--kpi-col:var(--col-r)">
        <i class="bi bi-graph-down kpi-ic"></i>
        <div class="kpi-n" id="an-verlust">–</div>
        <div class="kpi-l">Verluste</div>
      </div>
      <div class="kpi-tile" style="--kpi-col:var(--col-b)">
        <i class="bi bi-currency-euro kpi-ic"></i>
        <div class="kpi-n" id="an-umsatz">–</div>
        <div class="kpi-l">Umsatz</div>
      </div>
      <div class="kpi-tile" style="--kpi-col:var(--col-y)">
        <i class="bi bi-percent kpi-ic"></i>
        <div class="kpi-n" id="an-marge-avg">–</div>
        <div class="kpi-l">Ø Marge</div>
      </div>
    </div>

    <div class="lager-tabs" style="margin-bottom:12px">
      <button class="ltab on" id="atab-guv"   onclick="setAnalyseTab('guv')">GuV</button>
      <button class="ltab"    id="atab-china" onclick="setAnalyseTab('china')">🇨🇳</button>
      <button class="ltab"    id="atab-ka"    onclick="setAnalyseTab('ka')">📢 KA</button>
      <button class="ltab"    id="atab-rt"    onclick="setAnalyseTab('rt')">⚠️ RT</button>
    </div>

    <!-- GuV Tab -->
    <div id="an-guv">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class="slabel" style="margin:0">GEWINN & VERLUST</span>
        <div style="display:flex;gap:6px">
          <select id="an-filter-month" class="fc" style="font-size:11px;padding:5px 8px;width:auto;font-family:'Space Mono',monospace" onchange="renderAnalysePanel()">
            <option value="all">GESAMT</option><option value="thismonth">DIESER MONAT</option><option value="lastmonth">LETZTER MONAT</option>
          </select>
          <button class="btn btn-outline-secondary btn-sm" onclick="renderAnalysePanel()"><i class="bi bi-arrow-repeat"></i></button>
        </div>
      </div>
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:12px 13px;margin-bottom:10px">
        <div class="slabel">MONATLICHE ENTWICKLUNG</div>
        <div id="an-chart-bars" style="display:flex;align-items:flex-end;gap:3px;height:80px"></div>
        <div id="an-chart-labels" style="display:flex;gap:3px;margin-top:4px"></div>
      </div>
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);overflow:hidden;margin-bottom:10px">
        <div style="padding:9px 13px;border-bottom:1px solid var(--e1)"><span class="slabel" style="margin:0">TOP VERKÄUFE</span></div>
        <div id="an-vk-table" style="overflow-x:auto;max-height:280px;overflow-y:auto"></div>
      </div>
      <div style="background:rgba(255,59,59,.04);border:1px solid rgba(255,59,59,.12);border-radius:var(--r-lg);padding:12px 13px;margin-bottom:10px">
        <div class="slabel" style="color:var(--col-r)">VERLUSTANALYSE</div>
        <div id="an-verlust-detail"></div>
      </div>
    </div>

    <!-- China Tab -->
    <div id="an-china" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class="slabel" style="margin:0">CHINA-IMPORTE</span>
        <button class="btn btn-primary btn-sm" onclick="openChinaForm()"><i class="bi bi-plus me-1"></i>NEU</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:12px">
        <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:10px;text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;color:var(--col-b)" id="cn-total-cost">–</div>
          <div class="kpi-l">GESAMT</div>
        </div>
        <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:10px;text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;color:var(--col-y)" id="cn-total-zoll">–</div>
          <div class="kpi-l">ZOLL</div>
        </div>
        <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:10px;text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;color:var(--col-p)" id="cn-total-fracht">–</div>
          <div class="kpi-l">FRACHT</div>
        </div>
      </div>
      <div id="an-china-list"></div>
    </div>

    <!-- KA Tab -->
    <div id="an-ka" style="display:none">
      <div class="d-flex gap-2 mb-3 align-items-center">
        <input type="text" id="ka-search" class="fc" placeholder="suchen..." oninput="filterKA()" style="flex:1"/>
        <button class="btn btn-outline-secondary" onclick="loadAll();renderKAPanel()"><i class="bi bi-arrow-repeat"></i></button>
      </div>
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:12px 13px;margin-bottom:10px;display:flex;gap:16px;align-items:center">
        <div style="text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--acc)" id="ka-done-cnt">–</div>
          <div class="kpi-l">HOCHGELADEN</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--col-r)" id="ka-todo-cnt">–</div>
          <div class="kpi-l">AUSSTEHEND</div>
        </div>
        <div style="flex:1;background:var(--e1);border-radius:99px;height:2px;overflow:hidden">
          <div id="ka-prog-bar" style="height:100%;background:var(--acc);border-radius:99px;transition:width .5s ease;width:0%"></div>
        </div>
      </div>
      <div id="ka-body"></div>
    </div>

    <!-- Retouren Tab -->
    <div id="an-rt" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class="slabel" style="margin:0">REKLAMATIONEN</span>
        <button class="btn btn-outline-danger btn-sm" onclick="openRTModal(null)"><i class="bi bi-plus me-1"></i>NEU</button>
      </div>
      <div id="an-rt-list"></div>
    </div>

  </div>
</div>

<!-- ═══════════════════ MODALS ═══════════════════ -->

<!-- Verkauf Modal -->
<div class="moverlay" id="vk-modal">
  <div class="msheet">
    <div class="mhead">
      <div style="flex:1">
        <h3 id="vk-modal-title">VERKAUF</h3>
        <div style="margin-top:3px">
          <div class="progress"><div class="progress-bar" id="vk-prog" style="width:20%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px">
            <span style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace" id="vk-step-lbl">STEP 1/5</span>
            <span style="font-size:9px;color:var(--acc);font-family:'Space Mono',monospace" id="vk-step-name">PRODUKT</span>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-secondary" onclick="closeVKModal()" style="margin-left:10px"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="mbody">
      <div class="diag" id="vk-diag"></div>
      <!-- Step 1 -->
      <div id="vks-1">
        <div class="step-title">PRODUKT</div>
        <div class="step-sub">Welchen Artikel verkaufst du?</div>
        <div style="display:flex;gap:6px;margin-bottom:7px">
          <input type="text" id="vk-produkte" class="fc" placeholder="produktname..." style="flex:1"/>
          <button type="button" onclick="openVKMultiSelect()" class="btn btn-outline-success btn-sm" title="Mehrere Artikel"><i class="bi bi-collection"></i></button>
          <button type="button" onclick="openVKProductPicker()" class="btn btn-outline-primary btn-sm" title="Aus Lager"><i class="bi bi-box-seam"></i></button>
          <button type="button" onclick="openVKScanner()" class="btn btn-outline-secondary btn-sm" title="Scannen"><i class="bi bi-upc-scan"></i></button>
        </div>
        <div id="vk-multi-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px"></div>
        <div id="vk-product-info" style="display:none;background:var(--b3);border:1px solid var(--e2);border-radius:var(--r);padding:7px 10px;font-size:10px;color:var(--w3);margin-bottom:8px;font-family:'Space Mono',monospace"></div>
        <input type="hidden" id="vk-scanid"/>
        <div class="row g-2">
          <div class="col-6"><label class="fl">PREIS (€) *</label><input type="number" id="vk-preis" class="fc" placeholder="0.00" style="font-family:'Space Mono',monospace"/></div>
          <div class="col-6"><label class="fl">VERSAND (€)</label><input type="number" id="vk-versand" class="fc" placeholder="0.00" style="font-family:'Space Mono',monospace"/></div>
        </div>
      </div>
      <!-- Step 2 -->
      <div id="vks-2" style="display:none">
        <div class="step-title">PLATTFORM</div>
        <div class="step-sub">Wo wird verkauft?</div>
        <div class="mb-3">
          <label class="fl mb-2">PLATTFORM *</label>
          <div class="cg2" style="margin-bottom:0">
            <button class="cbtn" id="vkp-ka" onclick="selVKPlattform('Kleinanzeigen')"><span class="ci" style="font-size:17px">🟡</span>KLEINANZEIGEN</button>
            <button class="cbtn" id="vkp-eb" onclick="selVKPlattform('eBay')"><span class="ci" style="font-size:17px">🛒</span>EBAY</button>
            <button class="cbtn" id="vkp-ab" onclick="selVKPlattform('Abholung')"><span class="ci" style="font-size:17px">🚶</span>ABHOLUNG</button>
            <button class="cbtn" id="vkp-so" onclick="selVKPlattform('Sonstiges')"><span class="ci" style="font-size:17px">📦</span>SONSTIGES</button>
          </div>
          <input type="hidden" id="vk-plattform" value=""/>
        </div>
        <div class="row g-2">
          <div class="col-12"><label class="fl">KÄUFER</label><input type="text" id="vk-kunde" class="fc" placeholder="name oder nutzername"/></div>
        </div>
        <div class="row g-2 mt-2">
          <div class="col-12"><label class="fl">ANGEBOTS-NR.</label><input type="text" id="vk-bestellnr" class="fc" placeholder="z.B. ka-angebotsnr."/></div>
        </div>
      </div>
      <!-- Step 3 -->
      <div id="vks-3" style="display:none">
        <div class="step-title">BEZAHLUNG</div>
        <div class="step-sub" id="vks-3-sub">Zahlungsinfos.</div>
        <div class="mb-3">
          <label class="fl mb-2">METHODE</label>
          <div id="vk-bezahl-opts" class="cg2" style="margin-bottom:0"></div>
          <input type="hidden" id="vk-bezahlt" value=""/>
        </div>
        <div class="row g-2">
          <div class="col-6"><label class="fl">GELD ERHALTEN?</label>
            <select id="vk-geld" class="fc"><option value="">–</option><option>Ja</option><option>Nein</option></select>
          </div>
          <div class="col-6"><label class="fl">VERSAND</label>
            <select id="vk-abholung" class="fc"><option>Versand</option><option>Abholung</option></select>
          </div>
        </div>
      </div>
      <!-- Step 4 -->
      <div id="vks-4" style="display:none">
        <div class="step-title">MARGE</div>
        <div class="step-sub">Einkaufspreis für Kalkulation.</div>
        <div class="row g-2 mb-3">
          <div class="col-6"><label class="fl">EINKAUFSPREIS (€)</label><input type="number" id="vk-ep" class="fc" placeholder="0.00" step="0.01" oninput="calcAndShowMarge()" style="font-family:'Space Mono',monospace"/></div>
          <div class="col-6" style="display:flex;align-items:flex-end"><div id="vk-marge-box" class="marge-badge marge-pos w-100" style="display:none"><div class="marge-val" id="vk-marge-val"></div><div style="font-size:10px;color:var(--w3);font-family:'Space Mono',monospace" id="vk-marge-sub"></div></div></div>
        </div>
        <div class="mb-3">
          <label class="fl mb-2">STATUS</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
            <button class="cbtn" id="vkst-vm" onclick="selVKStatus('Vorgemerkt')"><span class="ci" style="font-size:15px">📝</span>VORGEMERKT</button>
            <button class="cbtn" id="vkst-vk" onclick="selVKStatus('Verkauft')"><span class="ci" style="font-size:15px">✅</span>VERKAUFT</button>
            <button class="cbtn" id="vkst-vs" onclick="selVKStatus('Versendet')"><span class="ci" style="font-size:15px">📦</span>VERSENDET</button>
            <button class="cbtn" id="vkst-ab" onclick="selVKStatus('Abgeschlossen')"><span class="ci" style="font-size:15px">🏁</span>ABGESCHLOSSEN</button>
          </div>
          <input type="hidden" id="vk-status" value="Vorgemerkt"/>
        </div>
        <div id="vk-sende-wrap" style="display:none">
          <div class="row g-2 mb-2">
            <div class="col-7"><label class="fl">SENDENUMMER</label><input type="text" id="vk-sende" class="fc" placeholder="1234567890" oninput="onVKSendeInput()" style="font-family:'Space Mono',monospace"/></div>
            <div class="col-5"><label class="fl">DIENSTLEISTER</label>
              <select id="vk-vdl" class="fc"><option value=""></option><option>DHL</option><option>Hermes</option><option>DPD</option><option>UPS</option><option>GLS</option></select>
            </div>
          </div>
          <div id="vk-track-link" style="display:none;margin-bottom:8px">
            <a id="vk-track-a" href="#" target="_blank" class="btn btn-outline-primary btn-sm w-100"><i class="bi bi-box-arrow-up-right me-1"></i>SENDUNG VERFOLGEN</a>
          </div>
        </div>
        <div class="mb-2"><label class="fl">LIEFERSTATUS</label>
          <select id="vk-lieferstatus" class="fc" onchange="onVKLieferstatusChange()">
            <option>Ausstehend</option><option>In Bearbeitung</option><option>Versendet</option><option>Unterwegs</option><option>Zugestellt</option><option>Problem</option>
          </select>
        </div>
      </div>
      <!-- Step 5 -->
      <div id="vks-5" style="display:none">
        <div class="step-title">ABSCHLUSS</div>
        <div class="step-sub">Letzte Details.</div>
        <div class="row g-2 mb-2">
          <div class="col-12"><label class="fl">MITARBEITER</label><input type="text" id="vk-ma" class="fc"/></div>
        </div>
        <div class="mb-2"><label class="fl">HINWEISE</label><textarea id="vk-hinweise" class="fc" rows="2" placeholder="optional..."></textarea></div>
        <div id="vk-summary" style="background:var(--b3);border:1px solid var(--e2);border-radius:var(--r);padding:10px 12px;font-size:11px;color:var(--w3);font-family:'Space Mono',monospace"></div>
      </div>
    </div>
    <div style="padding:10px 13px;border-top:1px solid var(--e1);display:flex;gap:7px;justify-content:space-between">
      <button class="btn btn-outline-secondary" id="vk-back-btn" onclick="vkStepNav(-1)" disabled><i class="bi bi-arrow-left"></i></button>
      <button class="btn btn-outline-danger btn-sm" id="vk-del-btn" onclick="deleteHandelEntry('verkauf')" style="display:none"><i class="bi bi-trash3"></i></button>
      <button class="btn btn-primary px-4 fw-bold" id="vk-next-btn" onclick="vkStepNav(1)">WEITER <i class="bi bi-arrow-right ms-1"></i></button>
      <button class="btn btn-primary px-4 fw-bold" id="vk-save-btn" style="display:none" onclick="saveVKForm()"><i class="bi bi-check-lg me-1"></i>SPEICHERN</button>
    </div>
  </div>
</div>

<!-- Einkauf Modal - 2 Steps -->
<div class="moverlay" id="ek-modal">
  <div class="msheet">
    <div class="mhead">
      <div style="flex:1">
        <h3 id="ek-modal-title">EINKAUF</h3>
        <div style="margin-top:3px">
          <div class="progress"><div class="progress-bar" id="ek-prog" style="width:50%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px">
            <span style="font-size:9px;color:var(--w4);font-family:monospace" id="ek-step-lbl">STEP 1/2</span>
            <span style="font-size:9px;color:var(--acc);font-family:monospace" id="ek-step-name">ARTIKEL</span>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-secondary" onclick="closeEKModal()" style="margin-left:10px"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="mbody">
      <div class="diag" id="ek-diag"></div>
      <div id="eks-1">
        <div class="step-title">ARTIKEL & KUNDE</div>
        <div class="step-sub">Welche Artikel? Von wem?</div>
        <label class="fl">PRODUKTE *</label>
        <div id="ek-produkte-list" style="margin-bottom:10px"></div>
        <div class="row g-2 mb-2">
          <div class="col-6"><label class="fl">KUNDE *</label><input type="text" id="ek-kunde" class="fc" placeholder="Name des Verkäufers"/></div>
          <div class="col-6"><label class="fl">GESAMTPREIS (€)</label><input type="number" id="ek-preis" class="fc" placeholder="0.00" step="0.01" style="font-family:monospace"/></div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6"><label class="fl">PLATTFORM</label>
            <select id="ek-plattform" class="fc"><option>Kleinanzeigen</option><option>eBay</option><option>Facebook</option><option>Direkt</option><option>Amazon</option><option>Alibaba</option><option>Sonstiges</option></select>
          </div>
          <div class="col-6"><label class="fl">ZIMMER / LAGERORT</label><input type="text" id="ek-zimmer" class="fc" placeholder="z.B. Zimmer 001"/></div>
        </div>
      </div>
      <div id="eks-2" style="display:none">
        <div class="step-title">VERSAND & TRACKING</div>
        <div class="step-sub">Sendung tracken → Einkauf wird als Vorgemerkt gespeichert.</div>
        <div style="background:rgba(0,255,136,.05);border:1px solid rgba(0,255,136,.15);border-radius:var(--r);padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--w3)">
          💡 Nach dem Speichern: Paket abwarten → über <strong style="color:var(--acc)">EINKAUF CHECK</strong> einlagern.
        </div>
        <div class="mb-3">
          <label class="fl mb-2">LIEFERART</label>
          <div class="cg2">
            <button class="cbtn sel" id="ekv-versand" onclick="selEKVersand('Versand')"><span class="ci">📦</span>VERSAND</button>
            <button class="cbtn" id="ekv-abholung" onclick="selEKVersand('Abholung')"><span class="ci">🚶</span>ABHOLUNG</button>
          </div>
          <input type="hidden" id="ek-abholung" value="NEIN"/>
        </div>
        <div id="ek-versand-fields">
          <div class="row g-2 mb-2">
            <div class="col-7"><label class="fl">SENDENUMMER</label><input type="text" id="ek-sende" class="fc" placeholder="Tracking-Nr." style="font-family:monospace" oninput="onEKSendeInput()"/></div>
            <div class="col-5"><label class="fl">DIENSTLEISTER</label>
              <select id="ek-vdl" class="fc"><option value=""></option><option>DHL</option><option>Hermes</option><option>DPD</option><option>UPS</option><option>GLS</option></select>
            </div>
          </div>
          <div id="ek-track-link" style="display:none;margin-bottom:8px">
            <a id="ek-track-a" href="#" target="_blank" class="btn btn-outline-primary btn-sm w-100"><i class="bi bi-box-arrow-up-right me-1"></i>SENDUNG VERFOLGEN</a>
          </div>
        </div>
        <div id="ek-abholung-fields" style="display:none">
          <div class="row g-2 mb-2">
            <div class="col-6"><label class="fl">ABHOLDATUM</label><input type="date" id="ek-abhol-datum" class="fc"/></div>
            <div class="col-6"><label class="fl">ABHOLORT</label><input type="text" id="ek-abhol-ort" class="fc" placeholder="Adresse"/></div>
          </div>
        </div>
        <div class="row g-2 mb-2"><div class="col-6"><label class="fl">MITARBEITER</label><input type="text" id="ek-ma" class="fc"/></div></div>
        <div class="mb-2"><label class="fl">HINWEISE</label><textarea id="ek-hinweise" class="fc" rows="2"></textarea></div>
        <div id="ek-products-summary" style="display:none;background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:10px 12px;font-size:11px;color:var(--w3);font-family:monospace;margin-top:8px"></div>
        <div id="ek-storno-section" style="display:none;border-top:1px solid var(--e1);padding-top:10px;margin-top:10px">
          <div class="slabel" style="color:var(--col-r)">STORNIERUNG</div>
          <select id="ek-storno-grund" class="fc mb-2"><option value="">– Storno-Grund –</option><option>Artikel nicht erhalten</option><option>Falscher Artikel</option><option>Qualitätsmängel</option><option>Preis nicht akzeptabel</option><option>Sonstiges</option></select>
          <textarea id="ek-storno-notiz" class="fc mb-2" rows="2" placeholder="Details..."></textarea>
          <button class="btn btn-danger w-100 fw-bold" onclick="stornoEinkauf()"><i class="bi bi-x-circle me-1"></i>STORNIEREN</button>
        </div>
      </div>
    </div>
    <div style="padding:10px 13px;border-top:1px solid var(--e1);display:flex;gap:7px;justify-content:space-between">
      <button class="btn btn-outline-secondary" id="ek-back-btn" onclick="ekStepNav(-1)" disabled><i class="bi bi-arrow-left"></i></button>
      <button class="btn btn-outline-danger btn-sm" id="ek-del-btn" onclick="deleteHandelEntry('einkauf')" style="display:none"><i class="bi bi-trash3"></i></button>
      <button class="btn btn-primary px-4 fw-bold" id="ek-next-btn" onclick="ekStepNav(1)">WEITER <i class="bi bi-arrow-right ms-1"></i></button>
      <button class="btn btn-success px-4 fw-bold" id="ek-save-btn" style="display:none" onclick="saveEKForm()"><i class="bi bi-bookmark-check me-1"></i>VORMERKEN</button>
    </div>
  </div>
</div>

<!-- Delete Confirm -->
<div class="moverlay" id="del-modal">
  <div class="msheet">
    <div class="mhead"><h3>LÖSCHEN?</h3><button class="btn btn-sm btn-outline-secondary" onclick="closeDelModal()"><i class="bi bi-x-lg"></i></button></div>
    <div class="mbody"><p id="del-modal-text" style="color:var(--w3);font-size:13px;margin:0;font-family:'Space Mono',monospace"></p></div>
    <div class="mfoot">
      <button class="btn btn-outline-secondary btn-sm" onclick="closeDelModal()">ABBRECHEN</button>
      <button class="btn btn-danger fw-bold" id="del-modal-confirm"><i class="bi bi-trash3 me-1"></i>LÖSCHEN</button>
    </div>
  </div>
</div>

<!-- Account Modal -->
<div class="moverlay" id="acc-modal">
  <div class="msheet">
    <div class="mhead"><h3>TEAM & ACCOUNTS</h3><button class="btn btn-sm btn-outline-secondary" onclick="closeAccModal()"><i class="bi bi-x-lg"></i></button></div>
    <div class="mbody" style="padding:0">
      <div style="display:flex;border-bottom:1px solid var(--e1)">
        <button id="acctab-team"    onclick="setAccTab('team')"    style="flex:1;padding:10px 6px;border:none;background:var(--b3);font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:var(--acc);cursor:pointer;border-bottom:2px solid var(--acc);letter-spacing:.5px;text-transform:uppercase">TEAM</button>
        <button id="acctab-invite"  onclick="setAccTab('invite')"  style="flex:1;padding:10px 6px;border:none;background:none;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:var(--w4);cursor:pointer;border-bottom:2px solid transparent;letter-spacing:.5px;text-transform:uppercase">EINLADEN</button>
        <button id="acctab-reports" onclick="setAccTab('reports')" style="flex:1;padding:10px 6px;border:none;background:none;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:var(--w4);cursor:pointer;border-bottom:2px solid transparent;letter-spacing:.5px;text-transform:uppercase">BERICHTE</button>
      </div>
      <div style="padding:13px">
        <div class="diag" id="acc-diag"></div>
        <div id="accpanel-team"><div class="slabel">MITARBEITER</div><div id="acc-list"><div style="text-align:center;padding:16px;color:var(--w4);font-family:'Space Mono',monospace;font-size:10px"><span class="spin-b"></span></div></div></div>
        <div id="accpanel-invite" style="display:none">
          <div class="slabel">EINLADEN PER EMAIL</div>
          <div class="mb-2"><label class="fl">NAME *</label><input type="text" id="acc-name-in" class="fc" placeholder="vorname nachname" autocomplete="off"/></div>
          <div class="mb-2"><label class="fl">E-MAIL *</label><input type="email" id="acc-email-in" class="fc" placeholder="mitarbeiter@email.de"/></div>
          <div class="mb-3"><label class="fl">ROLLE</label>
            <select id="acc-rolle-in" class="fc"><option value="mitarbeiter">Mitarbeiter</option><option value="senior">Senior</option><option value="owner">Inhaber</option></select>
          </div>
          <button class="btn btn-primary w-100 fw-bold mb-2" onclick="sendInvite()"><i class="bi bi-envelope me-2"></i>EINLADUNG SENDEN</button>
          <div style="background:var(--b3);border-radius:var(--r);padding:9px 11px;font-size:10px;color:var(--w4);line-height:1.7;font-family:'Space Mono',monospace">Der Mitarbeiter erhält einen Aktivierungslink + Haftungsklausel.</div>
        </div>
        <div id="accpanel-reports" style="display:none">
          <div class="slabel">BERICHTE</div>
          <div style="background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:12px;margin-bottom:9px">
            <div style="font-size:12px;font-weight:700;color:var(--w1);margin-bottom:3px;font-family:'Space Mono',monospace">PDF MONATSBERICHT</div>
            <div style="font-size:10px;color:var(--w4);margin-bottom:9px;font-family:'Space Mono',monospace">Verkauf + Einkauf → ReTechnologies42@gmail.com</div>
            <button class="btn btn-outline-secondary w-100 btn-sm" onclick="triggerPDFExport()"><i class="bi bi-file-pdf me-2" style="color:var(--col-r)"></i>JETZT SENDEN</button>
          </div>
          <div style="background:var(--b3);border:1px solid var(--e1);border-radius:var(--r);padding:12px">
            <div style="font-size:10px;color:var(--w3);font-family:'Space Mono',monospace">Auto: jeden 1. des Monats via GAS-Trigger</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Reklamation Modal - Stepper -->
<div class="moverlay" id="rt-modal">
  <div class="msheet">
    <div class="mhead">
      <div style="flex:1">
        <h3>REKLAMATION</h3>
        <div style="margin-top:3px">
          <div class="progress"><div class="progress-bar" id="rt-prog" style="width:33%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px">
            <span style="font-size:9px;color:var(--w4);font-family:monospace" id="rt-step-lbl">STEP 1/3</span>
            <span style="font-size:9px;color:var(--acc);font-family:monospace" id="rt-step-name">PRODUKT</span>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-secondary" onclick="closeRTModal()" style="margin-left:10px"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="mbody">
      <div class="diag" id="rt-diag"></div>
      <input type="hidden" id="rt-verkauf-zeile" value=""/>
      <div id="rts-1">
        <div class="step-title">PRODUKT & KUNDE</div>
        <div class="step-sub">Was wird reklamiert? Von wem?</div>
        <div class="mb-2"><label class="fl">PRODUKT *</label><input type="text" id="rt-produkt" class="fc" placeholder="Produktname"/></div>
        <div class="row g-2 mb-2">
          <div class="col-6"><label class="fl">KUNDE</label><input type="text" id="rt-kunde" class="fc" placeholder="Name"/></div>
          <div class="col-6"><label class="fl">SCAN-ID</label>
            <div style="display:flex;gap:5px">
              <input type="text" id="rt-scanid" class="fc" placeholder="optional" style="font-family:monospace"/>
              <button class="btn btn-outline-secondary btn-sm" onclick="openRTScanner()"><i class="bi bi-upc-scan"></i></button>
            </div>
          </div>
        </div>
      </div>
      <div id="rts-2" style="display:none">
        <div class="step-title">REKLAMATIONSGRUND</div>
        <div class="step-sub">Was ist der Grund der Reklamation?</div>
        <div class="mb-3">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">
            <button class="cbtn" id="rtg-defekt" onclick="selRTGrund('Defekt erhalten')"><span class="ci" style="font-size:17px">🔧</span>DEFEKT</button>
            <button class="cbtn" id="rtg-falsch" onclick="selRTGrund('Falsches Produkt')"><span class="ci" style="font-size:17px">❌</span>FALSCHES PRODUKT</button>
            <button class="cbtn" id="rtg-beschaedigt" onclick="selRTGrund('Beschädigte Verpackung')"><span class="ci" style="font-size:17px">📦</span>BESCHÄDIGT</button>
            <button class="cbtn" id="rtg-nonfunc" onclick="selRTGrund('Nicht funktionsfähig')"><span class="ci" style="font-size:17px">⚠️</span>NICHT FUNKTIONSFÄHIG</button>
            <button class="cbtn" id="rtg-sonstiges" onclick="selRTGrund('Sonstiges')" style="grid-column:1/-1"><span class="ci" style="font-size:17px">💬</span>SONSTIGES</button>
          </div>
          <input type="hidden" id="rt-grund" value=""/>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6"><label class="fl">STATUS</label>
            <select id="rt-status" class="fc"><option>Offen</option><option>In Bearbeitung</option><option>Erstattet</option><option>Abgelehnt</option></select>
          </div>
          <div class="col-6"><label class="fl">ERSTATTUNG (€)</label><input type="number" id="rt-erstattung" class="fc" placeholder="0.00" style="font-family:monospace"/></div>
        </div>
        <div class="mb-2"><label class="fl">HINWEISE</label><textarea id="rt-hinweise" class="fc" rows="2"></textarea></div>
      </div>
      <div id="rts-3" style="display:none">
        <div class="step-title">ABSCHLUSS</div>
        <div class="step-sub">Zusammenfassung und speichern.</div>
        <div id="rt-summary" style="background:var(--b3);border:1px solid var(--e2);border-radius:var(--r);padding:11px 12px;font-size:11px;color:var(--w3);font-family:monospace;margin-bottom:12px;line-height:1.8"></div>
        <div class="mb-2"><label class="fl">MITARBEITER</label><input type="text" id="rt-ma" class="fc"/></div>
      </div>
    </div>
    <div style="padding:10px 13px;border-top:1px solid var(--e1);display:flex;gap:7px;justify-content:space-between">
      <button class="btn btn-outline-secondary" id="rt-back-btn" onclick="rtStepNav(-1)" disabled><i class="bi bi-arrow-left"></i></button>
      <button class="btn btn-primary px-4 fw-bold" id="rt-next-btn" onclick="rtStepNav(1)">WEITER <i class="bi bi-arrow-right ms-1"></i></button>
      <button class="btn btn-danger px-4 fw-bold" id="rt-save-btn" style="display:none" onclick="saveRTForm()"><i class="bi bi-check-lg me-1"></i>SPEICHERN</button>
    </div>
  </div>
</div>

<!-- China Modal -->
<div class="moverlay" id="china-modal">
  <div class="msheet">
    <div class="mhead"><h3>CHINA IMPORT</h3><button class="btn btn-sm btn-outline-secondary" onclick="closeChinaModal()"><i class="bi bi-x-lg"></i></button></div>
    <div class="mbody">
      <div class="diag" id="china-diag"></div>
      <div class="row g-2 mb-2">
        <div class="col-8"><label class="fl">BESCHREIBUNG *</label><input type="text" id="cn-desc" class="fc" placeholder="z.B. 50x iphone hüllen"/></div>
        <div class="col-4"><label class="fl">ANZAHL</label><input type="number" id="cn-qty" class="fc" placeholder="50" style="font-family:'Space Mono',monospace"/></div>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-4"><label class="fl">WARENWERT (€)</label><input type="number" id="cn-wert" class="fc" placeholder="0.00" oninput="calcChinaCosts()" style="font-family:'Space Mono',monospace"/></div>
        <div class="col-4"><label class="fl">FRACHT (€)</label><input type="number" id="cn-fracht" class="fc" placeholder="0.00" oninput="calcChinaCosts()" style="font-family:'Space Mono',monospace"/></div>
        <div class="col-4"><label class="fl">ZOLL (€)</label><input type="number" id="cn-zoll" class="fc" placeholder="0.00" oninput="calcChinaCosts()" style="font-family:'Space Mono',monospace"/></div>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-6"><label class="fl">LIEFERANT</label><input type="text" id="cn-supplier" class="fc" placeholder="z.B. alibaba"/></div>
        <div class="col-6"><label class="fl">STATUS</label>
          <select id="cn-status" class="fc"><option>Bestellt</option><option>Unterwegs</option><option>Angekommen</option><option>Eingelagert</option></select>
        </div>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-6"><label class="fl">BESTELLDATUM</label><input type="date" id="cn-date" class="fc"/></div>
        <div class="col-6"><label class="fl">TRACKING-NR.</label><input type="text" id="cn-track" class="fc" placeholder="optional" style="font-family:'Space Mono',monospace"/></div>
      </div>
      <div id="cn-cost-summary" style="display:none;background:var(--b3);border:1px solid var(--e2);border-radius:var(--r);padding:9px 11px;margin-top:7px;font-family:'Space Mono',monospace;font-size:11px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--w3)">GESAMT:</span><span style="font-weight:700;color:var(--w1)" id="cn-total-preview">–</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:3px"><span style="color:var(--w3)">PRO STÜCK:</span><span style="font-weight:700;color:var(--col-y)" id="cn-per-item">–</span></div>
      </div>
      <div class="mb-2 mt-2"><label class="fl">HINWEISE</label><textarea id="cn-notes" class="fc" rows="2"></textarea></div>
    </div>
    <div class="mfoot">
      <button class="btn btn-outline-danger btn-sm" id="cn-del-btn" style="display:none" onclick="deleteChinaEntry()"><i class="bi bi-trash3"></i></button>
      <button class="btn btn-outline-secondary btn-sm" onclick="closeChinaModal()">ABBRECHEN</button>
      <button class="btn btn-primary fw-bold" onclick="saveChinaEntry()"><i class="bi bi-check-lg me-1"></i>SPEICHERN</button>
    </div>
  </div>
</div>

<!-- Multi-Select -->
<div class="moverlay" id="vk-multi-overlay">
  <div class="msheet" style="max-height:80vh;display:flex;flex-direction:column">
    <div class="mhead"><h3>ARTIKEL WÄHLEN</h3><button class="btn btn-sm btn-outline-secondary" onclick="closeVKMulti()"><i class="bi bi-x-lg"></i></button></div>
    <div style="padding:10px 13px;border-bottom:1px solid var(--e1)"><input type="text" id="vkm-search" class="fc" placeholder="suchen..." oninput="filterVKMulti()"/></div>
    <div id="vkm-list" style="overflow-y:auto;flex:1;padding:6px"></div>
    <div style="padding:10px 13px;border-top:1px solid var(--e1);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:10px;color:var(--w4);font-family:'Space Mono',monospace"><span id="vkm-cnt">0</span> AUSGEWÄHLT · EK: <span id="vkm-ek-total" style="color:var(--col-y)">0€</span></span>
      <button class="btn btn-primary fw-bold" onclick="applyVKMulti()"><i class="bi bi-check me-1"></i>ÜBERNEHMEN</button>
    </div>
  </div>
</div>

<!-- Upload Wizard -->
<div class="moverlay" id="upload-wizard">
  <div class="msheet">
    <div class="mhead">
      <div style="flex:1">
        <h3 id="uw-title">UPLOAD WIZARD</h3>
        <div style="margin-top:3px">
          <div class="progress"><div class="progress-bar" id="uw-prog" style="width:33%"></div></div>
          <span style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace" id="uw-step-lbl">STEP 1/3</span>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-secondary" onclick="closeUploadWizard()" style="margin-left:10px"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="mbody">
      <div class="diag" id="uw-diag"></div>
      <div id="uws-1">
        <div class="step-title">ARTIKEL</div>
        <div class="step-sub">Noch nicht hochgeladene Artikel.</div>
        <input type="text" id="uw-search" class="fc mb-3" placeholder="suchen..." oninput="filterUWItems()"/>
        <div id="uw-items" style="max-height:280px;overflow-y:auto"></div>
        <div style="font-size:9px;color:var(--w4);margin-top:6px;font-family:'Space Mono',monospace"><span id="uw-selected-cnt">0</span> AUSGEWÄHLT</div>
      </div>
      <div id="uws-2" style="display:none">
        <div class="step-title">PLATTFORM</div>
        <div class="step-sub">Wo wird hochgeladen?</div>
        <div class="mb-3">
          <div class="cg2">
            <button class="cbtn" id="uwp-ka" onclick="selUWPlattform('Kleinanzeigen')"><span class="ci" style="font-size:16px">🟡</span>KLEINANZEIGEN</button>
            <button class="cbtn" id="uwp-eb" onclick="selUWPlattform('eBay')"><span class="ci" style="font-size:16px">🛒</span>EBAY</button>
            <button class="cbtn" id="uwp-fb" onclick="selUWPlattform('Facebook')"><span class="ci" style="font-size:16px">📘</span>FACEBOOK</button>
            <button class="cbtn" id="uwp-so" onclick="selUWPlattform('Sonstiges')"><span class="ci" style="font-size:16px">📦</span>SONSTIGES</button>
          </div>
          <input type="hidden" id="uw-plattform" value=""/>
        </div>
        <div id="uw-price-list"></div>
      </div>
      <div id="uws-3" style="display:none">
        <div class="step-title">LINKS & FOTOS</div>
        <div class="step-sub">Anzeigen-Links eintragen.</div>
        <div id="uw-link-list"></div>
        <div class="mt-3">
          <label class="fl">FOTOS</label>
          <div class="photo-zone" onclick="triggerUWPhoto()">
            <div class="pz-top"><i class="bi bi-camera-plus"></i><div class="pz-l">Fotos hinzufügen</div></div>
          </div>
          <div class="photo-thumbs mt-2" id="uw-photo-thumbs"></div>
        </div>
      </div>
    </div>
    <div style="padding:10px 13px;border-top:1px solid var(--e1);display:flex;gap:7px;justify-content:space-between">
      <button class="btn btn-outline-secondary" id="uw-back-btn" onclick="uwStepNav(-1)" disabled><i class="bi bi-arrow-left"></i></button>
      <button class="btn btn-primary px-4 fw-bold" id="uw-next-btn" onclick="uwStepNav(1)">WEITER <i class="bi bi-arrow-right ms-1"></i></button>
      <button class="btn btn-primary px-4 fw-bold" id="uw-save-btn" style="display:none" onclick="saveUploadWizard()"><i class="bi bi-megaphone me-1"></i>HOCHLADEN</button>
    </div>
  </div>
</div>

<!-- Profil Overlay -->
<div class="detail-overlay" id="profil-overlay">
  <div style="position:sticky;top:0;z-index:10;background:rgba(0,0,0,.95);backdrop-filter:blur(10px);padding:10px 13px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--e1)">
    <button onclick="document.getElementById('profil-overlay').classList.remove('open')" style="background:none;border:none;color:var(--w1);font-size:20px;cursor:pointer;padding:0"><i class="bi bi-arrow-left"></i></button>
    <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--w1)">MEIN PROFIL</span>
    <button onclick="changeEmp()" style="margin-left:auto;background:none;border:1px solid var(--e2);color:var(--w3);border-radius:var(--r);padding:4px 10px;cursor:pointer;font-size:11px;font-family:'Space Mono',monospace;font-weight:700;letter-spacing:.5px">ABMELDEN</button>
  </div>
  <div style="padding:20px 13px">
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--b3);border:2px solid var(--acc);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--acc);margin:0 auto 10px" id="profil-avatar">?</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:3px;color:var(--w1)" id="profil-name">–</div>
      <div style="font-size:10px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:1px;margin-top:2px">MITARBEITER // STOCKMASTER PRO</div>
    </div>
    <div style="font-size:9px;color:var(--w4);text-align:center;margin-bottom:7px;font-family:'Space Mono',monospace;letter-spacing:.5px;text-transform:uppercase">STATISTIKEN // GESAMT</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:9px">
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:11px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;color:var(--col-b)" id="ps-eingelagert">–</div>
        <div class="kpi-l">EINGELAGERT</div>
      </div>
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:11px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;color:var(--acc)" id="ps-verkauft">–</div>
        <div class="kpi-l">VERKÄUFE</div>
      </div>
      <div style="background:var(--b2);border:1px solid var(--e1);border-radius:var(--r-lg);padding:11px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;color:var(--col-r)" id="ps-retouren">–</div>
        <div class="kpi-l">RETOUREN</div>
      </div>
    </div>
    <div style="font-size:9px;color:var(--acc);text-align:center;margin-bottom:9px;font-family:'Space Mono',monospace;letter-spacing:.5px">7-TAGE REVIEW</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:20px">
      <div style="background:var(--b2);border:1px solid rgba(77,159,255,.2);border-radius:var(--r-lg);padding:11px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:var(--col-b)" id="ps-7d-eingelagert">–</div>
        <div class="kpi-l">EINGELAGERT (7T)</div>
      </div>
      <div style="background:var(--b2);border:1px solid rgba(0,255,136,.2);border-radius:var(--r-lg);padding:11px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:var(--acc)" id="ps-7d-verkauft">–</div>
        <div class="kpi-l">VERKÄUFE (7T)</div>
      </div>
    </div>
    <div class="slabel">AKTIVITÄTSLOG</div>
    <div id="profil-log" style="max-height:320px;overflow-y:auto"></div>
  </div>
</div>

<!-- Detail Overlay -->
<div class="detail-overlay" id="detail-overlay">
  <div style="position:sticky;top:0;z-index:10;background:rgba(0,0,0,.95);backdrop-filter:blur(10px);padding:10px 13px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--e1)">
    <button onclick="closeDetail()" style="background:none;border:none;color:var(--w1);font-size:20px;cursor:pointer;padding:0"><i class="bi bi-arrow-left"></i></button>
    <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1.5px;color:var(--w1)" id="detail-header-title">DETAIL</span>
    <div style="margin-left:auto;display:flex;gap:6px">
      <button id="detail-edit-btn" class="btn btn-outline-primary btn-sm"><i class="bi bi-pencil-fill"></i></button>
    </div>
  </div>
  <div id="detail-photo-tabs" style="display:none;background:var(--b1);border-bottom:1px solid var(--e1)"></div>
  <div id="detail-hero" class="detail-hero-empty">📦</div>
  <div id="detail-thumbs" class="detail-photos" style="display:none"></div>
  <div class="detail-body">
    <div class="detail-title" id="detail-title"></div>
    <div id="detail-ka-badge" style="margin-bottom:7px"></div>
    <div class="detail-price" id="detail-price"></div>
    <div class="detail-price-sub" id="detail-price-sub"></div>
    <div id="detail-upload-photos-wrap" style="display:none;margin-bottom:13px">
      <div class="slabel" style="color:var(--col-b)">ANZEIGEN-FOTOS</div>
      <div id="detail-upload-photos" style="display:flex;flex-wrap:wrap;gap:5px"></div>
    </div>
    <div id="detail-links-wrap" style="display:none;margin-bottom:13px">
      <div class="slabel" style="color:var(--col-b)">ANZEIGEN-LINKS</div>
      <div id="detail-links"></div>
    </div>
    <div id="detail-specs"></div>
    <div id="detail-defekt-wrap" style="display:none;margin:13px 0">
      <div class="slabel" style="color:var(--col-r)">DEFEKT-FOTOS</div>
      <div id="detail-defekt-fotos" style="display:flex;flex-wrap:wrap;gap:5px"></div>
    </div>
    <div id="detail-notes" style="display:none;margin-top:10px;padding:10px 12px;background:var(--b2);border-radius:var(--r);font-size:12px;color:var(--w3);font-family:'Space Mono',monospace"></div>
  </div>
</div>

<!-- Notifications -->
<div class="notif-overlay" id="notif-overlay">
  <div class="notif-panel">
    <div class="notif-head">
      <h3>NACHRICHTEN</h3>
      <div style="display:flex;gap:7px;align-items:center">
        <button onclick="clearAllNotifications()" class="btn btn-sm btn-outline-secondary" style="font-size:10px;padding:3px 8px;font-family:'Space Mono',monospace">ALLE LÖSCHEN</button>
        <button onclick="closeNotifications()" style="background:var(--b3);border:1px solid var(--e2);color:var(--w1);border-radius:4px;padding:4px 9px;cursor:pointer;font-size:13px;font-family:'Space Mono',monospace">✕</button>
      </div>
    </div>
    <div class="notif-list" id="notif-list"><div class="notif-empty"><i class="bi bi-bell-slash"></i><p style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.5px;text-transform:uppercase">KEINE NACHRICHTEN</p></div></div>
  </div>
</div>

<!-- Mandatory Notif Overlay -->
<div id="mandatory-notif-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9990;flex-direction:column;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)">
  <div style="background:var(--b2);border:1px solid var(--acc);border-radius:var(--r-xl);max-width:400px;width:100%;overflow:hidden;box-shadow:0 0 40px rgba(0,255,136,.1)">
    <div style="background:rgba(0,255,136,.06);padding:14px 16px;border-bottom:1px solid var(--e1)">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--acc)">PFLICHT-BENACHRICHTIGUNG</div>
      <div style="font-size:10px;color:var(--w4);font-family:'Space Mono',monospace;margin-top:1px;letter-spacing:.5px">BITTE BESTÄTIGEN UM FORTZUFAHREN</div>
    </div>
    <div style="padding:14px 16px">
      <div style="font-size:14px;font-weight:700;color:var(--w1);margin-bottom:5px;font-family:'Space Mono',monospace" id="mn-titel"></div>
      <div style="font-size:12px;color:var(--w3);line-height:1.6;margin-bottom:13px" id="mn-body"></div>
      <div style="font-size:9px;color:var(--w4);margin-bottom:13px;font-family:'Space Mono',monospace" id="mn-date"></div>
      <button class="btn btn-primary w-100 fw-bold" onclick="confirmCurrentNotif()" style="letter-spacing:1px">✓ BESTÄTIGEN</button>
    </div>
    <div style="padding:6px 16px 12px;text-align:center"><span style="font-size:9px;color:var(--w4);font-family:'Space Mono',monospace;letter-spacing:.5px" id="mn-counter"></span></div>
  </div>
</div>

<!-- Activation Overlay -->
<div id="activation-overlay" style="display:none;position:fixed;inset:0;background:var(--b0);z-index:10000;overflow-y:auto">
  <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
    <div style="background:var(--b2);border:1px solid var(--e2);border-radius:var(--r-xl);max-width:400px;width:100%;padding:24px 20px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:4px;color:var(--acc);margin-bottom:3px">AKTIVIERUNG</div>
      <div style="font-size:11px;color:var(--w3);margin-bottom:18px;font-family:'Space Mono',monospace;letter-spacing:.5px">PASSWORT FESTLEGEN</div>
      <div class="diag" id="act-diag"></div>
      <label class="fl">DEIN NAME</label>
      <input type="text" id="act-name" class="fc mb-3" placeholder="vorname nachname"/>
      <label class="fl">PASSWORT</label>
      <input type="password" id="act-pw" class="fc mb-2" placeholder="mindestens 6 zeichen"/>
      <label class="fl">WIEDERHOLEN</label>
      <input type="password" id="act-pw2" class="fc mb-3"/>
      <div style="background:var(--b3);border:1px solid var(--e2);border-radius:var(--r);padding:11px 12px;font-size:10px;color:var(--w4);line-height:1.8;margin-bottom:11px;font-family:'Space Mono',monospace">
        <strong style="color:var(--w2)">// HAFTUNGSERKLÄRUNG</strong><br>
        Mit der Aktivierung bestätigst du, dass alle unter deinem Klarnamen durchgeführten Aktionen dir persönlich zugerechnet werden. Du haftest für die Richtigkeit der von dir erfassten Daten. Jede Transaktion wird protokolliert. Bei vorsätzlicher Falschangabe oder grober Fahrlässigkeit behält sich das Unternehmen rechtliche Schritte vor.
      </div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:11px;color:var(--w3);cursor:pointer;margin-bottom:14px;font-family:'Space Mono',monospace">
        <input type="checkbox" id="act-chk" style="margin-top:2px;flex-shrink:0;accent-color:var(--acc)"/>
        HAFTUNGSERKLÄRUNG AKZEPTIEREN
      </label>
      <button class="btn btn-primary w-100 fw-bold" id="act-btn" onclick="doActivation()" style="letter-spacing:1px">ACCOUNT AKTIVIEREN →</button>
      <input type="hidden" id="act-token" value=""/>
    </div>
  </div>
</div>

<!-- Search Scanner -->
<div class="scan-overlay hidden" id="search-scan-overlay">
  <div class="scan-overlay-video">
    <video id="search-scan-video" autoplay playsinline muted></video>
    <canvas id="search-scan-canvas" style="display:none"></canvas>
    <div class="scan-overlay-frame"><div></div></div>
    <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:var(--acc);border-radius:20px;padding:4px 12px;font-size:10px;font-weight:700;font-family:'Space Mono',monospace;letter-spacing:.5px" id="search-scan-hint">PRODUKT SCANNEN</div>
  </div>
  <div style="margin-top:14px;text-align:center">
    <p style="color:var(--w3);font-size:11px;margin-bottom:11px;font-family:'Space Mono',monospace;letter-spacing:.5px">BARCODE WIRD AUTOMATISCH ERKANNT</p>
    <button class="btn btn-outline-secondary" onclick="closeSearchScanner()"><i class="bi bi-x-circle me-1"></i>ABBRECHEN</button>
  </div>
</div>

<!-- Global Cam Bar -->
<div id="global-cam-bar" style="display:none;position:fixed;top:50px;left:0;right:0;z-index:8000;background:rgba(0,0,0,.98);border-bottom:1px solid var(--e1);padding:7px 12px;align-items:center;gap:8px">
  <i class="bi bi-camera-video" style="color:var(--acc);font-size:14px"></i>
  <select id="global-cam-select" class="fc" style="flex:1;font-size:11px;padding:5px 10px;font-family:'Space Mono',monospace" onchange="onGlobalCamChange()">
    <option value="">KAMERA WÄHLEN...</option>
  </select>
  <button onclick="hideGlobalCamBar()" style="background:none;border:none;color:var(--w4);font-size:16px;cursor:pointer;padding:0"><i class="bi bi-x"></i></button>
</div>

<!-- File inputs -->
<input type="file" id="f-photo-cam"     accept="image/*" capture="environment" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0"/>
<input type="file" id="f-photo-gallery" accept="image/*"                       style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0"/>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="app.js"></script>
</body>
</html>
