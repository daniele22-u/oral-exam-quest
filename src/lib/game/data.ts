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
    label: "Cautious",
    desc: "Low risk. Few credits, few follow-up questions.",
    mult: 1,
    penalty: 4,
    followUps: 2,
  },
  solido: {
    label: "Solid",
    desc: "Stated conviction. Medium reward, medium scrutiny.",
    mult: 2,
    penalty: 10,
    followUps: 3,
  },
  senzarete: {
    label: "No Safety Net",
    desc: "Full conviction: triple credits, but the examiner presses hard.",
    mult: 3,
    penalty: 20,
    followUps: 4,
  },
};

export const EXAMINERS: Examiner[] = [
  {
    id: "severo",
    name: "Prof. Ferraris",
    title: "The Strict Examiner",
    trait: "Absolute rigour, no mercy for imprecision.",
    open: ["Let's begin. Straight to the point:", "Let's see whether you really studied."],
    push: [
      "Imprecise. Be rigorous:",
      "That is not enough. Go deeper:",
      "That is a popular-science answer. Tell me:",
    ],
    praise: ["Correct. Let's move on.", "Acceptable."],
    doubt: ["Are you reciting words from memory?", "Are you sure? We shall see."],
  },
  {
    id: "empatico",
    name: "Prof. Lombardi",
    title: "The Supportive Examiner",
    trait: "Guides the student, but demands real understanding.",
    open: ["Relax, let's start from here:", "Take your time and tell me:"],
    push: [
      "You are getting there. Try thinking about this:",
      "Good intuition, now let's go deeper:",
      "Help me understand better:",
    ],
    praise: ["Very good, it shows you understood.", "Excellent reasoning."],
    doubt: ["Don't worry, let's rephrase.", "It's fine to be wrong, let's reason it out."],
  },
  {
    id: "distratto",
    name: "Prof. Bassani",
    title: "The Absent-Minded Examiner",
    trait: "Seems not to listen, then catches you unprepared.",
    open: ["Hmm… where were we… ah yes:", "(leafing through notes) So, tell me:"],
    push: [
      "Sorry, I lost the thread. But then:",
      "Interesting… and so, about this:",
      "(suddenly looks up) And what about:",
    ],
    praise: ["Yes, yes, fine.", "Hm. Correct, I think."],
    doubt: [
      "What were you saying? Say it more clearly.",
      "I'm not convinced, but maybe I wasn't listening.",
    ],
  },
];

export const PRESIDENT = { name: "Prof. Emeritus Valdameri", title: "The Board President" };

export const COURSES = ["Signal Processing", "Neuroengineering"] as const;

export const TOPICS: Topic[] = [
  {
    id: "sp-nyquist",
    course: "Signal Processing",
    title: "Sampling theorem",
    question: "State the Nyquist-Shannon theorem and explain what happens when it is violated.",
    keywords: [
      "frequenc",
      "twice",
      "band",
      "aliasing",
      "nyquist",
      "sampl",
      "reconstruct",
      "filter",
    ],
    followUps: [
      "How is aliasing prevented in practice, before the converter?",
      "What happens to a 7 kHz signal sampled at 10 kHz?",
      "Why does ideal reconstruction use the sinc function?",
      "What is oversampling and why is it useful?",
    ],
    model:
      "A signal band-limited to B can be reconstructed exactly from its samples if fs > 2B. Otherwise the spectral replicas overlap (aliasing). A low-pass anti-aliasing filter is placed before the ADC; ideal reconstruction is an ideal low-pass filter, whose impulse response is a sinc.",
  },
  {
    id: "sp-fft",
    course: "Signal Processing",
    title: "DFT and FFT",
    question:
      "What is the difference between the DFT and the FFT, and what is the computational complexity of each?",
    keywords: [
      "fft",
      "dft",
      "complexit",
      "log",
      "n^2",
      "algorithm",
      "cooley",
      "radix",
      "samples",
      "spectrum",
    ],
    followUps: [
      "What is spectral leakage and how is it reduced?",
      "What effect does zero-padding have on resolution?",
      "Why does the radix-2 FFT need N to be a power of 2?",
      "How do you interpret the implicit periodicity of the DFT?",
    ],
    model:
      "The DFT is the discrete transform (O(N²)); the FFT is an efficient algorithm to compute it (O(N log N)), e.g. radix-2 Cooley-Tukey. Leakage comes from truncation and is reduced with windows (Hann, Hamming); zero-padding interpolates the spectrum but does not increase the true resolution.",
  },
  {
    id: "sp-fir",
    course: "Signal Processing",
    title: "FIR and IIR filters",
    question: "Compare FIR and IIR filters: structure, stability and phase.",
    keywords: [
      "fir",
      "iir",
      "linear phase",
      "stab",
      "poles",
      "zeros",
      "feedback",
      "recursiv",
      "order",
    ],
    followUps: [
      "Why is an FIR filter always stable?",
      "How do you obtain linear phase in an FIR filter?",
      "When would you prefer an IIR filter?",
      "What is the bilinear transform?",
    ],
    model:
      "FIR filters have no feedback, only zeros (poles at the origin) and are always stable; with symmetric coefficients they have linear phase. IIR filters are recursive, achieve selectivity with a lower order but can be unstable and do not have linear phase. The bilinear transform maps analog filters to digital ones.",
  },
  {
    id: "sp-ztr",
    course: "Signal Processing",
    title: "Z-transform",
    question:
      "What is the Z-transform and how do you read the stability of a system from its region of convergence?",
    keywords: ["z", "region", "convergence", "unit circle", "poles", "stab", "causal", "laplace"],
    followUps: [
      "How does it relate to the DTFT?",
      "Where are the poles of a causal, stable system?",
      "What does a zero on the unit circle represent?",
      "How do you go from a difference equation to a transfer function?",
    ],
    model:
      "The Z-transform generalises the DTFT (which is the Z-transform evaluated on the unit circle). An LTI system is stable if the ROC includes the unit circle; if it is causal, all poles must lie inside the unit circle.",
  },
  {
    id: "ne-eeg",
    course: "Neuroengineering",
    title: "EEG signal processing",
    question: "Describe the main EEG bands and the typical preprocessing pipeline.",
    keywords: [
      "delta",
      "theta",
      "alpha",
      "beta",
      "gamma",
      "filter",
      "artifact",
      "ica",
      "referenc",
      "notch",
    ],
    followUps: [
      "How do you remove ocular artifacts?",
      "Why is a 50 Hz notch filter applied?",
      "What is the impact of the choice of reference?",
      "What is ERD/ERS?",
    ],
    model:
      "Bands: delta (<4 Hz), theta (4-8), alpha (8-13), beta (13-30), gamma (>30). Pipeline: band-pass filtering, 50 Hz mains notch, re-referencing (e.g. common average), artifact removal with ICA, epoching and baseline correction.",
  },
  {
    id: "ne-bci",
    course: "Neuroengineering",
    title: "Brain-Computer Interface",
    question: "Classify BCIs and describe the P300 or SSVEP paradigm.",
    keywords: [
      "invasiv",
      "non-invasiv",
      "p300",
      "ssvep",
      "motor imagery",
      "classif",
      "lda",
      "event",
      "stimul",
    ],
    followUps: [
      "What limits the bit rate of a non-invasive BCI?",
      "How do you classify a single-trial P300?",
      "Why do SSVEP BCIs need little calibration?",
      "What is the BCI illiteracy problem?",
    ],
    model:
      "Invasive BCIs (ECoG, intracortical) and non-invasive BCIs (EEG, fNIRS); active, reactive, passive. P300: a positive potential ~300 ms after a rare stimulus (oddball), classified with LDA on averaged epochs. SSVEP: occipital response at the frequency of the visual stimulation.",
  },
  {
    id: "ne-spike",
    course: "Neuroengineering",
    title: "Spike sorting",
    question: "Explain the stages of spike sorting on extracellular recordings.",
    keywords: [
      "threshold",
      "detection",
      "feature",
      "pca",
      "cluster",
      "waveform",
      "noise",
      "neuron",
    ],
    followUps: [
      "How do you choose the detection threshold?",
      "Why is PCA used?",
      "How do you handle overlapping spikes?",
      "How do you assess the quality of a cluster?",
    ],
    model:
      "Stages: band-pass filtering (300-3000 Hz), threshold detection (e.g. 4-5 times the robust noise estimate, median/0.6745), alignment, feature extraction (PCA, wavelets), clustering (k-means, GMM). Quality via ISI violations and isolation distance.",
  },
  {
    id: "ne-hh",
    course: "Neuroengineering",
    title: "Hodgkin-Huxley model",
    question: "Describe the Hodgkin-Huxley model and the meaning of the gating variables.",
    keywords: [
      "sodium",
      "potassium",
      "conductanc",
      "gating",
      "m",
      "h",
      "n",
      "action potential",
      "membrane",
      "capacit",
    ],
    followUps: [
      "What does the variable h represent?",
      "Why is there a refractory period?",
      "How is it simplified by FitzHugh-Nagumo?",
      "What is the equivalent circuit of the membrane?",
    ],
    model:
      "The membrane is a capacitor in parallel with ionic conductances (Na+, K+, leak). gNa = ḡNa·m³h, gK = ḡK·n⁴: m is Na activation, h is Na inactivation, n is K activation. The inactivation described by h causes the refractory period.",
  },
];

/**
 * Readable name for each stem used as a keyword, to tell the student which concepts they did not
 * touch. Stems without an entry (e.g. those of hand-entered subjects) are shown as they are.
 */
export const CONCEPT_LABELS: Record<string, string> = {
  frequenc: "sampling frequency",
  twice: "twice the bandwidth (fs > 2B)",
  band: "band-limited signal",
  aliasing: "aliasing",
  nyquist: "Nyquist criterion",
  sampl: "sampling",
  reconstruct: "signal reconstruction",
  filter: "filtering (anti-aliasing, band-pass)",
  fft: "FFT as an algorithm",
  dft: "DFT as a transform",
  complexit: "computational complexity",
  log: "O(N log N) cost",
  "n^2": "O(N²) cost",
  algorithm: "algorithm vs transform",
  cooley: "Cooley-Tukey algorithm",
  radix: "radix-2 (N a power of 2)",
  samples: "number of samples N",
  spectrum: "signal spectrum",
  fir: "FIR filters",
  iir: "IIR filters",
  "linear phase": "linear phase",
  stab: "stability",
  poles: "pole locations",
  zeros: "zeros of the transfer function",
  feedback: "feedback",
  recursiv: "recursive structure",
  order: "filter order",
  z: "the variable z",
  region: "region of convergence (ROC)",
  convergence: "convergence of the series",
  "unit circle": "unit circle",
  causal: "causality",
  laplace: "link with the Laplace transform",
  delta: "delta band",
  theta: "theta band",
  alpha: "alpha band",
  beta: "beta band",
  gamma: "gamma band",
  artifact: "artifact removal",
  ica: "ICA",
  referenc: "choice of reference (re-referencing)",
  notch: "mains notch filter",
  invasiv: "invasive BCIs",
  "non-invasiv": "non-invasive BCIs",
  p300: "P300 paradigm",
  ssvep: "SSVEP paradigm",
  "motor imagery": "motor imagery",
  classif: "classification",
  lda: "LDA",
  event: "event-related potentials",
  stimul: "stimulation",
  threshold: "detection threshold",
  detection: "spike detection",
  feature: "feature extraction",
  pca: "PCA",
  cluster: "clustering",
  waveform: "spike waveform",
  noise: "noise estimate",
  neuron: "assignment to single neurons",
  sodium: "sodium current",
  potassium: "potassium current",
  conductanc: "ionic conductances",
  gating: "gating variables",
  m: "variable m (Na activation)",
  h: "variable h (Na inactivation)",
  n: "variable n (K activation)",
  "action potential": "action potential",
  membrane: "membrane as a circuit",
  capacit: "membrane capacitance",
  defin: "a rigorous definition",
  example: "an example",
  applic: "an application",
  principle: "the underlying principles",
};
