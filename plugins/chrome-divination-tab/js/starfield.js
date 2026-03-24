/**
 * Animated Starfield Background
 */

class Starfield {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.numStars = 200;
    this.init();
  }

  init() {
    this.resize();
    this.createStars();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createStars() {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        opacity: Math.random()
      });
    }
  }

  drawStar(star) {
    this.ctx.beginPath();
    this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    this.ctx.fill();
  }

  update() {
    this.stars.forEach(star => {
      star.x += star.vx;
      star.y += star.vy;

      // Wrap around edges
      if (star.x < 0) star.x = this.canvas.width;
      if (star.x > this.canvas.width) star.x = 0;
      if (star.y < 0) star.y = this.canvas.height;
      if (star.y > this.canvas.height) star.y = 0;

      // Twinkle effect
      star.opacity += (Math.random() - 0.5) * 0.02;
      star.opacity = Math.max(0.2, Math.min(1, star.opacity));
    });
  }

  animate() {
    this.ctx.fillStyle = '#0f0f23';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.stars.forEach(star => this.drawStar(star));
    this.update();

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Starfield('starfield');
  });
} else {
  new Starfield('starfield');
}
