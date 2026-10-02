#!/bin/bash

# Test script to verify the landing page implementation
cd ~/dev/work/appworkz/zippp.link

echo "=== Testing Landing Page Implementation ==="

# Check if all components exist
echo "1. Checking component files:"
for component in Hero.tsx Steps.tsx Faq.tsx LanguageToggle.tsx copy.ts; do
    if [ -f "src/components/$component" ]; then
        echo "✅ $component exists"
    else
        echo "❌ $component missing"
    fi
done

# Check if page.tsx imports components correctly
echo -e "\n2. Checking page.tsx imports:"
if grep -q "import.*Hero" src/app/page.tsx && grep -q "import.*Steps" src/app/page.tsx && grep -q "import.*Faq" src/app/page.tsx; then
    echo "✅ All components imported in page.tsx"
else
    echo "❌ Missing imports in page.tsx"
fi

# Check bilingual content
echo -e "\n3. Checking bilingual content:"
if grep -q "Photo in. Table out." src/components/copy.ts && grep -q "Foto masuk. Tabel keluar." src/components/copy.ts; then
    echo "✅ Bilingual taglines present"
else
    echo "❌ Missing bilingual taglines"
fi

# Check TypeScript compilation
echo -e "\n4. Checking TypeScript compilation:"
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
fi

echo -e "\n=== Test Complete ==="