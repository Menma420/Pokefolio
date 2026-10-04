import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    template: '%s | Pokefolio by Uttkarsh',
    default: 'Pokefolio by Uttkarsh',
  },
  description: 'A Pokémon-inspired portfolio and interactive resume experience.',
  openGraph: {
    title: 'Pokefolio by Uttkarsh',
    description: 'A Pokémon-inspired portfolio and interactive resume experience.',
    url: '/',
    siteName: 'Pokefolio',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
