class SeriesCircuitSimulator {
  constructor(){
    this.canvas = document.getElementById('scCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.V = 12; // volts
    this.speed = 1; // electron speed multiplier
    this.running = false;
    this.paused = false;
    this.resistors = []; // {id, R, on, x, width, particles, voltage}
    this.nextId = 1;
    this.particles = []; // global particles for series flow
    this.darkBtn = document.getElementById('scDark');
    this.bindUI();
    // seed with two resistors
    this.addResistor(100);
    this.addResistor(200);
    this.updateUI();
    this.loop();
  }

  bindUI(){
    const $ = (id)=>document.getElementById(id);
    this.el = { 
      voltage: $('scVoltage'), voltLabel: $('scVoltLabel'), voltInput: $('scVoltInput'), setVolt: $('scSetVolt'),
      speed: $('scSpeed'), speedLabel: $('scSpeedLabel'),
      play: $('scPlay'), pause: $('scPause'), add: $('scAddResistor'), reset: $('scReset'),
      list: $('scResistorList'), itotal: $('scItotal'), rtotal: $('scRtotal'), ptotal: $('scPtotal'),
      resistorInfoList: $('scResistorInfoList')
    };
    
    this.el.voltage.addEventListener('input', ()=>{ this.V = parseFloat(this.el.voltage.value)||0; this.syncVoltageInputs(); this.updateUI(); });
    this.el.voltInput.addEventListener('input', ()=>{ this.V = parseFloat(this.el.voltInput.value)||0; this.syncVoltageInputs(); this.updateUI(); });
    this.el.setVolt.addEventListener('click', ()=>{ this.V = parseFloat(this.el.voltInput.value)||0; this.syncVoltageInputs(); this.updateUI(); });
    this.el.speed.addEventListener('input', ()=>{ this.speed = parseFloat(this.el.speed.value)||1; this.updateSpeedLabel(); });
    
    this.el.play.addEventListener('click', ()=>{ this.running = true; this.paused = false; this.el.play.textContent = 'Playing...'; });
    this.el.pause.addEventListener('click', ()=>{ this.paused = !this.paused; this.el.pause.textContent = this.paused ? 'Resume' : 'Pause'; });
    this.el.add.addEventListener('click', ()=> this.addResistor());
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
    this.resistors = []; this.particles = []; this.nextId = 1; this.running = false; this.paused = false;
    this.el.play.textContent = 'Play';
    this.el.pause.textContent = 'Pause';
    this.addResistor(80); 
    this.addResistor(120);
    this.updateUI();
  }

  addResistor(R=100){
    const id = this.nextId++;
    this.resistors.push({ 
      id, R, on: true, 
      x: 0, width: 80, // will be calculated in layout
      particles: [],
      voltage: 0 // voltage drop across this resistor
    });
    this.calculateLayout();
    this.renderResistorControls();
    this.updateUI();
  }

  calculateLayout(){
    // Position resistors in series along the circuit
    const canvasWidth = this.canvas.width;
    const leftMargin = 150;
    const rightMargin = 80;
    const resistorWidth = 80;
    const minSpacing = 20;
    
    if (this.resistors.length === 0) return;
    
    // Calculate required width for all resistors
    const totalResistorWidth = this.resistors.length * resistorWidth;
    const minRequiredWidth = leftMargin + rightMargin + totalResistorWidth + (this.resistors.length - 1) * minSpacing;
    
    // If we need more space, expand the canvas
    if (minRequiredWidth > canvasWidth) {
      this.canvas.width = Math.max(1200, minRequiredWidth + 100);
    }
    
    // Calculate spacing based on available width
    const availableWidth = this.canvas.width - leftMargin - rightMargin - totalResistorWidth;
    const spacing = this.resistors.length > 1 ? Math.max(minSpacing, availableWidth / (this.resistors.length - 1)) : 0;
    
    // Position resistors
    this.resistors.forEach((r, idx) => {
      r.x = leftMargin + (idx * (resistorWidth + spacing));
    });
  }

  renderResistorControls(){
    const c = this.el.list; 
    c.innerHTML = '';
    c.style.cssText = 'display:flex; flex-direction:column; gap:16px; padding:8px; max-height:300px; overflow-y:auto; box-sizing:border-box';
    
    this.resistors.forEach((r, index) => {
      const card = document.createElement('div'); 
      card.className = 'resistor-card';
      card.style.cssText = `
        border: 1px solid #ddd; 
        border-radius: 8px; 
        padding: 16px; 
        background: #f9f9f9; 
        display: block; 
        width: 100%; 
        box-sizing: border-box; 
        margin-bottom: 0;
        position: relative;
        clear: both;
      `;
      
      // Create a wrapper for better layout control
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap';
      
      // Left side - Label and resistance input
      const leftSide = document.createElement('div');
      leftSide.style.cssText = 'display:flex; align-items:center; gap:12px; flex:1; min-width:200px';
      
      const label = document.createElement('span'); 
      label.textContent = `R${r.id}`; 
      label.style.cssText = 'font-weight:700; min-width:35px; color:#333; font-size:16px';
      
      const rGroup = document.createElement('div');
      rGroup.style.cssText = 'display:flex; align-items:center; gap:6px';
      
      const rLabel = document.createElement('span'); 
      rLabel.textContent = 'R:';
      rLabel.style.cssText = 'color:#666; font-weight:500; font-size:14px';
      
      const Rin = document.createElement('input'); 
      Rin.type='number'; 
      Rin.value=r.R; 
      Rin.min='1'; 
      Rin.step='1'; 
      Rin.style.cssText = 'width:80px; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:14px; text-align:center';
      
      const rUnit = document.createElement('span'); 
      rUnit.textContent = 'Ω';
      rUnit.style.cssText = 'color:#666; font-weight:500; font-size:14px';
      
      rGroup.appendChild(rLabel);
      rGroup.appendChild(Rin);
      rGroup.appendChild(rUnit);
      
      leftSide.appendChild(label);
      leftSide.appendChild(rGroup);
      
      // Right side - Controls
      const rightSide = document.createElement('div');
      rightSide.style.cssText = 'display:flex; align-items:center; gap:10px; flex-shrink:0';
      
      const sw = document.createElement('button'); 
      sw.className='charge-btn'; 
      sw.textContent = r.on ? 'ON' : 'OFF';
      sw.style.cssText = `
        min-width: 60px; 
        padding: 8px 12px; 
        font-size: 12px; 
        font-weight: 600;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        background: ${r.on ? 'linear-gradient(135deg,#28a745,#20c997)' : 'linear-gradient(135deg,#6c757d,#adb5bd)'};
        color: white;
      `;
      
      const del = document.createElement('button'); 
      del.className='charge-btn danger'; 
      del.textContent='Remove';
      del.style.cssText = `
        padding: 8px 12px; 
        font-size: 12px; 
        font-weight: 600;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        background: linear-gradient(135deg,#dc3545,#ff6b6b);
        color: white;
      `;
      
      rightSide.appendChild(sw);
      rightSide.appendChild(del);
      
      wrapper.appendChild(leftSide);
      wrapper.appendChild(rightSide);
      card.appendChild(wrapper);
      
      // Event listeners
      Rin.addEventListener('input', ()=>{ 
        r.R = Math.max(0.1, parseFloat(Rin.value)||r.R); 
        this.calculateLayout();
        this.updateUI(); 
      });
      
      sw.addEventListener('click', ()=>{ 
        r.on = !r.on; 
        sw.textContent = r.on ? 'ON' : 'OFF';
        sw.style.background = r.on ? 'linear-gradient(135deg,#28a745,#20c997)' : 'linear-gradient(135deg,#6c757d,#adb5bd)';
        this.updateUI(); 
      });
      
      del.addEventListener('click', ()=>{ 
        this.resistors = this.resistors.filter(x=>x.id!==r.id); 
        this.calculateLayout();
        this.renderResistorControls(); 
        this.updateUI(); 
      });
      
      c.appendChild(card);
    });
  }

  calc(){
    // Series circuit calculations
    let Rtotal = 0;
    let allOn = true;
    
    // Check if circuit is complete (all resistors ON)
    this.resistors.forEach(r => {
      if (!r.on) allOn = false;
      if (r.on) Rtotal += r.R;
    });
    
    // Calculate current (same throughout series circuit)
    const I = allOn && Rtotal > 0 ? this.V / Rtotal : 0;
    
    // Calculate voltage drop across each resistor
    let Ptotal = 0;
    this.resistors.forEach(r => {
      r.voltage = r.on ? I * r.R : 0;
      Ptotal += r.on ? r.voltage * I : 0;
    });
    
    return { Rtotal, I, Ptotal };
  }

  updateUI(){
    this.el.voltLabel.textContent = `${this.V.toFixed(1)}V`;
    this.updateSpeedLabel();
    
    const { Rtotal, I, Ptotal } = this.calc();
    
    if (this.el.rtotal) this.el.rtotal.textContent = `${Rtotal.toFixed(1)} Ω`;
    if (this.el.itotal) this.el.itotal.textContent = `${I.toFixed(3)} A`;
    if (this.el.ptotal) this.el.ptotal.textContent = `${Ptotal.toFixed(2)} W`;
    
    this.updateResistorInfo(I);
  }

  updateResistorInfo(I){
    if (!this.el.resistorInfoList) return;
    const c = this.el.resistorInfoList; c.innerHTML = '';
    
    this.resistors.forEach(r => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #ddd; border-radius:8px; padding:12px; background:#f5f5f5';
      
      const title = document.createElement('h4');
      title.textContent = `Resistor R${r.id}`;
      title.style.cssText = 'margin:0 0 8px 0; color:#333';
      
      const info = document.createElement('div');
      info.style.cssText = 'display:flex; flex-direction:column; gap:4px; font-size:14px';
      
      const resistance = document.createElement('div');
      resistance.innerHTML = `<strong>R${r.id}:</strong> ${r.R.toFixed(1)} Ω`;
      
      const current = document.createElement('div');
      current.innerHTML = `<strong>I:</strong> ${I.toFixed(3)} A`;
      
      const voltage = document.createElement('div');
      voltage.innerHTML = `<strong>V${r.id}:</strong> ${r.voltage.toFixed(2)} V`;
      
      const power = document.createElement('div');
      power.innerHTML = `<strong>P${r.id}:</strong> ${(r.voltage * I).toFixed(2)} W`;
      
      const status = document.createElement('div');
      status.innerHTML = `<strong>Status:</strong> ${r.on ? 'ON' : 'OFF'}`;
      status.style.color = r.on ? '#28a745' : '#dc3545';
      
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
    if (!this.running || this.paused) return;
    
    const { I } = this.calc();
    if (I <= 0) return; // no current flow
    
    // Spawn particles at battery positive terminal
    const rate = Math.min(8, Math.max(1, I * 6)) * this.speed;
    
    if (Math.random() < rate * 0.016) { // ~60fps
      this.particles.push({ 
        x: 80, 
        y: 120, 
        vx: (40 + I * 30) * this.speed,
        phase: 'flowing'
      });
    }
    
    // limit total particles
    if (this.particles.length > 100) this.particles.splice(0, this.particles.length - 100);
  }

  step(dt){
    if (!this.running || this.paused) return;
    
    const { I } = this.calc();
    
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      
      // slow down particles when passing through resistors
      let inResistor = false;
      this.resistors.forEach(r => {
        if (r.on && p.x >= r.x && p.x <= r.x + r.width) {
          inResistor = true;
          p.vx = (20 + I * 15) * this.speed; // slower through resistor
        }
      });
      
      if (!inResistor) {
        p.vx = (40 + I * 30) * this.speed; // normal speed on wires
      }
      
      // remove when reaching right edge
      return p.x < this.canvas.width - 80;
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
    
    const { I } = this.calc();
    const circuitComplete = I > 0;
    
    // draw circuit layout
    const leftX = 80, rightX = W-80, topY = 120, bottomY = 180;
    
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

    // main circuit path
    ctx.strokeStyle = circuitComplete ? 'rgba(255,200,60,0.9)' : '#888'; 
    ctx.lineWidth = 6; 
    ctx.beginPath();
    // top wire
    ctx.moveTo(leftX, topY); 
    ctx.lineTo(rightX, topY);
    // right wire down
    ctx.lineTo(rightX, bottomY);
    // bottom wire
    ctx.lineTo(leftX, bottomY);
    // left wire up (completing circuit)
    ctx.lineTo(leftX, topY);
    ctx.stroke();

    // draw resistors
    this.resistors.forEach((r, idx) => {
      const x = r.x, y = topY;
      const on = r.on;
      
      // resistor body
      ctx.fillStyle = on ? '#e8e8e8' : '#f5f5f5'; 
      ctx.strokeStyle = on ? '#999' : '#ccc';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y-15, r.width, 30); 
      ctx.strokeRect(x, y-15, r.width, 30);
      
      // voltage drop visualization (color gradient)
      if (on && r.voltage > 0) {
        const intensity = Math.min(1, r.voltage / this.V);
        ctx.save();
        const grad = ctx.createLinearGradient(x, y-15, x + r.width, y-15);
        grad.addColorStop(0, `rgba(255,100,100,${0.3 + intensity*0.4})`);
        grad.addColorStop(1, `rgba(100,100,255,${0.3 + intensity*0.4})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y-15, r.width, 30);
        ctx.restore();
      }
      
      // resistor zigzag pattern
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i = 0; i < 6; i++){
        const rx = x + 10 + i * (r.width-20) / 5;
        const yOffset = (i % 2 === 0) ? -6 : 6;
        if(i === 0) ctx.moveTo(rx, y);
        else ctx.lineTo(rx, y + yOffset);
      }
      ctx.stroke();
      
      // resistor label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`R${r.id}`, x + r.width/2, y-20);
      ctx.fillText(`${r.R}Ω`, x + r.width/2, y+25);
      
      // voltage drop label
      if (on && r.voltage > 0) {
        ctx.fillStyle = '#d63384';
        ctx.fillText(`${r.voltage.toFixed(1)}V`, x + r.width/2, y+40);
      }
      
      // switch indicator
      if (!on) {
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + r.width/2 - 10, y - 8);
        ctx.lineTo(x + r.width/2 + 10, y + 8);
        ctx.stroke();
      }
    });

    // draw particles (electrons)
    if (circuitComplete) {
      this.particles.forEach(p => {
        ctx.save();
        ctx.fillStyle = '#2b6fff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(55,125,255,0.8)';
        
        const size = 3 + Math.min(2, I * 0.8);
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, size, 0, Math.PI*2); 
        ctx.fill();
        ctx.restore();
      });
    }

    // current direction arrows
    if (circuitComplete && I > 0.01) {
      // arrow on top wire
      this.drawArrow(ctx, W/2, topY, 20, '#ff6b35');
      // arrow on bottom wire (return path)
      this.drawArrow(ctx, W/2, bottomY, -20, '#ff6b35');
    }

    // circuit status
    ctx.fillStyle = circuitComplete ? '#28a745' : '#dc3545';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    const status = circuitComplete ? `Circuit Complete - Current: ${I.toFixed(3)} A` : 'Circuit Open - No Current Flow';
    ctx.fillText(status, W/2, 50);
  }

  drawArrow(ctx, x, y, size, color){
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (size > 0) {
      ctx.moveTo(x - size/2, y - size/3);
      ctx.lineTo(x + size/2, y);
      ctx.lineTo(x - size/2, y + size/3);
      ctx.lineTo(x - size/4, y);
    } else {
      ctx.moveTo(x + Math.abs(size)/2, y - Math.abs(size)/3);
      ctx.lineTo(x - Math.abs(size)/2, y);
      ctx.lineTo(x + Math.abs(size)/2, y + Math.abs(size)/3);
      ctx.lineTo(x + Math.abs(size)/4, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('scCanvas')) window.seriesSimulator = new SeriesCircuitSimulator();
});

