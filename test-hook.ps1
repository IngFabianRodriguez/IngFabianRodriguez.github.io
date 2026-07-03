$content = git show ":blog/dia-92365-convolucion/index.html"
Write-Host "Length: $($content.Length)"
$pattern = '\$[^$]*\<code\>'
$matchesFound = [regex]::Matches($content, $pattern)
Write-Host "Matches: $($matchesFound.Count)"
foreach ($m in $matchesFound) {
    Write-Host "  Match index: $($m.Index), length: $($m.Length), value: $($m.Value)"
    Write-Host "  Content length: $($content.Length)"
    if ($m.Index -ge $content.Length) {
        Write-Host "  INDEX FUERA DE RANGO"
        continue
    }
    if ($m.Index -eq 0) {
        Write-Host "  Line: 1"
    } else {
        try {
            $upToMatch = $content.Substring(0, $m.Index)
            $lineNum = ([regex]::Matches($upToMatch, '\n')).Count + 1
            Write-Host "  Line: $lineNum"
        } catch {
            Write-Host "  Error: $($_.Exception.Message)"
        }
    }
}