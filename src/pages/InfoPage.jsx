import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PROCEDURES = [
  {
    id: 'mise-en-service',
    title: 'Mise en service de l\'unité',
    category: 'Installation',
    description: 'Vérifications essentielles avant la première mise en service du Cosy.',
    steps: [
      { title: 'Vérifier la pression hydraulique', detail: 'S\'assurer que la pression est entre 1,5 et 2,5 bar sur le manomètre.' },
      { title: 'Purger le circuit', detail: 'Effectuer une purge complète du circuit hydraulique avant de démarrer (voir procédure de purge d\'air).' },
      { title: 'Vérifier les connexions électriques', detail: 'Contrôler que toutes les connexions sont correctement serrées et que les tensions correspondent aux spécifications.' },
      { title: 'Configurer les paramètres de départ', detail: 'Régler la température de départ en fonction du type d\'émetteurs : 35–45°C pour plancher chauffant, 45–55°C pour radiateurs basse température.' },
      { title: 'Démarrer l\'unité et vérifier le fonctionnement', detail: 'Lancer le chauffage et surveiller les températures de départ et retour. Vérifier l\'absence de code défaut.' },
    ],
  },
  {
    id: 'purge-air',
    title: 'Purge d\'air du circuit',
    category: 'Maintenance',
    description: 'Procédure pour éliminer l\'air du circuit hydraulique.',
    steps: [
      { title: 'Accéder au mode purge installateur', detail: 'Depuis le menu technicien, sélectionner « Mode purge » pour activer la pompe en continu.' },
      { title: 'Ouvrir tous les émetteurs', detail: 'S\'assurer que toutes les vannes de radiateurs et zones de plancher chauffant sont entièrement ouvertes.' },
      { title: 'Purger les purgeurs manuels', detail: 'En commençant par les émetteurs les plus éloignés, ouvrir chaque purgeur jusqu\'à l\'écoulement d\'eau sans bulles.' },
      { title: 'Purger l\'unité intérieure', detail: 'Utiliser le purgeur automatique de l\'unité — vérifier que le capuchon est légèrement desserré.' },
      { title: 'Contrôler la pression finale', detail: 'Après purge, vérifier et ajuster la pression à 1,5 – 2 bar à froid. Refermer tous les purgeurs.' },
    ],
  },
  {
    id: 'nettoyage-filtre',
    title: 'Nettoyage du filtre interne',
    category: 'Maintenance',
    description: 'À effectuer annuellement ou en cas de débit insuffisant.',
    steps: [
      { title: 'Isoler l\'unité', detail: 'Fermer les vannes d\'isolement départ et retour de l\'unité.' },
      { title: 'Relâcher la pression', detail: 'Ouvrir légèrement le purgeur le plus proche pour dépressuriser le circuit côté unité.' },
      { title: 'Déposer le filtre', detail: 'Dévisser le bouchon de la cartouche filtre. Prévoir un chiffon — un peu d\'eau peut s\'écouler.' },
      { title: 'Nettoyer la cartouche', detail: 'Rincer la cartouche à l\'eau claire jusqu\'à ce qu\'elle soit propre. Inspecter pour déformation ou usure.' },
      { title: 'Réinstaller et remettre en pression', detail: 'Réinsérer la cartouche, visser le bouchon, rouvrir les vannes et vérifier la pression.' },
      { title: 'Purger l\'air résiduel', detail: 'Effectuer une courte purge pour éliminer l\'air introduit lors de l\'opération.' },
    ],
  },
  {
    id: 'reglage-courbe-chauffe',
    title: 'Réglage de la courbe de chauffe',
    category: 'Paramétrage',
    description: 'Optimiser la courbe de chauffe pour le confort et l\'efficacité.',
    steps: [
      { title: 'Accéder aux paramètres avancés', detail: 'Depuis le menu installateur, naviguer vers « Courbe de chauffe » ou « Loi d\'eau ».' },
      { title: 'Identifier le type d\'émetteurs', detail: 'Plancher chauffant : pente faible (0,3–0,5). Radiateurs basse température : pente moyenne (0,5–0,8). Radiateurs haute température : pente forte (0,8–1,2).' },
      { title: 'Ajuster le point de décalage', detail: 'Si la maison est trop froide par temps doux, augmenter le décalage de +2°C. Si elle est trop chaude, diminuer de -2°C.' },
      { title: 'Vérifier après 24h', detail: 'Observer le comportement sur une journée complète avant d\'effectuer d\'autres ajustements.' },
    ],
  },
  {
    id: 'mode-ete',
    title: 'Passage en mode été',
    category: 'Utilisation',
    description: 'Désactiver le chauffage tout en conservant l\'eau chaude sanitaire.',
    steps: [
      { title: 'Accéder au thermostat ou à l\'application', detail: 'Ouvrir le menu principal du thermostat ou de l\'application Cosy.' },
      { title: 'Activer le mode été', detail: 'Sélectionner « Mode été » ou désactiver le chauffage tout en laissant l\'ECS activée.' },
      { title: 'Vérifier la consigne ECS', detail: 'S\'assurer que la consigne eau chaude sanitaire est toujours active (recommandé : 55°C minimum).' },
      { title: 'Confirmer', detail: 'L\'unité ne démarrera en chauffage que si la température extérieure descend sous un seuil configuré (ex. 12°C).' },
    ],
  },
]

const CATEGORIES = ['Tout', 'Installation', 'Maintenance', 'Paramétrage', 'Utilisation']

export default function InfoPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('Tout')
  const [openProc, setOpenProc] = useState(null)

  const filtered = PROCEDURES.filter(p => category === 'Tout' || p.category === category)

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-purple to-brand-cyan px-6 pt-6 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Informations & Procédures</h1>
        </div>
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                category === cat
                  ? 'bg-white text-brand-purple'
                  : 'bg-white/20 text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-3 pb-12">
        {filtered.map(proc => (
          <div key={proc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-start gap-3 px-4 py-4 text-left"
              onClick={() => setOpenProc(openProc === proc.id ? null : proc.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">
                    {proc.category}
                  </span>
                </div>
                <p className="font-semibold text-brand-navy text-sm leading-snug">{proc.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{proc.description}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${openProc === proc.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {openProc === proc.id && (
              <div className="px-4 pb-4 border-t border-gray-50">
                <ol className="mt-3 space-y-3">
                  {proc.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <div>
                        <p className="font-semibold text-sm text-brand-navy">{step.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
