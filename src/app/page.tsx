import { GameShell } from './GameShell';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative h-full w-full">
      <a
        href="#portfolio-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black focus:outline-none focus:top-0 focus:left-0"
      >
        Skip to portfolio content
      </a>

      <GameShell />

      <noscript>
        <section id="portfolio-content" className="p-4 bg-[#FDF5C4] text-[#202020] absolute inset-0 z-50 overflow-auto" aria-label="Portfolio Content Fallback">
          <h1 className="text-xl font-bold mb-4">Pokefolio Navigation</h1>
          <p className="mb-4">This experience requires JavaScript, but all portfolio content is fully accessible below:</p>
          <nav aria-label="Portfolio pages">
            <ul className="flex flex-col gap-2 underline">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/projects">Projects</Link></li>
              <li><Link href="/skills">Skills</Link></li>
              <li><Link href="/experience">Experience</Link></li>
              <li><Link href="/resume">Resume</Link></li>
            </ul>
          </nav>
        </section>
      </noscript>

      {/* Screen readers will reach this if JS is enabled but canvas is bypassed */}
      <section id="portfolio-content-sr" className="sr-only">
        <h2 id="portfolio-content">Portfolio Content</h2>
        <nav aria-label="Portfolio pages">
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/projects">Projects</Link></li>
            <li><Link href="/skills">Skills</Link></li>
            <li><Link href="/experience">Experience</Link></li>
            <li><Link href="/resume">Resume</Link></li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
