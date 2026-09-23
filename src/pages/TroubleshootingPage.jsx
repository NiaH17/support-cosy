import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Quick checks ──────────────────────────────────────────────────────────────

const QUICK_CHECKS = [
  {
    id: 'no-heat',
    title: 'Pas de chauffage',
    icon: '🌡️',
    steps: [
      { title: 'Vérifier le mode chauffage', detail: "L'unité est-elle en mode chauffage ? Vérifier le thermostat ou l'application Octopus." },
      { title: 'Vérifier la consigne', detail: 'La température de consigne est-elle supérieure à la température ambiante actuelle ?' },
      { title: 'Vérifier les codes erreur', detail: "Un code erreur est-il affiché sur le hub ou dans l'application ?" },
      { title: 'Vérifier la pression du circuit', detail: 'La pression est-elle entre 1,5 et 2,5 bar sur le manomètre ?' },
      { title: 'Vérifier les émetteurs', detail: 'Toutes les vannes de radiateurs et zones de plancher chauffant sont-elles ouvertes ?' },
      { title: 'Vérifier le débit', detail: "Si le débit semble insuffisant, effectuer une purge d'air du circuit." },
    ],
    link: { label: "Voir la procédure de purge d'air", section: 'procedures', item: "Purge d'air" },
  },
  {
    id: 'no-dhw',
    title: "Pas d'eau chaude sanitaire",
    icon: '🚿',
    steps: [
      { title: 'Vérifier le mode ECS', detail: "Le mode eau chaude sanitaire est-il activé sur le thermostat ou l'application ?" },
      { title: 'Vérifier la consigne ECS', detail: 'La consigne ECS est-elle supérieure à 45°C ?' },
      { title: 'Vérifier le câblage du ballon', detail: 'Le ballon est-il correctement câblé et alimenté ?' },
      { title: 'Vérifier le thermistor du ballon', detail: 'Le thermistor est-il dans le bon logement du ballon avec de la pâte thermique appliquée ?' },
    ],
  },
  {
    id: 'noise',
    title: 'Bruit inhabituel',
    icon: '🔊',
    steps: [
      { title: 'Identifier la source', detail: "Est-ce l'unité intérieure ou extérieure ? Un gargouillis indique souvent de l'air dans le circuit." },
      { title: "Vérifier l'air dans le circuit", detail: "Si gargouillis : effectuer une purge d'air. Voir procédure de purge." },
      { title: "Vérifier les fixations de l'unité extérieure", detail: "Contrôler que les vis et supports de l'unité extérieure sont bien serrés." },
      { title: 'Vérifier le ventilateur', detail: "Inspecter le ventilateur extérieur pour détecter une obstruction ou un corps étranger." },
    ],
    link: { label: "Voir la procédure de purge d'air", section: 'procedures', item: "Purge d'air" },
  },
  {
    id: 'commissioning-quick',
    title: 'Problème lors de la mise en service',
    icon: '⚙️',
    steps: [
      { title: 'Pod ne se connecte pas', detail: 'Retirer la pile, maintenir le bouton enfoncé, réinsérer la pile, attendre le voyant rouge, puis relâcher.' },
      { title: 'Hub ne se connecte pas au Wi-Fi', detail: 'Vérifier que le réseau 2,4 GHz est disponible. Si double bande, désactiver temporairement le 5 GHz.' },
      { title: "Application client ne trouve pas le hub", detail: 'Vérifier que le client est connecté à son compte Octopus, puis Appareils → Ajouter un appareil Octopus → Scanner le QR code du hub.' },
    ],
    link: { label: 'Voir tous les problèmes de mise en service', section: 'commissioning-issues' },
  },
]

// ── Error codes ───────────────────────────────────────────────────────────────

const ERROR_CODES = [
  'Débit faible ou bloqué',
  'Pas de communication avec la pompe à chaleur',
  'Vitesse ventilateur faible / bloquée',
  'Perte de communication ventilateur',
  'Ventilateur défaillant',
  'Pas de communication avec le manifold',
  'Sous-tension alimentation CA',
  'Perte communication onduleur',
  'Capteur température refoulement — valeur basse ou court-circuit',
  'Surchauffe faible / élevée',
  'Échec programmation onduleur',
  'Verrouillage : entraînement',
]

const FAN_GUIDE = {
  causes: [
    'Connexion lâche du connecteur ventilateur principal sur la carte CA',
    'Ventilateur bloqué',
    'Connexion lâche du câble Modbus sur la carte CC',
  ],
  steps: [
    { step: 1, title: 'Vérifier le blocage du ventilateur', detail: "Si un bruit de frottement est audible, utiliser une lampe torche pour vérifier si quelque chose est tombé dans la grille du ventilateur." },
    { step: 2, title: 'Vérifier le connecteur ventilateur sur la carte CA', detail: "Vérifier que le connecteur du ventilateur principal sur la carte CA est bien enfiché et non desserré." },
    { step: 3, title: 'Vérifier le connecteur ventilateur sur la carte CC', detail: "Vérifier que la connexion du ventilateur principal sur la carte CC est bien enfiché et non desserré." },
    { step: 4, title: "Vérifier la tension d'alimentation", detail: "Vérifier que la tension d'alimentation du ventilateur principal depuis la carte CA est bien 230V CA." },
  ],
  escalate: true,
}

const INVERTER_GUIDE = {
  causes: [
    "Problème avec la connexion Modbus à l'onduleur",
    "Connexion Modbus incorrecte dans l'unité ou le hub",
    'Câble Modbus endommagé',
    'Carte CA défaillante',
    'Onduleur défaillant',
    'V4 mal emboîtée ou défaillante',
  ],
  steps: [
    { step: 1, title: 'Vérifier la continuité du câble Modbus', detail: "Vérifier la continuité du câble Modbus entre l'unité et le hub." },
    { step: 2, title: "Vérifier le Modbus à l'onduleur", detail: "Confirmer que le câble Modbus entrant dans l'onduleur est bien serré dans les bornes et que les conducteurs sont dans les embouts." },
    { step: 3, title: 'Vérifier les voyants de la carte CA', detail: "Confirmer que les voyants de la carte CA sont allumés. Sinon, contrôler l'alimentation de la carte." },
    { step: 4, title: "Tester l'onduleur", detail: "Vérifier la tension d'alimentation et les tensions de sortie de l'onduleur." },
    { step: 5, title: 'Vérifier la vanne V4', detail: "Vérifier l'emboîtement et la bobine de la vanne V4." },
  ],
  escalate: true,
}

const GUIDES = {
  'Débit faible ou bloqué': {
    causes: [
      'Filtres bouchés ou air dans le circuit',
      "Le ballon tampon et la pompe de circulation ont été raccordés ou câblés incorrectement",
      "Évaporateur bloqué ou encrassé",
    ],
    steps: [
      { step: 1, title: "Vérifier l'évaporateur", detail: "Vérifier que l'évaporateur n'est pas bloqué. S'il est gelé, le dégivrer en versant de l'eau directement sur l'évaporateur." },
      { step: 2, title: 'Vérifier les obstructions', detail: "Si des arbustes ont poussé ou si des objets ont été placés près de l'évaporateur, les dégager pour rétablir un flux d'air correct." },
      { step: 3, title: "Effectuer une purge d'air", detail: "S'assurer qu'il n'y a pas de poche d'air dans les canalisations en hauteur. Suivre la procédure de purge d'air." },
      { step: 4, title: 'Vérifier tous les filtres', detail: "Vérifier le filtre à l'avant de l'unité et le tamis du filtre magnétique — nettoyer si bloqué." },
      { step: 5, title: 'Vérifier toutes les vannes', detail: 'Confirmer que toutes les vannes et radiateurs sont entièrement ouverts.' },
      { step: 6, title: 'Mode AP — augmenter la vitesse de la pompe', detail: "Si l'erreur persiste, passer en mode AP et régler la vitesse de la pompe à 100% pour chasser l'air résiduel du circuit." },
    ],
    note: "Si la purge d'air est impossible car la panne est active, effectuer un cycle d'alimentation de la pompe à chaleur depuis l'isolateur. Attendre quelques minutes, remettre sous tension, puis effectuer immédiatement une purge d'air via le mode AP.",
    escalate: true,
  },

  'Pas de communication avec la pompe à chaleur': {
    causes: [
      "Coupure d'alimentation de la pompe à chaleur (disjoncteur déclenché, isolateur ouvert ou connexion électrique défaillante)",
      "Le câble Modbus a été câblé incorrectement dans l'unité ou le hub",
      "Le câble Modbus est endommagé ou la terminaison est desserrée",
      "Embouts sertis sur l'isolation plutôt que sur le conducteur",
      'Carte CA / CC défaillante',
      "Connexions Modbus desserrées sur l'onduleur",
      "Dommages ou mauvaise connexion sur le câble de liaison entre la carte CA et la carte CC",
    ],
    steps: [
      { step: 1, title: "Vérifier l'isolateur", detail: "Confirmer que l'isolateur est en marche et qu'aucun disjoncteur d'alimentation n'a déclenché." },
      { step: 2, title: 'Vérifier le voyant de la carte CA', detail: "Confirmer que le voyant de la carte CA clignote." },
      { step: 3, title: 'Vérifier les voyants de la carte CC', detail: "Les voyants Yeux et Cœur sur la carte CC doivent clignoter. Sinon, vérifier toutes les connexions sur les deux cartes." },
      { step: 4, title: "Vérifier les connexions d'alimentation", detail: "Vérifier l'alimentation de la pompe à chaleur au bornier." },
      { step: 5, title: 'Vérifier le câblage Modbus', detail: "Confirmer les terminaisons Modbus dans l'unité et le hub, puis vérifier la continuité du câble." },
      { step: 6, title: "Vérifier la connexion Modbus à l'onduleur", detail: "Vérifier la connexion sur le côté de l'onduleur au bornier vert." },
      { step: 7, title: 'Vérifier les connexions Modbus sur la carte CA', detail: "Vérifier les connexions Modbus pour s'assurer que : tout est correctement connecté et rien n'est desserré, le connecteur est correctement inséré dans la carte CA, les fils sont dans la bonne orientation." },
    ],
    escalate: true,
  },

  'Vitesse ventilateur faible / bloquée': FAN_GUIDE,
  'Perte de communication ventilateur': FAN_GUIDE,
  'Ventilateur défaillant': FAN_GUIDE,

  'Pas de communication avec le manifold': {
    causes: ['Ce défaut nécessite un diagnostic à distance par l\'équipe Octopus'],
    steps: [
      { step: 1, title: "Contacter l'équipe Octopus", detail: "Cette erreur ne peut pas être résolue sur site. Veuillez soumettre une demande d'assistance et l'équipe Octopus effectuera un diagnostic à distance." },
    ],
    escalate: true,
  },

  'Sous-tension alimentation CA': {
    causes: ["Ce défaut est fréquent lors de la mise en service — il se résorbe généralement seul, mais devra être investigué s'il persiste."],
    steps: [
      { step: 1, title: "Cycle d'alimentation de l'unité", detail: "Éteindre et rallumer l'unité. Écouter un clic après l'extinction pour confirmer l'arrêt complet." },
      { step: 2, title: "Vérifier la tension d'alimentation", detail: "Confirmer la présence de 230V aux bornes d'alimentation principale de la pompe à chaleur." },
      { step: 3, title: "Vérifier les tensions de l'onduleur", detail: "Confirmer les tensions correctes sur l'entraînement de l'onduleur." },
    ],
    escalate: true,
  },

  'Perte communication onduleur': INVERTER_GUIDE,

  'Capteur température refoulement — valeur basse ou court-circuit': {
    causes: [
      'Le capteur de refoulement (T10) est desserré',
      'Températures de refoulement élevées',
      'Thermistor ECS dans le mauvais logement du ballon',
      "L'unité ne peut pas distribuer la chaleur dans l'installation",
    ],
    steps: [
      { step: 1, title: 'Vérifier le thermistor ECS', detail: "Confirmer que le thermistor ECS est dans le bon logement du ballon." },
      { step: 2, title: 'Vérifier le capteur NTC T10', detail: "Confirmer que le capteur NTC T10 est correctement emboîté à son point de terminaison sur l'onduleur." },
      { step: 3, title: 'Tester la résistance du capteur NTC T10', detail: "Retirer le capteur T10 et tester la résistance entre les deux câbles T10. Utiliser le tableau de résistances pour vérifier que les valeurs correspondent à la température actuelle au niveau du capteur." },
      { step: 4, title: 'Vérifier le bornier', detail: "Confirmer que le bornier est correctement emboîté dans l'onduleur et que la fiche verte est entièrement insérée." },
      { step: 5, title: 'Vérifier la vanne V1', detail: "Confirmer que la vanne V1 est correctement emboîtée." },
    ],
    note: "Après le test du capteur T10, rebrancher les câbles dans la fiche verte de l'onduleur et s'assurer qu'elle est entièrement insérée. Si des valeurs sont anormales, contacter l'équipe Cosy.",
    escalate: true,
  },

  'Surchauffe faible / élevée': {
    causes: [
      "L'unité ne peut pas évacuer la chaleur dans le circuit",
      'Vanne V1 défaillante ou bloquée',
      'Potentiellement faible charge en frigorigène',
    ],
    steps: [
      { step: 1, title: "Cycle d'alimentation de l'unité et du hub", detail: "Éteindre et rallumer l'unité et le hub pour voir si le défaut se résorbe." },
      { step: 2, title: 'Ouvrir tous les émetteurs', detail: 'Vérifier que tous les radiateurs, boucles de plancher chauffant et autres émetteurs du circuit sont entièrement ouverts.' },
      { step: 3, title: "Vérifier l'emboîtement de la vanne V1", detail: "Confirmer que la vanne V1 est correctement emboîtée. Note : l'unité doit être équipée d'une carte v1.6 pour cette vérification." },
      { step: 4, title: 'Vérifier la connexion de la vanne V1 sur la carte CC', detail: "Confirmer que la connexion de la vanne V1 sur la carte CC est sécurisée." },
      { step: 5, title: 'Vérifier le câblage V1', detail: "Inspecter le câblage de la vanne V1 pour détecter tout dommage visible." },
      { step: 6, title: 'Vérifier le thermistor du ballon ECS', detail: "Confirmer que le thermistor du ballon ECS est dans le bon logement et que de la pâte thermique a été appliquée." },
    ],
    escalate: true,
  },

  'Échec programmation onduleur': INVERTER_GUIDE,
  'Verrouillage : entraînement': INVERTER_GUIDE,
}

// ── Commissioning issues ──────────────────────────────────────────────────────

const COMMISSIONING_ISSUE_CODES = [
  'Pod ne se couple pas',
  'Hub ne se connecte pas au Wi-Fi',
  "Impossible de connecter l'application client au hub",
  'Test du Cosy Hub',
]

const COMMISSIONING_GUIDES = {
  'Pod ne se couple pas': {
    causes: [
      'Matériel du pod nécessitant une réinitialisation',
      "Interférence d'un autre appareil Zigbee utilisant d'anciennes architectures de couplage ouvert (ex. ampoules Philips Hue)",
    ],
    steps: [
      { step: 1, title: 'Retirer la pile du pod', detail: 'Retirer la pile du pod.' },
      { step: 2, title: 'Maintenir le bouton et réinsérer la pile', detail: 'Maintenir le bouton enfoncé tout en réinsérant la pile.' },
      { step: 3, title: 'Maintenir jusqu\'à l\'apparition du voyant rouge', detail: 'Continuer à maintenir le bouton jusqu\'à l\'apparition du voyant rouge. Le pod est maintenant réinitialisé et peut être couplé à nouveau.' },
    ],
    note: "Si le pod reste bloqué en mode couplage après la réinitialisation, la cause probable est une interférence d'un autre appareil Zigbee (ex. ampoules Philips Hue). Si une interférence est suspectée : (1) couper l'alimentation de tous les autres appareils possibles, (2) tenter de coupler les pods à nouveau, (3) si toujours bloqué, réinitialiser comme ci-dessus, (4) retirer le hub et les pods du logement et tenter le couplage avec le hub alimenté séparément hors du logement.",
    escalate: true,
  },

  'Hub ne se connecte pas au Wi-Fi': {
    causes: [
      "Le Wi-Fi du client est éteint ou hors de portée",
      "Pas de signal 2,4 GHz disponible (requis pour le hub)",
      "Wi-Fi double bande — le 5,0 GHz cause des interférences avec la connexion 2,4 GHz",
    ],
    steps: [
      { step: 1, title: 'Vérifier le Wi-Fi du client', detail: "S'assurer que le Wi-Fi du client est allumé et à portée." },
      { step: 2, title: 'Vérifier le signal 2,4 GHz', detail: "Confirmer que le Wi-Fi du client dispose d'un signal 2,4 GHz disponible — requis pour le hub." },
      { step: 3, title: 'Désactiver le 5,0 GHz si double bande', detail: "Si le client a un Wi-Fi double bande (2,4 GHz & 5,0 GHz), lui demander de désactiver le réseau 5,0 GHz et retenter la connexion du Cosy Hub." },
      { step: 4, title: 'Réactiver le 5,0 GHz après connexion', detail: "Une fois le Cosy Hub connecté au Wi-Fi, le réseau 5,0 GHz peut être réactivé." },
    ],
    escalate: true,
  },

  "Impossible de connecter l'application client au hub": {
    causes: [
      "Client non connecté à l'application Octopus",
      "Le client n'a pas de compte Octopus",
      "Méthode de couplage incorrecte utilisée dans l'application",
    ],
    steps: [
      { step: 1, title: "Vérifier que le client est connecté à l'application Octopus", detail: "Les clients existants doivent utiliser leur compte habituel. Les nouveaux clients devraient avoir reçu un compte lors de la vente — s'ils n'en ont pas, contacter l'équipe support Cosy." },
      { step: 2, title: "Aller à la page d'accueil de l'application", detail: "Sur la page d'accueil de l'application, sélectionner l'icône de visage dans le coin droit." },
      { step: 3, title: "Naviguer vers Ajouter un appareil Octopus", detail: "Aller dans Appareils → Ajouter un appareil Octopus." },
      { step: 4, title: 'Scanner le QR code du hub', detail: "Scanner le QR code sur le hub à l'aide de la caméra intégrée." },
    ],
    escalate: true,
  },

  'Test du Cosy Hub': {
    description: "Vérifier que tout le câblage du hub est correctement terminé, que toutes les bornes sont bien serrées et qu'il y a 230V à l'alimentation secteur. Si tout le câblage est correct, les pods connectés, le hub connecté/en ligne, mais des problèmes persistent, déconnecter tous les câbles en ne laissant que l'alimentation secteur et effectuer les vérifications suivantes :",
    steps: [
      { step: 1, title: 'Tester le relais de chauffage', detail: "Lors d'un appel de chaleur via les pods, confirmer que le voyant chauffage du hub passe au blanc et que le relais clique audiblement. Si plusieurs zones sont présentes, répéter pour chaque pod/zone." },
      { step: 2, title: 'Tester les bornes du port chauffage zone 1', detail: "Sur les bornes du port chauffage zone 1, avec un test bifilaire, confirmer 230V entre L+PE et L+N. La borne CH est une ligne de commutation et ne doit afficher 230V que lors d'un appel de chaleur." },
      { step: 3, title: "Tester les bornes du port eau chaude", detail: "Sur les bornes du port eau chaude, confirmer 230V entre L+PE et L+N. La borne ECS est une ligne de commutation et ne doit afficher 230V que lors d'un appel de chaleur." },
      { step: 4, title: 'Tester les ports zone 2 et AUX/zone 3', detail: "Les ports zone 2 et AUX/zone 3, laissés déconnectés, sont sans tension. Testés en continuité, ils afficheront un circuit ouvert sans appel de chaleur, et 0 Ω ou plus lors d'un appel de chaleur." },
    ],
  },
}

// ── Shared components ─────────────────────────────────────────────────────────

function GuideView({ guide, onEscalate, onBack, backLabel }) {
  const navigate = useNavigate()
  const [resolved, setResolved] = useState(false)

  if (resolved) {
    return (
      <div className="mt-6 card text-center py-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-bold text-brand-navy">Problème résolu !</p>
        <p className="text-gray-500 text-sm mt-1 mb-5">Ravi d'avoir pu vous aider.</p>
        <button className="btn-primary max-w-xs mx-auto" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      {guide.description && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-blue-800">{guide.description}</p>
        </div>
      )}

      {guide.causes && guide.causes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Causes possibles</p>
          <div className="card space-y-2">
            {guide.causes.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-pink flex-shrink-0 mt-2" />
                <p className="text-sm text-gray-700">{c}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions à entreprendre</p>
        <div className="card space-y-4">
          {guide.steps.map(s => (
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
      </div>

      {guide.note && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2.5">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-800">{guide.note}</p>
        </div>
      )}

      <div className="pt-2 space-y-3">
        <button onClick={() => setResolved(true)} className="btn-primary flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Problème résolu
        </button>
        {guide.escalate && (
          <button onClick={onEscalate} className="btn-secondary flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Toujours pas résolu — contacter le support
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'quick-checks',
    label: 'Vérifications rapides',
    subtitle: 'Premiers contrôles avant diagnostic',
    bg: 'bg-green-50',
    color: 'text-green-600',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    id: 'error-codes',
    label: 'Codes erreur',
    subtitle: "Codes de panne & guides de diagnostic",
    bg: 'bg-red-50',
    color: 'text-red-500',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
  },
  {
    id: 'commissioning-issues',
    label: 'Problèmes de mise en service',
    subtitle: "Problèmes rencontrés lors de l'installation",
    bg: 'bg-purple-50',
    color: 'text-brand-purple',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
]

export default function TroubleshootingPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [openCheck, setOpenCheck] = useState(null)

  const filteredCodes = ERROR_CODES.filter(c => c.toLowerCase().includes(search.toLowerCase()))

  function handleEscalate() { navigate('/assistance') }
  function goBack() {
    if (selected) { setSelected(null); return }
    setSection(null); setSearch('')
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-5 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => section ? goBack() : navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Dépannage</h1>
            <p className="text-brand-cyan/70 text-xs">
              {section ? SECTIONS.find(s => s.id === section)?.label : 'Support Cosy — guide de panne'}
            </p>
          </div>
        </div>
        {section === 'error-codes' && !selected && (
          <input type="search" placeholder="Rechercher un code erreur…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white/20" />
        )}
      </div>

      <div className="px-6 py-4 pb-12">

        {/* Section picker */}
        {!section && (
          <div className="space-y-3">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className="w-full card flex items-center gap-4 active:bg-gray-50 transition-colors">
                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>
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

        {/* Quick checks */}
        {section === 'quick-checks' && !selected && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sélectionner un problème</p>
            {QUICK_CHECKS.map((qc, i) => (
              <div key={qc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setOpenCheck(openCheck === qc.id ? null : qc.id)}>
                  <span className="text-xl">{qc.icon}</span>
                  <span className="flex-1 font-semibold text-sm text-brand-navy">{qc.title}</span>
                  <svg className={`w-4 h-4 text-gray-300 transition-transform ${openCheck === qc.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {openCheck === qc.id && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <ol className="mt-3 space-y-3">
                      {qc.steps.map((step, j) => (
                        <li key={j} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">{j + 1}</span>
                          <div>
                            <p className="font-semibold text-sm text-brand-navy">{step.title}</p>
                            <p className="text-sm text-gray-600 mt-0.5">{step.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {qc.link && (
                      <button onClick={handleEscalate}
                        className="mt-4 w-full text-center text-sm text-brand-purple font-medium">
                        Toujours pas résolu — contacter le support →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error codes list */}
        {section === 'error-codes' && !selected && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sélectionner un code erreur</p>
            {filteredCodes.map(code => (
              <button key={code} onClick={() => { setSelected(code); window.scrollTo(0,0) }}
                className="w-full card flex items-center justify-between active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${GUIDES[code] ? 'bg-brand-pink' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-brand-navy">{code}</span>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
            {filteredCodes.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Aucun code correspondant</p>}
          </div>
        )}

        {/* Error code detail */}
        {section === 'error-codes' && selected && (
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-brand-purple text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tous les codes erreur
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-pink" />
              <h2 className="font-bold text-brand-navy text-lg">{selected}</h2>
            </div>
            {GUIDES[selected]
              ? <GuideView guide={GUIDES[selected]} onEscalate={handleEscalate} />
              : (
                <div className="mt-6 card text-center py-8">
                  <p className="text-gray-500 text-sm font-medium">Guide en cours de rédaction</p>
                  <p className="text-gray-400 text-xs mt-1 mb-4">Les étapes détaillées pour <strong>{selected}</strong> seront bientôt disponibles.</p>
                  <button onClick={handleEscalate} className="btn-secondary text-sm">Contacter le support technique</button>
                </div>
              )
            }
          </div>
        )}

        {/* Commissioning list */}
        {section === 'commissioning-issues' && !selected && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sélectionner un problème</p>
            {COMMISSIONING_ISSUE_CODES.map(code => (
              <button key={code} onClick={() => { setSelected(code); window.scrollTo(0,0) }}
                className="w-full card flex items-center justify-between active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-brand-purple" />
                  <span className="text-sm font-medium text-brand-navy">{code}</span>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Commissioning detail */}
        {section === 'commissioning-issues' && selected && (
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-brand-purple text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tous les problèmes de mise en service
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-purple" />
              <h2 className="font-bold text-brand-navy text-lg">{selected}</h2>
            </div>
            {COMMISSIONING_GUIDES[selected]
              ? <GuideView guide={COMMISSIONING_GUIDES[selected]} onEscalate={handleEscalate} />
              : (
                <div className="mt-6 card text-center py-8">
                  <p className="text-gray-500 text-sm font-medium">Guide en cours de rédaction</p>
                  <button onClick={handleEscalate} className="btn-secondary text-sm mt-3">Contacter le support technique</button>
                </div>
              )
            }
          </div>
        )}

      </div>
    </div>
  )
}
