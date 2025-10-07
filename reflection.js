// Reflection of Light Simulator
class ReflectionSimulator {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.surfaceType = 'smooth';
        this.angleOfIncidence = 30;
        this.angleOfReflection = 30;
        this.incidentRayColor = '#ff4444';
        this.reflectedRayColor = '#4444ff';
        this.normalColor = '#44ff44';
        this.isDragging = false;
        this.dragPoint = null;
        this.rays = [
            {
                id: 1,
                incident: { x: 100, y: 200 },
                reflected: { x: 300, y: 200 },
                color: '#ff4444',
                active: true
            }
        ];
        this.surfaceCenter = { x: 200, y: 200 };
        this.surfaceWidth = 200;
        this.surfaceHeight = 20;
        this.zoomLevel = 1;
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.updateInfoPanel();
        this.draw();
    }

    initializeCanvas() {
        // Set canvas to fixed dimensions as specified
        this.canvas.width = 900;
        this.canvas.height = 550;
        
        // Set canvas style
        this.canvas.style.border = '2px dashed #ce93d8';
        this.canvas.style.borderRadius = '14px';
        this.canvas.style.backgroundColor = '#f3f7ff';
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
        this.canvas.style.maxHeight = '550px';
        
        // Center the surface in the canvas
        this.surfaceCenter = { 
            x: this.canvas.width / 2, 
            y: this.canvas.height / 2 
        };
        
        // Update ray positions for the new center
        this.updateRayPositions();
    }

    setupEventListeners() {
        // Surface type selector
        const surfaceSelect = document.getElementById('surfaceType');
        if (surfaceSelect) {
            surfaceSelect.addEventListener('change', (e) => {
                this.surfaceType = e.target.value;
                this.updateInfoPanel();
                this.draw();
            });
        }

        // Angle sliders - both should move together
        const incidenceSlider = document.getElementById('incidenceAngle');
        const reflectionSlider = document.getElementById('reflectionAngle');
        
        if (incidenceSlider) {
            incidenceSlider.addEventListener('input', (e) => {
                this.angleOfIncidence = parseInt(e.target.value);
                this.angleOfReflection = this.angleOfIncidence; // Law of reflection
                // Update the reflection slider to match
                if (reflectionSlider) {
                    reflectionSlider.value = this.angleOfReflection;
                }
                this.updateAngleDisplays();
                this.updateRayPositions();
                this.updateInfoPanel();
                this.draw();
            });
        }

        if (reflectionSlider) {
            reflectionSlider.addEventListener('input', (e) => {
                this.angleOfReflection = parseInt(e.target.value);
                this.angleOfIncidence = this.angleOfReflection; // Law of reflection
                // Update the incidence slider to match
                if (incidenceSlider) {
                    incidenceSlider.value = this.angleOfIncidence;
                }
                this.updateAngleDisplays();
                this.updateRayPositions();
                this.updateInfoPanel();
                this.draw();
            });
        }

        // Color pickers
        const incidentColorPicker = document.getElementById('incidentColor');
        const reflectedColorPicker = document.getElementById('reflectedColor');
        
        if (incidentColorPicker) {
            incidentColorPicker.addEventListener('change', (e) => {
                this.incidentRayColor = e.target.value;
                this.rays[0].color = e.target.value;
                this.draw();
            });
        }

        if (reflectedColorPicker) {
            reflectedColorPicker.addEventListener('change', (e) => {
                this.reflectedRayColor = e.target.value;
                this.draw();
            });
        }

        // Multiple rays controls
        const addRayBtn = document.getElementById('addRay');
        const removeRayBtn = document.getElementById('removeRay');
        const resetRaysBtn = document.getElementById('resetRays');
        
        if (addRayBtn) {
            addRayBtn.addEventListener('click', () => this.addRay());
        }
        
        if (removeRayBtn) {
            removeRayBtn.addEventListener('click', () => this.removeRay());
        }
        
        if (resetRaysBtn) {
            resetRaysBtn.addEventListener('click', () => this.resetRays());
        }

        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());
    }

    updateAngleDisplays() {
        const incidenceDisplay = document.getElementById('incidenceDisplay');
        const reflectionDisplay = document.getElementById('reflectionDisplay');
        
        if (incidenceDisplay) {
            incidenceDisplay.textContent = this.angleOfIncidence;
        }
        
        if (reflectionDisplay) {
            reflectionDisplay.textContent = this.angleOfReflection;
        }
    }

    addRay() {
        if (this.rays.length >= 5) return; // Limit to 5 rays
        
        const newRayId = this.rays.length + 1;
        const angleOffset = (newRayId - 1) * 10; // Spread rays out
        
        this.rays.push({
            id: newRayId,
            incident: { 
                x: this.surfaceCenter.x - 100 * Math.cos((this.angleOfIncidence + angleOffset) * Math.PI / 180),
                y: this.surfaceCenter.y - 100 * Math.sin((this.angleOfIncidence + angleOffset) * Math.PI / 180)
            },
            reflected: { 
                x: this.surfaceCenter.x + 100 * Math.cos((this.angleOfIncidence + angleOffset) * Math.PI / 180),
                y: this.surfaceCenter.y - 100 * Math.sin((this.angleOfIncidence + angleOffset) * Math.PI / 180)
            },
            color: this.getRandomColor(),
            active: true
        });
        
        this.updateRayCount();
        this.draw();
    }

    removeRay() {
        if (this.rays.length > 1) {
            this.rays.pop();
            this.updateRayCount();
            this.draw();
        }
    }

    resetRays() {
        this.rays = [{
            id: 1,
            incident: { x: 100, y: 200 },
            reflected: { x: 300, y: 200 },
            color: this.incidentRayColor,
            active: true
        }];
        this.updateRayPositions();
        this.updateRayCount();
        this.draw();
    }

    getRandomColor() {
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // Check each ray's endpoints
        for (let i = 0; i < this.rays.length; i++) {
            const ray = this.rays[i];
            
            // Check incident ray endpoint
            const incidentDist = Math.sqrt(
                Math.pow(x - ray.incident.x, 2) + 
                Math.pow(y - ray.incident.y, 2)
            );
            
            if (incidentDist < 20) {
                this.isDragging = true;
                this.dragPoint = { rayIndex: i, type: 'incident' };
                return;
            }
            
            // Check reflected ray endpoint
            const reflectedDist = Math.sqrt(
                Math.pow(x - ray.reflected.x, 2) + 
                Math.pow(y - ray.reflected.y, 2)
            );
            
            if (reflectedDist < 20) {
                this.isDragging = true;
                this.dragPoint = { rayIndex: i, type: 'reflected' };
                return;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        const ray = this.rays[this.dragPoint.rayIndex];
        
        if (this.dragPoint.type === 'incident') {
            // Update incident ray endpoint
            ray.incident.x = Math.max(50, Math.min(x, this.canvas.width - 50));
            ray.incident.y = Math.max(50, Math.min(y, this.canvas.height - 50));
            
            // Calculate new angle from incident ray position
            const dx = this.surfaceCenter.x - ray.incident.x;
            const dy = this.surfaceCenter.y - ray.incident.y;
            const newAngle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
            
            // Update angles
            this.angleOfIncidence = Math.min(89, Math.max(1, newAngle));
            this.angleOfReflection = this.angleOfIncidence; // Law of reflection
            
            // Update reflected ray endpoint based on new angle
            const angleRad = this.angleOfIncidence * Math.PI / 180;
            const rayLength = 120;
            ray.reflected.x = this.surfaceCenter.x + rayLength * Math.cos(angleRad);
            ray.reflected.y = this.surfaceCenter.y - rayLength * Math.sin(angleRad);
            
        } else if (this.dragPoint.type === 'reflected') {
            // Update reflected ray endpoint
            ray.reflected.x = Math.max(50, Math.min(x, this.canvas.width - 50));
            ray.reflected.y = Math.max(50, Math.min(y, this.canvas.height - 50));
            
            // Calculate new angle from reflected ray position
            const dx = ray.reflected.x - this.surfaceCenter.x;
            const dy = this.surfaceCenter.y - ray.reflected.y;
            const newAngle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
            
            // Update angles
            this.angleOfReflection = Math.min(89, Math.max(1, newAngle));
            this.angleOfIncidence = this.angleOfReflection; // Law of reflection
            
            // Update incident ray endpoint based on new angle
            const angleRad = this.angleOfIncidence * Math.PI / 180;
            const rayLength = 120;
            ray.incident.x = this.surfaceCenter.x - rayLength * Math.cos(angleRad);
            ray.incident.y = this.surfaceCenter.y - rayLength * Math.sin(angleRad);
        }
        
        // Update sliders to match the new angles
        const incidenceSlider = document.getElementById('incidenceAngle');
        const reflectionSlider = document.getElementById('reflectionAngle');
        
        if (incidenceSlider) incidenceSlider.value = this.angleOfIncidence;
        if (reflectionSlider) reflectionSlider.value = this.angleOfReflection;
        
        this.updateAngleDisplays();
        this.updateInfoPanel();
        this.draw();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.dragPoint = null;
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp();
    }

    updateAnglesFromPositions() {
        // Calculate angle for the first ray (main ray)
        const ray = this.rays[0];
        const dx = this.surfaceCenter.x - ray.incident.x;
        const dy = this.surfaceCenter.y - ray.incident.y;
        const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
        
        this.angleOfIncidence = Math.min(89, Math.max(1, angle));
        this.angleOfReflection = this.angleOfIncidence; // Law of reflection
        
        // Update sliders
        const incidenceSlider = document.getElementById('incidenceAngle');
        const reflectionSlider = document.getElementById('reflectionAngle');
        
        if (incidenceSlider) incidenceSlider.value = this.angleOfIncidence;
        if (reflectionSlider) reflectionSlider.value = this.angleOfReflection;
        
        this.updateAngleDisplays();
    }

    updateRayPositions() {
        const angleRad = this.angleOfIncidence * Math.PI / 180;
        const rayLength = 120;
        
        // Update main ray positions based on angle
        this.rays[0].incident.x = this.surfaceCenter.x - rayLength * Math.cos(angleRad);
        this.rays[0].incident.y = this.surfaceCenter.y - rayLength * Math.sin(angleRad);
        
        this.rays[0].reflected.x = this.surfaceCenter.x + rayLength * Math.cos(angleRad);
        this.rays[0].reflected.y = this.surfaceCenter.y - rayLength * Math.sin(angleRad);
        
        // Update additional rays
        for (let i = 1; i < this.rays.length; i++) {
            const angleOffset = i * 10;
            const totalAngle = (this.angleOfIncidence + angleOffset) * Math.PI / 180;
            
            this.rays[i].incident.x = this.surfaceCenter.x - rayLength * Math.cos(totalAngle);
            this.rays[i].incident.y = this.surfaceCenter.y - rayLength * Math.sin(totalAngle);
            
            this.rays[i].reflected.x = this.surfaceCenter.x + rayLength * Math.cos(totalAngle);
            this.rays[i].reflected.y = this.surfaceCenter.y - rayLength * Math.sin(totalAngle);
        }
    }

    drawSurface() {
        this.ctx.save();
        
        switch (this.surfaceType) {
            case 'smooth':
                this.drawSmoothSurface();
                break;
            case 'rough':
                this.drawRoughSurface();
                break;
            case 'semi-matte':
                this.drawSemiMatteSurface();
                break;
            case 'concave':
                this.drawConcaveSurface();
                break;
            case 'convex':
                this.drawConvexSurface();
                break;
        }
        
        this.ctx.restore();
    }

    drawSmoothSurface() {
        // Smooth reflective surface
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillRect(
            this.surfaceCenter.x - this.surfaceWidth/2,
            this.surfaceCenter.y - this.surfaceHeight/2,
            this.surfaceWidth,
            this.surfaceHeight
        );
        
        // Add shine effect
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.surfaceCenter.x - this.surfaceWidth/2, this.surfaceCenter.y - this.surfaceHeight/2);
        this.ctx.lineTo(this.surfaceCenter.x + this.surfaceWidth/2, this.surfaceCenter.y - this.surfaceHeight/2);
        this.ctx.stroke();
    }

    drawRoughSurface() {
        // Rough surface
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(
            this.surfaceCenter.x - this.surfaceWidth/2,
            this.surfaceCenter.y - this.surfaceHeight/2,
            this.surfaceWidth,
            this.surfaceHeight
        );
        
        // Add roughness texture
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const x = this.surfaceCenter.x - this.surfaceWidth/2 + Math.random() * this.surfaceWidth;
            const y = this.surfaceCenter.y - this.surfaceHeight/2 + Math.random() * this.surfaceHeight;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.random() * 10 - 5, y + Math.random() * 10 - 5);
            this.ctx.stroke();
        }
    }

    drawSemiMatteSurface() {
        // Semi-matte surface
        this.ctx.fillStyle = '#d0d0d0';
        this.ctx.fillRect(
            this.surfaceCenter.x - this.surfaceWidth/2,
            this.surfaceCenter.y - this.surfaceHeight/2,
            this.surfaceWidth,
            this.surfaceHeight
        );
        
        // Add subtle texture
        this.ctx.strokeStyle = '#b0b0b0';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const x = this.surfaceCenter.x - this.surfaceWidth/2 + i * 20;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.surfaceCenter.y - this.surfaceHeight/2);
            this.ctx.lineTo(x, this.surfaceCenter.y + this.surfaceHeight/2);
            this.ctx.stroke();
        }
    }

    drawConcaveSurface() {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2 + 150;
        const cy = this.canvas.height / 2;
        const radius = 160;

        // Mirror arc
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 3, Math.PI / 3, false);
        ctx.stroke();

        // Principal axis
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(this.canvas.width, cy);
        ctx.stroke();

        // Focal point (F) and center of curvature (C)
        const F = { x: cx - radius / 2, y: cy };
        const C = { x: cx - radius, y: cy };

        ctx.fillStyle = '#ffff00';
        ctx.beginPath(); ctx.arc(F.x, F.y, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(C.x, C.y, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('F', F.x - 15, F.y - 8);
        ctx.fillText('C', C.x - 15, C.y - 8);

        // Object (arrow)
        const objX = cx - radius - 40;
        const objY = cy;
        const objHeight = -70;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(objX, objY);
        ctx.lineTo(objX, objY + objHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(objX - 6, objY + objHeight + 10);
        ctx.lineTo(objX, objY + objHeight);
        ctx.lineTo(objX + 6, objY + objHeight + 10);
        ctx.stroke();

        // Ray 1: Parallel → through F
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(objX, objY + objHeight);
        ctx.lineTo(cx, objY + objHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, objY + objHeight);
        ctx.lineTo(F.x, F.y);
        ctx.stroke();

        // Ray 2: Through F → reflects parallel
        ctx.beginPath();
        ctx.moveTo(objX, objY + objHeight);
        ctx.lineTo(F.x, F.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(F.x, F.y);
        ctx.lineTo(cx, cy + objHeight);
        ctx.stroke();
    }

    drawConvexSurface() {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2 + 150;
        const cy = this.canvas.height / 2;
        const radius = 120;

        // Mirror arc
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI / 3, -Math.PI / 3, true);
        ctx.stroke();

        // Principal axis
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(this.canvas.width, cy);
        ctx.stroke();

        // Virtual focal point (F) and center (C)
        const F = { x: cx + radius / 2, y: cy };
        const C = { x: cx + radius, y: cy };

        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#ffff00';
        ctx.beginPath(); ctx.arc(F.x, F.y, 4, 0, 2 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(C.x, C.y, 4, 0, 2 * Math.PI); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('F', F.x + 8, F.y - 8);
        ctx.fillText('C', C.x + 8, C.y - 8);

        // Object (arrow)
        const objX = cx - radius - 50;
        const objY = cy;
        const objHeight = -60;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(objX, objY);
        ctx.lineTo(objX, objY + objHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(objX - 6, objY + objHeight + 10);
        ctx.lineTo(objX, objY + objHeight);
        ctx.lineTo(objX + 6, objY + objHeight + 10);
        ctx.stroke();

        // Ray 1: Parallel → reflects as if from F
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(objX, objY + objHeight);
        ctx.lineTo(cx, objY + objHeight);
        ctx.stroke();

        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, objY + objHeight);
        ctx.lineTo(F.x, F.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ray 2: Aimed toward F → reflects parallel
        ctx.beginPath();
        ctx.moveTo(objX, objY + objHeight);
        ctx.lineTo(F.x, F.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 140, cy);
        ctx.stroke();
    }

    drawRays() {
        // Draw normal line
        this.ctx.strokeStyle = this.normalColor;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.surfaceCenter.x, this.surfaceCenter.y - 100);
        this.ctx.lineTo(this.surfaceCenter.x, this.surfaceCenter.y + 100);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw all rays
        this.rays.forEach((ray, index) => {
            if (!ray.active) return;
            
            // Draw incident ray
            this.ctx.strokeStyle = ray.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(ray.incident.x, ray.incident.y);
            this.ctx.lineTo(this.surfaceCenter.x, this.surfaceCenter.y);
            this.ctx.stroke();
            
            // Draw reflected ray
            this.ctx.strokeStyle = this.reflectedRayColor;
            this.ctx.beginPath();
            this.ctx.moveTo(this.surfaceCenter.x, this.surfaceCenter.y);
            this.ctx.lineTo(ray.reflected.x, ray.reflected.y);
            this.ctx.stroke();
            
            // Draw ray endpoints
            this.drawRayEndpoint(ray.incident, ray.color, index);
            this.drawRayEndpoint(ray.reflected, this.reflectedRayColor, index);
        });
    }

    drawRayEndpoint(point, color, index = 0) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawAngles() {
        const angleRad = this.angleOfIncidence * Math.PI / 180;
        const radius = 40;
        
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 2;
        
        // Incidence angle arc
        this.ctx.beginPath();
        this.ctx.arc(this.surfaceCenter.x, this.surfaceCenter.y, radius, -Math.PI/2, -Math.PI/2 + angleRad);
        this.ctx.stroke();
        
        // Reflection angle arc
        this.ctx.beginPath();
        this.ctx.arc(this.surfaceCenter.x, this.surfaceCenter.y, radius, -Math.PI/2, -Math.PI/2 - angleRad);
        this.ctx.stroke();
        
        // Angle labels positioned above the rays like in example images
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        
        // Calculate positions for labels above the rays
        const rayLength = 120;
        
        // Incidence angle label - positioned above the incident ray
        const incidentRayEndX = this.surfaceCenter.x - rayLength * Math.cos(angleRad);
        const incidentRayEndY = this.surfaceCenter.y - rayLength * Math.sin(angleRad);
        const incidenceLabelX = incidentRayEndX;
        const incidenceLabelY = incidentRayEndY - 20; // 20 pixels above the ray
        this.ctx.fillText(`${this.angleOfIncidence.toFixed(1)}°`, incidenceLabelX, incidenceLabelY);
        
        // Reflection angle label - positioned above the reflected ray
        const reflectedRayEndX = this.surfaceCenter.x + rayLength * Math.cos(angleRad);
        const reflectedRayEndY = this.surfaceCenter.y - rayLength * Math.sin(angleRad);
        const reflectionLabelX = reflectedRayEndX;
        const reflectionLabelY = reflectedRayEndY - 20; // 20 pixels above the ray
        this.ctx.fillText(`${this.angleOfReflection.toFixed(1)}°`, reflectionLabelX, reflectionLabelY);
    }

    updateInfoPanel() {
        const surfaceInfo = document.getElementById('surfaceInfo');
        const angleInfo = document.getElementById('angleInfo');
        const imageInfo = document.getElementById('imageInfo');
        const rayCountInfo = document.getElementById('rayCountInfo');
        
        if (surfaceInfo) {
            surfaceInfo.textContent = this.getSurfaceDescription();
        }
        
        if (angleInfo) {
            angleInfo.textContent = `Angle of Incidence: ${this.angleOfIncidence.toFixed(1)}° | Angle of Reflection: ${this.angleOfReflection.toFixed(1)}°`;
        }
        
        if (imageInfo) {
            imageInfo.textContent = this.getImageDescription();
        }
        
        if (rayCountInfo) {
            rayCountInfo.textContent = `Active Rays: ${this.rays.filter(r => r.active).length}`;
        }
    }

    updateRayCount() {
        const rayCountInfo = document.getElementById('rayCountInfo');
        if (rayCountInfo) {
            rayCountInfo.textContent = `Active Rays: ${this.rays.filter(r => r.active).length}`;
        }
    }

    getSurfaceDescription() {
        const descriptions = {
            'smooth': 'Smooth Reflective Surface - Perfect reflection',
            'rough': 'Rough Surface - Diffuse reflection',
            'semi-matte': 'Semi-Matte Surface - Partial reflection',
            'concave': 'Concave Mirror - Converging reflection',
            'convex': 'Convex Mirror - Diverging reflection'
        };
        return descriptions[this.surfaceType] || 'Unknown surface';
    }

    getImageDescription() {
        const descriptions = {
            'smooth': 'Virtual and upright image',
            'rough': 'No clear image formed (diffuse reflection)',
            'semi-matte': 'Faint virtual image',
            'concave': 'Virtual and upright image (when object is close)',
            'convex': 'Virtual and upright image (always)'
        };
        return descriptions[this.surfaceType] || 'No image description available';
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw surface
        this.drawSurface();
        
        // Draw rays and angles (only for non-mirror surfaces)
        if (this.surfaceType !== 'concave' && this.surfaceType !== 'convex') {
            this.drawRays();
            this.drawAngles();
        }
    }

    reset() {
        this.angleOfIncidence = 30;
        this.angleOfReflection = 30;
        this.zoomLevel = 1;
        this.resetRays();
        this.updateAngleDisplays();
        this.updateInfoPanel();
        this.draw();
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
        }, 100);
    }

    resizeCanvas() {
        const canvasContainer = this.canvas.parentElement;
        const newWidth = canvasContainer.clientWidth - 40;
        const newHeight = canvasContainer.clientHeight - 40;
        
        if (newWidth !== this.canvas.width || newHeight !== this.canvas.height) {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight; // Use full container height
            
            // Update surface center
            this.surfaceCenter = { 
                x: this.canvas.width / 2, 
                y: this.canvas.height / 2 
            };
            
            // Update ray positions for new canvas size
            this.updateRayPositions();
        }
    }
}

// Initialize simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the reflection page
    if (document.getElementById('reflection') && document.getElementById('simulationCanvas')) {
        window.reflectionSimulator = new ReflectionSimulator();
    }
});

// Dark mode toggle for reflection simulator
document.addEventListener('DOMContentLoaded', () => {
    const darkModeBtn = document.getElementById('reflectionDarkModeBtn');
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
});

// Canvas resize handler
window.addEventListener("resize", () => {
    if (window.reflectionSimulator) {
        window.reflectionSimulator.resizeCanvas();
    }
}); 