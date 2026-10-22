# ==============================================================================
# 07-ecr.tf
# PURPOSE: Creates the 12 Private ECR Repositories for all microservices & frontend.
# Includes automatic security scanning and cleanup lifecycle rules to save cost.
# ==============================================================================

resource "aws_ecr_repository" "services" {
  for_each             = toset(var.services)
  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  # Automatic vulnerability scan whenever Jenkins pushes a new Docker image
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = "${var.project_name}-${each.key}"
    Service = each.key
  }
}

# Lifecycle Policy: Automatically deletes old untagged/dangling images
# Keeps only the last 10 builds so you don't pay for unused storage!
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
