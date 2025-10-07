// Thermal Expansion Simulator
class ThermalExpansionSimulator {
    constructor() {
        this.canvas = document.getElementById('thermalCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Materials with coefficients of linear expansion (α) in 1/°C
        this.materials = {
            iron: { name: 'Iron', alpha: 12e-6, color: '#8B4513', density: 7870 },
            copper: { name: 'Copper', alpha: 17e-6, color: '#B87333', density: 8960 },
            aluminum: { name: 'Aluminum', alpha: 23e-6, color: '#C0C0C0', density: 2700 },
            brass: { name: 'Brass', alpha: 19e-6, color: '#CD7F32', density: 8500 },
            glass: { name: 'Glass', alpha: 9e-6, color: '#87CEEB', density: 2500 },
            steel: { name: 'Steel', alpha: 11e-6, color: '#708090', density: 7850 },
            gold: { name: 'Gold', alpha: 14e-6, color: '#FFD700', density: 19300 },
            silver: { name: 'Silver', alpha: 18e-6, color: '#C0C0C0', density: 10500 },
            zinc: { name: 'Zinc', alpha: 30e-6, color: '#F0E68C', density: 7140 },
            lead: { name: 'Lead', alpha: 29e-6, color: '#2F4F4F', density: 11340 }
        };
        
        // Simulation state
        this.currentMaterial = 'iron';
        this.expansionType = 'linear'; // linear, areal, volumetric
        this.initialTemp = 20; // °C
        this.currentTemp = 20; // °C
        this.targetTemp = 20; // °C
        this.isHeating = false;
        this.isCooling = false;
        this.isPaused = false;
        this.animationId = null;
        this.animationActive = false;
        this.lastFrameTime = 0;
        this.tempAnimationSpeed = 80; // degrees C per second towards target
        this.lastGraphUpdateAt = 0;
        
        // Object dimensions
        this.initialLength = 100; // mm
        this.initialArea = 10000; // mm²
        this.initialVolume = 1000000; // mm³
        
        // Comparison mode
        this.comparisonMode = false;
        this.material1 = 'iron';
        this.material2 = 'copper';
        
        // Graph data
        this.graphData = [];
        this.graphData1 = [];
        this.graphData2 = [];
        this.maxDataPoints = 50;
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.updateUI();
        this.updateGraphWrappers();
        this.draw();
    }
    
    initializeCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 500;
        this.canvas.style.border = '2px dashed #ce93d8';
        this.canvas.style.borderRadius = '14px';
        this.canvas.style.backgroundColor = '#f3f7ff';
    }
    
    setupEventListeners() {
        // Material selection
        const materialSelect = document.getElementById('materialSelect');
        if (materialSelect) {
            materialSelect.addEventListener('change', (e) => {
                this.currentMaterial = e.target.value;
                this.updateUI();
                this.draw();
            });
        }
        
        // Expansion type
        const expansionTypeRadios = document.querySelectorAll('input[name="expansionType"]');
        expansionTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.expansionType = e.target.value;
                this.updateUI();
                this.draw();
            });
        });
        
        // Temperature slider
        const tempSlider = document.getElementById('tempSlider');
        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                this.targetTemp = parseInt(e.target.value);
                // Start smooth animation towards slider value
                if (!this.animationActive) this.startAnimationLoop();
            });
        }
        
        // Heating/Cooling buttons
        const heatBtn = document.getElementById('heatBtn');
        const coolBtn = document.getElementById('coolBtn');
        const resetBtn = document.getElementById('resetBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (heatBtn) {
            heatBtn.addEventListener('click', () => this.startHeating());
        }
        if (coolBtn) {
            coolBtn.addEventListener('click', () => this.startCooling());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        
        // Initial dimensions inputs
        const lengthInput = document.getElementById('initialLength');
        const areaInput = document.getElementById('initialArea');
        const volumeInput = document.getElementById('initialVolume');
        
        if (lengthInput) {
            lengthInput.addEventListener('input', (e) => {
                this.initialLength = parseFloat(e.target.value);
                this.updateUI();
                this.draw();
            });
        }
        if (areaInput) {
            areaInput.addEventListener('input', (e) => {
                this.initialArea = parseFloat(e.target.value);
                this.updateUI();
                this.draw();
            });
        }
        if (volumeInput) {
            volumeInput.addEventListener('input', (e) => {
                this.initialVolume = parseFloat(e.target.value);
                this.updateUI();
                this.draw();
            });
        }
        
        // Comparison mode toggle
        const compareToggle = document.getElementById('compareToggle');
        if (compareToggle) {
            compareToggle.addEventListener('change', (e) => {
                this.comparisonMode = e.target.checked;
                this.updateUI();
                this.draw();
                
                // Show/hide comparison controls and results
                const comparisonControls = document.getElementById('comparisonControls');
                const comparisonResults = document.getElementById('comparisonResults');
                
                if (comparisonControls) {
                    comparisonControls.style.display = this.comparisonMode ? 'block' : 'none';
                }
                if (comparisonResults) {
                    comparisonResults.style.display = this.comparisonMode ? 'block' : 'none';
                }
                // Toggle graph wrappers and clear data appropriately
                this.updateGraphWrappers();
                this.clearGraphData();
            });
        }
        
        // Material comparison selects
        const material1Select = document.getElementById('material1Select');
        const material2Select = document.getElementById('material2Select');
        
        if (material1Select) {
            material1Select.addEventListener('change', (e) => {
                this.material1 = e.target.value;
                this.updateUI();
                this.draw();
            });
        }
        if (material2Select) {
            material2Select.addEventListener('change', (e) => {
                this.material2 = e.target.value;
                this.updateUI();
                this.draw();
            });
        }
        
        // Initialize material selections
        if (material1Select) material1Select.value = this.material1;
        if (material2Select) material2Select.value = this.material2;
        
        // Dark mode toggle
        const darkModeBtn = document.getElementById('thermalDarkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                if (document.body.classList.contains('dark-mode')) {
                    darkModeBtn.textContent = 'Switch to Light Mode';
                } else {
                    darkModeBtn.textContent = 'Switch to Dark Mode';
                }
            });
        }

        // Direct temperature set
        const setTempBtn = document.getElementById('setTempBtn');
        const tempInput = document.getElementById('tempInput');
        if (setTempBtn && tempInput) {
            setTempBtn.addEventListener('click', () => {
                const v = parseFloat(tempInput.value);
                if (isNaN(v)) return;
                const clamped = Math.max(-50, Math.min(500, v));
                this.targetTemp = clamped;
                this.startAnimationLoop();
            });
        }
    }
    
    startHeating() {
        this.isHeating = true;
        this.isCooling = false;
        this.isPaused = false;
        // Push target upward gradually; let user slider set absolute. Here we bump target by 50C
        this.targetTemp = Math.min(500, this.targetTemp + 50);
        this.startAnimationLoop();
    }
    
    startCooling() {
        this.isCooling = true;
        this.isHeating = false;
        this.isPaused = false;
        this.targetTemp = Math.max(-50, this.targetTemp - 50);
        this.startAnimationLoop();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        if (btn) btn.textContent = this.isPaused ? 'Resume' : 'Pause';
        if (!this.isPaused && this.animationActive) {
            // resume loop
            this.startAnimationLoop();
        }
    }
    
    startAnimationLoop() {
        if (this.animationActive) return;
        this.animationActive = true;
        this.lastFrameTime = performance.now();

        const step = (now) => {
            const dt = (now - this.lastFrameTime) / 1000; // seconds
            this.lastFrameTime = now;

            if (!this.isPaused) {
                // If heating/cooling buttons are active, nudge target continuously
                if (this.isHeating) this.targetTemp = Math.min(500, this.targetTemp + this.tempAnimationSpeed * dt * 0.1);
                if (this.isCooling) this.targetTemp = Math.max(-50, this.targetTemp - this.tempAnimationSpeed * dt * 0.1);

                // Move currentTemp smoothly toward targetTemp
                const diff = this.targetTemp - this.currentTemp;
                const direction = Math.sign(diff);
                const delta = Math.min(Math.abs(diff), this.tempAnimationSpeed * dt);
                this.currentTemp += direction * delta;
                // Clamp
                if (Math.abs(this.currentTemp - this.targetTemp) < 0.01) this.currentTemp = this.targetTemp;

                // Reflect current temperature on slider
                const slider = document.getElementById('tempSlider');
                if (slider) slider.value = String(Math.round(this.currentTemp));

                // Throttled graph update
                const tnow = now;
                if (tnow - this.lastGraphUpdateAt > 80) { // ~12.5fps for graph
                    this.updateGraphData();
                    this.lastGraphUpdateAt = tnow;
                }
            }

            // UI redraw every frame for smooth animation
            this.updateUI();
            this.draw();

            // Stop conditions: no movement and not heating/cooling
            const still = Math.abs(this.targetTemp - this.currentTemp) < 0.01;
            if (still && !this.isHeating && !this.isCooling) {
                this.animationActive = false;
                this.animationId = null;
                return;
            }
            this.animationId = requestAnimationFrame(step);
        };

        this.animationId = requestAnimationFrame(step);
    }
    
    reset() {
        this.currentTemp = this.initialTemp;
        this.targetTemp = this.initialTemp;
        this.isHeating = false;
        this.isCooling = false;
        this.isPaused = false;
        this.graphData = [];
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.animationActive = false;
        
        this.updateUI();
        this.draw();
    }
    
    calculateExpansion(material, initialValue, tempDiff, expansionType) {
        const alpha = this.materials[material].alpha;
        let expansion;
        
        switch (expansionType) {
            case 'linear':
                expansion = initialValue * alpha * tempDiff;
                break;
            case 'areal':
                expansion = initialValue * 2 * alpha * tempDiff;
                break;
            case 'volumetric':
                expansion = initialValue * 3 * alpha * tempDiff;
                break;
            default:
                expansion = 0;
        }
        
        return expansion;
    }
    
    getTemperatureColor(temp) {
        // Blue for cold, red for hot
        const normalizedTemp = (temp + 50) / 550; // Normalize -50 to 500°C
        const clampedTemp = Math.max(0, Math.min(1, normalizedTemp));
        
        const blue = Math.round(255 * (1 - clampedTemp));
        const red = Math.round(255 * clampedTemp);
        const green = Math.round(100 * (1 - clampedTemp));
        
        return `rgb(${red}, ${green}, ${blue})`;
    }
    
    updateGraphData() {
        const tempDiff = this.currentTemp - this.initialTemp;
        if (this.comparisonMode) {
            const exp1 = this.calculateExpansion(this.material1, this.getInitialValue(), tempDiff, this.expansionType);
            const exp2 = this.calculateExpansion(this.material2, this.getInitialValue(), tempDiff, this.expansionType);
            this.graphData1.push({ temp: this.currentTemp, expansion: exp1 });
            this.graphData2.push({ temp: this.currentTemp, expansion: exp2 });
            if (this.graphData1.length > this.maxDataPoints) this.graphData1.shift();
            if (this.graphData2.length > this.maxDataPoints) this.graphData2.shift();
        } else {
            // In non-comparison mode, do not collect graph data
            return;
        }
    }
    
    getInitialValue() {
        switch (this.expansionType) {
            case 'linear':
                return this.initialLength;
            case 'areal':
                return this.initialArea;
            case 'volumetric':
                return this.initialVolume;
            default:
                return this.initialLength;
        }
    }
    
    updateUI() {
        const tempDiff = this.currentTemp - this.initialTemp;
        const expansion = this.calculateExpansion(
            this.currentMaterial,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        
        // Update temperature display
        const tempDisplay = document.getElementById('tempDisplay');
        if (tempDisplay) {
            tempDisplay.textContent = `${this.currentTemp}°C`;
        }
        
        // Update temperature display in data panel
        const tempDisplay2 = document.getElementById('tempDisplay2');
        if (tempDisplay2) {
            tempDisplay2.textContent = `${this.currentTemp}°C`;
        }
        
        // Update expansion display
        const expansionDisplay = document.getElementById('expansionDisplay');
        if (expansionDisplay) {
            const unit = this.expansionType === 'linear' ? 'mm' : 
                        this.expansionType === 'areal' ? 'mm²' : 'mm³';
            expansionDisplay.textContent = `${expansion.toFixed(3)} ${unit}`;
        }
        
        // Update material display
        const materialDisplay = document.getElementById('materialDisplay');
        if (materialDisplay) {
            materialDisplay.textContent = this.materials[this.currentMaterial].name;
        }
        
        // Update alpha display
        const alphaDisplay = document.getElementById('alphaDisplay');
        if (alphaDisplay) {
            const alpha = this.materials[this.currentMaterial].alpha;
            alphaDisplay.textContent = `${(alpha * 1e6).toFixed(1)}×10⁻⁶ /°C`;
        }
        
        // Update formula display
        this.updateFormulaDisplay();
        
        // Update comparison displays
        if (this.comparisonMode) {
            this.updateComparisonDisplays();
            // Update compare graph labels
            const m1 = this.materials[this.material1];
            const m2 = this.materials[this.material2];
            const mat1El = document.getElementById('graphMat1');
            const mat2El = document.getElementById('graphMat2');
            const a1El = document.getElementById('graphAlpha1');
            const a2El = document.getElementById('graphAlpha2');
            if (mat1El) mat1El.textContent = m1.name;
            if (mat2El) mat2El.textContent = m2.name;
            if (a1El) a1El.textContent = `${(m1.alpha * 1e6).toFixed(1)}×10⁻⁶ /°C`;
            if (a2El) a2El.textContent = `${(m2.alpha * 1e6).toFixed(1)}×10⁻⁶ /°C`;

            // Hide single-material items and single formula; show comparison formulas
            const expItem = document.getElementById('dataItemExpansion');
            const matItem = document.getElementById('dataItemMaterial');
            const alphaItem = document.getElementById('dataItemAlpha');
            const compPanel = document.getElementById('comparisonFormulaPanel');
            const singleFormula = document.getElementById('singleFormulaPanel');
            if (expItem) expItem.style.display = 'none';
            if (matItem) matItem.style.display = 'none';
            if (alphaItem) alphaItem.style.display = 'none';
            if (compPanel) compPanel.style.display = 'block';
            if (singleFormula) singleFormula.style.display = 'none';

            // Update comparison formulas and results
            const compFormula1 = document.getElementById('compFormula1');
            const compFormula2 = document.getElementById('compFormula2');
            const compResult1 = document.getElementById('compResult1');
            const compResult2 = document.getElementById('compResult2');

            const tempDiff = this.currentTemp - this.initialTemp;
            const initialValue = this.getInitialValue();
            let baseSymbol = 'ΔL';
            let baseName = 'L₀';
            let factor = '';
            if (this.expansionType === 'areal') { baseSymbol = 'ΔA'; baseName = 'A₀'; factor = '2×'; }
            if (this.expansionType === 'volumetric') { baseSymbol = 'ΔV'; baseName = 'V₀'; factor = '3×'; }

            if (compFormula1) compFormula1.textContent = `${baseSymbol} = ${baseName} × ${factor}α × ΔT`;
            if (compFormula2) compFormula2.textContent = `${baseSymbol} = ${baseName} × ${factor}α × ΔT`;

            const res1 = `${initialValue} × ${factor}${(m1.alpha).toExponential(2)} × ${tempDiff}`;
            const res2 = `${initialValue} × ${factor}${(m2.alpha).toExponential(2)} × ${tempDiff}`;
            if (compResult1) compResult1.textContent = res1;
            if (compResult2) compResult2.textContent = res2;
        } else {
            // Show single-material items and single formula; hide comparison formulas in non-comparison mode
            const expItem = document.getElementById('dataItemExpansion');
            const matItem = document.getElementById('dataItemMaterial');
            const alphaItem = document.getElementById('dataItemAlpha');
            const compPanel = document.getElementById('comparisonFormulaPanel');
            const singleFormula = document.getElementById('singleFormulaPanel');
            if (expItem) expItem.style.display = '';
            if (matItem) matItem.style.display = '';
            if (alphaItem) alphaItem.style.display = '';
            if (compPanel) compPanel.style.display = 'none';
            if (singleFormula) singleFormula.style.display = '';
        }
        
        // Update graph
        this.drawGraph();
    }
    
    updateFormulaDisplay() {
        const tempDiff = this.currentTemp - this.initialTemp;
        const alpha = this.materials[this.currentMaterial].alpha;
        const initialValue = this.getInitialValue();
        
        let formula, result;
        
        switch (this.expansionType) {
            case 'linear':
                formula = `ΔL = L₀ × α × ΔT`;
                result = `${initialValue} × ${alpha.toExponential(2)} × ${tempDiff}`;
                break;
            case 'areal':
                formula = `ΔA = A₀ × 2α × ΔT`;
                result = `${initialValue} × 2 × ${alpha.toExponential(2)} × ${tempDiff}`;
                break;
            case 'volumetric':
                formula = `ΔV = V₀ × 3α × ΔT`;
                result = `${initialValue} × 3 × ${alpha.toExponential(2)} × ${tempDiff}`;
                break;
        }
        
        const formulaDisplay = document.getElementById('formulaDisplay');
        const resultDisplay = document.getElementById('resultDisplay');
        
        if (formulaDisplay) formulaDisplay.textContent = formula;
        if (resultDisplay) resultDisplay.textContent = result;
    }
    
    updateComparisonDisplays() {
        const tempDiff = this.currentTemp - this.initialTemp;
        
        const expansion1 = this.calculateExpansion(
            this.material1,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        
        const expansion2 = this.calculateExpansion(
            this.material2,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        
        const expansion1Display = document.getElementById('expansion1Display');
        const expansion2Display = document.getElementById('expansion2Display');
        const compMat1 = document.getElementById('compMat1');
        const compMat2 = document.getElementById('compMat2');
        const compAlpha1 = document.getElementById('compAlpha1');
        const compAlpha2 = document.getElementById('compAlpha2');
        
        if (expansion1Display) {
            const unit = this.expansionType === 'linear' ? 'mm' : 
                        this.expansionType === 'areal' ? 'mm²' : 'mm³';
            expansion1Display.textContent = `${expansion1.toFixed(3)} ${unit}`;
        }
        
        if (expansion2Display) {
            const unit = this.expansionType === 'linear' ? 'mm' : 
                        this.expansionType === 'areal' ? 'mm²' : 'mm³';
            expansion2Display.textContent = `${expansion2.toFixed(3)} ${unit}`;
        }

        // Update materials and coefficients in real time
        if (compMat1) compMat1.textContent = this.materials[this.material1].name;
        if (compMat2) compMat2.textContent = this.materials[this.material2].name;
        if (compAlpha1) compAlpha1.textContent = `${(this.materials[this.material1].alpha * 1e6).toFixed(1)}×10⁻⁶ /°C`;
        if (compAlpha2) compAlpha2.textContent = `${(this.materials[this.material2].alpha * 1e6).toFixed(1)}×10⁻⁶ /°C`;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.comparisonMode) {
            this.drawComparison();
        } else {
            this.drawSingleObject();
        }
        
        this.drawRuler();
        this.drawTemperatureIndicator();
    }
    
    drawSingleObject() {
        const tempDiff = this.currentTemp - this.initialTemp;
        const expansion = this.calculateExpansion(
            this.currentMaterial,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        
        const color = this.getTemperatureColor(this.currentTemp);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.ctx.save();
        switch (this.expansionType) {
            case 'linear':
                this.drawLinearObject(expansion, color, centerX, centerY);
                break;
            case 'areal':
                this.drawArealObject(expansion, color, centerX, centerY);
                break;
            case 'volumetric':
                this.drawVolumetricObject(expansion, color, centerX, centerY);
                break;
        }
        
        this.ctx.restore();
    }
    
    drawLinearObject(expansion, color, centerX, centerY) {
        if (centerX === undefined || centerY === undefined) {
            centerX = this.canvas.width / 2;
            centerY = this.canvas.height / 2;
        }
        const initialLength = this.initialLength;
        const finalLength = initialLength + expansion;
        
        // Draw initial length (dashed)
        this.ctx.strokeStyle = '#999';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - initialLength/2, centerY);
        this.ctx.lineTo(centerX + initialLength/2, centerY);
        this.ctx.stroke();
        
        // Draw final length (solid)
        this.ctx.strokeStyle = color;
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - finalLength/2, centerY);
        this.ctx.lineTo(centerX + finalLength/2, centerY);
        this.ctx.stroke();
        
        // Draw end caps
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(centerX - finalLength/2, centerY, 4, 0, 2 * Math.PI);
        this.ctx.arc(centerX + finalLength/2, centerY, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawArealObject(expansion, color, centerX, centerY) {
        if (centerX === undefined || centerY === undefined) {
            centerX = this.canvas.width / 2;
            centerY = this.canvas.height / 2;
        }
        const initialSize = Math.sqrt(this.initialArea);
        const finalSize = Math.sqrt(this.initialArea + expansion);
        
        // Draw initial area (dashed)
        this.ctx.strokeStyle = '#999';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            centerX - initialSize/2,
            centerY - initialSize/2,
            initialSize,
            initialSize
        );
        
        // Draw final area (solid)
        this.ctx.strokeStyle = color;
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
            centerX - finalSize/2,
            centerY - finalSize/2,
            finalSize,
            finalSize
        );
        
        // Fill with semi-transparent color
        this.ctx.fillStyle = color + '40';
        this.ctx.fillRect(
            centerX - finalSize/2,
            centerY - finalSize/2,
            finalSize,
            finalSize
        );
    }
    
    drawVolumetricObject(expansion, color, centerX, centerY) {
        if (centerX === undefined || centerY === undefined) {
            centerX = this.canvas.width / 2;
            centerY = this.canvas.height / 2;
        }
        const initialSize = Math.cbrt(this.initialVolume);
        const finalSize = Math.cbrt(this.initialVolume + expansion);
        
        // Draw initial cube (dashed)
        this.ctx.strokeStyle = '#999';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;
        this.drawCube(centerX, centerY, initialSize, false);
        
        // Draw final cube (solid)
        this.ctx.strokeStyle = color;
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 3;
        this.drawCube(centerX, centerY, finalSize, true, color);
    }
    
    drawCube(x, y, size, fill = false, color = '#000') {
        const halfSize = size / 2;
        
        // Front face
        this.ctx.beginPath();
        this.ctx.rect(x - halfSize, y - halfSize, size, size);
        if (fill) {
            this.ctx.fillStyle = color + '40';
            this.ctx.fill();
        }
        this.ctx.stroke();
        
        // Back face (offset)
        this.ctx.beginPath();
        this.ctx.rect(x - halfSize + 20, y - halfSize - 20, size, size);
        this.ctx.stroke();
        
        // Connecting lines
        this.ctx.beginPath();
        this.ctx.moveTo(x - halfSize, y - halfSize);
        this.ctx.lineTo(x - halfSize + 20, y - halfSize - 20);
        this.ctx.moveTo(x + halfSize, y - halfSize);
        this.ctx.lineTo(x + halfSize + 20, y - halfSize - 20);
        this.ctx.moveTo(x + halfSize, y + halfSize);
        this.ctx.lineTo(x + halfSize + 20, y + halfSize - 20);
        this.ctx.moveTo(x - halfSize, y + halfSize);
        this.ctx.lineTo(x - halfSize + 20, y + halfSize - 20);
        this.ctx.stroke();
    }
    
    drawComparison() {
        const tempDiff = this.currentTemp - this.initialTemp;
        const expansion1 = this.calculateExpansion(
            this.material1,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        const expansion2 = this.calculateExpansion(
            this.material2,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        
        const color1 = this.getTemperatureColor(this.currentTemp);
        const color2 = this.getTemperatureColor(this.currentTemp);

        const leftX = Math.round(this.canvas.width * 0.25);
        const rightX = Math.round(this.canvas.width * 0.75);
        const centerY = Math.round(this.canvas.height / 2);

        // Draw first object (left side)
        this.ctx.save();
        switch (this.expansionType) {
            case 'linear':
                this.drawLinearObject(expansion1, color1, leftX, centerY);
                break;
            case 'areal':
                this.drawArealObject(expansion1, color1, leftX, centerY);
                break;
            case 'volumetric':
                this.drawVolumetricObject(expansion1, color1, leftX, centerY);
                break;
        }
        
        // Draw material label
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.materials[this.material1].name, leftX, centerY + 140);
        
        this.ctx.restore();
        
        // Draw second object (right side)
        this.ctx.save();
        
        switch (this.expansionType) {
            case 'linear':
                this.drawLinearObject(expansion2, color2, rightX, centerY);
                break;
            case 'areal':
                this.drawArealObject(expansion2, color2, rightX, centerY);
                break;
            case 'volumetric':
                this.drawVolumetricObject(expansion2, color2, rightX, centerY);
                break;
        }
        
        // Draw material label
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.materials[this.material2].name, rightX, centerY + 140);
        
        this.ctx.restore();
    }
    
    drawRuler() {
        const centerY = this.canvas.height - 50;
        const startX = 50;
        const endX = this.canvas.width - 50;
        
        // Draw ruler line
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, centerY);
        this.ctx.lineTo(endX, centerY);
        this.ctx.stroke();
        
        // Draw tick marks
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const x = startX + (endX - startX) * i / 10;
            const tickHeight = i % 5 === 0 ? 15 : 8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, centerY - tickHeight);
            this.ctx.lineTo(x, centerY + tickHeight);
            this.ctx.stroke();
            
            // Draw labels for major ticks
            if (i % 5 === 0) {
                this.ctx.fillStyle = '#333';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${i * 10}`, x, centerY + 30);
            }
        }
    }
    
    drawTemperatureIndicator() {
        const tempDiff = this.currentTemp - this.initialTemp;
        const expansion = this.calculateExpansion(
            this.currentMaterial,
            this.getInitialValue(),
            tempDiff,
            this.expansionType
        );
        
        // Draw temperature indicator
        this.ctx.fillStyle = this.getTemperatureColor(this.currentTemp);
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.currentTemp}°C`, this.canvas.width / 2, 30);
        
        // Draw expansion indicator
        const unit = this.expansionType === 'linear' ? 'mm' : 
                    this.expansionType === 'areal' ? 'mm²' : 'mm³';
        this.ctx.fillStyle = '#333';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Expansion: ${expansion.toFixed(3)} ${unit}`, this.canvas.width / 2, 50);
    }
    
    drawGraph() {
        // Only render graphs in comparison mode
        const compareWrapper = document.getElementById('graphCompareWrapper');
        const singleWrapper = document.getElementById('graphSingleWrapper');
        if (singleWrapper) singleWrapper.style.display = 'none';
        if (compareWrapper) compareWrapper.style.display = this.comparisonMode ? 'block' : 'none';
        if (!this.comparisonMode) return;
        const c1 = document.getElementById('thermalGraph1');
        const c2 = document.getElementById('thermalGraph2');
        if (c1) this.drawGraphOnCanvas(c1, this.graphData1);
        if (c2) this.drawGraphOnCanvas(c2, this.graphData2);
    }

    updateGraphWrappers() {
        const graphSingle = document.getElementById('graphSingleWrapper');
        const graphCompare = document.getElementById('graphCompareWrapper');
        if (graphSingle) graphSingle.style.display = 'none';
        if (graphCompare) graphCompare.style.display = this.comparisonMode ? 'block' : 'none';
    }

    clearGraphData() {
        this.graphData = [];
        this.graphData1 = [];
        this.graphData2 = [];
    }

    drawGraphOnCanvas(graphCanvas, series) {
        if (!series || series.length < 2) return;
        const ctx = graphCanvas.getContext('2d');
        ctx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
        const temps = series.map(d => d.temp);
        const exps = series.map(d => d.expansion);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const minExp = Math.min(...exps);
        const maxExp = Math.max(...exps);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, graphCanvas.height - 50);
        ctx.lineTo(graphCanvas.width - 50, graphCanvas.height - 50);
        ctx.moveTo(50, 50);
        ctx.lineTo(50, graphCanvas.height - 50);
        ctx.stroke();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const x = 50 + (graphCanvas.width - 100) * i / 5;
            const y = 50 + (graphCanvas.height - 100) * i / 5;
            ctx.beginPath();
            ctx.moveTo(x, 50);
            ctx.lineTo(x, graphCanvas.height - 50);
            ctx.moveTo(50, y);
            ctx.lineTo(graphCanvas.width - 50, y);
            ctx.stroke();
        }
        ctx.strokeStyle = '#0072ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        series.forEach((point, i) => {
            const x = 50 + (graphCanvas.width - 100) * (point.temp - minTemp) / Math.max(1e-6, (maxTemp - minTemp));
            const y = graphCanvas.height - 50 - (graphCanvas.height - 100) * (point.expansion - minExp) / Math.max(1e-6, (maxExp - minExp));
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Temperature (°C)', graphCanvas.width / 2, graphCanvas.height - 10);
        ctx.save();
        ctx.translate(20, graphCanvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        const unit = this.expansionType === 'linear' ? 'ΔL (mm)' : this.expansionType === 'areal' ? 'ΔA (mm²)' : 'ΔV (mm³)';
        ctx.fillText(unit, 0, 0);
        ctx.restore();
    }
}

// Initialize simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('thermal') && document.getElementById('thermalCanvas')) {
        window.thermalSimulator = new ThermalExpansionSimulator();
    }
});
