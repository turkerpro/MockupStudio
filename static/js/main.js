const savedTheme=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
document.documentElement.setAttribute('data-theme',savedTheme);
window.addEventListener('DOMContentLoaded',()=>{const btn=document.getElementById('theme-toggle');if(btn)btn.textContent=savedTheme==='dark'?'☀️':'🌙';});
function toggleTheme(){const cur=document.documentElement.getAttribute('data-theme');const next=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);localStorage.setItem('theme',next);document.getElementById('theme-toggle').textContent=next==='dark'?'☀️':'🌙';}
let currentUser=null,guestCredits=20,globalConfig={},siteConfig={},currentBgFile=null;
let points=[],maskPoints=[],isDrawingMask=false;
let draggingType=null,draggingIdx=-1,dragStartX=0,dragStartY=0,originalPoints=[];
let imgNaturalWidth=1,imgNaturalHeight=1,designW=100,designH=100;
let magnifier=null,magCanvas=null;
let sliderRefPoints=[];
const handles=['pt-tl','pt-tr','pt-br','pt-bl'].map(id=>document.getElementById(id));
const edges=['edge-top','edge-right','edge-bottom','edge-left'].map(id=>document.getElementById(id));
const polyVisible=document.getElementById('poly-visible');
const polyClip=document.getElementById('poly-clip');
const polyMask=document.getElementById('poly-mask');
const maskPointsGroup=document.getElementById('mask-points-group');
const workspace=document.getElementById('workspace');
const tshirtImg=document.getElementById('tshirt-img');
const tshirtImgFront=document.getElementById('tshirt-img-front');
const designImg=document.getElementById('design-img');
const svgOverlay=document.getElementById('svg-overlay');

// Initialize magnifier
if (!document.getElementById('handle-magnifier')) {
    magnifier = document.createElement('div');
    magnifier.id = 'handle-magnifier';
    magnifier.style.cssText = 'position:fixed;width:130px;height:130px;border-radius:50%;border:3px solid var(--accent);box-shadow:0 0 20px rgba(0,0,0,0.5),var(--sh-lg);overflow:hidden;display:none;z-index:99999;pointer-events:none;background:#000;';
    magCanvas = document.createElement('canvas');
    magCanvas.width = 130;
    magCanvas.height = 130;
    magCanvas.style.display = 'block';
    magnifier.appendChild(magCanvas);
    document.body.appendChild(magnifier);
}

function updateMagnifier(e){
    if(draggingType!=='handle'||draggingIdx===-1||!points[draggingIdx])return;
    magnifier.style.display='block';
    let magY=e.clientY-140;
    if(magY<10)magY=e.clientY+40;
    magnifier.style.left=(e.clientX-65)+'px';
    magnifier.style.top=magY+'px';
    const ctx=magCanvas.getContext('2d');
    ctx.clearRect(0,0,130,130);
    const natX=points[draggingIdx].x*(imgNaturalWidth/tshirtImg.width);
    const natY=points[draggingIdx].y*(imgNaturalHeight/tshirtImg.height);
    const zoomFactor=3;
    const sw=130/zoomFactor;
    const sh=130/zoomFactor;
    const sx=natX-sw/2;
    const sy=natY-sh/2;
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,130,130);
    try{
        ctx.drawImage(tshirtImg,sx,sy,sw,sh,0,0,130,130);
    }catch(err){}
    ctx.strokeStyle='#c4a1ff';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(65-10,65);ctx.lineTo(65+10,65);
    ctx.moveTo(65,65-10);ctx.lineTo(65,65+10);
    ctx.stroke();
    ctx.fillStyle='#ffffff';
    ctx.beginPath();
    ctx.arc(65,65,2.5,0,2*Math.PI);
    ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.2)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(65,65,62,0,2*Math.PI);
    ctx.stroke();
}
function hideMagnifier(){if(magnifier)magnifier.style.display='none';}

function showToast(msg,type='success',dur=4000){const tc=document.getElementById('toast-container');const t=document.createElement('div');t.className=`toast ${type}`;const icons={success:'✅',error:'❌',warning:'⚠️'};t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;tc.appendChild(t);setTimeout(()=>{t.style.animation='tIn 0.3s ease reverse';setTimeout(()=>t.remove(),300);},dur);}
function showLoader(t='Processing…'){document.getElementById('loader-text').innerText=t;document.getElementById('loader').classList.add('open');}
function hideLoader(){document.getElementById('loader').classList.remove('open');}
function switchTab(tab){document.querySelectorAll('.nav-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));document.querySelectorAll('.tab-content').forEach(t=>t.classList.toggle('active',t.id===`tab-${tab}`));if(tab==='gallery')loadGallery();if(tab==='pricing')loadPricing();if(tab==='dashboard')loadDashboard();}
document.querySelectorAll('.nav-tab').forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));
async function loadMe(){const res=await fetch('/api/auth/me');const data=await res.json();currentUser=data.user;if(data.guest_credits!==undefined)guestCredits=data.guest_credits;updateUserUI();}
function updateUserUI(){const av=document.getElementById('user-avatar-btn');const loginBtn=document.getElementById('nav-login-btn');if(!currentUser){av.style.display='none';loginBtn.style.display='block';document.getElementById('credit-count').textContent=guestCredits;document.getElementById('dd-name').textContent='Guest';document.getElementById('dd-email').textContent='Not signed in';document.getElementById('stat-credits').textContent=guestCredits;document.getElementById('stat-plan').textContent='GUEST';document.getElementById('stat-plan').className='badge badge-orange';document.getElementById('stat-generated').textContent='—';document.getElementById('welcome-msg').textContent='Welcome to Mockup Studio 👋';}else{av.style.display='flex';loginBtn.style.display='none';av.textContent=currentUser.name?.[0]?.toUpperCase()||'?';document.getElementById('credit-count').textContent=currentUser.credits;document.getElementById('dd-name').textContent=currentUser.name||currentUser.email;document.getElementById('dd-email').textContent=currentUser.email;document.getElementById('stat-credits').textContent=currentUser.credits;document.getElementById('stat-plan').textContent=(currentUser.plan||'free').toUpperCase();document.getElementById('stat-plan').className=`badge badge-${currentUser.plan==='business'?'green':currentUser.plan==='pro'?'blue':'orange'}`;document.getElementById('stat-generated').textContent=currentUser.total_generated||0;document.getElementById('welcome-msg').textContent=`Welcome back, ${currentUser.name?.split(' ')[0]||'there'} 👋`;document.getElementById('admin-link').style.display=currentUser.is_admin?'flex':'none';}const low=currentUser?currentUser.credits<5:guestCredits<5;document.getElementById('credit-warning').classList.toggle('show',low);}
function showAuthModal(){document.getElementById('auth-modal').classList.add('open');}
function hideAuthModal(){document.getElementById('auth-modal').classList.remove('open');}
function toggleUserMenu(){document.getElementById('user-dropdown').classList.toggle('open');}
document.addEventListener('click',e=>{if(!e.target.closest('#user-dropdown')&&!e.target.closest('#user-avatar-btn'))document.getElementById('user-dropdown').classList.remove('open');});
document.querySelectorAll('.modal-tab[data-authtab]').forEach(tab=>{tab.addEventListener('click',()=>{document.querySelectorAll('.modal-tab[data-authtab]').forEach(t=>t.classList.toggle('active',t===tab));document.querySelectorAll('.modal-form').forEach(f=>f.classList.toggle('active',f.id===`${tab.dataset.authtab}-form`));});});
document.getElementById('login-form').addEventListener('submit',async e=>{e.preventDefault();const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('login-email').value,password:document.getElementById('login-password').value})});const data=await res.json();if(data.status==='success'){currentUser=data.user;updateUserUI();hideAuthModal();showToast(`Welcome back, ${currentUser.name}! 👋`);}else showToast(data.message||'Login failed','error');});
document.getElementById('register-form').addEventListener('submit',async e=>{e.preventDefault();const res=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('reg-name').value,email:document.getElementById('reg-email').value,password:document.getElementById('reg-password').value})});const data=await res.json();if(data.status==='success'){currentUser=data.user;updateUserUI();hideAuthModal();showToast('Account created! 🎉');}else showToast(data.message||'Registration failed','error');});
async function doLogout(){await fetch('/api/auth/logout',{method:'POST'});currentUser=null;guestCredits=20;updateUserUI();document.getElementById('user-dropdown').classList.remove('open');showToast('Signed out');}
async function loadSiteConfig(){const res=await fetch('/api/site-config');siteConfig=await res.json();if(siteConfig.sponsor_banner_html){document.getElementById('sidebar-ad').innerHTML=siteConfig.sponsor_banner_html;document.getElementById('dashboard-ad').innerHTML=siteConfig.sponsor_banner_html;}}
async function loadDashboard(){const res=await fetch('/api/dashboard');const data=await res.json();document.getElementById('stat-output').textContent=data.output_files||0;if(currentUser){currentUser.credits=data.credits??currentUser.credits;currentUser.total_generated=data.total_generated??currentUser.total_generated;updateUserUI();}}
async function loadConfig(){const res=await fetch('/api/config');globalConfig=await res.json();updateCostLabel();}

function updateCostLabel(){
    const dc=Array.from(document.getElementById('design-list').children).filter(el=>{
        const name=el.querySelector('.file-name')?.textContent||'';
        return !name.toLowerCase().includes('canvas');
    }).length;
    const bc=Array.from(document.getElementById('bg-list').children).filter(el=>{
        const name=el.querySelector('.file-name')?.textContent||'';
        return name.toLowerCase()!=='canvas.png';
    }).length;
    const total=dc*bc;
    const cost=total*2;
    const el=document.getElementById('generate-cost-label');
    if(el)el.textContent=total>0?`${bc} templates x ${dc} designs = ${total} mockups — ${cost} credits`:'Upload templates and designs to generate';
}

async function loadBackgrounds(){
    const res=await fetch('/api/backgrounds');
    const files=await res.json();
    const list=document.getElementById('bg-list');
    list.innerHTML='';
    files.forEach(file=>{
        const item=document.createElement('button');
        item.className='file-item'+(file===currentBgFile?' selected':'');
        const isCanvas=file.toLowerCase()==='canvas.png';
        item.innerHTML=`<img class="file-thumb" src="/backgrounds/${encodeURIComponent(file)}" alt=""><span class="file-name">${file}</span>`+(isCanvas?'':`<button class="del-btn" title="Delete">x</button>`);
        item.querySelector('.file-name').addEventListener('click',()=>loadBackground(file));
        if(!isCanvas){
            item.querySelector('.del-btn').addEventListener('click',async ev=>{
                ev.stopPropagation();
                if(!confirm(`Delete ${file}?`))return;
                await fetch(`/api/backgrounds/${encodeURIComponent(file)}`,{method:'DELETE'});
                await loadBackgrounds();
                showToast('Template deleted');
            });
        }
        list.appendChild(item);
    });
    updateCostLabel();
}

async function loadDesigns(){
    const res=await fetch('/api/designs');
    const files=await res.json();
    const list=document.getElementById('design-list');
    list.innerHTML='';
    files.forEach(file=>{
        const item=document.createElement('button');
        item.className='file-item';
        const isCanvas=file.toLowerCase().includes('canvas');
        item.innerHTML=`<img class="file-thumb" src="/tasarim/${encodeURIComponent(file)}" alt=""><span class="file-name">${file}</span>`+(isCanvas?'':`<button class="del-btn" title="Delete">x</button>`);
        item.querySelector('.file-name').onclick=()=>{
            const url=`/tasarim/${encodeURIComponent(file)}`;
            designImg.onload=()=>{
                designW=parseInt(document.getElementById('template-width').value) || 1750;
                designH=parseInt(document.getElementById('template-height').value) || 2000;
                designImg.style.display='block';
                designImg.style.width=designW+'px';
                designImg.style.height=designH+'px';
                updateUI();
            };
            designImg.src=url;
            showToast(`Preview: ${file}`);
        };
        if(!isCanvas){
            item.querySelector('.del-btn').addEventListener('click',async ev=>{
                ev.stopPropagation();
                if(!confirm(`Delete ${file}?`))return;
                await fetch(`/api/designs/${encodeURIComponent(file)}`,{method:'DELETE'});
                await loadDesigns();
                showToast('Design deleted');
            });
        }
        list.appendChild(item);
    });
    updateCostLabel();
}

function loadBackground(filename){
    currentBgFile=filename;
    document.querySelectorAll('#bg-list .file-item').forEach(el=>el.classList.toggle('selected',el.querySelector('.file-name')?.textContent===filename));
    const settings=globalConfig[filename]||{};
    const stored=settings.points;
    
    // Set category controls
    const cat = settings.category || 'tshirt';
    const cw = settings.canvas_width || 1750;
    const ch = settings.canvas_height || 2000;
    document.getElementById('template-category').value = cat;
    document.getElementById('template-width').value = cw;
    document.getElementById('template-height').value = ch;
    document.getElementById('template-settings-section').style.display = 'block';
    designW = cw;
    designH = ch;
    if(designImg.src && designImg.style.display !== 'none'){
        designImg.style.width = designW + 'px';
        designImg.style.height = designH + 'px';
    }
    
    tshirtImg.onload=()=>{
        imgNaturalWidth=tshirtImg.naturalWidth;
        imgNaturalHeight=tshirtImg.naturalHeight;
        tshirtImgFront.style.display='block';
        svgOverlay.style.display='block';
        handles.forEach(h=>h.style.display='block');
        const rect=tshirtImg.getBoundingClientRect();
        const w=rect.width,h=rect.height;
        const sx=w/imgNaturalWidth,sy=h/imgNaturalHeight;
        if(stored&&stored.length===4){
            points=stored.map(p=>({x:p[0]*sx,y:p[1]*sy}));
        }else{
            const m=40;
            points=[{x:m,y:m},{x:w-m,y:m},{x:w-m,y:h-m},{x:m,y:h-m}];
        }
        sliderRefPoints=points.map(p=>({...p}));
        document.getElementById('design-scale-slider').value=100;
        document.getElementById('scale-value').textContent='100%';

        const mpts=settings.mask_points;
        if(mpts&&mpts.length>=3){
            maskPoints=mpts.map(p=>({x:p[0]*sx,y:p[1]*sy}));
        }else{
            maskPoints=[];
        }
        document.getElementById('workspace-placeholder').style.display='none';
        workspace.style.display='inline-block';
        updateUI();
    };
    tshirtImg.src=`/backgrounds/${encodeURIComponent(filename)}`;
    tshirtImgFront.src=`/backgrounds/${encodeURIComponent(filename)}`;
    updateCostLabel();
}

function adj(m){return[m[4]*m[8]-m[5]*m[7],m[2]*m[7]-m[1]*m[8],m[1]*m[5]-m[2]*m[4],m[5]*m[6]-m[3]*m[8],m[0]*m[8]-m[2]*m[6],m[2]*m[3]-m[0]*m[5],m[3]*m[7]-m[4]*m[6],m[1]*m[6]-m[0]*m[7],m[0]*m[4]-m[1]*m[3]];}
function multmm(a,b){var c=Array(9);for(var i=0;i<3;i++)for(var j=0;j<3;j++){c[3*i+j]=0;for(var k=0;k<3;k++)c[3*i+j]+=a[3*i+k]*b[3*k+j];}return c;}
function multmv(m,v){return[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];}
function basisToPoints(x1,y1,x2,y2,x3,y3,x4,y4){var m=[x1,x2,x3,y1,y2,y3,1,1,1];var v=multmv(adj(m),[x4,y4,1]);return multmm(m,[v[0],0,0,0,v[1],0,0,0,v[2]]);}
function solveLinearSystem(a,b_){var n=a.length;var mat=a.map((r,i)=>[...r,b_[i]]);for(var col=0;col<n;col++){var pivot=col;for(var row=col+1;row<n;row++)if(Math.abs(mat[row][col])>Math.abs(mat[pivot][col]))pivot=row;[mat[col],mat[pivot]]=[mat[pivot],mat[col]];for(var row=col+1;row<n;row++){var f=mat[row][col]/mat[col][col];for(var j=col;j<=n;j++)mat[row][j]-=f*mat[col][j];} }var x=b_.slice();for(var col=n-1;col>=0;col--){x[col]=mat[col][n];for(var j=col+1;j<n;j++)x[col]-=mat[col][j]*x[j];x[col]/=mat[col][col];}return x;}

function updateUI(){
    if(!points.length)return;
    const off={x:0,y:0};
    const pts=points.map(p=>({x:p.x+off.x,y:p.y+off.y}));
    polyVisible.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));
    polyClip.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));
    if(maskPoints.length>=2)polyMask.setAttribute('points',maskPoints.map(p=>`${p.x+off.x},${p.y+off.y}`).join(' '));else polyMask.setAttribute('points','');
    pts.forEach((p,i)=>{handles[i].style.left=p.x+'px';handles[i].style.top=p.y+'px';});
    const setLine=(id,p1,p2)=>{const l=document.getElementById(id);l.setAttribute('x1',p1.x);l.setAttribute('y1',p1.y);l.setAttribute('x2',p2.x);l.setAttribute('y2',p2.y);};
    setLine('edge-top',pts[0],pts[1]);
    setLine('edge-right',pts[1],pts[2]);
    setLine('edge-bottom',pts[2],pts[3]);
    setLine('edge-left',pts[3],pts[0]);
    if(designImg.src&&designImg.style.display!=='none'&&designW>0){
        var src=[{x:0,y:0},{x:designW,y:0},{x:designW,y:designH},{x:0,y:designH}];
        var a=[],b_=[];
        for(var i=0;i<4;i++){
            a.push([src[i].x,src[i].y,1,0,0,0,-src[i].x*pts[i].x,-src[i].y*pts[i].x]);
            b_.push(pts[i].x);
            a.push([0,0,0,src[i].x,src[i].y,1,-src[i].x*pts[i].y,-src[i].y*pts[i].y]);
            b_.push(pts[i].y);
        }
        var x=solveLinearSystem(a,b_);
        designImg.style.transform=`matrix3d(${[x[0],x[3],0,x[6],x[1],x[4],0,x[7],0,0,1,0,x[2],x[5],0,1].join(',')})`;
    }
    maskPointsGroup.innerHTML='';
    maskPoints.forEach((p,i)=>{
        const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx',p.x+off.x);
        c.setAttribute('cy',p.y+off.y);
        c.setAttribute('r',5);
        c.className.baseVal='mask-point';
        c.addEventListener('click',(e)=>{
            if(isDrawingMask){
                e.stopPropagation();
                maskPoints.splice(i,1);
                updateUI();
            }
        });
        maskPointsGroup.appendChild(c);
    });
}

handles.forEach((h,i)=>{
    h.addEventListener('mousedown',e=>{
        e.stopPropagation();
        draggingType='handle';
        draggingIdx=i;
        dragStartX=e.clientX;
        dragStartY=e.clientY;
        originalPoints=points.map(p=>({...p}));
        sliderRefPoints=points.map(p=>({...p}));
        document.getElementById('design-scale-slider').value=100;
        document.getElementById('scale-value').textContent='100%';
        updateMagnifier(e);
    });
});

edges.forEach((edge,i)=>{
    edge.addEventListener('mousedown',e=>{
        draggingType='edge';
        draggingIdx=i;
        dragStartX=e.clientX;
        dragStartY=e.clientY;
        originalPoints=points.map(p=>({...p}));
        sliderRefPoints=points.map(p=>({...p}));
        document.getElementById('design-scale-slider').value=100;
        document.getElementById('scale-value').textContent='100%';
    });
});

polyVisible.addEventListener('mousedown',e=>{
    draggingType='poly';
    dragStartX=e.clientX;
    dragStartY=e.clientY;
    originalPoints=points.map(p=>({...p}));
    sliderRefPoints=points.map(p=>({...p}));
    document.getElementById('design-scale-slider').value=100;
    document.getElementById('scale-value').textContent='100%';
});

document.addEventListener('mousemove',e=>{
    if(!draggingType)return;
    const dx=(e.clientX-dragStartX)/currentZoom,dy=(e.clientY-dragStartY)/currentZoom;
    const w=tshirtImg.width,h=tshirtImg.height;
    const lockPersp = document.getElementById('lock-perspective')?.checked;

    if(draggingType==='handle'){
        if(lockPersp){
            const oppIdx = (draggingIdx + 2) % 4;
            const p_opp = originalPoints[oppIdx];
            const diagX = originalPoints[draggingIdx].x - p_opp.x;
            const diagY = originalPoints[draggingIdx].y - p_opp.y;
            const mouseX = originalPoints[draggingIdx].x + dx - p_opp.x;
            const mouseY = originalPoints[draggingIdx].y + dy - p_opp.y;
            const dotProduct = mouseX * diagX + mouseY * diagY;
            const diagLenSq = diagX * diagX + diagY * diagY;
            let s = diagLenSq > 0 ? (dotProduct / diagLenSq) : 1;
            s = Math.max(0.1, Math.min(5.0, s));
            points = originalPoints.map(p => ({
                x: Math.max(0, Math.min(w, p_opp.x + (p.x - p_opp.x) * s)),
                y: Math.max(0, Math.min(h, p_opp.y + (p.y - p_opp.y) * s))
            }));
        } else {
            points[draggingIdx]={x:Math.max(0,Math.min(w,originalPoints[draggingIdx].x+dx)),y:Math.max(0,Math.min(h,originalPoints[draggingIdx].y+dy))};
        }
        updateMagnifier(e);
    }else if(draggingType==='edge'){
        if(lockPersp){
            let s = 1;
            if(draggingIdx === 0){ // Top Edge (connects p0 and p1)
                const dirX = (originalPoints[0].x - originalPoints[3].x + originalPoints[1].x - originalPoints[2].x) / 2;
                const dirY = (originalPoints[0].y - originalPoints[3].y + originalPoints[1].y - originalPoints[2].y) / 2;
                const dot = dx * dirX + dy * dirY;
                const lenSq = dirX * dirX + dirY * dirY;
                s = 1 + (lenSq > 0 ? (dot / lenSq) : 0);
                s = Math.max(0.1, Math.min(5.0, s));
                points[0] = {
                    x: Math.max(0, Math.min(w, originalPoints[3].x + (originalPoints[0].x - originalPoints[3].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[3].y + (originalPoints[0].y - originalPoints[3].y) * s))
                };
                points[1] = {
                    x: Math.max(0, Math.min(w, originalPoints[2].x + (originalPoints[1].x - originalPoints[2].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[2].y + (originalPoints[1].y - originalPoints[2].y) * s))
                };
            } else if(draggingIdx === 1){ // Right Edge (connects p1 and p2)
                const dirX = (originalPoints[1].x - originalPoints[0].x + originalPoints[2].x - originalPoints[3].x) / 2;
                const dirY = (originalPoints[1].y - originalPoints[0].y + originalPoints[2].y - originalPoints[3].y) / 2;
                const dot = dx * dirX + dy * dirY;
                const lenSq = dirX * dirX + dirY * dirY;
                s = 1 + (lenSq > 0 ? (dot / lenSq) : 0);
                s = Math.max(0.1, Math.min(5.0, s));
                points[1] = {
                    x: Math.max(0, Math.min(w, originalPoints[0].x + (originalPoints[1].x - originalPoints[0].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[0].y + (originalPoints[1].y - originalPoints[0].y) * s))
                };
                points[2] = {
                    x: Math.max(0, Math.min(w, originalPoints[3].x + (originalPoints[2].x - originalPoints[3].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[3].y + (originalPoints[2].y - originalPoints[3].y) * s))
                };
            } else if(draggingIdx === 2){ // Bottom Edge (connects p2 and p3)
                const dirX = (originalPoints[2].x - originalPoints[1].x + originalPoints[3].x - originalPoints[0].x) / 2;
                const dirY = (originalPoints[2].y - originalPoints[1].y + originalPoints[3].y - originalPoints[0].y) / 2;
                const dot = dx * dirX + dy * dirY;
                const lenSq = dirX * dirX + dirY * dirY;
                s = 1 + (lenSq > 0 ? (dot / lenSq) : 0);
                s = Math.max(0.1, Math.min(5.0, s));
                points[2] = {
                    x: Math.max(0, Math.min(w, originalPoints[1].x + (originalPoints[2].x - originalPoints[1].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[1].y + (originalPoints[2].y - originalPoints[1].y) * s))
                };
                points[3] = {
                    x: Math.max(0, Math.min(w, originalPoints[0].x + (originalPoints[3].x - originalPoints[0].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[0].y + (originalPoints[3].y - originalPoints[0].y) * s))
                };
            } else if(draggingIdx === 3){ // Left Edge (connects p3 and p0)
                const dirX = (originalPoints[3].x - originalPoints[2].x + originalPoints[0].x - originalPoints[1].x) / 2;
                const dirY = (originalPoints[3].y - originalPoints[2].y + originalPoints[0].y - originalPoints[1].y) / 2;
                const dot = dx * dirX + dy * dirY;
                const lenSq = dirX * dirX + dirY * dirY;
                s = 1 + (lenSq > 0 ? (dot / lenSq) : 0);
                s = Math.max(0.1, Math.min(5.0, s));
                points[3] = {
                    x: Math.max(0, Math.min(w, originalPoints[2].x + (originalPoints[3].x - originalPoints[2].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[2].y + (originalPoints[3].y - originalPoints[2].y) * s))
                };
                points[0] = {
                    x: Math.max(0, Math.min(w, originalPoints[1].x + (originalPoints[0].x - originalPoints[1].x) * s)),
                    y: Math.max(0, Math.min(h, originalPoints[1].y + (originalPoints[0].y - originalPoints[1].y) * s))
                };
            }
        } else {
            const ep=[[0,1],[1,2],[2,3],[3,0]][draggingIdx];
            ep.forEach(pi=>{
                points[pi]={x:Math.max(0,Math.min(w,originalPoints[pi].x+dx)),y:Math.max(0,Math.min(h,originalPoints[pi].y+dy))};
            });
        }
    }else if(draggingType==='poly'){
        points=originalPoints.map(p=>({x:Math.max(0,Math.min(w,p.x+dx)),y:Math.max(0,Math.min(h,p.y+dy))}));
    }
    updateUI();
});

document.addEventListener('mouseup',()=>{
    draggingType=null;
    hideMagnifier();
});

const btnDrawMask=document.getElementById('btn-draw-mask');
btnDrawMask.addEventListener('click',()=>{
    isDrawingMask=!isDrawingMask;
    if(isDrawingMask){
        btnDrawMask.textContent='Stop Drawing';
        btnDrawMask.className='btn btn-success btn-sm';
        workspace.style.cursor='crosshair';
        polyVisible.style.pointerEvents='none';
        handles.forEach(h=>h.style.pointerEvents='none');
        edges.forEach(e=>e.style.pointerEvents='none');
    }else{
        btnDrawMask.textContent='✂️ Draw Mask';
        btnDrawMask.className='btn btn-danger btn-sm';
        workspace.style.cursor='default';
        polyVisible.style.pointerEvents='fill';
        handles.forEach(h=>h.style.pointerEvents='auto');
        edges.forEach(e=>e.style.pointerEvents='fill');
    }
});

document.getElementById('btn-clear-mask').addEventListener('click',()=>{maskPoints=[];updateUI();});

workspace.addEventListener('click',e=>{
    if(!isDrawingMask)return;
    const rect=tshirtImg.getBoundingClientRect();
    maskPoints.push({x:(e.clientX-rect.left)/currentZoom,y:(e.clientY-rect.top)/currentZoom});
    updateUI();
});

document.getElementById('btn-save').addEventListener('click',async()=>{
    if(!currentBgFile){showToast('Select a template first','warning');return;}
    const sx=imgNaturalWidth/tshirtImg.width,sy=imgNaturalHeight/tshirtImg.height;
    const rp=points.map(p=>[Math.round(p.x*sx),Math.round(p.y*sy)]);
    const rm=maskPoints.map(p=>[Math.round(p.x*sx),Math.round(p.y*sy)]);
    const cat = document.getElementById('template-category').value;
    const cw = parseInt(document.getElementById('template-width').value) || 1750;
    const ch = parseInt(document.getElementById('template-height').value) || 2000;
    const payload={
        [currentBgFile]:{
            points:rp,
            category:cat,
            canvas_width:cw,
            canvas_height:ch
        }
    };
    if(rm.length>=3)payload[currentBgFile].mask_points=rm;
    showLoader('Saving…');
    await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadConfig();
    hideLoader();
    showToast('Settings saved');
});

function doGenerate(){
    const overlay=document.getElementById('gen-overlay');
    const bar=document.getElementById('gen-bar');
    const pctEl=document.getElementById('gen-pct');
    const countEl=document.getElementById('gen-count');
    const labelEl=document.getElementById('gen-label');
    const etaEl=document.getElementById('gen-eta');
    const emojiEl=document.getElementById('gen-emoji');
    bar.style.width='0%';
    pctEl.textContent='0%';
    countEl.textContent='0 / ? mockups';
    labelEl.textContent='Starting generation…';
    etaEl.textContent='—';
    emojiEl.textContent='⚡';
    overlay.classList.add('open');
    const startTime=Date.now();
    const es=new EventSource('/api/generate-stream');
    es.onmessage=(ev)=>{
        let data;
        try{data=JSON.parse(ev.data);}catch{return;}
        if(data.status==='error'){
            es.close();
            overlay.classList.remove('open');
            showToast(data.message||'Generation failed','error');
            return;
        }
        if(data.status==='success'){
            es.close();
            bar.style.width='100%';
            pctEl.textContent='100%';
            countEl.textContent=`${data.total} / ${data.total} mockups`;
            labelEl.textContent='All done!';
            etaEl.textContent='';
            emojiEl.textContent='🎉';
            if(currentUser){currentUser.credits-=(data.cost||0);}else{guestCredits-=(data.cost||0);}
            updateUserUI();
            loadDashboard();
            setTimeout(()=>{overlay.classList.remove('open');showToast(`${data.total} mockups created!`);},1400);
            return;
        }
        const pct=data.pct||0;
        bar.style.width=pct+'%';
        pctEl.textContent=pct+'%';
        countEl.textContent=`${data.done} / ${data.total} mockups`;
        labelEl.textContent=`Generating mockup ${data.done} of ${data.total}…`;
        if(data.done>0){
            const elapsed=(Date.now()-startTime)/1000;
            const rate=data.done/elapsed;
            const rem=Math.ceil((data.total-data.done)/rate);
            etaEl.textContent=rem>0?`~${rem}s remaining`:'Almost done…';
        }
    };
    es.onerror=()=>{es.close();overlay.classList.remove('open');showToast('Connection error','error');};
}

document.getElementById('btn-generate').addEventListener('click',doGenerate);
document.getElementById('upload-design').addEventListener('change',e=>{
    const file=e.target.files[0];
    if(!file)return;
    window._currentDesignFileObj=file;
    const url=URL.createObjectURL(file);
    designImg.onload=()=>{
        designW=parseInt(document.getElementById('template-width').value) || 1750;
        designH=parseInt(document.getElementById('template-height').value) || 2000;
        designImg.style.display='block';
        designImg.style.width=designW+'px';
        designImg.style.height=designH+'px';
        updateUI();
    };
    designImg.src=url;
});
document.getElementById('upload-designs-bulk').addEventListener('change',async e=>{const files=e.target.files;if(!files.length)return;showLoader(`Uploading ${files.length} design(s)…`);for(const file of files){const fd=new FormData();fd.append('file',file);fd.append('type','design');await fetch('/api/upload',{method:'POST',body:fd});}await loadDesigns();hideLoader();showToast(`${files.length} design(s) uploaded!`);e.target.value='';});
document.getElementById('upload-bg').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const fd=new FormData();fd.append('file',file);fd.append('type','background');showLoader('Uploading template…');await fetch('/api/upload',{method:'POST',body:fd});await loadBackgrounds();hideLoader();showToast('Template uploaded!');});
document.getElementById('upload-rembg').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const fd=new FormData();fd.append('file',file);showLoader('AI removing background…');const res=await fetch('/api/remove-bg',{method:'POST',body:fd});const data=await res.json();hideLoader();if(data.status==='success'){if(currentUser)currentUser.credits-=2;else guestCredits-=2;updateUserUI();showToast(`Background removed! Saved as ${data.filename}`);}else showToast(data.error||'Failed','error');});
document.getElementById('btn-rembg-current').addEventListener('click',async()=>{const f=window._currentDesignFileObj;if(!f){showToast('Preview a design first!','warning');return;}const fd=new FormData();fd.append('file',f);showLoader('AI removing background…');const res=await fetch('/api/remove-bg',{method:'POST',body:fd});const data=await res.json();hideLoader();if(data.status==='success'){if(currentUser)currentUser.credits-=2;else guestCredits-=2;updateUserUI();showToast('Background removed!');designImg.src=`/tasarim/${encodeURIComponent(data.filename)}`;}else showToast(data.error||'Failed','error');});

async function loadGallery(){
    const grid=document.getElementById('gallery-grid');
    grid.innerHTML='<div style="color:var(--text3);grid-column:1/-1;text-align:center;padding:60px;">Loading…</div>';
    const res=await fetch('/api/gallery');
    const files=await res.json();
    if(!files.length){
        grid.innerHTML='<div style="color:var(--text3);grid-column:1/-1;text-align:center;padding:60px;">No mockups yet. Generate some in the Editor!</div>';
        return;
    }
    grid.innerHTML='';
    files.forEach(file=>{
        const item=document.createElement('div');
        item.className='gallery-item';
        item.innerHTML=`<img src="/output/${encodeURIComponent(file)}" alt="${file}" loading="lazy"><div class="gallery-overlay"><a href="/output/${encodeURIComponent(file)}" download="${file}" class="btn btn-primary btn-sm" style="width:auto;">Download</a></div>`;
        grid.appendChild(item);
    });
}

document.getElementById('refresh-gallery-btn').addEventListener('click',loadGallery);

function loadPricing(){
    const plans=siteConfig.plans||{};
    const grid=document.getElementById('pricing-grid');
    grid.innerHTML='';
    ['free','pro','business'].forEach(key=>{
        const p=plans[key];
        if(!p)return;
        const isFeatured=key==='pro';
        const features={free:['20 credits on signup','1 credit per mockup','2 credits for AI BG removal','Basic templates'],pro:['500 credits/month','All free features','Ad-free experience','Priority support'],business:['Unlimited credits','All pro features','Commercial license','API access (soon)']};
        const card=document.createElement('div');
        card.className=`pricing-card${isFeatured?' featured':''}`;
        card.innerHTML=`<div class="plan-name">${p.name}</div><div class="plan-price">${p.price===0?'Free':'$'+p.price}<span>${p.price>0?'/month':''}</span></div><div class="plan-credits">Lightning ${p.credits===9999?'Unlimited':p.credits+' credits'}</div><ul class="plan-features">${(features[key]||[]).map(f=>`<li>${f}</li>`).join('')}</ul><button class="btn ${isFeatured?'btn-primary':'btn-ghost'}" onclick="showToast('Payment coming soon!','warning')" style="width:100%;">${p.price===0?'Current Plan':'Upgrade'}</button>`;
        grid.appendChild(card);
    });
    const pkgGrid=document.getElementById('credit-packages-grid');
    pkgGrid.innerHTML='';
    (siteConfig.credit_packages||[]).forEach(pkg=>{
        const card=document.createElement('div');
        card.className='card';
        card.style.cssText='text-align:center;cursor:pointer;padding:20px;';
        card.innerHTML=`<div style="font-size:26px;font-weight:700;color:var(--blue)">Lightning ${pkg.credits}</div><div style="font-size:12px;color:var(--text3);margin:4px 0 14px;">credits</div><button class="btn btn-primary btn-sm" onclick="showToast('Payment coming soon!','warning')">$${pkg.price}</button>`;
        pkgGrid.appendChild(card);
    });
    const costList=document.getElementById('credit-costs-list');
    const costs=siteConfig.credit_costs||{};
    costList.innerHTML=[{label:'Generate 1 mockup',key:'generate_single'},{label:'Bulk generation (10+)',key:'generate_bulk'},{label:'AI Background Removal',key:'remove_bg'}].map(r=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--text2)">${r.label}</span><span class="badge badge-blue">Lightning ${costs[r.key]||'—'} credits</span></div>`).join('');
}

async function init(){
    await loadSiteConfig();
    await loadMe();
    await loadConfig();
    await loadBackgrounds();
    await loadDesigns();
    loadDashboard();
    
    // Category & Dimensions event listeners
    document.getElementById('template-category').addEventListener('change', e=>{
        const val = e.target.value;
        if(val !== 'custom'){
            const opt = e.target.options[e.target.selectedIndex];
            const w = parseInt(opt.getAttribute('data-w'));
            const h = parseInt(opt.getAttribute('data-h'));
            document.getElementById('template-width').value = w;
            document.getElementById('template-height').value = h;
            designW = w;
            designH = h;
            if(designImg.src){
                designImg.style.width = designW + 'px';
                designImg.style.height = designH + 'px';
            }
            updateUI();
        }
    });

    const handleDimChange = ()=>{
        document.getElementById('template-category').value = 'custom';
        designW = parseInt(document.getElementById('template-width').value) || 1750;
        designH = parseInt(document.getElementById('template-height').value) || 2000;
        if(designImg.src){
            designImg.style.width = designW + 'px';
            designImg.style.height = designH + 'px';
        }
        updateUI();
    };
    document.getElementById('template-width').addEventListener('input', handleDimChange);
    document.getElementById('template-height').addEventListener('input', handleDimChange);

    // Slider listener
    const scaleSlider = document.getElementById('design-scale-slider');
    const scaleVal = document.getElementById('scale-value');
    if (scaleSlider && scaleVal) {
        scaleSlider.addEventListener('input', e => {
            const val = parseInt(e.target.value);
            scaleVal.textContent = val + '%';
            
            if (sliderRefPoints.length === 4) {
                const s = val / 100;
                // Calculate center
                const cx = sliderRefPoints.reduce((sum, p) => sum + p.x, 0) / 4;
                const cy = sliderRefPoints.reduce((sum, p) => sum + p.y, 0) / 4;
                
                // Scale points relative to center
                points = sliderRefPoints.map(p => ({
                    x: Math.max(0, Math.min(tshirtImg.width, cx + (p.x - cx) * s)),
                    y: Math.max(0, Math.min(tshirtImg.height, cy + (p.y - cy) * s))
                }));
                updateUI();
            }
        });
    }
}
init();

// --- ZOOM & PAN ---
let currentZoom=1,panX=0,panY=0,isPanning=false,panStartX=0,panStartY=0;
function applyWorkspaceTransform(){
    workspace.style.transform=`translate(${panX}px, ${panY}px) scale(${currentZoom})`;
    workspace.style.transformOrigin='center';
    const zl=document.getElementById('zoom-level');
    if(zl)zl.textContent=Math.round(currentZoom*100)+'%';
}
function zoomIn(){currentZoom=Math.min(5,currentZoom*1.15);applyWorkspaceTransform();}
function zoomOut(){currentZoom=Math.max(0.1,currentZoom/1.15);applyWorkspaceTransform();}
function resetZoom(){currentZoom=1;panX=0;panY=0;applyWorkspaceTransform();}

const workspaceWrapper = document.querySelector('.editor-workspace');
if(workspaceWrapper){
    workspaceWrapper.addEventListener('wheel', e=>{
        e.preventDefault();
        const delta=-e.deltaY*0.001;
        currentZoom=Math.min(Math.max(0.1,currentZoom*(1+delta)),5);
        applyWorkspaceTransform();
    },{passive:false});
    workspaceWrapper.addEventListener('mousedown', e=>{
        if(e.button===1 || (e.button===0 && (e.altKey || e.shiftKey))){
            e.preventDefault();
            isPanning=true;
            panStartX=e.clientX-panX;
            panStartY=e.clientY-panY;
            workspaceWrapper.style.cursor='grabbing';
        }
    });
    window.addEventListener('mousemove', e=>{
        if(isPanning){
            panX=e.clientX-panStartX;
            panY=e.clientY-panY;
            applyWorkspaceTransform();
        }
    });
    window.addEventListener('mouseup', ()=>{
        if(isPanning){
            isPanning=false;
            workspaceWrapper.style.cursor='';
        }
    });
}
const oldLoadBackground = window.loadBackground;
window.loadBackground = function(filename) {
    resetZoom();
    if (typeof oldLoadBackground === 'function') {
        oldLoadBackground(filename);
    }
};
