# ==============================================================================
# 10-outputs.tf
# PURPOSE: Prints all important IDs, URLs, and commands to your terminal
# immediately after `terraform apply` finishes!
# ==============================================================================

# 1. EKS Cluster Name
output "eks_cluster_name" {
  description = "Name of the EKS Cluster"
  value       = aws_eks_cluster.main.name
}

# 2. EKS Cluster Endpoint
output "eks_cluster_endpoint" {
  description = "Kubernetes API server endpoint"
  value       = aws_eks_cluster.main.endpoint
}

# 3. AWS Region
output "aws_region" {
  description = "Deployed AWS Region"
  value       = var.aws_region
}

# 4. VPC ID
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

# 5. Connect Kubectl Command (Run this to connect your terminal to EKS!)
output "configure_kubectl_command" {
  description = "Copy and run this command to connect kubectl to your new EKS cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}

# 6. ECR Repository URLs (For Jenkins / Docker to push images)
output "ecr_repository_urls" {
  description = "List of all 12 ECR repository URLs for pushing Docker images"
  value = {
    for svc, repo in aws_ecr_repository.services : svc => repo.repository_url
  }
}
