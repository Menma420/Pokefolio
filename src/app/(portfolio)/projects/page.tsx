import Link from 'next/link';
import { PORTFOLIO_PROJECTS } from '../../../content/portfolio';

export const metadata = { 
  title: 'Projects',
  description: 'The complete twelve-project portfolio catalogue of Uttkarsh Malviya.',
};

export default function Projects() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Projects</h1>
      <p className="mb-6">The complete twelve-project portfolio catalogue.</p>
      
      <ul className="flex flex-col gap-8">
        {PORTFOLIO_PROJECTS.map((project) => (
          <li key={project.id} className="border-b border-black/10 pb-6 last:border-0">
            <h2 className="text-2xl font-bold mb-2">
              <Link href={`/projects/${project.slug}`} className="underline hover:text-blue-700">
                {project.name}
              </Link>
            </h2>
            <p className="mb-3 font-medium text-lg">{project.summary.pages.join(' ')}</p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-800">
              <div>
                <dt className="inline font-bold">Type:</dt> <dd className="inline">{project.type.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="inline font-bold">Role:</dt> <dd className="inline">{project.role}</dd>
              </div>
              {project.technologies?.length > 0 && (
                <div className="col-span-1 md:col-span-2">
                  <dt className="inline font-bold">Technologies:</dt> <dd className="inline">{project.technologies.join(', ')}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
