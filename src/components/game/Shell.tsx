import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Art";
import type { Profile } from "./Onboarding";
import { Student } from "./QuestMap";
import { Heart } from "./Vitals";

/**
 * Cornice dell'app: barra in alto con il profilo a destra e tre schede. Su telefono le schede
 * stanno in basso, a portata di pollice; su schermi larghi diventano una colonna a sinistra.
 */
export type Tab = "hub" | "materials" | "report";
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "hub", label: "Percorso", icon: "door" },
  { id: "materials", label: "Materiali", icon: "book" },
  { id: "report", label: "Fascicolo", icon: "folder" },
];

export function TopBar({
  passed,
  required,
  onProfile,
}: {
  passed: number;
  required: number;
  onProfile: () => void;
}) {
  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 md:px-6">
        <div className="flex items-center gap-2 font-display text-2xl uppercase leading-none tracking-wide md:text-3xl">
          <Heart size={22} />
          <span>
            Oral Exam <span className="text-quest-red">Quest</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="stat-chip" title="Sedute convalidate">
            <Icon name="door" size={20} />
            <span aria-hidden="true">
              {passed}/{required}
            </span>
            <span className="sr-only">
              {passed} sedute convalidate su {required}
            </span>
          </span>
          <button className="avatar-btn" onClick={onProfile} aria-label="Profilo e impostazioni">
            <Student size={36} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function TabBar({ current, onSelect }: { current: Tab | null; onSelect: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Sezioni">
      {TABS.map((t) => (
        <button
          key={t.id}
          className="tab"
          aria-current={current === t.id ? "page" : undefined}
          onClick={() => onSelect(t.id)}
        >
          <Icon name={t.icon} size={28} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function ProfileSheet({
  onClose,
  profile,
  ai,
  voice,
  setVoice,
  course,
  onConnect,
  onReset,
}: {
  onClose: () => void;
  profile: Profile;
  ai: boolean;
  voice: boolean;
  setVoice: (v: boolean) => void;
  course: string;
  onConnect: () => void;
  onReset: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const services: [string, boolean, IconName][] = [
    ["Servizi Online Polimi", profile.polimi, "campus"],
    ["WeBeep", profile.webeep, "cloud"],
  ];
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Profilo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div className="avatar-btn pointer-events-none">
            <Student size={56} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl leading-none">Studente demo</div>
            <div className="truncate text-sm text-muted-foreground">{course}</div>
          </div>
          <button ref={close} className="icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <h3 className="eyebrow mt-6 text-muted-foreground">Servizi collegati</h3>
        <ul className="mt-2 grid gap-2">
          {services.map(([name, on, icon]) => (
            <li key={name} className="flex items-center gap-3 border-2 border-ink p-3">
              <Icon name={icon} size={28} />
              <span className="flex-1">{name}</span>
              <span
                className={`font-display text-xl leading-none ${on ? "text-[var(--green-ink)]" : "text-muted-foreground"}`}
              >
                {on ? "Collegato" : "Non collegato"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Collegamenti simulati: nessun accesso reale ai servizi dell'ateneo.
        </p>
        <button className="btn-ghost mt-3 w-full" onClick={onConnect}>
          {profile.polimi && profile.webeep ? "Rivedi la configurazione" : "Collega i servizi"}
        </button>

        <h3 className="eyebrow mt-6 text-muted-foreground">Come sostieni l'esame</h3>
        {ai ? (
          <div role="group" aria-label="Modalità d'esame" className="mt-2 grid grid-cols-2">
            {(
              [
                [false, "Testo"],
                [true, "Voce"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={label}
                className={`mode-tab ${voice === v ? "mode-tab-on" : ""}`}
                aria-pressed={voice === v}
                onClick={() => setVoice(v)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Modalità demo: domande predefinite, solo testo. La voce richiede l'esaminatore AI.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {ai
            ? voice
              ? "L'esaminatore parla e puoi rispondere al microfono."
              : "Leggi le domande e rispondi per iscritto."
            : ""}
        </p>

        <button className="skip-btn mt-6" onClick={onReset}>
          Cancella il fascicolo e ricomincia
        </button>
      </div>
    </div>
  );
}
