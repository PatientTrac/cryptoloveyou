#!/bin/bash

echo "🧪 Testing Homepage Update Locally"
echo "=================================="
echo ""

# Env vars: loaded from .env by scripts/update-homepage.js (dotenv)

echo "✅ Run node with dotenv (see scripts/update-homepage.js)"
echo ""

# Run the update script
echo "🚀 Running update script..."
node scripts/update-homepage.js
exit_code=$?

# Check exit code
if [ "$exit_code" -eq 0 ]; then
    echo ""
    echo "✅ Script completed successfully"
    echo ""
    
    # Verify JSON files were created/updated
    echo "📋 Checking generated files..."
    for file in ticker featured latest-news stock-news ai-news; do
        if [ -f "content/homepage/${file}.json" ]; then
            size=$(wc -c < "content/homepage/${file}.json")
            echo "  ✅ ${file}.json (${size} bytes)"
        else
            echo "  ❌ ${file}.json NOT FOUND"
        fi
    done
    
    echo ""
    echo "🔍 Preview of ticker.json (first 20 lines):"
    echo "-------------------------------------------"
    head -20 content/homepage/ticker.json
    
    echo ""
    echo "🔍 Preview of featured.json:"
    echo "----------------------------"
    cat content/homepage/featured.json
    
    echo ""
    echo "✅ Local test PASSED!"
    echo ""
    echo "⚠️  Changes are NOT committed. Review the files above."
    echo "To discard: git restore content/homepage/*.json"
    echo "To commit: git add content/homepage/*.json && git commit -m 'test'"
else
    echo ""
    echo "❌ Script FAILED with exit code ${exit_code}"
    echo ""
    echo "Please fix errors before running on GitHub!"
fi
