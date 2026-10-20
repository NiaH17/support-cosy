import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageRow } from '../components/GuideImages'

// ── Unit specs (source: Manuel d'installation FRV1, section 7) ──────────────────

const UNIT_SPECS = {
  headers: ['', 'Cosy 6', 'Cosy 9', 'Cosy 12'],
  rows: [
    ['Puissance calorifique nominale (A7/W35)', '6 kW', '10,0 kW', '12,0 kW'],
    ['Puissance de conception Turbo (A-5/W65)', '5,1 kW', '8,2 kW', '9,98 kW'],
    ['Puissance de conception EcoMax (A-5/W50)', '5,6 kW', '8,7 kW', '11,25 kW'],
    ['Puissance minimum (A7/W35)', '1,9 kW', '2,7 kW', '2,7 kW'],
    ['Puissance minimum (A7/W55)', '1,6 kW', '2,4 kW', '2,5 kW'],
    ['Puissance minimum (A-7/W35)', '1,3 kW', '2,1 kW', '2,1 kW'],
    ['Puissance minimum (A-7/W55)', '1,2 kW', '1,7 kW', '1,8 kW'],
    ['COP (A7/W35) — EN 14511', '4,2 (à 5,63 kW)', '4,65 (à 8,1 kW)', '4,89 (à 9,1 kW)'],
    ['COP (A7/W55) — EN 14511', '—', '2,96 (à 8,0 kW)', '3,27 (à 9,1 kW)'],
    ['COP (A7/W65) — EN 14511', '2,3 (à 5,23 kW)', '2,42 (à 7,9 kW)', '2,71 (à 9,1 kW)'],
    ['Longueur', '855 mm', '855 mm', '855 mm'],
    ['Hauteur', '1125 mm', '1375 mm', '1375 mm'],
    ['Profondeur', '595 mm', '595 mm', '595 mm'],
    ['Poids', '100 kg', '125 kg', '125 kg'],
    ['Volume', '0,44 m³', '0,56 m³', '0,56 m³'],
    ['Puissance acoustique (chauffage, A7/W55)', '58 dB(A)', '56 dB(A)', '61 dB(A)'],
    ['Puissance acoustique (chauffage, A7/W65)', '59 dB(A)', '57 dB(A)', '61 dB(A)'],
    ['Température de départ maximum', '70 °C', '70 °C', '70 °C'],
    ['Débit volumétrique maximum', '25 l/min', '28,9 l/min', '34,5 l/min'],
    ['Débit volumétrique minimum', '7 l/min', '7 l/min', '7 l/min'],
    ['Volume de système minimum', '90 L', '135 L', '135 L'],
    ['Longueur efficace max. de tuyau primaire', '20 m', '25 m', '25 m'],
    ['Raccords de tuyauterie', 'G1" à joint plat', 'G1" à joint plat', 'G1" à joint plat'],
    ['Type de réfrigérant', 'R290 (propane)', 'R290 (propane)', 'R290 (propane)'],
    ['Charge de réfrigérant', '0,65 kg', '0,88 kg', '1,30 kg'],
    ['Alimentation électrique', '230 V monophasé 50 Hz', '230 V monophasé 50 Hz', '230 V monophasé 50 Hz'],
    ['Courant maximum nominal', '16 A', '20 A', '32 A'],
    ['Disjoncteur', 'Courbe B', 'Courbe B', 'Courbe B'],
    ['Interrupteur différentiel (DDR)', 'Type B', 'Type B', 'Type B'],
    ['Longueur max. du câble Modbus', '50 m', '50 m', '50 m'],
    ['Indice de protection', 'IPX5', 'IPX5', 'IPX5'],
    ['Technologie de démarrage', 'Onduleur', 'Onduleur', 'Onduleur'],
    ['Type de compresseur', 'Scroll', 'Scroll', 'Scroll'],
    ["Huile du compresseur", 'HATCOL 4467', 'HATCOL 4467', 'PAG-68 (Zerol RFL 68-EP)'],
    ['Puissance max. du ventilateur', '140 W', '170 W', '275 W'],
    ['Vitesse max. du ventilateur', '940 min⁻¹', '940 min⁻¹', '1400 min⁻¹'],
  ]
}

// ── Clearances (source: Manuel d'installation FRV1, section 6) ───────────────

const CLEARANCES_NOTES = [
  "Les arbustes et haies denses qui limitent le flux d'air comptent comme des murs. Les grillages, treillis et clôtures ajourées peuvent être ignorés.",
  "Un seul mur latéral est autorisé en plus du mur arrière. Si un côté a un mur/clôture >300 mm à moins de 1 m, l'autre côté ne doit en avoir aucun à moins de 1 m.",
  "Sites exposés au vent : placer l'arrière de l'unité face à un bloc massif (mur ou clôture) à plus de 250 mm, au moins aussi haut que le serpentin de l'évaporateur et de plus de 1200 mm de large.",
  "Les compteurs et canalisations de gaz sont autorisés dans toutes les zones. Les briques alvéolées et évents de drainage sont autorisés partout, même juste derrière l'unité.",
  "Une unité placée à une distance de sécurité autre que le minimum augmente le risque de chocs accidentels avec le temps.",
]

const CLEARANCES = {
  'Cosy 6': {
    operational: [
      { label: "Avant (du sol au fond de l'ouverture du ventilateur)", value: '500 mm' },
      { label: 'Côtés — aucun mur/clôture >300 mm à moins de', value: '500 mm' },
      { label: 'Arrière — distance minimale obligatoire', value: '250 mm' },
      { label: 'Surplomb (depuis la base)', value: '1500 mm (2000 mm si un côté est limité par un mur à moins de 1 m)' },
    ],
    safety: [
      { label: "Zone sans sources d'allumage (interrupteurs, connexions, toute source d'allumage)", value: '300 mm latéral / 950 mm vertical' },
      { label: 'Portes et fenêtres ouvrantes (aucune autorisée dans la zone)', value: '300 mm latéral / 950 mm vertical' },
      { label: 'Fenêtres scellées en permanence, ou entièrement au-dessus de la zone', value: 'Autorisées' },
    ],
  },
  'Cosy 9 & 12': {
    operational: [
      { label: "Avant — retrait de la porte (du sol au fond de l'ouverture du ventilateur)", value: '500 mm' },
      { label: "Avant — au-dessus du fond de l'ouverture du ventilateur (évite le recyclage de l'air)", value: '750 mm' },
      { label: 'Côtés — aucun mur/clôture >300 mm à moins de', value: '500 mm' },
      { label: 'Arrière — distance minimale obligatoire', value: '250 à 500 mm' },
      { label: 'Surplomb (depuis la base)', value: '1500 mm (2000 mm si un côté est limité par un mur à moins de 1 m)' },
    ],
    safety: [
      { label: "Zone sans sources d'allumage (interrupteurs, connexions, toute source d'allumage)", value: '300 mm latéral / 1200 mm vertical' },
      { label: 'Portes et fenêtres ouvrantes (aucune autorisée dans la zone)', value: '300 mm latéral / 1200 mm vertical' },
      { label: 'Fenêtres scellées en permanence, ou entièrement au-dessus de la zone', value: 'Autorisées' },
    ],
  },
}

// ── Sécurité R290 (source: Manuel d'installation FRV1, sections 1.3 à 1.7 et 14.5) ──

const R290_SAFETY = [
  {
    title: 'À propos du R290',
    tone: 'red',
    items: [
      "Le R290 (propane) est un réfrigérant inflammable de catégorie de sécurité A3.",
      "Incolore et inodore : aucun odorant n'est ajouté pour faciliter la détection d'une fuite.",
      "Plus lourd que l'air : il s'accumule dans les points bas (tubes, purges).",
      "Une fuite en présence d'une source d'allumage crée un risque d'incendie ou d'explosion.",
    ],
  },
  {
    title: 'Avant toute intervention',
    tone: 'red',
    items: [
      "Ne percez ni ne brûlez aucune pièce de l'unité.",
      "Ne fumez pas autour de l'unité, que ce soit pendant le travail ou le transport. Pas de flamme nue à proximité.",
      "Vérifiez l'absence de toute source d'allumage près du produit.",
      "Ne stockez jamais l'unité dans un espace confiné avec des sources d'allumage en fonctionnement continu (flammes nues, appareils à gaz en service, chauffages électriques).",
      "Stockez l'unité à l'abri des dommages mécaniques pouvant créer une fuite. Stockée à l'intérieur, elle doit se trouver dans une pièce de surface suffisante pour sa charge totale de réfrigérant.",
      "Utilisez un détecteur de gaz calibré pour le R290, réglé sur 25 % maximum de la limite inférieure d'inflammabilité (LII).",
    ],
  },
  {
    title: 'Qualifications requises',
    tone: 'amber',
    items: [
      "Seul un personnel connaissant les propriétés et les risques du R290 doit ouvrir l'unité.",
      "Travailler sur le circuit de réfrigérant exige une formation spécifique en plus des procédures de réparation standard, car le réfrigérant est inflammable.",
      "Toute personne qui intervient sur le circuit de réfrigérant ou y accède doit détenir un certificat valide d'un organisme d'évaluation agréé, attestant sa compétence pour la manipulation sûre des réfrigérants.",
      "Les interventions qui nécessitent l'aide d'autres personnes compétentes se font sous la supervision de la personne compétente pour les réfrigérants de catégorie A3.",
      "L'entretien suit uniquement les recommandations d'Octopus Heating, le fabricant d'origine.",
      "Respectez la réglementation de votre juridiction relative au R290, en plus de ce manuel.",
    ],
  },
  {
    title: "Implantation de l'unité",
    tone: 'amber',
    items: [
      "Installez l'unité à l'écart de toute source de gaz inflammables.",
      "Arrimez l'unité pendant toutes les phases de l'installation pour éviter tout basculement.",
      "Respectez les dégagements opérationnels et de sécurité (voir « Dégagements »), idéalement dès l'étude d'implantation.",
      "L'unité produit de l'eau (formation et fonte de la glace) : prévoyez un drainage adapté.",
    ],
  },
  {
    title: 'Fuite suspectée',
    tone: 'red',
    items: [
      "Contactez immédiatement le support technique d'Octopus Energy et éloignez de l'unité toute électronique et toute source d'allumage.",
      "Un sifflement provenant de l'unité peut indiquer une fuite. L'unité peut aussi forcer davantage, puis s'arrêter.",
      "N'utilisez jamais une source d'allumage pour détecter une fuite : ni lampe aux halogénures, ni flamme nue.",
      "Utilisez un détecteur électronique adapté au R290, calibré dans une zone sans réfrigérant et réglé sur 25 % maximum de la LII. Vérifiez qu'il n'est pas lui-même une source d'allumage.",
      "Évitez les détergents contenant du chlore : ils peuvent corroder les tubes en cuivre.",
      "Éteignez ou retirez toute flamme nue.",
      "Ne tentez jamais de réparer une fuite suspectée, un tube de réfrigérant ou un composant.",
    ],
  },
  {
    title: 'Sécurité générale',
    tone: 'amber',
    items: [
      "Portez des gants de protection pour déballer et déplacer l'unité : les ailettes de l'évaporateur peuvent blesser.",
      "Ne touchez pas la tuyauterie en fonctionnement : tubes et surfaces internes peuvent dépasser 100 °C.",
      "Les composants du caisson fermé peuvent causer de graves brûlures même après l'arrêt de l'unité.",
    ],
  },
  {
    title: 'Premiers secours',
    tone: 'info',
    items: [
      "Asphyxie (concentrations élevées) : la victime peut ne pas s'en rendre compte. Déplacez-la dans une zone bien ventilée, allongez-la et appelez immédiatement un médecin.",
      "Inhalation : allez à l'air frais. Si la respiration est difficile, administrez de l'oxygène. Appelez un médecin si l'irritation persiste.",
      "Peau : laissez s'évaporer, rincez abondamment à l'eau et au savon, retirez les vêtements contaminés. Médecin si les symptômes persistent.",
      "Yeux : retirez les lentilles, maintenez les paupières ouvertes et rincez à l'eau pendant 15 minutes. Médecin si l'irritation persiste.",
      "Ingestion : rincez la bouche à l'eau. Ne faites pas vomir. Ne donnez jamais rien par la bouche à une personne inconsciente.",
    ],
  },
  {
    title: 'Incendie et fuite accidentelle',
    tone: 'info',
    items: [
      "Moyens d'extinction adaptés : poudre, eau pulvérisée ou brumisée, mousse AFFF. Refroidissez les contenants exposés au feu à l'eau pulvérisée.",
      "Moyens inadaptés : jet d'eau à haute pression, dioxyde de carbone.",
      "L'échauffement produit des fumées dangereuses. Portez un appareil respiratoire autonome et des vêtements de protection.",
      "Fuite accidentelle : assurez une ventilation suffisante, évacuez vers une zone sûre, tenez le public à l'écart et éliminez toutes les sources d'allumage.",
      "Ne pas rejeter dans l'environnement. Abattez les gaz et vapeurs avec un jet d'eau pulvérisée.",
    ],
  },
]

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
    id: 'controller-ref',
    title: 'Écrans du contrôleur Cosy (EN + FR)',
    iframe: '/reference/cosy-controller.html',
    steps: [],
  },
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
         steps: [
      { step: 1, title: 'Entrer en mode installateur AP', detail: "Ouvrir l'onglet de configuration du système." },
      { step: 2, title: 'Vérifier que tous les émetteurs sont ouverts', detail: "S'assurer que tous les émetteurs sont entièrement ouverts, y compris les zones de plancher chauffant." },
      { step: 3, title: 'Régler la pompe primaire à 100 %', detail: "Sélectionner la pompe primaire sur « on »." },
      { step: 4, title: "Activer la pompe ECS", detail: "Activer l'interrupteur de la pompe ECS pour purger l'air du circuit d'eau chaude sanitaire." },
      { step: 5, title: 'Répéter pour chaque zone', detail: "Une fois le circuit ECS terminé, répéter l'opération pour la zone 1 (et la zone 2 / Aux si nécessaire) jusqu'à évacuation de l'air excédentaire. Mettre la pompe ECS sur « off » avant de passer à la zone 1, et la zone 1 sur « off » avant de passer à la zone 2." },
    ],
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
  { id: 'r290', label: 'Sécurité R290', subtitle: 'Réfrigérant inflammable, qualifications, urgences', icon: '⚠️' },
  { id: 'specs', label: 'Caractéristiques techniques', subtitle: 'Dimensions, poids, électrique, réfrigérant', icon: '📐' },
  { id: 'clearances', label: 'Dégagements', subtitle: 'Espacements et zones de sécurité autour de l\'unité', icon: '📏' },
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

        {/* R290 safety */}
        {section === 'r290' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-red-700 font-semibold">
                Avertissement : danger d'incendie ou d'explosion du fait de gaz inflammables. Les pompes à chaleur Cosy contiennent du R290 (propane).
              </p>
            </div>
            {R290_SAFETY.map(block => {
              const tone = {
                red:   { box: 'bg-red-50 border-red-200', title: 'text-red-700', dot: 'bg-red-400' },
                amber: { box: 'bg-amber-50 border-amber-200', title: 'text-amber-800', dot: 'bg-amber-400' },
                info:  { box: 'bg-white border-gray-200', title: 'text-brand-navy', dot: 'bg-brand-purple' },
              }[block.tone]
              return (
                <div key={block.title} className={`rounded-2xl border px-4 py-3 ${tone.box}`}>
                  <p className={`text-sm font-bold mb-2 ${tone.title}`}>{block.title}</p>
                  <ul className="space-y-2">
                    {block.items.map((it, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${tone.dot}`} />
                        <span className="text-sm text-gray-700 leading-snug">{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
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
                  <p className="text-sm text-gray-500">Dégagements opérationnels & zones de sécurité R290</p>
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
                <div key={i} className={`flex items-start px-4 py-3 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <span className="text-xs text-gray-600 flex-1">{r.label}</span>
                  <span className="text-xs font-bold text-brand-purple text-right max-w-[45%]">{r.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Zones de sécurité R290</p>
            <div className="card p-0 overflow-hidden">
              {CLEARANCES[selected].safety.map((r, i) => (
                <div key={i} className={`flex items-start px-4 py-3 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <span className="text-xs text-gray-600 flex-1">{r.label}</span>
                  <span className="text-xs font-bold text-brand-pink text-right max-w-[45%]">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4 space-y-2">
              {CLEARANCES_NOTES.map((n, i) => (
                <p key={i} className="text-xs text-amber-800 leading-snug">{n}</p>
              ))}
            </div>
          </div>
        )}

        {/* Cosy Hub LEDs */}
        {section === 'hub' && (
          <div>
            <div className="mb-5">
              <ImageRow images={[{ src: '/images/cosy-hub-front.png', caption: 'Cosy Hub — face avant' }]} title="Cosy Hub" />
            </div>
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
          if (cs.iframe) {
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-brand-purple text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Mise en service
                  </button>
                  <a href={cs.iframe} target="_blank" rel="noreferrer" className="text-brand-purple text-sm font-medium">Plein écran ↗</a>
                </div>
                <h2 className="font-bold text-brand-navy text-lg mb-1">{cs.title}</h2>
                <p className="text-sm text-gray-500 mb-3">Les écrans du contrôleur sont en anglais. La traduction française figure entre crochets.</p>
                <iframe src={cs.iframe} title={cs.title} sandbox="allow-scripts allow-same-origin"
                  className="w-full rounded-2xl border border-gray-200 bg-white" style={{ height: 'calc(100vh - 230px)', minHeight: 480 }} />
              </div>
            )
          }
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
