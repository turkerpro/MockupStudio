import os
import json
import hashlib
import subprocess
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'mockup-studio-secret-2024-change-in-production'

app.config['BACKGROUNDS_FOLDER'] = 'backgrounds'
app.config['TASARIM_FOLDER'] = 'tasarim'
app.config['OUTPUT_FOLDER'] = 'output'
app.config['CONFIG_FILE'] = 'config.json'
app.config['USERS_FILE'] = 'users.json'
app.config['SITE_CONFIG_FILE'] = 'site_config.json'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# --- Klasörleri oluştur ---
for folder in [app.config['BACKGROUNDS_FOLDER'], app.config['TASARIM_FOLDER'], app.config['OUTPUT_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

# --- JSON helper'lar ---
def load_json(path, default={}):
    if not os.path.exists(path):
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return default

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- Varsayılan config dosyaları ---
if not os.path.exists(app.config['CONFIG_FILE']):
    save_json(app.config['CONFIG_FILE'], {})

if not os.path.exists(app.config['USERS_FILE']):
    # Demo admin hesabı
    admin_pass = hashlib.sha256('admin123'.encode()).hexdigest()
    save_json(app.config['USERS_FILE'], {
        'users': [{
            'id': 1,
            'email': 'admin@mockupstudio.com',
            'name': 'Admin',
            'password': admin_pass,
            'plan': 'business',
            'credits': 9999,
            'is_admin': True,
            'created_at': datetime.now().isoformat(),
            'total_generated': 0
        }],
        'next_id': 2
    })

if not os.path.exists(app.config['SITE_CONFIG_FILE']):
    save_json(app.config['SITE_CONFIG_FILE'], {
        'adsense_enabled': False,
        'adsense_client_id': '',
        'adsense_slot_sidebar': '',
        'adsense_slot_result': '',
        'sponsor_enabled': True,
        'sponsor_banner_html': '<div style="text-align:center;padding:10px;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:8px;font-size:12px;color:#a78bfa;">📢 Your Ad Here — <a href="#" style="color:#7c3aed;">Contact us</a></div>',
        'maintenance_mode': False,
        'site_name': 'Mockup Studio',
        'credit_costs': {
            'generate_single': 1,
            'generate_bulk': 5,
            'remove_bg': 2
        },
        'plans': {
            'free': {'name': 'Free', 'credits': 20, 'price': 0},
            'pro': {'name': 'Pro', 'credits': 500, 'price': 9.99},
            'business': {'name': 'Business', 'credits': 9999, 'price': 29.99}
        },
        'credit_packages': [
            {'credits': 50, 'price': 4.99},
            {'credits': 150, 'price': 9.99},
            {'credits': 500, 'price': 24.99}
        ]
    })

# --- Auth helpers ---
def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def find_user_by_email(email):
    users_data = load_json(app.config['USERS_FILE'], {'users': []})
    for u in users_data.get('users', []):
        if u['email'] == email:
            return u
    return None

def find_user_by_id(user_id):
    users_data = load_json(app.config['USERS_FILE'], {'users': []})
    for u in users_data.get('users', []):
        if u['id'] == user_id:
            return u
    return None

def update_user(user_id, updates):
    users_data = load_json(app.config['USERS_FILE'], {'users': []})
    for u in users_data['users']:
        if u['id'] == user_id:
            u.update(updates)
    save_json(app.config['USERS_FILE'], users_data)

def current_user():
    if 'user_id' not in session:
        return None
    return find_user_by_id(session['user_id'])

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user():
            return jsonify({'error': 'Unauthorized', 'redirect': '/'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        u = current_user()
        if not u or not u.get('is_admin'):
            return redirect('/')
        return f(*args, **kwargs)
    return decorated

def deduct_credits(user_id, amount, action):
    u = find_user_by_id(user_id)
    if not u:
        return False, 'User not found'
    if u['credits'] < amount:
        return False, 'Insufficient credits'
    update_user(user_id, {'credits': u['credits'] - amount})
    return True, 'OK'

# --- Pages ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
@admin_required
def admin():
    return render_template('admin.html')

# --- Static files ---
@app.route('/backgrounds/<path:filename>')
def serve_background(filename):
    return send_from_directory(app.config['BACKGROUNDS_FOLDER'], filename)

@app.route('/tasarim/<path:filename>')
def serve_tasarim(filename):
    return send_from_directory(app.config['TASARIM_FOLDER'], filename)

@app.route('/output/<path:filename>')
def serve_output(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

# --- Auth API ---
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    password = data.get('password', '')
    if not email or not password or not name:
        return jsonify({'error': 'All fields required'}), 400
    if find_user_by_email(email):
        return jsonify({'error': 'Email already registered'}), 400
    users_data = load_json(app.config['USERS_FILE'], {'users': [], 'next_id': 1})
    site_cfg = load_json(app.config['SITE_CONFIG_FILE'])
    free_credits = site_cfg.get('plans', {}).get('free', {}).get('credits', 20)
    new_user = {
        'id': users_data.get('next_id', 2),
        'email': email,
        'name': name,
        'password': hash_password(password),
        'plan': 'free',
        'credits': free_credits,
        'is_admin': False,
        'created_at': datetime.now().isoformat(),
        'total_generated': 0
    }
    users_data['users'].append(new_user)
    users_data['next_id'] = new_user['id'] + 1
    save_json(app.config['USERS_FILE'], users_data)
    session['user_id'] = new_user['id']
    return jsonify({'status': 'success', 'user': {k: v for k, v in new_user.items() if k != 'password'}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    user = find_user_by_email(email)
    if not user or user['password'] != hash_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    session['user_id'] = user['id']
    return jsonify({'status': 'success', 'user': {k: v for k, v in user.items() if k != 'password'}})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'success'})

@app.route('/api/auth/me', methods=['GET'])
def me():
    u = current_user()
    if not u:
        return jsonify({'user': None})
    return jsonify({'user': {k: v for k, v in u.items() if k != 'password'}})

# --- Main APIs ---
@app.route('/api/backgrounds', methods=['GET'])
def list_backgrounds():
    files = [f for f in os.listdir(app.config['BACKGROUNDS_FOLDER']) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    return jsonify(files)

@app.route('/api/designs', methods=['GET'])
def list_designs():
    files = [f for f in os.listdir(app.config['TASARIM_FOLDER']) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    return jsonify(files)

@app.route('/api/gallery', methods=['GET'])
def gallery():
    files = [f for f in os.listdir(app.config['OUTPUT_FOLDER']) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(app.config['OUTPUT_FOLDER'], x)), reverse=True)
    return jsonify(files)

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        return jsonify(load_json(app.config['CONFIG_FILE']))
    u = current_user()
    if not u:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    current_config = load_json(app.config['CONFIG_FILE'])
    current_config.update(data)
    save_json(app.config['CONFIG_FILE'], current_config)
    return jsonify({'status': 'success'})

@app.route('/api/generate', methods=['POST'])
def generate_mockups():
    u = current_user()
    site_cfg = load_json(app.config['SITE_CONFIG_FILE'])
    costs = site_cfg.get('credit_costs', {})
    
    design_count = len([f for f in os.listdir(app.config['TASARIM_FOLDER']) if f.lower().endswith('.png')])
    bg_count = len([f for f in os.listdir(app.config['BACKGROUNDS_FOLDER']) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    total = design_count * bg_count
    
    # Only deduct credits if user is logged in
    cost = 0
    if u:
        cost = costs.get('generate_bulk', 5) if total >= 10 else costs.get('generate_single', 1) * total
        cost = max(1, cost)
        ok, msg = deduct_credits(u['id'], cost, 'generate')
        if not ok:
            return jsonify({'status': 'error', 'message': f'Not enough credits! Need {cost}, have {u["credits"]}. Please top up.'}), 402
    
    try:
        result = subprocess.run(['python', 'generate.py'], capture_output=True, text=True, timeout=300)
        if u:
            u_fresh = find_user_by_id(u['id'])
            update_user(u['id'], {'total_generated': u_fresh.get('total_generated', 0) + total})
        return jsonify({'status': 'success', 'output': result.stdout, 'cost': cost, 'total': total})
    except Exception as e:
        if u:
            u_fresh = find_user_by_id(u['id'])
            update_user(u['id'], {'credits': u_fresh['credits'] + cost})
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/remove-bg', methods=['POST'])
@login_required
def remove_bg():
    u = current_user()
    site_cfg = load_json(app.config['SITE_CONFIG_FILE'])
    cost = site_cfg.get('credit_costs', {}).get('remove_bg', 2)
    ok, msg = deduct_credits(u['id'], cost, 'remove_bg')
    if not ok:
        return jsonify({'error': f'Not enough credits! Need {cost}.'}), 402
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    try:
        from rembg import remove
        from PIL import Image
        input_image = Image.open(file.stream)
        output_image = remove(input_image)
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        out_filename = f"{name}_nobg.png"
        output_image.save(os.path.join(app.config['TASARIM_FOLDER'], out_filename), format='PNG')
        return jsonify({'status': 'success', 'filename': out_filename})
    except Exception as e:
        u_fresh = find_user_by_id(u['id'])
        update_user(u['id'], {'credits': u_fresh['credits'] + cost})
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    upload_type = request.form.get('type', 'background')
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    filename = secure_filename(file.filename)
    folder = app.config['TASARIM_FOLDER'] if upload_type == 'design' else app.config['BACKGROUNDS_FOLDER']
    file.save(os.path.join(folder, filename))
    return jsonify({'status': 'success', 'filename': filename})

@app.route('/api/site-config', methods=['GET'])
def get_site_config():
    cfg = load_json(app.config['SITE_CONFIG_FILE'])
    # Don't expose everything to non-admins
    u = current_user()
    if not u or not u.get('is_admin'):
        return jsonify({
            'adsense_enabled': cfg.get('adsense_enabled'),
            'adsense_client_id': cfg.get('adsense_client_id'),
            'adsense_slot_sidebar': cfg.get('adsense_slot_sidebar'),
            'adsense_slot_result': cfg.get('adsense_slot_result'),
            'sponsor_enabled': cfg.get('sponsor_enabled'),
            'sponsor_banner_html': cfg.get('sponsor_banner_html'),
            'credit_costs': cfg.get('credit_costs'),
            'plans': cfg.get('plans'),
            'credit_packages': cfg.get('credit_packages'),
            'site_name': cfg.get('site_name')
        })
    return jsonify(cfg)

# --- Admin APIs ---
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_users():
    users_data = load_json(app.config['USERS_FILE'], {'users': []})
    safe_users = [{k: v for k, v in u.items() if k != 'password'} for u in users_data['users']]
    return jsonify(safe_users)

@app.route('/api/admin/users/<int:user_id>', methods=['PATCH'])
@admin_required
def admin_update_user(user_id):
    data = request.json
    allowed = ['credits', 'plan', 'is_admin']
    updates = {k: v for k, v in data.items() if k in allowed}
    update_user(user_id, updates)
    return jsonify({'status': 'success'})

@app.route('/api/admin/site-config', methods=['POST'])
@admin_required
def admin_update_site_config():
    data = request.json
    cfg = load_json(app.config['SITE_CONFIG_FILE'])
    cfg.update(data)
    save_json(app.config['SITE_CONFIG_FILE'], cfg)
    return jsonify({'status': 'success'})

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    users_data = load_json(app.config['USERS_FILE'], {'users': []})
    output_count = len([f for f in os.listdir(app.config['OUTPUT_FOLDER']) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    total_generated = sum(u.get('total_generated', 0) for u in users_data['users'])
    return jsonify({
        'total_users': len(users_data['users']),
        'total_output_files': output_count,
        'total_generated': total_generated,
        'plans': {
            'free': sum(1 for u in users_data['users'] if u.get('plan') == 'free'),
            'pro': sum(1 for u in users_data['users'] if u.get('plan') == 'pro'),
            'business': sum(1 for u in users_data['users'] if u.get('plan') == 'business'),
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
