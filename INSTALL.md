# 📦 Kurulum Kılavuzu

## Gereksinimler

| Araç | Sürüm | Açıklama |
|------|-------|----------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0+ | Backend çalıştırmak için |
| [Git](https://git-scm.com/) | 2.x+ | Repoyu klonlamak için |
| Modern Tarayıcı | — | Chrome, Edge, Firefox, Safari |
| Firebase Projesi | — | Firestore + Anonymous Auth etkin |

> **Not:** Yalnızca statik sürümü (`docs/index.html`) kullanacaksanız .NET SDK gerekmez.

---

## 1️⃣ Projeyi Klonlama

```bash
git clone https://github.com/hzkucuk/MatematikDehasi.net.git
cd MatematikDehasi.net
```

---

## 2️⃣ Firebase Yapılandırması

### 2a. Firebase Projesi Oluşturma

1. [Firebase Console](https://console.firebase.google.com/) → **Proje Ekle**
2. Proje adı girin → oluşturun

### 2b. Firestore Veritabanı

1. Sol menüde **Firestore Database** → **Veritabanı Oluştur**
2. Konum seçin (ör. `europe-west1`) → **Üretim modunda başlat**
3. **Kurallar** sekmesinde `firestore.rules` dosyasındaki kuralları yapıştırın ve **Yayınla**

### 2c. Anonymous Auth

1. Sol menüde **Authentication** → **Oturum açma yöntemi**
2. **Anonim** sağlayıcıyı etkinleştirin → **Kaydet**

### 2d. Web Uygulaması Ekleme

1. Projeye genel bakış → ⚙️ → **Uygulama ekle** → **Web** (`</>`)
2. Uygulama adı girin → **Kaydet**
3. Gösterilen yapılandırma değerlerini kopyalayın

### 2e. Yapılandırma Dosyasını Güncelleme

Aşağıdaki dosyalardaki değerleri kendi Firebase bilgilerinizle değiştirin:

- `MatematikDehasi/wwwroot/js/firebase-config.js`
- `docs/js/firebase-config.js`

```javascript
export const firebaseConfig = {
    apiKey: "SIZIN_API_KEY",
    authDomain: "SIZIN_PROJE.firebaseapp.com",
    projectId: "SIZIN_PROJE",
    storageBucket: "SIZIN_PROJE.firebasestorage.app",
    messagingSenderId: "SIZIN_SENDER_ID",
    appId: "SIZIN_APP_ID",
    measurementId: "SIZIN_MEASUREMENT_ID"
};
```

### 2f. API Anahtarı Güvenliği (Önerilen)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → API Anahtarınız → **Düzenle**
2. **Uygulama kısıtlamaları** → **HTTP yönlendiricileri** seçin
3. İzin verilen URL'leri ekleyin:
   - `https://hzkucuk.github.io/*`
   - `http://localhost:*`
   - `https://localhost:*`

---

## 3️⃣ Çalıştırma

### Seçenek A — ASP.NET Core (Geliştirme)

```bash
cd MatematikDehasi
dotnet run
```

Tarayıcıda `https://localhost:5001` adresine gidin.

### Seçenek B — Statik Dosya (Sunucusuz)

`docs/index.html` dosyasını doğrudan tarayıcınızda açın.

### Seçenek C — GitHub Pages (Canlı)

1. GitHub'da repo **Settings** → **Pages**
2. **Source:** `Deploy from a branch`
3. **Branch:** `master` | **Folder:** `/docs`
4. **Save** → birkaç dakika bekleyin

Canlı adres: `https://<kullanici>.github.io/MatematikDehasi.net/`

---

## 4️⃣ İlk Kullanım

1. Siteyi açın → **Yeni Öğretmen** kartına tıklayın
2. **Kurum Kayıt Şifresi:** varsayılan değer `ogretmen2025`
   - Firebase Console → Firestore → `settings/master` → `registrationPin` alanından değiştirebilirsiniz
3. Ad ve şifre girip kayıt olun → benzersiz sınıf kodunuz oluşturulur
4. Bu kodu öğrencilerinizle paylaşın

---

## 🔧 Ortam Değişkenleri

Bu proje ortam değişkeni **kullanmaz**. Tüm yapılandırma `firebase-config.js` dosyasında tutulur.

---

## ❓ Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Sayfa açılıyor ama butonlar çalışmıyor | Tarayıcı konsolunu (F12) kontrol edin — `firebase-config.js` yüklenemiyor olabilir |
| "Kurum şifresi hatalı" hatası | Varsayılan şifre `ogretmen2025` — Firestore'dan değiştirdiyseniz yeni şifreyi girin |
| GitHub Pages 404 | Settings → Pages → Source: `docs/` on `master` seçili mi kontrol edin |
| Firestore "permission denied" | Firebase Console'da `firestore.rules` kurallarını yayınladığınızdan emin olun |
