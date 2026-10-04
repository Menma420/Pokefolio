import { SKILL_CATEGORIES, getSkills, getPortfolioProject, PORTFOLIO_PROJECTS } from '../../../content/portfolio';
import Link from 'next/link';

export const metadata = {
  title: 'Skills & Knowledge',
  description: 'Technical skills, engineering concepts, and capabilities applied across projects.',
  alternates: {
    canonical: '/skills',
  },
};

export default function Skills() {
  // Map categories, starting from 1 since index 0 is 'ALL' in SKILL_CATEGORIES
  const categoriesToRender = SKILL_CATEGORIES.slice(1);

  return (
    <article className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold mb-4">Skills & Engineering Knowledge</h1>
        <p className="text-xl font-medium">A structured breakdown of my technical capability and where it was applied.</p>
      </header>
      
      <div className="space-y-12">
        {categoriesToRender.map((category, index) => {
          const categorySkills = getSkills(index + 1); // offset by 1 because getSkills takes the index based on SKILL_CATEGORIES array
          if (categorySkills.length === 0) return null;

          return (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <h2 id={`cat-${category}`} className="text-2xl font-bold mb-4 border-b border-black/10 pb-2 capitalize">
                {category.toLowerCase()}
              </h2>
              <ul className="space-y-6">
                {categorySkills.map((skill) => (
                  <li key={skill.id} className="bg-black/5 p-4 rounded">
                    <h3 className="text-lg font-bold mb-2">{skill.name}</h3>
                    <p className="mb-2 text-gray-800">{skill.description}</p>
                    
                    {skill.projects.length > 0 && (
                      <div className="text-sm">
                        <span className="font-bold mr-2">Applied in:</span>
                        <ul className="inline-flex gap-2 flex-wrap">
                          {skill.projects.map((projectId) => {
                            const p = PORTFOLIO_PROJECTS.find(proj => proj.id === projectId);
                            if (!p) return null;
                            return (
                              <li key={p.id}>
                                <Link href={`/projects/${p.slug}`} className="underline hover:text-blue-700">
                                  {p.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
