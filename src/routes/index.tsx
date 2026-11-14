import { createFileRoute } from "@tanstack/react-router";
import Game from "@/components/game/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Commissione — Simulatore d'esame orale" },
      { name: "description", content: "Serious game accademico: dichiara la tua sicurezza, sostieni l'orale e affronta il Presidente di Commissione." },
      { property: "og:title", content: "Commissione — Simulatore d'esame orale" },
      { property: "og:description", content: "Non basta sapere. Devi sapere quanto sai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
