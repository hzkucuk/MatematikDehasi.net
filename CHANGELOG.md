# 📋 Değişiklik Günlüğü (CHANGELOG)

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format [Semantic Versioning](https://semver.org/lang/tr/) kurallarına uygundur.

---

## [v1.0.0] — 2025-03-01 — İlk Sürüm

### Eklenen
- Öğretmen kayıt sistemi (kurum şifresi doğrulaması ile) — `site.js`, `Index.cshtml`
- Benzersiz 6 haneli sınıf kodu üretimi (`XXX-XXX` formatı) — `site.js`
- Öğretmen giriş paneli (şifre ile) — `site.js`, `Index.cshtml`
- Öğrenci giriş ve quiz sistemi (4 işlem, zorluk seçimi) — `site.js`, `Index.cshtml`
- Sınav geçmişi ve detaylı sonuç görüntüleme — `site.js`
- Öğretmen şifre güncelleme — `site.js`
- Firebase Firestore entegrasyonu — `site.js`, `firebase-config.js`
- Firebase Anonymous Auth — `site.js`
- Firestore güvenlik kuralları — `firestore.rules`
- GitHub Pages statik dağıtım desteği — `docs/`
- Mobil uyumlu responsive tasarım — `site.css`
- Türkçe arayüz — `Index.cshtml`, `docs/index.html`

### Güvenlik
- Kurum kayıt şifresi (master PIN) koruması — `settings/master`
- Firebase API anahtarı ayrı dosyaya taşındı — `firebase-config.js`
- API anahtarı HTTP referrer kısıtlaması için rehber — `INSTALL.md`
