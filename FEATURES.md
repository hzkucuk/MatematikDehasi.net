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

- Öğretmen kaydında sınıf düzeyi seçilir
- Her sınıf için ayrı kod oluşturulabilir
- Öğrenci kodu girince sınıf otomatik algılanır, işlemler filtrelenir

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

### Yönetim
- Kurum kayıt şifresi Firebase Console üzerinden değiştirilebilir
- Sınıf kodu paylaşımı ile öğrenci ekleme

## Öğrenci Modülü

### Giriş
- Öğretmenin sınıf kodu + öğrenci adı ile giriş
- Kod doğrulama (geçersiz kodda uyarı)

### Quiz
- **İşlem türleri:** Toplama, Çıkarma, Çarpma, Bölme
- **Zorluk seviyeleri:** Kolay (1-10), Orta (1-50), Zor (1-100)
- **Soru sayısı:** 10 / 20 / 30
- Sayfalı soru görünümü (sayfa başına 5 soru)
- Otomatik süre takibi
- Anlık doğru/yanlış sayacı
- Sonuç Firestore'a otomatik kaydedilir

## Teknik Özellikler

### Dağıtım
- **ASP.NET Core:** `dotnet run` ile geliştirme sunucusu
- **GitHub Pages:** `docs/` klasöründen statik dağıtım
- **Doğrudan açma:** `docs/index.html` tarayıcıda çalışır

### Güvenlik
- Firebase Anonymous Auth (Firestore erişimi için)
- Firestore güvenlik kuralları (okuma/yazma kısıtlamaları)
- API anahtarı HTTP referrer kısıtlaması desteği
- Kurum kayıt şifresi ile yetkisiz öğretmen kaydı engelleme

### Tasarım
- Tek sayfa uygulama (SPA) — sayfa yenilenmeden geçişler
- CSS Custom Properties ile tema yönetimi
- Mobil öncelikli responsive tasarım
- Harici kütüphane bağımlılığı yok (Vanilla JS + CSS)
