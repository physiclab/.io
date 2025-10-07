class PendulumSimulator {
  constructor() {
    this.canvas = document.getElementById('pendulumCanvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.displacementCanvas = document.getElementById('displacementGraph');
    this.energyCanvas = document.getElementById('energyGraph');
    this.displacementCtx = this.displacementCanvas ? this.displacementCanvas.getContext('2d') : null;
    this.energyCtx = this.energyCanvas ? this.energyCanvas.getContext('2d') : null;
    
    // Physical parameters
    this.L = 1.0; // string length (m)
    this.m = 1.0; // bob mass (kg)
    this.g = 9.81; // gravity (m/s²)
    this.theta0 = 30; // initial angle (degrees)
    this.dampingCoeff = 0.02;
    this.damping = false;
    this.smallAngleApprox = false;
    
    // Double pendulum parameters
    this.L1 = 1.0; // first pendulum length
    this.L2 = 1.0; // second pendulum length
    this.m1 = 1.0; // first bob mass
    this.m2 = 1.0; // second bob mass
    this.theta1 = 0; // first pendulum angle
    this.theta2 = 0; // second pendulum angle
    this.omega1 = 0; // first pendulum angular velocity
    this.omega2 = 0; // second pendulum angular velocity
    
    // Simulation state
    this.isRunning = false;
    this.isPaused = false;
    this.time = 0;
    this.timeStep = 0.016; // ~60fps
    this.theta = 0; // current angle (radians)
    this.omega = 0; // angular velocity (rad/s)
    this.alpha = 0; // angular acceleration (rad/s²)
    
    // Display options
    this.showForceVectors = true;
    this.doublePendulum = false;
    
    // Data storage for graphs
    this.timeData = [];
    this.displacementData = [];
    this.velocityData = [];
    this.kineticEnergyData = [];
    this.potentialEnergyData = [];
    this.totalEnergyData = [];
    
    // Double pendulum trail
    this.trail = [];
    this.showTrail = true;
    
    // Canvas center point
    this.centerX = this.canvas.width / 2;
    this.centerY = 100; // pivot point
    this.scale = 150; // pixels per meter
    
    this.bindUI();
    this.reset();
    this.draw();
  }

  bindUI() {
    const elements = {
      stringLength: document.getElementById('stringLength'),
      bobMass: document.getElementById('bobMass'),
      initialAngle: document.getElementById('initialAngle'),
      gravity: document.getElementById('pendulumGravity'),
      customGravity: document.getElementById('pendulumCustomGravity'),
      customGravityGroup: document.getElementById('pendulumCustomGravityGroup'),
      dampingToggle: document.getElementById('dampingToggle'),
      dampingCoeff: document.getElementById('dampingCoeff'),
      dampingGroup: document.getElementById('dampingGroup'),
      showForceVectors: document.getElementById('showForceVectors'),
      smallAngleApprox: document.getElementById('smallAngleApprox'),
      doublePendulum: document.getElementById('doublePendulum'),
      startBtn: document.getElementById('startPendulum'),
      pauseBtn: document.getElementById('pausePendulum'),
      resetBtn: document.getElementById('resetPendulum'),
      darkModeBtn: document.getElementById('pendulumDarkModeBtn')
    };

    // String length control
    if (elements.stringLength) {
      elements.stringLength.addEventListener('input', (e) => {
        this.L = parseFloat(e.target.value);
        document.getElementById('lengthDisplay').textContent = this.L.toFixed(1);
        this.updateDisplay();
      });
    }

    // Bob mass control
    if (elements.bobMass) {
      elements.bobMass.addEventListener('input', (e) => {
        this.m = parseFloat(e.target.value);
        document.getElementById('massDisplay').textContent = this.m.toFixed(1);
        this.updateDisplay();
      });
    }

    // Initial angle control
    if (elements.initialAngle) {
      elements.initialAngle.addEventListener('input', (e) => {
        this.theta0 = parseFloat(e.target.value);
        document.getElementById('initAngleDisplay').textContent = this.theta0;
        if (!this.isRunning) {
          this.theta = (this.theta0 * Math.PI) / 180;
          this.draw();
        }
        this.updateDisplay();
      });
    }

    // Gravity control
    if (elements.gravity) {
      elements.gravity.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          elements.customGravityGroup.style.display = 'block';
          this.g = parseFloat(elements.customGravity.value);
        } else {
          elements.customGravityGroup.style.display = 'none';
          this.g = parseFloat(e.target.value);
        }
        this.updateDisplay();
      });
    }

    if (elements.customGravity) {
      elements.customGravity.addEventListener('input', (e) => {
        this.g = parseFloat(e.target.value);
        this.updateDisplay();
      });
    }

    // Damping controls
    if (elements.dampingToggle) {
      elements.dampingToggle.addEventListener('change', (e) => {
        this.damping = e.target.checked;
        elements.dampingGroup.style.display = this.damping ? 'block' : 'none';
      });
    }

    if (elements.dampingCoeff) {
      elements.dampingCoeff.addEventListener('input', (e) => {
        this.dampingCoeff = parseFloat(e.target.value);
        document.getElementById('dampingDisplay').textContent = this.dampingCoeff.toFixed(3);
      });
    }

    // Display options
    if (elements.showForceVectors) {
      elements.showForceVectors.addEventListener('change', (e) => {
        this.showForceVectors = e.target.checked;
      });
    }

    if (elements.smallAngleApprox) {
      elements.smallAngleApprox.addEventListener('change', (e) => {
        this.smallAngleApprox = e.target.checked;
      });
    }

    if (elements.doublePendulum) {
      elements.doublePendulum.addEventListener('change', (e) => {
        this.doublePendulum = e.target.checked;
        this.toggleDoublePendulum();
      });
    }

    // Control buttons
    if (elements.startBtn) {
      elements.startBtn.addEventListener('click', () => this.start());
    }

    if (elements.pauseBtn) {
      elements.pauseBtn.addEventListener('click', () => this.pause());
    }

    if (elements.resetBtn) {
      elements.resetBtn.addEventListener('click', () => this.reset());
    }

    // Dark mode
    if (elements.darkModeBtn) {
      elements.darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        elements.darkModeBtn.textContent = document.body.classList.contains('dark-mode') 
          ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      });
    }
  }

  toggleDoublePendulum() {
    const doublePendulumControls = document.getElementById('doublePendulumControls');
    if (doublePendulumControls) {
      doublePendulumControls.style.display = this.doublePendulum ? 'grid' : 'none';
    }
    
    if (this.doublePendulum) {
      this.bindDoublePendulumControls();
      // Set initial double pendulum state
      this.L1 = this.L;
      this.L2 = this.L;
      this.m1 = this.m;
      this.m2 = this.m;
      this.theta1 = (this.theta0 * Math.PI) / 180; // 45 degrees
      this.theta2 = (30 * Math.PI) / 180; // 30 degrees
      this.omega1 = 0;
      this.omega2 = 0;
    }
    
    this.reset();
  }

  bindDoublePendulumControls() {
    const elements = {
      length1: document.getElementById('length1'),
      mass1: document.getElementById('mass1'),
      angle1: document.getElementById('pendulumAngle1'),
      length2: document.getElementById('length2'),
      mass2: document.getElementById('mass2'),
      angle2: document.getElementById('pendulumAngle2'),
      startDouble: document.getElementById('startDouble'),
      resetDouble: document.getElementById('resetDouble'),
      showTrail: document.getElementById('showTrail')
    };

    if (elements.length1) {
      elements.length1.addEventListener('input', (e) => {
        this.L1 = parseFloat(e.target.value);
        document.getElementById('length1Display').textContent = this.L1.toFixed(1);
      });
    }

    if (elements.mass1) {
      elements.mass1.addEventListener('input', (e) => {
        this.m1 = parseFloat(e.target.value);
        document.getElementById('mass1Display').textContent = this.m1.toFixed(1);
      });
    }

    if (elements.angle1) {
      elements.angle1.addEventListener('input', (e) => {
        const angle = parseFloat(e.target.value);
        this.theta1 = (angle * Math.PI) / 180;
        document.getElementById('pendulumAngle1Display').textContent = angle;
      });
    }

    if (elements.length2) {
      elements.length2.addEventListener('input', (e) => {
        this.L2 = parseFloat(e.target.value);
        document.getElementById('length2Display').textContent = this.L2.toFixed(1);
      });
    }

    if (elements.mass2) {
      elements.mass2.addEventListener('input', (e) => {
        this.m2 = parseFloat(e.target.value);
        document.getElementById('mass2Display').textContent = this.m2.toFixed(1);
      });
    }

    if (elements.angle2) {
      elements.angle2.addEventListener('input', (e) => {
        const angle = parseFloat(e.target.value);
        this.theta2 = (angle * Math.PI) / 180;
        document.getElementById('pendulumAngle2Display').textContent = angle;
      });
    }

    if (elements.startDouble) {
      elements.startDouble.addEventListener('click', () => this.start());
    }

    if (elements.resetDouble) {
      elements.resetDouble.addEventListener('click', () => this.reset());
    }

    if (elements.showTrail) {
      elements.showTrail.addEventListener('change', (e) => {
        this.showTrail = e.target.checked;
        if (!this.showTrail) {
          this.trail = [];
        }
      });
    }
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.isPaused = false;
      this.animate();
    } else if (this.isPaused) {
      this.isPaused = false;
      this.animate();
    }
  }

  pause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused && this.isRunning) {
      this.animate();
    }
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.time = 0;
    
    if (this.doublePendulum) {
      // Reset double pendulum to initial state
      this.theta1 = (45 * Math.PI) / 180; // Default 45 degrees
      this.theta2 = (30 * Math.PI) / 180; // Default 30 degrees
      this.omega1 = 0;
      this.omega2 = 0;
      this.trail = [];
    } else {
      // Reset single pendulum
      this.theta = (this.theta0 * Math.PI) / 180; // convert to radians
      this.omega = 0;
      this.alpha = 0;
    }
    
    // Clear data arrays
    this.timeData = [];
    this.displacementData = [];
    this.velocityData = [];
    this.kineticEnergyData = [];
    this.potentialEnergyData = [];
    this.totalEnergyData = [];
    
    this.updateDisplay();
    this.draw();
    this.drawGraphs();
  }

  animate() {
    if (!this.isRunning || this.isPaused) return;
    
    this.updatePhysics();
    this.updateDisplay();
    this.draw();
    this.drawGraphs();
    
    requestAnimationFrame(() => this.animate());
  }

  updatePhysics() {
    if (this.doublePendulum) {
      this.updateDoublePendulumPhysics();
    } else {
      this.updateSinglePendulumPhysics();
    }
    
    // Update time
    this.time += this.timeStep;
  }

  updateSinglePendulumPhysics() {
    // Store current data for graphs
    this.timeData.push(this.time);
    this.displacementData.push(this.theta * 180 / Math.PI); // convert to degrees
    this.velocityData.push(this.omega);
    
    // Calculate energies
    const height = this.L * (1 - Math.cos(this.theta));
    const kineticEnergy = 0.5 * this.m * (this.L * this.omega) ** 2;
    const potentialEnergy = this.m * this.g * height;
    const totalEnergy = kineticEnergy + potentialEnergy;
    
    this.kineticEnergyData.push(kineticEnergy);
    this.potentialEnergyData.push(potentialEnergy);
    this.totalEnergyData.push(totalEnergy);
    
    // Limit data arrays to prevent memory issues
    const maxDataPoints = 1000;
    if (this.timeData.length > maxDataPoints) {
      this.timeData.shift();
      this.displacementData.shift();
      this.velocityData.shift();
      this.kineticEnergyData.shift();
      this.potentialEnergyData.shift();
      this.totalEnergyData.shift();
    }
    
    // Calculate angular acceleration
    if (this.smallAngleApprox && Math.abs(this.theta) < 0.2) {
      // Small angle approximation: α = -(g/L) * θ
      this.alpha = -(this.g / this.L) * this.theta;
    } else {
      // Exact equation: α = -(g/L) * sin(θ)
      this.alpha = -(this.g / this.L) * Math.sin(this.theta);
    }
    
    // Add damping if enabled
    if (this.damping) {
      this.alpha -= this.dampingCoeff * this.omega;
    }
    
    // Update angular velocity and position using Verlet integration
    this.omega += this.alpha * this.timeStep;
    this.theta += this.omega * this.timeStep;
  }

  updateDoublePendulumPhysics() {
    // Double pendulum equations of motion (Lagrangian mechanics)
    const m1 = this.m1, m2 = this.m2;
    const L1 = this.L1, L2 = this.L2;
    const g = this.g;
    const theta1 = this.theta1, theta2 = this.theta2;
    const omega1 = this.omega1, omega2 = this.omega2;
    
    // Calculate differences
    const deltaTheta = theta2 - theta1;
    const sinDelta = Math.sin(deltaTheta);
    const cosDelta = Math.cos(deltaTheta);
    
    // Denominators for the equations
    const denom1 = (m1 + m2) * L1 - m2 * L1 * cosDelta * cosDelta;
    const denom2 = (L2 / L1) * denom1;
    
    // Angular accelerations (complex equations from Lagrangian)
    const num1 = -m2 * L1 * omega1 * omega1 * sinDelta * cosDelta
                + m2 * g * Math.sin(theta2) * cosDelta
                + m2 * L2 * omega2 * omega2 * sinDelta
                - (m1 + m2) * g * Math.sin(theta1);
    
    const num2 = -m2 * L2 * omega2 * omega2 * sinDelta * cosDelta
                + (m1 + m2) * g * Math.sin(theta1) * cosDelta
                + (m1 + m2) * L1 * omega1 * omega1 * sinDelta
                - (m1 + m2) * g * Math.sin(theta2);
    
    const alpha1 = num1 / denom1;
    const alpha2 = num2 / denom2;
    
    // Add damping if enabled
    let dampedAlpha1 = alpha1;
    let dampedAlpha2 = alpha2;
    
    if (this.damping) {
      dampedAlpha1 -= this.dampingCoeff * omega1;
      dampedAlpha2 -= this.dampingCoeff * omega2;
    }
    
    // Update velocities and positions
    this.omega1 += dampedAlpha1 * this.timeStep;
    this.omega2 += dampedAlpha2 * this.timeStep;
    this.theta1 += this.omega1 * this.timeStep;
    this.theta2 += this.omega2 * this.timeStep;
    
    // Calculate positions of second bob for trail
    const x1 = L1 * Math.sin(theta1);
    const y1 = -L1 * Math.cos(theta1);
    const x2 = x1 + L2 * Math.sin(theta2);
    const y2 = y1 - L2 * Math.cos(theta2);
    
    // Add to trail
    if (this.showTrail) {
      this.trail.push({
        x: this.centerX + x2 * this.scale,
        y: this.centerY - y2 * this.scale
      });
      
      // Limit trail length
      if (this.trail.length > 500) {
        this.trail.shift();
      }
    }
    
    // Store data for graphs (using first pendulum)
    this.timeData.push(this.time);
    this.displacementData.push(theta1 * 180 / Math.PI);
    this.velocityData.push(omega1);
    
    // Calculate total energy
    const ke1 = 0.5 * m1 * (L1 * omega1) ** 2;
    const ke2 = 0.5 * m2 * ((L1 * omega1) ** 2 + (L2 * omega2) ** 2 + 2 * L1 * L2 * omega1 * omega2 * cosDelta);
    const pe1 = -m1 * g * L1 * Math.cos(theta1);
    const pe2 = -m2 * g * (L1 * Math.cos(theta1) + L2 * Math.cos(theta2));
    
    const totalKE = ke1 + ke2;
    const totalPE = pe1 + pe2;
    const totalEnergy = totalKE + totalPE;
    
    this.kineticEnergyData.push(totalKE);
    this.potentialEnergyData.push(totalPE);
    this.totalEnergyData.push(totalEnergy);
    
    // Limit data arrays
    const maxDataPoints = 1000;
    if (this.timeData.length > maxDataPoints) {
      this.timeData.shift();
      this.displacementData.shift();
      this.velocityData.shift();
      this.kineticEnergyData.shift();
      this.potentialEnergyData.shift();
      this.totalEnergyData.shift();
    }
  }

  updateDisplay() {
    // Calculate theoretical period
    const theoreticalPeriod = 2 * Math.PI * Math.sqrt(this.L / this.g);
    const frequency = 1 / theoreticalPeriod;
    
    // Calculate current values
    const currentAngleDeg = this.theta * 180 / Math.PI;
    const speed = Math.abs(this.omega * this.L);
    const height = this.L * (1 - Math.cos(this.theta));
    const kineticEnergy = 0.5 * this.m * (this.L * this.omega) ** 2;
    const potentialEnergy = this.m * this.g * height;
    
    // Update display elements
    const elements = {
      period: document.getElementById('period'),
      frequency: document.getElementById('frequency'),
      maxSpeed: document.getElementById('maxSpeed'),
      currentAngle: document.getElementById('currentAngle'),
      kineticEnergy: document.getElementById('kineticEnergy'),
      potentialEnergy: document.getElementById('potentialEnergy')
    };
    
    if (elements.period) {
      elements.period.textContent = `${theoreticalPeriod.toFixed(2)} s`;
    }
    
    if (elements.frequency) {
      elements.frequency.textContent = `${frequency.toFixed(2)} Hz`;
    }
    
    if (elements.maxSpeed) {
      // Max speed occurs at bottom: v_max = sqrt(2gL(1-cos(theta0)))
      const maxSpeed = Math.sqrt(2 * this.g * this.L * (1 - Math.cos(this.theta0 * Math.PI / 180)));
      elements.maxSpeed.textContent = `${maxSpeed.toFixed(2)} m/s`;
    }
    
    if (elements.currentAngle) {
      elements.currentAngle.textContent = `${currentAngleDeg.toFixed(1)}°`;
    }
    
    if (elements.kineticEnergy) {
      elements.kineticEnergy.textContent = `${kineticEnergy.toFixed(2)} J`;
    }
    
    if (elements.potentialEnergy) {
      elements.potentialEnergy.textContent = `${potentialEnergy.toFixed(2)} J`;
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (this.doublePendulum) {
      this.drawDoublePendulum();
    } else {
      this.drawSinglePendulum();
    }
  }

  drawSinglePendulum() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Calculate bob position
    const bobX = this.centerX + this.L * this.scale * Math.sin(this.theta);
    const bobY = this.centerY + this.L * this.scale * Math.cos(this.theta);
    
    // Draw pivot point
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw string
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();
    
    // Draw bob
    const bobRadius = Math.max(8, Math.sqrt(this.m) * 10);
    ctx.fillStyle = '#FF6B35';
    ctx.strokeStyle = '#D2691E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw equilibrium line (vertical dashed line)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(this.centerX, height - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw angle indicator
    if (Math.abs(this.theta) > 0.01) {
      this.drawAngleIndicator();
    }
    
    // Draw force vectors
    if (this.showForceVectors) {
      this.drawForceVectors(bobX, bobY);
    }
    
    // Draw arc showing pendulum path
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const maxAngle = this.theta0 * Math.PI / 180;
    ctx.arc(this.centerX, this.centerY, this.L * this.scale, 
            Math.PI/2 - maxAngle, Math.PI/2 + maxAngle);
    ctx.stroke();
  }

  drawDoublePendulum() {
    const ctx = this.ctx;
    
    // Calculate positions
    const x1 = this.centerX + this.L1 * this.scale * Math.sin(this.theta1);
    const y1 = this.centerY + this.L1 * this.scale * Math.cos(this.theta1);
    const x2 = x1 + this.L2 * this.scale * Math.sin(this.theta2);
    const y2 = y1 + this.L2 * this.scale * Math.cos(this.theta2);
    
    // Draw trail of second pendulum
    if (this.showTrail && this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < this.trail.length; i++) {
        const alpha = i / this.trail.length; // Fade effect
        ctx.globalAlpha = alpha * 0.5;
        
        if (i === 0) {
          ctx.moveTo(this.trail[i].x, this.trail[i].y);
        } else {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    
    // Draw pivot point
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw first pendulum string
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    
    // Draw second pendulum string
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw first bob
    const bob1Radius = Math.max(8, Math.sqrt(this.m1) * 8);
    ctx.fillStyle = '#FF6B35';
    ctx.strokeStyle = '#D2691E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x1, y1, bob1Radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw second bob
    const bob2Radius = Math.max(8, Math.sqrt(this.m2) * 8);
    ctx.fillStyle = '#FF4444';
    ctx.strokeStyle = '#CC0000';
    ctx.beginPath();
    ctx.arc(x2, y2, bob2Radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw force vectors if enabled
    if (this.showForceVectors) {
      this.drawDoublePendulumVectors(x1, y1, x2, y2);
    }
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('m₁', x1, y1 - bob1Radius - 10);
    ctx.fillText('m₂', x2, y2 - bob2Radius - 10);
  }

  drawAngleIndicator() {
    const ctx = this.ctx;
    const radius = 40;
    
    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = 2;
    
    // Angle arc
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, radius, Math.PI/2, Math.PI/2 + this.theta);
    ctx.stroke();
    
    // Angle label
    ctx.fillStyle = '#00AA00';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const labelAngle = Math.PI/2 + this.theta/2;
    const labelX = this.centerX + radius * 0.7 * Math.cos(labelAngle);
    const labelY = this.centerY + radius * 0.7 * Math.sin(labelAngle);
    ctx.fillText(`${(this.theta * 180 / Math.PI).toFixed(1)}°`, labelX, labelY);
  }

  drawForceVectors(bobX, bobY) {
    const ctx = this.ctx;
    const vectorScale = 20; // scale factor for vector display
    
    // Weight force (mg) - always downward
    const weightForce = this.m * this.g;
    const weightY = vectorScale * weightForce / 10; // scale down for display
    
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bobX, bobY);
    ctx.lineTo(bobX, bobY + weightY);
    ctx.stroke();
    this.drawArrowHead(bobX, bobY + weightY, Math.PI/2, '#FF0000');
    
    // Tension force - along string toward pivot
    const tensionX = -vectorScale * Math.sin(this.theta) * 0.8;
    const tensionY = -vectorScale * Math.cos(this.theta) * 0.8;
    
    ctx.strokeStyle = '#0000FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bobX, bobY);
    ctx.lineTo(bobX + tensionX, bobY + tensionY);
    ctx.stroke();
    this.drawArrowHead(bobX + tensionX, bobY + tensionY, 
                       Math.atan2(tensionY, tensionX), '#0000FF');
    
    // Restoring force component (tangential)
    const restoringForce = this.m * this.g * Math.sin(this.theta);
    const restoringX = -vectorScale * Math.cos(this.theta) * restoringForce / 10;
    const restoringY = vectorScale * Math.sin(this.theta) * restoringForce / 10;
    
    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bobX, bobY);
    ctx.lineTo(bobX + restoringX, bobY + restoringY);
    ctx.stroke();
    this.drawArrowHead(bobX + restoringX, bobY + restoringY, 
                       Math.atan2(restoringY, restoringX), '#00AA00');
    
    // Force labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('mg', bobX + 5, bobY + weightY/2);
    ctx.fillText('T', bobX + tensionX/2 - 10, bobY + tensionY/2);
    ctx.fillText('F_r', bobX + restoringX + 5, bobY + restoringY - 5);
  }

  drawDoublePendulumVectors(x1, y1, x2, y2) {
    const ctx = this.ctx;
    const vectorScale = 15;
    
    // Draw simplified force vectors for double pendulum
    // Weight vectors
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    
    // Weight on first bob
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y1 + vectorScale);
    ctx.stroke();
    this.drawArrowHead(x1, y1 + vectorScale, Math.PI/2, '#FF0000');
    
    // Weight on second bob
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2, y2 + vectorScale);
    ctx.stroke();
    this.drawArrowHead(x2, y2 + vectorScale, Math.PI/2, '#FF0000');
    
    // Tension vectors (simplified)
    ctx.strokeStyle = '#0000FF';
    
    // Tension in first string
    const t1x = -vectorScale * 0.7 * Math.sin(this.theta1);
    const t1y = -vectorScale * 0.7 * Math.cos(this.theta1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + t1x, y1 + t1y);
    ctx.stroke();
    this.drawArrowHead(x1 + t1x, y1 + t1y, Math.atan2(t1y, t1x), '#0000FF');
    
    // Tension in second string
    const t2x = -vectorScale * 0.7 * Math.sin(this.theta2);
    const t2y = -vectorScale * 0.7 * Math.cos(this.theta2);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + t2x, y2 + t2y);
    ctx.stroke();
    this.drawArrowHead(x2 + t2x, y2 + t2y, Math.atan2(t2y, t2x), '#0000FF');
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('m₁g', x1 + 5, y1 + vectorScale/2);
    ctx.fillText('m₂g', x2 + 5, y2 + vectorScale/2);
    ctx.fillText('T₁', x1 + t1x/2 - 10, y1 + t1y/2);
    ctx.fillText('T₂', x2 + t2x/2 - 10, y2 + t2y/2);
  }

  drawArrowHead(x, y, angle, color) {
    const ctx = this.ctx;
    const headLength = 8;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), 
               y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), 
               y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  drawGraphs() {
    this.drawDisplacementGraph();
    this.drawEnergyGraph();
  }

  drawDisplacementGraph() {
    if (!this.displacementCtx || this.timeData.length < 2) return;
    
    const ctx = this.displacementCtx;
    const width = this.displacementCanvas.width;
    const height = this.displacementCanvas.height;
    
    // Clear graph
    ctx.clearRect(0, 0, width, height);
    
    // Find data ranges
    const maxTime = Math.max(...this.timeData);
    const maxDisp = Math.max(...this.displacementData.map(Math.abs));
    
    if (maxTime === 0 || maxDisp === 0) return;
    
    const scaleX = (width - 80) / maxTime;
    const scaleY = (height - 80) / (2 * maxDisp);
    const offsetX = 40;
    const offsetY = height / 2;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(width - 20, offsetY);
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, 20);
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, height - 20);
    ctx.stroke();
    
    // Draw displacement curve
    ctx.strokeStyle = '#8B5A2B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < this.timeData.length; i++) {
      const x = offsetX + this.timeData[i] * scaleX;
      const y = offsetY - this.displacementData[i] * scaleY;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', width / 2, height - 5);
    
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Angle (°)', 0, 0);
    ctx.restore();
  }

  drawEnergyGraph() {
    if (!this.energyCtx || this.timeData.length < 2) return;
    
    const ctx = this.energyCtx;
    const width = this.energyCanvas.width;
    const height = this.energyCanvas.height;
    
    // Clear graph
    ctx.clearRect(0, 0, width, height);
    
    // Find data ranges
    const maxTime = Math.max(...this.timeData);
    const maxEnergy = Math.max(...this.totalEnergyData);
    
    if (maxTime === 0 || maxEnergy === 0) return;
    
    const scaleX = (width - 80) / maxTime;
    const scaleY = (height - 80) / maxEnergy;
    const offsetX = 40;
    const offsetY = height - 40;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(width - 20, offsetY);
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, 20);
    ctx.stroke();
    
    // Draw energy curves
    const energyTypes = [
      { data: this.kineticEnergyData, color: '#E53E3E', label: 'KE' },
      { data: this.potentialEnergyData, color: '#3182CE', label: 'PE' },
      { data: this.totalEnergyData, color: '#38A169', label: 'Total' }
    ];
    
    energyTypes.forEach(energyType => {
      ctx.strokeStyle = energyType.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < this.timeData.length; i++) {
        const x = offsetX + this.timeData[i] * scaleX;
        const y = offsetY - energyType.data[i] * scaleY;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });
    
    // Legend
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    energyTypes.forEach((energyType, index) => {
      ctx.fillStyle = energyType.color;
      ctx.fillText(energyType.label, width - 60, 30 + index * 15);
    });
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', width / 2, height - 5);
    
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Energy (J)', 0, 0);
    ctx.restore();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('pendulumCanvas')) {
    window.pendulumSimulator = new PendulumSimulator();
  }
});
