# Domain Mapping Strategy

**Available Domains:**
1. `blacklabb.com`
2. `jarvisbee.com`
3. `ronnascanner.com`

---

## Recommended Platform-to-Domain Mapping

### Option A: Spiritual Focus (Recommended)

| Platform | Domain | Rationale |
|----------|--------|-----------|
| **Oracle Cards** | `blacklabb.com` | "Black Lab" → mystical, mysterious brand perfect for oracle/divination |
| **Tarot Cards** | `jarvisbee.com` | "Jarvis Bee" → guidance/wisdom (Jarvis = advisor, Bee = community/wisdom) |
| **Resume Analyzer** | `ronnascanner.com` | "Ronna Scanner" → professional scanning/analysis tool |
| **Dream Interpreter** | `blacklabb.com/dreams` | Subdomain under mystical brand |
| **Numerology** | `blacklabb.com/numerology` | Subdomain under mystical brand |
| **Future Spiritual** | `blacklabb.com/*` | All spiritual services under one brand |

**Strategy**: 
- **BlackLabb** becomes the spiritual/divination brand umbrella
- **JarvisBee** is dedicated tarot guidance platform
- **RonnaScanner** is professional career tools

---

### Option B: Multi-Brand Strategy

| Platform | Domain | Subdomain Strategy |
|----------|--------|-------------------|
| **Oracle Cards** | `blacklabb.com` | Main site |
| **Tarot Cards** | `blacklabb.com` | `/tarot` subdirectory |
| **Resume Analyzer** | `ronnascanner.com` | Main site |
| **Dream Interpreter** | `jarvisbee.com` | Main site |
| **Numerology** | `jarvisbee.com` | `/numerology` |
| **Feng Shui** | `jarvisbee.com` | `/fengshui` |

**Strategy**: 
- **BlackLabb** = divination (cards, readings)
- **JarvisBee** = interpretation (dreams, symbols, numbers)
- **RonnaScanner** = professional tools (resume, career)

---

### Option C: Subdomain Strategy

| Platform | Domain Assignment |
|----------|------------------|
| **Oracle Cards** | `oracle.blacklabb.com` |
| **Tarot Cards** | `tarot.blacklabb.com` |
| **Dream Interpreter** | `dreams.jarvisbee.com` |
| **Numerology** | `numerology.jarvisbee.com` |
| **Resume Analyzer** | `www.ronnascanner.com` |
| **Landing Page** | `blacklabb.com` (portfolio of all spiritual services) |

---

## Recommended: Option A (Simplified)

### Primary Deployments

#### 1. BlackLabb.com - Oracle Cards
**Why**: Mysterious, mystical brand perfect for oracle divination

**Setup**:
- Primary: `www.blacklabb.com` → Oracle Cards
- Alt: `blacklabb.com` → redirects to www
- Future: Expand to multi-service portal

**Tagline**: "BlackLabb - Your Mystical Guide"

---

#### 2. JarvisBee.com - Tarot Cards
**Why**: "Jarvis" evokes wisdom/guidance, "Bee" suggests community/industrious

**Setup**:
- Primary: `www.jarvisbee.com` → Tarot Cards
- Alt: `jarvisbee.com` → redirects to www

**Tagline**: "JarvisBee - Ancient Wisdom, Modern Guidance"

---

#### 3. RonnaScanner.com - Resume Analyzer
**Why**: "Scanner" perfectly describes the resume analysis function

**Setup**:
- Primary: `www.ronnascanner.com` → Resume Analyzer
- Alt: `ronnascanner.com` → redirects to www

**Tagline**: "RonnaScanner - ATS Resume Analysis"

---

## Future Expansion Plan

### BlackLabb.com Evolution
As we build more spiritual platforms:

**Phase 1** (Current):
```
blacklabb.com → Oracle Cards (standalone)
```

**Phase 2** (3+ platforms):
```
blacklabb.com → Landing page with service selector
  ├── /oracle → Oracle Cards
  ├── /dreams → Dream Interpreter
  └── /numerology → Numerology Calculator
```

**Phase 3** (Full portfolio):
```
blacklabb.com → Full spiritual services platform
  ├── /oracle → Oracle Cards
  ├── /tarot → Tarot Cards (or keep jarvisbee.com separate)
  ├── /dreams → Dream Interpreter
  ├── /numerology → Numerology
  ├── /fengshui → Feng Shui
  └── /astrology → Birth Charts
```

---

## DNS Configuration

### For Each Domain

**Vercel Setup**:
1. Go to Vercel project settings
2. Add custom domain
3. Follow DNS configuration instructions

**DNS Records Needed**:

```
# For blacklabb.com
A     @           76.76.21.21  (Vercel)
CNAME www         cname.vercel-dns.com
```

```
# For jarvisbee.com
A     @           76.76.21.21  (Vercel)
CNAME www         cname.vercel-dns.com
```

```
# For ronnascanner.com
A     @           76.76.21.21  (Vercel)
CNAME www         cname.vercel-dns.com
```

---

## Deployment Commands

### Deploy Oracle Cards to BlackLabb.com
```bash
cd platforms/oracle-cards
vercel --prod
# When prompted, add domain: blacklabb.com
```

### Deploy Tarot Cards to JarvisBee.com
```bash
cd platforms/tarot-cards
vercel --prod
# When prompted, add domain: jarvisbee.com
```

### Deploy Resume Analyzer to RonnaScanner.com
```bash
cd platforms/resume-analyzer
vercel --prod
# When prompted, add domain: ronnascanner.com
```

---

## SSL Certificates

Vercel automatically provisions and renews SSL certificates for:
- ✅ `blacklabb.com`
- ✅ `www.blacklabb.com`
- ✅ `jarvisbee.com`
- ✅ `www.jarvisbee.com`
- ✅ `ronnascanner.com`
- ✅ `www.ronnascanner.com`

No manual SSL setup needed!

---

## Environment Updates Needed

### Update Open Graph Tags

Each platform needs domain update in `index.html`:

**Oracle Cards** (`platforms/oracle-cards/public/index.html`):
```html
<meta property="og:url" content="https://blacklabb.com">
<meta property="og:image" content="https://blacklabb.com/og-image.jpg">
<meta name="twitter:image" content="https://blacklabb.com/og-image.jpg">
```

**Tarot Cards** (`platforms/tarot-cards/public/index.html`):
```html
<meta property="og:url" content="https://jarvisbee.com">
<meta property="og:image" content="https://jarvisbee.com/og-image.jpg">
<meta name="twitter:image" content="https://jarvisbee.com/og-image.jpg">
```

**Resume Analyzer** (`platforms/resume-analyzer/public/index.html`):
```html
<meta property="og:url" content="https://ronnascanner.com">
<meta property="og:image" content="https://ronnascanner.com/og-image.jpg">
<meta name="twitter:image" content="https://ronnascanner.com/og-image.jpg">
```

---

## API Backend Domains

If using Railway/Render for backend APIs:

| Platform | Frontend | Backend API |
|----------|----------|-------------|
| Oracle Cards | `blacklabb.com` | `oracle-api.blacklabb.com` or Railway subdomain |
| Tarot Cards | `jarvisbee.com` | `tarot-api.jarvisbee.com` or Railway subdomain |
| Resume Analyzer | `ronnascanner.com` | `resume-api.ronnascanner.com` or Railway subdomain |

**Alternative**: Use Railway's default domains initially:
- `oracle-cards-api.up.railway.app`
- `tarot-cards-api.up.railway.app`
- `resume-analyzer-api.up.railway.app`

---

## Branding Updates

### BlackLabb.com (Oracle Cards)
- **Color Scheme**: Deep purple, mystical blues, gold accents
- **Vibe**: Mysterious, spiritual, ancient wisdom
- **Tagline**: "Unlock the mysteries within"

### JarvisBee.com (Tarot Cards)
- **Color Scheme**: Royal purple, deep reds, cosmic blues
- **Vibe**: Wise, guiding, transformative
- **Tagline**: "Your guide through life's journey"

### RonnaScanner.com (Resume Analyzer)
- **Color Scheme**: Professional blues, clean grays, success green
- **Vibe**: Professional, efficient, career-focused
- **Tagline**: "Your resume, perfected"

---

## Marketing Strategy Per Domain

### BlackLabb.com
- **Target**: Spiritual seekers, oracle card enthusiasts
- **Channels**: Instagram (mystical imagery), TikTok (daily card pulls), Pinterest
- **SEO**: "free oracle card reading", "daily oracle cards", "spiritual guidance"

### JarvisBee.com
- **Target**: Tarot readers, spiritual guidance seekers
- **Channels**: YouTube (how to read tarot), Instagram (card meanings), Reddit r/tarot
- **SEO**: "free tarot reading online", "tarot card meanings", "celtic cross spread"

### RonnaScanner.com
- **Target**: Job seekers, career changers, professionals
- **Channels**: LinkedIn, Twitter (career tips), job boards
- **SEO**: "ATS resume checker", "resume analyzer", "resume optimization"

---

## Analytics Setup

Use Google Analytics with separate properties:

1. **GA4 Property**: BlackLabb (Oracle)
   - Property ID: G-XXXXXXXXXX

2. **GA4 Property**: JarvisBee (Tarot)
   - Property ID: G-YYYYYYYYYY

3. **GA4 Property**: RonnaScanner (Resume)
   - Property ID: G-ZZZZZZZZZZ

Track cross-site conversions to measure portfolio performance.

---

## Email Setup

### Professional Email Addresses

**BlackLabb.com**:
- `hello@blacklabb.com` - Support
- `readings@blacklabb.com` - Premium inquiries
- `info@blacklabb.com` - General

**JarvisBee.com**:
- `hello@jarvisbee.com` - Support
- `guidance@jarvisbee.com` - Premium readings
- `info@jarvisbee.com` - General

**RonnaScanner.com**:
- `support@ronnascanner.com` - Support
- `premium@ronnascanner.com` - Premium inquiries
- `hello@ronnascanner.com` - General

Set up via Google Workspace, Zoho Mail, or ProtonMail.

---

## Social Media Handles

Secure consistent handles across platforms:

| Platform | BlackLabb | JarvisBee | RonnaScanner |
|----------|-----------|-----------|--------------|
| Instagram | @blacklabb | @jarvisbee | @ronnascanner |
| Twitter/X | @blacklabb | @jarvisbee | @ronnascanner |
| TikTok | @blacklabb | @jarvisbee | @ronnascanner |
| Pinterest | @blacklabb | @jarvisbee | @ronnascanner |
| Facebook | BlackLabb | JarvisBee | RonnaScanner |

---

## Launch Checklist

### Pre-Launch (Per Domain)
- [ ] Domain DNS configured
- [ ] Vercel project created and deployed
- [ ] Custom domain added to Vercel
- [ ] SSL certificate verified (automatic)
- [ ] Open Graph tags updated with real domain
- [ ] Favicon and OG images uploaded
- [ ] Google Analytics installed
- [ ] Social sharing tested
- [ ] Mobile responsive verified
- [ ] Cross-browser tested

### Launch Day
- [ ] Announce on social media
- [ ] Submit to Google Search Console
- [ ] Submit sitemap
- [ ] Set up Google My Business (if applicable)
- [ ] Email list announcement (if exists)
- [ ] Post on Reddit/communities
- [ ] Influencer outreach

### Post-Launch (Week 1)
- [ ] Monitor analytics
- [ ] Fix any user-reported issues
- [ ] A/B test pricing
- [ ] Collect user feedback
- [ ] Optimize based on data

---

## Budget Estimate

### Domain Costs (Annual)
- `blacklabb.com`: Already owned ✅
- `jarvisbee.com`: Already owned ✅
- `ronnascanner.com`: Already owned ✅
- **Total**: $0 (domains owned)

### Hosting (Monthly)
- Vercel (3 projects): Free tier → $0
- Railway (3 APIs): ~$15/month total
- **Total**: ~$15/month

### Services (Monthly)
- Google Workspace (email): $18/month (3 domains)
- Anthropic Claude API: Usage-based (~$50-100/mo)
- Firebase: Free tier initially
- Stripe: Free + transaction fees
- **Total**: ~$68-118/month

### **Total Monthly Cost**: ~$83-133/month
### **Total Annual Cost**: ~$996-1,596/year

---

## Revenue Projections Per Domain

### BlackLabb.com (Oracle Cards)
- Daily visitors: 1,000
- Conversion: 5%
- Revenue: $1,350/month

### JarvisBee.com (Tarot Cards)
- Daily visitors: 1,500
- Conversion: 6%
- Revenue: $3,240/month

### RonnaScanner.com (Resume Analyzer)
- Daily visitors: 800
- Conversion: 5%
- Revenue: $3,300/month

**Total Portfolio Revenue**: $7,890/month  
**Net Profit**: $7,890 - $133 = **$7,757/month**  
**Annual Profit**: **$93,084/year**

---

## Next Steps

1. **Choose mapping strategy** (Recommended: Option A)
2. **Update Open Graph tags** in all platforms
3. **Deploy to Vercel** with custom domains
4. **Configure DNS** at domain registrar
5. **Test all platforms** on production domains
6. **Launch marketing campaigns**

---

**Last Updated**: February 28, 2026  
**Status**: Ready for deployment  
**Recommended Start**: BlackLabb.com (Oracle Cards)
