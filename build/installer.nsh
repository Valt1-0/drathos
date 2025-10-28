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
