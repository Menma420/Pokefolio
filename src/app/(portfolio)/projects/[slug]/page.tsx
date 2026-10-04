import { notFound } from 'next/navigation';
import { PORTFOLIO_PROJECTS, getPortfolioProject, getProjectTech, getProjectTrees } from '../../../../content/portfolio';
import Link from 'next/link';

export function generateStaticParams() {
  return PORTFOLIO_PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const project = getPortfolioProject((await params).slug);
  if (!project) return { title: 'Project not found' };
  return {
    title: project.name,
    description: project.summary.pages.join(' '),
    alternates: {
      canonical: `/projects/${project.slug}`,
    }
  };
}

export default async function Project({ params }: { params: Promise<{ slug: string }> }) {
  const project = getPortfolioProject((await params).slug);
  if (!project) notFound();

  const trees = getProjectTrees(project.id);
  const tech = getProjectTech(project.id);

  return (
    <article className="max-w-3xl mx-auto py-8 px-4">
      <Link href="/projects" className="inline-block mb-6 text-sm underline hover:text-blue-700">&larr; Back to Projects</Link>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold mb-4">{project.name}</h1>
        <p className="text-xl font-medium mb-4">{project.summary.pages.join(' ')}</p>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-4 text-gray-800 border-t border-b border-black/10 py-4">
          <div><dt className="inline font-bold">Role:</dt> <dd className="inline">{project.role}</dd></div>
          <div><dt className="inline font-bold">Period:</dt> <dd className="inline">{project.period}</dd></div>
          {tech.length > 0 && (
            <div className="col-span-1 md:col-span-2">
              <dt className="inline font-bold">Technologies:</dt> <dd className="inline">{tech.map(t => t.name).join(', ')}</dd>
            </div>
          )}
        </dl>
        {project.links.primary.url && (
          <div className="mt-4">
            <a href={project.links.primary.url} target="_blank" rel="noopener noreferrer" className="inline-block bg-black text-white px-4 py-2 font-bold hover:bg-gray-800">
              Open {project.links.primary.label}
            </a>
          </div>
        )}
      </header>

      {trees.length > 0 && (
        <section aria-labelledby="project-qa-heading">
          <h2 id="project-qa-heading" className="text-2xl font-bold mb-6">Authored Project Q&A</h2>
          <div className="space-y-8">
            {trees.map((tree) => (
              <section key={tree.audienceId} className="border border-black/10 rounded overflow-hidden">
                <h3 className="bg-black/5 px-4 py-2 font-bold capitalize border-b border-black/10">
                  {tree.audienceId} Perspective
                </h3>
                <div className="p-4 space-y-4 bg-white/50">
                  {tree.topics.map((topic, i) => (
                    <details key={i} className="group border-b border-black/10 pb-4 last:border-0 last:pb-0">
                      <summary className="font-bold cursor-pointer hover:text-blue-700 list-inside">
                        {topic.question}
                      </summary>
                      <p className="mt-2 text-gray-800 pl-4 border-l-2 border-black/10 leading-relaxed">
                        {topic.text}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
