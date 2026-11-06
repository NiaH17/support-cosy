// Pod reset sequence (source: "Octo assist.docx", Pods will not pair, step 4).
// Shared by the troubleshooting guide and the "Réinitialisation des pods" procedure.
export const POD_RESET_STEPS = [
  "Passer en mode AP et retirer le pod.",
  "Retirer l'une des piles du pod.",
  "Maintenir enfoncé le bouton boost du pod tout en réinsérant la pile.",
  "Maintenir le bouton boost enfoncé jusqu'à ce que le pod clignote en violet (environ 10 secondes).",
  "Réessayer de coupler le pod avec la procédure habituelle.",
  "En cas de succès, le clignotement violet s'arrête et le pod clignote brièvement en blanc.",
  "Vérifier le pod et le réaffecter à la bonne zone s'il ne l'a pas été automatiquement.",
  "Après environ 2 minutes, le Cosy Hub doit indiquer qu'il est en ligne (les premières mesures des capteurs mettent un peu de temps à remonter). L'application doit aussi l'indiquer une fois le hub reconnecté au Wi-Fi.",
]
