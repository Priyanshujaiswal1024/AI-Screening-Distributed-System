# ==============================================================================
# 09-eks-nodegroup.tf
# PURPOSE: Creates the EKS Managed Node Group (AWS Auto Scaling Group - ASG).
# Automatically launches the m7i-flex.large worker instance and connects it to EKS!
# ==============================================================================

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-node-group"
  node_role_arn   = aws_iam_role.eks_nodes.arn

  # Worker node runs in the secure Private Subnets
  subnet_ids = aws_subnet.private[*].id

  # EC2 Hardware Specification
  ami_type       = "AL2023_x86_64_STANDARD" # Amazon Linux 2023 required for EKS 1.30+
  instance_types = [var.node_instance_type] # m7i-flex.large (2 vCPU, 8 GB RAM)
  capacity_type  = "ON_DEMAND"
  disk_size      = 50 # 50 GB gp3 disk for Docker images & local embedding models

  # Auto Scaling Group (ASG) Configuration
  scaling_config {
    desired_size = var.node_desired_size # Starts with 1 node (Keeps cost minimal)
    min_size     = var.node_min_size     # Minimum 1 node
    max_size     = var.node_max_size     # Scales to 3 nodes during high screening load
  }

  # Zero-downtime rolling update configuration
  update_config {
    max_unavailable = 1
  }

  # Ensure worker node IAM permissions are fully active before launching
  depends_on = [
    aws_iam_role_policy_attachment.nodes_eks_worker,
    aws_iam_role_policy_attachment.nodes_ecr_read,
    aws_iam_role_policy_attachment.nodes_cni_policy,
    aws_iam_role_policy_attachment.nodes_ebs_policy
  ]

  tags = {
    Name = "${var.project_name}-worker-node"
  }
}
