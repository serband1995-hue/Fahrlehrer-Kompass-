# Herkunft der lokalen Dateien (W20, Fremde Server)

Alle Dateien liegen fest im Repo, nichts wird mehr von fremden Servern geladen (kein jsDelivr, cdnjs, Google Fonts).
Quelle ist jeweils das npm-Paket (`npm pack <paket>@<version>`), die Dateien sind unverändert übernommen.
Neue Version holen = Paket neu packen, Datei ersetzen, Namen/Version in den Seiten und in `sw.js` anpassen, Summe hier eintragen.

## Bibliotheken (`vendor/`)

| Datei | Paket | Version | Lizenz | Pfad im Paket |
|---|---|---|---|---|
| `supabase-js-2.119.2.js` | `@supabase/supabase-js` | 2.119.2 (das lieferte `@2` bei jsDelivr; theorie.html nutzte bisher 2.45.4) | MIT (`LICENSE-supabase-js.txt`) | `dist/umd/supabase.js` (schon minifiziert) |
| `jszip-3.10.1.min.js` | `jszip` | 3.10.1 (wie vorher bei cdnjs) | MIT oder GPL-3.0-or-later (`LICENSE-jszip.txt`) | `dist/jszip.min.js` |

## Schriften (`fonts/`)

Nur die benutzten Schnitte, nur die Teilmengen `latin` und `latin-ext`, nur WOFF2. `fonts/fonts.css` enthält alle `@font-face`
(`font-display: swap`, gleiche Familiennamen wie bei Google Fonts, `unicode-range` aus dem Paket). Lizenz aller Schriften:
SIL Open Font License 1.1 (`fonts/LICENSE-<name>.txt`). Der Browser lädt nur die Schnitte, die eine Seite wirklich zeigt.

| Familie | Paket | Version | Schnitte |
|---|---|---|---|
| Barlow | `@fontsource/barlow` | 5.3.0 | 400, 500, 600, 700, 800 |
| Anton | `@fontsource/anton` | 5.3.0 | 400 |
| Kaushan Script | `@fontsource/kaushan-script` | 5.3.0 | 400 |
| Playfair Display | `@fontsource/playfair-display` | 5.3.0 | 400, 500, 600, 700 und kursiv 500, 600 |
| Manrope | `@fontsource/manrope` | 5.3.0 | 400, 500, 600, 700, 800 |
| Outfit | `@fontsource/outfit` | 5.3.0 | 400, 500, 600, 700, 800, 900 |
| Source Serif 4 | `@fontsource-variable/source-serif-4` | 5.3.1 | variabel (opsz + wght 200–900), normal und kursiv |

## SHA-256

```
acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e  vendor/jszip-3.10.1.min.js
8816af04d9915dbba1882d6f84f0b402dc40268063a63d9c66d24f52f371c263  vendor/supabase-js-2.119.2.js
566c953c6090b1218ca6217dd7359d45dde46581968586dc607d59a78af6a9c4  vendor/LICENSE-jszip.txt
334dd6820e2eaeab2064e7c59001b810566728a28a41a7c1dbf69bbee17d0936  vendor/LICENSE-supabase-js.txt
d0fa07ff63dd60cbc0e2f58e29c802dca2a5ae0276c999f59c6111ab7bbaec3b  fonts/anton-latin-400-normal.woff2
0d17b7880f389deeb6663a52fa4eadc6d9116bdda725f0aa1f3d404fbb7d3d59  fonts/anton-latin-ext-400-normal.woff2
b0a8ad37ac45f5fb22ced461576db72e44e295107aad7a9c8a7a4bad728fd03b  fonts/barlow-latin-400-normal.woff2
cd759df8ef9efc98fee14307b4eb5ba27f08b1f8f2f3ad2872432e25c89907a8  fonts/barlow-latin-500-normal.woff2
4b52ddd4836b592df0e4832b8286956883cdc651b015126bdd18f184b7f90cc3  fonts/barlow-latin-600-normal.woff2
2d797dd8b35dcb3413e1af9d7052b3f4f8c341a147cdcb01f4f06af80db53289  fonts/barlow-latin-700-normal.woff2
231d487a993e28bc5567c2be8da48acd8e0a209891c11448491eab45db0f8d7c  fonts/barlow-latin-800-normal.woff2
122b24bc2a90b0abe189f5229768bf2e9ba641324fe2459b48850079625934f1  fonts/barlow-latin-ext-400-normal.woff2
3facdf66b60778c7e64693013be7799e6686b2488dad65525b4036e211ab03e0  fonts/barlow-latin-ext-500-normal.woff2
b7f099c421968b583734bc631e6706bff8fc23908112a219f5f0e37f59b03b32  fonts/barlow-latin-ext-600-normal.woff2
88c786d5fa8700a201615bc7b8ede09d209ec5d08cc3dd0a30ea1c4baff3476f  fonts/barlow-latin-ext-700-normal.woff2
1647a6cc123594599e459587d251f034e2f28bac2fec980bd0933c3ad13ce5e8  fonts/barlow-latin-ext-800-normal.woff2
addcc80ddcc170ff8c97140ab37ac380ac4e6d0b8fd14e5d107b4cb87ffd778f  fonts/kaushan-script-latin-400-normal.woff2
342d7c72ac64631f8df9687721b63473a77b8bc66481844fb95b67c7153f3613  fonts/kaushan-script-latin-ext-400-normal.woff2
849290ef12a2eeb9af5c11924120d11aa4ae8b435ed3347d7fc8bc240c293ca3  fonts/manrope-latin-400-normal.woff2
19874318747181a650eda439c37955220b849d9c4797c9e0718ee67d4bf929bc  fonts/manrope-latin-500-normal.woff2
f7ac6258da20ab7541939b59851155753d1d24f1b30cbcb949077a3faa3d1593  fonts/manrope-latin-600-normal.woff2
d2a12c85a831e4b5db341767d0347fa3d1361d22a1fcb3e361a16b6c90080f71  fonts/manrope-latin-700-normal.woff2
74c161dbcbce7c3590803cc72dc1f63313c360e13367aba5075a7b7b3818ea49  fonts/manrope-latin-800-normal.woff2
72c5354a6f814f3bd38dc3d8caee774f7557b301e69d8428e677b7b73d58d9ee  fonts/manrope-latin-ext-400-normal.woff2
40787d0c2ff6301cb60b504b6c7a2518c5e0104e6f0f5329c14536d6ed1b884d  fonts/manrope-latin-ext-500-normal.woff2
ff679412842fc3b5ce2dfad626db5261a4e663dcfd1bf1209bdfc61c2b2f37e6  fonts/manrope-latin-ext-600-normal.woff2
dc7c46d7eb269cc90650d7f70cf49aafa39a98444e6882cc84096acbc156bfcd  fonts/manrope-latin-ext-700-normal.woff2
262536c3018a0830a4d3d1b1a8096ac0d53dbd059f6271cca121272ba9d4f948  fonts/manrope-latin-ext-800-normal.woff2
71f028fd2349990b3f8aa643abe767e82e0f596be407ae66f0004ff164121bdb  fonts/outfit-latin-400-normal.woff2
fc9bff941def6d924a71632bd8a93190528872eae6414844f3c367ff948d92fd  fonts/outfit-latin-500-normal.woff2
8cfe15c2c6de6ef8efff3eedbd52a383ac9ef23d6c23f6cd9f9b838f5f37dc36  fonts/outfit-latin-600-normal.woff2
5d5e3734089a74707292ce8a3e186def34cd63e33879f9ac3689a8d8da9d0706  fonts/outfit-latin-700-normal.woff2
eabf8cb2c01d0345e2eb19a49d04e8f8d0d520b74959b173d5ea6c2dcb95e4cd  fonts/outfit-latin-800-normal.woff2
090bdae2e8f2fdc962732c8f918d57c5501737c6826be989bcd770860ec19f85  fonts/outfit-latin-900-normal.woff2
e279fd5005b5936e4f4d20fd21e1fdd6a35d724ff576623d31e7c425c356b7ac  fonts/outfit-latin-ext-400-normal.woff2
89894a600bea0ec4724988d191ea32a0353bb1c9c130cbdf346654d356b1ba84  fonts/outfit-latin-ext-500-normal.woff2
a049363d2c3565ef5ea79725c71d23030c91f679cc7a0cf45e9726375bd58e7c  fonts/outfit-latin-ext-600-normal.woff2
545d41d83230a139623b3ec2889b338bb3c5a19a8aefe9c23b203dbe72b2bbe4  fonts/outfit-latin-ext-700-normal.woff2
76bc5d459840a87367e894a2d0e648b43e5f546b726f9bb8ef4f801107cc2e30  fonts/outfit-latin-ext-800-normal.woff2
cb36e3cc2c6a0488846c369b239793b7694df0b6b6332904da6f5319c2d6cce1  fonts/outfit-latin-ext-900-normal.woff2
1fe9ad5d8b2ebd8ecb8fbd05bed1e3fdfa52dae3f1a04e1c219918442fe9394d  fonts/playfair-display-latin-400-normal.woff2
8f074624e50ab805878b26ab5f3e0fa360043d546c35b043947e96a5c7071970  fonts/playfair-display-latin-500-italic.woff2
1e3429a2122b4171bf393c8de5c501820e17ca2074c498d7080e2326975d825c  fonts/playfair-display-latin-500-normal.woff2
8176ed854ef40b2cdebbdb7a1fd9283b3dada1e87c8e89d003f3485fc3c7435b  fonts/playfair-display-latin-600-italic.woff2
5d2286941a6b02a29387efa94809a064f8917598eafa67b938261cf13bb887cd  fonts/playfair-display-latin-600-normal.woff2
28453852ea165c47b5a941be00e418402e1407002ed87507f062a1e316328fe6  fonts/playfair-display-latin-700-normal.woff2
b13dce34203d893eb00980383bc5abf8b75c9eb1f59c3a630e9fc8baf2e9984f  fonts/playfair-display-latin-ext-400-normal.woff2
224ec72e732a9ccf564a90d056fc637fc29ac0be8209b0fa1a16730430d6cf02  fonts/playfair-display-latin-ext-500-italic.woff2
30dee03523782294cd9b0d3ab46dfd3130c356cea831bf6cc8724e157f51846d  fonts/playfair-display-latin-ext-500-normal.woff2
4f6a4778dcb42d51a922c9ee7ba5b85482473ce33e3d4eb9280912b24794b341  fonts/playfair-display-latin-ext-600-italic.woff2
cf968562375eceed83b66f2b5445aa4ecdc4d5300de94930da06433877a975a1  fonts/playfair-display-latin-ext-600-normal.woff2
edb9f5d879b30c617698bcc288692c339d5a0a2464a5476f00025195e5cad166  fonts/playfair-display-latin-ext-700-normal.woff2
2078240cee94e627d0e180d56d74a11b2a1d387bbd61a9b7269f0a43df756896  fonts/source-serif-4-latin-ext-opsz-italic.woff2
155f6e701097cc269cf8d5d7ac86795f263f1afbeb47c14d1d747108c9335389  fonts/source-serif-4-latin-ext-opsz-normal.woff2
96e6393209728ab93c334ae739af8a040cd2006c82e8614d6465a8084db88f89  fonts/source-serif-4-latin-opsz-italic.woff2
f2ea9c12d2fe9bd3a9589b02ad2c0909da88f30938c91adc838c4f4098f9f9e0  fonts/source-serif-4-latin-opsz-normal.woff2
4d7fb987d43fca733601275332142810f0704b81e78e26ec8a9826d4d1ce70bf  fonts/fonts.css
9267baca92b7a7ce9db6dd9e6cc32c9fe3ddf1ac96e421d5f87c5746b9089d6a  fonts/LICENSE-anton.txt
4877e0c1b66f0b16cc3ebc4801c4def24c06252f618b9229428b20c7387aa0c0  fonts/LICENSE-barlow.txt
ae018242e581cd9d21e40d19f62642fd15c82dc22ac3f523a6db93590f0e33e7  fonts/LICENSE-kaushan-script.txt
d826ab6583b12c26807d8716a545bdbbb672df04f48608a364ba9efdbe501c30  fonts/LICENSE-manrope.txt
0e5fcef5d93bfcae273c11c00f0bb453d3b5491860e1ac8b658767b7577c938f  fonts/LICENSE-outfit.txt
c052aafd2a71e90bcee6e69f475029d430a10d548c08ffcae350171f0e9668b1  fonts/LICENSE-playfair-display.txt
18aabf190848725e2576eefb5c29ba06aac1029d02132252a7f312eac2e50cf3  fonts/LICENSE-source-serif-4.txt
```
