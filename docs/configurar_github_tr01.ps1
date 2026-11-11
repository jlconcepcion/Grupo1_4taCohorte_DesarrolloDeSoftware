<#
.SYNOPSIS
    Automatiza TR.01.04 (protección de rama main) y TR.01.07 (creación de etiquetas e issues en GitHub).
.DESCRIPTION
    Obtiene el token de Git Credential Manager (o de la variable $env:GITHUB_TOKEN) y configura:
    1. Etiquetas por Historia (TR, HU01..HU05), Sprint (Sprint 1..4) y Área (BD, Backend, Frontend, Pruebas, Infra).
    2. Los 49 issues correspondientes a todas las subtareas (TR.01..TR.04 y ST01.01..ST05.07) desde docs/backlog_issues.json.
    3. La regla de protección de la rama main (requerir Pull Request con al menos 1 revisión antes de hacer merge).
#>

param(
    [string]$Owner = "jlconcepcion",
    [string]$Repo = "Grupo1_4taCohorte_DesarrolloDeSoftware"
)

$ErrorActionPreference = "Stop"

function Get-GitHubToken {
    if ($env:GITHUB_TOKEN) {
        return $env:GITHUB_TOKEN
    }
    $credInput = "protocol=https`nhost=github.com`n`n"
    $credOutput = $credInput | git credential fill
    foreach ($line in $credOutput) {
        if ($line -match "^password=(.+)$") {
            return $Matches[1]
        }
    }
    throw "No se encontró un token de GitHub en Git Credential Manager ni en `$env:GITHUB_TOKEN."
}

$token = Get-GitHubToken
$headers = @{
    "Authorization"        = "Bearer $token"
    "Accept"               = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "TR01-Setup-Script"
}

$baseUri = "https://api.github.com/repos/$Owner/$Repo"

Write-Host "1. Configurando etiquetas de Historia, Sprint y Área en $Owner/$Repo..." -ForegroundColor Cyan

$labels = @(
    @{ name = "TR"; color = "5319e7"; description = "Tareas transversales" },
    @{ name = "HU01"; color = "1d76db"; description = "Épica 1: Autenticación y usuarios" },
    @{ name = "HU02"; color = "0e8a16"; description = "Épica 2: Gestión de recintos y horarios" },
    @{ name = "HU03"; color = "fbca04"; description = "Épica 3: Reservas" },
    @{ name = "HU04"; color = "d93f0b"; description = "Épica 4: Notificaciones y reportes" },
    @{ name = "HU05"; color = "c5def5"; description = "Épica 5: Sugerencias e indicadores" },
    @{ name = "Sprint 1"; color = "bfd4f2"; description = "Entregables del Sprint 1" },
    @{ name = "Sprint 2"; color = "bfdadc"; description = "Entregables del Sprint 2" },
    @{ name = "Sprint 3"; color = "fef2c0"; description = "Entregables del Sprint 3" },
    @{ name = "Sprint 4"; color = "f9d0c4"; description = "Entregables del Sprint 4" },
    @{ name = "Area: Infra"; color = "ededed"; description = "Infraestructura y configuración" },
    @{ name = "Area: BD"; color = "e99695"; description = "Base de datos y migraciones" },
    @{ name = "Area: Backend"; color = "c2e0c6"; description = "API y lógica de servidor" },
    @{ name = "Area: Frontend"; color = "d4c5f9"; description = "Interfaz de usuario web" },
    @{ name = "Area: Pruebas"; color = "006b75"; description = "Pruebas automatizadas QA" }
)

foreach ($lbl in $labels) {
    $body = $lbl | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Method Post -Uri "$baseUri/labels" -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json; charset=utf-8" | Out-Null
        Write-Host "  + Etiqueta creada: $($lbl.name)" -ForegroundColor Green
    } catch {
        Write-Host "  = Etiqueta ya existente: $($lbl.name)" -ForegroundColor DarkGray
    }
}

Write-Host "`n2. Consultando issues existentes para evitar duplicados..." -ForegroundColor Cyan
$existingIssues = Invoke-RestMethod -Method Get -Uri "$baseUri/issues?state=all&per_page=100" -Headers $headers
$existingTitles = @{}
foreach ($iss in $existingIssues) {
    $existingTitles[$iss.title] = $true
}

$backlogPath = Join-Path $PSScriptRoot "backlog_issues.json"
$items = Get-Content -Path $backlogPath -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Host "3. Cargando subtareas como issues (TR.01.07)..." -ForegroundColor Cyan
foreach ($item in $items) {
    $title = "[$($item.id)] $($item.subtarea)"
    if ($existingTitles.ContainsKey($title)) {
        Write-Host "  = Saltando issue ya existente: $title" -ForegroundColor DarkGray
        continue
    }

    $issueBody = @"
## Datos de la Subtarea

- **ID:** ``$($item.id)``
- **Historia de Usuario:** ``$($item.historia)``
- **Sprint:** ``$($item.sprint)``
- **Área responsable:** ``$($item.area)``

---

## Descripción

$($item.subtarea)

---

## Criterio de Terminado (Definition of Done)

- [ ] $($item.criterio)
- [ ] Pull Request creado con el ID ``$($item.id)`` y aprobado en revisión.
"@

    $payload = @{
        title  = $title
        body   = $issueBody
        labels = @($item.historia, $item.sprint, "Area: $($item.area)")
    } | ConvertTo-Json -Compress

    $created = Invoke-RestMethod -Method Post -Uri "$baseUri/issues" -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType "application/json; charset=utf-8"
    Write-Host "  + Issue #$($created.number) creado: $title" -ForegroundColor Green
    Start-Sleep -Milliseconds 350
}

Write-Host "`n4. Configurando protección de la rama 'main' (TR.01.04)..." -ForegroundColor Cyan
$protectionPayload = @{
    required_status_checks = $null
    enforce_admins = $true
    required_pull_request_reviews = @{
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $false
        required_approving_review_count = 1
    }
    restrictions = $null
} | ConvertTo-Json -Depth 5 -Compress

try {
    Invoke-RestMethod -Method Put -Uri "$baseUri/branches/main/protection" -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($protectionPayload)) -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "  + Rama 'main' protegida exitosamente (requiere Pull Request y revisión)." -ForegroundColor Green
} catch {
    Write-Warning "No se pudo activar la protección de rama vía API (en repositorios privados con cuenta GitHub Free requiere GitHub Pro/Team o hacer el repositorio público, o configurarlo en Settings -> Rules -> Rulesets): $($_.Exception.Message)"
}
