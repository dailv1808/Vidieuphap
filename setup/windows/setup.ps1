# Cài toàn bộ công cụ dựng video vào ổ D (không cài gì vào ổ C).
# Chạy:  powershell -ExecutionPolicy Bypass -File D:\VidieuphapStudio\setup.ps1
param(
  [string]$Root = "D:\VidieuphapStudio",
  [string]$RepoUrl = "https://github.com/dailv1808/Vidieuphap.git",
  [string]$Branch = "claude/cool-tesla-4921i2"
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (-not (Test-Path ($Root.Substring(0, 3)))) { throw "Khong tim thay o dia $($Root.Substring(0,3))" }

$Tools = Join-Path $Root "tools"; $Cache = Join-Path $Root "cache"; $Tmp = Join-Path $Root "tmp"
New-Item -ItemType Directory -Force -Path $Root, $Tools, $Cache, $Tmp | Out-Null

# Mọi bộ nhớ đệm và file tạm đều nằm trên ổ D
$envVars = [ordered]@{
  TEMP = $Tmp; TMP = $Tmp
  npm_config_cache = "$Cache\npm"
  PLAYWRIGHT_BROWSERS_PATH = "$Tools\ms-playwright"
  UV_CACHE_DIR = "$Cache\uv"; UV_PYTHON_INSTALL_DIR = "$Tools\python"; UV_PYTHON_BIN_DIR = "$Tools\python-bin"; UV_TOOL_DIR = "$Tools\uv-tools"
  PIP_CACHE_DIR = "$Cache\pip"; HF_HOME = "$Cache\huggingface"; HF_HUB_DISABLE_XET = "1"; XDG_CACHE_HOME = $Cache
  KOKORO_DIR = "$Tools\kokoro"; FFMPEG = "ffmpeg"; PYTHONUTF8 = "1"
}
foreach ($k in $envVars.Keys) { Set-Item -Path "Env:$k" -Value $envVars[$k] }

function Get-Archive([string]$url, [string]$dest) {
  $name = [IO.Path]::GetFileName(($url -split '\?')[0])
  $zip = Join-Path $Tmp $name
  if (-not (Test-Path $zip)) { Write-Host "  Tai $name ..."; Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing }
  Write-Host "  Giai nen $name ..."
  Expand-Archive -Path $zip -DestinationPath $dest -Force
}

Write-Host "[1/7] Node.js (portable)"
$node = Join-Path $Tools "node"
if (-not (Test-Path "$node\node.exe")) {
  Get-Archive "https://nodejs.org/dist/v22.11.0/node-v22.11.0-win-x64.zip" $Tools
  Rename-Item (Join-Path $Tools "node-v22.11.0-win-x64") "node"
}

Write-Host "[2/7] ffmpeg (portable)"
$ff = Join-Path $Tools "ffmpeg"
if (-not (Test-Path "$ff\bin\ffmpeg.exe")) {
  Get-Archive "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" "$Tmp\ffmpeg_x"
  $inner = Get-ChildItem "$Tmp\ffmpeg_x" -Directory | Select-Object -First 1
  Move-Item $inner.FullName $ff
}

Write-Host "[3/7] Git (portable MinGit)"
$git = Join-Path $Tools "git"
if (-not (Test-Path "$git\cmd\git.exe")) { Get-Archive "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/MinGit-2.47.1-64-bit.zip" $git }

Write-Host "[4/7] uv + Python 3.12 (portable)"
$uvDir = Join-Path $Tools "uv"
if (-not (Test-Path "$uvDir\uv.exe")) { Get-Archive "https://github.com/astral-sh/uv/releases/download/0.5.11/uv-x86_64-pc-windows-msvc.zip" $uvDir }

$env:Path = "$node;$ff\bin;$git\cmd;$uvDir;$Root\venv\Scripts;" + $env:Path

& "$uvDir\uv.exe" python install 3.12
if (-not (Test-Path "$Root\venv\Scripts\python.exe")) { & "$uvDir\uv.exe" venv "$Root\venv" --python 3.12 }

Write-Host "[5/7] Lay ma nguon du an"
$repo = Join-Path $Root "Vidieuphap"
if (-not (Test-Path "$repo\tools\motion\render.js")) {
  Write-Host "  Neu repo la private, Git se hoi Username + Password: dung ten GitHub va mot Personal Access Token."
  & git clone --branch $Branch $RepoUrl $repo
  if ($LASTEXITCODE -ne 0) { throw "Clone that bai. Hay tai ZIP cua nhanh $Branch tren GitHub va giai nen vao $repo, roi chay lai script." }
} else {
  Push-Location $repo; if (Test-Path ".git") { & git pull --ff-only }; Pop-Location
}

Write-Host "[6/7] Thu vien Python (VieNeu-TTS, Kokoro, numpy, scipy...)"
& "$uvDir\uv.exe" pip install --python "$Root\venv\Scripts\python.exe" vieneu kokoro-onnx soundfile scipy numpy pillow soxr
New-Item -ItemType Directory -Force -Path $env:KOKORO_DIR | Out-Null
foreach ($f in "kokoro-v1.0.onnx", "voices-v1.0.bin") {
  $p = Join-Path $env:KOKORO_DIR $f
  if (-not (Test-Path $p)) { Write-Host "  Tai $f ..."; Invoke-WebRequest "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f" -OutFile $p -UseBasicParsing }
}

Write-Host "[7/7] Thu vien dung hinh (three.js, Playwright + Chromium)"
Push-Location "$repo\tools\motion"
& "$node\npm.cmd" install --no-audit --no-fund
& "$node\npx.cmd" playwright install chromium
Pop-Location

# File moi truong dung chung cho script render
$lines = @()
foreach ($k in $envVars.Keys) { $lines += "`$env:$k = '$($envVars[$k])'" }
$lines += "`$env:Path = '$node;$ff\bin;$git\cmd;$uvDir;$Root\venv\Scripts;' + `$env:Path"
Set-Content -Path (Join-Path $Root "env.ps1") -Value $lines -Encoding UTF8
Copy-Item "$repo\setup\windows\render-episode.ps1" $Root -Force

Write-Host ""
Write-Host "XONG. Tat ca nam trong $Root"
Write-Host "Render tap 2:  powershell -ExecutionPolicy Bypass -File $Root\render-episode.ps1 -Ep ep02"
