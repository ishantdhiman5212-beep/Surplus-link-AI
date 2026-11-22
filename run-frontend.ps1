param([int]$Port = 3000)

$root = $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$node = Join-Path $root 'tools\node\node.exe'
$vite = Join-Path $frontend 'node_modules\vite\bin\vite.js'

if (-not (Test-Path $node)) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $node = $nodeCmd.Source
    } else {
        throw "Bundled Node runtime not found at $node and system node is not installed."
    }
}
if (-not (Test-Path $vite)) {
    throw "Vite installation not found at $vite"
}

Set-Location $frontend
& $node $vite --host 127.0.0.1 --port $Port
