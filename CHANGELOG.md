# 📋 Değişiklik Günlüğü (CHANGELOG)

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format [Semantic Versioning](https://semver.org/lang/tr/) kurallarına uygundur.

---

## [v1.2.1] — 2025-07-14 — Öğrenci PIN Sıfırlama

### Eklenen
- Öğretmen paneline "Öğrenci PIN Yönetimi" bölümü eklendi — `Index.cshtml`, `site.js`
- Kayıtlı öğrenci listesi Firestore'dan yükleniyor — `site.js`
- PIN sıfırlama: öğretmen onayı ile öğrenci PIN kaydı silinir, sonraki girişte yeni PIN oluşturur — `site.js`
- `deleteDoc` Firestore import'a eklendi — `site.js`
- PIN yönetim kartı CSS stilleri — `site.css`

### Değişen
- Firestore kuralları: `students` koleksiyonuna `delete` izni eklendi (PIN sıfırlama için) — `firestore.rules`

### Etkilenen Dosyalar
`site.js`, `Index.cshtml`, `site.css`, `firestore.rules`, `docs/index.html`, `docs/js/site.js`, `docs/css/site.css`

---

## [v1.2.0] — 2025-07-14 — Çoklu Sınıf, Öğrenci PIN, Anomali Tespiti ve KVKK

### Eklenen
- Öğretmen tek kodla birden fazla sınıfı yönetebilir (checkbox ile seçim) — `site.js`, `Index.cshtml`
- Öğretmen panelinde sınıf yönetimi (aktif/pasif geçişi) — `site.js`, `Index.cshtml`
- Geçmiş sonuçlarda sınıf bazlı filtreleme — `site.js`, `Index.cshtml`
- Öğrenci kişisel PIN sistemi (ilk girişte oluştur, sonraki girişlerde doğrula) — `site.js`, `Index.cshtml`
- PIN Firestore'a kaydedilir: `teachers/{code}/students/{name}` — `site.js`
- Cihaz parmak izi toplama: UUID, tarayıcı, işletim sistemi, CPU, RAM, GPU, ekran, IP, zaman dilimi — `site.js`
- Anomali tespit motoru: ortak cihaz kullanımı + ani puan artışı (>%40) — `site.js`
- Öğretmen panelinde anomali uyarı rozetleri (⚠️ Ortak Cihaz, 📈 Ani Artış) — `site.js`
- Sınav detay modalında cihaz bilgisi ve anomali açıklamaları — `site.js`
- KVKK Aydınlatma Metni ve Kullanım Koşulları onay modalı — `Index.cshtml`, `site.js`
- KVKK onayı Firestore'a kaydedilir: `consents/{deviceId}` — `site.js`
- Firestore kurallarına `students` ve `consents` koleksiyonları eklendi — `firestore.rules`
- KVKK/anomali/PIN stilleri (pulse animasyonu, sarı PIN kutusu) — `site.css`

### Değişen
- Öğretmen kaydı: tek sınıf yerine çoklu sınıf checkbox sistemi — `Index.cshtml`, `site.js`
- Firestore `teachers` dokümanı: `grade` alanı → `grades` dizisi — `site.js`
- Firestore teachers update kuralı `grades` alanını da destekliyor — `firestore.rules`
- Öğrenci girişi: isim girildikten sonra PIN alanı dinamik olarak gösteriliyor — `site.js`
- Sınav sonucu kaydına `deviceId` alanı eklendi — `site.js`

### Güvenlik
- Öğrenci PIN ile kimlik doğrulaması (kopya engelleme) — `site.js`
- Cihaz izleme ile aynı cihazdan farklı isimlerle giriş tespiti — `site.js`
- KVKK onayı olmadan uygulama kullanılamaz — `site.js`

### Etkilenen Dosyalar
`site.js`, `Index.cshtml`, `site.css`, `firestore.rules`, `docs/index.html`, `docs/js/site.js`, `docs/css/site.css`

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
