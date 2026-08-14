variable "monthly_limit" {
  type    = string
  default = "150"
}

variable "alert_emails" {
  type    = list(string)
  default = ["ops@aurabank.internal"]
}
