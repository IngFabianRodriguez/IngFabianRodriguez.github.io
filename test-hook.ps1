$ErrorActionPreference = 'Stop'

# Debug: que devuelve git diff --cached
Write-Host "=== Staged files (todos) ==="
git diff --cached --name-only

Write-Host ""
Write-Host "=== Staged files del blog ==="
$stagedFiles = git diff --cached --name-only --diff-filter=ACM | Where-Object { $_ -like 'blog\*' }
Write-Host "Count: $($stagedFiles.Count)"
foreach ($f in $stagedFiles) { Write-Host "  - $f" }

Write-Host ""
Write-Host "=== git show del archivo ==="
$content = git show ":blog/dia-84365-layer-normalization/index.html"
Write-Host "Length: $($content.Length)"
Write-Host "Tiene el bug: $($content -like '*$<code>*')"

Write-Host ""
Write-Host "=== Aplicando regex ==="
$pattern = '\$[^$]*\<code\>'
$m = [regex]::Matches($content, $pattern)
Write-Host "Matches: $($m.Count)"

if ($m.Count -gt 0) {
    Write-Host "DEBERIA DETECTAR BUG"
    exit 1
} else {
    Write-Host "No se detecta bug"
    exit 0
}