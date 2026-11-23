const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const P=c=>{ if(Array.isArray(c))return c; if(c.startsWith('#'))return [...hex(c),1]; const m=c.match(/[\d.]+/g).map(Number); return [m[0],m[1],m[2],m[3]??1]};
const over=(f,b)=>{f=P(f);b=P(b);const a=f[3]??1;return [0,1,2].map(i=>f[i]*a+b[i]*(1-a))};
const mix=(a,b,t)=>{a=P(a);b=P(b);return [0,1,2].map(i=>a[i]*t+b[i]*(1-t))};
const L=c=>{const v=c.slice(0,3).map(x=>x/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
const cr=(a,b)=>{const x=L(P(a)),y=L(P(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const base={hell:{orange:'#d2782a',gold:'#b8873a',goldS:'rgba(184,135,58,.14)',rot:'#c0503f',rotS:'rgba(192,80,63,.12)',gelb:'#b9862f',gelbS:'rgba(207,154,62,.16)',gruen:'#3f9a62',gruenS:'rgba(76,175,114,.14)',blau:'#2F7DD1',blauS:'rgba(47,125,209,.12)',pg:'#7a5410',pgr:'#24693f',pr:'#a03a2b',dia:'#2e8550',vorf:'#7a5410'},
 dunkel:{orange:'#ec9a4f',gold:'#c9a227',goldS:'rgba(201,162,39,.16)',rot:'#e07060',rotS:'rgba(207,90,72,.18)',gelb:'#d9a64a',gelbS:'rgba(207,154,62,.2)',gruen:'#5cc283',gruenS:'rgba(76,175,114,.18)',blau:'#5fa0e6',blauS:'rgba(47,125,209,.2)',pg:'#d9a64a',pgr:'#5cc283',pr:'#e07060',dia:'#45a96c',vorf:'#c9a227'}};
const S={
 "heute hell":{m:'hell',bg:"#f3f1e9",su:"#fffdf7",su2:"#ece7d8",ln:"#ddd5bd",lns:"#e8e2cd",txt:"#23261d",mu:"#5f5e4b",fa:"#8d8a6a",ak:"#3a7350",akd:"#2f5d3f",aks:"rgba(58,115,80,.12)",akl:"rgba(58,115,80,.28)",rs:'#4b6455',navbg:'aks',navtxt:'akd',tabbg:'ak',tabtxt:'#ffffff',h1:['gruen',.12],h2:['gruen',.28]},
 "heute dunkel":{m:'dunkel',bg:"#0c1410",su:"#16221c",su2:"#1f2d25",ln:"#2e3f35",lns:"#223029",txt:"#eef3ef",mu:"#b1bfb5",fa:"#7d8d82",ak:"#4a8b5c",akd:"#7fbf95",aks:"rgba(74,139,92,.2)",akl:"rgba(120,170,140,.38)",rs:'#4b6455',navbg:'aks',navtxt:'akd',tabbg:'ak',tabtxt:'#ffffff',h1:['gruen',.12],h2:['gruen',.28]},
 "A hell":{m:'hell',gelb:"#a07018",orange:"#b05a14",bg:"#f4f4f5",su:"#ffffff",su2:"#ececee",ln:"#d2d2d7",lns:"#e3e3e7",feld:"#85858e",txt:"#1c1c1f",mu:"#52525a",fa:"#66666e",ak:"#3a7350",akd:"#2f5d3f",aks:"rgba(28,28,31,.06)",akl:"#2f6b47",hov:"#2f5d3f",blau:"#1d62b0",pgr:"#24693f",gt:"#24693f",rotb:"#c0503f",tabring:"#3a7350",rs:'#2b2d33',navbg:'su2',navtxt:'txt',tabbg:'su2',tabtxt:'txt',h1:['txt',.07],h2:['txt',.16]},
 "A dunkel":{m:'dunkel',bg:"#18181b",su:"#232327",su2:"#2d2d32",ln:"#3f3f46",lns:"#2f2f35",feld:"#7b7b86",txt:"#f2f2f4",mu:"#b6b6be",fa:"#9b9ba6",ak:"#3f8453",akd:"#86c79c",aks:"rgba(255,255,255,.07)",akl:"#86c79c",hov:"#306d43",blau:"#7db4f0",pr:"#f5a094",rotb:"#b3392b",tabring:"#3f8453",rs:'#2b2d33',navbg:'su2',navtxt:'txt',tabbg:'su2',tabtxt:'txt',h1:['txt',.07],h2:['txt',.16]},
 "B hell":{m:'hell',gelb:"#a07018",orange:"#b05a14",bg:"#f1f1f4",su:"#ffffff",su2:"#e9e9ee",ln:"#cdcdd5",lns:"#cdcdd5",feld:"#85858f",txt:"#24242a",mu:"#5a5a65",fa:"#66666f",ak:"#2f6b47",akd:"#2f6b47",aks:"rgba(36,36,42,.05)",akl:"#2f6b47",hov:"#2f6b47",blau:"#1d62b0",pgr:"#24693f",gt:"#24693f",rotb:"#c0503f",tabring:"#2f6b47",rs:'#2b2d33',navbg:'su2',navtxt:'txt',tabbg:'su',tabtxt:'txt',h1:['txt',.06],h2:['txt',.13]},
 "B dunkel":{m:'dunkel',bg:"#1b1f27",su:"#232933",su2:"#2b323e",ln:"#38414f",lns:"#2e3643",feld:"#7a8598",txt:"#eceff4",mu:"#b2bac7",fa:"#98a2b2",ak:"#3f7f58",akd:"#8fcaa4",aks:"rgba(255,255,255,.06)",akl:"#8fcaa4",hov:"#336a4a",blau:"#7db4f0",pr:"#f5a094",rotb:"#b3392b",tabring:"#3f7f58",rs:'#2b2d33',navbg:'su2',navtxt:'txt',tabbg:'su',tabtxt:'txt',h1:['txt',.06],h2:['txt',.13]}};
const rows=[];
for(const[k,s0]of Object.entries(S)){const s={...base[s0.m],...s0};s.rotb??=s.rot; const g=x=>s[x]??x;
 const navbg=s.navbg==='aks'?over(s.aks,s.su):P(g(s.navbg));
 const T=[
 ['txt/su',s.txt,s.su,4.5],['txt/bg',s.txt,s.bg,4.5],['txt/su2',s.txt,s.su2,4.5],
 ['muted/su',s.mu,s.su,4.5],['muted/bg',s.mu,s.bg,4.5],['muted/su2 (Pill neutral)',s.mu,s.su2,4.5],
 ['faint/su (th,Gruppen)',s.fa,s.su,4.5],['faint/bg',s.fa,s.bg,4.5],['faint/su2',s.fa,s.su2,4.5],
 ['weiss/akzent (Knopf)','#ffffff',s.ak,4.5],['weiss/Knopf-hover','#ffffff',s.hov??s.akd,4.5],
 ['link akd/su',s.akd,s.su,4.5],['link akd/bg',s.akd,s.bg,4.5],['link akd/su2',s.akd,s.su2,4.5],['akd/aks-su (kopf-wer usw.)',s.akd,over(s.aks,s.su),4.5],
 ['nav aktiv Text',g(s.navtxt),navbg,4.5],['nav Strich/navbg',s.akl.startsWith('#')?s.akl:s.ak,navbg,3],['nav Strich/su',s.akl.startsWith('#')?s.akl:s.ak,s.su,3],['nav aktiv Fläche/su (Abhebung)',navbg,s.su,0],
 ['tab aktiv Text',g(s.tabtxt),g(s.tabbg),4.5],['tab Ring akzent/tabbg',s.akl.startsWith('#')?s.akl:s.ak,g(s.tabbg),3],['tab Ring akzent/bg',s.akl.startsWith('#')?s.akl:s.ak,s.bg,3],['tab inaktiv muted/bg',s.mu,s.bg,4.5],
 ['Fokusring/su',over(s.akl,s.su),s.su,3],['Fokusring/bg',over(s.akl,s.bg),s.bg,3],['Fokusring/su2',over(s.akl,s.su2),s.su2,3],
 ['Feldrahmen/bg(Feld)',s.feld??s.ln,s.bg,3],['Feldrahmen/su(Karte)',s.feld??s.ln,s.su,3],['Feldrahmen/su2',s.feld??s.ln,s.su2,3],['Feld bg/su',s.bg,s.su,0],['Karte su/bg',s.su,s.bg,0],['Kartenrahmen lns/bg',s.lns,s.bg,0],['su2/su',s.su2,s.su,0],['su2/bg',s.su2,s.bg,0],
 ['zm-wahl aktiv Rahmen',k.startsWith('heute')?s.ak:s.txt,s.su,3],
 ['Pill rot',s.pr,over(s.rotS,s.su),4.5],['Pill rot auf bg',s.pr,over(s.rotS,s.bg),4.5],['Pill gelb',s.pg,over(s.gelbS,s.su),4.5],['Pill gelb auf bg',s.pg,over(s.gelbS,s.bg),4.5],['Pill gruen',s.pgr,over(s.gruenS,s.su),4.5],['Pill gruen auf bg',s.pgr,over(s.gruenS,s.bg),4.5],['Pill blau',s.blau,over(s.blauS,s.su),4.5],
 ['Pill blau auf bg',s.blau,over(s.blauS,s.bg),4.5],['Pill rot auf Warnzeile',s.pr,over(s.rotS,over(s.rotS,s.su)),4.5],
 ['Kachel rot/su (gross)',s.rot,s.su,3],['Kachel gruen/su (gross)',s.gruen,s.su,3],['Kachel gold/su (gross)',s.gold,s.su,3],
 ['aufgabe rot b (22px fett)',s.rot,over(s.rotS,s.su),3],['aufgabe gelb b',s.gelb,over(s.gelbS,s.su),3],['txt auf rot-soft',s.txt,over(s.rotS,s.su),4.5],
 ['weiss/rot (Zahl 14px)','#ffffff',s.rotb,4.5],['rot Text/su (fehler)',s.rot,s.su,4.5],['gruen Text/su (gelesen, ergebnis-ja)',s.gt??s.gruen,s.su,4.5],['orange/su',s.orange,s.su,4.5],
 ['pill-gruen/su (zm-haken)',s.pgr,s.su,4.5],['pill-rot/su (gefahr)',s.pr,s.su,4.5],['pill-gelb/su',s.pg,s.su,4.5],['warnhinweis pg/gelbS',s.pg,over(s.gelbS,s.su),4.5],
 ['vorfuehrung',s.vorf,over(s.goldS,s.bg),4.5],['zm-pill-test','#1d1f17',k.startsWith('heute')?s.gelb:'#d9a64a',4.5],['zm-echt','#ffffff','#8f2a1b',4.5],
 ['Rollenstreifen weiss',"#ffffff",s.rs,4.5],['toast bg/txt',s.bg,s.txt,4.5],
 ['h1 Text',s.txt,mix(g(s.h1[0]),s.su,s.h1[1]),4.5],['h2 Text',s.txt,mix(g(s.h2[0]),s.su,s.h2[1]),4.5],['h1/su',mix(g(s.h1[0]),s.su,s.h1[1]),s.su,0],['h2/h1',mix(g(s.h2[0]),s.su,s.h2[1]),mix(g(s.h1[0]),s.su,s.h1[1]),0],
 ['pr-betrag',k.startsWith('B')?s.txt:s.akd,s.su,4.5],['Schalter gruen/su',s.gruen,s.su,3],['Schalter aus Bahn/su',s.feld??s.ln,s.su,3],['pin-punkte akzent/su',s.ak,s.su,3],['Diagramm/su',s.dia,s.su,3],
 ['Platzhalter (A/B: Nebentext-Farbe)',k.startsWith('heute')?'#757575':s.mu,s.bg,4.5],
 ];
 for(const t of T)rows.push([k,t[0],cr(t[1],t[2]),t[3]]);
}
const names=[...new Set(rows.map(r=>r[1]))];const ks=Object.keys(S);
console.log(['Paar','min',...ks].join(' | '));
for(const n of names){const r=ks.map(k=>rows.find(x=>x[0]===k&&x[1]===n));console.log([n,r[0][3]||'-',...r.map(x=>x[2].toFixed(2)+(x[3]&&x[2]<x[3]?' ✗':''))].join(' | '));}
