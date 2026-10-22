# ==============================================================================
# 06-iam.tf
# PURPOSE: CONSOLIDATED IAM ROLES - One single place for all permissions!
# Covers: 1) EKS Master Control Plane, 2) Worker Nodes (ECR/S3 access),
# and 3) OIDC provider for AWS Load Balancer Controller.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. IAM Role for EKS Cluster Control Plane (Master Node)
# ------------------------------------------------------------------------------
resource "aws_iam_role" "eks_cluster" {
  name = "${var.project_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach standard Amazon EKS Cluster Policy
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# ------------------------------------------------------------------------------
# 2. IAM Role for EKS Worker Nodes (m7i-flex.large)
# ------------------------------------------------------------------------------
resource "aws_iam_role" "eks_nodes" {
  name = "${var.project_name}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# 2a. Permission for Worker Nodes to join the EKS cluster
resource "aws_iam_role_policy_attachment" "nodes_eks_worker" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

# 2b. Permission to PULL Docker images from Amazon ECR!
resource "aws_iam_role_policy_attachment" "nodes_ecr_read" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# 2c. Permission for AWS VPC CNI (Gives each pod a VPC IP)
resource "aws_iam_role_policy_attachment" "nodes_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

# 2d. Permission for EBS CSI Driver (Mounts persistent disks for Postgres/Kafka)
resource "aws_iam_role_policy_attachment" "nodes_ebs_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.eks_nodes.name
}

# 2e. S3 Access for resume upload/download to talent-intelligence-resumes-2026
resource "aws_iam_policy" "s3_resumes_policy" {
  name        = "${var.project_name}-s3-resumes-policy"
  description = "Allows pods to upload and read resume PDFs from S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::talent-intelligence-resumes-2026",
          "arn:aws:s3:::talent-intelligence-resumes-2026/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "nodes_s3_attach" {
  policy_arn = aws_iam_policy.s3_resumes_policy.arn
  role       = aws_iam_role.eks_nodes.name
}

# ------------------------------------------------------------------------------
# 3. OIDC Provider (Allows Kubernetes Service Accounts to assume IAM Roles - IRSA)
# ------------------------------------------------------------------------------
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}
