import { PROFILE, BAG } from '../../../content/portfolio';

export const metadata = {
  title: 'About',
  description: PROFILE.summary,
  alternates: {
    canonical: '/about',
  },
};

export default function About() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: PROFILE.fullName,
    jobTitle: PROFILE.positioning,
    worksFor: {
      '@type': 'Organization',
      name: PROFILE.company
    },
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    sameAs: [
      PROFILE.github,
      PROFILE.linkedin
    ],
    email: PROFILE.email,
    telephone: PROFILE.phone
  };

  return (
    <article className="max-w-3xl mx-auto py-8 px-4">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-8">
        <h1 className="text-4xl font-extrabold mb-4">{PROFILE.fullName}</h1>
        <p className="text-xl font-medium leading-relaxed">{PROFILE.summary}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 border-b border-black/10 pb-2">Profile Overview</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
          <div><dt className="font-bold">Current role</dt><dd>{PROFILE.title} at {PROFILE.company}</dd></div>
          <div><dt className="font-bold">Period</dt><dd>{PROFILE.period}</dd></div>
          <div><dt className="font-bold">Education</dt><dd>{PROFILE.education}</dd></div>
          <div><dt className="font-bold">Education period</dt><dd>{PROFILE.educationPeriod}</dd></div>
        </dl>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4 border-b border-black/10 pb-2">Highlights</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-800">
            {PROFILE.highlights.map(text => <li key={text}>{text}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 border-b border-black/10 pb-2">Achievements</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-800">
            {PROFILE.achievements.map(text => <li key={text}>{text}</li>)}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4 border-b border-black/10 pb-2">Links & Contact</h2>
        <ul className="space-y-4">
          {BAG.flatMap(c => c.items).filter(i => i.id !== 'achievements').map(item => (
            <li key={item.id}>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">
                  {item.name}
                </a>
              ) : (
                <span className="font-bold">{item.name}</span>
              )}
              {item.description && <p className="text-sm text-gray-800">{item.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
