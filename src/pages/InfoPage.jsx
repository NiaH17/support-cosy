import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Unit specs ────────────────────────────────────────────────────────────────

const UNIT_SPECS = {
  headers: ['', 'Cosy 6', 'Cosy 9', 'Cosy 12'],
  rows: [
    ['Puissance calorifique nominale', '6 kW', '9 kW', '12 kW'],
    ['Hauteur de l\'unité extérieure', '680 mm', '800 mm', '800 mm'],
    ['Largeur de l\'unité extérieure', '900 mm', '900 mm', '900 mm'],
    ['Profondeur de l\'unité extérieure', '392 mm', '415 mm', '415 mm'],
    ['Poids de l\'unité extérieure', '55 kg', '68 kg', '73 kg'],
    ['Hauteur de l\'unité intérieure', '750 mm', '750 mm', '750 mm'],
    ['Largeur de l\'unité intérieure', '500 mm', '500 mm', '500 mm'],
    ['Profondeur de l\'unité intérieure', '250 mm', '250 mm', '250 mm'],
    ['Poids de l\'unité intérieure', '26 kg', '26 kg', '26 kg'],
    ['Débit max (l/min)', '28 l/min', '28 l/min', '28 l/min'],
    ['Pression max circuit', '3 bar', '3 bar', '3 bar'],
    ['Diamètre raccords plomberie', '1" (28 mm)', '1" (28 mm)', '1" (28 mm)'],
    ['Alimentation électrique unité ext.', '230V / 16A', '230V / 20A', '230V / 20A'],
    ['Alimentation électrique unité int.', '230V / 6A', '230V / 6A', '230V / 6A'],
    ['Frigorigène', 'R-32', 'R-32', 'R-32'],
    ['Charge frigorigène', '1,15 kg', '1,45 kg', '1,45 kg'],
    ['Température extérieure min', '-20°C', '-20°C', '-20°C'],
    ['COP (A7/W35)', '3,80', '3,90', '3,77'],
    ['SCOP', '4,20', '4,30', '4,10'],
    ['Niveau sonore', '47 dBA', '51 dBA', '51 dBA'],
  ]
}

// ── Clearances ────────────────────────────────────────────────────────────────

const CLEARANCES = {
  'Cosy 6': {
    operational: [
      { label: 'Avant (côté soufflage)', value: '500 mm' },
      { label: 'Arrière', value: '100 mm' },
      { label: 'Côtés (gauche et droit)', value: '100 mm' },
      { label: 'Dessus', value: '200 mm' },
      { label: 'Dessous', value: '100 mm' },
    ],
    safety: [
      { label: 'Depuis une ouverture de fenêtre ou ventilation', value: '500 mm' },
      { label: "Depuis le compteur d'électricité ou de gaz", value: '500 mm' },
      { label: 'Depuis la limite de propriété', value: '300 mm' },
      { label: 'Depuis un accès pompier', value: 'Conserver accès libre' },
    ],
  },
  'Cosy 9 & 12': {
    operational: [
      { label: 'Avant (côté soufflage)', value: '700 mm' },
      { label: 'Arrière', value: '100 mm' },
      { label: 'Côtés (gauche et droit)', value: '100 mm' },
      { label: 'Dessus', value: '300 mm' },
      { label: 'Dessous', value: '100 mm' },
    ],
    safety: [
      { label: 'Depuis une ouverture de fenêtre ou ventilation', value: '500 mm' },
      { label: "Depuis le compteur d'électricité ou de gaz", value: '500 mm' },
      { label: 'Depuis la limite de propriété', value: '300 mm' },
      { label: 'Depuis un accès pompier', value: 'Conserver accès libre' },
    ],
  },
}

// ── Cosy Hub LEDs ─────────────────────────────────────────────────────────────

const LED_STATES = [
  { state: 'Violet clignotant', meaning: 'Démarrage / initialisation' },
  { state: 'Bleu clignotant', meaning: "Connexion au Wi-Fi en cours" },
  { state: 'Bleu fixe', meaning: "Connecté au Wi-Fi, en attente de couplage avec la pompe à chaleur" },
  { state: 'Jaune clignotant', meaning: "Mise à jour du firmware en cours — ne pas couper l'alimentation" },
  { state: 'Blanc fixe', meaning: 'Fonctionnement normal — tout est OK' },
  { state: 'Jaune fixe', meaning: "Connecté mais pas de demande de chaleur active" },
  { state: 'Rouge fixe', meaning: "Erreur — voir codes d'erreur dans l'application ou la section Dépannage" },
  { state: 'Rouge clignotant', meaning: "Erreur critique — cycle d'alimentation recommandé. Contacter le support si persistant." },
]

// ── Commissioning ─────────────────────────────────────────────────────────────

const COMMISSIONING_SECTIONS = [
  {
    id: 'zones',
    title: 'Configuration des zones',
    steps: [
      { step: 1, title: "Ouvrir l'application Octopus", detail: "Aller dans l'application Octopus et sélectionner votre système Cosy." },
      { step: 2, title: 'Accéder aux paramètres du système', detail: "Aller dans Paramètres → Paramètres système → Zones." },
      { step: 3, title: 'Configurer les zones souhaitées', detail: "Activer/désactiver les zones et leur affecter des noms de pièces si souhaité." },
      { step: 4, title: 'Affecter les pods aux zones', detail: "Pour chaque zone active, affecter le(s) pod(s) de thermostat correspondant(s)." },
    ],
  },
  {
    id: 'flow-temps',
    title: 'Températures de départ',
    steps: [
      { step: 1, title: 'Identifier le type d\'émetteurs', detail: "Plancher chauffant basse température : consigne 35–42°C. Radiateurs basse température : consigne 45–50°C. Radiateurs traditionnels : consigne 55–60°C." },
      { step: 2, title: 'Régler la consigne de départ max', detail: "Dans l'application, aller dans Paramètres → Paramètres système → Températures de départ. Régler la température max de départ selon le type d'émetteur." },
      { step: 3, title: 'Activer la loi d\'eau si disponible', detail: "Si le mode loi d'eau est disponible, l'activer et régler les points de consigne selon la documentation technique." },
      { step: 4, title: 'Vérifier les températures de départ/retour en fonctionnement', detail: "Lors d'un appel de chaleur, vérifier les températures de départ et retour sur le hub. L'écart normal est de 5 à 10°C." },
    ],
  },
  {
    id: 'pods',
    title: 'Couplage des pods',
    steps: [
      { step: 1, title: 'Pré-installer les pods', detail: "Fixer le pod thermostat dans chaque zone à environ 1,5 m du sol, loin des sources de chaleur et de lumière directe." },
      { step: 2, title: 'Insérer les piles', detail: "Insérer 2 piles AA dans chaque pod (type inclus dans la boîte)." },
      { step: 3, title: 'Démarrer le mode couplage dans l\'application', detail: "Dans l'application : Paramètres → Appareils → Ajouter un pod. Le hub passe en mode couplage." },
      { step: 4, title: 'Déclencher le couplage sur le pod', detail: "Appuyer brièvement sur le bouton du pod — le voyant clignote pour confirmer le couplage." },
      { step: 5, title: 'Vérifier et nommer', detail: "Une fois couplé, attribuer la pièce/zone dans l'application. Répéter pour chaque pod." },
    ],
    note: "Si le pod ne se couple pas, voir la section Dépannage → Problèmes de mise en service → Pod ne se couple pas.",
    link: { label: 'Aller vers le dépannage', path: '/depannage' },
  },
]

// ── Procedures ────────────────────────────────────────────────────────────────

const PROCEDURES = [
  {
    id: 'purge-air',
    title: "Purge d'air",
    category: 'Maintenance',
    description: "Pour effectuer une purge d'air depuis l'application d'un installateur autorisé.",
    steps: [
      { step: 1, title: 'Ouvrir toutes les vannes', detail: 'Vérifier que toutes les vannes, les zones de plancher chauffant et les radiateurs sont entièrement ouverts.' },
      { step: 2, title: 'Purger le collecteur et les circuits', detail: "Purger manuellement le collecteur de plancher chauffant et les purgeurs de radiateurs jusqu'à l'écoulement d'eau sans bulles." },
      { step: 3, title: "Accéder au mode purge via l'application installateur", detail: "Dans l'application installateur, aller dans Contrôles → Mode purge. La pompe tourne en continu pour permettre la purge." },
      { step: 4, title: 'Purger le purgeur automatique de l\'unité', detail: "Localiser le purgeur automatique à l'intérieur de l'unité et desserrer légèrement le capuchon pour permettre l'évacuation de l'air." },
      { step: 5, title: 'Surveiller la pression', detail: "Surveiller la pression durant la purge. Si elle tombe en dessous de 0,5 bar, ajouter de l'eau via le robinet de remplissage." },
      { step: 6, title: 'Rétablir la pression finale', detail: "Après purge, ajuster la pression à 1,5–2,0 bar à froid. Refermer tous les purgeurs et resserrer les capuchons." },
    ],
    note: "Si une panne active de débit empêche la purge, effectuer un cycle d'alimentation de la pompe à chaleur depuis l'isolateur. Attendre quelques minutes, remettre sous tension, puis effectuer immédiatement une purge via le mode AP.",
  },
  {
    id: 'reset-pods',
    title: 'Réinitialisation des pods',
    category: 'Configuration',
    description: 'À effectuer si les pods ne répondent pas ou doivent être couplés à nouveau.',
    steps: [
      { step: 1, title: 'Retirer la pile', detail: 'Ouvrir le pod et retirer la pile.' },
      { step: 2, title: 'Maintenir le bouton enfoncé', detail: 'Maintenir le bouton du pod enfoncé.' },
      { step: 3, title: 'Réinsérer la pile tout en maintenant', detail: 'Tout en maintenant le bouton, réinsérer la pile.' },
      { step: 4, title: 'Attendre le voyant rouge', detail: "Continuer à maintenir jusqu'à l'apparition du voyant rouge. Relâcher ensuite." },
      { step: 5, title: 'Recouplage', detail: "Le pod est maintenant réinitialisé. Suivre la procédure de couplage dans l'application." },
    ],
  },
  {
    id: 'zigbee-reset',
    title: 'Réinitialisation Zigbee',
    category: 'Configuration',
    description: "Supprime tous les pods couplés au hub. À utiliser en cas d'appareils fantômes ou de problème de réseau Zigbee.",
    steps: [
      { step: 1, title: 'Accéder aux paramètres hub', detail: "Dans l'application installateur : Paramètres → Appareils → Paramètres du hub." },
      { step: 2, title: 'Lancer la réinitialisation Zigbee', detail: "Sélectionner « Réinitialisation Zigbee » et confirmer. Le hub supprime tous les appareils couplés." },
      { step: 3, title: 'Attendre la fin', detail: "Le hub redémarre le réseau Zigbee. Attendre 2 minutes." },
      { step: 4, title: 'Recoupler tous les pods', detail: "Suivre la procédure de couplage des pods pour recoupler chaque pod un par un." },
    ],
    warning: "⚠️ Cette action supprime tous les pods couplés. Vous devrez recoupler chaque appareil.",
  },
  {
    id: 'strainer',
    title: 'Nettoyage du tamis interne',
    category: 'Maintenance',
    description: "Effectuer annuellement ou si une erreur de débit est affichée.",
    steps: [
      { step: 1, title: "Isoler l'unité", detail: "Fermer les vannes d'isolement de départ et de retour de l'unité." },
      { step: 2, title: 'Dépressuriser', detail: "Ouvrir légèrement le purgeur le plus proche pour dépressuriser le côté unité du circuit." },
      { step: 3, title: 'Déposer le tamis', detail: "Dévisser le bouchon de la cartouche du tamis. Prévoir un chiffon — un peu d'eau peut s'écouler." },
      { step: 4, title: 'Nettoyer', detail: "Rincer la cartouche à l'eau claire jusqu'à ce qu'elle soit propre. Inspecter pour déformation ou usure." },
      { step: 5, title: 'Réinstaller et remettre en pression', detail: "Réinsérer la cartouche, visser le bouchon, rouvrir les vannes et vérifier la pression (1,5–2,0 bar)." },
      { step: 6, title: "Purger l'air résiduel", detail: "Effectuer une courte purge pour éliminer l'air introduit pendant l'opération." },
    ],
  },
  {
    id: 'secondary-pump',
    title: 'Réglage de la pompe secondaire',
    category: 'Configuration',
    description: "Paramétrer la vitesse et le mode de fonctionnement de la pompe secondaire.",
    steps: [
      { step: 1, title: "Accéder aux paramètres pompe", detail: "Dans l'application installateur : Paramètres → Paramètres système → Pompe secondaire." },
      { step: 2, title: 'Sélectionner le mode', detail: "Mode proportionnel (recommandé) : la pompe ajuste automatiquement sa vitesse selon la demande. Mode vitesse fixe : régler la vitesse manuellement de 0 à 100%." },
      { step: 3, title: 'Pour le mode proportionnel', detail: "Régler la pression différentielle de consigne entre 0,2 et 0,5 bar. Commencer à 0,3 bar pour une installation standard." },
      { step: 4, title: 'Pour le mode vitesse fixe', detail: "Régler à 100% pour la purge initiale, puis réduire progressivement jusqu'à obtenir un ΔT de 5–10°C entre départ et retour en chauffage." },
      { step: 5, title: 'Vérifier les températures de départ/retour', detail: "En fonctionnement, confirmer que les températures de départ et retour sont cohérentes avec la consigne et le type d'émetteurs." },
    ],
  },
]

// ── Shared ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'specs', label: 'Caractéristiques techniques', subtitle: 'Dimensions, poids, électrique', icon: '📐' },
  { id: 'clearances', label: 'Dégagements', subtitle: 'Espacements requis autour de l\'unité', icon: '📏' },
  { id: 'hub', label: 'Cosy Hub', subtitle: 'Voyants LED & fonctionnement', icon: '💡' },
  { id: 'commissioning', label: 'Mise en service', subtitle: 'Zones, températures, pods', icon: '⚙️' },
  { id: 'procedures', label: 'Procédures', subtitle: 'Purge, réinitialisation, maintenance', icon: '🛠️' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InfoPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState(null)
  const [selected, setSelected] = useState(null)
  const [specModel, setSpecModel] = useState('Cosy 6')

  function goBack() {
    if (selected) { setSelected(null); return }
    setSection(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => section ? goBack() : navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Informations & Procédures</h1>
            <p className="text-brand-cyan/70 text-xs">
              {section ? SECTIONS.find(s => s.id === section)?.label : 'Données techniques Cosy'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 pb-12">

        {/* Section picker */}
        {!section && (
          <div className="space-y-3">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className="w-full card flex items-center gap-4 active:bg-gray-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0 text-2xl">
                  {s.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-brand-navy">{s.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.subtitle}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Unit specs */}
        {section === 'specs' && (
          <div>
            {/* Model tabs */}
            <div className="flex gap-2 mb-4">
              {['Cosy 6', 'Cosy 9', 'Cosy 12'].map(m => (
                <button key={m} onClick={() => setSpecModel(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${specModel === m ? 'bg-brand-purple text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="card p-0 overflow-hidden">
              {UNIT_SPECS.rows.map((row, i) => {
                const colIdx = ['Cosy 6','Cosy 9','Cosy 12'].indexOf(specModel) + 1
                return (
                  <div key={i} className={`flex items-start px-4 py-3 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <span className="text-xs text-gray-500 flex-1 leading-snug">{row[0]}</span>
                    <span className="text-xs font-semibold text-brand-navy text-right">{row[colIdx]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Clearances */}
        {section === 'clearances' && !selected && (
          <div className="space-y-3">
            {Object.keys(CLEARANCES).map(model => (
              <button key={model} onClick={() => setSelected(model)}
                className="w-full card flex items-center gap-4 active:bg-gray-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">📏</div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-brand-navy">{model}</p>
                  <p className="text-sm text-gray-500">Dégagements opérationnels & sécurité</p>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
        {section === 'clearances' && selected && (
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-brand-purple text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Tous les modèles
            </button>
            <h2 className="font-bold text-brand-navy text-lg mb-4">{selected}</h2>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dégagements opérationnels</p>
            <div className="card p-0 overflow-hidden mb-4">
              {CLEARANCES[selected].operational.map((r, i) => (
                <div key={i} className={`flex items-center px-4 py-3 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <span className="text-xs text-gray-600 flex-1">{r.label}</span>
                  <span className="text-xs font-bold text-brand-purple">{r.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Distances de sécurité</p>
            <div className="card p-0 overflow-hidden">
              {CLEARANCES[selected].safety.map((r, i) => (
                <div key={i} className={`flex items-center px-4 py-3 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <span className="text-xs text-gray-600 flex-1">{r.label}</span>
                  <span className="text-xs font-bold text-brand-pink">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cosy Hub LEDs */}
        {section === 'hub' && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">États des voyants LED</p>
            <div className="space-y-2">
              {LED_STATES.map((led, i) => {
                const colorMap = {
                  'Violet': 'bg-violet-500',
                  'Bleu': 'bg-blue-500',
                  'Jaune': 'bg-yellow-400',
                  'Blanc': 'bg-gray-200',
                  'Rouge': 'bg-red-500',
                }
                const color = Object.keys(colorMap).find(k => led.state.startsWith(k)) || 'bg-gray-300'
                return (
                  <div key={i} className="card flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${colorMap[color] || 'bg-gray-300'} ${led.state.includes('clignotant') ? 'opacity-70' : ''}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-brand-navy">{led.state}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{led.meaning}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Commissioning */}
        {section === 'commissioning' && !selected && (
          <div className="space-y-3">
            {COMMISSIONING_SECTIONS.map(cs => (
              <button key={cs.id} onClick={() => setSelected(cs.id)}
                className="w-full card flex items-center gap-4 active:bg-gray-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-brand-navy">{cs.title}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
        {section === 'commissioning' && selected && (() => {
          const cs = COMMISSIONING_SECTIONS.find(c => c.id === selected)
          return (
            <div>
              <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-brand-purple text-sm font-medium mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Mise en service
              </button>
              <h2 className="font-bold text-brand-navy text-lg mb-4">{cs.title}</h2>
              <div className="card space-y-4">
                {cs.steps.map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-brand-purple text-xs font-bold">{s.step}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-brand-navy">{s.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {cs.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4 flex gap-2.5">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-amber-800">{cs.note}</p>
                </div>
              )}
              {cs.link && (
                <button onClick={() => navigate(cs.link.path)} className="mt-4 w-full btn-secondary text-sm">
                  {cs.link.label}
                </button>
              )}
            </div>
          )
        })()}

        {/* Procedures */}
        {section === 'procedures' && !selected && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sélectionner une procédure</p>
            {PROCEDURES.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className="w-full card flex items-center gap-3 active:bg-gray-50 transition-colors">
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-brand-navy">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
        {section === 'procedures' && selected && (() => {
          const proc = PROCEDURES.find(p => p.id === selected)
          return (
            <div>
              <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-brand-purple text-sm font-medium mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Toutes les procédures
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full font-medium">{proc.category}</span>
              </div>
              <h2 className="font-bold text-brand-navy text-lg mb-2">{proc.title}</h2>
              {proc.description && <p className="text-sm text-gray-500 mb-4">{proc.description}</p>}
              {proc.warning && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4 flex gap-2.5">
                  <p className="text-xs text-red-700">{proc.warning}</p>
                </div>
              )}
              <div className="card space-y-4">
                {proc.steps.map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-brand-purple text-xs font-bold">{s.step}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-brand-navy">{s.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {proc.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4 flex gap-2.5">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-amber-800">{proc.note}</p>
                </div>
              )}
            </div>
          )
        })()}

      </div>
    </div>
  )
}
