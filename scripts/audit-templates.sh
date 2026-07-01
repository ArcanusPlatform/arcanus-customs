#!/bin/bash

# Template Audit Script
# Scans all HTML templates for existing placeholders

echo "=========================================="
echo "Template Placeholder Audit"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARCANUS_ROOT="$(cd "${APP_DIR}/.." && pwd)"

TEMPLATE_DIR="mdj_full_template_library"
OUTPUT_FILE="TEMPLATE_PLACEHOLDERS_AUDIT.md"

# Create output file
cat > "$OUTPUT_FILE" << 'EOF'
# Template Placeholders Audit Report

This report shows all placeholders found in each template.

Generated: $(date)

---

EOF

# Counter
total_templates=0
total_placeholders=0

# Loop through all HTML files
for template in "$TEMPLATE_DIR"/*.html; do
    if [ -f "$template" ]; then
        filename=$(basename "$template")
        total_templates=$((total_templates + 1))
        
        echo "Scanning: $filename"
        
        # Find all {{placeholder}} patterns
        placeholders=$(grep -o '{{[^}]*}}' "$template" | sort -u)
        count=$(echo "$placeholders" | grep -c '{{' || echo "0")
        total_placeholders=$((total_placeholders + count))
        
        # Write to output file
        {
            echo "## $filename"
            echo ""
            if [ "$count" -gt 0 ]; then
                echo "**Found $count unique placeholders:**"
                echo ""
                echo '```'
                echo "$placeholders"
                echo '```'
            else
                echo "⚠️ **No placeholders found** - Template needs enhancement"
            fi
            echo ""
            echo "---"
            echo ""
        } >> "$OUTPUT_FILE"
    fi
done

# Summary
{
    echo ""
    echo "## Summary"
    echo ""
    echo "- **Total Templates Scanned:** $total_templates"
    echo "- **Total Unique Placeholders:** $total_placeholders"
    echo "- **Average Placeholders per Template:** $((total_placeholders / total_templates))"
    echo ""
} >> "$OUTPUT_FILE"

echo ""
echo "=========================================="
echo "Audit Complete!"
echo "=========================================="
echo "Templates scanned: $total_templates"
echo "Total placeholders: $total_placeholders"
echo "Report saved to: $OUTPUT_FILE"
echo ""
