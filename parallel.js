class ParallelCircuitSimulator {
  constructor(){
    this.canvas = document.getElementById('pcCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.V = 12; // volts
    this.speed = 1; // electron speed multiplier
    this.branches = []; // {id, R, on, particles}
    this.nextId = 1;
    this.darkBtn = document.getElementById('pcDark');
    this.bindUI();
    // seed with two branches
    this.addBranch(60);
    this.addBranch(120);
    this.adjustCanvasSize();
    this.updateUI();
    this.loop();
  }

  bindUI(){
    const $ = (id)=>document.getElementById(id);
    this.el = { 
      voltage: $('pcVoltage'), voltLabel: $('pcVoltLabel'), voltInput: $('pcVoltInput'), setVolt: $('pcSetVolt'),
      speed: $('pcSpeed'), speedLabel: $('pcSpeedLabel'),
      list: $('pcBranchList'), add: $('pcAddBranch'), reset: $('pcReset'),
      itotal: $('pcItotal'), req: $('pcReq'), ptotal: $('pcPtotal'),
      branchInfoList: $('pcBranchInfoList')
    };
    
    this.el.voltage.addEventListener('input', ()=>{ this.V = parseFloat(this.el.voltage.value)||0; this.syncVoltageInputs(); this.updateUI(); });
    this.el.voltInput.addEventListener('input', ()=>{ this.V = parseFloat(this.el.voltInput.value)||0; this.syncVoltageInputs(); this.updateUI(); });
    this.el.setVolt.addEventListener('click', ()=>{ this.V = parseFloat(this.el.voltInput.value)||0; this.syncVoltageInputs(); this.updateUI(); });
    this.el.speed.addEventListener('input', ()=>{ this.speed = parseFloat(this.el.speed.value)||1; this.updateSpeedLabel(); });
    this.el.add.addEventListener('click', ()=> this.addBranch());
    this.el.reset.addEventListener('click', ()=> this.reset());
    
    if (this.darkBtn) this.darkBtn.addEventListener('click', ()=>{
      document.body.classList.toggle('dark-mode');
      this.darkBtn.textContent = document.body.classList.contains('dark-mode') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  }

  syncVoltageInputs(){
    this.el.voltage.value = this.V;
    this.el.voltInput.value = this.V;
  }

  updateSpeedLabel(){
    if (this.el.speedLabel) this.el.speedLabel.textContent = `${this.speed.toFixed(1)}x`;
  }

  reset(){
    this.branches = []; this.nextId = 1; 
    this.addBranch(80); 
    this.addBranch(160);
    this.adjustCanvasSize();
    this.updateUI();
  }

  addBranch(R=100){
    const id = this.nextId++;
    this.branches.push({ 
      id, R, on: true, i: 0, 
      particles: [], // particles for this branch
      y: 120 + (this.branches.length*60) // vertical position
    });
    this.adjustCanvasSize();
    this.renderBranchControls();
    this.updateUI();
  }

  renderBranchControls(){
    const c = this.el.list; c.innerHTML = '';
    this.branches.forEach(b => {
      const card = document.createElement('div'); 
      card.style.cssText = 'border:1px solid #ddd; border-radius:8px; padding:12px; background:#f9f9f9; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between';
      
      const info = document.createElement('div');
      info.style.cssText = 'display:flex; gap:12px; align-items:center; flex:1';
      
      const label = document.createElement('span'); 
      label.textContent = `Branch ${b.id}`; 
      label.style.cssText = 'font-weight:600; min-width:70px';
      
      const rGroup = document.createElement('div');
      rGroup.style.cssText = 'display:flex; gap:4px; align-items:center';
      const rLabel = document.createElement('span'); rLabel.textContent = 'R:';
      const Rin = document.createElement('input'); 
      Rin.type='number'; Rin.value=b.R; Rin.min='1'; Rin.step='1'; 
      Rin.style.cssText = 'width:60px; padding:4px; border:1px solid #ccc; border-radius:4px';
      const rUnit = document.createElement('span'); rUnit.textContent = 'Ω';
      rGroup.appendChild(rLabel); rGroup.appendChild(Rin); rGroup.appendChild(rUnit);
      
      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex; gap:8px; align-items:center';
      
      const sw = document.createElement('button'); 
      sw.className='charge-btn secondary'; 
      sw.textContent = b.on? 'ON' : 'OFF';
      sw.style.cssText = 'min-width:50px; padding:4px 8px; font-size:12px';
      
      const del = document.createElement('button'); 
      del.className='charge-btn danger'; 
      del.textContent='Remove';
      del.style.cssText = 'padding:4px 8px; font-size:12px; white-space:nowrap';
      
      Rin.addEventListener('input', ()=>{ b.R = Math.max(0.1, parseFloat(Rin.value)||b.R); this.updateUI(); });
      sw.addEventListener('click', ()=>{ b.on = !b.on; sw.textContent = b.on? 'ON' : 'OFF'; this.updateUI(); });
      del.addEventListener('click', ()=>{ 
        this.branches = this.branches.filter(x=>x.id!==b.id); 
        this.reassignPositions();
        this.adjustCanvasSize();
        this.renderBranchControls(); 
        this.updateUI(); 
      });
      
      info.appendChild(label); info.appendChild(rGroup);
      controls.appendChild(sw); controls.appendChild(del);
      card.appendChild(info); card.appendChild(controls);
      c.appendChild(card);
    });
  }

  reassignPositions(){
    this.branches.forEach((b, idx) => {
      b.y = 120 + (idx * 60);
    });
  }

  adjustCanvasSize(){
    // Calculate required height based on number of branches
    const minHeight = 380;
    const branchSpacing = 60;
    const topMargin = 120;
    const bottomMargin = 80;
    const requiredHeight = Math.max(minHeight, topMargin + (this.branches.length * branchSpacing) + bottomMargin);
    
    // Update canvas height if needed
    if (this.canvas.height !== requiredHeight) {
      this.canvas.height = requiredHeight;
      this.canvas.style.height = requiredHeight + 'px';
    }
  }

  calc(){
    // compute branch currents and totals
    let invReq = 0; let Itotal = 0; let Ptotal = 0;
    this.branches.forEach(b => {
      b.i = b.on ? (this.V / Math.max(1e-9, b.R)) : 0;
      if (b.on) invReq += 1 / Math.max(1e-9, b.R);
      Itotal += b.i;
      Ptotal += b.i * this.V; // P = VI for each branch
    });
    const Req = invReq>0 ? 1/invReq : Infinity;
    return { Req, Itotal, Ptotal };
  }

  updateUI(){
    this.el.voltLabel.textContent = `${this.V.toFixed(1)}V`;
    this.updateSpeedLabel();
    
    const { Req, Itotal, Ptotal } = this.calc();
    
    if (this.el.req) this.el.req.textContent = Number.isFinite(Req) ? `${Req.toFixed(2)} Ω` : '∞ Ω';
    if (this.el.itotal) this.el.itotal.textContent = `${Itotal.toFixed(3)} A`;
    if (this.el.ptotal) this.el.ptotal.textContent = `${Ptotal.toFixed(2)} W`;
    
    this.updateBranchInfo();
  }

  updateBranchInfo(){
    if (!this.el.branchInfoList) return;
    const c = this.el.branchInfoList; c.innerHTML = '';
    
    this.branches.forEach(b => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #ddd; border-radius:8px; padding:12px; background:#f5f5f5';
      
      const title = document.createElement('h4');
      title.textContent = `Branch ${b.id}`;
      title.style.cssText = 'margin:0 0 8px 0; color:#333';
      
      const info = document.createElement('div');
      info.style.cssText = 'display:flex; flex-direction:column; gap:4px; font-size:14px';
      
      const resistance = document.createElement('div');
      resistance.innerHTML = `<strong>R${b.id}:</strong> ${b.R.toFixed(1)} Ω`;
      
      const current = document.createElement('div');
      current.innerHTML = `<strong>I${b.id}:</strong> ${b.i.toFixed(3)} A`;
      
      const voltage = document.createElement('div');
      voltage.innerHTML = `<strong>V${b.id}:</strong> ${this.V.toFixed(1)} V`;
      
      const power = document.createElement('div');
      power.innerHTML = `<strong>P${b.id}:</strong> ${(b.i * this.V).toFixed(2)} W`;
      
      const status = document.createElement('div');
      status.innerHTML = `<strong>Status:</strong> ${b.on ? 'ON' : 'OFF'}`;
      status.style.color = b.on ? '#28a745' : '#dc3545';
      
      info.appendChild(resistance);
      info.appendChild(current);
      info.appendChild(voltage);
      info.appendChild(power);
      info.appendChild(status);
      
      card.appendChild(title);
      card.appendChild(info);
      c.appendChild(card);
    });
  }

  spawnParticles(){
    this.branches.forEach(b => {
      if (!b.on || b.i <= 0) return;
      
      // spawn rate proportional to current
      const rate = Math.min(8, Math.max(1, b.i * 4)) * this.speed;
      
      if (Math.random() < rate * 0.016) { // ~60fps
        // start from left rail
        b.particles.push({ 
          x: 120, 
          y: b.y, 
          vx: (30 + b.i * 20) * this.speed,
          phase: 'toResistor' // toResistor -> throughResistor -> toBottom
        });
      }
    });
    
    // limit particles per branch
    this.branches.forEach(b => {
      if (b.particles.length > 50) b.particles.splice(0, b.particles.length - 50);
    });
  }

  step(dt){
    this.branches.forEach(b => {
      b.particles = b.particles.filter(p => {
        p.x += p.vx * dt;
        
        // realistic path through parallel circuit
        if (p.phase === 'toResistor' && p.x >= 320) {
          p.phase = 'throughResistor';
          p.vx = (20 + b.i * 15) * this.speed; // slower through resistor
        } else if (p.phase === 'throughResistor' && p.x >= 420) {
          p.phase = 'toBottom';
          p.vx = (30 + b.i * 20) * this.speed;
        }
        
        // remove when reaching right edge
        return p.x < this.canvas.width - 80;
      });
    });
  }

  loop(){
    this.spawnParticles();
    this.step(1/60);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  draw(){
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0,0,W,H);
    
    // draw circuit layout
    const leftX = 80, rightX = W-80, topY = 60;
    // Dynamic bottom position based on last branch
    const lastBranchY = this.branches.length > 0 ? this.branches[this.branches.length - 1].y : 120;
    const bottomY = Math.max(H-60, lastBranchY + 40);
    
    // battery symbol
    ctx.save();
    ctx.fillStyle='#333'; 
    ctx.fillRect(leftX-25, topY-15, 8, 30); // negative terminal
    ctx.fillRect(leftX-35, topY-8, 6, 16); // positive terminal
    ctx.fillStyle='#666';
    ctx.font='14px Arial'; 
    ctx.textAlign='center';
    ctx.fillText(`${this.V.toFixed(1)}V`, leftX-30, topY+35);
    ctx.restore();

    // main rails (top and bottom)
    ctx.strokeStyle = '#666'; 
    ctx.lineWidth = 6; 
    ctx.beginPath();
    ctx.moveTo(leftX, topY); ctx.lineTo(rightX, topY); // top rail
    ctx.moveTo(leftX, bottomY); ctx.lineTo(rightX, bottomY); // bottom rail
    ctx.stroke();

    // vertical connection lines
    ctx.strokeStyle = '#666'; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(120, topY); ctx.lineTo(120, bottomY); // left junction
    ctx.moveTo(rightX-40, topY); ctx.lineTo(rightX-40, bottomY); // right junction
    ctx.stroke();

    // draw each branch
    this.branches.forEach((b, idx) => {
      const y = b.y;
      const on = b.on;
      const I = b.i;
      
      // branch wires
      ctx.strokeStyle = on ? (I > 0.1 ? 'rgba(255,200,60,0.9)' : '#888') : '#bbb';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, y); ctx.lineTo(260, y); // left wire
      ctx.moveTo(380, y); ctx.lineTo(rightX-40, y); // right wire
      ctx.stroke();

      // resistor/lamp symbol
      ctx.fillStyle = on ? '#e8e8e8' : '#f5f5f5'; 
      ctx.strokeStyle = on ? '#999' : '#ccc';
      ctx.lineWidth = 2;
      ctx.fillRect(260, y-15, 120, 30); 
      ctx.strokeRect(260, y-15, 120, 30);
      
      // lamp glow effect based on current
      if (on && I > 0) {
        const brightness = Math.min(1, I / 1); // normalize brightness
        ctx.save();
        ctx.fillStyle = `rgba(255,215,0,${0.3 + brightness*0.5})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(255,215,0,${brightness*0.8})`;
        ctx.beginPath(); 
        ctx.arc(320, y, 12, 0, Math.PI*2); 
        ctx.fill();
        ctx.restore();
      }
      
      // resistor zigzag pattern
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i = 0; i < 6; i++){
        const x = 270 + i * 16;
        const yOffset = (i % 2 === 0) ? -6 : 6;
        if(i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y + yOffset);
      }
      ctx.stroke();
    });

    // draw particles (electrons) with realistic paths
    this.branches.forEach(b => {
      if (!b.on) return;
      
      b.particles.forEach(p => {
        ctx.save();
        ctx.fillStyle = '#2b6fff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(55,125,255,0.8)';
        
        // size based on current
        const size = 3 + Math.min(2, b.i * 0.5);
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, size, 0, Math.PI*2); 
        ctx.fill();
        ctx.restore();
      });
    });

    // current direction arrows
    this.branches.forEach(b => {
      if (!b.on || b.i <= 0.01) return;
      
      const y = b.y;
      // arrow on left wire
      this.drawArrow(ctx, 180, y, 20, '#ff6b35');
      // arrow on right wire  
      this.drawArrow(ctx, 450, y, 20, '#ff6b35');
    });
  }

  drawArrow(ctx, x, y, size, color){
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size/2, y - size/3);
    ctx.lineTo(x + size/2, y);
    ctx.lineTo(x - size/2, y + size/3);
    ctx.lineTo(x - size/4, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('pcCanvas')) window.parallelSimulator = new ParallelCircuitSimulator();
});