# Mockup Studio 🎨

Mockup Studio, manuel olarak Photoshop ile yapılan saatler süren mockup yerleştirme işlemlerini otomatize eden **Yapay Zeka Destekli (rembg)** ve **OpenCV** tabanlı yerel bir web uygulamasıdır. Özellikle Etsy, Shopify gibi e-ticaret platformlarında satış yapan tasarımcılar için geliştirilmiştir.

Uygulama, modern **dark-theme premium arayüz tasarımı** ve gelişmiş düzenleme araçlarıyla profesyonel bir stüdyo deneyimi sunar.

---

## Yeni Nesil Özellikler ✨

### 1. Gelişmiş Editör Çalışma Alanı (Editor Workspace)
* **Zoom & Pan (Yakınlaştırma ve Kaydırma):** Büyük şablonlar üzerinde çalışırken mouse tekerleğiyle yakınlaşabilir, `Shift + Sol Tık` veya mouse tekerleğine basılı tutarak çalışma alanını serbestçe kaydırabilirsiniz.
* **Sınır Çizgilerinden Eğme (Edge Dragging):** Perspektif alanını sadece köşelerden değil, kenar çizgilerini mor parlama efekti eşliğinde doğrudan sürükleyerek de bükebilirsiniz.
* **Hassas Konumlandırma Büyüteci (Loupe/Magnifier):** Köşe noktalarını sürüklerken imlecin üzerinde açılan **3x büyütülmüş, artı hedef işaretli (crosshair)** büyüteç penceresi sayesinde dikiş paylarını ve köşe kıvrımlarını piksel hassasiyetinde yakalarsınız.

### 2. Kategori ve Sabit/Özel Oran Sistemi
* **Hazır Şablon Kategorileri:** Tasarım yapacağınız ürün türüne göre en-boy oranlarını anında sabitleyebilirsiniz:
  - 👕 **T-Shirt:** 14" x 16" (1750x2000px, 7:8 oran)
  - 🧥 **Hoodie / Sweatshirt:** 12" x 16" (1500x2000px, 3:4 oran)
  - ☕ **Mug:** Kupa tek taraf (1000x1000px, 1:1 oran)
  - ☕ **Mug Wrap:** Kupa çevreleme (2400x1000px, 12:5 oran)
  - 🖼 **Poster / Tablo:** (2000x3000px, 2:3 oran)
  - 🛍 **Totebag:** Bez çanta (1500x1500px, 1:1 oran)
  - 📱 **Phone Case:** Telefon kılıfı (1000x2000px, 1:2 oran)
  - **Custom (Serbest Oran):** Kendi özel piksel ölçülerinizi el ile girme imkanı.
* **Heterojen Üretim Desteği:** Her şablonun kendi kategorisi ve çözünürlüğü şablon bazlı kaydedilir. Tek bir bulk üretimde tişört, kupa ve poster şablonları kendi özgün oranlarıyla aynı anda üretilebilir.

### 3. Orantılı Ölçekleme Slider'ı (Design Scale)
* Perspektif eğikliğini, açılarını ve en-boy oranını bozmadan tasarımı tam merkezinden orantılı olarak küçültüp büyütebilmeniz için **Design Scale Slider** entegre edilmiştir (%10 - %200 aralığında).
* Köşeleri el ile çekiştirdiğinizde slider otomatik olarak `%100` değerine sıfırlanır ve yeni yerleşimi referans alır.

### 4. Akıllı Maskeleme ve Kırpma Aracı
* Zoom yapıldığında kırpma koordinatlarının kayması sorunu giderilmiştir.
* 2+ nokta eklendiğinde çizgi şeklinde maske yolunu önizleyebilirsiniz.
* Silme esnasında tıklama kabarması (`bubbling`) engellenerek noktalar çift tetiklenme olmadan kolayca temizlenir.

### 5. `canvas.png` Güvenli Dosya Koruması
* Düzenlemede oran referansı sağlayan `canvas.png` dosyası API katmanında silinmeye karşı korumalıdır.
* Şablon listesinde silme butonu gizlenmiştir.
* Kredi maliyet hesaplamalarından, mockup adet sayımlarından ve bulk mockup üretim çıktılarından otomatik olarak hariç tutulur.

---

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
   *(Not: rembg yapay zeka modeli ilk çalıştırmada bir defaya mahsus ~160MB boyutunda bir model indirecektir).*

---

## Kullanım 🚀

1. Flask sunucusunu başlatın:
   ```bash
   python app.py
   ```

2. Tarayıcınızı açın ve aşağıdaki adrese gidin:
   ```
   http://127.0.0.1:5000
   ```
   *(Aynı Wi-Fi ağına bağlı telefonunuzdan da bilgisayarınızın yerel IP adresi ile (Örn: `http://192.168.1.X:5000/studio`) sisteme erişip mockup düzenleyebilirsiniz).*

3. **Şablon Ekleyin:** Sol panelden şablon yükleyin veya `backgrounds` klasörüne atın.
4. **Kategori & Perspektif Ayarlayın:** Şablon ayarlarından kategoriyi (Örn: T-shirt) seçin, 4 noktayı veya kenar çizgilerini sürükleyerek ya da slider'ı kaydırarak baskı alanını belirleyin ve "Save Settings" ile kaydedin.
5. **Tasarımları Yükleyin:** Arayüzden baskı yapılacak logolarınızı bulk olarak yükleyin.
6. **Üretin:** "Generate All Mockups" butonuna basın. Sonuçlar saniyeler içinde `output` klasörüne kaydedilecektir.

---

## Teknolojiler 💻

- **Backend:** Python, Flask (real-time progress SSE stream)
- **Görüntü İşleme:** OpenCV (cv2), NumPy
- **Yapay Zeka:** rembg (U-2-Net yerel arka plan silme)
- **Frontend:** HTML5 (CSS Variables), Vanilla Javascript, SVG Overlay Rendering

---
*Geliştirici:* [turkerpro](https://github.com/turkerpro)*
