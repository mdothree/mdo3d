#!/bin/bash

# Architecture Verification Script
# Checks all platforms against the standard architecture

echo "=========================================="
echo "  Platform Architecture Verification"
echo "=========================================="
echo ""

PLATFORMS=("oracle-cards" "tarot-cards" "resume-analyzer" "dream-interpreter")
ERRORS=0

for platform in "${PLATFORMS[@]}"; do
    echo "Checking $platform..."
    
    # Skip if platform doesn't exist
    if [ ! -d "$platform" ]; then
        echo "  ⏭️  Skipped (does not exist yet)"
        echo ""
        continue
    fi
    
    # Check required files
    required_files=(
        "public/index.html"
        "public/css/styles.css"
        "public/js/app.js"
        "public/js/config/api.js"
        "public/js/config/firebase.js"
        "public/js/services/authService.js"
        "package.json"
        "vercel.json"
        "README.md"
    )
    
    missing=0
    for file in "${required_files[@]}"; do
        if [ ! -f "$platform/$file" ]; then
            echo "  ❌ Missing: $file"
            missing=$((missing + 1))
            ERRORS=$((ERRORS + 1))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        echo "  ✅ All required files present"
    fi
    
    # Check if app.js imports required modules
    if [ -f "$platform/public/js/app.js" ]; then
        if ! grep -q "import.*api.js" "$platform/public/js/app.js"; then
            echo "  ⚠️  app.js missing API client import"
        fi
        if ! grep -q "import.*firebase.js" "$platform/public/js/app.js"; then
            echo "  ⚠️  app.js missing Firebase import"
        fi
        if ! grep -q "import.*authService.js" "$platform/public/js/app.js"; then
            echo "  ⚠️  app.js missing Auth service import"
        fi
    fi
    
    echo ""
done

echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All platforms verified successfully!"
else
    echo "❌ Found $ERRORS issues"
fi
echo "=========================================="
