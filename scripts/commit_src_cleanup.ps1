# PowerShell script to commit src directory cleanup and backup

git add src_legacy_backup/ docker-compose.local.yaml
git add -A src/
git commit -m "refactor(src): relocate legacy monolithic frontend folders from src/ into src_legacy_backup and configure backend JWT_REFRESH_SECRET"

Write-Host "Src cleanup committed successfully!"
