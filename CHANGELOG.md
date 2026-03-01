# 📋 Değişiklik Günlüğü (CHANGELOG)

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format [Semantic Versioning](https://semver.org/lang/tr/) kurallarına uygundur.

---

## [v1.1.0] — 2025-03-01 — Sınıf Düzeyi Sistemi

### Eklenen
- MEB müfredatına uygun 1-8. sınıf düzeyi konfigürasyonu — `site.js`
- Öğretmen kaydına sınıf düzeyi seçimi — `Index.cshtml`, `site.js`
- Öğrenci girişinde 2 aşamalı akış: kod doğrula → sınıfa uygun işlemler — `site.js`, `Index.cshtml`
- Sınıfa göre soru sayısı (20/30/40) ve sayı aralıkları otomatik ayarlanıyor — `site.js`
- Sınıf bilgisi öğretmen panelinde ve sonuç geçmişinde görüntüleniyor — `site.js`
- Sınıf bilgi kartı CSS stili (gradient) — `site.css`
- Bir öğretmen birden fazla sınıf için ayrı kod oluşturabilir — `Index.cshtml`

### Değişen
- "Tam Sayılar" checkbox kaldırıldı → sınıf düzeyi (6+) otomatik belirliyor — `Index.cshtml`, `site.js`
- Sabit 40 soru yerine sınıfa göre dinamik soru sayısı — `site.js`
- Sahte seçenekler doğru cevaba oranla hesaplanıyor — `site.js`

## [v1.0.1] — 2025-03-01 — Öğrenci Sonuç Ekranı

### Eklenen
- Sınav sonunda detaylı sonuç ekranı — `site.js`, `Index.cshtml`, `site.css`
- Tümü/Yanlışlar/Boşlar/Doğrular filtreleme — `site.js`
- Yüzde başarı çubuğu ve istatistik kartları — `site.css`



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
