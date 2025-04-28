const fs = require('fs');
const { createCanvas } = require('canvas');

// Create icons of different sizes
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4a6cf7');
  gradient.addColorStop(1, '#6e48aa');
  
  // Fill the background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw a simple tab icon
  ctx.fillStyle = '#ffffff';
  const tabWidth = size * 0.7;
  const tabHeight = size * 0.5;
  const tabX = (size - tabWidth) / 2;
  const tabY = (size - tabHeight) / 2;
  
  // Draw a rounded rectangle for the tab
  const radius = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(tabX + radius, tabY);
  ctx.lineTo(tabX + tabWidth - radius, tabY);
  ctx.arcTo(tabX + tabWidth, tabY, tabX + tabWidth, tabY + radius, radius);
  ctx.lineTo(tabX + tabWidth, tabY + tabHeight - radius);
  ctx.arcTo(tabX + tabWidth, tabY + tabHeight, tabX + tabWidth - radius, tabY + tabHeight, radius);
  ctx.lineTo(tabX + radius, tabY + tabHeight);
  ctx.arcTo(tabX, tabY + tabHeight, tabX, tabY + tabHeight - radius, radius);
  ctx.lineTo(tabX, tabY + radius);
  ctx.arcTo(tabX, tabY, tabX + radius, tabY, radius);
  ctx.closePath();
  ctx.fill();
  
  // Add a simple AI-like pattern
  if (size >= 32) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.moveTo(tabX + tabWidth * 0.3, tabY + tabHeight * 0.3);
    ctx.lineTo(tabX + tabWidth * 0.7, tabY + tabHeight * 0.3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(tabX + tabWidth * 0.3, tabY + tabHeight * 0.5);
    ctx.lineTo(tabX + tabWidth * 0.7, tabY + tabHeight * 0.5);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(tabX + tabWidth * 0.3, tabY + tabHeight * 0.7);
    ctx.lineTo(tabX + tabWidth * 0.7, tabY + tabHeight * 0.7);
    ctx.stroke();
  }
  
  // Save the icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
  
  console.log(`Generated icon${size}.png`);
});

console.log('All icons generated successfully.'); 