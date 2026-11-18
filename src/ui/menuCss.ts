/**
 * Base menu styles (docs/ui-style.md): dark glass panels, cyan hairlines, magenta for the one primary action, italic
 * heavy titles. Class names are a contract used by every screen and by the e2e / viewport checks: keep them.
 * No backdrop-filter on full-screen layers (it costs a full-screen blur per frame on phones).
 */
export const MENU_CSS = `
.rb-layer{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;justify-content:safe center;gap:clamp(8px,1.8vh,14px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));color:var(--text);font:600 clamp(14px,0.35vw + 9px,22px) var(--font);z-index:30;text-shadow:0 1px 2px #000c;user-select:none;scrollbar-width:thin;scrollbar-color:#18d8ff55 transparent}
.rb-layer.dim{background:radial-gradient(ellipse 120% 90% at 50% 40%,#05060d88 0%,#05060de0 70%,#05060df5 100%)}
.rb-layer.rb-hero{background:linear-gradient(0deg,#05060df2 0%,#05060d99 32%,#05060d00 62%)}
.rb-title{font-size:clamp(30px,min(9vw,11vh),96px);flex:none;font-style:italic;font-weight:900;letter-spacing:-2px;line-height:1;color:#fff;text-shadow:0 0 18px #ff2a9d,0 0 50px #18d8ff;margin:0;text-align:center}
h2.rb-title{font-size:clamp(26px,min(6vw,8vh),58px);letter-spacing:-1px;margin-top:max(4px,1vh)}
h2.rb-title::after{content:'';display:block;width:clamp(48px,6vw,84px);height:3px;margin:clamp(6px,1vh,10px) auto 0;border-radius:2px;background:linear-gradient(90deg,var(--magenta),var(--cyan));box-shadow:0 0 12px #ff2a9d88}
.rb-sub{color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;font-size:12px;line-height:1.55}
.rb-btn{position:relative;min-width:min(240px,80vw);min-height:44px;flex:none;padding:clamp(9px,1.5vh,13px) 24px;font:inherit;font-size:.92em;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--text);background:linear-gradient(180deg,#151b36ee,#0a0d1cee);border:1px solid #18d8ff44;border-radius:9px;cursor:pointer;box-shadow:inset 0 1px 0 #ffffff14,0 4px 14px #0009;transition:transform var(--dur-fast) var(--ease),border-color var(--dur-fast),box-shadow var(--dur-fast),background var(--dur-fast)}
.rb-btn::before{content:'';position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 2px 2px 0;background:var(--cyan);opacity:0;transition:opacity var(--dur-fast)}
.rb-btn:hover,.rb-btn:focus{border-color:var(--cyan);background:linear-gradient(180deg,#1a2a4cee,#0c1226ee);box-shadow:inset 0 1px 0 #ffffff1f,0 0 0 1px #18d8ff55,0 0 24px #18d8ff44;outline:none}
.rb-btn:hover::before,.rb-btn:focus::before{opacity:1}
.rb-btn:active{filter:brightness(.88)}
.rb-btn.hot{color:#fff;background:linear-gradient(180deg,#ff3aa6,#c3127a);border-color:#ff8ccc;box-shadow:inset 0 1px 0 #ffffff40,0 0 0 1px #ff2a9d66,0 6px 22px #ff2a9d55;text-shadow:0 1px 2px #6a0038}
.rb-btn.hot:hover,.rb-btn.hot:focus{background:linear-gradient(180deg,#ff55b3,#d01886);box-shadow:inset 0 1px 0 #ffffff50,0 0 0 2px #ff8ccc,0 8px 28px #ff2a9d77}
.rb-btn.hot::before{background:#fff}
.rb-btn:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}
.rb-lbl{flex:0 1 min(160px,40%);min-width:90px;text-align:right;overflow-wrap:anywhere;color:var(--text-dim)}
.rb-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}
.rb-card{position:relative;padding:16px 20px;border:1px solid #18d8ff30;border-radius:12px;background:linear-gradient(180deg,#121833f2,#090c1af2);min-width:200px;text-align:center;box-shadow:0 10px 28px #000a,inset 0 1px 0 #ffffff12;overflow:hidden;text-shadow:none}
.rb-card::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,var(--cyan),var(--magenta));opacity:.5;pointer-events:none}
.rb-card.rb-pick{cursor:pointer;transition:transform var(--dur) var(--ease),border-color var(--dur-fast),box-shadow var(--dur)}
.rb-card.rb-pick:hover,.rb-card.rb-pick:focus-visible{border-color:var(--magenta);box-shadow:0 14px 34px #000c,0 0 26px #ff2a9d44;outline:none}
.rb-card.rb-pick:hover::before{opacity:1}
.rb-panel{position:relative;box-sizing:border-box;background:linear-gradient(180deg,#10162ef4,#070a16f4);border:1px solid #18d8ff2a;border-radius:14px;box-shadow:0 18px 50px #000c,inset 0 1px 0 #ffffff10;padding:clamp(10px,1.8vh,18px) clamp(14px,2vw,22px);text-shadow:none}
.rb-panel>h3{margin:0 0 6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--cyan);font-weight:800;display:flex;align-items:center;gap:10px}
.rb-panel>h3::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#18d8ff55,transparent)}
.rb-layer input[type=range]{-webkit-appearance:none;appearance:none;width:min(220px,50vw);height:32px;background:transparent;margin:0}
.rb-layer input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#18d8ff,#ff2a9d88);box-shadow:inset 0 0 0 1px #ffffff18}
.rb-layer input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#18d8ff,#ff2a9d88)}
.rb-layer input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;margin-top:-7px;border-radius:50%;background:#fff;border:3px solid var(--cyan);box-shadow:0 0 12px #18d8ffaa;cursor:grab}
.rb-layer input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--cyan);box-shadow:0 0 12px #18d8ffaa;cursor:grab}
.rb-layer input[type=range]:focus{outline:none}.rb-layer input[type=range]:focus::-webkit-slider-thumb{box-shadow:0 0 0 4px #18d8ff44,0 0 16px #18d8ff}
.rb-layer input[type=checkbox]{-webkit-appearance:none;appearance:none;flex:none;position:relative;width:46px;height:26px;margin:0;border-radius:13px;background:#ffffff1c;border:1px solid #ffffff38;transition:background var(--dur-fast),border-color var(--dur-fast)}
.rb-layer input[type=checkbox]::after{content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#bcd3ea;transition:transform var(--dur-fast) var(--ease),background var(--dur-fast)}
.rb-layer input[type=checkbox]:checked{background:var(--magenta);border-color:#ff8ccc;box-shadow:0 0 12px #ff2a9d66}
.rb-layer input[type=checkbox]:checked::after{transform:translateX(20px);background:#fff}
.rb-layer input[type=checkbox]:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.rb-cash{font-family:var(--font);font-weight:800;position:fixed;right:max(18px,env(safe-area-inset-right),2.5vw);top:max(14px,env(safe-area-inset-top),2vh);max-width:60vw;font-size:clamp(15px,2vw,22px);white-space:nowrap;text-align:right;color:var(--green);z-index:31;padding:6px 14px;border-radius:999px;background:#05060dcc;border:1px solid #7dff9a44;box-shadow:0 0 16px #7dff9a22;font-variant-numeric:tabular-nums}
.rb-toast{position:fixed;left:50%;bottom:max(24px,4vh);transform:translateX(-50%);padding:10px 18px;background:var(--panel-solid);border:1px solid #18d8ff88;border-radius:10px;color:var(--text);font:600 14px var(--font);z-index:60;pointer-events:none;box-shadow:0 10px 30px #000c,0 0 18px #18d8ff33;animation:rb-in var(--dur) var(--ease) backwards}
.rb-bar{height:7px;width:180px;background:#ffffff1c;border-radius:4px;overflow:hidden}
.rb-bar i{display:block;height:100%;background:linear-gradient(90deg,#18d8ff,#ff2a9d);box-shadow:0 0 8px #18d8ff88}
.rb-sw{width:24px;height:24px;border-radius:50%;border:2px solid #fff5;cursor:pointer;transition:transform var(--dur-fast) var(--ease)}
.rb-sw:hover{box-shadow:0 0 10px #fff8}.rb-sw.on{border-color:#fff;box-shadow:0 0 0 2px #05060d,0 0 0 4px #fff,0 0 12px #fff}
.rb-main{align-items:flex-start;justify-content:center;padding-left:max(env(safe-area-inset-left),clamp(16px,5vw,72px));background:linear-gradient(90deg,#05060df0 0%,#05060dc0 26%,#05060d00 58%)}
.rb-main .rb-logo{font-size:clamp(26px,min(5vw,8vh),54px);font-style:italic;font-weight:900;letter-spacing:-1px;line-height:1;color:#fff;text-shadow:0 0 16px #ff2a9d,0 0 40px #18d8ff;margin:0 0 2px}
.rb-main .rb-sub{margin-bottom:clamp(6px,2vh,18px)}
.rb-main .rb-btn{min-width:min(300px,34vw);text-align:left;padding-left:28px}
@media (max-width:600px){.rb-main .rb-btn{min-width:min(300px,72vw)}}
.rb-stack{display:flex;flex-direction:column;gap:clamp(8px,1.6vh,12px)}
@media (max-height:520px){.rb-main{gap:4px;padding-top:max(54px,calc(env(safe-area-inset-top) + 42px))}.rb-stack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rb-main .rb-btn{min-width:min(220px,30vw);padding-top:8px;padding-bottom:8px}.rb-main .rb-logo{font-size:clamp(22px,4.4vw,34px)}.rb-main .rb-sub{margin-bottom:6px}}
@media (max-height:420px){.rb-main .rb-btn{padding-top:5px;padding-bottom:5px}.rb-stack{gap:5px}.rb-main .rb-sub{display:none}}
.rb-settings{width:min(1240px,100%);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:clamp(10px,1.6vw,18px);align-items:start;flex:none}
.rb-settings .rb-panel{display:flex;flex-direction:column;gap:2px}
.rb-settings .rb-row{justify-content:flex-end;width:100%;min-height:44px;padding:3px 0;gap:8px;border-bottom:1px solid #ffffff0b}
.rb-settings .rb-row:last-child{border-bottom:0}
.rb-settings .rb-lbl{flex:1 0 130px;text-align:left;min-width:0;font-size:.88em}
.rb-settings .rb-row .rb-btn{min-width:0!important;min-height:44px;padding:7px 12px;font-size:11.5px;letter-spacing:1.2px}
.rb-settings .rb-row input[type=range]{width:min(200px,42vw)}
.rb-settings .rb-sub{text-align:left;letter-spacing:1.2px;font-size:11px}
.rb-settings details summary{min-height:44px;display:flex;align-items:center;color:var(--cyan)}
.rb-tune .rb-panel{text-align:left;display:flex;flex-direction:column}
.rb-tune .rb-panel>h3:not(:first-child){margin-top:14px}
.rb-up{justify-content:space-between!important;align-items:flex-start!important;flex-wrap:nowrap!important;padding:10px 0;border-bottom:1px solid #ffffff0d}
.rb-up:last-child{border-bottom:0}
.rb-up .u-n{font-size:15px;font-weight:800}
.rb-up .u-d{display:inline-flex;gap:4px;vertical-align:middle;margin-left:6px}
.rb-up .u-d i{width:14px;height:5px;border-radius:2px;background:#ffffff26}.rb-up .u-d i.on{background:var(--cyan);box-shadow:0 0 6px var(--cyan)}
.rb-up .u-p{font-size:12px;color:var(--text-dim);margin-top:3px}
.rb-up .u-g{font-size:12px;color:var(--green);margin-top:2px;font-variant-numeric:tabular-nums}
.rb-up .u-a{font-size:12px;color:var(--text-faint);line-height:1.4;margin-top:3px;max-width:330px;font-weight:500}
.rb-set{justify-content:space-between!important;flex-wrap:nowrap!important;width:100%;min-height:40px;gap:10px;border-bottom:1px solid #ffffff0b}
.rb-set .rb-lbl{flex:1 1 auto;text-align:left;font-size:13px}
.rb-set input[type=range]{width:min(180px,40vw)!important}
.rb-val{width:46px;text-align:right;font-size:13px;color:var(--cyan);font-variant-numeric:tabular-nums}
.rb-class{display:inline-flex;align-items:center;gap:10px;padding:4px 16px 4px 4px;border-radius:999px;border:1px solid var(--c);background:#05060dcc;font-size:24px;font-weight:900;font-style:italic;color:#fff;box-shadow:0 0 18px color-mix(in srgb,var(--c) 40%,transparent);font-variant-numeric:tabular-nums}
.rb-class span{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--c);color:#05060d;font-style:normal}
.rb-garage{display:flex;flex-direction:column;gap:6px;scrollbar-width:thin}
.rb-garage .rb-title{text-shadow:0 0 14px #ff2a9d,0 0 30px #18d8ff88;animation:none}
.rb-blurb{font-size:15px;font-weight:700;line-height:1.35;color:var(--text)}
.rb-note{font-size:12.5px;font-weight:500;line-height:1.45;color:var(--text-dim);text-align:left;padding:8px 10px;border-left:2px solid var(--cyan);background:#18d8ff0d;border-radius:0 6px 6px 0}
.rb-garage .rb-sub{margin-top:4px}
.rb-hint{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--text-faint)}
@media (min-width:2200px) and (min-height:1300px){.rb-btn{min-width:min(340px,80vw);padding:18px 30px}.rb-sub{font-size:.8em}.rb-cash{font-size:30px}}
.rb-input{min-height:44px;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--line);background:#05060dcc;color:var(--text);font:600 16px var(--font);outline:none;min-width:0}
.rb-input:focus{border-color:var(--cyan);box-shadow:var(--glow-cyan)}
`;
