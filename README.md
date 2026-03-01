# 🧠 Matematik Dehası

**Öğretmen-Öğrenci Matematik Quiz Platformu**

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://hzkucuk.github.io/MatematikDehasi.net/)
[![Lisans](https://img.shields.io/badge/Lisans-MIT-green)](/LICENSE.txt)
[![.NET](https://img.shields.io/badge/.NET-10.0-purple)](https://dotnet.microsoft.com/)

Matematik Dehası, öğretmenlerin benzersiz sınıf kodlarıyla öğrenci quizleri oluşturup takip edebildiği, tarayıcı tabanlı bir matematik platformudur. Firebase altyapısı ile bulut üzerinde çalışır.

---

## 🎯 Özellikler

| Özellik | Açıklama |
|---------|----------|
| 👨‍🏫 **Öğretmen Kaydı** | Kurum şifresiyle kayıt ol, benzersiz 6 haneli sınıf kodu al |
| 🔑 **Sınıf Kodu Sistemi** | `XXX-XXX` formatında, paylaşımı kolay, güvenli kodlar |
| 🎒 **Öğrenci Girişi** | Öğretmen kodu + isim ile hızlı giriş |
| ➕➖✖️➗ **4 İşlem Quizi** | Toplama, çıkarma, çarpma, bölme — zorluk seviyesi seçilebilir |
| 📊 **Sonuç Takibi** | Öğretmenler tüm öğrenci sonuçlarını detaylı görebilir |
| 🔒 **Kurum Şifresi** | Yalnızca yetkili kişiler öğretmen kaydı oluşturabilir |
| 📱 **Mobil Uyumlu** | Tüm cihazlarda sorunsuz çalışır |

## 🏗️ Mimari

```
MatematikDehasi/
├── Pages/
│   ├── Index.cshtml              # Ana sayfa (SPA — tek sayfa uygulama)
│   └── Shared/_Layout.cshtml     # Düzen şablonu
├── wwwroot/
│   ├── css/site.css              # Tüm stiller
│   └── js/
│       ├── site.js               # Uygulama mantığı (ES Module)
│       └── firebase-config.js    # Firebase yapılandırması
docs/                             # GitHub Pages statik dağıtım
├── index.html
├── css/site.css
└── js/
    ├── site.js
    └── firebase-config.js
```

## 🔧 Teknoloji Yığını

- **Backend:** .NET 10 — Razor Pages
- **Frontend:** Vanilla JavaScript (ES Modules), CSS Custom Properties
- **Veritabanı:** Firebase Firestore
- **Kimlik Doğrulama:** Firebase Anonymous Auth
- **Dağıtım:** GitHub Pages (statik) + ASP.NET Core (`dotnet run`)
- **Firebase SDK:** v11.6.1 (CDN — ES Modules)

## 🗄️ Firestore Veri Yapısı

```
Firestore
├── settings/
│   └── master                    # { registrationPin: "..." }
└── teachers/
    └── {6_haneli_kod}/           # { name, pin, createdAt }
        └── history/
            └── {otomatik_id}/    # { studentName, score, total, ... }
```

## 🚀 Hızlı Başlangıç

Detaylı kurulum için → [INSTALL.md](INSTALL.md)

```bash
# Klonla
git clone https://github.com/hzkucuk/MatematikDehasi.net.git
cd MatematikDehasi.net

# Çalıştır
cd MatematikDehasi
dotnet run
```

Tarayıcıda `https://localhost:5001` adresine gidin.

> **Sunucusuz kullanım:** `docs/index.html` dosyasını doğrudan tarayıcıda açarak veya [canlı demo](https://hzkucuk.github.io/MatematikDehasi.net/) üzerinden de kullanabilirsiniz.

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE.txt) ile lisanslanmıştır.

## 👤 Geliştirici

**hzkucuk** — [GitHub](https://github.com/hzkucuk)
