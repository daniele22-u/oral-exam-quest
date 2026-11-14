export type Confidence = "prudente" | "solido" | "senzarete";
export type ExaminerId = "severo" | "empatico" | "distratto";
export interface Topic {
  id: string;
  course: string;
  title: string;
  question: string;
  keywords: string[];
  followUps: string[];
  model: string;
}
export interface Examiner {
  id: ExaminerId;
  name: string;
  title: string;
  trait: string;
  open: string[];
  push: string[];
  praise: string[];
  doubt: string[];
}

export const CONFIDENCE: Record<
  Confidence,
  { label: string; desc: string; mult: number; penalty: number; followUps: number }
> = {
  prudente: {
    label: "Prudente",
    desc: "Rischio contenuto. Pochi crediti, poche domande di verifica.",
    mult: 1,
    penalty: 4,
    followUps: 2,
  },
  solido: {
    label: "Solido",
    desc: "Convinzione dichiarata. Guadagno e verifica intermedi.",
    mult: 2,
    penalty: 10,
    followUps: 3,
  },
  senzarete: {
    label: "Senza Rete",
    desc: "Massima convinzione: crediti tripli, ma l'esaminatore incalza.",
    mult: 3,
    penalty: 20,
    followUps: 4,
  },
};

export const EXAMINERS: Examiner[] = [
  {
    id: "severo",
    name: "Prof.ssa Ferraris",
    title: "L'Esaminatrice Severa",
    trait: "Rigore assoluto, nessuna indulgenza sulle imprecisioni.",
    open: ["Cominciamo. Senza giri di parole:", "Vediamo se ha studiato davvero."],
    push: [
      "Impreciso. Sia rigoroso:",
      "Non mi basta. Vada a fondo:",
      "Questa è una risposta da manuale divulgativo. Mi dica:",
    ],
    praise: ["Corretto. Proseguiamo.", "Accettabile."],
    doubt: ["Mi sta ripetendo parole a memoria?", "Ne è sicuro? Lo vedremo."],
  },
  {
    id: "empatico",
    name: "Prof. Lombardi",
    title: "L'Esaminatore Empatico",
    trait: "Guida lo studente, ma pretende comprensione vera.",
    open: ["Si tranquillizzi, partiamo da qui:", "Con calma, mi racconti:"],
    push: [
      "Ci sta arrivando. Provi a pensare a questo:",
      "Bene l'intuizione, ora approfondiamo:",
      "Mi aiuti a capire meglio:",
    ],
    praise: ["Molto bene, si vede che ha capito.", "Ottimo ragionamento."],
    doubt: ["Non si preoccupi, riformuliamo.", "Va bene anche sbagliare, ragioniamoci."],
  },
  {
    id: "distratto",
    name: "Prof. Bassani",
    title: "L'Esaminatore Distratto",
    trait: "Sembra non ascoltare, poi ti coglie impreparato.",
    open: ["Mmh… dove eravamo… ah sì:", "(sfogliando appunti) Allora, mi dica:"],
    push: [
      "Scusi, mi ero perso. Ma allora:",
      "Interessante… e quindi, riguardo a questo:",
      "(alza lo sguardo all'improvviso) E invece:",
    ],
    praise: ["Sì, sì, va bene.", "Mh. Corretto, credo."],
    doubt: [
      "Come diceva? Ripeta in modo più chiaro.",
      "Non mi ha convinto, ma forse non ascoltavo.",
    ],
  },
];

export const PRESIDENT = { name: "Prof. Emerito Valdameri", title: "Il Presidente di Commissione" };

export const COURSES = ["Signal Processing", "Neuroengineering"] as const;

export const TOPICS: Topic[] = [
  {
    id: "sp-nyquist",
    course: "Signal Processing",
    title: "Teorema del campionamento",
    question: "Enunci il teorema di Nyquist-Shannon e spieghi cosa accade se non viene rispettato.",
    keywords: [
      "frequenza",
      "doppio",
      "banda",
      "aliasing",
      "nyquist",
      "campion",
      "ricostru",
      "filtro",
    ],
    followUps: [
      "Come si previene l'aliasing in pratica, prima del convertitore?",
      "Cosa succede a un segnale a 7 kHz campionato a 10 kHz?",
      "Perché la ricostruzione ideale usa la funzione sinc?",
      "Che cosa si intende per sovracampionamento e perché conviene?",
    ],
    model:
      "Un segnale a banda limitata B può essere ricostruito esattamente dai campioni se fs > 2B. Altrimenti le repliche spettrali si sovrappongono (aliasing). Si usa un filtro anti-aliasing passa-basso prima dell'ADC; la ricostruzione ideale è un passa-basso ideale, la cui risposta impulsiva è una sinc.",
  },
  {
    id: "sp-fft",
    course: "Signal Processing",
    title: "DFT e FFT",
    question:
      "Che differenza c'è tra DFT e FFT, e qual è la complessità computazionale di ciascuna?",
    keywords: [
      "fft",
      "dft",
      "complessit",
      "log",
      "n^2",
      "algoritmo",
      "cooley",
      "radice",
      "campioni",
      "spettro",
    ],
    followUps: [
      "Cos'è il leakage spettrale e come lo si attenua?",
      "Che ruolo ha lo zero-padding sulla risoluzione?",
      "Perché la FFT radix-2 richiede N potenza di 2?",
      "Come interpreta la periodicità implicita della DFT?",
    ],
    model:
      "La DFT è la trasformata discreta (O(N²)); la FFT è un algoritmo efficiente per calcolarla (O(N log N)), es. Cooley-Tukey radix-2. Il leakage deriva dal troncamento e si attenua con finestre (Hann, Hamming); lo zero-padding interpola lo spettro ma non aumenta la risoluzione reale.",
  },
  {
    id: "sp-fir",
    course: "Signal Processing",
    title: "Filtri FIR e IIR",
    question: "Confronti filtri FIR e IIR: struttura, stabilità e fase.",
    keywords: [
      "fir",
      "iir",
      "fase lineare",
      "stabil",
      "poli",
      "zeri",
      "retroazione",
      "ricorsiv",
      "ordine",
    ],
    followUps: [
      "Perché un FIR è sempre stabile?",
      "Come si ottiene fase lineare in un FIR?",
      "Quando preferirebbe un IIR?",
      "Cos'è la trasformazione bilineare?",
    ],
    model:
      "I FIR non hanno retroazione, hanno solo zeri (poli nell'origine) e sono sempre stabili; con coefficienti simmetrici hanno fase lineare. Gli IIR sono ricorsivi, ottengono selettività con ordine minore ma possono essere instabili e non hanno fase lineare. La bilineare mappa filtri analogici in digitali.",
  },
  {
    id: "sp-ztr",
    course: "Signal Processing",
    title: "Trasformata Zeta",
    question:
      "Cos'è la trasformata Z e come si legge la stabilità di un sistema dalla regione di convergenza?",
    keywords: [
      "z",
      "regione",
      "convergenza",
      "cerchio unitario",
      "poli",
      "stabil",
      "causal",
      "laplace",
    ],
    followUps: [
      "Che relazione c'è con la DTFT?",
      "Un sistema causale stabile dove ha i poli?",
      "Cosa rappresenta lo zero sul cerchio unitario?",
      "Come si passa da equazione alle differenze a funzione di trasferimento?",
    ],
    model:
      "La trasformata Z generalizza la DTFT (che è la Z valutata sul cerchio unitario). Un sistema LTI è stabile se la ROC include il cerchio unitario; se causale, tutti i poli devono essere interni al cerchio unitario.",
  },
  {
    id: "ne-eeg",
    course: "Neuroengineering",
    title: "Elaborazione del segnale EEG",
    question: "Descriva le principali bande EEG e la pipeline di preprocessing tipica.",
    keywords: [
      "delta",
      "theta",
      "alpha",
      "beta",
      "gamma",
      "filtr",
      "artefatt",
      "ica",
      "riferimento",
      "notch",
    ],
    followUps: [
      "Come rimuove gli artefatti oculari?",
      "Perché si applica un filtro notch a 50 Hz?",
      "Che impatto ha la scelta del riferimento?",
      "Cos'è l'ERD/ERS?",
    ],
    model:
      "Bande: delta (<4 Hz), theta (4-8), alpha (8-13), beta (13-30), gamma (>30). Pipeline: filtraggio passa-banda, notch di rete a 50 Hz, re-referencing (es. media comune), rimozione artefatti con ICA, epoching e baseline correction.",
  },
  {
    id: "ne-bci",
    course: "Neuroengineering",
    title: "Brain-Computer Interface",
    question: "Classifichi le BCI e descriva il paradigma P300 o SSVEP.",
    keywords: [
      "invasiv",
      "non invasiv",
      "p300",
      "ssvep",
      "motor imagery",
      "classific",
      "lda",
      "evento",
      "stimol",
    ],
    followUps: [
      "Cosa limita il bit-rate di una BCI non invasiva?",
      "Come si classifica un P300 single-trial?",
      "Perché le BCI SSVEP richiedono poca calibrazione?",
      "Cos'è il problema dell'illiteracy BCI?",
    ],
    model:
      "BCI invasive (ECoG, intracorticali) e non invasive (EEG, fNIRS); attive, reattive, passive. P300: potenziale positivo ~300 ms dopo stimolo raro (oddball), classificato con LDA su epoche mediate. SSVEP: risposta occipitale alla frequenza di stimolazione visiva.",
  },
  {
    id: "ne-spike",
    course: "Neuroengineering",
    title: "Spike sorting",
    question: "Spieghi le fasi dello spike sorting su registrazioni extracellulari.",
    keywords: [
      "soglia",
      "detection",
      "feature",
      "pca",
      "cluster",
      "forma d'onda",
      "rumore",
      "neuroni",
    ],
    followUps: [
      "Come sceglie la soglia di detection?",
      "Perché si usa la PCA?",
      "Come gestisce spike sovrapposti?",
      "Come valuta la qualità di un cluster?",
    ],
    model:
      "Fasi: filtraggio passa-banda (300-3000 Hz), detection a soglia (es. 4-5 volte la stima robusta del rumore, mediana/0.6745), allineamento, estrazione feature (PCA, wavelet), clustering (k-means, GMM). Qualità via ISI violations e isolation distance.",
  },
  {
    id: "ne-hh",
    course: "Neuroengineering",
    title: "Modello di Hodgkin-Huxley",
    question: "Descriva il modello di Hodgkin-Huxley e il significato delle variabili di gating.",
    keywords: [
      "sodio",
      "potassio",
      "conduttanz",
      "gating",
      "m",
      "h",
      "n",
      "potenziale d'azione",
      "membrana",
      "capacit",
    ],
    followUps: [
      "Cosa rappresenta la variabile h?",
      "Perché esiste il periodo refrattario?",
      "Come si semplifica con FitzHugh-Nagumo?",
      "Qual è il circuito equivalente della membrana?",
    ],
    model:
      "La membrana è un condensatore in parallelo a conduttanze ioniche (Na+, K+, leak). gNa = ḡNa·m³h, gK = ḡK·n⁴: m attivazione Na, h inattivazione Na, n attivazione K. L'inattivazione di h causa il periodo refrattario.",
  },
];

/**
 * Nome leggibile di ogni radice usata come parola chiave, per indicare allo studente i concetti
 * che non ha toccato. Le radici senza voce (es. quelle delle materie personalizzate) si mostrano così come sono.
 */
export const CONCEPT_LABELS: Record<string, string> = {
  frequenza: "frequenza di campionamento",
  doppio: "il doppio della banda (fs > 2B)",
  banda: "banda limitata del segnale",
  aliasing: "aliasing",
  nyquist: "criterio di Nyquist",
  campion: "campionamento",
  ricostru: "ricostruzione del segnale",
  filtro: "filtro anti-aliasing / di ricostruzione",
  fft: "FFT come algoritmo",
  dft: "DFT come trasformata",
  complessit: "complessità computazionale",
  log: "costo O(N log N)",
  "n^2": "costo O(N²)",
  algoritmo: "distinzione algoritmo / trasformata",
  cooley: "algoritmo di Cooley-Tukey",
  radice: "radix-2 (N potenza di 2)",
  campioni: "numero di campioni N",
  spettro: "spettro del segnale",
  fir: "filtri FIR",
  iir: "filtri IIR",
  "fase lineare": "fase lineare",
  stabil: "stabilità",
  poli: "posizione dei poli",
  zeri: "zeri della funzione di trasferimento",
  retroazione: "retroazione",
  ricorsiv: "struttura ricorsiva",
  ordine: "ordine del filtro",
  z: "variabile Z",
  regione: "regione di convergenza (ROC)",
  convergenza: "convergenza della serie",
  "cerchio unitario": "cerchio unitario",
  causal: "causalità",
  laplace: "legame con la trasformata di Laplace",
  delta: "banda delta",
  theta: "banda theta",
  alpha: "banda alpha",
  beta: "banda beta",
  gamma: "banda gamma",
  filtr: "filtraggio passa-banda",
  artefatt: "rimozione degli artefatti",
  ica: "ICA",
  riferimento: "scelta del riferimento (re-referencing)",
  notch: "filtro notch di rete",
  invasiv: "BCI invasive",
  "non invasiv": "BCI non invasive",
  p300: "paradigma P300",
  ssvep: "paradigma SSVEP",
  "motor imagery": "motor imagery",
  classific: "classificazione",
  lda: "LDA",
  evento: "potenziali evento-correlati",
  stimol: "stimolazione",
  soglia: "soglia di detection",
  detection: "detection degli spike",
  feature: "estrazione delle feature",
  pca: "PCA",
  cluster: "clustering",
  "forma d'onda": "forma d'onda dello spike",
  rumore: "stima del rumore",
  neuroni: "attribuzione ai singoli neuroni",
  sodio: "corrente di sodio",
  potassio: "corrente di potassio",
  conduttanz: "conduttanze ioniche",
  gating: "variabili di gating",
  m: "variabile m (attivazione Na)",
  h: "variabile h (inattivazione Na)",
  n: "variabile n (attivazione K)",
  "potenziale d'azione": "potenziale d'azione",
  membrana: "membrana come circuito",
  capacit: "capacità di membrana",
  defin: "definizione rigorosa",
  esempio: "un esempio",
  applica: "un'applicazione",
  principio: "principi su cui si fonda",
};
