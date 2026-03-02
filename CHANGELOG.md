# 📋 Değişiklik Günlüğü (CHANGELOG)

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format [Semantic Versioning](https://semver.org/lang/tr/) kurallarına uygundur.

---

## [v2.0.1] --- 2025-07-15 --- 6. Sinif Basit Denklemler

### Eklenen
- 6. sinifa basit denklem cozme (mixed_equations) islemi eklendi
- Mevcut sayi araliklari (+-50) ile otomatik denklem uretimi

### Etkilenen Dosyalar
site.js, docs/js/site.js, FEATURES.md, CHANGELOG.md

---

## [v2.0.0] --- 2025-07-15 --- Cloudflare D1 Migrasyonu (Firebase Kaldırıldı)

### Değişen (BREAKING)
- Backend tamamen Firebase Firestore'dan Cloudflare D1'e (SQLite edge database) taşındı
- Firebase SDK (firebase-app, firebase-auth, firebase-firestore) kaldırıldı
- Tüm veri işlemleri Cloudflare Workers REST API üzerinden yapılıyor
- `firebase-config.js` artık kullanılmıyor (silindi)

### Eklenen
- Cloudflare Workers REST API (14 endpoint) — `cf-worker/src/index.js`
- `api()` helper fonksiyonu ile tüm REST çağrıları
- D1 SQL şeması: 5 tablo (teachers, students, history, consents, settings) + 4 indeks
- Sunucu tarafında toplu kod yenileme (`/renew` endpoint)
- Geçmiş sorgularında sayfalama ve filtreleme (limit, offset, grade, since)

### Kaldırılan
- Firebase SDK importları ve `type="module"` script etiketi
- `firebase-config.js` dosyası
- `firestore.rules` bağımlılığı
- Kayıt formundaki süre limiti seçeneği (artık sadece öğretmen panelinden)

### Güncellenen
- KVKK aydınlatma metni: "Google Firebase" → "Cloudflare D1"
- Çevrimdışı yedekleme: localStorage + REST API retry
- `loadTeacherHistory`: D1 snake_case → JS camelCase alan eşlemesi

### Etkilenen Dosyalar
site.js, Index.cshtml, _Layout.cshtml, docs/index.html, docs/js/site.js, cf-worker/*, FEATURES.md, CHANGELOG.md

---

## [v1.5.0] --- 2025-07-14 --- Kod Yenileme, Cevrimdisi Yedekleme ve PDF Rapor

### Eklenen
- Ogretmen paneline kod yenileme ozelligi eklendi
- Cevrimdisi yedekleme mekanizmasi eklendi
- PDF rapor olusturma eklendi (ogrenci + sinif + sonuc)
- jsPDF 2.5.2 CDN entegrasyonu
- Offline banner ve kod yenileme buton stilleri

### Etkilenen Dosyalar
site.js, Index.cshtml, _Layout.cshtml, site.css, docs/*

---

## [v1.4.0] — 2025-07-14 — Yoklama Listesi ve Rozet Sistemi

### Eklenen
- Öğretmen paneline sınıf yoklama listesi eklendi — `Index.cshtml`, `site.js`, `site.css`
  - Öğrenci ismi ekleme/silme (localStorage tabanlı, öğretmen kodu bazlı)
  - Kimlerin test çözdüğünü otomatik takip (✅ çözmüş / ❌ çözmemiş)
  - Çözmeyen öğrenciler uyarı paneli
  - `loadTeacherHistory` sonrası otomatik güncelleme
- 13 rozet/başarı tanımı eklendi — `site.js`
  - 🎯 İlk Adım, 🏅 5 Sınav, 🏆 10 Sınav, 💯 Mükemmel, 🔥 3/5'li Seri
  - ⚡ Hız Ustası, 📈 Gelişim, ➕➖✖️➗ İşlem Ustaları, 🌟 Dört İşlem Kahramanı
- Öğrenci sonuç ekranında kazanılan rozetler gösterimi — `Index.cshtml`, `site.js`
- Öğretmen detay modalında öğrenci rozetleri — `site.js`
- Rozet ve yoklama stilleri (animasyonlu kartlar, durum renkleri) — `site.css`

### Etkilenen Dosyalar
`site.js`, `Index.cshtml`, `site.css`, `docs/index.html`, `docs/js/site.js`, `docs/css/site.css`

---

## [v1.3.0] — 2025-07-14 — İstatistik Paneli, Süre Limiti ve Deneme Takibi

### Eklenen
- Öğretmen paneline sınıf istatistik paneli eklendi — `Index.cshtml`, `site.js`
  - Genel özet: toplam sınav, öğrenci sayısı, ortalama başarı, en zayıf işlem
  - İşlem bazlı başarı oranları (çubuk grafik)
  - Sınıf bazlı performans: ortalama, min/max, öğrenci sayısı, en zayıf işlem
  - Tekrar deneme uyarısı
- Öğretmen tarafından belirlenen sınav süre limiti (10/15/20/30/60dk) — `Index.cshtml`, `site.js`
- Öğretmen kaydında varsayılan süre limiti seçimi — `Index.cshtml`, `site.js`
- Öğretmen panelinde süre ayarı değiştirme kartı — `Index.cshtml`, `site.js`
- Süre dolunca otomatik teslim mekanizması — `site.js`
- Geri sayım zamanlayıcı (kalan süre, renk uyarıları) — `site.js`, `site.css`
- Deneme sayısı gösterimi: her öğrenci+işlem çifti için toplam/günlük deneme — `site.js`
- 🔄 deneme sayısı rozeti öğretmen panelinde — `site.js`
- Sonuç kaydına `timeLimit` alanı eklendi — `site.js`
- İstatistik, süre ve deneme stilleri — `site.css`

### Etkilenen Dosyalar
`site.js`, `Index.cshtml`, `site.css`, `docs/index.html`, `docs/js/site.js`, `docs/css/site.css`

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
