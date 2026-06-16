import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Command Center",
  description: "Your personal command center — tasks, habits, fitness, notes, and AI.",
  manifest: "/manifest.json",
};

// Runs before React hydrates: reads localStorage and sets data-theme so there's
// no flash of wrong theme on first paint.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('pcc-theme') || 'paper';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="paper" className={hanken.className}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
