import os
import json
import subprocess
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['BACKGROUNDS_FOLDER'] = 'backgrounds'
app.config['TASARIM_FOLDER'] = 'tasarim'
app.config['OUTPUT_FOLDER'] = 'output'
app.config['CONFIG_FILE'] = 'config.json'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB max upload

# Klasörleri oluştur
for folder in [app.config['BACKGROUNDS_FOLDER'], app.config['TASARIM_FOLDER'], app.config['OUTPUT_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

if not os.path.exists(app.config['CONFIG_FILE']):
    with open(app.config['CONFIG_FILE'], 'w', encoding='utf-8') as f:
        json.dump({}, f)

@app.route('/')
def index():
    return render_template('index.html')

# Görselleri sunmak için route'lar
@app.route('/backgrounds/<path:filename>')
def serve_background(filename):
    return send_from_directory(app.config['BACKGROUNDS_FOLDER'], filename)

@app.route('/tasarim/<path:filename>')
def serve_tasarim(filename):
    return send_from_directory(app.config['TASARIM_FOLDER'], filename)

@app.route('/output/<path:filename>')
def serve_output(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

# API: Arkaplan listesi
@app.route('/api/backgrounds', methods=['GET'])
def list_backgrounds():
    files = [f for f in os.listdir(app.config['BACKGROUNDS_FOLDER']) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    return jsonify(files)

# API: Tasarım listesi
@app.route('/api/designs', methods=['GET'])
def list_designs():
    files = [f for f in os.listdir(app.config['TASARIM_FOLDER']) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    return jsonify(files)

# API: Config Oku/Yaz
@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        try:
            with open(app.config['CONFIG_FILE'], 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        except Exception as e:
            return jsonify({}), 200
            
    elif request.method == 'POST':
        data = request.json
        # Mevcut configi oku
        current_config = {}
        if os.path.exists(app.config['CONFIG_FILE']):
            try:
                with open(app.config['CONFIG_FILE'], 'r', encoding='utf-8') as f:
                    current_config = json.load(f)
            except:
                pass
        
        # Güncelle
        for k, v in data.items():
            current_config[k] = v
            
        with open(app.config['CONFIG_FILE'], 'w', encoding='utf-8') as f:
            json.dump(current_config, f, indent=4)
        return jsonify({"status": "success"})

# API: Mockup Üret
@app.route('/api/generate', methods=['POST'])
def generate_mockups():
    try:
        # Arka planda generate.py'yi çalıştır
        result = subprocess.run(['python', 'generate.py'], capture_output=True, text=True)
        return jsonify({"status": "success", "output": result.stdout, "error": result.stderr})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# API: Arkaplan Temizleme (rembg)
@app.route('/api/remove-bg', methods=['POST'])
def remove_bg():
    if 'file' not in request.files:
        return jsonify({"error": "Dosya bulunamadı"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Dosya seçilmedi"}), 400
        
    try:
        # Gecikmeli import (Uygulama hızlı başlasın diye)
        from rembg import remove
        from PIL import Image
        import io
        
        input_image = Image.open(file.stream)
        output_image = remove(input_image)
        
        # Kaydet
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        out_filename = f"{name}_nobg.png"
        out_path = os.path.join(app.config['TASARIM_FOLDER'], out_filename)
        
        output_image.save(out_path, format="PNG")
        
        return jsonify({"status": "success", "filename": out_filename})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API: Normal Dosya Yükleme (Şablon veya Tasarım)
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "Dosya bulunamadı"}), 400
    
    file = request.files['file']
    upload_type = request.form.get('type', 'background') # background veya design
    
    if file.filename == '':
        return jsonify({"error": "Dosya seçilmedi"}), 400
        
    filename = secure_filename(file.filename)
    if upload_type == 'design':
        filepath = os.path.join(app.config['TASARIM_FOLDER'], filename)
    else:
        filepath = os.path.join(app.config['BACKGROUNDS_FOLDER'], filename)
        
    file.save(filepath)
    return jsonify({"status": "success", "filename": filename})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
