# Build the author bundle from an explicit file list and refresh the existing theme ZIP.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$bundlePath = Join-Path $projectRoot 'prototypes/Home/Stats-Cards.zip'
$themePath = Join-Path $projectRoot 'THeme/UnionSuite.zip'
foreach ($target in @($bundlePath, $themePath)) {
    if (-not ([System.IO.Path]::GetFullPath($target).StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase))) { throw 'Archive must remain inside this project.' }
}
function Write-Archive($destination, $files) {
    $temporary = $destination + '.new'
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
    $archive = [System.IO.Compression.ZipFile]::Open($temporary, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $projectRoot $file.Source), $file.Entry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $archive.Dispose() }
    Move-Item -LiteralPath $temporary -Destination $destination -Force
}
$cards = @('Heading-Content.html', 'Tracker-Bar-Content.html', 'Trend-Placeholder-Content.html', 'Financial-Status-Content.html', 'Group-Breakdown-Content.html', 'Category-Breakdown-Content.html')
$files = @(@{Source='prototypes/Home/Stats/README.md';Entry='README.md'})
foreach ($card in $cards) { $files += @{Source=('prototypes/Home/Stats/' + $card);Entry=('cards/' + $card)} }
$files += @{Source='THeme/UnionSuite/zUnionSuite.css';Entry='THeme/UnionSuite/zUnionSuite.css'}
$files += @{Source='THeme/UnionSuite/zUnionSuite.js';Entry='THeme/UnionSuite/zUnionSuite.js'}
$files += @{Source='THeme/UnionSuite/Usage-Guide.html';Entry='THeme/UnionSuite/Usage-Guide.html'}
Write-Archive $bundlePath $files
$themeFiles = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'THeme/UnionSuite') -File -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    @{Source=$relative;Entry=$relative.Substring('THeme/'.Length)}
}
Write-Archive $themePath $themeFiles
$check = [System.IO.Compression.ZipFile]::OpenRead($bundlePath)
try {
    if ($check.Entries.Count -ne 10 -or $check.Entries.FullName -match 'captured-data|home-stats.js') { throw 'Unexpected card bundle contents.' }
} finally { $check.Dispose() }
Write-Output 'Built prototypes/Home/Stats-Cards.zip (six cards, instructions, shared CSS/JS and guide); refreshed THeme/UnionSuite.zip.'
