variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "alert_emails" {
  type    = list(string)
  default = ["ops@aurabank.internal"]
}
