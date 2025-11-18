#!/bin/bash
# Format Terraform Code

set -e

cd "$(dirname "$0")/../terraform"

echo "Formatting Terraform code..."
terraform fmt -recursive -check=false

echo "✓ Formatting complete"
