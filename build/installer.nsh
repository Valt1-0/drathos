!macro customInit
  ; Fermer l'application au tout début de l'installation
  DetailPrint "Fermeture de Drathos si en cours d'exécution..."

  ; Tentative 1 - fermeture douce
  nsExec::ExecToStack 'taskkill /IM Drathos.exe'
  Pop $0
  Sleep 2000

  ; Tentative 2 - fermeture forcée
  nsExec::ExecToStack 'taskkill /F /IM Drathos.exe'
  Pop $0
  Sleep 2000

  ; Tentative 3 - fermeture forcée avec tous les processus enfants
  nsExec::ExecToStack 'taskkill /F /T /IM Drathos.exe'
  Pop $0
  Sleep 2000
!macroend

!macro customInstall
  ; Double vérification avant l'installation
  DetailPrint "Vérification finale..."
  nsExec::ExecToStack 'taskkill /F /T /IM Drathos.exe'
  Pop $0
  Sleep 1000
!macroend

!macro customUnInit
  ; Fermer au début de la désinstallation
  DetailPrint "Fermeture de Drathos..."

  nsExec::ExecToStack 'taskkill /F /T /IM Drathos.exe'
  Pop $0
  Sleep 2000

  nsExec::ExecToStack 'taskkill /F /IM Drathos.exe'
  Pop $0
  Sleep 2000
!macroend

!macro customUninstall
  ; Demander si l'utilisateur veut supprimer les données de l'application
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Voulez-vous également supprimer les données de l'application ?$\n$\nCeci supprimera :$\n- Les jeux téléchargés$\n- Les paramètres de l'application$\n- Le cache" \
    /SD IDNO IDNO skip_data_deletion

  DetailPrint "Suppression des données de l'application..."

  ; Lire le chemin des jeux depuis la config avec PowerShell et le supprimer
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference=\"SilentlyContinue\"; try { $config = Get-Content \"$env:APPDATA\Drathos\config.json\" -Raw | ConvertFrom-Json; if ($config.downloadPath -and (Test-Path $config.downloadPath)) { Remove-Item -Path $config.downloadPath -Recurse -Force; Write-Output \"Jeux supprimés\" } } catch { }"'
  Pop $0

  ; Supprimer le dossier de configuration de l'app (%APPDATA%\Drathos)
  DetailPrint "Suppression des paramètres de l'application..."
  RMDir /r "$APPDATA\Drathos"

  ; Supprimer le dossier par défaut dans Documents (au cas où)
  DetailPrint "Nettoyage des dossiers par défaut..."
  RMDir /r "$DOCUMENTS\Drathos"

  skip_data_deletion:
!macroend
