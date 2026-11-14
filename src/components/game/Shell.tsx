import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Art";
import type { Profile } from "./Onboarding";
import { Student } from "./QuestMap";
import { Heart } from "./Vitals";

/**
 * App frame: top bar with the profile on the right and three tabs. On phones the tabs sit at
 * the bottom, within thumb reach; on wide screens they become a left column.
 */
export type Tab = "hub" | "materials" | "report";
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "hub", label: "Path", icon: "door" },
  { id: "materials", label: "Materials", icon: "book" },
  { id: "report", label: "Record", icon: "folder" },
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
          <span className="stat-chip" title="Sessions passed">
            <Icon name="door" size={20} />
            <span aria-hidden="true">
              {passed}/{required}
            </span>
            <span className="sr-only">
              {passed} of {required} sessions passed
            </span>
          </span>
          <button className="avatar-btn" onClick={onProfile} aria-label="Profile and settings">
            <Student size={36} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function TabBar({ current, onSelect }: { current: Tab | null; onSelect: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Sections">
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
    ["Polimi Online Services", profile.polimi, "campus"],
    ["WeBeep", profile.webeep, "cloud"],
  ];
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div className="avatar-btn pointer-events-none">
            <Student size={56} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl leading-none">Demo student</div>
            <div className="truncate text-sm text-muted-foreground">{course}</div>
          </div>
          <button ref={close} className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <h3 className="eyebrow mt-6 text-muted-foreground">Connected services</h3>
        <ul className="mt-2 grid gap-2">
          {services.map(([name, on, icon]) => (
            <li key={name} className="flex items-center gap-3 border-2 border-ink p-3">
              <Icon name={icon} size={28} />
              <span className="flex-1">{name}</span>
              <span
                className={`font-display text-xl leading-none ${on ? "text-[var(--green-ink)]" : "text-muted-foreground"}`}
              >
                {on ? "Connected" : "Not connected"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Simulated connections: no real access to university services.
        </p>
        <button className="btn-ghost mt-3 w-full" onClick={onConnect}>
          {profile.polimi && profile.webeep ? "Review the setup" : "Connect services"}
        </button>

        <h3 className="eyebrow mt-6 text-muted-foreground">How you take the exam</h3>
        {ai ? (
          <div role="group" aria-label="Exam mode" className="mt-2 grid grid-cols-2">
            {(
              [
                [false, "Text"],
                [true, "Voice"],
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
            Demo mode: preset questions, text only. Voice requires the AI examiner.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {ai
            ? voice
              ? "The examiner speaks and you can answer by microphone."
              : "Read the questions and answer in writing."
            : ""}
        </p>

        <button className="skip-btn mt-6" onClick={onReset}>
          Delete record and start over
        </button>
      </div>
    </div>
  );
}
