// Medium data: refractive index and color
const mediums = {
  air:     { name: 'Air',     n: 1.000,  color: '#eaf6ff' },
  glass:   { name: 'Glass',   n: 1.516,  color: '#e0ffe0' },
  water:   { name: 'Water',   n: 1.330,  color: '#bdf4ff' },
  oil:     { name: 'Oil',     n: 1.470,  color: '#fff7bd' },
  diamond: { name: 'Diamond', n: 2.410,  color: '#dbe6ff' }
};

const angleSlider = document.getElementById('angleSlider');
const angleDisplay = document.getElementById('angleDisplay');
const medium1 = document.getElementById('medium1');
const medium2 = document.getElementById('medium2');
const n1Display = document.getElementById('n1Display');
const n2Display = document.getElementById('n2Display');
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Lamp position state
let isDraggingAngle = false;

function getLampPosForAngle(angleDeg) {
  // Place lamp at a fixed radius from the boundary intersection
  const boundaryY1 = canvas.height / 3;
  const radius = 120;
  const theta = angleDeg * Math.PI / 180;
  const ix = 100 + (boundaryY1 - 60) * Math.sin(theta); // intersection x
  const iy = boundaryY1;
  // Lamp position on arc
  return {
    x: ix - radius * Math.sin(theta),
    y: iy - radius * Math.cos(theta)
  };
}

function isNearLampArc(mx, my) {
  const angle = Number(angleSlider.value);
  const lamp = getLampPosForAngle(angle);
  const dx = mx - lamp.x;
  const dy = my - lamp.y;
  return dx * dx + dy * dy < 400;
}

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (isNearLampArc(mx, my)) {
    isDraggingAngle = true;
  }
});
window.addEventListener('mousemove', (e) => {
  if (!isDraggingAngle) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  // Calculate angle from arc center to mouse
  const boundaryY1 = canvas.height / 3;
  const centerX = 100 + (boundaryY1 - 60) * Math.sin(Number(angleSlider.value) * Math.PI / 180);
  const centerY = boundaryY1;
  let theta = Math.atan2(centerX - mx, centerY - my); // swap x/y for correct orientation
  let angleDeg = theta * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  if (angleDeg > 90) angleDeg = 90;
  if (angleDeg < 0) angleDeg = 0;
  angleSlider.value = Math.round(angleDeg);
  draw();
});
window.addEventListener('mouseup', () => {
  isDraggingAngle = false;
});
// Touch support
canvas.addEventListener('touchstart', (e) => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
  if (isNearLampArc(mx, my)) {
    isDraggingAngle = true;
    e.preventDefault();
  }
});
window.addEventListener('touchmove', (e) => {
  if (!isDraggingAngle) return;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
  const boundaryY1 = canvas.height / 3;
  const centerX = 100 + (boundaryY1 - 60) * Math.sin(Number(angleSlider.value) * Math.PI / 180);
  const centerY = boundaryY1;
  let theta = Math.atan2(centerX - mx, centerY - my);
  let angleDeg = theta * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  if (angleDeg > 90) angleDeg = 90;
  if (angleDeg < 0) angleDeg = 0;
  angleSlider.value = Math.round(angleDeg);
  draw();
  e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', () => {
  isDraggingAngle = false;
});

function updateRefIndices() {
  const m1 = mediums[medium1.value];
  const m2 = mediums[medium2.value];
  n1Display.textContent = m1.n.toFixed(3);
  n2Display.textContent = m2.n.toFixed(3);
}

function drawLamp(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  // Lamp body
  ctx.fillStyle = '#d2691e';
  ctx.fillRect(-12, -8, 24, 16);
  // Lamp head
  ctx.save();
  ctx.rotate(-0.3);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(8, -7, 10, 14);
  ctx.restore();
  // Light rays
  ctx.strokeStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(14, -4); ctx.lineTo(24, -8);
  ctx.moveTo(14, 0);  ctx.lineTo(26, 0);
  ctx.moveTo(14, 4);  ctx.lineTo(24, 8);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  // Get values
  const m1 = mediums[medium1.value];
  const m2 = mediums[medium2.value];
  const n1 = m1.n;
  const n2 = m2.n;
  const angle1 = Number(angleSlider.value); // degrees
  angleDisplay.textContent = angle1;

  // Canvas setup
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw mediums
  const boundaryY1 = canvas.height / 3;
  const boundaryY2 = 2 * canvas.height / 3;
  // Top
  ctx.fillStyle = m1.color;
  ctx.fillRect(0, 0, canvas.width, boundaryY1);
  // Bottom
  ctx.fillStyle = m2.color;
  ctx.fillRect(0, boundaryY1, canvas.width, boundaryY2 - boundaryY1);
  ctx.fillStyle = m1.color;
  ctx.fillRect(0, boundaryY2, canvas.width, canvas.height - boundaryY2);

  // Draw solid boundaries
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, boundaryY1); ctx.lineTo(canvas.width, boundaryY1);
  ctx.moveTo(0, boundaryY2); ctx.lineTo(canvas.width, boundaryY2);
  ctx.stroke();

  // Ray geometry
  const lamp = getLampPosForAngle(angle1);
  const startX = lamp.x, startY = lamp.y;
  const normX = startX + 60, normY = boundaryY1;
  const theta1 = angle1 * Math.PI / 180;
  // Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
  let sinTheta2 = n1 * Math.sin(theta1) / n2;
  let theta2 = Math.asin(Math.min(Math.max(sinTheta2, -1), 1));
  if (isNaN(theta2)) theta2 = Math.PI / 2; // total internal reflection

  // Draw incident ray
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  // Intersection with boundaryY1
  const incidentLen = (boundaryY1 - startY) / Math.cos(theta1);
  const ix = startX + incidentLen * Math.sin(theta1);
  const iy = startY + incidentLen * Math.cos(theta1);
  ctx.lineTo(ix, iy);
  ctx.stroke();

  // Draw refracted ray (middle region)
  ctx.beginPath();
  ctx.moveTo(ix, iy);
  // Find intersection with boundaryY2
  const refractLen = (boundaryY2 - iy) / Math.cos(theta2);
  const rx = ix + refractLen * Math.sin(theta2);
  const ry = iy + refractLen * Math.cos(theta2);
  ctx.lineTo(rx, ry);
  ctx.stroke();

  // Draw exit ray (bottom region, same angle as incident)
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  const exitLen = (canvas.height - ry);
  const ex = rx + exitLen * Math.sin(theta1);
  const ey = ry + exitLen * Math.cos(theta1);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Draw lamp
  drawLamp(startX, startY, theta1);

  // Draw angles
  ctx.save();
  ctx.strokeStyle = '#888';
  ctx.setLineDash([3, 3]);
  // Incident angle arc
  ctx.beginPath();
  ctx.arc(ix, iy, 28, Math.PI/2, Math.PI/2 - theta1, true);
  ctx.stroke();
  // Refracted angle arc
  ctx.beginPath();
  ctx.arc(ix, iy, 28, Math.PI/2, Math.PI/2 - theta2, false);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Angle labels
  ctx.fillStyle = '#444';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(angle1 + '°', ix + 8, iy - 8);
  ctx.fillText((Math.round(theta2 * 180 / Math.PI)) + '°', ix + 8, iy + 24);

  // Draw refractive index info (top-right) as text only
  ctx.save();
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.85;
  ctx.fillText(m1.name, canvas.width - 90, 52);
  ctx.font = '14px Arial';
  ctx.fillText('Ref. Index ' + m1.n.toFixed(3), canvas.width - 90, 72);
  ctx.font = 'bold 16px Arial';
  ctx.fillText(m2.name, canvas.width - 90, boundaryY1 + 52);
  ctx.font = '14px Arial';
  ctx.fillText('Ref. Index ' + m2.n.toFixed(3), canvas.width - 90, boundaryY1 + 72);
  ctx.restore();
}

// Event listeners
angleSlider.addEventListener('input', () => {
  draw();
});
medium1.addEventListener('change', () => {
  updateRefIndices();
  draw();
});
medium2.addEventListener('change', () => {
  updateRefIndices();
  draw();
});

// Initial setup
updateRefIndices();
draw();

// Dark mode toggle
const darkModeBtn = document.getElementById('darkModeBtn');
darkModeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    darkModeBtn.textContent = 'Switch to Light Mode';
  } else {
    darkModeBtn.textContent = 'Switch to Dark Mode';
  }
});
