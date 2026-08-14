# PowerShell script to stage and commit root directory cleanup and backup

git add root_legacy_backup/
git add App.tsx Dockerfile constants.ts index.html index.tsx nginx.conf types.ts vite.config.ts vitest.config.ts
git commit -m "refactor(root): move obsolete legacy root frontend files into root_legacy_backup folder for clean service isolation"

Write-Host "Root cleanup committed successfully!"
