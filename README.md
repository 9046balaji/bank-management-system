# 🏦 AuraBank — Full-Stack Digital Banking Platform

<div align="center">

![AuraBank Banner](https://img.shields.io/badge/AURA-BANK-135bec?style=for-the-badge&logo=bank)

**A modern, full-stack digital banking & fintech application with real-time money transfers, AI-powered loan risk scoring, card management, smart expense categorization, and an administrative command center.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

[✨ Features](#-key-features) • [🛠️ Tech Stack](#️-tech-stack) • [🚀 Quick Start](#-quick-start) • [🎓 Student Journey](#-student-developer-journey) • [⚙️ DevOps Docs](#️-looking-for-devops--sre-details)

</div>

---

## 🌟 Hello World! Welcome to AuraBank 👋

Hi there! Welcome to **AuraBank**. 

I built this project to challenge myself to create a **complete, end-to-end digital banking system** that looks and feels like a real commercial banking platform (think Revolut or Chase). It combines a sleek modern user interface with a robust backend, real-time transaction processing, automated AI loan evaluation, and full observability.

Whether you're a recruiter, student, or developer exploring full-stack engineering, I hope this project gives you a great look into how modern banking software works!

---

## ✨ Key Features (What You Can Do)

### 👤 Customer Experience
* **💳 Account & Card Management**: View checking and savings balances, generate instant virtual credit/debit cards, set custom spending limits, or freeze cards with one tap.
* **💸 Fast & Safe Money Transfers**: Send money to other AuraBank users or external banks with instant receipt generation and idempotency checks to prevent double-charging.
* **🤖 AI-Powered Loan Approval**: Apply for personal loans and get instant eligibility decisions computed by our machine learning risk model.
* **📊 Smart Expense Analytics**: Transactions are automatically labeled (e.g. *Shopping*, *Dining*, *Utilities*) using a Scikit-Learn machine learning classifier.
* **💬 AI Financial Support Chatbot**: Ask questions about your balance, get financial advice, or raise customer support tickets.

### 🛡️ Admin Management Console
* **📈 Executive Command Dashboard**: Real-time overview of total deposits, user sign-ups, and transaction volumes.
* **✍️ Application Review Desk**: Review and approve/reject pending loan applications and credit card limit increases based on AI risk scores.
* **🔎 Live Surveillance & Fraud Monitoring**: Search any transaction by reference ID, inspect fraud probability scores, and monitor flag status.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, TailwindCSS, Vite, Lucide Icons, Recharts |
| **Backend API** | Node.js, Express, TypeScript, REST APIs |
| **Database & Cache** | PostgreSQL 15 (SQL Schema & Ledger), Redis 7 (Caching & Session Lock) |
| **AI & ML Engine** | Python 3.11, Flask, XGBoost, Scikit-Learn, Pandas, Gunicorn |
| **DevOps & Infra** | Docker, Docker Compose, Nginx, Prometheus, Grafana, Jaeger, Loki |

---

## 🚀 Quick Start (Run Locally in 3 Steps!)

You don't need to install Node, Python, or PostgreSQL locally. Everything is containerized with Docker!

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1️⃣ Step 1: Clone the Repository
```bash
git clone https://github.com/9046balaji/bank-management-system.git
cd "bank management system"
```

### 2️⃣ Step 2: Start the Application
On Windows, double-click **`start-project.bat`** or run:
```bash
docker compose up -d --build
```

### 3️⃣ Step 3: Open in Browser
Once containers are running, open your browser:
* 🌐 **Main App**: [http://localhost:3000](http://localhost:3000)

> 💡 **Tip**: You can register a new account directly in the app or log in with any test credentials!

---

## 💻 Local Port Map & Services

When you run the project, the following services are automatically started for you:

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **AuraBank Web App** | `http://localhost:3000` | Main User & Admin Banking Portal |
| **Backend API** | `http://localhost:5000` | Express REST API Backend |
| **AI Risk Engine** | `http://localhost:5001` | Python Machine Learning Service |
| **Grafana Monitoring** | `http://localhost:3001` | System & Metric Dashboards (`admin`/`admin`) |
| **Kafka UI** | `http://localhost:8090` | Event Stream Visualizer (`admin`/`aurabank_kafka_ui_2026`) |
| **Jaeger Tracing** | `http://localhost:16686` | Distributed Request Tracing |
| **Prometheus** | `http://localhost:9090` | Metrics Collection Browser |

---

## 🎓 Student Developer Journey & What I Learned

Building AuraBank was an incredible learning experience that helped me master:

1. **Double-Entry Accounting Mechanics**: Designing a mathematical zero-sum ledger balance system ($\text{DEBIT} + \text{CREDIT} = 0$) to ensure money is never created or destroyed out of nowhere.
2. **Microservices Communication**: Connecting a Node.js API with a Python ML Service for real-time risk predictions using fallback circuit breakers.
3. **Idempotency & Race Conditions**: Using Redis and PostgreSQL unique constraints to prevent double-charging when users click "Send Money" multiple times quickly.
4. **Full-Stack Type Safety**: Sharing TypeScript interfaces across React components and Express controllers.
5. **Observability & SRE**: Setting up Prometheus metrics, Grafana dashboards, and Jaeger traces to inspect system performance like a DevOps engineer!

---

## ⚙️ Looking for DevOps & SRE Details?

If you are a DevOps Engineer, SRE, or Architect looking for in-depth technical documentation about our Kubernetes manifests, Terraform IaC, Kafka KRaft streams, OpenTelemetry tail-sampling, or GitOps pipelines:

👉 **Check out the full [DEVOPS_ENGINEERING.md](DEVOPS_ENGINEERING.md) blueprint!**

---

<div align="center">

Made with ❤️ and lots of ☕ by **[@9046balaji](https://github.com/9046balaji)**

*Feel free to star ⭐ this repository if you found it helpful!*

</div>
