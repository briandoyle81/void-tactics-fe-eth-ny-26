import Website from "./components/Website";

// The website. The game client is at /play (app/play/page.tsx); see
// app/config/routes.ts for how the two are split across hosts.
export default function HomePage() {
  return <Website />;
}
