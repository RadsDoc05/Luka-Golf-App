param(
    [int]$Port = 8090,
    [string]$Root = (Get-Location).Path
)

$tcpListener = $null
$boundPort = $Port
foreach ($candidatePort in @($Port, 8090, 8088, 8080, 8085)) {
    try {
        $tcpListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $candidatePort)
        $tcpListener.Start()
        $boundPort = $candidatePort
        break
    } catch {
        $tcpListener = $null
    }
}

if (-not $tcpListener) {
    Write-Error "Could not bind TCP listener on ports $Port, 8090, 8088, 8080, or 8085."
    exit 1
}

$lanIp = "192.168.12.205"
try {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' } |
        Select-Object -ExpandProperty IPAddressToString
    if ($ips) {
        $lanIp = ($ips | Select-Object -First 1)
    }
} catch {}

Write-Host "================================================================"
Write-Host "Luka Golf Adventure Server Running!"
Write-Host "  Desktop URL : http://localhost:$boundPort/"
Write-Host "  Phone Wi-Fi : http://${lanIp}:$boundPort/"
Write-Host "================================================================"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".mp3"  = "audio/mpeg"
    ".ogg"  = "audio/ogg"
    ".wav"  = "audio/wav"
}

$fullRoot = [System.IO.Path]::GetFullPath($Root)
$fullSrcRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, "src"))
$voiceDir = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, "assets\audio\voice"))
if (-not [System.IO.Directory]::Exists($voiceDir)) {
    [System.IO.Directory]::CreateDirectory($voiceDir) | Out-Null
}

$webClient = New-Object System.Net.WebClient
$webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

function Send-HttpResponse {
    param(
        [System.IO.Stream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$BodyBytes,
        [string]$CacheControl = "no-store, no-cache, must-revalidate",
        [bool]$IsHead = $false
    )
    $len = if ($BodyBytes) { $BodyBytes.Length } else { 0 }
    $headerBuilder = New-Object System.Text.StringBuilder
    [void]$headerBuilder.Append("HTTP/1.1 $StatusCode $StatusText`r`n")
    [void]$headerBuilder.Append("Content-Type: $ContentType`r`n")
    [void]$headerBuilder.Append("Content-Length: $len`r`n")
    [void]$headerBuilder.Append("Cache-Control: $CacheControl`r`n")
    [void]$headerBuilder.Append("Access-Control-Allow-Origin: *`r`n")
    [void]$headerBuilder.Append("Connection: close`r`n`r`n")

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerBuilder.ToString())
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $IsHead -and $len -gt 0) {
        $Stream.Write($BodyBytes, 0, $len)
    }
    $Stream.Flush()
}

try {
    while ($true) {
        $client = $tcpListener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 4000
            $client.SendTimeout = 8000
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            # Drain headers
            while ($true) {
                $hLine = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($hLine)) { break }
            }

            $parts = $requestLine -split ' '
            if ($parts.Length -lt 2) {
                $client.Close()
                continue
            }
            $method = $parts[0].ToUpper()
            $isHead = ($method -eq "HEAD")
            $fullPathAndQuery = $parts[1]

            $rawUrl = $fullPathAndQuery
            $queryString = ""
            if ($fullPathAndQuery.Contains("?")) {
                $qIdx = $fullPathAndQuery.IndexOf("?")
                $rawUrl = $fullPathAndQuery.Substring(0, $qIdx)
                $queryString = $fullPathAndQuery.Substring($qIdx + 1)
            }

            # 1. Dynamic Hybrid Neural TTS Endpoint (/api/tts)
            if ($rawUrl -eq "/api/tts") {
                $params = @{}
                foreach ($part in ($queryString -split '&')) {
                    if ($part -match '^([^=]+)=(.*)$') {
                        $params[$matches[1]] = [System.Uri]::UnescapeDataString($matches[2].Replace('+', ' '))
                    }
                }
                $text = $params["text"]
                $key  = $params["key"]
                if ([string]::IsNullOrWhiteSpace($key) -and -not [string]::IsNullOrWhiteSpace($text)) {
                    $key = ($text.ToLower() -replace '[^a-z0-9]+', '_').Trim('_')
                    if ($key.Length -gt 48) { $key = $key.Substring(0, 48) }
                }
                $safeKey = ($key -replace '[^a-zA-Z0-9_\-]', '')
                $mp3Path = [System.IO.Path]::Combine($voiceDir, "$safeKey.mp3")

                if (-not [System.IO.File]::Exists($mp3Path) -and -not [string]::IsNullOrWhiteSpace($text)) {
                    $encodedText = [System.Uri]::EscapeDataString($text)
                    $ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=$encodedText"
                    try {
                        $audioBytes = $webClient.DownloadData($ttsUrl)
                        if ($audioBytes -and $audioBytes.Length -gt 500) {
                            [System.IO.File]::WriteAllBytes($mp3Path, $audioBytes)
                        }
                    } catch {}
                }

                if ([System.IO.File]::Exists($mp3Path)) {
                    $fileBytes = [System.IO.File]::ReadAllBytes($mp3Path)
                    Send-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType "audio/mpeg" -BodyBytes $fileBytes -CacheControl "public, max-age=31536000" -IsHead $isHead
                } else {
                    $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Audio Not Found")
                    Send-HttpResponse -Stream $stream -StatusCode 404 -StatusText "Not Found" -ContentType "text/plain" -BodyBytes $notFoundBytes -IsHead $isHead
                }
                $client.Close()
                continue
            }

            if ($rawUrl -eq "/" -or $rawUrl -eq "/index.html" -or [string]::IsNullOrWhiteSpace($rawUrl)) {
                $rawUrl = "/src/index.html"
            }

            $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl.TrimStart('/'))
            $targetFile = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($fullRoot, $decodedUrl))

            if (-not [System.IO.File]::Exists($targetFile)) {
                $srcCandidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($fullSrcRoot, $decodedUrl))
                if ($srcCandidate.StartsWith($fullSrcRoot) -and [System.IO.File]::Exists($srcCandidate)) {
                    $targetFile = $srcCandidate
                }
            }

            if (-not $targetFile.StartsWith($fullRoot)) {
                $forbBytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                Send-HttpResponse -Stream $stream -StatusCode 403 -StatusText "Forbidden" -ContentType "text/plain" -BodyBytes $forbBytes -IsHead $isHead
                $client.Close()
                continue
            }

            if ([System.IO.File]::Exists($targetFile)) {
                $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
                $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)
                Send-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType $mime -BodyBytes $fileBytes -IsHead $isHead
            } else {
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found: $rawUrl")
                Send-HttpResponse -Stream $stream -StatusCode 404 -StatusText "Not Found" -ContentType "text/plain; charset=utf-8" -BodyBytes $errBytes -IsHead $isHead
            }
        } catch {
            # Ignore client socket disconnects
        } finally {
            try { $client.Close() } catch {}
        }
    }
} finally {
    if ($tcpListener) {
        $tcpListener.Stop()
    }
}
