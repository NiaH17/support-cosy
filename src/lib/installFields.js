// Shared definition of the install registration form (French for installers, English for admins).

export const MODELS = ['Cosy 6', 'Cosy 9', 'Cosy 12']

export const CHECKS = [
  { section: 'pre', key: 'clearances',    fr: "Dégagements minimum vérifiés autour de l'unité extérieure (flux d'air libre)", en: 'Minimum clearances verified around outdoor unit (unhindered airflow)' },
  { section: 'pre', key: 'secured',       fr: 'Unité fixée et de niveau', en: 'Unit secured and level' },
  { section: 'pre', key: 'insulation',    fr: 'Tuyauterie extérieure isolée avec un isolant étanche à la vapeur, résistant aux UV et aux intempéries', en: 'External pipework insulated with UV/weather-rated vapour-tight insulation' },
  { section: 'pre', key: 'condensate',    fr: 'Évacuation des condensats raccordée à un puisard / regard avec protection contre le gel', en: 'Condensate drainage routed to soakaway/gully with freeze protection' },
  { section: 'pre', key: 'flushed',       fr: 'Circuit primaire rincé et filtre magnétique en ligne nettoyé', en: 'Primary system flushed and in-line magnetic filter cleaned' },
  { section: 'ctl', key: 'hub_online',    fr: 'Cosy Hub connecté au réseau domestique et en ligne', en: 'Cosy Hub connected to home network & live' },
  { section: 'ctl', key: 'weather_comp',  fr: "Consignes de loi d'eau réglées", en: 'Weather compensation setpoints set' },
  { section: 'ctl', key: 'app_connected', fr: "Propriétaire connecté à l'application Cosy", en: 'Homeowner connected to Cosy app' },
  { section: 'ctl', key: 'app_understood', fr: "Le propriétaire comprend le fonctionnement via l'application", en: 'Homeowner understands operation via app' },
]

export const PHOTOS = [
  { section: 'pre', key: 'unit_area',         fr: "Photo de l'unité et de son environnement", en: 'Photo of unit and surrounding area' },
  { section: 'pre', key: 'cylinder',          fr: "Photo de l'emplacement du ballon et des commandes", en: 'Photo of cylinder location and controls' },
  { section: 'pre', key: 'prv',               fr: 'Photo de la soupape de sécurité (PRV)', en: 'Photo of PRV' },
  { section: 'elec', key: 'dist_board',       fr: 'Photo du ou des tableaux de distribution et de tous les disjoncteurs', en: 'Photo of distribution board(s) and all breakers' },
  { section: 'elec', key: 'hub_wiring',       fr: 'Photo du câblage à l\'intérieur du Cosy Hub', en: 'Photo of wiring inside Cosy Hub' },
  { section: 'elec', key: 'unit_terminations', fr: "Photo des raccordements électriques à l'intérieur de l'unité Cosy", en: 'Photo of electrical terminations inside Cosy unit' },
]

export const DECLARATION = {
  fr: "Les soussignés confirment que le système a été installé et mis en service conformément aux spécifications techniques du fabricant.",
  en: 'The undersigned confirm the system has been installed and commissioned in accordance with manufacturer technical specifications.',
}

export const MAX_PHOTOS_PER_ITEM = 3
export const BUCKET = 'install-photos'
