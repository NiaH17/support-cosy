import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const FAULT_CODES = [
  {
    code: 'E1',
    title: 'Défaut capteur de température — départ',
    description: 'Le capteur de température de départ est défaillant ou déconnecté.',
    steps: [
      'Vérifier le câblage du capteur NTC départ.',
      'Mesurer la résistance du capteur (10 kΩ à 25°C).',
      'Remplacer le capteur si hors plage.',
      'Réinitialiser l\'unité après remplacement.',
    ],
  },
  {
    code: 'E2',
    title: 'Défaut capteur de température — retour',
    description: 'Le capteur de température de retour est défaillant ou déconnecté.',
    steps: [
      'Vérifier le câblage du capteur NTC retour.',
      'Mesurer la résistance du capteur (10 kΩ à 25°C).',
      'Remplacer le capteur si nécessaire.',
      'Réinitialiser l\'unité après remplacement.',
    ],
  },
  {
    code: 'E3',
    title: 'Haute pression — pressostat déclenché',
    description: 'La pression du circuit frigorigène est trop élevée.',
    steps: [
      'Couper l\'alimentation et laisser refroidir 30 minutes.',
      'Vérifier que le ventilateur extérieur tourne correctement.',
      'Contrôler l\'absence d\'obstruction autour de l\'unité extérieure.',
      'Vérifier la charge en frigorigène.',
      'Contacter le support si le défaut persiste.',
    ],
  },
  {
    code: 'E4',
    title: 'Basse pression — pressostat déclenché',
    description: 'La pression du circuit frigorigène est trop basse.',
    steps: [
      'Vérifier l\'absence de fuite de frigorigène visible.',
      'Contrôler les connexions des tuyauteries.',
      'Vérifier la charge en frigorigène avec un manifold.',
      'Contacter un technicien frigorigène si nécessaire.',
    ],
  },
  {
    code: 'E5',
    title: 'Défaut communication — unité intérieure/extérieure',
    description: 'Perte de communication entre les unités intérieure et extérieure.',
    steps: [
      'Vérifier le câble de communication (fil 1 et 2).',
      'Contrôler les connexions aux bornes des deux unités.',
      'S\'assurer qu\'il n\'y a pas de rupture ou court-circuit.',
      'Réinitialiser les deux unités simultanément.',
    ],
  },
  {
    code: 'E6',
    title: 'Dégivrage anormal',
    description: 'Le cycle de dégivrage prend trop de temps ou échoue.',
    steps: [
      'Vérifier que la température extérieure est supérieure à -15°C.',
      'Contrôler le capteur de température de l\'échangeur extérieur.',
      'Inspecter l\'échangeur pour calcaire ou obstruction.',
      'Vérifier le bon fonctionnement de la vanne 4 voies.',
    ],
  },
  {
    code: 'E7',
    title: 'Débit d\'eau insuffisant',
    description: 'Le débit dans le circuit hydraulique est insuffisant.',
    steps: [
      'Vérifier que toutes les vannes d\'émetteurs sont ouvertes.',
      'Purger l\'air du circuit (procédure de purge).',
      'Contrôler le filtre interne — nettoyer si colmaté.',
      'Vérifier la pression du circuit (1,5 – 2,5 bar).',
      'Contrôler le bon fonctionnement de la pompe.',
    ],
  },
  {
    code: 'E8',
    title: 'Température d\'eau trop élevée',
    description: 'La température de départ dépasse la limite de sécurité.',
    steps: [
      'Vérifier les paramètres de température de consigne.',
      'Contrôler le débit d\'eau (voir E7).',
      'Vérifier l\'absence d\'air dans le circuit.',
      'Contrôler le thermostat de sécurité haute température.',
    ],
  },
]

const QUICK_CHECKS = [
  {
    title: 'Pas de chauffage',
    icon: '🌡️',
    steps: [
      'L\'unité est-elle en mode chauffage ? Vérifier le thermostat.',
      'La température de consigne est-elle supérieure à la température ambiante ?',
      'Y a-t-il un code défaut affiché ?',
      'La pression du circuit est-elle entre 1,5 et 2,5 bar ?',
      'Les émetteurs (radiateurs/plancher) sont-ils ouverts ?',
    ],
  },
  {
    title: 'Pas d\'eau chaude sanitaire',
    icon: '🚿',
    steps: [
      'Vérifier le mode ECS sur le thermostat.',
      'La consigne ECS est-elle supérieure à 45°C ?',
      'Le ballon est-il correctement câblé ?',
      'Vérifier le thermostat du ballon.',
    ],
  },
  {
    title: 'Bruit inhabituel',
    icon: '🔊',
    steps: [
      'Identifier la source : unité intérieure ou extérieure.',
      'Vérifier l\'absence d\'air dans le circuit (gargouillis).',
      'Contrôler les fixations de l\'unité extérieure.',
      'Vérifier le ventilateur extérieur pour obstruction.',
    ],
  },
]

export default function TroubleshootingPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [openCode, setOpenCode] = useState(null)
  const [openCheck, setOpenCheck] = useState(null)

  const filtered = FAULT_CODES.filter(fc =>
    fc.code.toLowerCase().includes(search.toLowerCase()) ||
    fc.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-500 to-orange-400 px-6 pt-6 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Dépannage</h1>
        </div>
        <input
          type="search"
          placeholder="Rechercher un code défaut…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/20 border border-white/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/60 outline-none focus:bg-white/30"
        />
      </div>

      <div className="px-6 py-5 space-y-6 pb-12">
        {/* Quick checks */}
        {!search && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vérifications rapides</p>
            <div className="space-y-2">
              {QUICK_CHECKS.map((qc, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => setOpenCheck(openCheck === i ? null : i)}
                  >
                    <span className="text-xl">{qc.icon}</span>
                    <span className="flex-1 font-semibold text-sm text-brand-navy">{qc.title}</span>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${openCheck === i ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {openCheck === i && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      <ol className="mt-3 space-y-2">
                        {qc.steps.map((step, j) => (
                          <li key={j} className="flex gap-3 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center justify-center">{j + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fault codes */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {search ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}` : 'Codes défaut'}
          </p>
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Aucun résultat pour « {search} »</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(fc => (
                <div key={fc.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => setOpenCode(openCode === fc.code ? null : fc.code)}
                  >
                    <span className="flex-shrink-0 font-mono font-bold text-sm px-2.5 py-1 rounded-xl bg-red-50 text-red-600">{fc.code}</span>
                    <span className="flex-1 font-medium text-sm text-brand-navy leading-snug">{fc.title}</span>
                    <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${openCode === fc.code ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {openCode === fc.code && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      <p className="text-sm text-gray-500 mt-3 mb-3">{fc.description}</p>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions</p>
                      <ol className="space-y-2">
                        {fc.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 text-center">
          <p className="text-sm text-gray-500 mb-3">Problème non résolu ?</p>
          <button onClick={() => navigate('/assistance')}
            className="inline-flex items-center gap-2 text-brand-purple font-semibold text-sm">
            Soumettre une demande d'assistance
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
