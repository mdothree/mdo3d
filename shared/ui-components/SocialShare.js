/**
 * Social Share Component
 * Reusable sharing functionality for all platforms
 * 
 * Features:
 * - Native Web Share API
 * - Copy to clipboard
 * - Generate shareable images
 * - Social media specific formatting
 * - Track share analytics
 */

export class SocialShare {
  constructor(options = {}) {
    this.defaultOptions = {
      title: document.title,
      text: '',
      url: window.location.href,
      hashtags: [],
      via: '', // Twitter handle
      imageUrl: null,
      enableAnalytics: true
    };

    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Universal share function - tries native share first, falls back to custom
   */
  async share(customOptions = {}) {
    const shareData = { ...this.options, ...customOptions };

    // Try native Web Share API first
    if (this.canUseNativeShare()) {
      try {
        await this.nativeShare(shareData);
        this.trackShare('native', shareData);
        return { success: true, method: 'native' };
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
        // Fall through to custom share
      }
    }

    // Show custom share modal
    this.showShareModal(shareData);
    return { success: true, method: 'modal' };
  }

  /**
   * Check if native Web Share API is available
   */
  canUseNativeShare() {
    return navigator.share !== undefined;
  }

  /**
   * Use native Web Share API
   */
  async nativeShare(data) {
    const shareData = {
      title: data.title,
      text: data.text,
      url: data.url
    };

    // Add files if image is provided (supported on some platforms)
    if (data.imageUrl && navigator.canShare) {
      const blob = await this.urlToBlob(data.imageUrl);
      const file = new File([blob], 'share-image.png', { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }
    }

    await navigator.share(shareData);
  }

  /**
   * Show custom share modal with platform options
   */
  showShareModal(data) {
    const modal = this.createShareModal(data);
    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => {
      modal.remove();
    };

    modal.querySelector('.share-modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.share-modal-close').addEventListener('click', closeModal);
    
    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Create share modal HTML
   */
  createShareModal(data) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
      <div class="share-modal-overlay"></div>
      <div class="share-modal-content">
        <button class="share-modal-close">×</button>
        <h3>Share This</h3>
        <div class="share-options">
          ${this.createShareButtons(data)}
        </div>
        <div class="share-link-container">
          <input 
            type="text" 
            readonly 
            value="${data.url}" 
            class="share-link-input"
            id="share-link-input"
          />
          <button class="share-copy-btn" id="share-copy-btn">
            📋 Copy Link
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    setTimeout(() => {
      this.attachShareHandlers(modal, data);
    }, 0);

    return modal;
  }

  /**
   * Create share buttons for different platforms
   */
  createShareButtons(data) {
    const platforms = [
      {
        name: 'Twitter',
        icon: '🐦',
        color: '#1DA1F2',
        handler: () => this.shareToTwitter(data)
      },
      {
        name: 'Facebook',
        icon: '📘',
        color: '#1877F2',
        handler: () => this.shareToFacebook(data)
      },
      {
        name: 'WhatsApp',
        icon: '💬',
        color: '#25D366',
        handler: () => this.shareToWhatsApp(data)
      },
      {
        name: 'LinkedIn',
        icon: '💼',
        color: '#0A66C2',
        handler: () => this.shareToLinkedIn(data)
      },
      {
        name: 'Email',
        icon: '✉️',
        color: '#666',
        handler: () => this.shareViaEmail(data)
      }
    ];

    return platforms.map(platform => `
      <button 
        class="share-platform-btn" 
        data-platform="${platform.name.toLowerCase()}"
        style="border-left: 4px solid ${platform.color}"
      >
        <span class="share-platform-icon">${platform.icon}</span>
        <span class="share-platform-name">${platform.name}</span>
      </button>
    `).join('');
  }

  /**
   * Attach event handlers to share buttons
   */
  attachShareHandlers(modal, data) {
    const buttons = modal.querySelectorAll('.share-platform-btn');
    
    buttons.forEach(btn => {
      const platform = btn.dataset.platform;
      btn.addEventListener('click', () => {
        this[`shareTo${this.capitalize(platform)}`](data);
        this.trackShare(platform, data);
      });
    });

    // Copy link button
    const copyBtn = modal.querySelector('#share-copy-btn');
    copyBtn.addEventListener('click', () => {
      this.copyToClipboard(data.url);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy Link';
      }, 2000);
    });
  }

  /**
   * Platform-specific share methods
   */
  shareToTwitter(data) {
    const text = data.text || data.title;
    const hashtags = data.hashtags.join(',');
    const via = data.via;
    
    let url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(text)}`;
    if (hashtags) url += `&hashtags=${hashtags}`;
    if (via) url += `&via=${via}`;
    
    window.open(url, '_blank', 'width=550,height=420');
  }

  shareToFacebook(data) {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  shareToWhatsapp(data) {
    const text = `${data.text || data.title} ${data.url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  shareToLinkedin(data) {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  shareViaEmail(data) {
    const subject = data.title;
    const body = `${data.text}\n\n${data.url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }

  /**
   * Convert URL to Blob (for image sharing)
   */
  async urlToBlob(url) {
    const response = await fetch(url);
    return await response.blob();
  }

  /**
   * Track share analytics
   */
  trackShare(platform, data) {
    if (!this.options.enableAnalytics) return;

    // Send to analytics (Google Analytics, Mixpanel, etc.)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'share', {
        method: platform,
        content_type: data.contentType || 'general',
        item_id: data.itemId || 'unknown'
      });
    }

    // Firebase Analytics
    if (typeof firebase !== 'undefined' && firebase.analytics) {
      firebase.analytics().logEvent('share', {
        method: platform,
        content_type: data.contentType || 'general',
        item_id: data.itemId || 'unknown'
      });
    }

    console.log('Share tracked:', platform, data);
  }

  /**
   * Utility: Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

/**
 * CSS for share modal (inject into page)
 */
export const shareModalStyles = `
<style>
.share-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.share-modal-content {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.share-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.share-modal-close:hover {
  background: #f0f0f0;
  color: #333;
}

.share-modal-content h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #333;
}

.share-options {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.share-platform-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1rem;
  font-weight: 500;
}

.share-platform-btn:hover {
  background: #f9fafb;
  border-color: #666;
  transform: translateX(4px);
}

.share-platform-icon {
  font-size: 1.5rem;
}

.share-platform-name {
  color: #333;
}

.share-link-container {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
}

.share-link-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
}

.share-copy-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.3s;
}

.share-copy-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

@media (max-width: 600px) {
  .share-link-container {
    flex-direction: column;
  }
  
  .share-copy-btn {
    width: 100%;
  }
}
</style>
`;

// Inject styles on import
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('div');
  styleEl.innerHTML = shareModalStyles;
  document.head.appendChild(styleEl.firstElementChild);
}
