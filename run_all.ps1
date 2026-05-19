#!/usr/bin/env pwsh
# run_all.ps1 — Start all Progrix services
# Usage: .\run_all.ps1

Write-Host "Starting Progrix services..." -ForegroundColor Cyan

# Resolve Ollama path (installed per-user on Windows)
$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaExe)) { $ollamaExe = "ollama" }

# Models live on D drive
$env:OLLAMA_MODELS = "D:\OllamaModels\models"

# 1. Ollama — kill any stale instance first, then start fresh
Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden -PassThru | Out-Null
Write-Host "  OK Ollama serving on http://localhost:11434 (models: $env:OLLAMA_MODELS)" -ForegroundColor Green

# 2. Python AI Gateway
Start-Process -NoNewWindow -FilePath "cmd" -ArgumentList "/c", `
  "cd /d `"$PSScriptRoot\python`" && .\venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8080 --reload" `
  -PassThru | Out-Null
Write-Host "  ✅ Python AI Gateway on http://localhost:8080" -ForegroundColor Green

# 3. Backend
Start-Process -NoNewWindow -FilePath "cmd" -ArgumentList "/c", `
  "cd /d `"$PSScriptRoot\backend`" && npm run dev" `
  -PassThru | Out-Null
Write-Host "  ✅ Backend API on http://localhost:5000" -ForegroundColor Green

# 4. Frontend
Start-Process -NoNewWindow -FilePath "cmd" -ArgumentList "/c", `
  "cd /d `"$PSScriptRoot\frontend`" && npm run dev" `
  -PassThru | Out-Null
Write-Host "  ✅ Frontend on http://localhost:3000" -ForegroundColor Green

Write-Host ""
Write-Host "All services started. Open http://localhost:3000" -ForegroundColor Yellow
