Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path "godot\assets" | Out-Null

# 1. Golf Ball (32x32)
$bmpBall = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmpBall)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(250, 252, 255))
$penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 200, 215), 1.5)
$g.FillEllipse($brushWhite, 2, 2, 28, 28)
$g.DrawEllipse($penBorder, 2, 2, 28, 28)
$brushShine = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 255, 255, 255))
$g.FillEllipse($brushShine, 7, 6, 8, 5)
$bmpBall.Save("godot\assets\ball.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmpBall.Dispose()

# 2. Ball Shadow (32x16)
$bmpShadow = New-Object System.Drawing.Bitmap 32, 16
$g = [System.Drawing.Graphics]::FromImage($bmpShadow)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushShadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(85, 0, 0, 0))
$g.FillEllipse($brushShadow, 2, 2, 28, 12)
$bmpShadow.Save("godot\assets\ball_shadow.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmpShadow.Dispose()

# 3. Cup (48x48)
$bmpCup = New-Object System.Drawing.Bitmap 48, 48
$g = [System.Drawing.Graphics]::FromImage($bmpCup)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushRim = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 255, 255, 255))
$brushHole = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 18, 30, 20))
$g.FillEllipse($brushRim, 2, 2, 44, 44)
$g.FillEllipse($brushHole, 5, 5, 38, 38)
$bmpCup.Save("godot\assets\cup.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmpCup.Dispose()

# 4. Flag (32x64)
$bmpFlag = New-Object System.Drawing.Bitmap 32, 64
$g = [System.Drawing.Graphics]::FromImage($bmpFlag)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$penPole = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 250, 250, 250), 3)
$brushFlag = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 230, 40, 40))
$g.DrawLine($penPole, 6, 4, 6, 60)
$pts = @(
    (New-Object System.Drawing.Point 8, 6),
    (New-Object System.Drawing.Point 30, 16),
    (New-Object System.Drawing.Point 8, 26)
)
$g.FillPolygon($brushFlag, $pts)
$bmpFlag.Save("godot\assets\flag.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmpFlag.Dispose()

# 5. Cartoon Car Sprite (96x52)
$bmpCar = New-Object System.Drawing.Bitmap 96, 52
$g = [System.Drawing.Graphics]::FromImage($bmpCar)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushBody = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 60, 60))
$brushRoof = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 210, 40, 40))
$brushWindow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 140, 215, 255))
$brushWheel = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 35, 35, 45))
$brushRim = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 200, 210, 220))
$brushLight = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 230, 80))

$g.FillRectangle($brushBody, 8, 22, 80, 18)
$ptsRoof = @(
    (New-Object System.Drawing.Point 24, 22),
    (New-Object System.Drawing.Point 38, 8),
    (New-Object System.Drawing.Point 68, 8),
    (New-Object System.Drawing.Point 78, 22)
)
$g.FillPolygon($brushRoof, $ptsRoof)
$ptsWin = @(
    (New-Object System.Drawing.Point 28, 21),
    (New-Object System.Drawing.Point 40, 11),
    (New-Object System.Drawing.Point 64, 11),
    (New-Object System.Drawing.Point 73, 21)
)
$g.FillPolygon($brushWindow, $ptsWin)
$g.FillRectangle($brushLight, 84, 24, 6, 8)
$g.FillEllipse($brushWheel, 16, 32, 18, 18)
$g.FillEllipse($brushRim, 20, 36, 10, 10)
$g.FillEllipse($brushWheel, 62, 32, 18, 18)
$g.FillEllipse($brushRim, 66, 36, 10, 10)

$bmpCar.Save("godot\assets\car.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmpCar.Dispose()
Write-Host "Generated Godot Assets Successfully!"
