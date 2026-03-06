const pinEl = document.getElementById("pin");
const autoEl = document.getElementById("auto");
const valEl = document.getElementById("ival");
const unitEl = document.getElementById("iunit");
const saveEl = document.getElementById("save");
const runNowEl = document.getElementById("runNow");
const checkUpdateEl = document.getElementById("checkUpdate");
const nextRunEl = document.getElementById("nextRun");
const statusEl = document.getElementById("status");
const updateInfoEl = document.getElementById("updateInfo");

let latestReleaseUrl = "https://github.com/avcihub/uyap-auto-login-extension/releases";

init();

saveEl.addEventListener("click", async () => {
  const payload = {
    pin: pinEl.value.trim(),
    auto: autoEl.checked,
    val: Math.max(1, Math.min(999, Number(valEl.value) || 30)),
    unit: unitEl.value === "hours" ? "hours" : "minutes"
  };

  const res = await send({ type: "SAVE", payload });
  if (!res?.ok) return setStatus(res?.error || "Kayit hatasi.");

  const refresh = await send({ type: "GET" });
  updateNextRun(refresh?.nextRunAt || null);
  setStatus("Ayarlar kaydedildi.");
});

runNowEl.addEventListener("click", async () => {
  const res = await send({ type: "RUN_NOW" });
  if (!res?.ok) return setStatus(res?.error || "Calistirma hatasi.");
  setStatus("UYAP sekmesinde calistirildi.");
});

checkUpdateEl.addEventListener("click", async () => {
  await checkUpdate(true);
});

async function init() {
  const res = await send({ type: "GET" });
  if (!res?.ok) return setStatus(res?.error || "Ayarlar okunamadi.");

  pinEl.value = res.settings.pin || "";
  autoEl.checked = !!res.settings.auto;
  valEl.value = String(res.settings.val || 30);
  unitEl.value = res.settings.unit || "minutes";
  updateNextRun(res.nextRunAt);

  await checkUpdate(false);
}

async function checkUpdate(fromButton) {
  updateInfoEl.textContent = "GitHub surum kontrolu yapiliyor...";
  const res = await send({ type: "CHECK_UPDATE" });

  if (!res?.ok) {
    updateInfoEl.textContent = res?.error || "Surum kontrolu basarisiz.";
    return;
  }

  latestReleaseUrl = res.releaseUrl || latestReleaseUrl;

  if (res.hasUpdate) {
    updateInfoEl.innerHTML = "Yeni surum mevcut: <b>" + res.latestVersion + "</b> (mevcut: " + res.currentVersion + ")";
    checkUpdateEl.textContent = "Yeni Surumu Ac";
    if (fromButton) {
      await chrome.tabs.create({ url: latestReleaseUrl });
    }
  } else {
    updateInfoEl.textContent = "Guncel surum kullaniyorsunuz: " + res.currentVersion;
    checkUpdateEl.textContent = "Guncelleme Kontrol Et";
  }
}

function updateNextRun(ts) {
  if (!ts) {
    nextRunEl.textContent = "Sonraki çalışma: kapalı";
    return;
  }
  const d = new Date(ts);
  nextRunEl.textContent = "Sonraki çalışma: " + d.toLocaleString("tr-TR");
}

function setStatus(text) {
  statusEl.textContent = text;
}

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

