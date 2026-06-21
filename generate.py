import os
import json
import cv2
import numpy as np

def main():
    # Klasör yolları
    tshirts_dir = "backgrounds"
    tasarim_dir = "tasarim"
    output_dir = "output"
    config_file = "config.json"

    # Çıktı klasörünü oluştur
    os.makedirs(output_dir, exist_ok=True)

    # Config dosyasını oku
    if not os.path.exists(config_file):
        print(f"HATA: {config_file} bulunamadı! Lütfen önce config_helper.html kullanarak koordinatları belirleyin ve kaydedin.")
        return

    with open(config_file, "r", encoding="utf-8") as f:
        try:
            config = json.load(f)
        except json.JSONDecodeError:
            print(f"HATA: {config_file} formatı hatalı. Geçerli bir JSON olduğundan emin olun.")
            return

    # Tişört görsellerini bul
    tshirt_files = [f for f in os.listdir(tshirts_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    # Tasarım görsellerini bul
    tasarim_files = [f for f in os.listdir(tasarim_dir) if f.lower().endswith(('.png'))]

    if not tshirt_files:
        print(f"HATA: '{tshirts_dir}' klasöründe hiç tişört görseli bulunamadı.")
        return
    if not tasarim_files:
        print(f"HATA: '{tasarim_dir}' klasöründe hiç tasarım (.png) bulunamadı.")
        return

    # Referans 'canvas' görselini bul ve boyutlarını al (Oranları korumak için)
    canvas_w, canvas_h = None, None
    for d_file in tasarim_files:
        if "canvas" in d_file.lower():
            c_path = os.path.join(tasarim_dir, d_file)
            c_img = cv2.imdecode(np.fromfile(c_path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
            if c_img is not None:
                canvas_h, canvas_w = c_img.shape[:2]
                break

    # Tasarımlardan canvas dosyasını çıkar, gerçek tasarımları belirle
    real_tasarim_files = [f for f in tasarim_files if 'canvas' not in f.lower()]
    # Config'de tanımlı tişörtleri filtrele (canvas.png hariç)
    valid_tshirt_files = [f for f in tshirt_files if f in config and len(config[f].get('points', [])) == 4 and f.lower() != 'canvas.png']

    total_mockups = len(valid_tshirt_files) * len(real_tasarim_files)

    print(f"Toplam {len(valid_tshirt_files)} tişört ve {len(real_tasarim_files)} tasarım bulundu.")
    if canvas_w and canvas_h:
        print(f"Referans Canvas boyutu algılandı: {canvas_w}x{canvas_h}. Tüm tasarımlar bu orana göre sığdırılacak.")
    print(f"TOTAL:{total_mockups}")
    print("Mockup üretim işlemi başlıyor...\n")

    done_count = 0
    for t_file in valid_tshirt_files:
        t_path = os.path.join(tshirts_dir, t_file)
        
        # Tişört için config kontrolü
        if t_file not in config:
            print(f"UYARI: '{t_file}' için config.json içinde ayar bulunamadı. Bu tişört atlanıyor...")
            continue
            
        settings = config[t_file]
        points = settings.get("points")
        if not points or len(points) != 4:
            print(f"HATA: '{t_file}' için config.json'da geçerli 4 'points' (nokta) bulunamadı. Lütfen yeni HTML aracını kullanarak noktaları belirleyin.")
            continue
            
        dst_pts = np.float32(points)

        # Tişörtü yükle
        tshirt_img = cv2.imdecode(np.fromfile(t_path, dtype=np.uint8), cv2.IMREAD_COLOR)
        if tshirt_img is None:
            print(f"HATA: '{t_file}' yüklenirken sorun oluştu.")
            continue
            
        tshirt_h, tshirt_w = tshirt_img.shape[:2]

        for d_file in real_tasarim_files:
            d_path = os.path.join(tasarim_dir, d_file)
            
            # Tasarımı RGBA (Alpha kanalı dahil) yükle
            design_img = cv2.imdecode(np.fromfile(d_path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
            if design_img is None:
                print(f"HATA: '{d_file}' yüklenirken sorun oluştu.")
                continue
                
            # Eğer tasarımda alpha kanalı yoksa ekle (RGB -> RGBA)
            if design_img.shape[2] == 3:
                design_img = cv2.cvtColor(design_img, cv2.COLOR_BGR2BGRA)
                
            d_h, d_w = design_img.shape[:2]

            # Template spesifik canvas boyutu varsa öncelikli kullan
            t_canvas_w = settings.get("canvas_width")
            t_canvas_h = settings.get("canvas_height")
            if t_canvas_w and t_canvas_h:
                ref_w, ref_h = t_canvas_w, t_canvas_h
            elif canvas_w and canvas_h:
                ref_w, ref_h = canvas_w, canvas_h
            else:
                ref_w, ref_h = d_w, d_h

                
            # Orantılı ölçekleme (object-fit: contain)
            scale = min(ref_w / d_w, ref_h / d_h)
            new_w = int(d_w * scale)
            new_h = int(d_h * scale)
            
            resized_design = cv2.resize(design_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            # Şeffaf sanal canvas oluştur
            virtual_canvas = np.zeros((ref_h, ref_w, 4), dtype=np.uint8)
            
            # Tasarımı ortala
            x_offset = (ref_w - new_w) // 2
            y_offset = (ref_h - new_h) // 2
            virtual_canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized_design

            # Kaynak noktalar: Sanal canvas'ın 4 köşesi
            src_pts = np.float32([
                [0, 0],
                [ref_w, 0],
                [ref_w, ref_h],
                [0, ref_h]
            ])
            
            # Perspektif dönüşüm matrisini hesapla
            matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
            
            # Sanal canvas'ı (içinde ortalanmış tasarım var) tişört boyutlarına warp et
            warped_design = cv2.warpPerspective(virtual_canvas, matrix, (tshirt_w, tshirt_h))
            
            # Multiply blend işlemi (NumPy ile hızlıca)
            # warped_design BGRA formatında. BGR (0,1,2) ve Alpha (3) kanallarını ayır
            warped_bgr = warped_design[:, :, :3]
            alpha = (warped_design[:, :, 3] / 255.0) * 0.90
            
            # Özel kırpma maskesi (mask_points) varsa uygula
            mask_points = settings.get("mask_points")
            if mask_points and len(mask_points) >= 3:
                mask = np.zeros((tshirt_h, tshirt_w), dtype=np.uint8)
                cv2.fillPoly(mask, [np.int32(mask_points)], 255)
                alpha = alpha * (mask / 255.0)
            
            # Maskeyi 3 kanallı hale getir (RGB için)
            alpha_3d = np.expand_dims(alpha, axis=2)
            
            tshirt_float = tshirt_img.astype(float)
            design_float = warped_bgr.astype(float)
            
            # --- Multiply Blend Hesaplaması (Katman 2) ---
            base_norm = tshirt_float / 255.0
            blend_norm = design_float / 255.0
            
            multiply_result = base_norm * blend_norm * 255.0
            
            # Katman 1 (Arka): Tişört %100 opacity -> tshirt_float
            # Katman 2 (Orta): Tasarım %95 opacity (Multiply Blend)
            mid_alpha = alpha_3d * 0.95
            mid_layer = (1.0 - mid_alpha) * tshirt_float + mid_alpha * multiply_result
            
            # Katman 3 (Ön): Tişört %5 opacity
            final_float = 0.95 * mid_layer + 0.05 * tshirt_float
            
            # 8-bit integer'a geri dönüştür
            result_img = np.clip(final_float, 0, 255).astype(np.uint8)
            
            # Çıktı dosya adını hazırla
            t_name = os.path.splitext(t_file)[0]
            d_name = os.path.splitext(d_file)[0]
            out_filename = f"{t_name}_{d_name}.jpg"
            out_path = os.path.join(output_dir, out_filename)
            
            # Kaydet - Unicode destekli
            is_success, im_buf_arr = cv2.imencode(".jpg", result_img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
            if is_success:
                im_buf_arr.tofile(out_path)
            done_count += 1
            print(f"PROGRESS:{done_count}:{total_mockups}")
            import sys; sys.stdout.flush()

    print("\nIslem tamamlandi! Mockuplar 'output' klasorune kaydedildi.")

if __name__ == "__main__":
    main()
