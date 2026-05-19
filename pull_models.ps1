$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:OLLAMA_MODELS = "D:\OllamaModels\models"

$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaExe)) { $ollamaExe = "ollama" }
Set-Alias -Name ollama -Value $ollamaExe -Scope Script

$models = @(
    "qwen2.5-coder:7b",
    "deepseek-coder-v2",
    "codellama:13b",
    "codegemma:7b",
    "starcoder2:7b",
    "llama3.1:8b",
    "llama3.2:3b",
    "mistral:7b",
    "phi4-mini",
    "gemma3:4b"
)

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Progrix - Pulling Free Ollama Models to D: drive   " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$total = $models.Count
$i = 0

foreach ($model in $models) {
    $i++
    Write-Host "[$i/$total] Pulling: $model" -ForegroundColor Green
    ollama pull $model
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: $model" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: $model - skipping" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Done! Installed models:" -ForegroundColor Cyan
ollama list
