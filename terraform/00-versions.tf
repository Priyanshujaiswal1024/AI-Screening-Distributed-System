# ==============================================================================
# 00-versions.tf
# PURPOSE: Defines the Terraform version and required cloud providers (AWS).
# ==============================================================================

terraform {
  # Minimum Terraform CLI version required
  required_version = ">= 1.5.0"

  required_providers {
    # Official AWS Provider from HashiCorp
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider connection
provider "aws" {
  region = var.aws_region

  # Default tags automatically applied to EVERY resource created in AWS
  default_tags {
    tags = {
      Project     = "TalentIQ-AI-Screening"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}
