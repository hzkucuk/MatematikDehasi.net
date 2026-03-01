# Copilot Direktifi — .NET 10

**Öncelik:** Güvenlik > Mimari bütünlük > Stabilite > Performans

## Temel Kurallar
- Sadece istenen bloğu değiştir; tüm dosyayı yeniden yazma.
- Public API / method imzalarını açık talimat olmadan değiştirme.
- Talep dışı refactor yapma.
- Belirsizlikte işlemi başlatma, soru sor.
- Büyük değişiklikleri parçala, her adımda onay iste.

## Mimari
- Mevcut mimariyi (MVC / Razor Pages / Clean Architecture) koru.
- Katman ihlali yasak. Yeni pattern eklemeden önce gerekçe sun.

## .NET 10 Standartları
- `Task.Result` ve `.Wait()` kesinlikle yasak; her zaman `await` kullan.
- `CancellationToken` varsa tüm alt çağrılara ilet.
- Gereksiz `ToList()` / `ToArray()` kullanma.
- Magic number yasak; sabit veya enum kullan.
- Nullable Reference Types: her public method girişinde `ArgumentNullException.ThrowIfNull()` ekle.

## Veritabanı
Açık talimat olmadan: EF Migration oluşturma, kolon silme/rename/tip değiştirme.

## Güvenlik & Hata Yönetimi
- Log'larda şifre/token/PII maskele.
- Kullanıcıya stack trace gösterme; correlation ID döndür.
- Exception yutma; handle et veya `throw` ile ilet.

## Otodökümantasyon (otomatik — hatırlatma bekleme)
Her değişiklik sonrası:
- **CHANGELOG.md:** `[vX.Y.Z] — YYYY-MM-DD — [Özet] — [Etkilenen dosya]`
- **FEATURES.md:** Yeni yetenek veya mantık değişikliğinde güncelle.
- **INSTALL.md:** NuGet / config / env değişikliğinde senkronize et.
- Semantic versioning: breaking=MAJOR, yeni özellik=MINOR, düzeltme=PATCH.

## Yanıt Formatı
1. Değişiklik özeti (1-2 cümle)
2. Sadece değişen kod bloğu
3. Dokümantasyon güncellemeleri
4. Onay noktası
