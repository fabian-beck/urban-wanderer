param(
	[string]$SourceRoot = "assets/originals/fact-backgrounds",
	[string]$TargetRoot = "static",
	[int]$Size = 320,
	[int]$Quality = 82
)

$ErrorActionPreference = "Stop"

$folders = @(
	"architecture-styles",
	"building-types",
	"materials"
)

Add-Type -AssemblyName System.Drawing

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
	Where-Object { $_.MimeType -eq "image/jpeg" } |
	Select-Object -First 1

if (-not $jpegCodec) {
	throw "No JPEG encoder available."
}

$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
	[System.Drawing.Imaging.Encoder]::Quality,
	[int64]$Quality
)

$totalInputBytes = 0L
$totalOutputBytes = 0L
$written = 0

foreach ($folder in $folders) {
	$sourceDir = Join-Path $SourceRoot $folder
	$targetDir = Join-Path $TargetRoot $folder

	if (-not (Test-Path -LiteralPath $sourceDir)) {
		throw "Source directory not found: $sourceDir"
	}

	New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

	Get-ChildItem -LiteralPath $sourceDir -Filter "*.png" -File | ForEach-Object {
		$sourceFile = $_
		$outputFileName = [System.IO.Path]::ChangeExtension($sourceFile.Name, ".jpg")
		$outputPath = Join-Path $targetDir $outputFileName

		$image = [System.Drawing.Image]::FromFile($sourceFile.FullName)
		$bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
		$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

		try {
			$graphics.Clear([System.Drawing.Color]::White)
			$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
			$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
			$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
			$graphics.DrawImage($image, 0, 0, $Size, $Size)
			$bitmap.Save($outputPath, $jpegCodec, $encoderParams)
		} finally {
			$graphics.Dispose()
			$bitmap.Dispose()
			$image.Dispose()
		}

		$totalInputBytes += $sourceFile.Length
		$totalOutputBytes += (Get-Item -LiteralPath $outputPath).Length
		$written += 1
	}
}

$inputMb = [math]::Round($totalInputBytes / 1MB, 2)
$outputMb = [math]::Round($totalOutputBytes / 1MB, 2)
$savedMb = [math]::Round(($totalInputBytes - $totalOutputBytes) / 1MB, 2)

Write-Host "Optimized $written fact background images."
Write-Host "Originals: $inputMb MB"
Write-Host "Optimized: $outputMb MB"
Write-Host "Saved: $savedMb MB"
