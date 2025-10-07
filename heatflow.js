class HeatFlowSimulator {
  constructor() {
    this.canvas = document.getElementById('hfCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.running = false;
    this.paused = false;
    this.lastTs = 0;
    this.arrowOffset = 0;

    this.materials = {
      copper: { name: 'Copper', k: 401, c: 385, rho: 8960 },
      aluminum: { name: 'Aluminum', k: 237, c: 897, rho: 2700 },
      iron: { name: 'Iron', k: 80, c: 449, rho: 7870 },
      brass: { name: 'Brass', k: 109, c: 380, rho: 8530 },
      glass: { name: 'Glass', k: 1.0, c: 840, rho: 2500 },
      wood: { name: 'Wood', k: 0.12, c: 1700, rho: 700 },
      plastic: { name: 'Plastic', k: 0.2, c: 1500, rho: 950 },
    };

    // State (SI base)
    this.units = 'si'; // si | imp
    this.material = 'copper';
    this.customK = 10;
    this.geom = 'slab'; // slab | rod | wall
    this.layers = []; // [{d, k}]
    this.A = 0.01; // m^2
    this.d = 0.02; // m
    this.T1 = 100; // C
    this.T2 = 20;  // C

    // Graph data (Temperature vs Time only)
    this.seriesTT = []; // {t, Ta, Tb}
    this.maxPoints = 120;

    // Two-body conduction state
    this.Ta = 100; // °C
    this.Tb = 20;  // °C
    this.mA = 1;   // kg
    this.mB = 1;   // kg
    this.matA = 'copper';
    this.matB = 'glass';
    this.customC = 500; // J/kg·K for custom
    this.equilibrium = false;
    this.equilibriumPlayed = false;

    this.bindUI();
    this.bindDownloadGraph();
    this.updateUI();
    this.draw();
  }

  bindUI() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      material: $('hfMaterial'), customKGroup: $('hfCustomKGroup'), customK: $('hfCustomK'),
      units: $('hfUnits'),
      geomSlab: $('hfSlab'), geomRod: $('hfRod'), geomWall: $('hfWall'), layersGroup: $('hfLayersGroup'), layers: $('hfLayers'), addLayer: $('hfAddLayer'), clearLayers: $('hfClearLayers'),
      area: $('hfArea'), d: $('hfD'), dGroup: $('hfDGroup'), t1: $('hfT1'), t2: $('hfT2'), deltaT: $('hfDeltaT'),
      start: $('hfStart'), pause: $('hfPause'), reset: $('hfReset'),
      q: $('hfQ'), calc: $('hfCalc'),
      compareToggle: $('hfCompareToggle'), compareControls: $('hfCompareControls'), q1: $('hfQ1'), q2: $('hfQ2'), compareTable: $('hfCompareTable'), mat1: $('hfMat1'), mat2: $('hfMat2'),
      t1a: $('hfT1A'), t1b: $('hfT1B'), t1aSlider: $('hfT1ASlider'), t1bSlider: $('hfT1BSlider'),
      massA: $('hfMassA'), massB: $('hfMassB'),
      customK: $('hfCustomK'), customC: $('hfCustomC'), customKGroup: $('hfCustomKGroup'), customCGroup: $('hfCustomCGroup'),
      gTT: $('hfGraphTT'),
      deltaTLive: $('hfDeltaTLive'), qLive: $('hfQLive'), tfLive: $('hfTFinal'), eqText: $('hfEqText'),
      darkToggle: $('heatflowDarkModeBtn')
    };

    this.el.material.addEventListener('change', () => { this.material = this.el.material.value; this.updateUI(); });
    this.el.customK.addEventListener('input', () => { this.customK = parseFloat(this.el.customK.value)||0; this.updateUI(); });
    if (this.el.customC) this.el.customC.addEventListener('input', () => { this.customC = parseFloat(this.el.customC.value)||0; this.updateUI(); });
    this.el.units.addEventListener('change', () => { this.units = this.el.units.value; this.updateUI(); });
    [this.el.geomSlab, this.el.geomRod, this.el.geomWall].forEach(r => r.addEventListener('change', () => {
      if (this.el.geomSlab.checked) this.geom = 'slab';
      if (this.el.geomRod.checked) this.geom = 'rod';
      if (this.el.geomWall.checked) this.geom = 'wall';
      this.updateUI();
    }));
    this.el.addLayer.addEventListener('click', (e) => { e.preventDefault(); this.addLayer(); });
    this.el.clearLayers.addEventListener('click', (e) => { e.preventDefault(); this.layers = []; this.renderLayers(); this.updateUI(); });
    this.el.area.addEventListener('input', () => { this.A = parseFloat(this.el.area.value)||0; this.updateUI(); });
    this.el.d.addEventListener('input', () => { this.d = parseFloat(this.el.d.value)||0.0001; this.updateUI(); });
    this.el.t1.addEventListener('input', () => { this.T1 = parseFloat(this.el.t1.value)||0; this.updateUI(); });
    this.el.t2.addEventListener('input', () => { this.T2 = parseFloat(this.el.t2.value)||0; this.updateUI(); });
    this.el.start.addEventListener('click', () => { this.running = true; this.paused = false; this.loop(); });
    this.el.pause.addEventListener('click', () => { this.paused = !this.paused; this.el.pause.textContent = this.paused ? 'Resume' : 'Pause'; if (!this.paused) this.loop(); });
    this.el.reset.addEventListener('click', () => { this.reset(); });
    this.el.compareToggle.addEventListener('change', () => { this.updateUI(); });
    this.el.mat1.addEventListener('change', () => { this.updateUI(); });
    this.el.mat2.addEventListener('change', () => { this.updateUI(); });
    this.el.t1a.addEventListener('input', () => { this.syncTempInputs('A'); this.updateUI(); });
    this.el.t1b.addEventListener('input', () => { this.syncTempInputs('B'); this.updateUI(); });
    if (this.el.t1aSlider) this.el.t1aSlider.addEventListener('input', () => { this.syncTempInputs('A', true); this.updateUI(); });
    if (this.el.t1bSlider) this.el.t1bSlider.addEventListener('input', () => { this.syncTempInputs('B', true); this.updateUI(); });
    if (this.el.massA) this.el.massA.addEventListener('input', () => this.updateUI());
    if (this.el.massB) this.el.massB.addEventListener('input', () => this.updateUI());
    this.el.darkToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      this.el.darkToggle.textContent = document.body.classList.contains('dark-mode') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.lastTs = 0;
    this.arrowOffset = 0;
    this.seriesTT = [];
    this.equilibrium = false;
    this.equilibriumPlayed = false;
    this.el.pause.textContent = 'Pause';
    this.updateUI();
    this.draw();
  }

  addLayer() {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.marginBottom = '8px';
    const dIn = document.createElement('input'); dIn.type = 'number'; dIn.placeholder = 'd'; dIn.step = '0.0001'; dIn.value = '0.01';
    const kIn = document.createElement('input'); kIn.type = 'number'; kIn.placeholder = 'k'; kIn.step = '0.01'; kIn.value = '1';
    const del = document.createElement('button'); del.className = 'thermal-btn danger'; del.textContent = 'Remove';
    del.addEventListener('click', (e) => { e.preventDefault(); row.remove(); this.collectLayers(); this.updateUI(); });
    [dIn, kIn].forEach(inp => inp.addEventListener('input', () => { this.collectLayers(); this.updateUI(); }));
    row.appendChild(dIn); row.appendChild(kIn); row.appendChild(del);
    this.el.layers.appendChild(row);
    this.collectLayers();
  }

  collectLayers() {
    this.layers = [];
    [...this.el.layers.children].forEach(row => {
      const [dIn, kIn] = row.querySelectorAll('input');
      const d = parseFloat(dIn.value)||0.0001;
      const k = parseFloat(kIn.value)||0.0001;
      this.layers.push({ d, k });
    });
  }

  getK() {
    if (this.material === 'custom') return Math.max(0, this.customK);
    return this.materials[this.material].k;
  }

  getDeltaT() { return this.T1 - this.T2; }

  getC(materialKey) {
    if (!materialKey) return this.customC || 500;
    return (this.materials[materialKey] && this.materials[materialKey].c) || 500;
  }

  computeQ() {
    const A = this.A;
    const d = this.d;
    const dT = this.getDeltaT();
    if (this.geom === 'wall' && this.layers.length > 0) {
      // 1/Q = Σ (d_i / (k_i A))
      let R = 0;
      for (const layer of this.layers) {
        R += layer.d / (layer.k * A);
      }
      const Q = dT / R; // Watts
      return Q;
    }
    const k = this.getK();
    return k * A * dT / Math.max(1e-9, d);
  }

  updateGraphs(Q) {
    if (this.equilibrium) return; // stop updating once equilibrium reached
    const Ta = this.Ta;
    const Tb = this.Tb;
    const t = performance.now()/1000;
    this.seriesTT.push({ t, Ta, Tb });
    if (this.seriesTT.length > this.maxPoints) this.seriesTT.shift();
    this.drawTwoSeriesGraph(this.el.gTT, this.seriesTT, 't (s)', 'T (°C)');
  }

  // removed drawGraph helper (ΔT vs Q and Q vs d)

  drawTwoSeriesGraph(canvas, series, xLabel, yLabel) {
    if (!canvas || !series || series.length < 1) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const xs = series.map(p=>p.t), ya = series.map(p=>p.Ta), yb = series.map(p=>p.Tb);
    const xmin = Math.min(...xs), xmax = Math.max(...xs);
    const ymin = Math.min(Math.min(...ya), Math.min(...yb));
    const ymax = Math.max(Math.max(...ya), Math.max(...yb));
    const pad = 40;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pad, canvas.height-pad); ctx.lineTo(canvas.width-pad, canvas.height-pad);
    ctx.moveTo(pad, pad); ctx.lineTo(pad, canvas.height-pad); ctx.stroke();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    for (let i=0;i<=5;i++){
      const x = pad + (canvas.width-2*pad)*i/5;
      const y = pad + (canvas.height-2*pad)*i/5;
      ctx.beginPath(); ctx.moveTo(x,pad); ctx.lineTo(x,canvas.height-pad);
      ctx.moveTo(pad,y); ctx.lineTo(canvas.width-pad,y); ctx.stroke();
    }
    const mapX = (t) => pad + (canvas.width-2*pad)*(t - xmin)/Math.max(1e-6,(xmax-xmin));
    const mapY = (v) => canvas.height - pad - (canvas.height-2*pad)*(v - ymin)/Math.max(1e-6,(ymax-ymin));
    if (series.length === 1) {
      const p = series[0];
      const x = mapX(p.t);
      ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(x, mapY(p.Ta), 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1e90ff'; ctx.beginPath(); ctx.arc(x, mapY(p.Tb), 3, 0, Math.PI*2); ctx.fill();
    } else {
    // Series A (red)
    ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2; ctx.beginPath();
    series.forEach((p,i)=>{ const x = mapX(p.t); const y = mapY(p.Ta); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);}); ctx.stroke();
    // Series B (blue)
    ctx.strokeStyle = '#1e90ff'; ctx.lineWidth = 2; ctx.beginPath();
    series.forEach((p,i)=>{ const x = mapX(p.t); const y = mapY(p.Tb); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);}); ctx.stroke();
    }
    ctx.fillStyle = '#333'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(xLabel, canvas.width/2, canvas.height-10);
    ctx.save(); ctx.translate(16, canvas.height/2); ctx.rotate(-Math.PI/2); ctx.fillText(yLabel, 0, 0); ctx.restore();
  }

  updateUI() {
    // Units toggle visibility only (no full conversion in this basic version)
    this.el.customKGroup.style.display = this.material === 'custom' ? 'block' : 'none';
    if (this.el.customCGroup) this.el.customCGroup.style.display = this.material === 'custom' ? 'block' : 'none';
    const compare = this.el.compareToggle.checked;
    this.el.compareControls.style.display = compare ? 'grid' : 'none';
    this.el.compareTable.style.display = compare ? 'grid' : 'none';
    const livePanel = document.getElementById('hfLivePanel');
    if (livePanel) livePanel.style.display = compare ? 'grid' : 'none';
    if (!compare) { this.Ta = this.T1; this.Tb = this.T2; }
    this.el.layersGroup.style.display = this.geom === 'wall' ? 'block' : 'none';
    this.el.dGroup.style.display = this.geom === 'wall' ? 'none' : 'block';
    const dT = this.getDeltaT();
    this.el.deltaT.textContent = `${dT.toFixed(1)}`;

    // Calculation preview
    const k = this.getK();
    const Q = this.computeQ();
    this.el.calc.textContent = `${k} × ${this.A} × ${dT} / ${this.geom==='wall'?'Σ(d/k)':''}${this.geom!=='wall'?this.d:''}`.replace(/\s+/g,' ').trim();
    this.el.q.textContent = `${Q.toFixed(2)} W`;

    if (compare) {
      const k1 = this.materials[this.el.mat1.value].k;
      const k2 = this.materials[this.el.mat2.value].k;
      const Q1 = (this.geom==='wall' && this.layers.length) ? this.computeQ() : k1 * this.A * dT / Math.max(1e-9, this.d);
      const Q2 = (this.geom==='wall' && this.layers.length) ? this.computeQ() : k2 * this.A * dT / Math.max(1e-9, this.d);
      this.el.q1.textContent = `${Q1.toFixed(2)} W (${this.materials[this.el.mat1.value].name})`;
      this.el.q2.textContent = `${Q2.toFixed(2)} W (${this.materials[this.el.mat2.value].name})`;
    }

    // Live two-body values (if present)
    if (this.el.deltaTLive && this.el.qLive && this.el.tfLive) {
      const dT2 = (this.Ta - this.Tb);
      const kEffA = this.getMaterialK(this.el.mat1.value);
      const kEffB = this.getMaterialK(this.el.mat2.value);
      const kEff = (kEffA + kEffB) / 2; // simple average at interface for demo
      const Qif = kEff * this.A * dT2 / Math.max(1e-9, this.d);
      const cA = this.getC(this.el.mat1.value);
      const cB = this.getC(this.el.mat2.value);
      const mA = parseFloat(this.el.massA ? this.el.massA.value : this.mA) || this.mA;
      const mB = parseFloat(this.el.massB ? this.el.massB.value : this.mB) || this.mB;
      const Tf = (mA*cA*this.Ta + mB*cB*this.Tb) / Math.max(1e-9, (mA*cA + mB*cB));
      this.el.deltaTLive.textContent = `${dT2.toFixed(2)} °C`;
      this.el.qLive.textContent = `${Qif.toFixed(2)} W`;
      this.el.tfLive.textContent = `${Tf.toFixed(2)} °C`;
      if (this.el.eqText) {
        this.el.eqText.style.display = this.equilibrium ? 'block' : 'none';
      }
    }
  }

  getMaterialK(key) {
    if (key === 'custom') return this.customK;
    return (this.materials[key] && this.materials[key].k) || this.getK();
  }

  syncTempInputs(which, fromSlider=false) {
    if (which === 'A') {
      if (fromSlider && this.el.t1aSlider && this.el.t1a) this.el.t1a.value = this.el.t1aSlider.value;
      if (!fromSlider && this.el.t1a && this.el.t1aSlider) this.el.t1aSlider.value = this.el.t1a.value;
      this.Ta = parseFloat(this.el.t1a ? this.el.t1a.value : this.Ta) || this.Ta;
    } else if (which === 'B') {
      if (fromSlider && this.el.t1bSlider && this.el.t1b) this.el.t1b.value = this.el.t1bSlider.value;
      if (!fromSlider && this.el.t1b && this.el.t1bSlider) this.el.t1bSlider.value = this.el.t1b.value;
      this.Tb = parseFloat(this.el.t1b ? this.el.t1b.value : this.Tb) || this.Tb;
    }
  }

  loop(ts) {
    if (!this.running) return;
    if (this.paused) { this.draw(); this.lastTs = ts||this.lastTs; requestAnimationFrame(this.loop.bind(this)); return; }
    if (!ts) ts = performance.now();
    const dt = this.lastTs ? (ts - this.lastTs)/1000 : 0;
    this.lastTs = ts;

    // Two-body conduction update if compare mode
    if (this.el.compareToggle && this.el.compareToggle.checked) {
      // Read current UI state
      this.matA = this.el.mat1.value; this.matB = this.el.mat2.value;
      const cA = this.getC(this.matA); const cB = this.getC(this.matB);
      const mA = parseFloat(this.el.massA ? this.el.massA.value : this.mA) || this.mA;
      const mB = parseFloat(this.el.massB ? this.el.massB.value : this.mB) || this.mB;
      // Interface conduction (simple): k_eff average
      const kEff = (this.getMaterialK(this.matA) + this.getMaterialK(this.matB)) / 2;
      const dTif = (this.Ta - this.Tb);
      const Qif = kEff * this.A * dTif / Math.max(1e-9, this.d);
      if (!this.equilibrium) {
        this.Ta -= (Qif * dt) / Math.max(1e-9, (mA * cA));
        this.Tb += (Qif * dt) / Math.max(1e-9, (mB * cB));
      }
      if (Math.abs(this.Ta - this.Tb) < 0.01) {
        this.equilibrium = true;
        if (!this.equilibriumPlayed) { this.playChime(); this.equilibriumPlayed = true; }
      } else {
        this.equilibrium = false;
      }
      // Keep inputs in sync
      if (this.el.t1a) this.el.t1a.value = this.Ta.toFixed(2);
      if (this.el.t1b) this.el.t1b.value = this.Tb.toFixed(2);
      if (this.el.t1aSlider) this.el.t1aSlider.value = this.Ta.toFixed(2);
      if (this.el.t1bSlider) this.el.t1bSlider.value = this.Tb.toFixed(2);
    }

    // Arrow speed proportional to Q (use interface Q if compare, else general Q)
    const Q = this.el.compareToggle && this.el.compareToggle.checked
      ? ((this.getMaterialK(this.el.mat1.value) + this.getMaterialK(this.el.mat2.value))/2) * this.A * (this.Ta - this.Tb) / Math.max(1e-9, this.d)
      : this.computeQ();
    if (!this.equilibrium) {
      // scale down as equilibrium approaches
      const speed = Math.max(10, Math.min(300, Math.abs(Q)));
      this.arrowOffset += speed * dt * 0.02;
    }
    if (this.arrowOffset > 60) this.arrowOffset -= 60;

    this.updateUI();
    this.updateGraphs(Q);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  draw() {
    const ctx = this.ctx; const W = this.canvas.width; const H = this.canvas.height;
    ctx.clearRect(0,0,W,H);

    const compare = this.el.compareToggle.checked;
    if (compare) {
      // compute touching rectangles with thin boundary
      const margin = 60;
      const y = 40; const h = 220;
      const boundaryX = W/2;
      const leftX = margin;
      const leftW = boundaryX - margin;
      const rightX = boundaryX; // touch at boundary
      const rightW = W - margin - rightX;

      // boundary dashed line
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      this.ctx.setLineDash([6,6]);
      this.ctx.beginPath();
      this.ctx.moveTo(boundaryX, y);
      this.ctx.lineTo(boundaryX, y + h);
      this.ctx.stroke();
      this.ctx.restore();

      // determine hotter/colder
      const aIsHot = this.Ta >= this.Tb;
      this.drawBlock(leftX, y, leftW, h, this.el.mat1.value, this.Ta, aIsHot);
      this.drawBlock(rightX, y, rightW, h, this.el.mat2.value, this.Tb, !aIsHot);
    } else {
      this.drawBlock(80, 40, W-160, 220, this.material === 'custom' ? null : this.material);
    }
  }

  drawBlock(x, y, w, h, materialKey, tempOverride, isHotSide) {
    const ctx = this.ctx;
    // gradient fill depending on hot/cold/equilibrium
    const T = typeof tempOverride === 'number' ? tempOverride : (materialKey ? this.T1 : this.T2);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    if (this.equilibrium) {
      // light blue to indicate cool, equal temperature
      grad.addColorStop(0, '#cfe9ff');
      grad.addColorStop(1, '#e6f4ff');
    } else if (isHotSide === true) {
      grad.addColorStop(0, '#ff4d4d');
      grad.addColorStop(1, '#ff9a3c');
    } else if (isHotSide === false) {
      grad.addColorStop(0, '#1e90ff');
      grad.addColorStop(1, '#7fd3ff');
    } else {
      // fallback based on temperature
      const color = this.temperatureToColor(T);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.strokeRect(x, y, w, h);

    // arrows across (skip when equilibrium)
    if (!this.equilibrium) {
    let Q = this.computeQ();
    if (typeof tempOverride === 'number') {
        const otherT = (tempOverride === this.Ta) ? this.Tb : this.Ta;
      const dTlocal = (tempOverride - otherT);
        const kEff = (this.getMaterialK(this.el.mat1.value) + this.getMaterialK(this.el.mat2.value))/2;
        Q = kEff * this.A * dTlocal / Math.max(1e-9, this.d);
    }
    const spacing = 40;
    const rows = Math.max(3, Math.floor(h/spacing));
    ctx.fillStyle = '#ffa500';
    for (let i=0;i<rows;i++) {
      const ay = y + (i+0.5) * (h/rows);
      const count = Math.max(5, Math.floor(w/60));
      for (let j=0;j<count;j++) {
        let ax = x + ((j*60 + this.arrowOffset) % (w+60)) - 30;
        let len = 40;
          // direction based on sign of Q (hot -> cold)
        if (Q < 0) { len = -len; }
        this.drawArrow(ax, ay, len);
      }
    }
    }

    // labels: temperature badge and material + cp
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    const badgeW = 160, badgeH = 24, bx = x + w/2 - badgeW/2, by = y + 10;
    ctx.fillRect(bx, by, badgeW, badgeH);
    ctx.strokeRect(bx, by, badgeW, badgeH);
    ctx.fillStyle = '#333'; ctx.font = '13px Arial'; ctx.textAlign = 'center';
    const tempText = `${this.materials[materialKey] ? this.materials[materialKey].name : 'Custom'}: ${T.toFixed(1)}°C`;
    ctx.fillText(tempText, x + w/2, by + 16);

    // label (material and cp) under block
    ctx.fillStyle = '#333'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
    const name = materialKey ? this.materials[materialKey].name : 'Custom';
    const cpVal = `${this.getC(materialKey)} J/kg·K`;
    ctx.fillText(name, x + w/2, y + h + 18);
    if (cpVal) ctx.fillText(`c = ${cpVal}`, x + w/2, y + h + 36);

    // Hotter/Colder badges
    if (typeof tempOverride === 'number' && this.el.compareToggle.checked) {
      const isHotter = (tempOverride >= ((tempOverride === this.Ta) ? this.Tb : this.Ta));
      ctx.fillStyle = isHotter ? 'rgba(255,77,77,0.9)' : 'rgba(30,144,255,0.9)';
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      const label = isHotter ? 'Hotter' : 'Colder';
      const tx = x + w - 60; const ty = y + 20; const bw = 56; const bh = 22;
      ctx.fillRect(tx, ty, bw, bh);
      ctx.strokeRect(tx, ty, bw, bh);
      ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText(label, tx + bw/2, ty + 15);
    }

    // equilibrium note (prominent overlay)
    if (this.equilibrium) {
      const msg = 'Equilibrium reached – Heat transfer stopped';
      ctx.save();
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      const tx = x + w/2; const ty = y + h/2;
      // backdrop
      const metrics = ctx.measureText(msg);
      const padX = 14, padY = 8; const bw = metrics.width + padX*2; const bh = 30;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(tx - bw/2, ty - bh/2, bw, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeRect(tx - bw/2, ty - bh/2, bw, bh);
      ctx.fillStyle = '#333';
      ctx.fillText(msg, tx, ty + 5);
      ctx.restore();
    }
  }

  drawArrow(cx, cy, len) {
    const ctx = this.ctx;
    const h = 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#ffa500';
    ctx.beginPath();
    ctx.moveTo(-len/2, -h/2);
    ctx.lineTo(len/2 - h, -h/2);
    ctx.lineTo(len/2 - h, -h);
    ctx.lineTo(len/2, 0);
    ctx.lineTo(len/2 - h, h);
    ctx.lineTo(len/2 - h, h/2);
    ctx.lineTo(-len/2, h/2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  temperatureToColor(T) {
    // Map -50 to 500°C -> create gradient paint
    const Tmin = -50, Tmax = 500;
    const t = Math.max(0, Math.min(1, (T - Tmin) / (Tmax - Tmin)));
    const hot = { r: 255, g: 120, b: 48 };
    const cold = { r: 30, g: 144, b: 255 };
    const r = Math.round(cold.r + (hot.r - cold.r) * t);
    const g = Math.round(cold.g + (hot.g - cold.g) * t);
    const b = Math.round(cold.b + (hot.b - cold.b) * t);
    // return a CSS color string; gradient will be built using lighter/darker shades of this base
    return `rgb(${r},${g},${b})`;
  }

  // download Temperature vs Time graph
  bindDownloadGraph() {
    const btn = document.getElementById('hfGraphDownload');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const canvas = this.el.gTT;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'temperature_vs_time.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.45);
      setTimeout(()=>ctx.close(), 600);
    } catch(e) { /* noop */ }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('hfCanvas')) {
    window.heatFlowSimulator = new HeatFlowSimulator();
  }
});


