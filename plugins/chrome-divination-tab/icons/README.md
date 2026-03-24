# Extension Icons

Create 4 PNG icons with these dimensions:

- `icon16.png` - 16x16 pixels (toolbar, small displays)
- `icon32.png` - 32x32 pixels (Windows)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store, installation)

## Design Guidelines

**Theme**: Mystical, spiritual, cosmic
**Colors**: Purple/blue gradient (#8b5cf6 to #667eea)
**Symbols**: Crystal ball, crescent moon, eye, stars, or sacred geometry

## Quick Creation Methods

### Option 1: Figma (Recommended)
1. Go to figma.com (free account)
2. Create 128x128 frame
3. Add purple gradient background
4. Add icon (🔮 emoji or custom shape)
5. Export as PNG at 128x128, 48x48, 32x32, 16x16

### Option 2: Canva
1. Go to canva.com
2. Custom dimensions: 128x128
3. Choose purple/blue gradient template
4. Add crystal ball or moon graphic
5. Download and resize

### Option 3: AI Generation
Use DALL-E, Midjourney, or similar:
```
Prompt: "App icon, mystical crystal ball with purple and blue gradient background, 
minimalist, modern, spiritual, centered composition, square format"
```

### Option 4: Free Icon Sites
- flaticon.com (search "crystal ball", "mystical")
- iconfinder.com
- icons8.com

Download and apply purple gradient overlay in any image editor.

## Placeholder for Testing

For quick testing, use any 128x128 PNG and resize:

```bash
# macOS
sips -z 16 16 icon128.png --out icon16.png
sips -z 32 32 icon128.png --out icon32.png
sips -z 48 48 icon128.png --out icon48.png

# Or use online tool:
# https://www.favicon-generator.org/
```

Place all 4 icons in this folder before loading extension.
