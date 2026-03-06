const pinEl = document.getElementById('pin');
const autoEl = document.getElementById('auto');
const valEl = document.getElementById('ival');
const unitEl = document.getElementById('iunit');
const gitupEl = document.getElementById('gitup');
const saveEl = document.getElementById('save');
const runNowEl = document.getElementById('runNow');
const openUpdateEl = document.getElementById('openUpdate');
const nextRunEl = document.getElementById('nextRun');
const statusEl = document.getElementById('status');

const menuButtons = [...document.querySelectorAll('.menu-btn')];
const tabs = {
  pin: document.getElementById('tab-pin'),
  auto: document.getElementById('tab-auto'),
  update: document.getElementById('tab-update'),
  about: document.getElementById('tab-about')
};

init();

for (const btn of menuButtons) {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
}

saveEl.addEventListener('click', async () => {
  const payload = {
    pin: pinEl.value.trim(),
    auto: autoEl.checked,
    val: Math.max(1, Math.min(999, Number(valEl.value) || 30)),
    unit: unitEl.value === 'hours' ? 'hours' : 'minutes',
    gitup: gitupEl.value.trim()
  };

  const res = await send({ type: 'SAVE', payload });
  if (!res?.ok) return setStatus(res?.error || 'Kayit hatasi.');

  const refresh = await send({ type: 'GET' });
  updateNextRun(refresh?.nextRunAt || null);
  setStatus('Ayarlar kaydedildi.');
});

runNowEl.addEventListener('click', async () => {
  const res = await send({ type: 'RUN_NOW' });
  if (!res?.ok) return setStatus(res?.error || 'Calistirma hatasi.');
  setStatus('Calistirildi.');
});

openUpdateEl.addEventListener('click', async () => {
  const url = gitupEl.value.trim();
  if (!url) return setStatus('Once update adresi girin.');

  if (!/^https?:\/\//i.test(url)) {
    setStatus('Adres http:// veya https:// ile baslamali.');
    return;
  }

  await chrome.tabs.create({ url });
});

async function init() {
  const res = await send({ type: 'GET' });
  if (!res?.ok) return setStatus(res?.error || 'Ayarlar okunamadi.');

  pinEl.value = res.settings.pin || '';
  autoEl.checked = !!res.settings.auto;
  valEl.value = String(res.settings.val || 30);
  unitEl.value = res.settings.unit || 'minutes';
  gitupEl.value = res.settings.gitup || '';
  updateNextRun(res.nextRunAt);
  showTab('pin');
}

function showTab(name) {
  for (const btn of menuButtons) {
    btn.classList.toggle('active', btn.dataset.tab === name);
  }

  Object.entries(tabs).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
}

function updateNextRun(ts) {
  if (!ts) {
    nextRunEl.textContent = 'Sonraki çalışma: kapalı';
    return;
  }
  const d = new Date(ts);
  nextRunEl.textContent = `Sonraki çalışma: ${d.toLocaleString('tr-TR')}`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}
