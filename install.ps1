# install.ps1
# Script de instalación para forex-agent en Windows (compatible con Python 3.14+)

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Instalacion de dependencias - forex-agent" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar version de Python
$pythonVersion = python --version 2>&1
Write-Host "Python detectado: $pythonVersion" -ForegroundColor Yellow

# Paso 1: dependencias principales
Write-Host ""
Write-Host "[1/2] Instalando dependencias principales..." -ForegroundColor Green
pip install MetaTrader5 pandas python-dotenv

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la instalacion de dependencias principales." -ForegroundColor Red
    exit 1
}

# Paso 2: pandas-ta sin numba (compatible con Python 3.14+)
Write-Host ""
Write-Host "[2/2] Instalando pandas-ta (sin numba, compatible con Python 3.14+)..." -ForegroundColor Green
pip install pandas-ta --no-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la instalacion de pandas-ta." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Instalacion completada exitosamente!" -ForegroundColor Cyan
Write-Host "  Ejecuta: python main.py" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
