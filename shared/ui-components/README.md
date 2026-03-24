# Shared UI Components

Reusable components across all Lamar platforms.

## Social Sharing System

Complete social media sharing solution for all platforms.

### Features

- ✅ Native Web Share API integration
- ✅ Fallback custom share modal
- ✅ Platform-specific sharing (Twitter, Facebook, WhatsApp, LinkedIn, Email)
- ✅ Copy to clipboard
- ✅ Dynamic image generation for shares
- ✅ Analytics tracking
- ✅ Open Graph meta tags support
- ✅ Beautiful, responsive UI

### Components

#### 1. SocialShare.js

Main sharing component with platform integrations.

**Usage:**

```javascript
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';

const socialShare = new SocialShare({
  title: 'My App',
  hashtags: ['MyApp', 'Cool'],
  via: 'MyAppTwitter'
});

// Universal share (tries native first, falls back to modal)
await socialShare.share({
  title: 'Check this out!',
  text: 'Amazing content here',
  url: window.location.href,
  imageUrl: 'https://example.com/image.png'
});
```

**Platforms Supported:**
- Twitter (with hashtags and via support)
- Facebook
- WhatsApp
- LinkedIn
- Email
- Copy to clipboard

**Analytics:**
- Automatically tracks shares via Google Analytics
- Firebase Analytics support
- Custom event tracking

#### 2. ShareImageGenerator.js

Generates beautiful social media images on-the-fly.

**Usage:**

```javascript
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';

const generator = new ShareImageGenerator({
  width: 1200,  // Open Graph standard
  height: 630
});

// Oracle Cards specific
const imageUrl = await generator.generateOracleCardImage({
  cardName: 'Inner Wisdom',
  message: 'Trust your intuition',
  gradient: ['#8B5CF6', '#EC4899']
});

// Resume Analyzer specific
const imageUrl = await generator.generateResumeScoreImage({
  score: 85,
  message: 'Great resume!'
});

// Generic
const imageUrl = await generator.generateGenericImage({
  title: 'My Achievement',
  subtitle: 'Check this out!',
  brandName: 'My App',
  gradient: ['#667eea', '#764ba2'],
  icon: '✨'
});

// Download image
generator.downloadImage('my-share.png');

// Get blob for sharing
const blob = await generator.getBlob();
```

**Image Types:**
- Oracle Card readings (mystical gradient + sparkles)
- Resume scores (circular progress with score)
- Generic shares (customizable)
- All images: 1200x630px (Open Graph standard)

### Integration Guide

#### Step 1: Import Components

```javascript
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';
```

#### Step 2: Initialize

```javascript
class MyApp {
  constructor() {
    this.socialShare = new SocialShare({
      title: 'My Platform',
      hashtags: ['MyPlatform', 'Cool'],
      via: 'MyPlatformApp',
      enableAnalytics: true
    });
  }
}
```

#### Step 3: Add Share Button

```html
<button id="share-btn">📤 Share</button>
```

```javascript
document.getElementById('share-btn').addEventListener('click', async () => {
  // Generate custom image (optional)
  const imageGenerator = new ShareImageGenerator();
  const imageUrl = await imageGenerator.generateGenericImage({
    title: 'My Result',
    subtitle: 'Description',
    brandName: 'My App'
  });

  // Share
  await this.socialShare.share({
    title: 'My Result',
    text: 'Check out what I got!',
    url: window.location.href,
    imageUrl: imageUrl
  });
});
```

#### Step 4: Add Open Graph Tags

In your HTML `<head>`:

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://yoursite.com/">
<meta property="og:title" content="Your Site Title">
<meta property="og:description" content="Your description">
<meta property="og:image" content="https://yoursite.com/og-image.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:title" content="Your Site Title">
<meta property="twitter:description" content="Your description">
<meta property="twitter:image" content="https://yoursite.com/twitter-image.png">
```

### Platform-Specific Examples

#### Oracle Cards

```javascript
async shareReading() {
  const card = this.drawnCards[0];
  
  const imageGenerator = new ShareImageGenerator();
  const imageUrl = await imageGenerator.generateOracleCardImage({
    cardName: card.name,
    message: card.upright.brief,
    gradient: ['#8B5CF6', '#EC4899']
  });

  await this.socialShare.share({
    title: `My Oracle Card: ${card.name}`,
    text: `I drew "${card.name}" - ${card.upright.brief} 🔮✨`,
    url: window.location.href,
    imageUrl: imageUrl,
    contentType: 'oracle_reading',
    itemId: card.id
  });
}
```

#### Resume Analyzer

```javascript
async shareScore() {
  const imageGenerator = new ShareImageGenerator();
  const imageUrl = await imageGenerator.generateResumeScoreImage({
    score: this.analysis.score,
    message: 'ATS Compatible!'
  });

  await this.socialShare.share({
    title: 'My Resume Score',
    text: `I got ${this.analysis.score}/100 on my resume! 📄✨`,
    url: window.location.href,
    imageUrl: imageUrl,
    contentType: 'resume_score',
    itemId: 'resume'
  });
}
```

### Analytics Tracking

Shares are automatically tracked with these properties:
- `method`: Platform used (twitter, facebook, whatsapp, etc.)
- `content_type`: Type of content shared
- `item_id`: Unique identifier for the item

**Google Analytics:**
```javascript
gtag('event', 'share', {
  method: 'twitter',
  content_type: 'oracle_reading',
  item_id: 'card_1'
});
```

**Firebase Analytics:**
```javascript
firebase.analytics().logEvent('share', {
  method: 'twitter',
  content_type: 'oracle_reading',
  item_id: 'card_1'
});
```

### Customization

#### Custom Share Platforms

Add your own platforms:

```javascript
// In SocialShare.js createShareButtons()
{
  name: 'Pinterest',
  icon: '📌',
  color: '#E60023',
  handler: () => this.shareToPinterest(data)
}

// Add method
shareToPinterest(data) {
  const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(data.url)}&description=${encodeURIComponent(data.text)}`;
  window.open(url, '_blank', 'width=750,height=550');
}
```

#### Custom Image Styles

```javascript
// Extend ShareImageGenerator
class MyImageGenerator extends ShareImageGenerator {
  async generateMyCustomImage(data) {
    // Your custom canvas drawing code
    this.ctx.fillStyle = 'purple';
    // ...
    return this.canvas.toDataURL('image/png');
  }
}
```

### Browser Support

- **Native Share API**: Chrome 61+, Safari 12.1+, Edge 79+
- **Canvas (Image Generation)**: All modern browsers
- **Clipboard API**: Chrome 66+, Firefox 63+, Safari 13.1+
- **Fallback**: Custom modal works everywhere

### Best Practices

1. **Always provide fallback text** for platforms that don't support images
2. **Keep share text under 280 characters** for Twitter compatibility
3. **Use relevant hashtags** (2-3 max)
4. **Test Open Graph tags** with Facebook's Sharing Debugger
5. **Generate images on-demand** to avoid storage costs
6. **Track shares** to understand what resonates with users

### File Structure

```
shared/
└── ui-components/
    ├── SocialShare.js           # Main sharing logic
    ├── ShareImageGenerator.js   # Image generation
    └── README.md               # This file
```

## License

MIT - Use freely across all Lamar platforms
