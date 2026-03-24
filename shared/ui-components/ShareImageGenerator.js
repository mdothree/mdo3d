/**
 * Share Image Generator
 * Creates beautiful social media images for sharing
 * Uses HTML5 Canvas to generate images on the fly
 */

export class ShareImageGenerator {
  constructor(options = {}) {
    this.width = options.width || 1200;
    this.height = options.height || 630; // Open Graph standard
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Generate Oracle Card reading image
   */
  async generateOracleCardImage(data) {
    const { cardName, message, gradient = ['#667eea', '#764ba2'] } = data;

    // Background gradient
    const grd = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grd.addColorStop(0, gradient[0]);
    grd.addColorStop(1, gradient[1]);
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Add sparkle effect
    this.addSparkles();

    // Card name
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 80px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(cardName, this.width / 2, 200);

    // Message
    this.ctx.font = '40px system-ui';
    this.wrapText(message, this.width / 2, 320, this.width - 200, 60);

    // Branding
    this.ctx.font = '30px system-ui';
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillText('✨ Oracle Cards ✨', this.width / 2, this.height - 60);
    this.ctx.globalAlpha = 1;

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Generate Resume Score image
   */
  async generateResumeScoreImage(data) {
    const { score, message } = data;

    // Background
    const grd = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grd.addColorStop(0, '#2563eb');
    grd.addColorStop(1, '#7c3aed');
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Score circle
    const centerX = this.width / 2;
    const centerY = 280;
    const radius = 150;

    // Outer circle
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 20;
    this.ctx.stroke();

    // Score arc
    const endAngle = (score / 100) * 2 * Math.PI - Math.PI / 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 20;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Score number
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 120px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(score, centerX, centerY + 40);

    // Message
    this.ctx.font = '40px system-ui';
    this.ctx.fillText(message, centerX, this.height - 120);

    // Branding
    this.ctx.font = '30px system-ui';
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillText('Resume Analyzer', centerX, this.height - 60);
    this.ctx.globalAlpha = 1;

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Generic share image generator
   */
  async generateGenericImage(data) {
    const { 
      title, 
      subtitle, 
      brandName,
      gradient = ['#667eea', '#764ba2'],
      icon = '✨'
    } = data;

    // Background gradient
    const grd = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grd.addColorStop(0, gradient[0]);
    grd.addColorStop(1, gradient[1]);
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Icon
    this.ctx.font = '150px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(icon, this.width / 2, 220);

    // Title
    this.ctx.font = 'bold 70px system-ui';
    this.wrapText(title, this.width / 2, 340, this.width - 200, 90);

    // Subtitle
    if (subtitle) {
      this.ctx.font = '40px system-ui';
      this.ctx.globalAlpha = 0.9;
      this.wrapText(subtitle, this.width / 2, 480, this.width - 200, 60);
      this.ctx.globalAlpha = 1;
    }

    // Brand
    this.ctx.font = '35px system-ui';
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillText(brandName, this.width / 2, this.height - 60);
    this.ctx.globalAlpha = 1;

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Helper: Wrap text to fit width
   */
  wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = this.ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        this.ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, currentY);
  }

  /**
   * Add sparkle/particle effects
   */
  addSparkles() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 4 + 1;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  /**
   * Download generated image
   */
  downloadImage(filename = 'share-image.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Get blob for sharing
   */
  async getBlob() {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }
}
