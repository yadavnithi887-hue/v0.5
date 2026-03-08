$file = "C:\Users\kumar\OneDrive\Desktop\app_building\devstudio-AI\src\Layout.jsx"
$lines = [System.IO.File]::ReadAllLines($file)

# Patch 1: Add ImagePreviewView import after AIReportView import
$newLines = @()
foreach ($line in $lines) {
    $newLines += $line
    if ($line -match "import AIReportView from '@/components/ide/AIReportView'") {
        $newLines += "import ImagePreviewView from '@/components/ide/ImagePreviewView';"
    }
}

# Patch 2: Add image-preview type check
$finalLines = @()
$i = 0
while ($i -lt $newLines.Length) {
    $line = $newLines[$i]
    if ($line -match "<AIReportView file=\{activeFile\} />" -and ($i + 1) -lt $newLines.Length -and $newLines[$i + 1] -match "^\s*\) : \(") {
        $finalLines += $line
        $finalLines += $newLines[$i + 1]  # ) : (
        # Insert image-preview check BEFORE CodeEditor
        $indent = "                "
        $finalLines += "${indent}activeFile.type === 'image-preview' ? ("
        $finalLines += "${indent}  <ImagePreviewView file={activeFile} />"
        $finalLines += "${indent}) : ("
        $i += 2
        continue
    }
    $finalLines += $line
    $i++
}

[System.IO.File]::WriteAllLines($file, $finalLines)
Write-Host "Layout.jsx patched successfully"
