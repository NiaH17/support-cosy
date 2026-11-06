import { useNavigate } from 'react-router-dom'

// Ported from Octo Assist (InverterTestPage), in French. The 3D reference models are not included.
const STEPS = [
  {
    number: 1,
    title: "Vérification de l'alimentation de l'onduleur",
    objective: "Confirmer la bonne tension d'alimentation de l'onduleur et sa sortie vers la self.",
    instructions: [
      "Unité sous tension et tous les capots retirés, régler le multimètre sur la tension CA.",
      "Mesurer la tension d'alimentation entrante de l'onduleur.",
      <span key="a">Valeur attendue : <strong>230V CA.</strong></span>,
      "Mesurer la tension de sortie de l'onduleur vers la self : régler le multimètre sur la tension CC.",
      "Mesurer entre chaque câble de la self et la terre, un par un.",
      <span key="b">Les valeurs doivent être <strong>équilibrées sur chaque câble.</strong></span>,
      "Si les valeurs d'alimentation ou de sortie ne sont pas conformes, vérifier le câblage et les connexions entre la carte CA et l'onduleur.",
    ],
  },
  {
    number: 2,
    title: 'Vérification de la sortie vers le compresseur',
    objective: "Vérifier que l'onduleur fournit la bonne tension de veille au compresseur.",
    instructions: [
      "Sous tension et sans demande, mesurer la tension aux bornes de sortie de l'onduleur vers le compresseur.",
      'Mesurer la tension phase-terre sur les trois phases du compresseur (L1, L2 et L3).',
      'Les trois phases doivent donner des valeurs similaires.',
      "Une tension absente ou incorrecte peut indiquer un onduleur défaillant ou un mauvais signal / une mauvaise commande.",
    ],
  },
  {
    number: 3,
    title: 'Test des enroulements de la self',
    objective: null,
    instructions: [
      "Isoler l'unité du secteur avec l'isolateur et attendre 60 secondes.",
      'Régler le multimètre sur Ω (ohms).',
      'Mesurer la résistance entre chaque câble et la terre (E).',
      <span key="c">Valeurs attendues :<br />
        <span className="ml-4 block mt-1">• Cosy 6 — <strong>0,4–0,6 Ω</strong></span>
        <span className="ml-4 block">• Cosy 9 — <strong>0,4–0,6 Ω</strong></span>
        <span className="ml-4 block">• Cosy 12 — <strong>pas de self montée</strong></span>
      </span>,
    ],
  },
]

export default function InverterTestPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold">Test de l'onduleur</h1>
            <p className="text-brand-cyan/70 text-xs">Procédure de diagnostic</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6 pb-32">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-amber-800 text-sm">Respecter toutes les consignes de sécurité. Isoler l'unité comme indiqué avant de mesurer les résistances.</p>
        </div>

        {STEPS.map(step => (
          <div key={step.number}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{step.number}</span>
              </div>
              <div>
                <p className="font-bold text-brand-navy text-sm">{step.title}</p>
                {step.objective && <p className="text-xs text-gray-500 mt-0.5">{step.objective}</p>}
              </div>
            </div>
            <div className="card space-y-2 mb-4">
              {step.instructions.map((inst, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="text-brand-purple font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{inst}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200" />

        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-navy">Une fois toutes les étapes terminées :</p>
          <button onClick={() => navigate('/')} className="btn-primary">Tout fonctionne — retour à l'accueil</button>
          <button onClick={() => navigate('/assistance')} className="btn-secondary">Toujours un problème ? Contacter le support technique</button>
        </div>
      </div>
    </div>
  )
}
