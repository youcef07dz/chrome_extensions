Add-Type -AssemblyName System.Drawing

$width = 128
$height = 128
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($width, $height)),
    [System.Drawing.Color]::FromArgb(74, 144, 217),
    [System.Drawing.Color]::FromArgb(53, 122, 189)
)

$graphics.FillRectangle($brush, 0, 0, $width, $height)

$font = New-Object System.Drawing.Font("Arial", 36, [System.Drawing.FontStyle]::Bold)
$whiteBrush = [System.Drawing.Brushes]::White
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

$graphics.DrawString("Aa", $font, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 10, $width, 60)), $stringFormat)

$font2 = New-Object System.Drawing.Font("Consolas", 18)
$graphics.DrawString("文", $font2, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 55, $width, 40)), $stringFormat)

$iconPath = Join-Path $PSScriptRoot "icon.png"
$bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$font.Dispose()
$font2.Dispose()

Write-Host "Icon created successfully at: $iconPath"
