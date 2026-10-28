$files = Get-ChildItem -Path "src" -Recurse -Filter "*.js"
foreach ($f in $files) {
    $text = Get-Content $f.FullName -Raw
    $openBrace = ([regex]::Matches($text, '\{')).Count
    $closeBrace = ([regex]::Matches($text, '\}')).Count
    $openParen = ([regex]::Matches($text, '\(')).Count
    $closeParen = ([regex]::Matches($text, '\)')).Count
    $openBracket = ([regex]::Matches($text, '\[')).Count
    $closeBracket = ([regex]::Matches($text, '\]')).Count
    Write-Host "$($f.Name): Braces: $openBrace/$closeBrace, Parens: $openParen/$closeParen, Brackets: $openBracket/$closeBracket"
}

$html = Get-Content "src\index.html" -Raw
$openDiv = ([regex]::Matches($html, '<div\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
$closeDiv = ([regex]::Matches($html, '</div>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
$openBtn = ([regex]::Matches($html, '<button\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
$closeBtn = ([regex]::Matches($html, '</button>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
$openScript = ([regex]::Matches($html, '<script\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
$closeScript = ([regex]::Matches($html, '</script>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
Write-Host "HTML tags: Divs: $openDiv/$closeDiv, Buttons: $openBtn/$closeBtn, Scripts: $openScript/$closeScript"

if ($html -match '(?s)<script type="module">(.*?)</script>') {
    $scriptBody = $matches[1]
    $sOpenBrace = ([regex]::Matches($scriptBody, '\{')).Count
    $sCloseBrace = ([regex]::Matches($scriptBody, '\}')).Count
    $sOpenParen = ([regex]::Matches($scriptBody, '\(')).Count
    $sCloseParen = ([regex]::Matches($scriptBody, '\)')).Count
    Write-Host "Inline Script: Braces: $sOpenBrace/$sCloseBrace, Parens: $sOpenParen/$sCloseParen"
}
$css = Get-Content "src\styles.css" -Raw
$cOpen = ([regex]::Matches($css, '\{')).Count
$cClose = ([regex]::Matches($css, '\}')).Count
Write-Host "CSS Braces: $cOpen / $cClose"
