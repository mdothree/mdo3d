#!/bin/bash
# Add Firebase imports to app.js files that don't have them

set -e

IMPORT_LINE="import { firebaseConfig } from './config/firebase.js';"

add_firebase_import() {
    local file="$1"

    # Skip if already has firebaseConfig import
    if grep -q "firebaseConfig" "$file" 2>/dev/null; then
        echo "  Skipped (already has import): $file"
        return
    fi

    # Check if file exists and is not empty
    if [ ! -s "$file" ]; then
        echo "  Skipped (empty file): $file"
        return
    fi

    # Add import at the beginning of file
    # First, check if there are existing imports
    if grep -q "^import " "$file" 2>/dev/null; then
        # Add after last import
        # Use awk to insert after last import line
        awk -v import="$IMPORT_LINE" '
        BEGIN { added = 0; last_import = 0 }
        /^import / { last_import = NR }
        { lines[NR] = $0 }
        END {
            for (i = 1; i <= NR; i++) {
                print lines[i]
                if (i == last_import && added == 0) {
                    print import
                    added = 1
                }
            }
        }
        ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    else
        # No imports, add at the very beginning
        echo "$IMPORT_LINE" | cat - "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi

    # Also add initialization call if there's a DOMContentLoaded or init function
    if grep -q "DOMContentLoaded\|initialize\|init()" "$file" 2>/dev/null; then
        # Try to add firebaseConfig.initialize() call
        if ! grep -q "firebaseConfig.initialize" "$file" 2>/dev/null; then
            # Find DOMContentLoaded and add init after it
            sed -i '' "s/DOMContentLoaded.*{/&\n    \/\/ Initialize Firebase\n    firebaseConfig.initialize().catch(console.warn);/" "$file" 2>/dev/null || true
        fi
    fi

    echo "  Updated: $file"
}

echo "=== Adding Firebase imports to app.js files ==="

# Divination apps
echo ""
echo "--- Divination Apps ---"
for app in astrology fengshui iching runes pastlives numerology; do
    file=$(find /Users/latarencebutts/mdo3d/projects/divination/$app -name "app.js" -path "*/public/js/*" 2>/dev/null | grep -v node_modules | head -1)
    if [ -n "$file" ] && [ -f "$file" ]; then
        add_firebase_import "$file"
    fi
done

# Career apps (rigor)
echo ""
echo "--- Career Apps (rigor) ---"
for file in /Users/latarencebutts/mdo3d/projects/rigor/*/public/js/app.js; do
    if [ -f "$file" ]; then
        add_firebase_import "$file"
    fi
done

# Utility apps (mdothree)
echo ""
echo "--- Utility Apps (mdothree) ---"
for file in /Users/latarencebutts/mdo3d/projects/mdothree/*/public/js/app.js; do
    if [ -f "$file" ]; then
        # Skip landing
        if [[ "$file" == *"/landing/"* ]]; then
            echo "  Skipped: landing"
            continue
        fi
        add_firebase_import "$file"
    fi
done

# Lead apps (ronnascanner)
echo ""
echo "--- Lead Apps (ronnascanner) ---"
for file in /Users/latarencebutts/mdo3d/projects/ronnascanner/*/public/js/app.js; do
    if [ -f "$file" ]; then
        add_firebase_import "$file"
    fi
done

echo ""
echo "=== Done ==="
