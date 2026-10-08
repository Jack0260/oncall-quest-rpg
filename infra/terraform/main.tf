# On-Call RPG — full stack on AWS (reference)
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

provider "aws" { region = var.region }

variable "region" { default = "us-east-1" }
variable "backend_image" { description = "ECR image for backend/main.go" }

resource "aws_ecs_cluster" "rpg" { name = "oncall-rpg" }

resource "aws_ecs_task_definition" "backend" {
  family                   = "oncall-rpg-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  container_definitions = jsonencode([{
    name         = "backend"
    image        = var.backend_image
    portMappings = [{ containerPort = 8080 }]
  }, {
    name         = "prometheus"
    image        = "prom/prometheus:latest"
    portMappings = [{ containerPort = 9090 }]
  }])
}

resource "aws_s3_bucket" "frontend" { bucket_prefix = "oncall-rpg-web-" }

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  default_root_object = "index.html"
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "web"
  }
  default_cache_behavior {
    target_origin_id       = "web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }
  restrictions {
    geo_restriction { restriction_type = "none" }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}

output "web_url" { value = aws_cloudfront_distribution.web.domain_name }
