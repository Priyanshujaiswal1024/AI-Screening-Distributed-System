# ==============================================================================
# 08-eks-cluster.tf
# PURPOSE: Creates the Amazon EKS Kubernetes Control Plane (The Brain/Master Node).
# ==============================================================================

resource "aws_eks_cluster" "main" {
  name     = "${var.project_name}-eks-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.eks_version

  vpc_config {
    # Place cluster across both public and private subnets
    subnet_ids = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)

    # Allows kubectl access from your laptop (public) and internal nodes (private)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  # Ensure IAM Role permissions are active BEFORE launching the cluster
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  tags = {
    Name = "${var.project_name}-eks-cluster"
  }
}
