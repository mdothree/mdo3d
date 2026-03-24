# 🔮 Divination Blocks - WordPress Plugin

Beautiful Gutenberg blocks for oracle cards, tarot, moon phases, and spiritual content on your WordPress site.

## Features

### Free Blocks
- **Oracle Card** - Single daily oracle card with beautiful design
- **Moon Phase** - Display current moon phase with spiritual guidance  
- **Daily Affirmation** - Rotating affirmations for your readers

### Pro Blocks (Licensed)
- **Three-Card Spread** - Past, Present, Future reading layout
- **Celtic Cross** - 10-card comprehensive reading
- **Custom Styling** - Match your brand colors
- **Priority Support** - Direct developer assistance

## Installation

### Method 1: WordPress Admin (Recommended)

1. Download `divination-blocks.zip` 
2. Go to **Plugins** → **Add New** in WordPress admin
3. Click **Upload Plugin**
4. Choose the ZIP file
5. Click **Install Now**
6. Click **Activate**

### Method 2: Manual Upload

1. Download and unzip `divination-blocks.zip`
2. Upload `divination-blocks` folder to `/wp-content/plugins/`
3. Activate through **Plugins** menu in WordPress

### Method 3: FTP

```bash
# Unzip and upload to:
/wp-content/plugins/divination-blocks/
```

Then activate in WordPress admin.

## Quick Start

1. **Activate Plugin**
   - Go to Plugins → Activate "Divination Blocks"

2. **Add a Block**
   - Edit any page or post
   - Click (+) to add block
   - Search for "Oracle Card"
   - Insert and customize!

3. **Configure (Optional)**
   - Go to **Divination Blocks** in admin menu
   - Enter license key for Pro features
   - Customize colors

## Usage

### Oracle Card Block

Add daily oracle card readings to any page:

1. Add "Oracle Card" block
2. Choose display options:
   - Show/hide keywords
   - Show/hide guidance
   - Card style (default, minimal, full)
   - Allow visitors to redraw
3. Publish!

**Shortcode**: `[divination_oracle_card]`

### Moon Phase Block

Display current lunar phase:

1. Add "Moon Phase" block
2. Customize display
3. Publish!

**Shortcode**: `[divination_moon_phase]`

### Affirmation Block

Show rotating affirmations:

1. Add "Affirmation" block
2. Set rotation (daily, hourly, random)
3. Publish!

**Shortcode**: `[divination_affirmation]`

### Three-Card Spread (Pro)

Past, Present, Future readings:

1. Requires active license
2. Add "Three-Card Spread" block
3. Customize layout
4. Publish!

**Shortcode**: `[divination_three_card]`

## Requirements

- WordPress 6.0 or higher
- PHP 7.4 or higher
- Modern browser with JavaScript enabled

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | Oracle card, moon phase, affirmations |
| **Pro** | $49/year | All blocks + priority support |
| **Lifetime** | $149 | One-time payment, lifetime updates |
| **Agency** | $299 | Unlimited sites, white-label option |

[Get a License →](https://your-site.com/pricing)

## License Activation

1. Purchase license at [your-site.com](https://your-site.com)
2. Go to **Divination Blocks** → **Settings**
3. Enter license key
4. Click **Activate License**
5. Pro features unlocked! ✅

## Development

This plugin is built with:
- **PHP 7.4+** - Backend logic
- **React** - Gutenberg block editor
- **WordPress Block API** - Modern block development
- **44 Oracle Cards** - Complete deck with meanings

### Local Development

```bash
# Clone repository
git clone your-repo-url
cd divination-blocks

# Install dependencies (if using build process)
npm install

# Build blocks
npm run build

# Watch for changes
npm run start
```

### File Structure

```
divination-blocks/
├── divination-blocks.php    # Main plugin file
├── includes/
│   ├── card-database.php    # Oracle card data
│   ├── license.php          # License validation
│   ├── ajax-handlers.php    # AJAX endpoints
│   └── admin-page.php       # Settings page
├── blocks/
│   ├── oracle-card/
│   │   ├── block.json       # Block metadata
│   │   ├── edit.js          # Editor component
│   │   ├── frontend.js      # Frontend script
│   │   └── style.css        # Block styles
│   ├── three-card/
│   ├── moon-phase/
│   └── affirmation/
├── assets/
│   ├── js/
│   └── css/
└── README.md
```

## Revenue Model

### Distribution Channels

**1. CodeCanyon (Envato Market)**
- 50% commission (you get $24.50 from $49 sale)
- Huge audience (8M+ buyers)
- Built-in payment processing
- Customer support handled

**2. Your Own Site**
- 100% revenue (minus payment processing ~3%)
- Direct customer relationship
- Higher margins
- Use WooCommerce + licensing plugin

**3. WordPress.org (Freemium)**
- Free version on WP.org repository
- Upsell to Pro via plugin
- Massive reach (60k+ downloads possible)
- Builds trust

### Recommended Strategy

**Phase 1**: Launch on Your Site
- Sell directly at full price ($49-149)
- Build email list
- Collect testimonials

**Phase 2**: CodeCanyon
- List on CodeCanyon for wider reach
- Price slightly higher to account for commission
- Get reviews and sales velocity

**Phase 3**: WordPress.org
- Submit free version
- Link to Pro upgrade
- Massive organic traffic

### Revenue Projections

**Conservative** (CodeCanyon only):

| Month | Sales | Revenue | Notes |
|-------|-------|---------|-------|
| 1 | 10 | $245 | Initial launch |
| 2 | 20 | $490 | Reviews accumulate |
| 3 | 35 | $858 | Featured spot |
| 6 | 60 | $1,470 | Established |
| 12 | 100 | $2,450 | Top seller status |

**Optimistic** (All channels):

| Channel | Monthly Sales | Revenue |
|---------|---------------|---------|
| Own Site | 20 × $79 | $1,580 |
| CodeCanyon | 80 × $49 (50%) | $1,960 |
| WP.org Upsells | 30 × $49 | $1,470 |
| **Total** | **130** | **$5,010/mo** |

**Scale potential**: $3,000-10,000/month after 12-18 months

## Marketing Strategy

### 1. WordPress Community

- Submit to WordPress.org
- Post in WP forums
- Share in FB groups
- List in plugin directories

### 2. Spiritual/Wellness Niche

- Partner with spiritual bloggers
- Guest post on wellness sites
- Share in spiritual communities
- Offer affiliate program (20-30%)

### 3. Content Marketing

- YouTube tutorials
- Blog posts about oracle cards in WP
- Case studies
- Free card reading on your site

### 4. SEO

Target keywords:
- "WordPress oracle card plugin"
- "Tarot blocks for Gutenberg"
- "Spiritual WordPress plugins"
- "Divination website tools"

## Support

- **Documentation**: [your-site.com/docs](https://your-site.com/docs)
- **Support Forum**: [your-site.com/support](https://your-site.com/support)
- **Email**: support@your-site.com
- **Priority Support**: Pro license holders get 24h response

## Changelog

### 1.0.0 - 2026-02-28
- Initial release
- Oracle Card block
- Three-Card Spread block (Pro)
- Moon Phase block
- Affirmation block
- License system
- Admin settings page

## Roadmap

- [ ] Celtic Cross block (10-card spread)
- [ ] Tarot deck addition
- [ ] Custom card uploads
- [ ] Reading history for users
- [ ] Email capture integration
- [ ] WooCommerce integration
- [ ] Elementor widgets
- [ ] Multilingual support

## Contributing

This is a commercial plugin. Feature requests welcome!

## License

Commercial license. Purchase required for use.

## Credits

- Oracle card meanings: Original content
- Block development: WordPress Gutenberg API
- Icons: Dashicons

---

**Ready to add spiritual guidance to your WordPress site?**  
[Get Divination Blocks →](https://your-site.com/divination-blocks)

Made with 💜 for the spiritual community
