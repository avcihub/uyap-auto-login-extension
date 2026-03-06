const DEF = { pin: '', auto: false, val: 30, unit: 'minutes', gitup: '' };
const ALARM = 'uyap_auto_login';
const URL = '*://*/*';

chrome.runtime.onInstalled.addListener(async () => {
  const s = { ...DEF, ...(await chrome.storage.sync.get(Object.keys(DEF))) };
  await chrome.storage.sync.set(s);
  await syncAlarm(s);
});

chrome.runtime.onStartup.addListener(async () => {
  await syncAlarm(await getS());
});

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== ALARM) return;
  const s = await getS();
  if (!s.auto) return;
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) if (t.id) await run(t.id, s.pin);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'GET') {
      const s = await getS();
      const a = await chrome.alarms.get(ALARM);
      sendResponse({ ok: true, settings: s, nextRunAt: a?.scheduledTime || null });
      return;
    }

    if (msg?.type === 'SAVE') {
      const s = sanitize(msg.payload || {});
      await chrome.storage.sync.set(s);
      await syncAlarm(s);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'RUN_NOW') {
      const s = await getS();
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active?.id) {
        await run(active.id, s.pin);
        sendResponse({ ok: true });
        return;
      }
      const tabs = await chrome.tabs.query({});
      if (!tabs.length) {
        sendResponse({ ok: false, error: 'UYAP sekmesi acik degil.' });
        return;
      }
      await run(tabs[0].id, s.pin);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown message' });
  })().catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
  return true;
});

async function getS() {
  return sanitize({ ...DEF, ...(await chrome.storage.sync.get(Object.keys(DEF))) });
}

function sanitize(raw) {
  const val = Math.max(1, Math.min(999, Number(raw.val) || DEF.val));
  const unit = raw.unit === 'hours' ? 'hours' : 'minutes';
  return { pin: String(raw.pin || ''), auto: Boolean(raw.auto), val, unit, gitup: String(raw.gitup || '') };
}

async function syncAlarm(s) {
  await chrome.alarms.clear(ALARM);
  if (!s.auto) return;
  const minutes = s.unit === 'hours' ? s.val * 60 : s.val;
  await chrome.alarms.create(ALARM, { delayInMinutes: minutes, periodInMinutes: minutes });
}
async function run(tabId, pin) {
  await chrome.scripting.executeScript({ target: { tabId }, func: runner, args: [pin || ''] });
}

function runner(pin) {
  const n = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const vis = (e) => e && e.getBoundingClientRect && (() => {
    const r = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return r.width > 2 && r.height > 2 && c.display !== 'none' && c.visibility !== 'hidden' && c.opacity !== '0';
  })();

  const click = (e) => {
    if (!e) return false;
    const t = e.closest('button,a,[role="button"],input[type="button"],input[type="submit"],.dx-button') || e;
    if (!vis(t)) return false;
    t.scrollIntoView({ block: 'center', inline: 'center' });
    t.removeAttribute('disabled');
    t.setAttribute('aria-disabled', 'false');
    if ('disabled' in t) t.disabled = false;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((ev) => {
      t.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1 }));
    });
    if (typeof t.click === 'function') t.click();
    return true;
  };

  const pick = (els, terms) => {
    for (const e of els) {
      if (!vis(e)) continue;
      const txt = n(e.innerText || e.textContent || e.value || e.getAttribute('aria-label') || e.getAttribute('title'));
      if (!txt) continue;
      if (terms.some((x) => txt === x || txt.includes(x))) return e;
    }
    return null;
  };

  const fillPin = (inp, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    inp.focus();
    if (setter) setter.call(inp, ''); else inp.value = '';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    for (const ch of value) {
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      const next = (inp.value || '') + ch;
      if (setter) setter.call(inp, next); else inp.value = next;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
    }
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    inp.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  const attempt = () => {
    const closeBtn = document.querySelector('.dx-popup-bottom .dx-button-danger, .dx-popup-bottom .dx-button');
    if (click(closeBtn)) return;

    const eimza = [...document.querySelectorAll('button,a,[role="button"],.dx-button')].find((x) => n(x.innerText || x.textContent).includes('e-imza'));
    if (eimza) click(eimza);

    const inp = [...document.querySelectorAll('input')].find((i) => {
      const m = n(`${i.id || ''} ${i.name || ''} ${i.placeholder || ''} ${i.getAttribute('aria-label') || ''}`);
      return vis(i) && (m.includes('pin') || m.includes('sifre') || m.includes('password') || i.type === 'password' || i.maxLength === 6);
    });

    let okPin = false;
    if (inp && pin) {
      if ((inp.value || '').trim() !== pin) fillPin(inp, pin);
      okPin = (inp.value || '').trim() === pin;
    }
    if (!okPin) return;

    const all = [...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"],.dx-button')];
    const login = pick(all, ['giris', 'giriş', 'giris yap', 'giriş yap', 'oturum ac', 'login']);
    if (login) click(login);
  };

  if (window.__uyapAutoLoginTimer) clearInterval(window.__uyapAutoLoginTimer);
  let i = 0;
  window.__uyapAutoLoginTimer = setInterval(() => {
    i += 1;
    attempt();
    if (i >= 20) {
      clearInterval(window.__uyapAutoLoginTimer);
      window.__uyapAutoLoginTimer = null;
    }
  }, 1500);
}

