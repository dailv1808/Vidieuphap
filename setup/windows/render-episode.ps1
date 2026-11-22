# Dựng trọn một tập: giọng đọc -> âm thanh -> hình 3D -> ghép -> thumbnail.
# Ví dụ:  powershell -ExecutionPolicy Bypass -File D:\VidieuphapStudio\render-episode.ps1 -Ep ep02
param(
  [string]$Ep = "ep02",
  [ValidateSet("vi", "en")][string]$Lang = "vi",
  [string]$Root = "D:\VidieuphapStudio",
  [int]$Workers = 3,
  [switch]$Cpu,
  [switch]$Pull
)
$ErrorActionPreference = "Stop"
. (Join-Path $Root "env.ps1")
$repo = Join-Path $Root "Vidieuphap"
Set-Location $repo
if ($Pull -and (Test-Path ".git")) { git pull --ff-only }

$work = "out/${Ep}_${Lang}_work"
$script = "scripts/$Lang/$Ep.md"
$sw = [Diagnostics.Stopwatch]::StartNew()
function Step($msg) { Write-Host ("[{0:mm\:ss}] {1}" -f $sw.Elapsed, $msg) -ForegroundColor Cyan }

Step "1/5 Giong doc ($Lang)"
python tools/tts_timeline.py $script $work
if ($LASTEXITCODE) { throw "TTS loi" }

Step "2/5 Hieu ung am thanh + nhac nen"
python tools/cues.py $Ep $work $Lang
python tools/audio_bed.py $work
if ($LASTEXITCODE) { throw "Am thanh loi" }

Step "3/5 Hinh 3D"
$args3d = @("tools/motion/render.js", "--ep", $Ep, "--lang", $Lang, "--tl", "$work/timeline.json", "--out", "$work/video.mp4", "--workers", "$Workers")
if ($Cpu) { $args3d += @("--cpu", "1") }
node @args3d
if ($LASTEXITCODE) { throw "Render hinh loi" }

Step "4/5 Ghep hinh + tieng"
$outMp4 = "out/${Ep}_${Lang}.mp4"
ffmpeg -loglevel error -y -i "$work/video.mp4" -i "$work/mix.wav" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $outMp4

Step "5/5 Thumbnail + dong goi (ten tap)"
$meta = Get-Content "tools/motion/$Ep.meta.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$num = [int]($Ep -replace '\D', '')
node tools/motion/render.js --ep $Ep --lang $Lang --tl "$work/timeline.json" --stills "$($meta.thumb.t)" --clean 1 --out "$work/thumb"
$still = Get-ChildItem "$work/thumb/*.png" | Select-Object -First 1
python tools/thumbnail.py $still.FullName "out/${Ep}_${Lang}_thumb.jpg" --title $meta.thumb.title.$Lang --sub $meta.thumb.sub.$Lang --ep $num --lang $Lang
$final = python tools/package_episode.py $Ep $Lang
Step "XONG: $final"
