// Kontrast der App-Farben (index.html, Farbwahl B). Aufruf: node docs/farbvorschlaege/kontrast-app.mjs
const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const S={
 hell:{bg:"#f1f1f4",su:"#ffffff",su2:"#e9e9ee",txt:"#24242a",mu:"#5a5a65",fa:"#66666f",ak:"#2f6b47",akt:"#2f6b47",feld:"#85858f",fokus:"#2f6b47",rot:"#a8321f",kg:"#f1f1f4",kt:"#24242A",kt2:"#5A5A65",kak:"#2F6B47",kkarte:"#FFFFFF",hero:"#24242A",herotxt:"#ffffff",hero2:"#c5c9d2",pill:"#24242a"},
 dunkel:{bg:"#1b1f27",su:"#232933",su2:"#2b323e",txt:"#eceff4",mu:"#b2bac7",fa:"#98a2b2",ak:"#3f7f58",akt:"#8fcaa4",feld:"#7a8598",fokus:"#8fcaa4",rot:"#ff9a8a",kg:"#1b1f27",kt:"#eceff4",kt2:"#b2bac7",kak:"#8fcaa4",kkarte:"#232933",hero:"#2f3846",herotxt:"#ffffff",hero2:"#c5c9d2",pill:"#eceff4"}};
const rows=[["Text/Fläche",s=>[s.txt,s.su,4.5]],["Text/Hintergrund",s=>[s.txt,s.bg,4.5]],["Text/Fläche 2",s=>[s.txt,s.su2,4.5]],["Nebentext/Fläche",s=>[s.mu,s.su,4.5]],["Nebentext/Hintergrund",s=>[s.mu,s.bg,4.5]],["Nebentext/Fläche 2",s=>[s.mu,s.su2,4.5]],
 ["Blasser Text/Fläche",s=>[s.fa,s.su,4.5]],["Blasser Text/Hintergrund",s=>[s.fa,s.bg,4.5]],["Blasser Text/Fläche 2",s=>[s.fa,s.su2,4.5]],["Weiß/Knopf grün",s=>["#ffffff",s.ak,4.5]],["Grüner Text/Fläche",s=>[s.akt,s.su,4.5]],
 ["Feldrahmen/Hintergrund",s=>[s.feld,s.bg,3]],["Feldrahmen/Fläche",s=>[s.feld,s.su,3]],["Fokus-Ring/Fläche",s=>[s.fokus,s.su,3]],["Fokus-Ring/Hintergrund",s=>[s.fokus,s.bg,3]],["Rot-Text/Fläche",s=>[s.rot,s.su,4.5]],
 ["Heute: Nebentext/Karte",s=>[s.kt2,s.kkarte,4.5]],["Heute: Grün/Karte",s=>[s.kak,s.kkarte,4.5]],["Heute: Weiß/Hero-Karte",s=>[s.herotxt,s.hero,4.5]],["Heute: Hero-Nebentext/Hero",s=>[s.hero2,s.hero,4.5]],["Heute: Mint-Knopf (Text #0E2A1B auf #5BD18E)",s=>["#0E2A1B".toLowerCase(),"#5bd18e",4.5]]];
console.log("| Paar | min | App hell | App dunkel |\n|---|---|---|---|");
for(const [n,f] of rows){const c=Object.values(S).map(s=>{const [a,b,m]=f(s);const v=cr(a,b);return v.toFixed(2)+(v<m?" ✗":"")});console.log(`| ${n} | ${f(S.hell)[2]} | ${c.join(" | ")} |`)}
