# 🚀 Space Hub - Modern Masaüstü Başlatıcı

Space Hub, **Electron** ile geliştirilmiş güçlü, modern ve tamamen özelleştirilebilir bir masaüstü başlatıcısıdır. Dosyalarınıza, sistem komutlarına ve üretkenlik araçlarına tek bir **Alt + Space** kısayolu ile anında erişmenizi sağlar.

![Ana Ekran](assets/1.png)

## ✨ Özellikler

| Özellik | Açıklama | Kısayol / Erişim |
|---|---|---|
| **⚡ Hızlı Başlatıcı** | Uygulamaları açın, dosya arayın ve komutları anında çalıştırın. | `Alt + Space` |
| **📁 Dosya Arama** | PowerShell entegrasyonu ile desteklenen ışık hızında dosya arama. | Arama Çubuğu |
| **📋 Pano Geçmişi** | Kopyaladığınız son 50 öğeyi otomatik olarak saklar. | Widget Paneli |
| **📝 Kod Parçacıkları** | Sık kullandığınız kod bloklarını veya metinleri kaydedin ve yönetin. | Snippets Sekmesi |
| **⏱️ Pomodoro Sayacı** | Çalışma/mola aralıklarına sahip dahili odaklanma zamanlayıcısı. | Araçlar Bölümü |
| **☁️ Hava Durumu & 💱 Döviz** | Canlı hava durumu ve güncel döviz kurları (USD, EUR, GBP). | Dashboard Widget'ları |
| **📊 Sistem Monitörü** | Gerçek zamanlı işlemci (CPU) ve bellek (RAM) kullanım grafikleri. | Dashboard |
| **⏰ Alarmlar** | Doğrudan başlatıcı üzerinden hatırlatıcılar ve alarmlar kurun. | Araçlar Bölümü |
| **🎨 Temalar** | Şık temalar (Gece Yarısı, Okyanus, Gün Batımı vb.) arasında geçiş yapın. | Ayarlar (Çark İkonu) |
| **🌐 Web Kısayolları** | Google, ChatGPT, Netflix ve daha fazlasına hızlı erişim. | Kısayol Izgarası |

---

## 📸 Ekran Görüntüleri

### Kontrol Paneli (Dashboard)
Tüm widget'lara, kısayollara ve sistem istatistiklerine tek bakışta ulaşın.
![Dashboard](assets/2.png)

### Arama ve Sonuçlar
Bilgisayarınızdaki dosya ve klasörleri saniyeler içinde bulun.
![Search](assets/3.png)

---

## 🛠️ Kurulum

### Seçenek 1: Kurulum Dosyası ile (Önerilen)
1. GitHub Releases sayfasından en son `SpaceHub Setup.exe` dosyasını indirin.
2. Kurulumu çalıştırın.
3. Uygulama otomatik olarak başlayacak ve sistem tepsisine (saat yanına) yerleşecektir.

### Seçenek 2: Kaynak Koddan Çalıştırma (Geliştirici Modu)
Projeyi yerel ortamınızda çalıştırmak isterseniz:

1. **Depoyu klonlayın:**
   ```bash
   git clone https://github.com/alicantzl/Space-Launcher.git
   cd Space-Launcher
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Uygulamayı Başlatın:**
   * **`run.bat` kullanın (Windows için Önerilen):**
     Bu dosya, ortam değişkenlerini ve modül çakışmalarını otomatik olarak yönetir.
     `run.bat` dosyasına çift tıklayın veya terminalden çalıştırın:
     ```cmd
     .\run.bat
     ```
   * *Not: Doğrudan `npm start` kullanmak modül yükleme hatasına neden olabilir, lütfen `run.bat` kullanın.*

---

## 🚀 Kullanım Rehberi

1. **Başlatma:** Masaüstü kısayolunu veya `run.bat` dosyasını kullanın.
2. **Erişim:** Başlatıcıyı gizlemek/göstermek için **`Alt + Space`** (veya `Super + Space`) tuşlarına basın.
3. **Arama:** Uygulama veya dosya aramak için yazmaya başlayın.
4. **Komutlar:**
   - Görev Yöneticisi için: `cmd:taskmgr`
   - Website açmak için: `url:google.com`
   - Hesap Makinesi için: `app:calc`
5. **Sistem Tepsisi:** Uygulamayı tamamen kapatmak veya yeniden başlatmak için sağ alttaki (saat yanı) ikonu kullanın.

---

## 📦 Paketleme / Setup Oluşturma

Dağıtım için bir kurulum dosyası (`.exe`) oluşturmak isterseniz:

1. Uygulamayı tamamen **kapatın**.
2. Derleme komut dosyasını çalıştırın:
   ```cmd
   .\build.bat
   ```
3. Oluşturulan kurulum dosyası `dist/` klasöründe yer alacaktır.

---

## 🔧 Teknik Detaylar
- **Altyapı:** Electron v28.2.0 (LTS)
- **Diller:** JavaScript (CommonJS), HTML5, CSS3 (Glassmorphism)
- **Backend:** Node.js Entegrasyonu (PowerShell alt süreçleri ile arama)
- **Depolama:** Yerel JSON dosyaları (`userData` klasöründe)

## 📄 Lisans
MIT Lisansı. Özgürce kullanabilir ve geliştirebilirsiniz.

---
Geliştirici: [Alican](https://github.com/alicantzl)
