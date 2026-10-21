$ErrorActionPreference = 'Stop'
$env:NODE_USE_SYSTEM_CA = '1'
Set-Location -LiteralPath $PSScriptRoot
if (!(Test-Path 'Client/node_modules')) { Push-Location Client; npm.cmd ci; if ($LASTEXITCODE) { throw 'Dependency installation failed.' }; Pop-Location }
Push-Location Client
npm.cmd run build
if ($LASTEXITCODE) { throw 'Frontend build failed.' }
Pop-Location
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project Api --no-launch-profile --urls http://127.0.0.1:5080
