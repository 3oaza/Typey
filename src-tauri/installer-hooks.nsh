!macro NSIS_HOOK_POSTINSTALL
  CreateShortCut "$DESKTOP\Textey.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\Textey.lnk"
!macroend
