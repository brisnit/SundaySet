import type { Metadata } from "next";
import { Lato, Sora } from "next/font/google";

import "./globals.css";

/**
 * Lato carries the interface: body, labels, forms, navigation. Humanist and
 * quiet at small sizes, which is most of this app.
 */
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
/**
 * Sora is the display face: page titles, key section headings, the main CTA.
 * Geometric and confident, so it contrasts with Lato rather than echoing it.
 * Used sparingly — everything else is Lato.
 */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SetMeister — Plan months of worship in minutes",
    template: "%s · SetMeister",
  },
  description:
    "AI-powered worship planning and team scheduling. Build the set. Schedule the team. Get Sunday ready.",
  applicationName: "SetMeister",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${sora.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
