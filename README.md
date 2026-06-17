# Mockup Studio 🎨

Mockup Studio, manuel olarak Photoshop ile yapılan saatler süren mockup yerleştirme işlemlerini otomatize eden **Yapay Zeka Destekli (rembg)** ve **OpenCV** tabanlı yerel bir web uygulamasıdır. Özellikle Etsy, Shopify gibi platformlarda satış yapan tasarımcılar için geliştirilmiştir.

## Özellikler ✨

- **Akıllı Perspektif (Smart Object):** Eklediğiniz tasarımların en-boy oranlarını bozmadan, tıpkı Photoshop'taki Smart Object gibi şablonun içine 3 boyutlu bükerek yerleştirir.
- **Yapay Zeka Arkaplan Temizleme:** `rembg` kütüphanesi sayesinde, tasarımlarınızın arka planını internete bağlı olmadan tamamen yerel cihazınızda temizler.
- **Manuel Kırpma Maskesi:** Tişört veya kupaların dışına taşan kısımlar için arayüz üzerinden poligonal kırpma maskeleri çizebilirsiniz.
- **Toplu Üretim (Bulk Generate):** Onlarca farklı tasarımı tek seferde tüm kayıtlı şablonlarınıza otomatik olarak basıp `output` klasörüne kaydeder.
- **Tarayıcı Tabanlı Arayüz:** Flask ile geliştirilmiş kullanıcı dostu bir arayüze sahiptir. Kendi cihazınızda çalışırken, aynı ağdaki telefonunuzdan bile erişip yönetebilirsiniz.

## Kurulum 🛠️

Proje Python 3.x gerektirir. Kurulumu gerçekleştirmek için bilgisayarınızda Python yüklü olduğundan emin olun.

1. Depoyu bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/turkerpro/MockupStudio.git
   cd MockupStudio
   ```

2. Gerekli Python kütüphanelerini yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
   *(Not: rembg yapay zeka modeli ilk çalıştırmada bir defaya mahsus 160MB boyutunda bir model indirecektir).*

## Kullanım 🚀

1. Flask sunucusunu başlatın:
   ```bash
   python app.py
   ```

2. Tarayıcınızı açın ve aşağıdaki adrese gidin:
   ```
   http://127.0.0.1:5000
   ```
   *(Aynı Wi-Fi ağına bağlı telefonunuzdan da bilgisayarınızın yerel IP adresi ile (Örn: `http://192.168.1.X:5000`) sisteme erişebilirsiniz).*

3. **Şablon Ekleyin:** `backgrounds` klasörüne dilediğiniz şablonları ekleyin veya arayüz üzerinden yükleyin.
4. **Koordinatları Belirleyin:** Arayüzdeki 4 noktayı çekiştirerek baskı alanını ve perspektifi belirleyin, ardından "Ayarları Kaydet"e basın.
5. **Tasarımları Yükleyin:** `tasarim` klasörüne (veya arayüz üzerinden) baskı alınacak tasarımlarınızı yükleyin.
6. **Üretin:** "Tüm Mockupları Üret" butonuna bastığınızda sonuçlar saniyeler içinde `output` klasörüne yansıyacaktır.

## Klasör Yapısı 📁

- `app.py`: Ana sunucu ve API bağlantıları.
- `generate.py`: OpenCV ve NumPy kullanan ana görüntü işleme (warp) motoru.
- `config.json`: Şablonların koordinat ve maske bilgilerinin tutulduğu veritabanı.
- `backgrounds/`: Üzerine baskı yapılacak boş şablon görselleri (tişört, kupa vb.).
- `tasarim/`: Baskı alınacak tasarım/logo dosyalarınız.
- `output/`: Çıktısı alınan nihai mockup görselleri.
- `templates/`: Flask HTML arayüz dosyaları.

## Teknolojiler 💻

- **Backend:** Python, Flask
- **Görüntü İşleme:** OpenCV (cv2), NumPy
- **Yapay Zeka:** rembg (U-2-Net)
- **Frontend:** HTML5, CSS3, Vanilla JS, SVG Rendering

---
*Geliştirici:* [turkerpro](https://github.com/turkerpro)*
