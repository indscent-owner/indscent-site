$root = 'https://indscent.pages.dev'
$dest = 'C:\indscent-site\cloudflare-live-backup'

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$queue = [System.Collections.Generic.Queue[string]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new()
$queue.Enqueue($root)

while ($queue.Count -gt 0) {
    $url = $queue.Dequeue()
    if (-not $seen.Add($url)) { continue }

    $uri = [System.Uri]$url
    $path = $uri.AbsolutePath
    if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') {
        $path = '/index.html'
    }

    $rel = $path.TrimStart('/')
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $rel = $rel.Split('?')[0]

    $file = Join-Path $dest $rel
    $dir = Split-Path $file -Parent
    if ($dir) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    try {
        Write-Host "Downloading $url"
        Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $file -TimeoutSec 30 | Out-Null
    }
    catch {
        Write-Warning "Failed: $url"
        continue
    }

    $content = Get-Content -Path $file -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    $matches = [regex]::Matches($content, '(?:href|src)="([^"]+)"')
    foreach ($match in $matches) {
        $trimmed = $match.Groups[1].Value.Trim()
        if ($trimmed -match '^(javascript:|mailto:|tel:|data:|#)') { continue }

        $next = $trimmed
        if ($next.StartsWith('/')) {
            $next = $root.TrimEnd('/') + $next
        }
        elseif (-not $next.StartsWith('http')) {
            $next = [System.Uri]::new([System.Uri]$url, $next).ToString()
        }

        $host = [System.Uri]$next
        if ($host.Host -ne 'indscent.pages.dev' -and $host.Host -ne 'www.indscent.pages.dev') {
            continue
        }

        if (-not $seen.Contains($next)) {
            $queue.Enqueue($next)
        }
    }
}

Write-Host "Backup complete: $dest"
Get-ChildItem $dest -Recurse | Measure-Object | Select-Object -ExpandProperty Count
