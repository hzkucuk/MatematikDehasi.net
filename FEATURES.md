# 🎯 Özellikler (FEATURES)

## Sınıf Düzeyi Sistemi (MEB Müfredatı)

| Sınıf | İşlemler | Sayı Aralığı | Soru |
|-------|----------|-------------|------|
| 1. Sınıf | +, − | 1-20, sonuç ≥ 0 | 20 |
| 2. Sınıf | +, −, × | 0-99, çarpma 2-5 | 20 |
| 3. Sınıf | +, −, ×, ÷ | 0-999, çarpma tablosu | 20 |
| 4. Sınıf | +, −, ×, ÷ | 0-9999, çok basamaklı | 30 |
| 5. Sınıf | +, −, ×, ÷ | 0-99999, büyük sayılar | 30 |
| 6. Sınıf | +, −, ×, ÷ | Negatif dahil (±50) | 30 |
| 7. Sınıf | +, −, ×, ÷, denklem | Negatif (±100), bilinmeyen | 40 |
| 8. Sınıf | +, −, ×, ÷, denklem | Genişletilmiş (±200) | 40 |

- Öğretmen kaydında birden fazla sınıf düzeyi seçilebilir (checkbox)
- Tek kod ile tüm sınıflar yönetilir
- Öğrenci kodu girince aktif sınıflardan birini seçer, işlemler filtrelenir
- Öğretmen panelinden sınıflar aktif/pasif yapılabilir

## Öğretmen Modülü

### Kayıt
- Kurum kayıt şifresi doğrulaması (varsayılan: `ogretmen2025`)
- Ad-soyad ve kişisel şifre belirleme
- Otomatik benzersiz sınıf kodu üretimi (6 karakter, `XXX-XXX` formatı)
- Güvenli karakter seti: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (karışıklık yapan I/L/O/0/1 hariç)

### Giriş & Panel
- Sınıf kodu + şifre ile giriş
- Tüm öğrenci sınav sonuçlarını listeleme (tarih, isim, puan, süre)
- Detaylı sınav görüntüleme: her sorunun doğru/yanlış durumu
- Şifre güncelleme

### İstatistik Paneli
- Genel özet: toplam sınav, benzersiz öğrenci, genel ortalama, en zayıf işlem
- İşlem bazlı başarı analizi (çubuk grafik ile görsel)
- Sınıf bazlı performans: ortalama, min/max puan, öğrenci sayısı, en zayıf işlem
- Tekrar deneme uyarısı (aynı öğrenci+işlem birden fazla çözmüşse)

### Deneme Takibi
- Her öğrencinin aynı işlem türünde kaç deneme yaptığı 🔄 rozeti ile gösterilir
- Günlük deneme sayısı tooltip ile görüntülenir

### Yönetim
- Kurum kayıt şifresi Cloudflare D1 settings tablosundan değiştirilebilir
- Sınıf kodu paylaşımı ile öğrenci ekleme
- Sınıf düzeyleri dinamik olarak aktif/pasif yapılabilir
- Sonuç geçmişi sınıf bazlı filtrelenebilir

### Yoklama Listesi
- Öğretmen panelinden öğrenci isimleri ekleme/silme
- localStorage tabanlı saklama (`md_roster_{öğretmenKodu}`)
- Geçmiş verileriyle otomatik çapraz kontrol
- ✅ Çözmüş / ❌ Çözmemiş durumu görsel olarak gösterilir
- Çözmeyen öğrenciler için uyarı paneli
- `loadTeacherHistory` sonrası otomatik güncelleme

## Rozet / Başarı Sistemi

### Tanımlı Rozetler (13 adet)
| Rozet | Koşul |
|-------|-------|
| 🎯 İlk Adım | İlk sınavı tamamlama |
| 🏅 Beşinci Sınav | 5 sınav tamamlama |
| 🏆 On Sınav | 10 sınav tamamlama |
| 💯 Mükemmel | %100 puan |
| 🔥 Üçlü Seri | Arka arkaya 3 sınav %80+ |
| 🔥🔥 Beşli Seri | Arka arkaya 5 sınav %80+ |
| ⚡ Hız Ustası | 5 dakikadan kısa sürede tamamlama |
| 📈 Gelişim | Son sınavda 20+ puanlık artış |
| ➕ Toplama Ustası | Toplamada %90+ başarı |
| ➖ Çıkarma Ustası | Çıkarmada %90+ başarı |
| ✖️ Çarpma Ustası | Çarpmada %90+ başarı |
| ➗ Bölme Ustası | Bölmede %90+ başarı |
| 🌟 Dört İşlem Kahramanı | Tüm işlemlerde %90+ |

### Gösterim
- Öğrenci sonuç ekranında kazanılan rozetler animasyonlu kartlarla gösterilir
- Öğretmen detay modalında öğrencinin tüm rozetleri listelenir
- İstemci tarafında geçmiş verilerinden otomatik hesaplanır

## Öğrenci Modülü

### Giriş
- Öğretmenin sınıf kodu + öğrenci adı + kişisel PIN ile giriş
- 2 aşamalı kod doğrulama: kod → sınıf seçimi → isim → PIN
- İlk girişte PIN oluşturma, sonraki girişlerde PIN doğrulama
- PIN D1 veritabanında `students` tablosunda saklanır
- KVKK onayı olmadan teste başlanamaz

### Quiz
- **İşlem türleri:** Toplama, Çıkarma, Çarpma, Bölme
- **Zorluk seviyeleri:** Kolay (1-10), Orta (1-50), Zor (1-100)
- **Soru sayısı:** 10 / 20 / 30
- **Süre limiti:** Öğretmen tarafından belirlenir (Sınırsız / 10dk / 15dk / 20dk / 30dk / 60dk)
- Süre dolunca otomatik teslim (geri sayım + renk uyarıları)
- Öğrenci giriş ekranında süre bilgisi gösterilir
- Sayfalı soru görünümü (sayfa başına 5 soru)
- Otomatik süre takibi
- Anlık doğru/yanlış sayacı
- Sonuç D1 veritabanına otomatik kaydedilir

## Kopya Önleme ve Anomali Tespiti

### Öğrenci PIN Sistemi
- İlk girişte 4+ haneli kişisel PIN belirleme
- PIN paylaşılsa bile cihaz izleme devreye girer
- **PIN Sıfırlama:** Öğretmen panelinden öğrencinin PIN'i silinebilir; öğrenci sonraki girişte yeni PIN oluşturur

### Cihaz Parmak İzi
- Benzersiz cihaz kimliği (UUID) localStorage'da saklanır
- Toplanan cihaz verileri:
  - Tarayıcı bilgisi (User-Agent)
  - İşletim sistemi (platform)
  - CPU çekirdek sayısı (hardwareConcurrency)
  - RAM miktarı (deviceMemory)
  - Grafik işlemci (WebGL renderer)
  - Ekran çözünürlüğü
  - IP adresi (ipify API)
  - Zaman dilimi
  - Dokunmatik ekran desteği

### Anomali Tespit Motoru
| Anomali Türü | Tespit Yöntemi | Uyarı |
|---|---|---|
| Ortak Cihaz | Aynı UUID farklı öğrenci isimleri | ⚠️ Ortak Cihaz rozeti |
| Ani Artış | Puan ortalamasından >%40 sıçrama (3+ sonuç gerekli) | 📈 Ani Artış rozeti |

- Anomali rozetleri öğretmen panelinde otomatik gösterilir
- Sınav detay modalında cihaz bilgisi ve anomali açıklamaları yer alır

## KVKK Uyumluluğu

### Aydınlatma Metni
- 8 bölümlü KVKK bildirimi (veri sorumlusu, toplanan veriler, amaçlar, saklama, haklar)
- Sorumluluk reddi (disclaimer) ve MIT Lisansı referansı
- İlk ziyarette zorunlu onay modalı

### Onay Kaydı
- Onay D1 veritabanında `consents` tablosuna kaydedilir
- Kaydedilen bilgiler: onay versiyonu, tarih, tam cihaz parmak izi, IP adresi
- localStorage ile çift kontrol (`md_kvkk_v1`)

## Kod Yenileme

- Ogretmen panelinden sinif kodu yenilenebilir
- Yeni benzersiz kod uretilir (6 karakter)
- Tum gecmis sonuclari yeni koda tasir
- Tum ogrenci PIN verileri yeni koda tasir
- Yoklama listesi localStorage da tasinir
- Eski kod devre disi kalir
- previousCode ve renewedAt alanlari kaydedilir

## Cevrimdisi Yedekleme

- Sinav sonuclari API’ye yazilamazsa localStorage a yedeklenir
- md_pending_results anahtarinda JSON olarak saklanir
- Sayfa yuklenince otomatik gonderim denemesi (3sn gecikme)
- Offline banner ile kullaniciya bildirim
- Manuel tekrar deneme butonu
- Basarili gonderimde otomatik temizleme

## PDF Rapor Olusturma

- jsPDF 2.5.2 CDN ile istemci tarafinda PDF uretimi
- 3 rapor turu:
  - Ogrenci Performans Raporu: islem bazli basari, son sinavlar
  - Sinif Raporu: tum ogrencilerin ozet ve detaylari
  - Sinav Sonuc Raporu: ogrenci sonuc ekranindan her soru detayi
- Turkcesiz (ASCII) font uyumlulugu
- Otomatik sayfa gecisi (A4)

## Teknik Özellikler

### Dağıtım
- **ASP.NET Core:** `dotnet run` ile geliştirme sunucusu
- **GitHub Pages:** `docs/` klasöründen statik dağıtım
- **Doğrudan açma:** `docs/index.html` tarayıcıda çalışır

### Güvenlik
- Cloudflare Workers REST API ile veri erişimi
- D1 veritabanı şeması ile veri bütünlüğü (teachers, students, history, consents, settings)
- CORS politikası ile erişim kontrolü
- Kurum kayıt şifresi ile yetkisiz öğretmen kaydı engelleme
- Öğrenci PIN ile kimlik doğrulama
- Cihaz parmak izi ile kopya tespiti
- KVKK uyumlu veri toplama ve onay mekanizması
- Sınav sonuçları değiştirilemez (D1 şeması: history tablosunda update/delete yok)

### Tasarım
- Tek sayfa uygulama (SPA) — sayfa yenilenmeden geçişler
- CSS Custom Properties ile tema yönetimi
- Mobil öncelikli responsive tasarım
- Harici kütüphane bağımlılığı yok (Vanilla JS + CSS)
