// Jenkinsfile — AuraBank Platform CI/CD Declarative Pipeline
pipeline {
    agent any

    environment {
        REGISTRY = 'ghcr.io'
        IMAGE_PREFIX = '9046balaji/bank-management-system'
        DOCKER_CREDENTIALS_ID = 'github-ghcr-token'
        NODE_ENV = 'production'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    stages {
        // ── Stage 1: Checkout ──────────────────────────────────────────
        stage('Checkout Code') {
            steps {
                echo '📥 Checking out repository source code...'
                checkout scm
            }
        }

        // ── Stage 2: Linting & Code Quality ─────────────────────────────
        stage('Linting & Schema Validation') {
            parallel {
                stage('Protobuf Lint') {
                    steps {
                        echo '🔍 Linting Protobuf schemas...'
                        sh 'buf lint proto/'
                    }
                }
                stage('OpenAPI Spectral Lint') {
                    steps {
                        echo '🔍 Linting OpenAPI REST specifications...'
                        sh 'npx @stoplight/spectral-cli@6.11.1 lint openapi/*.yaml --ruleset openapi/.spectral.yaml'
                    }
                }
                stage('Helm Chart Lint') {
                    steps {
                        echo '🔍 Linting Helm Kubernetes charts...'
                        sh '''
                            if [ -d "helm" ]; then
                                for chart in helm/*/; do
                                    if [ -f "$chart/Chart.yaml" ]; then
                                        echo "Linting $chart"
                                        helm lint $chart
                                    fi
                                done
                            fi
                        '''
                    }
                }
            }
        }

        // ── Stage 3: Automated Unit Testing ─────────────────────────────
        stage('Run Unit Test Suites') {
            parallel {
                stage('Backend Unit Tests (Node.js)') {
                    steps {
                        echo '🧪 Running Backend REST API test suite...'
                        dir('backend') {
                            sh 'npm ci --legacy-peer-deps'
                            sh 'npm test'
                        }
                    }
                }
                stage('AI Service Unit Tests (Python)') {
                    steps {
                        echo '🧪 Running AI/ML Risk Engine pytest suite...'
                        dir('ai-service') {
                            sh 'pip install --no-cache-dir -r requirements.txt'
                            sh 'pytest tests/ --cov'
                        }
                    }
                }
            }
        }

        // ── Stage 4: Docker Image Build (Parallel) ───────────────────────
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        echo '🐳 Building Backend multi-stage image...'
                        dir('backend') {
                            sh 'docker build -t aurabank-backend:jenkins-build .'
                        }
                    }
                }
                stage('Build AI Service Image') {
                    steps {
                        echo '🐳 Building AI Service multi-stage image...'
                        dir('ai-service') {
                            sh 'docker build -t aurabank-ai-service:jenkins-build .'
                        }
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        echo '🐳 Building Frontend Nginx image...'
                        dir('frontend') {
                            sh 'docker build -t aurabank-frontend:jenkins-build .'
                        }
                    }
                }
            }
        }

        // ── Stage 5: Security Vulnerability Scan ────────────────────────
        stage('Container Security Scan (Trivy)') {
            steps {
                echo '🛡️ Running Trivy vulnerability scan on built images...'
                sh 'trivy image --severity HIGH,CRITICAL --exit-code 0 aurabank-backend:jenkins-build || true'
            }
        }

        // ── Stage 6: Publish Images to GHCR ─────────────────────────────
        stage('Publish Images to Registry') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Logging into GitHub Container Registry (GHCR)...'
                withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_TOKEN')]) {
                    sh 'echo "$GHCR_TOKEN" | docker login $REGISTRY -u $GHCR_USER --password-stdin'
                    sh "docker tag aurabank-backend:jenkins-build ${REGISTRY}/${IMAGE_PREFIX}-backend:latest"
                    sh "docker tag aurabank-ai-service:jenkins-build ${REGISTRY}/${IMAGE_PREFIX}-ai-service:latest"
                    sh "docker tag aurabank-frontend:jenkins-build ${REGISTRY}/${IMAGE_PREFIX}-frontend:latest"
                    sh "docker push ${REGISTRY}/${IMAGE_PREFIX}-backend:latest"
                    sh "docker push ${REGISTRY}/${IMAGE_PREFIX}-ai-service:latest"
                    sh "docker push ${REGISTRY}/${IMAGE_PREFIX}-frontend:latest"
                }
            }
        }

        // ── Stage 7: Deploy Environment ──────────────────────────────────
        stage('Trigger Environment Deployment') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying container stack to target environment...'
                sh 'docker compose -f docker-compose.local.yaml up -d --build'
            }
        }
    }

    // ── Post Actions ───────────────────────────────────────────────────
    post {
        always {
            echo '🧹 Cleaning up dangling Docker build artifacts...'
            sh 'docker image prune -f --filter "until=24h" || true'
        }
        success {
            echo '✅ Jenkins Pipeline Completed Successfully!'
        }
        failure {
            echo '❌ Jenkins Pipeline Failed! Check log tracebacks above.'
        }
    }
}
