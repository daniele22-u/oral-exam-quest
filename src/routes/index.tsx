import { createFileRoute } from "@tanstack/react-router";
import Game from "@/components/game/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oral Exam Quest — Oral exam simulator" },
      {
        name: "description",
        content:
          "An academic serious game: declare your confidence, take the oral exam and face the President of the Board.",
      },
      { property: "og:title", content: "Oral Exam Quest — Oral exam simulator" },
      { property: "og:description", content: "Knowing is not enough. Know how much you know." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
