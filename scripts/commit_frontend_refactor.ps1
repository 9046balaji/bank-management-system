# PowerShell script to commit frontend directory migration cleanly

git add frontend/
git commit -m "refactor(frontend): relocate views, components, and React SPA files into dedicated frontend/ service directory"

git add components/ views/ docker-compose.local.yaml
git commit -m "refactor(docker): update docker-compose.local.yaml to build frontend from ./frontend service directory"

Write-Host "Frontend migration commits completed successfully!"
