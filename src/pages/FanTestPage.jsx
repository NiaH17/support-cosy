import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Ported from Octo Assist (FanTestPage), in French.
const TESTS = [
  {
    id: 'ac-pcb',
    title: 'Test carte CA / alimentation',
    subtitle: "Vérifier la connexion du ventilateur sur la carte CA et l'alimentation 230V",
    steps: [
      'Mettre l’unité hors tension et verrouiller l’isolateur.',
      'Attendre 60 secondes pour laisser les condensateurs se décharger complètement.',
      'Retirer le capot avant et le capot du ventilateur pour accéder à la carte CA.',
      'Débrancher le connecteur du ventilateur principal de la carte CA.',
      'Inspecter les bornes à vis du connecteur : aucun fil ne doit être desserré et les embouts doivent être sertis sur le conducteur (pas sur l’isolant).',
      'Réenfoncer fermement le connecteur du ventilateur principal dans la carte CA, jusqu’au clic.',
      'Rétablir l’alimentation à l’isolateur et mettre l’unité sous tension.',
      'Vérifier que le voyant vert de la carte CA clignote.',
      'À l’aide d’un multimètre, mesurer 230V CA sur les bornes de sortie du ventilateur principal de la carte CA.',
      'Attendre 5 minutes. Si le code erreur a disparu, le test est terminé. Sinon, passer au test de la carte CC.',
    ],
  },
  {
    id: 'dc-pcb',
    title: 'Test carte CC',
    subtitle: 'Vérifier la connexion du ventilateur sur la carte CC',
    steps: [
      'Mettre l’unité hors tension et verrouiller l’isolateur.',
      'Attendre 60 secondes pour laisser les condensateurs se décharger complètement.',
      'Retirer le capot avant et le capot du ventilateur pour accéder à la carte CC.',
      'Repérer le connecteur du ventilateur principal sur la carte CC. Tirer le clip de verrouillage en arrière et retirer le connecteur.',
      'Presser fermement le corps du connecteur pour améliorer le contact interne, puis le renfoncer sur la carte CC jusqu’au clic du clip de verrouillage.',
      'Rétablir l’alimentation à l’isolateur et mettre l’unité sous tension.',
      'Vérifier que les voyants de la carte CC (Yeux et Cœur) clignotent.',
      'Attendre 5 minutes et vérifier si le code erreur a disparu.',
    ],
  },
]

function TestFlow({ test, onEscalate }) {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const total = test.steps.length
  const isLast = current === total - 1

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-bold text-brand-navy text-xl mb-1">Test terminé</h2>
        <p className="text-gray-500 text-sm mb-6">Le code erreur a-t-il disparu ?</p>
        <div className="w-full space-y-3 max-w-sm">
          <button className="btn-primary" onClick={() => navigate('/')}>Oui — défaut résolu</button>
          <button className="btn-secondary" onClick={onEscalate}>Non — toujours affiché — contacter le support</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400 font-medium">Étape {current + 1} sur {total}</span>
          <span className="text-xs text-brand-purple font-medium">{Math.round((current / total) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-brand-purple transition-all duration-300" style={{ width: `${(current / total) * 100}%` }} />
        </div>
      </div>

      <div className="px-6 flex-1">
        <div className="card min-h-[140px] flex gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-brand-purple text-xs font-bold">{current + 1}</span>
          </div>
          <p className="text-brand-navy font-medium text-base leading-relaxed">{test.steps[current]}</p>
        </div>

        {current === 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-xs text-red-700 font-medium">Toujours verrouiller l’isolateur avant d’accéder aux composants internes.</p>
          </div>
        )}
      </div>

      <div className="px-6 pt-5 pb-2 space-y-3">
        <button onClick={() => isLast ? setDone(true) : setCurrent(c => c + 1)} className="btn-primary">
          {isLast ? 'Terminer le test' : 'Étape suivante'}
        </button>
        {current > 0 && (
          <button onClick={() => setCurrent(c => c - 1)} className="w-full text-center text-gray-400 text-sm py-2">
            ← Étape précédente
          </button>
        )}
      </div>
    </div>
  )
}

export default function FanTestPage() {
  const navigate = useNavigate()
  const [activeTest, setActiveTest] = useState(null)
  const handleEscalate = () => navigate('/assistance')

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom flex flex-col">
      <div className="bg-brand-navy px-6 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => activeTest ? setActiveTest(null) : navigate(-1)} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Tests de connexion du ventilateur</h1>
            <p className="text-brand-cyan/70 text-xs">
              {activeTest ? TESTS.find(t => t.id === activeTest)?.title : 'Choisir une procédure de test'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 pt-5">
        {!activeTest ? (
          <div className="px-6 space-y-4">
            <p className="text-sm text-gray-500 mb-1">
              Effectuer les tests dans l’ordre : commencer par la carte CA. Si le défaut persiste, passer au test de la carte CC.
            </p>
            {TESTS.map((test, idx) => (
              <button key={test.id} onClick={() => setActiveTest(test.id)}
                className="w-full card flex items-center gap-4 active:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-purple font-bold text-sm">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-navy">{test.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{test.subtitle}</p>
                  <p className="text-brand-purple text-xs mt-1 font-medium">{test.steps.length} étapes</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
            <div className="pt-2">
              <button onClick={handleEscalate} className="btn-secondary text-sm">Passer au support technique</button>
            </div>
          </div>
        ) : (
          <TestFlow test={TESTS.find(t => t.id === activeTest)} onEscalate={handleEscalate} />
        )}
      </div>
    </div>
  )
}
