class ProjectileMotionSimulator {
  constructor() {
    this.canvas = document.getElementById('projectileCanvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.graphCanvas = document.getElementById('trajectoryGraph');
    this.graphCtx = this.graphCanvas ? this.graphCanvas.getContext('2d') : null;
    this.comparisonGraphCanvas = document.getElementById('comparisonTrajectoryGraph');
    this.comparisonGraphCtx = this.comparisonGraphCanvas ? this.comparisonGraphCanvas.getContext('2d') : null;
    
    this.velocityCanvas = document.getElementById('velocityTimeGraph');
    this.velocityCtx = this.velocityCanvas ? this.velocityCanvas.getContext('2d') : null;
    this.heightCanvas = document.getElementById('heightTimeGraph');
    this.heightCtx = this.heightCanvas ? this.heightCanvas.getContext('2d') : null;
    this.rangeCanvas = document.getElementById('rangeComparisonChart');
    this.rangeCtx = this.rangeCanvas ? this.rangeCanvas.getContext('2d') : null;
    
    // Mode state
    this.comparisonMode = false;
    
    // Single projectile physics parameters
    this.v0 = 50; // initial velocity (m/s)
    this.angle = 45; // launch angle (degrees)
    this.g = 9.81; // gravity (m/s²)
    this.dragCoeff = 0.47; // drag coefficient
    this.airResistance = false;
    
    // Dual projectile physics parameters
    this.projectile1 = {
      v0: 50,
      angle: 45,
      g: 9.81,
      mass: 1,
      dragCoeff: 0.47,
      airResistance: false
    };
    
    this.projectile2 = {
      v0: 60,
      angle: 30,
      g: 9.81,
      mass: 1,
      dragCoeff: 0.47,
      airResistance: false
    };
    
    // Simulation state
    this.isRunning = false;
    this.isPaused = false;
    this.time = 0;
    this.timeStep = 0.02;
    this.projectile = null;
    this.trajectory = [];
    
    // Dual projectile simulation state
    this.projectileA = null;
    this.projectileB = null;
    this.trajectoryA = [];
    this.trajectoryB = [];
    this.timeData = []; // for graphs
    
    // Display options
    this.showVectors = true;
    this.showTrajectory = true;
    
    // Camera control options
    this.followProjectile = false;
    this.autoScale = false;
    this.followTarget = 'both'; // 'projectile1', 'projectile2', 'both'
    
    // Auto-scale properties
    this.autoScaleEnabled = false;
    this.userInteracting = false;
    this.lastUserInteraction = 0;
    this.autoScaleResumeDelay = 2000; // ms to wait after user interaction
    this.autoScalePadding = 0.2; // 20% padding
    this.autoScaleLerpFactor = 0.05; // smooth interpolation factor
    this.minZoom = 0.5;
    this.maxZoom = 10;
    this.predictedLanding = { x: 0, y: 0 };
    this.predictedMaxHeight = 0;
    this.debugAutoScale = false; // debug mode for auto-scale visualization
    
    // Scale and offset for drawing (will be dynamically adjusted)
    this.scale = 4; // default pixels per meter
    this.baseScale = 4; // original scale for reset
    this.offsetX = 50;
    this.offsetY = this.canvas.height - 50;
    this.baseOffsetX = 50; // original offset for reset
    this.baseOffsetY = this.canvas.height - 50; // original offset for reset
    
    // Dynamic scaling properties
    this.dynamicScale = true; // enable dynamic scaling
    this.minScale = 0.5; // minimum scale to prevent too small display
    this.maxScale = 10; // maximum scale to prevent too large display
    this.maxDisplayRange = 0; // track maximum range needed
    this.maxDisplayHeight = 0; // track maximum height needed
    
    // Pan and zoom properties
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.targetScale = this.scale; // for smooth scaling
    this.targetCameraX = 0; // for smooth camera movement
    this.targetCameraY = 0; // for smooth camera movement
    this.smoothingFactor = 0.1; // controls smoothness of camera movement
    this.cameraX = 0; // camera position in world coordinates
    this.cameraY = 0; // camera position in world coordinates
    
    // Comparison results
    this.comparisonResults = {
      projectile1: { timeOfFlight: 0, maxHeight: 0, range: 0, finalVelocity: 0 },
      projectile2: { timeOfFlight: 0, maxHeight: 0, range: 0, finalVelocity: 0 },
      winners: { range: '', height: '', time: '' },
      differences: { range: 0, height: 0, time: 0 }
    };
    
    this.bindUI();
    this.updateDisplay();
    this.draw();
  }

  bindUI() {
    const elements = {
      velocity: document.getElementById('initialVelocity'),
      velocityInput: document.getElementById('initialVelocityInput'),
      angle: document.getElementById('launchAngle'),
      angleInput: document.getElementById('launchAngleInput'),
      gravity: document.getElementById('gravitySelect'),
      customGravity: document.getElementById('customGravity'),
      customGravityGroup: document.getElementById('customGravityGroup'),
      airResistance: document.getElementById('airResistance'),
      dragCoeff: document.getElementById('dragCoeff'),
      dragGroup: document.getElementById('dragGroup'),
      showVectors: document.getElementById('showVectors'),
      showTrajectory: document.getElementById('showTrajectory'),
      launchBtn: document.getElementById('launchBtn'),
      resetBtn: document.getElementById('resetBtn'),
      replayBtn: document.getElementById('replayBtn'),
      darkModeBtn: document.getElementById('projectileDarkModeBtn')
    };

    // Velocity control
    if (elements.velocity) {
      elements.velocity.addEventListener('input', (e) => {
        this.v0 = parseFloat(e.target.value);
        document.getElementById('velocityDisplay').textContent = this.v0;
        if (elements.velocityInput) elements.velocityInput.value = this.v0;
        this.updateDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }
    if (elements.velocityInput) {
      elements.velocityInput.addEventListener('input', (e) => {
        this.v0 = parseFloat(e.target.value);
        document.getElementById('velocityDisplay').textContent = this.v0;
        if (elements.velocity) elements.velocity.value = this.v0;
        this.updateDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }

    // Angle control
    if (elements.angle) {
      elements.angle.addEventListener('input', (e) => {
        this.angle = parseFloat(e.target.value);
        document.getElementById('angleDisplay').textContent = this.angle;
        if (elements.angleInput) elements.angleInput.value = this.angle;
        this.updateDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }
    if (elements.angleInput) {
      elements.angleInput.addEventListener('input', (e) => {
        this.angle = parseFloat(e.target.value);
        document.getElementById('angleDisplay').textContent = this.angle;
        if (elements.angle) elements.angle.value = this.angle;
        this.updateDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
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

    // Air resistance
    if (elements.airResistance) {
      elements.airResistance.addEventListener('change', (e) => {
        this.airResistance = e.target.checked;
        elements.dragGroup.style.display = this.airResistance ? 'block' : 'none';
      });
    }

    if (elements.dragCoeff) {
      elements.dragCoeff.addEventListener('input', (e) => {
        this.dragCoeff = parseFloat(e.target.value);
        document.getElementById('dragDisplay').textContent = this.dragCoeff;
      });
    }

    // Display options
    if (elements.showVectors) {
      elements.showVectors.addEventListener('change', (e) => {
        this.showVectors = e.target.checked;
      });
    }

    if (elements.showTrajectory) {
      elements.showTrajectory.addEventListener('change', (e) => {
        this.showTrajectory = e.target.checked;
      });
    }

    // Mouse controls for pan and zoom
    this.bindMouseControls();

    // Control buttons
    if (elements.launchBtn) {
      elements.launchBtn.addEventListener('click', () => this.launch());
    }

    if (elements.resetBtn) {
      elements.resetBtn.addEventListener('click', () => this.reset());
    }

    if (elements.replayBtn) {
      elements.replayBtn.addEventListener('click', () => this.replay());
    }

    // Dark mode
    if (elements.darkModeBtn) {
      elements.darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        elements.darkModeBtn.textContent = document.body.classList.contains('dark-mode') 
          ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      });
    }
    
    // Comparison mode controls
    this.bindComparisonControls();
  }
  
  bindComparisonControls() {
    const comparisonToggle = document.getElementById('comparisonModeToggle');
    if (comparisonToggle) {
      comparisonToggle.addEventListener('change', (e) => {
        this.toggleComparisonMode(e.target.checked);
      });
    }
    
    // Projectile controls
    this.bindProjectileControls(1);
    this.bindProjectileControls(2);
    
    // Camera controls
    this.bindCameraControls();
    
    // Launch both button
    const launchBothBtn = document.getElementById('launchBoth');
    if (launchBothBtn) {
      launchBothBtn.addEventListener('click', () => this.launchBoth());
    }
    
    // Utility buttons
    const syncBtn = document.getElementById('syncParameters');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncParameters());
    }
    
    const randomizeBtn = document.getElementById('randomizeParameters');
    if (randomizeBtn) {
      randomizeBtn.addEventListener('click', () => this.randomizeParameters());
    }
  }
  
  bindProjectileControls(projectileNum) {
    const prefix = `projectile${projectileNum}`;
    const projectileObj = projectileNum === 1 ? this.projectile1 : this.projectile2;
    
    // Velocity controls
    const velocitySlider = document.getElementById(`${prefix}Velocity`);
    const velocityInput = document.getElementById(`${prefix}VelocityInput`);
    const velocityDisplay = document.getElementById(`${prefix}VelocityDisplay`);
    
    if (velocitySlider) {
      velocitySlider.addEventListener('input', (e) => {
        projectileObj.v0 = parseFloat(e.target.value);
        if (velocityDisplay) velocityDisplay.textContent = projectileObj.v0;
        if (velocityInput) velocityInput.value = projectileObj.v0;
        this.updateComparisonDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }
    
    if (velocityInput) {
      velocityInput.addEventListener('input', (e) => {
        projectileObj.v0 = parseFloat(e.target.value) || 0;
        if (velocityDisplay) velocityDisplay.textContent = projectileObj.v0;
        if (velocitySlider) velocitySlider.value = projectileObj.v0;
        this.updateComparisonDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }
    
    // Angle controls
    const angleSlider = document.getElementById(`${prefix}Angle`);
    const angleInput = document.getElementById(`${prefix}AngleInput`);
    const angleDisplay = document.getElementById(`${prefix}AngleDisplay`);
    
    if (angleSlider) {
      angleSlider.addEventListener('input', (e) => {
        projectileObj.angle = parseFloat(e.target.value);
        if (angleDisplay) angleDisplay.textContent = projectileObj.angle;
        if (angleInput) angleInput.value = projectileObj.angle;
        this.updateComparisonDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }
    
    if (angleInput) {
      angleInput.addEventListener('input', (e) => {
        projectileObj.angle = parseFloat(e.target.value) || 0;
        if (angleDisplay) angleDisplay.textContent = projectileObj.angle;
        if (angleSlider) angleSlider.value = projectileObj.angle;
        this.updateComparisonDisplay();
        // Update predictions for auto-scale
        if (this.autoScaleEnabled) this.updatePredictions();
      });
    }
    
    // Mass
    const massSlider = document.getElementById(`${prefix}Mass`);
    if (massSlider) {
      massSlider.addEventListener('input', (e) => {
        projectileObj.mass = parseFloat(e.target.value);
        const massDisplay = document.getElementById(`${prefix}MassDisplay`);
        if (massDisplay) massDisplay.textContent = projectileObj.mass;
        this.updateComparisonDisplay();
      });
    }
    
    // Air resistance
    const airResToggle = document.getElementById(`${prefix}AirResistance`);
    if (airResToggle) {
      airResToggle.addEventListener('change', (e) => {
        projectileObj.airResistance = e.target.checked;
        this.updateComparisonDisplay();
      });
    }
    
    // Gravity
    const gravitySelect = document.getElementById(`${prefix}Gravity`);
    if (gravitySelect) {
      gravitySelect.addEventListener('change', (e) => {
        const customGravityGroup = document.getElementById(`${prefix}CustomGravityGroup`);
        if (e.target.value === 'custom') {
          if (customGravityGroup) customGravityGroup.style.display = 'block';
          const customGravity = document.getElementById(`${prefix}CustomGravity`);
          if (customGravity) projectileObj.g = parseFloat(customGravity.value);
        } else {
          if (customGravityGroup) customGravityGroup.style.display = 'none';
          projectileObj.g = parseFloat(e.target.value);
        }
        this.updateComparisonDisplay();
      });
    }
    
    const customGravity = document.getElementById(`${prefix}CustomGravity`);
    if (customGravity) {
      customGravity.addEventListener('input', (e) => {
        projectileObj.g = parseFloat(e.target.value);
        this.updateComparisonDisplay();
      });
    }
  }
  
  bindCameraControls() {
    const followToggle = document.getElementById('followProjectile');
    if (followToggle) {
      followToggle.addEventListener('change', (e) => {
        this.followProjectile = e.target.checked;
        if (this.followProjectile) {
          this.isDragging = false;
        }
      });
    }
    
    const autoScaleToggle = document.getElementById('autoScaleCanvas');
    if (autoScaleToggle) {
      autoScaleToggle.addEventListener('change', (e) => {
        this.autoScale = e.target.checked;
        this.autoScaleEnabled = e.target.checked;
        
        if (this.autoScaleEnabled) {
          // Disable conflicting camera systems
          this.followProjectile = false;
          const followToggle = document.getElementById('followProjectile');
          if (followToggle) followToggle.checked = false;
          
          // Calculate initial predictions when enabled
          this.updatePredictions();
          
          // Reset user interaction state
          this.userInteracting = false;
          this.lastUserInteraction = 0;
          
          // Immediately apply auto-scale
          this.updateAutoScale();
        }
      });
    }
    
    const followTargetSelect = document.getElementById('followTarget');
    if (followTargetSelect) {
      followTargetSelect.addEventListener('change', (e) => {
        this.followTarget = e.target.value;
      });
    }
    
    const resetViewBtn = document.getElementById('resetViewBtn');
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => this.resetView());
    }
  }
  
  toggleComparisonMode(enabled) {
    this.comparisonMode = enabled;
    
    // Show/hide appropriate panels
    const singleModeElements = document.querySelectorAll('.single-mode');
    const comparisonModeElements = document.querySelectorAll('.comparison-mode');
    
    singleModeElements.forEach(el => {
      el.style.display = enabled ? 'none' : 'block';
    });
    
    comparisonModeElements.forEach(el => {
      el.style.display = enabled ? 'block' : 'none';
    });
    
    // Reset simulation and redraw
    this.reset();
    if (enabled) {
      this.updateComparisonDisplay();
    }
    
    // Force redraw graphs
    setTimeout(() => {
      this.drawGraph();
      if (enabled) {
        this.drawComparisonGraphs();
      }
    }, 100);
  }
  
  syncParameters() {
    // Copy projectile1 parameters to projectile2
    this.projectile2.v0 = this.projectile1.v0;
    this.projectile2.angle = this.projectile1.angle;
    this.projectile2.g = this.projectile1.g;
    this.projectile2.mass = this.projectile1.mass;
    this.projectile2.airResistance = this.projectile1.airResistance;
    this.projectile2.dragCoeff = this.projectile1.dragCoeff;
    
    // Update UI elements
    this.updateProjectileInputs(2);
    this.updateComparisonDisplay();
  }
  
  randomizeParameters() {
    // Randomize projectile1
    this.projectile1.v0 = Math.round(20 + Math.random() * 80); // 20-100 m/s
    this.projectile1.angle = Math.round(15 + Math.random() * 60); // 15-75 degrees
    
    // Randomize projectile2
    this.projectile2.v0 = Math.round(20 + Math.random() * 80);
    this.projectile2.angle = Math.round(15 + Math.random() * 60);
    
    // Update UI elements
    this.updateProjectileInputs(1);
    this.updateProjectileInputs(2);
    this.updateComparisonDisplay();
  }
  
  updateProjectileInputs(projectileNum) {
    const prefix = `projectile${projectileNum}`;
    const projectileObj = projectileNum === 1 ? this.projectile1 : this.projectile2;
    
    // Update velocity inputs
    const velocitySlider = document.getElementById(`${prefix}Velocity`);
    const velocityInput = document.getElementById(`${prefix}VelocityInput`);
    const velocityDisplay = document.getElementById(`${prefix}VelocityDisplay`);
    
    if (velocitySlider) velocitySlider.value = projectileObj.v0;
    if (velocityInput) velocityInput.value = projectileObj.v0;
    if (velocityDisplay) velocityDisplay.textContent = projectileObj.v0;
    
    // Update angle inputs
    const angleSlider = document.getElementById(`${prefix}Angle`);
    const angleInput = document.getElementById(`${prefix}AngleInput`);
    const angleDisplay = document.getElementById(`${prefix}AngleDisplay`);
    
    if (angleSlider) angleSlider.value = projectileObj.angle;
    if (angleInput) angleInput.value = projectileObj.angle;
    if (angleDisplay) angleDisplay.textContent = projectileObj.angle;
    
    // Update mass
    const massSlider = document.getElementById(`${prefix}Mass`);
    const massDisplay = document.getElementById(`${prefix}MassDisplay`);
    if (massSlider) massSlider.value = projectileObj.mass;
    if (massDisplay) massDisplay.textContent = projectileObj.mass;
  }

  bindMouseControls() {
    // Mouse pan controls
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
      this.markUserInteraction();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        // Convert screen delta to world delta
        this.cameraX -= deltaX / this.scale;
        this.cameraY += deltaY / this.scale; // invert Y for world coordinates
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        this.updateCameraPosition();
        this.markUserInteraction();
      } else {
        this.canvas.style.cursor = 'grab';
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
    });

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));
      
      // Get mouse position relative to canvas
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate world position under mouse
      const worldX = this.screenToWorldX(mouseX);
      const worldY = this.screenToWorldY(mouseY);
      
      // Update scale
      this.scale = newScale;
      
      // Adjust camera to keep the same world point under the mouse
      this.cameraX = worldX - (mouseX - this.offsetX) / this.scale;
      this.cameraY = worldY + (mouseY - this.offsetY) / this.scale;
      
      this.updateCameraPosition();
      this.markUserInteraction();
    });
  }
  
  updatePredictions() {
    if (this.comparisonMode) {
      // Calculate predictions for both projectiles
      const pred1 = this.calculateProjectilePrediction(this.projectile1);
      const pred2 = this.calculateProjectilePrediction(this.projectile2);
      
      this.predictedLanding.x = Math.max(pred1.range, pred2.range);
      this.predictedMaxHeight = Math.max(pred1.maxHeight, pred2.maxHeight);
    } else {
      // Calculate predictions for single projectile
      const prediction = this.calculateProjectilePrediction({
        v0: this.v0,
        angle: this.angle,
        g: this.g
      });
      
      this.predictedLanding.x = prediction.range;
      this.predictedMaxHeight = prediction.maxHeight;
    }
  }
  
  calculateProjectilePrediction(params) {
    const angleRad = (params.angle * Math.PI) / 180;
    const range = (params.v0 ** 2 * Math.sin(2 * angleRad)) / params.g;
    const maxHeight = (params.v0 ** 2 * Math.sin(angleRad) ** 2) / (2 * params.g);
    
    return { range, maxHeight };
  }
  
  updateAutoScale() {
    if (!this.autoScaleEnabled) return;
    
    // Check if user recently interacted
    const timeSinceInteraction = Date.now() - this.lastUserInteraction;
    if (this.userInteracting && timeSinceInteraction < this.autoScaleResumeDelay) {
      return;
    }
    
    // Resume auto-scaling after user interaction delay
    if (timeSinceInteraction >= this.autoScaleResumeDelay) {
      this.userInteracting = false;
    }
    
    // Determine visible world bounds based on trajectories
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    
    if (this.comparisonMode) {
      // Include projectile A trajectory (trajectoryA)
      if (this.trajectoryA && this.trajectoryA.length > 0) {
        const xs = this.trajectoryA.map(p => p.x);
        const ys = this.trajectoryA.map(p => p.y);
        minX = Math.min(minX, ...xs);
        maxX = Math.max(maxX, ...xs);
        maxY = Math.max(maxY, ...ys);
      }
      
      // Include projectile B trajectory (trajectoryB for comparison mode)
      if (this.trajectoryB && this.trajectoryB.length > 0) {
        const xs2 = this.trajectoryB.map(p => p.x);
        const ys2 = this.trajectoryB.map(p => p.y);
        minX = Math.min(minX, ...xs2);
        maxX = Math.max(maxX, ...xs2);
        maxY = Math.max(maxY, ...ys2);
      }
      
      // Include predicted zones for both projectiles in comparison mode
      if (this.predictedLanding && this.predictedLanding.x > 0) {
        maxX = Math.max(maxX, this.predictedLanding.x);
      }
      if (this.predictedMaxHeight > 0) {
        maxY = Math.max(maxY, this.predictedMaxHeight);
      }
    } else {
      // Include single projectile trajectory
      if (this.trajectory && this.trajectory.length > 0) {
        const xs = this.trajectory.map(p => p.x);
        const ys = this.trajectory.map(p => p.y);
        minX = Math.min(minX, ...xs);
        maxX = Math.max(maxX, ...xs);
        maxY = Math.max(maxY, ...ys);
      }
      
      // Include predicted values for single mode
      if (this.predictedLanding && this.predictedLanding.x > 0) {
        maxX = Math.max(maxX, this.predictedLanding.x);
      }
      if (this.predictedMaxHeight > 0) {
        maxY = Math.max(maxY, this.predictedMaxHeight);
      }
    }
    
    // Ensure origin stays visible and set minimum bounds
    minX = Math.min(minX, -2); // Small buffer to the left of origin
    maxX = Math.max(maxX, 10); // Minimum range for visibility
    minY = Math.min(minY, 0);  // Always include ground level
    maxY = Math.max(maxY, 5);  // Minimum height for visibility
    
    // Add 20% padding to keep comfortable margins
    const padX = (maxX - minX) * 0.2 + 10;
    const padY = (maxY - minY) * 0.2 + 10;
    
    // Compute required view size
    const viewWidth = (maxX - minX) + padX;
    const viewHeight = (maxY - minY) + padY;
    
    // Calculate target scale for dynamic auto zoom
    const availableWidth = this.canvas.width - 100;
    const availableHeight = this.canvas.height - 100;
    const targetScaleX = viewWidth > 0 ? availableWidth / viewWidth : this.scale;
    const targetScaleY = viewHeight > 0 ? availableHeight / viewHeight : this.scale;
    const targetScale = Math.min(targetScaleX, targetScaleY);
    
    // Compute target camera center (keep origin visible, center on midpoint for comparison)
    const targetCenterX = this.comparisonMode ? 
      Math.max((minX + maxX) / 2, 0) : // Center between both projectiles but keep origin visible
      (minX + maxX) / 2; // Center on trajectory for single mode
    const targetCenterY = (minY + maxY) / 2;
    
    // Clamp target scale to reasonable limits
    const clampedTargetScale = Math.max(this.minZoom, Math.min(this.maxZoom, targetScale));
    
    // Update target camera positions for smooth cinematic movement
    this.targetCameraX = targetCenterX - (this.canvas.width / 2 - this.offsetX) / clampedTargetScale;
    this.targetCameraY = targetCenterY + (this.canvas.height / 2 - this.offsetY) / clampedTargetScale;
    this.targetScale = clampedTargetScale;
    
    // Smooth transition with configurable interpolation
    const smooth = this.smoothingFactor || 0.08;
    
    // Cinematic easing function for smoother start/stop
    const ease = (t) => t * t * (3 - 2 * t);
    const easedSmooth = ease(smooth);
    
    // Apply smooth cinematic transitions
    this.cameraX += (this.targetCameraX - this.cameraX) * easedSmooth;
    this.cameraY += (this.targetCameraY - this.cameraY) * easedSmooth;
    this.scale += (this.targetScale - this.scale) * easedSmooth;
  }
  
  drawAutoScaleDebugBox() {
    if (!this.autoScaleEnabled) return;
    
    const ctx = this.ctx;
    
    // Calculate the same bounding box as in updateAutoScale
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    
    if (this.comparisonMode) {
      if (this.trajectoryA && this.trajectoryA.length > 0) {
        const xs = this.trajectoryA.map(p => p.x);
        const ys = this.trajectoryA.map(p => p.y);
        minX = Math.min(minX, ...xs);
        maxX = Math.max(maxX, ...xs);
        maxY = Math.max(maxY, ...ys);
      }
      if (this.trajectoryB && this.trajectoryB.length > 0) {
        const xs2 = this.trajectoryB.map(p => p.x);
        const ys2 = this.trajectoryB.map(p => p.y);
        minX = Math.min(minX, ...xs2);
        maxX = Math.max(maxX, ...xs2);
        maxY = Math.max(maxY, ...ys2);
      }
    } else {
      if (this.trajectory && this.trajectory.length > 0) {
        const xs = this.trajectory.map(p => p.x);
        const ys = this.trajectory.map(p => p.y);
        minX = Math.min(minX, ...xs);
        maxX = Math.max(maxX, ...xs);
        maxY = Math.max(maxY, ...ys);
      }
    }
    
    // Apply same adjustments as in updateAutoScale
    minX = Math.min(minX, -2);
    maxX = Math.max(maxX, 10);
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 5);
    
    const padX = (maxX - minX) * 0.2 + 10;
    const padY = (maxY - minY) * 0.2 + 10;
    
    const finalMinX = minX - padX/2;
    const finalMaxX = maxX + padX/2;
    const finalMinY = minY - padY/2;
    const finalMaxY = maxY + padY/2;
    
    // Draw debug bounding box
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    const screenMinX = this.worldToScreenX(finalMinX);
    const screenMaxX = this.worldToScreenX(finalMaxX);
    const screenMinY = this.worldToScreenY(finalMaxY); // Note: Y is inverted
    const screenMaxY = this.worldToScreenY(finalMinY);
    
    ctx.beginPath();
    ctx.rect(screenMinX, screenMinY, screenMaxX - screenMinX, screenMaxY - screenMinY);
    ctx.stroke();
    
    // Draw center point
    const centerX = (finalMinX + finalMaxX) / 2;
    const centerY = (finalMinY + finalMaxY) / 2;
    const screenCenterX = this.worldToScreenX(centerX);
    const screenCenterY = this.worldToScreenY(centerY);
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(screenCenterX, screenCenterY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Debug info text
    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Debug: Auto-Scale Bounds`, 10, 30);
    ctx.fillText(`Scale: ${this.scale.toFixed(2)}`, 10, 50);
    ctx.fillText(`Camera: (${this.cameraX.toFixed(1)}, ${this.cameraY.toFixed(1)})`, 10, 70);
    ctx.fillText(`Bounds: (${finalMinX.toFixed(1)}, ${finalMinY.toFixed(1)}) to (${finalMaxX.toFixed(1)}, ${finalMaxY.toFixed(1)})`, 10, 90);
    
    ctx.restore();
  }

  screenToWorldX(screenX) {
    return this.cameraX + (screenX - this.offsetX) / this.scale;
  }

  screenToWorldY(screenY) {
    return this.cameraY - (screenY - this.offsetY) / this.scale;
  }

  worldToScreenX(worldX) {
    return this.offsetX + (worldX - this.cameraX) * this.scale;
  }

  worldToScreenY(worldY) {
    return this.offsetY - (worldY - this.cameraY) * this.scale;
  }

  markUserInteraction() {
    this.userInteracting = true;
    this.lastUserInteraction = Date.now();
  }

  updateCameraPosition() {
    // Only apply manual camera movement if auto-scale is disabled
    if (!this.autoScaleEnabled) {
      this.cameraX += (this.targetCameraX - this.cameraX) * this.smoothingFactor;
      this.cameraY += (this.targetCameraY - this.cameraY) * this.smoothingFactor;
      this.scale += (this.targetScale - this.scale) * this.smoothingFactor;
    }
  }

  resetView() {
    this.scale = this.baseScale;
    this.targetScale = this.baseScale;
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetCameraX = 0;
    this.targetCameraY = 0;
    this.offsetX = this.baseOffsetX;
    this.offsetY = this.baseOffsetY;
    this.maxDisplayRange = 0;
    this.maxDisplayHeight = 0;
    this.userInteracting = false;
    this.lastUserInteraction = 0;
    
    // Update predictions if auto-scale is enabled
    if (this.autoScaleEnabled) {
      this.updatePredictions();
    }
  }

  launch() {
    if (this.comparisonMode) {
      this.launchBoth();
      return;
    }
    
    this.reset();
    
    // Calculate theoretical maximum values for dynamic scaling
    const angleRad = (this.angle * Math.PI) / 180;
    const theoreticalRange = (this.v0 ** 2 * Math.sin(2 * angleRad)) / this.g;
    const theoreticalHeight = (this.v0 ** 2 * Math.sin(angleRad) ** 2) / (2 * this.g);
    
    // Update dynamic scale to fit the entire trajectory
    this.updateDynamicScale(theoreticalRange, theoreticalHeight);
    
    // Update predictions for auto-scale
    this.updatePredictions();
    
    const vx = this.v0 * Math.cos(angleRad);
    const vy = this.v0 * Math.sin(angleRad);
    
    this.projectile = {
      x: 0,
      y: 0,
      vx: vx,
      vy: vy,
      mass: 1 // kg
    };
    
    this.isRunning = true;
    this.isPaused = false;
    this.time = 0;
    this.trajectory = [{x: 0, y: 0}];
    
    this.animate();
  }
  
  launchBoth() {
    this.reset();
    
    // Calculate theoretical maximum values for both projectiles
    const angleRad1 = (this.projectile1.angle * Math.PI) / 180;
    const angleRad2 = (this.projectile2.angle * Math.PI) / 180;
    
    const range1 = (this.projectile1.v0 ** 2 * Math.sin(2 * angleRad1)) / this.projectile1.g;
    const height1 = (this.projectile1.v0 ** 2 * Math.sin(angleRad1) ** 2) / (2 * this.projectile1.g);
    
    const range2 = (this.projectile2.v0 ** 2 * Math.sin(2 * angleRad2)) / this.projectile2.g;
    const height2 = (this.projectile2.v0 ** 2 * Math.sin(angleRad2) ** 2) / (2 * this.projectile2.g);
    
    const maxRange = Math.max(range1, range2);
    const maxHeight = Math.max(height1, height2);
    
    // Update dynamic scale to fit both trajectories
    if (this.autoScaleEnabled) {
      this.updateDynamicScale(maxRange, maxHeight);
    }
    
    // Update predictions for auto-scale
    this.updatePredictions();
    
    // Initialize projectile A (Red)
    const vx1 = this.projectile1.v0 * Math.cos(angleRad1);
    const vy1 = this.projectile1.v0 * Math.sin(angleRad1);
    
    this.projectileA = {
      x: 0,
      y: 0,
      vx: vx1,
      vy: vy1,
      mass: this.projectile1.mass,
      params: this.projectile1
    };
    
    // Initialize projectile B (Blue)
    const vx2 = this.projectile2.v0 * Math.cos(angleRad2);
    const vy2 = this.projectile2.v0 * Math.sin(angleRad2);
    
    this.projectileB = {
      x: 0,
      y: 0,
      vx: vx2,
      vy: vy2,
      mass: this.projectile2.mass,
      params: this.projectile2
    };
    
    this.isRunning = true;
    this.isPaused = false;
    this.time = 0;
    this.trajectoryA = [{x: 0, y: 0}];
    this.trajectoryB = [{x: 0, y: 0}];
    this.timeData = [];
    
    this.animate();
  }

  updateDynamicScale(maxRange, maxHeight) {
    if (!this.dynamicScale) return;
    
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const availableWidth = canvasWidth - this.offsetX - 50; // leave 50px margin on right
    const availableHeight = this.offsetY - 50; // leave 50px margin on top
    
    // Add 20% padding to ensure the trajectory fits comfortably
    const paddedRange = maxRange * 1.2;
    const paddedHeight = maxHeight * 1.2;
    
    // Calculate scale factors for both dimensions
    const scaleByWidth = paddedRange > 0 ? availableWidth / paddedRange : this.scale;
    const scaleByHeight = paddedHeight > 0 ? availableHeight / paddedHeight : this.scale;
    
    // Use the smaller scale to ensure both dimensions fit
    this.scale = Math.max(this.minScale, Math.min(scaleByWidth, scaleByHeight));
    
    // Store max values for grid drawing
    this.maxDisplayRange = paddedRange;
    this.maxDisplayHeight = paddedHeight;
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.time = 0;
    this.projectile = null;
    this.trajectory = [];
    
    // Reset comparison mode data
    this.projectileA = null;
    this.projectileB = null;
    this.trajectoryA = [];
    this.trajectoryB = [];
    this.timeData = [];
    
    // Reset scale to default
    if (!this.autoScaleEnabled) {
      this.scale = 4;
    }
    this.maxDisplayRange = 0;
    this.maxDisplayHeight = 0;
    
    // Reset camera following
    if (!this.followProjectile) {
      this.cameraX = 0;
      this.cameraY = 0;
      this.targetCameraX = 0;
      this.targetCameraY = 0;
    }
    
    if (this.comparisonMode) {
      this.updateComparisonDisplay();
    } else {
      this.updateDisplay();
    }
    this.draw();
    this.drawGraph();
    if (this.comparisonMode) {
      this.drawComparisonGraphs();
    }
  }

  replay() {
    if (this.trajectory.length > 0) {
      this.launch();
    }
  }

  animate() {
    if (!this.isRunning || this.isPaused) return;
    
    this.updatePhysics();
    
    if (this.comparisonMode) {
      this.updateComparisonDisplay();
    } else {
      this.updateDisplay();
    }
    
    this.draw();
    this.drawGraph();
    if (this.comparisonMode) {
      this.drawComparisonGraphs();
    }
    
    // Continue animation if projectiles are still in flight
    if (this.comparisonMode) {
      const activeProjectiles = (
        (this.projectileA && this.projectileA.y >= 0 ? 1 : 0) +
        (this.projectileB && this.projectileB.y >= 0 ? 1 : 0)
      );
      
      if (activeProjectiles > 0) {
        requestAnimationFrame(() => this.animate());
      } else {
        this.isRunning = false;
        this.calculateComparisonResults();
      }
    } else {
      if (this.projectile && this.projectile.y >= 0) {
        requestAnimationFrame(() => this.animate());
      } else {
        this.isRunning = false;
      }
    }
  }

  updatePhysics() {
    // Update time
    this.time += this.timeStep;
    
    if (this.comparisonMode) {
      // Update both projectiles
      let activeProjectiles = 0;
      
      if (this.projectileA && this.projectileA.y >= 0) {
        this.updateProjectilePhysics(this.projectileA, this.trajectoryA, this.projectileA.params);
        activeProjectiles++;
      }
      
      if (this.projectileB && this.projectileB.y >= 0) {
        this.updateProjectilePhysics(this.projectileB, this.trajectoryB, this.projectileB.params);
        activeProjectiles++;
      }
      
      // Store time data for graphs
      this.timeData.push({
        time: this.time,
        projectileA: this.projectileA ? { ...this.projectileA } : null,
        projectileB: this.projectileB ? { ...this.projectileB } : null
      });
      
      // Update camera following
      if (this.followProjectile) {
        this.updateCameraFollowing();
      }
      
      // Update auto-scale
      this.updateAutoScale();
      
      // Check if simulation should stop
      if (activeProjectiles === 0) {
        this.isRunning = false;
        this.calculateComparisonResults();
      }
    } else {
      // Single projectile mode
      if (this.projectile && this.projectile.y >= 0) {
        this.updateProjectilePhysics(this.projectile, this.trajectory, { g: this.g, airResistance: this.airResistance, dragCoeff: this.dragCoeff });
      }
      
      // Update auto-scale for single mode
      this.updateAutoScale();
    }
  }

  updateProjectilePhysics(projectile, trajectory, params) {
    // Store position in trajectory
    trajectory.push({x: projectile.x, y: projectile.y});
    
    // Calculate forces
    let ax = 0;
    let ay = -params.g;
    
    // Air resistance (simplified)
    if (params.airResistance) {
      const speed = Math.sqrt(projectile.vx ** 2 + projectile.vy ** 2);
      const dragForce = 0.5 * params.dragCoeff * 1.225 * 0.05 * speed ** 2; // approximate
      const dragAccel = dragForce / projectile.mass;
      
      if (speed > 0) {
        ax -= dragAccel * (projectile.vx / speed);
        ay -= dragAccel * (projectile.vy / speed);
      }
    }
    
    // Update velocity
    projectile.vx += ax * this.timeStep;
    projectile.vy += ay * this.timeStep;
    
    // Update position
    projectile.x += projectile.vx * this.timeStep;
    projectile.y += projectile.vy * this.timeStep;
  }

  updateDisplay() {
    // Calculate theoretical values
    const angleRad = (this.angle * Math.PI) / 180;
    const timeOfFlight = (2 * this.v0 * Math.sin(angleRad)) / this.g;
    const maxHeight = (this.v0 ** 2 * Math.sin(angleRad) ** 2) / (2 * this.g);
    const range = (this.v0 ** 2 * Math.sin(2 * angleRad)) / this.g;
    
    // Update data display
    const elements = {
      timeOfFlight: document.getElementById('timeOfFlight'),
      maxHeight: document.getElementById('maxHeight'),
      range: document.getElementById('range'),
      currentPos: document.getElementById('currentPos')
    };
    
    if (elements.timeOfFlight) {
      elements.timeOfFlight.textContent = `${timeOfFlight.toFixed(2)} s`;
    }
    
    if (elements.maxHeight) {
      elements.maxHeight.textContent = `${maxHeight.toFixed(2)} m`;
    }
    
    if (elements.range) {
      elements.range.textContent = `${range.toFixed(2)} m`;
    }
    
    if (elements.currentPos && this.projectile) {
      elements.currentPos.textContent = `(${this.projectile.x.toFixed(1)}, ${this.projectile.y.toFixed(1)}) m`;
    } else if (elements.currentPos) {
      elements.currentPos.textContent = `(0, 0) m`;
    }
    
    // Update predictions for auto-scale when parameters change
    if (this.autoScaleEnabled) {
      this.updatePredictions();
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    this.drawGrid();
    
    if (this.comparisonMode) {
      // Draw comparison mode
      this.drawComparisonMode();
    } else {
      // Draw single mode
      this.drawSingleMode();
    }
    
    // Draw launch point
    const launchX = this.worldToScreenX(0);
    const launchY = this.worldToScreenY(0);
    ctx.fillStyle = '#00AA00';
    ctx.beginPath();
    ctx.arc(launchX, launchY, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Debug mode: draw auto-scale bounding box
    if (this.debugAutoScale && this.autoScaleEnabled && (this.trajectory.length > 0 || this.trajectoryA.length > 0 || this.trajectoryB.length > 0)) {
      this.drawAutoScaleDebugBox();
    }
  }
  
  drawSingleMode() {
    const ctx = this.ctx;
    
    // Draw trajectory path
    if (this.showTrajectory && this.trajectory.length > 1) {
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      
      for (let i = 0; i < this.trajectory.length; i++) {
        const x = this.worldToScreenX(this.trajectory[i].x);
        const y = this.worldToScreenY(this.trajectory[i].y);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw projectile
    if (this.projectile && this.projectile.y >= 0) {
      const x = this.worldToScreenX(this.projectile.x);
      const y = this.worldToScreenY(this.projectile.y);
      
      ctx.fillStyle = '#FF6B35';
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw velocity vectors
      if (this.showVectors) {
        this.drawVectors(x, y, this.projectile, '#FF0000');
      }
    }
    
    // Draw angle indicator
    if (!this.isRunning) {
      this.drawAngleIndicator();
    }
  }
  
  drawComparisonMode() {
    const ctx = this.ctx;
    
    // Draw trajectory paths
    if (this.showTrajectory) {
      // Projectile A (Red) trajectory
      if (this.trajectoryA.length > 1) {
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        
        for (let i = 0; i < this.trajectoryA.length; i++) {
          const x = this.worldToScreenX(this.trajectoryA[i].x);
          const y = this.worldToScreenY(this.trajectoryA[i].y);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      
      // Projectile B (Blue) trajectory
      if (this.trajectoryB.length > 1) {
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        
        for (let i = 0; i < this.trajectoryB.length; i++) {
          const x = this.worldToScreenX(this.trajectoryB[i].x);
          const y = this.worldToScreenY(this.trajectoryB[i].y);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
    
    // Draw projectile A (Red)
    if (this.projectileA && this.projectileA.y >= 0) {
      const x = this.worldToScreenX(this.projectileA.x);
      const y = this.worldToScreenY(this.projectileA.y);
      
      ctx.fillStyle = '#e63946';
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw velocity vectors
      if (this.showVectors) {
        this.drawVectors(x, y, this.projectileA, '#cc0000');
      }
      
      // Draw label
      ctx.fillStyle = '#cc0000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('1', x, y - 15);
    }
    
    // Draw projectile B (Blue)
    if (this.projectileB && this.projectileB.y >= 0) {
      const x = this.worldToScreenX(this.projectileB.x);
      const y = this.worldToScreenY(this.projectileB.y);
      
      ctx.fillStyle = '#1d4ed8';
      ctx.strokeStyle = '#0000cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw velocity vectors
      if (this.showVectors) {
        this.drawVectors(x, y, this.projectileB, '#0000CC');
      }
      
      // Draw label
      ctx.fillStyle = '#0000CC';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('2', x, y - 15);
    }
    
    // Draw angle indicators
    if (!this.isRunning) {
      this.drawComparisonAngleIndicators();
    }
  }
  
  drawComparisonAngleIndicators() {
    const ctx = this.ctx;
    const launchX = this.worldToScreenX(0);
    const launchY = this.worldToScreenY(0);
    
    // Projectile 1 angle indicator (Red)
    const angleRad1 = (this.projectile1.angle * Math.PI) / 180;
    const radius1 = 40;
    
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2;
    
    // Angle arc
    ctx.beginPath();
    ctx.arc(launchX, launchY, radius1, -angleRad1, 0);
    ctx.stroke();
    
    // Angle line
    ctx.beginPath();
    ctx.moveTo(launchX, launchY);
    ctx.lineTo(launchX + radius1 * Math.cos(angleRad1), 
               launchY - radius1 * Math.sin(angleRad1));
    ctx.stroke();
    
    // Angle label
    ctx.fillStyle = '#e63946';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.projectile1.angle}°`, 
                 launchX + radius1 * 0.7 * Math.cos(angleRad1 / 2), 
                 launchY - radius1 * 0.7 * Math.sin(angleRad1 / 2));
    
    // Projectile 2 angle indicator (Blue)
    const angleRad2 = (this.projectile2.angle * Math.PI) / 180;
    const radius2 = 30;
    
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    
    // Angle arc
    ctx.beginPath();
    ctx.arc(launchX, launchY, radius2, -angleRad2, 0);
    ctx.stroke();
    
    // Angle line
    ctx.beginPath();
    ctx.moveTo(launchX, launchY);
    ctx.lineTo(launchX + radius2 * Math.cos(angleRad2), 
               launchY - radius2 * Math.sin(angleRad2));
    ctx.stroke();
    
    // Angle label
    ctx.fillStyle = '#1d4ed8';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.projectile2.angle}°`, 
                 launchX + radius2 * 0.7 * Math.cos(angleRad2 / 2), 
                 launchY - radius2 * 0.7 * Math.sin(angleRad2 / 2));
  }

  drawGrid() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    
    // Calculate appropriate grid spacing based on scale
    let gridSpacing = 10; // default 10 meters
    const pixelsPerGrid = gridSpacing * this.scale;
    if (pixelsPerGrid < 30) {
      gridSpacing = 20;
      if (gridSpacing * this.scale < 30) gridSpacing = 50;
      if (gridSpacing * this.scale < 30) gridSpacing = 100;
    }
    
    // Calculate world bounds visible on screen
    const leftWorld = this.screenToWorldX(0);
    const rightWorld = this.screenToWorldX(width);
    const topWorld = this.screenToWorldY(0);
    const bottomWorld = this.screenToWorldY(height);
    
    // Draw vertical grid lines
    const startX = Math.floor(leftWorld / gridSpacing) * gridSpacing;
    const endX = Math.ceil(rightWorld / gridSpacing) * gridSpacing;
    
    for (let worldX = startX; worldX <= endX; worldX += gridSpacing) {
      const screenX = this.worldToScreenX(worldX);
      if (screenX >= 0 && screenX <= width) {
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }
    }
    
    // Draw horizontal grid lines
    const startY = Math.floor(bottomWorld / gridSpacing) * gridSpacing;
    const endY = Math.ceil(topWorld / gridSpacing) * gridSpacing;
    
    for (let worldY = startY; worldY <= endY; worldY += gridSpacing) {
      const screenY = this.worldToScreenY(worldY);
      if (screenY >= 0 && screenY <= height) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }
    
    // Draw ground line (y = 0)
    const groundY = this.worldToScreenY(0);
    if (groundY >= 0 && groundY <= height) {
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();
    }
    
    // Draw axis labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    
    // X-axis labels
    ctx.textAlign = 'center';
    for (let worldX = startX; worldX <= endX; worldX += gridSpacing) {
      if (worldX !== 0) { // Skip origin
        const screenX = this.worldToScreenX(worldX);
        const labelY = this.worldToScreenY(0);
        if (screenX >= 0 && screenX <= width && labelY >= 0 && labelY <= height - 5) {
          ctx.fillText(`${worldX}m`, screenX, labelY + 20);
        }
      }
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let worldY = startY; worldY <= endY; worldY += gridSpacing) {
      if (worldY > 0) { // Only positive heights
        const screenY = this.worldToScreenY(worldY);
        const labelX = this.worldToScreenX(0);
        if (screenY >= 0 && screenY <= height && labelX >= 15 && labelX <= width) {
          ctx.fillText(`${worldY}m`, labelX - 10, screenY + 4);
        }
      }
    }
  }

  drawVectors(x, y, projectile, color) {
    if (!projectile) return;
    
    const ctx = this.ctx;
    const vectorScale = 2; // scale factor for vector display
    
    // Velocity vector
    const vxPixels = projectile.vx * vectorScale;
    const vyPixels = -projectile.vy * vectorScale; // negative because canvas y is inverted
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + vxPixels, y + vyPixels);
    ctx.stroke();
    
    // Arrow head for velocity
    this.drawArrowHead(x + vxPixels, y + vyPixels, Math.atan2(vyPixels, vxPixels), color);
    
    // Velocity components (lighter color)
    const lightColor = '#FF8888';
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // Horizontal component
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + vxPixels, y);
    ctx.stroke();
    
    // Vertical component
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + vyPixels);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Labels
    ctx.fillStyle = color;
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    const speed = Math.sqrt(projectile.vx**2 + projectile.vy**2);
    ctx.fillText(`v=${speed.toFixed(1)} m/s`, x + vxPixels + 5, y + vyPixels - 5);
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

  drawAngleIndicator() {
    const ctx = this.ctx;
    const angleRad = (this.angle * Math.PI) / 180;
    const radius = 30;
    
    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = 2;
    
    // Angle arc
    ctx.beginPath();
    ctx.arc(this.offsetX, this.offsetY, radius, -angleRad, 0);
    ctx.stroke();
    
    // Angle line
    ctx.beginPath();
    ctx.moveTo(this.offsetX, this.offsetY);
    ctx.lineTo(this.offsetX + radius * Math.cos(angleRad), 
               this.offsetY - radius * Math.sin(angleRad));
    ctx.stroke();
    
    // Angle label
    ctx.fillStyle = '#00AA00';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.angle}°`, 
                 this.offsetX + radius * 0.7 * Math.cos(angleRad / 2), 
                 this.offsetY - radius * 0.7 * Math.sin(angleRad / 2));
  }

  drawGraph() {
    if (this.comparisonMode) {
      // Clear single mode graph
      if (this.graphCtx) {
        this.graphCtx.clearRect(0, 0, this.graphCanvas.width, this.graphCanvas.height);
      }
      this.drawComparisonTrajectoryGraph();
    } else {
      // Clear comparison mode graph
      if (this.comparisonGraphCtx) {
        this.comparisonGraphCtx.clearRect(0, 0, this.comparisonGraphCanvas.width, this.comparisonGraphCanvas.height);
      }
      this.drawSingleTrajectoryGraph();
    }
  }
  
  drawSingleTrajectoryGraph() {
    if (!this.graphCtx || this.trajectory.length < 2) return;
    
    const ctx = this.graphCtx;
    const width = this.graphCanvas.width;
    const height = this.graphCanvas.height;
    
    // Clear graph
    ctx.clearRect(0, 0, width, height);
    
    // Find max values for scaling
    let maxX = Math.max(...this.trajectory.map(p => p.x));
    let maxY = Math.max(...this.trajectory.map(p => p.y));
    
    if (maxX === 0) maxX = 1;
    if (maxY === 0) maxY = 1;
    
    const scaleX = (width - 80) / maxX;
    const scaleY = (height - 80) / maxY;
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
    
    // Draw trajectory
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < this.trajectory.length; i++) {
      const x = offsetX + this.trajectory[i].x * scaleX;
      const y = offsetY - this.trajectory[i].y * scaleY;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Horizontal Distance (m)', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Height (m)', 0, 0);
    ctx.restore();
  }
  
  drawComparisonTrajectoryGraph() {
    if (!this.comparisonGraphCtx) return;
    
    const ctx = this.comparisonGraphCtx;
    const width = this.comparisonGraphCanvas.width;
    const height = this.comparisonGraphCanvas.height;
    
    // Clear graph
    ctx.clearRect(0, 0, width, height);
    
    // Find max values for scaling across both trajectories
    let maxX = 0;
    let maxY = 0;
    
    if (this.trajectoryA.length > 0) {
      maxX = Math.max(maxX, ...this.trajectoryA.map(p => p.x));
      maxY = Math.max(maxY, ...this.trajectoryA.map(p => p.y));
    }
    
    if (this.trajectoryB.length > 0) {
      maxX = Math.max(maxX, ...this.trajectoryB.map(p => p.x));
      maxY = Math.max(maxY, ...this.trajectoryB.map(p => p.y));
    }
    
    if (maxX === 0) maxX = 1;
    if (maxY === 0) maxY = 1;
    
    const scaleX = (width - 80) / maxX;
    const scaleY = (height - 80) / maxY;
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
    
    // Draw grid lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    const gridSpacing = 50; // pixels
    
    // Vertical grid lines
    for (let x = offsetX + gridSpacing; x < width - 20; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, 20);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = offsetY - gridSpacing; y > 20; y -= gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }
    
    // Draw trajectory A (Red)
    if (this.trajectoryA.length > 1) {
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let i = 0; i < this.trajectoryA.length; i++) {
        const x = offsetX + this.trajectoryA[i].x * scaleX;
        const y = offsetY - this.trajectoryA[i].y * scaleY;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    // Draw trajectory B (Blue)
    if (this.trajectoryB.length > 1) {
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let i = 0; i < this.trajectoryB.length; i++) {
        const x = offsetX + this.trajectoryB[i].x * scaleX;
        const y = offsetY - this.trajectoryB[i].y * scaleY;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Horizontal Distance (m)', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Height (m)', 0, 0);
    ctx.restore();
    
    // Draw legend
    const legendX = width - 120;
    const legendY = 30;
    
    // Red legend
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 20, legendY);
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Projectile 1', legendX + 25, legendY + 4);
    
    // Blue legend
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 20);
    ctx.lineTo(legendX + 20, legendY + 20);
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.fillText('Projectile 2', legendX + 25, legendY + 24);
  }
}

// Add comparison mode methods
ProjectileMotionSimulator.prototype.updateComparisonDisplay = function() {
  // Update projectile 1 data
  const elements1 = {
    velocity: document.getElementById('projectile1CurrentVelocity'),
    angle: document.getElementById('projectile1CurrentAngle'),
    timeOfFlight: document.getElementById('projectile1TimeOfFlight'),
    maxHeight: document.getElementById('projectile1MaxHeight'),
    range: document.getElementById('projectile1Range'),
    finalVelocity: document.getElementById('projectile1FinalVelocity'),
    currentPos: document.getElementById('projectile1CurrentPos')
  };
  
  if (elements1.velocity) elements1.velocity.textContent = `${this.projectile1.v0} m/s`;
  if (elements1.angle) elements1.angle.textContent = `${this.projectile1.angle}°`;
  
  // Calculate theoretical values for projectile 1
  const angleRad1 = (this.projectile1.angle * Math.PI) / 180;
  const timeOfFlight1 = (2 * this.projectile1.v0 * Math.sin(angleRad1)) / this.projectile1.g;
  const maxHeight1 = (this.projectile1.v0 ** 2 * Math.sin(angleRad1) ** 2) / (2 * this.projectile1.g);
  const range1 = (this.projectile1.v0 ** 2 * Math.sin(2 * angleRad1)) / this.projectile1.g;
  
  if (elements1.timeOfFlight) elements1.timeOfFlight.textContent = `${timeOfFlight1.toFixed(2)} s`;
  if (elements1.maxHeight) elements1.maxHeight.textContent = `${maxHeight1.toFixed(2)} m`;
  if (elements1.range) elements1.range.textContent = `${range1.toFixed(2)} m`;
  
  if (this.projectileA) {
    const finalVel1 = Math.sqrt(this.projectileA.vx**2 + this.projectileA.vy**2);
    if (elements1.finalVelocity) elements1.finalVelocity.textContent = `${finalVel1.toFixed(2)} m/s`;
    if (elements1.currentPos) elements1.currentPos.textContent = `(${this.projectileA.x.toFixed(1)}, ${this.projectileA.y.toFixed(1)}) m`;
  }
  
  // Update projectile 2 data
  const elements2 = {
    velocity: document.getElementById('projectile2CurrentVelocity'),
    angle: document.getElementById('projectile2CurrentAngle'),
    timeOfFlight: document.getElementById('projectile2TimeOfFlight'),
    maxHeight: document.getElementById('projectile2MaxHeight'),
    range: document.getElementById('projectile2Range'),
    finalVelocity: document.getElementById('projectile2FinalVelocity'),
    currentPos: document.getElementById('projectile2CurrentPos')
  };
  
  if (elements2.velocity) elements2.velocity.textContent = `${this.projectile2.v0} m/s`;
  if (elements2.angle) elements2.angle.textContent = `${this.projectile2.angle}°`;
  
  // Calculate theoretical values for projectile 2
  const angleRad2 = (this.projectile2.angle * Math.PI) / 180;
  const timeOfFlight2 = (2 * this.projectile2.v0 * Math.sin(angleRad2)) / this.projectile2.g;
  const maxHeight2 = (this.projectile2.v0 ** 2 * Math.sin(angleRad2) ** 2) / (2 * this.projectile2.g);
  const range2 = (this.projectile2.v0 ** 2 * Math.sin(2 * angleRad2)) / this.projectile2.g;
  
  if (elements2.timeOfFlight) elements2.timeOfFlight.textContent = `${timeOfFlight2.toFixed(2)} s`;
  if (elements2.maxHeight) elements2.maxHeight.textContent = `${maxHeight2.toFixed(2)} m`;
  if (elements2.range) elements2.range.textContent = `${range2.toFixed(2)} m`;
  
  if (this.projectileB) {
    const finalVel2 = Math.sqrt(this.projectileB.vx**2 + this.projectileB.vy**2);
    if (elements2.finalVelocity) elements2.finalVelocity.textContent = `${finalVel2.toFixed(2)} m/s`;
    if (elements2.currentPos) elements2.currentPos.textContent = `(${this.projectileB.x.toFixed(1)}, ${this.projectileB.y.toFixed(1)}) m`;
  }
  
  // Update predictions for auto-scale when parameters change
  if (this.autoScaleEnabled) {
    this.updatePredictions();
  }
};

ProjectileMotionSimulator.prototype.updateCameraFollowing = function() {
  if (!this.followProjectile) return;
  
  let targetX = 0, targetY = 0;
  
  if (this.followTarget === 'projectile1' && this.projectileA) {
    targetX = this.projectileA.x;
    targetY = this.projectileA.y;
  } else if (this.followTarget === 'projectile2' && this.projectileB) {
    targetX = this.projectileB.x;
    targetY = this.projectileB.y;
  } else if (this.followTarget === 'both') {
    // Follow midpoint between projectiles
    let activeProjectiles = [];
    if (this.projectileA && this.projectileA.y >= 0) activeProjectiles.push(this.projectileA);
    if (this.projectileB && this.projectileB.y >= 0) activeProjectiles.push(this.projectileB);
    
    if (activeProjectiles.length > 0) {
      targetX = activeProjectiles.reduce((sum, p) => sum + p.x, 0) / activeProjectiles.length;
      targetY = activeProjectiles.reduce((sum, p) => sum + p.y, 0) / activeProjectiles.length;
    }
  }
  
  // Apply smooth camera following with interpolation
  this.targetCameraX = targetX - this.canvas.width / (2 * this.scale);
  this.targetCameraY = targetY - this.canvas.height / (2 * this.scale);
};

ProjectileMotionSimulator.prototype.calculateComparisonResults = function() {
  // Calculate results for projectile 1
  if (this.trajectoryA.length > 0) {
    const lastPoint = this.trajectoryA[this.trajectoryA.length - 1];
    const maxHeight1 = Math.max(...this.trajectoryA.map(p => p.y));
    const timeOfFlight1 = (this.trajectoryA.length - 1) * this.timeStep;
    const finalVelocity1 = this.projectileA ? Math.sqrt(this.projectileA.vx**2 + this.projectileA.vy**2) : 0;
    
    this.comparisonResults.projectile1 = {
      timeOfFlight: timeOfFlight1,
      maxHeight: maxHeight1,
      range: lastPoint.x,
      finalVelocity: finalVelocity1
    };
  }
  
  // Calculate results for projectile 2
  if (this.trajectoryB.length > 0) {
    const lastPoint = this.trajectoryB[this.trajectoryB.length - 1];
    const maxHeight2 = Math.max(...this.trajectoryB.map(p => p.y));
    const timeOfFlight2 = (this.trajectoryB.length - 1) * this.timeStep;
    const finalVelocity2 = this.projectileB ? Math.sqrt(this.projectileB.vx**2 + this.projectileB.vy**2) : 0;
    
    this.comparisonResults.projectile2 = {
      timeOfFlight: timeOfFlight2,
      maxHeight: maxHeight2,
      range: lastPoint.x,
      finalVelocity: finalVelocity2
    };
  }
  
  // Determine winners and calculate differences
  const results1 = this.comparisonResults.projectile1;
  const results2 = this.comparisonResults.projectile2;
  
  // Range winner
  if (results1.range > results2.range) {
    this.comparisonResults.winners.range = 'Projectile 1 (Red)';
  } else if (results2.range > results1.range) {
    this.comparisonResults.winners.range = 'Projectile 2 (Blue)';
  } else {
    this.comparisonResults.winners.range = 'Tie';
  }
  this.comparisonResults.differences.range = Math.abs(results1.range - results2.range);
  
  // Height winner
  if (results1.maxHeight > results2.maxHeight) {
    this.comparisonResults.winners.height = 'Projectile 1 (Red)';
  } else if (results2.maxHeight > results1.maxHeight) {
    this.comparisonResults.winners.height = 'Projectile 2 (Blue)';
  } else {
    this.comparisonResults.winners.height = 'Tie';
  }
  this.comparisonResults.differences.height = Math.abs(results1.maxHeight - results2.maxHeight);
  
  // Time winner
  if (results1.timeOfFlight > results2.timeOfFlight) {
    this.comparisonResults.winners.time = 'Projectile 1 (Red)';
  } else if (results2.timeOfFlight > results1.timeOfFlight) {
    this.comparisonResults.winners.time = 'Projectile 2 (Blue)';
  } else {
    this.comparisonResults.winners.time = 'Tie';
  }
  this.comparisonResults.differences.time = Math.abs(results1.timeOfFlight - results2.timeOfFlight);
  
  // Update comparison results display
  this.updateComparisonResultsDisplay();
};

ProjectileMotionSimulator.prototype.updateComparisonResultsDisplay = function() {
  const winners = this.comparisonResults.winners;
  const differences = this.comparisonResults.differences;
  
  const elements = {
    rangeWinner: document.getElementById('rangeWinner'),
    heightWinner: document.getElementById('heightWinner'),
    timeWinner: document.getElementById('timeWinner'),
    rangeDifference: document.getElementById('rangeDifference'),
    heightDifference: document.getElementById('heightDifference'),
    timeDifference: document.getElementById('timeDifference')
  };
  
  if (elements.rangeWinner) elements.rangeWinner.textContent = winners.range;
  if (elements.heightWinner) elements.heightWinner.textContent = winners.height;
  if (elements.timeWinner) elements.timeWinner.textContent = winners.time;
  if (elements.rangeDifference) elements.rangeDifference.textContent = `${differences.range.toFixed(2)} m`;
  if (elements.heightDifference) elements.heightDifference.textContent = `${differences.height.toFixed(2)} m`;
  if (elements.timeDifference) elements.timeDifference.textContent = `${differences.time.toFixed(2)} s`;
};

ProjectileMotionSimulator.prototype.drawComparisonGraphs = function() {
  if (!this.comparisonMode) return;
  
  // Draw velocity vs time graph
  this.drawVelocityTimeGraph();
  
  // Draw height vs time graph
  this.drawHeightTimeGraph();
  
  // Draw range comparison chart
  this.drawRangeComparisonChart();
};

ProjectileMotionSimulator.prototype.drawVelocityTimeGraph = function() {
  if (!this.velocityCtx || this.timeData.length < 2) return;
  
  const ctx = this.velocityCtx;
  const width = this.velocityCanvas.width;
  const height = this.velocityCanvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Find max values
  let maxTime = 0;
  let maxVelocity = 0;
  
  this.timeData.forEach(data => {
    maxTime = Math.max(maxTime, data.time);
    if (data.projectileA) {
      const vel = Math.sqrt(data.projectileA.vx**2 + data.projectileA.vy**2);
      maxVelocity = Math.max(maxVelocity, vel);
    }
    if (data.projectileB) {
      const vel = Math.sqrt(data.projectileB.vx**2 + data.projectileB.vy**2);
      maxVelocity = Math.max(maxVelocity, vel);
    }
  });
  
  if (maxTime === 0 || maxVelocity === 0) return;
  
  const scaleX = (width - 80) / maxTime;
  const scaleY = (height - 80) / maxVelocity;
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
  
  // Draw projectile A velocity
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let firstA = true;
  
  this.timeData.forEach(data => {
    if (data.projectileA) {
      const vel = Math.sqrt(data.projectileA.vx**2 + data.projectileA.vy**2);
      const x = offsetX + data.time * scaleX;
      const y = offsetY - vel * scaleY;
      
      if (firstA) {
        ctx.moveTo(x, y);
        firstA = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
  
  // Draw projectile B velocity
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let firstB = true;
  
  this.timeData.forEach(data => {
    if (data.projectileB) {
      const vel = Math.sqrt(data.projectileB.vx**2 + data.projectileB.vy**2);
      const x = offsetX + data.time * scaleX;
      const y = offsetY - vel * scaleY;
      
      if (firstB) {
        ctx.moveTo(x, y);
        firstB = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Time (s)', width / 2, height - 10);
  
  ctx.save();
  ctx.translate(15, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Velocity (m/s)', 0, 0);
  ctx.restore();
};

ProjectileMotionSimulator.prototype.drawHeightTimeGraph = function() {
  if (!this.heightCtx || this.timeData.length < 2) return;
  
  const ctx = this.heightCtx;
  const width = this.heightCanvas.width;
  const height = this.heightCanvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Find max values
  let maxTime = 0;
  let maxHeight = 0;
  
  this.timeData.forEach(data => {
    maxTime = Math.max(maxTime, data.time);
    if (data.projectileA) {
      maxHeight = Math.max(maxHeight, data.projectileA.y);
    }
    if (data.projectileB) {
      maxHeight = Math.max(maxHeight, data.projectileB.y);
    }
  });
  
  if (maxTime === 0 || maxHeight === 0) return;
  
  const scaleX = (width - 80) / maxTime;
  const scaleY = (height - 80) / maxHeight;
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
  
  // Draw projectile A height
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let firstA = true;
  
  this.timeData.forEach(data => {
    if (data.projectileA && data.projectileA.y >= 0) {
      const x = offsetX + data.time * scaleX;
      const y = offsetY - data.projectileA.y * scaleY;
      
      if (firstA) {
        ctx.moveTo(x, y);
        firstA = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
  
  // Draw projectile B height
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let firstB = true;
  
  this.timeData.forEach(data => {
    if (data.projectileB && data.projectileB.y >= 0) {
      const x = offsetX + data.time * scaleX;
      const y = offsetY - data.projectileB.y * scaleY;
      
      if (firstB) {
        ctx.moveTo(x, y);
        firstB = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Time (s)', width / 2, height - 10);
  
  ctx.save();
  ctx.translate(15, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Height (m)', 0, 0);
  ctx.restore();
};

ProjectileMotionSimulator.prototype.drawRangeComparisonChart = function() {
  if (!this.rangeCtx) return;
  
  const ctx = this.rangeCtx;
  const width = this.rangeCanvas.width;
  const height = this.rangeCanvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Get final ranges
  const range1 = this.trajectoryA.length > 0 ? this.trajectoryA[this.trajectoryA.length - 1].x : 0;
  const range2 = this.trajectoryB.length > 0 ? this.trajectoryB[this.trajectoryB.length - 1].x : 0;
  
  const maxRange = Math.max(range1, range2, 1);
  const barWidth = 60;
  const barSpacing = 100;
  const startX = (width - 2 * barWidth - barSpacing) / 2;
  const maxBarHeight = height - 80;
  
  // Draw axes
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, height - 40);
  ctx.lineTo(width - 20, height - 40);
  ctx.stroke();
  
  // Draw bar for projectile 1
  const height1 = (range1 / maxRange) * maxBarHeight;
  ctx.fillStyle = '#e63946';
  ctx.fillRect(startX, height - 40 - height1, barWidth, height1);
  
  // Draw bar for projectile 2
  const height2 = (range2 / maxRange) * maxBarHeight;
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(startX + barWidth + barSpacing, height - 40 - height2, barWidth, height2);
  
  // Labels
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  
  // Projectile 1 label
  ctx.fillText('Projectile 1', startX + barWidth/2, height - 20);
  ctx.fillText(`${range1.toFixed(1)}m`, startX + barWidth/2, height - 40 - height1 - 10);
  
  // Projectile 2 label
  ctx.fillText('Projectile 2', startX + barWidth + barSpacing + barWidth/2, height - 20);
  ctx.fillText(`${range2.toFixed(1)}m`, startX + barWidth + barSpacing + barWidth/2, height - 40 - height2 - 10);
  
  // Title
  ctx.font = '14px Arial';
  ctx.fillText('Range Comparison', width / 2, 20);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('projectileCanvas')) {
    window.projectileSimulator = new ProjectileMotionSimulator();
  }
});