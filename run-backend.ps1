param([int]$Port = 8000)

$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$python = Join-Path $backend '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    throw "Python venv not found at $python"
}

Set-Location $backend
& $python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $Port
