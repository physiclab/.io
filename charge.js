class ChargingSimulator {
  constructor() {
    this.canvas = document.getElementById('chargeCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.running = false; this.paused = false; this.lastTs = 0;
    this.mode = 'friction'; // friction | induction
    this.speed = 1;
    this.darkBtn = document.getElementById('chargeDarkModeBtn');
    // Objects and charges (in multiples of elementary charge e)
    this.qRod = 0; this.qWool = 0; this.qSphere = 0; this.qGround = 0;
    this.electrons = []; // particles moving
    this.qSeries = []; // graph data {t, rod, other}
    this.maxPoints = 300;
    // UI selections
    this.selectedObjA = 'Rubber Rod';
    this.selectedObjB = 'Wool';
    this.bindUI();
    this.draw();
  }

  bindUI() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      mode: $('chargeMode'), start: $('chargeStart'), pause: $('chargePause'), reset: $('chargeReset'),
      objA: $('objA'), objB: $('objB'), speed: $('chargeSpeed'), speedDisplay: document.getElementById('speedDisplay'),
      dataRod: $('dataRod'), dataOther: $('dataOther'), dataNote: $('dataNote'),
      groundToggle: $('groundToggle'), groundGroup: document.getElementById('groundGroup'),
      graph: $('chargeGraph')
    };
    this.el.mode.addEventListener('change', ()=>{ this.mode = this.el.mode.value; this.updateModeUI(); this.reset(); });
    if (this.el.objA) this.el.objA.addEventListener('change', ()=>{ this.selectedObjA = this.el.objA.value; this.draw(); });
    if (this.el.objB) this.el.objB.addEventListener('change', ()=>{ this.selectedObjB = this.el.objB.value; this.draw(); });
    this.el.start.addEventListener('click', ()=>{ this.running = true; this.paused = false; this.seedBurst(); this.loop(); });
    this.el.pause.addEventListener('click', ()=>{ this.paused = !this.paused; this.el.pause.textContent = this.paused? 'Resume' : 'Pause'; if(!this.paused) this.loop(); });
    this.el.reset.addEventListener('click', ()=> this.reset());
    this.el.speed.addEventListener('input', ()=>{ this.speed = parseFloat(this.el.speed.value)||1; this.updateSpeedDisplay(); });
    if (this.el.groundToggle) this.el.groundToggle.addEventListener('change', ()=>{
      // reflect state immediately in UI
      this.updateData();
      // if user connects ground while running, emit a quick burst so it's visible
      if (this.running && !this.paused && this.mode==='induction' && this.el.groundToggle.checked) {
        this.seedBurst();
      }
      this.draw();
    });
    if (this.darkBtn) this.darkBtn.addEventListener('click', ()=>{
      document.body.classList.toggle('dark-mode');
      this.darkBtn.textContent = document.body.classList.contains('dark-mode') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
    this.updateModeUI();
    this.updateSpeedDisplay();
  }

  updateModeUI() {
    if (this.el.groundGroup) this.el.groundGroup.style.display = this.mode === 'induction' ? 'flex' : 'none';
  }

  updateSpeedDisplay() {
    if (this.el.speedDisplay) this.el.speedDisplay.textContent = `${this.speed.toFixed(1)}x`;
  }

  reset() {
    this.running = false; this.paused = false; this.lastTs = 0; this.electrons = []; this.qSeries = [];
    this.qRod = 0; this.qWool = 0; this.qSphere = 0; this.qGround = 0;
    if (this.el.pause) this.el.pause.textContent = 'Pause';
    this.updateData(); this.draw();
  }

  // create an immediate burst so animation starts quickly
  seedBurst() {
    const W = this.canvas.width, H = this.canvas.height;
    const burst = 12;
    if (this.mode === 'friction') {
      for (let i=0;i<burst;i++) {
        const sx = 130 + Math.random()*60, sy = H/2 + Math.random()*40-20;
        const tx = W-190 + Math.random()*60, ty = H/2 + Math.random()*40-20;
        const base = 0.7 * this.speed; // faster to start
        const vx = (tx - sx) * base, vy = (ty - sy) * base;
        this.emitElectron(sx, sy, vx, vy, 'rod');
      }
    } else if (this.el.groundToggle && this.el.groundToggle.checked) {
      for (let i=0;i<burst;i++) {
        const sx = W/2 + 80 + Math.random()*40, sy = H/2 + Math.random()*40-20;
        const tx = W/2 + 200, ty = H/2 + 80;
        const base = 0.7 * this.speed;
        const vx = (tx - sx) * base, vy = (ty - sy) * base;
        this.emitElectron(sx, sy, vx, vy, 'ground');
      }
    }
  }

  emitElectron(x, y, vx, vy, target) {
    this.electrons.push({ x, y, vx, vy, target });
  }

  updateData() {
    if (this.mode === 'friction') {
      this.el.dataRod.textContent = `Rod: ${this.qRod>=0?'+':''}${this.qRod}e`;
      this.el.dataOther.textContent = `Wool: ${this.qWool>=0?'+':''}${this.qWool}e`;
      this.el.dataNote.textContent = 'Friction: Electrons move from wool to rod, leaving rod negative and wool positive.';
    } else {
      this.el.dataRod.textContent = `Sphere: ${this.qSphere>=0?'+':''}${this.qSphere}e`;
      const g = this.el.groundToggle.checked ? 'Ground connected' : 'Ground isolated';
      this.el.dataOther.textContent = g;
      this.el.dataNote.textContent = 'Induction: Electrons in sphere are repelled by the nearby negative rod; with ground, electrons leave to earth.';
    }
  }

  loop(ts) {
    if (!this.running) return;
    if (this.paused) { this.draw(); this.lastTs = ts||this.lastTs; requestAnimationFrame(this.loop.bind(this)); return; }
    if (!ts) ts = performance.now();
    const dt = this.lastTs ? (ts - this.lastTs)/1000 : 0; this.lastTs = ts;

    // emit and move electrons
    // Increased rate for better visibility; scale with speed
    const emitRate = (10 + 4*this.speed) * this.speed; // electrons per second
    if (this.mode === 'friction') {
      // create electrons from wool to rod until magnitude ~ 20e
      if (Math.abs(this.qRod) < 20) {
        for (let i=0;i<Math.floor(emitRate*dt);i++) {
          const sx = 130 + Math.random()*60, sy = this.canvas.height/2 + Math.random()*40-20;
          const tx = this.canvas.width-190 + Math.random()*60, ty = this.canvas.height/2 + Math.random()*40-20;
          const base = 0.65 * this.speed; // speed factor (faster for visibility)
          const vx = (tx - sx) * base, vy = (ty - sy) * base;
          this.emitElectron(sx, sy, vx, vy, 'rod');
        }
      }
    } else {
      // induction: electrons move from sphere to ground when ground connected and rod near
      if (this.el.groundToggle && this.el.groundToggle.checked && this.qSphere > -20) {
        for (let i=0;i<Math.floor(emitRate*dt);i++) {
          const sx = this.canvas.width/2 + 80 + Math.random()*40, sy = this.canvas.height/2 + Math.random()*40-20;
          const tx = this.canvas.width/2 + 200, ty = this.canvas.height/2 + 80;
          const base = 0.65 * this.speed;
          const vx = (tx - sx) * base, vy = (ty - sy) * base;
          this.emitElectron(sx, sy, vx, vy, 'ground');
        }
      }
    }

    // advance electrons
    const remaining = [];
    for (const e of this.electrons) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      const hitRod = (e.target==='rod' && e.x > this.canvas.width-220);
      const hitGround = (e.target==='ground' && e.x > this.canvas.width/2 + 180);
      if (hitRod) { this.qRod -= 1; this.qWool += 1; continue; }
      if (hitGround) { this.qSphere += 1; this.qGround -= 1; continue; }
      remaining.push(e);
    }
    this.electrons = remaining;

    // stop condition
    const equilibrium = (this.mode==='friction' && Math.abs(this.qRod) >= 20) || (this.mode==='induction' && this.el.groundToggle.checked && this.qSphere >= 20);
    if (equilibrium) { this.running = false; this.paused = false; }

    // record graph
    const t = performance.now()/1000;
    const rodVal = this.mode==='friction' ? this.qRod : this.qSphere;
    const otherVal = this.mode==='friction' ? this.qWool : this.qGround;
    this.qSeries.push({ t, rod: rodVal, other: otherVal }); if (this.qSeries.length>this.maxPoints) this.qSeries.shift();

    this.updateData();
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0,0,W,H);

    // left object (wool or rod) and right object (rod or sphere)
    if (this.mode==='friction') {
      this.drawCloth(100, H/2-60, 120, 120, this.qWool, this.selectedObjB);
      this.drawRodWithMaterial(W-220, H/2-18, 160, 36, this.qRod, this.selectedObjA);
      // arrows
      this.drawArrow(250, H/2, W-250, H/2, '#377dff');
    } else {
      // induction: negative rod near neutral sphere; ground on right
      this.drawRodWithMaterial(80, H/2-18, 160, 36, -10, this.selectedObjA);
      this.drawSphere(W/2+80, H/2, 60, this.qSphere, this.selectedObjB);
      // ground pad
      this.drawGround(W/2 + 200, H/2 + 60);
      // arrows
      if (this.el.groundToggle && this.el.groundToggle.checked) {
        this.drawWire(W/2+120, H/2+40, W/2+200, H/2+60);
        this.drawArrow(W/2+140, H/2+20, W/2+200, H/2+80, '#377dff');
      }
    }

    // electrons (bigger with glow for visibility)
    for (const e of this.electrons) {
      ctx.save();
      ctx.fillStyle = '#377dff';
      ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(55,125,255,0.9)';
      ctx.beginPath(); ctx.arc(e.x, e.y, 5.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(30,80,200,0.8)';
      ctx.stroke();
      ctx.restore();
    }

    // Q vs time graph (simple)
    const g = this.el.graph.getContext('2d');
    g.clearRect(0,0,this.el.graph.width,this.el.graph.height);
    if (this.qSeries.length>=1) {
      const xs = this.qSeries.map(p=>p.t), ya = this.qSeries.map(p=>p.rod), yb = this.qSeries.map(p=>p.other);
      const xmin = Math.min(...xs), xmax = Math.max(...xs);
      const ymin = Math.min(Math.min(...ya), Math.min(...yb));
      const ymax = Math.max(Math.max(...ya), Math.max(...yb));
      const pad = 30;
      const mapX = (t)=> pad + (this.el.graph.width-2*pad)*(t-xmin)/Math.max(1e-6,(xmax-xmin));
      const mapY = (v)=> this.el.graph.height - pad - (this.el.graph.height-2*pad)*(v-ymin)/Math.max(1e-6,(ymax-ymin || 1));
      g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(pad, this.el.graph.height-pad); g.lineTo(this.el.graph.width-pad, this.el.graph.height-pad); g.moveTo(pad,pad); g.lineTo(pad,this.el.graph.height-pad); g.stroke();
      // A (rod)
      g.strokeStyle = '#377dff'; g.lineWidth = 2; g.beginPath();
      this.qSeries.forEach((p,i)=>{ const x = mapX(p.t); const y = mapY(p.rod); if(i===0) g.moveTo(x,y); else g.lineTo(x,y); }); g.stroke();
      // B (other)
      g.strokeStyle = '#ff5b5b'; g.lineWidth = 2; g.beginPath();
      this.qSeries.forEach((p,i)=>{ const x = mapX(p.t); const y = mapY(p.other); if(i===0) g.moveTo(x,y); else g.lineTo(x,y); }); g.stroke();
    }

    // equilibrium text
    const equilibrium = (this.mode==='friction' && Math.abs(this.qRod) >= 20) || (this.mode==='induction' && this.el.groundToggle.checked && this.qSphere >= 20);
    if (equilibrium) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = '14px Arial'; ctx.textAlign='center';
      ctx.fillText('Equilibrium reached: no further electron transfer', W/2, 30);
    }
  }

  drawRodWithMaterial(x, y, w, h, q, name) {
    const ctx = this.ctx; ctx.save();
    // choose color/appearance
    let fill = '#555';
    const nm = (name||'').toLowerCase();
    if (nm.includes('rubber')) fill = '#222';
    else if (nm.includes('plastic')) fill = '#888';

    if (nm.includes('glass')) {
      ctx.fillStyle = 'rgba(150,200,255,0.35)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(120,170,220,0.9)'; ctx.strokeRect(x,y,w,h);
    } else {
      // Draw solid rectangle for rubber/plastic/others
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.strokeRect(x, y, w, h);
    }
    if (q<0) this.glow(x,y,w,h,'neg'); if (q>0) this.glow(x,y,w,h,'pos');
    // label
    const label = q<0? 'Negatively Charged' : q>0? 'Positively Charged' : 'Neutral';
    const display = name ? `${name} — ${label}` : label;
    this.drawLabel(x+w/2,y-10,display,'');
    ctx.restore();
  }

  drawRod(x, y, w, h, q) { // legacy caller
    this.drawRodWithMaterial(x,y,w,h,q,this.selectedObjA);
  }

  drawCloth(x,y,w,h,q,name){
    const ctx = this.ctx; ctx.save();
    // pick material color
    let col = '#b48a57';
    if ((name||'').toLowerCase().includes('silk')) col = '#d9bfa0';
    if ((name||'').toLowerCase().includes('wool')) col = '#b48a57';
    ctx.fillStyle = col; ctx.fillRect(x,y,w,h);
    if (q<0) this.glow(x,y,w,h,'neg'); if (q>0) this.glow(x,y,w,h,'pos');
    // label
    const label = q<0? 'Negatively Charged' : q>0? 'Positively Charged' : 'Neutral';
    const display = name ? `${name} — ${label}` : `Cloth — ${label}`;
    this.drawLabel(x+w/2,y-10,display,'');
    ctx.restore();
  }

  drawSphere(cx, cy, r, q, name){
    const ctx = this.ctx; ctx.save();
    const grad = ctx.createRadialGradient(cx-8,cy-8, r*0.3, cx,cy,r);
    grad.addColorStop(0,'#fdfdfd'); grad.addColorStop(1,'#cbd5e1');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    if (q<0) this.glow(cx-r,cy-r,2*r,2*r,'neg'); if (q>0) this.glow(cx-r,cy-r,2*r,2*r,'pos');
    const label = q<0? 'Negatively Charged' : q>0? 'Positively Charged' : 'Neutral';
    const display = name ? `${name} — ${label}` : `Sphere — ${label}`;
    this.drawLabel(cx,cy-r-12,display,'');
    ctx.restore();
  }

  drawGround(x,y){
    const ctx = this.ctx; ctx.save();
    ctx.fillStyle='#666'; ctx.fillRect(x, y, 60, 10);
    ctx.fillRect(x+10, y-10, 40, 10);
    ctx.fillRect(x+20, y-20, 20, 10);
    this.drawLabel(x+30,y-26,'Ground','badge neutral');
    ctx.restore();
  }

  drawWire(x1,y1,x2,y2){
    const ctx = this.ctx; ctx.save();
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#9aa4b2' : '#666';
    ctx.lineWidth = 3; ctx.setLineDash([10,6]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.restore();
  }

  drawArrow(x1,y1,x2,y2,color){
    const ctx = this.ctx; ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=3; ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    // arrow head
    const ang = Math.atan2(y2-y1,x2-x1); ctx.beginPath(); ctx.setLineDash([]);
    ctx.moveTo(x2,y2); ctx.lineTo(x2-10*Math.cos(ang-0.3), y2-10*Math.sin(ang-0.3));
    ctx.lineTo(x2-10*Math.cos(ang+0.3), y2-10*Math.sin(ang+0.3)); ctx.closePath(); ctx.fillStyle=color; ctx.fill();
    ctx.restore();
  }

  glow(x,y,w,h,type){
    const ctx = this.ctx; ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = type==='neg' ? 'rgba(55,125,255,0.8)' : 'rgba(255,91,91,0.8)';
    ctx.fillStyle = 'rgba(255,255,255,0.01)'; ctx.fillRect(x,y,w,h); ctx.restore();
  }

  drawLabel(cx, y, text, badgeClass){
    const ctx = this.ctx; ctx.save(); ctx.font = '12px Arial'; ctx.textAlign='center'; ctx.fillStyle='#333';
    ctx.fillText(text, cx, y);
    ctx.restore();
    // badges are visual style; canvas cannot use CSS, so we only render text here
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('chargeCanvas')) {
    window.chargingSimulator = new ChargingSimulator();
  }
});


