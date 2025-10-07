class PositiveChargingSimulator {
  constructor(){
    this.canvas = document.getElementById('posCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.running = false; this.paused = false; this.lastTs = 0; this.speed = 1;
    this.leftName = 'Metal Sphere (Positive)';
    this.rightName = 'Metal Sphere (Neutral)';
    // charge state (+ means deficit of electrons)
    this.qLeft = +10; // start positive
    this.qRight = 0;
    this.electrons = [];
    this.bindUI();
    this.updateData();
    this.draw();
  }

  bindUI(){
    const $ = (id)=>document.getElementById(id);
    this.el = {
      objA: $('posObjA'), objB: $('posObjB'), start: $('posStart'), pause: $('posPause'), reset: $('posReset'),
      speed: $('posSpeed'), speedDisplay: $('posSpeedDisplay'), note: $('posNote'), left: $('posDataLeft'), right: $('posDataRight'),
      darkBtn: $('posDarkModeBtn')
    };
    this.el.objA.addEventListener('change', ()=>{ this.leftName = this.el.objA.value; this.draw(); });
    this.el.objB.addEventListener('change', ()=>{ this.rightName = this.el.objB.value; this.draw(); });
    this.el.start.addEventListener('click', ()=>{ this.running = true; this.paused = false; this.seedBurst(); this.loop(); });
    this.el.pause.addEventListener('click', ()=>{ this.paused = !this.paused; this.el.pause.textContent = this.paused? 'Resume':'Pause'; if(!this.paused) this.loop(); });
    this.el.reset.addEventListener('click', ()=> this.reset());
    this.el.speed.addEventListener('input', ()=>{ this.speed = parseFloat(this.el.speed.value)||1; this.updateSpeedDisplay(); });
    if (this.el.darkBtn) this.el.darkBtn.addEventListener('click', ()=>{
      document.body.classList.toggle('dark-mode');
      this.el.darkBtn.textContent = document.body.classList.contains('dark-mode') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
    this.updateSpeedDisplay();
  }

  updateSpeedDisplay(){ if (this.el.speedDisplay) this.el.speedDisplay.textContent = `${this.speed.toFixed(1)}x`; }

  reset(){
    this.running = false; this.paused = false; this.lastTs = 0; this.electrons = [];
    this.qLeft = +10; this.qRight = 0; // left positive, right neutral
    if (this.el.pause) this.el.pause.textContent = 'Pause';
    this.updateData(); this.draw();
  }

  seedBurst(){
    const W = this.canvas.width, H = this.canvas.height; const n = 12;
    // electrons flow from right (neutral) to left (positive)
    for(let i=0;i<n;i++){
      const sx = W/2 + 100 + Math.random()*40, sy = H/2 + Math.random()*40-20;
      const tx = W/2 - 120, ty = H/2 + Math.random()*20-10;
      const base = 0.7*this.speed; const vx=(tx-sx)*base, vy=(ty-sy)*base;
      this.electrons.push({x:sx,y:sy,vx,vy,target:'left'});
    }
  }

  updateData(){
    const fmt = (q)=> `${q>=0?'+':''}${q}e`;
    if (this.el.left) this.el.left.textContent = `Left: ${fmt(this.qLeft)}`;
    if (this.el.right) this.el.right.textContent = `Right: ${fmt(this.qRight)}`;
    if (this.el.note) this.el.note.textContent = 'Conduction: Electrons move from neutral to positively charged object upon contact.';
  }

  loop(ts){
    if (!this.running) return;
    if (this.paused) { this.draw(); this.lastTs = ts||this.lastTs; requestAnimationFrame(this.loop.bind(this)); return; }
    if (!ts) ts = performance.now();
    const dt = this.lastTs? (ts - this.lastTs)/1000 : 0; this.lastTs = ts;

    // emit while transfer not complete
    const want = this.qRight > -20; // continue while right still has electrons to give
    if (want){
      const rate = (10 + 4*this.speed) * this.speed;
      for(let i=0;i<Math.floor(rate*dt);i++) this.seedBurst();
    }

    // move electrons
    const W = this.canvas.width; const remaining=[];
    for(const e of this.electrons){
      e.x += e.vx*dt; e.y += e.vy*dt;
      const hitLeft = (e.target==='left' && e.x < W/2 - 140);
      if (hitLeft){ this.qLeft -= 1; this.qRight += 1; continue; }
      remaining.push(e);
    }
    this.electrons = remaining;

    // stop when charges balanced enough
    if (this.qLeft <= 0 || this.qRight >= 20){ this.running=false; this.paused=false; }

    this.updateData();
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  draw(){
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height; ctx.clearRect(0,0,W,H);
    // left (positive initially), right (neutral initially)
    this.drawObject(W/2-220, H/2, 60, this.qLeft, this.leftName);
    this.drawObject(W/2+220, H/2, 60, this.qRight, this.rightName);
    // electrons
    for(const e of this.electrons){ ctx.save(); ctx.fillStyle='#377dff'; ctx.shadowBlur=10; ctx.shadowColor='rgba(55,125,255,0.9)'; ctx.beginPath(); ctx.arc(e.x,e.y,5,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // contact indicator arrow
    this.drawArrow(W/2-140, H/2, W/2+140, H/2, '#377dff');
  }

  drawObject(cx,cy,r,q,name){
    const ctx=this.ctx; ctx.save();
    // appearance by type name
    const nm=(name||'').toLowerCase();
    if (nm.includes('sphere')){ const grad = ctx.createRadialGradient(cx-8,cy-8,r*0.3,cx,cy,r); grad.addColorStop(0,'#fdfdfd'); grad.addColorStop(1,'#cbd5e1'); ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); }
    else { ctx.fillStyle = nm.includes('glass')? 'rgba(150,200,255,0.35)' : '#666'; ctx.beginPath(); ctx.rect(cx-r,cy-r,r*2,r*2*0.6); ctx.fill(); }
    if (q<0) this.glow(cx-r,cy-r,2*r,2*r,'neg'); if (q>0) this.glow(cx-r,cy-r,2*r,2*r,'pos');
    const label = q<0? 'Negatively Charged' : q>0? 'Positively Charged' : 'Neutral';
    this.drawText(cx, cy-r-12, `${name} — ${label}`);
    ctx.restore();
  }

  glow(x,y,w,h,type){ const ctx=this.ctx; ctx.save(); ctx.shadowBlur=20; ctx.shadowColor= type==='neg'? 'rgba(55,125,255,0.8)':'rgba(255,91,91,0.8)'; ctx.fillStyle='rgba(255,255,255,0.01)'; ctx.fillRect(x,y,w,h); ctx.restore(); }
  drawText(x,y,text){ const ctx=this.ctx; ctx.save(); ctx.font='12px Arial'; ctx.textAlign='center'; ctx.fillStyle='#333'; ctx.fillText(text,x,y); ctx.restore(); }
  drawArrow(x1,y1,x2,y2,color){ const ctx=this.ctx; ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=3; ctx.setLineDash([8,6]); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); const ang=Math.atan2(y2-y1,x2-x1); ctx.beginPath(); ctx.setLineDash([]); ctx.moveTo(x2,y2); ctx.lineTo(x2-10*Math.cos(ang-0.3), y2-10*Math.sin(ang-0.3)); ctx.lineTo(x2-10*Math.cos(ang+0.3), y2-10*Math.sin(ang+0.3)); ctx.closePath(); ctx.fillStyle=color; ctx.fill(); ctx.restore(); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('posCanvas')) window.positiveSimulator = new PositiveChargingSimulator();
});


