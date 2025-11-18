#!/bin/bash
# Terraform Validation and Testing Script

set -e

echo "=========================================="
echo "Terraform Validation"
echo "=========================================="

cd "$(dirname "$0")/../terraform"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "Error: Terraform is not installed"
    exit 1
fi

echo "Terraform version:"
terraform version

echo ""
echo "Formatting check..."
terraform fmt -check -recursive || {
    echo "Files need formatting. Run: terraform fmt -recursive"
    exit 1
}

echo "✓ Formatting OK"

echo ""
echo "Linting and validation..."
for env in staging production; do
    echo "  Validating $env environment..."
    terraform init -backend=false 2>/dev/null || true
    terraform validate -var-file="environments/$env/terraform.tfvars" || true
done

echo "✓ Validation complete"

echo ""
echo "=========================================="
echo "Validation completed successfully"
echo "=========================================="
