import { getExperiences } from '../../../content/portfolio';

export const metadata = {
  title: 'Experience',
  description: 'Professional engineering experience and impact.',
  alternates: {
    canonical: '/experience',
  },
};

export default function Experience() {
  const experiences = getExperiences();

  return (
    <article className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold mb-4">Professional Experience</h1>
        <p className="text-xl font-medium">Timeline of roles, ownership, and engineering impact.</p>
      </header>

      <div className="space-y-12">
        {experiences.map((exp) => (
          <section key={exp.id} className="border-b border-black/10 pb-8 last:border-0 last:pb-0">
            <header className="mb-4">
              <h2 className="text-2xl font-bold">{exp.role}</h2>
              <p className="text-lg font-medium text-gray-800">{exp.company}</p>
              <p className="text-sm text-gray-600">{exp.period}</p>
            </header>

            <div className="space-y-6">
              {exp.sections.map((section, idx) => {
                if (section.name === 'SUMMARY') {
                  const summaryText = section.text.replace(`${exp.role}\n`, '');
                  return <p key={idx} className="text-lg leading-relaxed">{summaryText}</p>;
                }
                return (
                  <div key={idx}>
                    <h3 className="font-bold mb-2 capitalize">{section.name.toLowerCase()}</h3>
                    <p className="text-gray-800 leading-relaxed">{section.text}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
