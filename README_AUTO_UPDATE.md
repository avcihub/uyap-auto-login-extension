# Gercek Otomatik Update Kurulumu (CRX + updates.xml)

Bu eklenti "Load unpacked" olarak yuklenirse otomatik update almaz.
Gercek otomatik update icin CRX paket kurulum + updates.xml gerekir.

## 1) Gerekli sabitler
- Extension klasoru: `F:\CODEX\uyap_chrome_extension`
- Build script: `F:\CODEX\uyap_chrome_extension\build_auto_update.ps1`
- Update URL (manifest): `https://raw.githubusercontent.com/REPLACE_OWNER/REPLACE_REPO/main/updates.xml`

## 2) Ilk paketleme (PEM olusturma)
PowerShell:

```powershell
& "F:\CODEX\uyap_chrome_extension\build_auto_update.ps1" \
  -ExtensionDir "F:\CODEX\uyap_chrome_extension" \
  -OutputDir "F:\CODEX\uyap_release" \
  -ExtensionId "BURAYA_EXTENSION_ID" \
  -BaseCodebaseUrl "https://github.com/REPLACE_OWNER/REPLACE_REPO/releases/download/v1.1.0"
```

Notlar:
- `ExtensionId` degeri `chrome://extensions` sayfasindan alinir.
- Ilk calismada `F:\CODEX\uyap_release\extension-private-key.pem` olusur. Bunu kaybetmeyin.

## 3) Sonraki versiyonlarda paketleme
Her yeni versiyonda ayni PEM ile paketlenmeli:

```powershell
& "F:\CODEX\uyap_chrome_extension\build_auto_update.ps1" \
  -ExtensionDir "F:\CODEX\uyap_chrome_extension" \
  -OutputDir "F:\CODEX\uyap_release" \
  -ExtensionId "BURAYA_EXTENSION_ID" \
  -BaseCodebaseUrl "https://github.com/REPLACE_OWNER/REPLACE_REPO/releases/download/vX.Y.Z" \
  -KeyPath "F:\CODEX\uyap_release\extension-private-key.pem"
```

## 4) GitHub yayinlama
- `av-yusuf-avci-uyap-X.Y.Z.crx` dosyasini GitHub Release asset olarak yukleyin.
- `updates.xml` dosyasini repoda `main` dalina koyun (manifest update_url ile ayni yol).

## 5) Kurulum modeli
- Kullanici eklentiyi CRX olarak kurmali (unpacked degil).
- Sonraki update kontrollerini Chrome `updates.xml` uzerinden yapar.

## 6) File URL yetkisi
`chrome://extensions` > eklenti > `Allow access to file URLs` acik olmali.
