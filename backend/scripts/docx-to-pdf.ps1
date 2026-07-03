param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0  # wdAlertsNone

    try {
        $doc = $word.Documents.Open($InputPath, $false, $true, $false)
    } catch {
        throw "Fallo al abrir el documento en Word: $($_.Exception.Message)"
    }

    try {
        $doc.SaveAs([ref]$OutputPath, [ref]17)  # 17 = wdExportFormatPDF
    } catch {
        throw "Fallo al guardar como PDF: $($_.Exception.Message)"
    }
}
finally {
    if ($doc -ne $null) {
        $doc.Close([ref]$false)
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
    }
    if ($word -ne $null) {
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    }
}

if (-not (Test-Path $OutputPath)) {
    throw "No se generó el PDF en $OutputPath"
}

Write-Output "OK"
