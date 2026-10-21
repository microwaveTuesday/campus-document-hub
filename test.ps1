$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:NODE_USE_SYSTEM_CA = '1'
New-Item -ItemType Directory -Force artifacts | Out-Null
Push-Location Client
npm.cmd ci
if ($LASTEXITCODE) { throw 'Dependency installation failed.' }
npm.cmd run build
if ($LASTEXITCODE) { throw 'Frontend build failed.' }
Pop-Location
dotnet build Api -warnaserror -p:RestoreLockedMode=true
if ($LASTEXITCODE) { throw 'Backend build failed.' }
python tests/run.py
if ($LASTEXITCODE) { throw 'Tests failed. Read the test output and artifacts/test-server.log.' }
