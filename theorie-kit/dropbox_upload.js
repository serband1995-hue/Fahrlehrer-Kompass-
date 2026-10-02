const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const files = process.argv.slice(2).map(f => path.join(__dirname, 'files', f));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY } });
  const p = await (await b.newContext({ ignoreHTTPSErrors: true, locale: 'de-DE' })).newPage();
  await p.route('**/*', async (route) => {
    for (let i = 0; i < 5; i++) {
      try { const resp = await route.fetch({ timeout: 120000 }); return await route.fulfill({ response: resp }); }
      catch (e) { if (i === 4) { console.log('GAVEUP', route.request().url().slice(0, 100), e.message.slice(0, 80)); return route.abort(); } await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
    }
  });
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  p.on('requestfailed', r => console.log('FAILED', r.url().slice(0, 120), r.failure() && r.failure().errorText));
  let ok = false;
  for (let i = 0; i < 6 && !ok; i++) { try { await p.goto('https://www.dropbox.com/request/4dc0a07kah0mw7315hus', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.getByText('Dateien hinzufügen').first().waitFor({ timeout: 30000 }); ok = true; } catch (e) { console.log('retry', i); await p.waitForTimeout(4000); } }
  if (!ok) throw new Error('page not loaded');
  await p.waitForTimeout(6000);
  await p.getByText('Dateien hinzufügen').first().click();
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 30000 }), p.getByText('Dateien vom Computer').first().click()]);
  await fc.setFiles(files);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: path.join(__dirname, 's1.png') });
  console.log('INPUTS', await p.$$eval('input:not([type=file])', els => els.map(e => `${e.type}|${e.name}|${e.placeholder}|${e.getAttribute('aria-label')}`)));
  console.log('BUTTONS', await p.$$eval('button', els => els.map(e => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(Boolean)));
  if (process.env.GO) {
    await p.fill('input[name=name]', 'Claude für Serband');
    await p.fill('input[name=email]', process.env.MAIL);
    await p.getByRole('button', { name: /Hochladen/i }).first().click();
    const t0 = Date.now();
    while (Date.now() - t0 < 600000) {
      await p.waitForTimeout(5000);
      const body = await p.innerText('body');
      console.log('...', body.replace(/\s+/g, ' ').slice(0, 160)); if (/erfolgreich|Fertig|Uploaded|weitere Dateien/i.test(body) && !/wird hochgeladen|Wird hochgeladen|%/i.test(body)) { console.log('DONE', body.slice(0, 300)); break; }
    }
    await p.screenshot({ path: path.join(__dirname, 's2.png') });
  }
  await b.close();
})();
