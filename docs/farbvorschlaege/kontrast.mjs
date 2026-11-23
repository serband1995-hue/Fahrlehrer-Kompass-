const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*t+parseInt(b.slice(i,i+2),16)*(1-t)).toString(16).padStart(2,'0')).join('');
const cr=(a,b)=>{const x=L(a),y=L(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
const S={
 "heute hell":{bg:"#f3f1e9",su:"#fffdf7",su2:"#ece7d8",ln:"#ddd5bd",txt:"#23261d",mu:"#5f5e4b",fa:"#8d8a6a",ak:"#3a7350",akd:"#2f5d3f",nav:mix("#3a7350","#fffdf7",.12)},
 "heute dunkel":{bg:"#0c1410",su:"#16221c",su2:"#1f2d25",ln:"#2e3f35",txt:"#eef3ef",mu:"#b1bfb5",fa:"#7d8d82",ak:"#4a8b5c",akd:"#7fbf95",nav:mix("#4a8b5c","#16221c",.2)},
 "A hell":{bg:"#f4f4f5",su:"#ffffff",su2:"#ececee",ln:"#d2d2d7",txt:"#1c1c1f",mu:"#52525a",fa:"#74747d",ak:"#3a7350",akd:"#2f5d3f",nav:"#ececee"},
 "A dunkel":{bg:"#18181b",su:"#232327",su2:"#2d2d32",ln:"#3f3f46",txt:"#f2f2f4",mu:"#b6b6be",fa:"#8b8b95",ak:"#3f8453",akd:"#86c79c",nav:"#2d2d32"},
 "B hell":{bg:"#fbfbfc",su:"#ffffff",su2:"#f4f4f6",ln:"#e2e2e7",txt:"#24242a",mu:"#5a5a65",fa:"#73737f",ak:"#2f6b47",akd:"#2f6b47",nav:"#ffffff"},
 "B dunkel":{bg:"#1b1f27",su:"#232933",su2:"#2b323e",ln:"#38414f",txt:"#eceff4",mu:"#b2bac7",fa:"#8893a3",ak:"#3f7f58",akd:"#8fcaa4",nav:"#232933"}};
console.log("| Stand | Text/Fläche | Text/Hintergrund | Grau-Text/Fläche | Hinweistext/Fläche | Knopftext weiß/Grün | Link/Fläche | Grün-Strich/Fläche (≥3) | Rahmen/Fläche |\n|---|---|---|---|---|---|---|---|---|");
for(const[k,s]of Object.entries(S))console.log(`| ${k} | ${cr(s.txt,s.su)} | ${cr(s.txt,s.bg)} | ${cr(s.mu,s.su)} | ${cr(s.fa,s.su)} | ${cr("#ffffff",s.ak)} | ${cr(s.akd,s.su)} | ${cr(s.ak,s.nav)} | ${cr(s.ln,s.su)} |`);
