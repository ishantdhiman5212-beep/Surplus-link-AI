$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$reference = Join-Path $root 'reference'
$python = Join-Path $backend '.venv\Scripts\python.exe'
$node = Join-Path $root 'tools\node\node.exe'
if (-not (Test-Path $node)) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $node = $nodeCmd.Source
    } else {
        throw "Bundled Node runtime not found at $node and system node is not installed."
    }
}

$requiredSources = @(
    'builders-theory\lib\src\services\matching_scorer.dart',
    'builders-theory\lib\src\endpoints\matching_endpoint.dart',
    'surpluslink-v2\ai_extraction.py',
    'surpluslink-v2\extraction_routes.py',
    'flask-volunteer-qr\volunteer_qr.py',
    'flask-volunteer-qr\test_volunteer.py'
)

Write-Host '== Source snapshots ==' -ForegroundColor Cyan
foreach ($source in $requiredSources) {
    $path = Join-Path $reference $source
    if (-not (Test-Path $path)) {
        throw "Missing reference source: $path"
    }
}
Write-Host 'All original sources are present.'

Push-Location $backend
try {
    Write-Host '== Backend tests ==' -ForegroundColor Cyan
    & $python -m pytest -q
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }

    Write-Host '== Frontend type-check ==' -ForegroundColor Cyan
    Set-Location $frontend
    & $node '.\node_modules\typescript\bin\tsc' --noEmit
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed.' }

    Write-Host '== Frontend production build ==' -ForegroundColor Cyan
    & $node '.\node_modules\vite\bin\vite.js' build
    if ($LASTEXITCODE -ne 0) { throw 'Vite build failed.' }

    Write-Host 'All checks passed.' -ForegroundColor Green
}
finally {
    Pop-Location
}
