import { PROFILE, EXPERIENCE, BAG } from '../../../content/portfolio';
import Link from 'next/link';

export const metadata = {
  title: 'Resume',
  description: 'Uttkarsh Malviya - Professional Resume',
  alternates: {
    canonical: '/resume',
  },
};

export default function Resume() {
  const resumeUrl = BAG.flatMap(c => c.items).find(i => i.id === 'resume')?.url || PROFILE.resume;

  return (
    <article className="max-w-4xl mx-auto py-8 px-4 print:max-w-none print:p-0">
      
      {/* Web-only controls */}
      <div className="mb-6 print:hidden flex justify-between items-center bg-[#FDF5C4] border border-black/10 p-4 rounded">
        <div>
          <h1 className="text-xl font-bold">Resume</h1>
          <p className="text-sm">For the official formatted layout, download the PDF.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800"
            style={{pointerEvents: 'none'}} 
            // In a real Server Component we cannot attach onClick, so we'll just use a button that triggers browser print script via inline js
            disabled
          >
            <script
              dangerouslySetInnerHTML={{
                __html: `document.currentScript.parentElement.onclick = function() { window.print(); }; document.currentScript.parentElement.removeAttribute('disabled'); document.currentScript.parentElement.style.pointerEvents = 'auto';`
              }}
            />
            Print Web Resume
          </button>
          
          <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 underline">
            Open original resume PDF
          </a>
        </div>
      </div>

      <div className="print-container bg-white print:bg-transparent text-black p-8 print:p-0 border border-black/10 print:border-none rounded-lg print:rounded-none shadow-sm print:shadow-none">
        
        {/* Header section */}
        <header className="border-b-2 border-black pb-4 mb-6 text-center print:text-left flex flex-col print:flex-row print:justify-between print:items-end">
          <div>
            <h1 className="text-4xl font-extrabold uppercase mb-1">{PROFILE.fullName}</h1>
            <p className="text-lg font-medium">{PROFILE.positioning}</p>
          </div>
          <div className="text-sm mt-4 print:mt-0 space-y-1 print:text-right flex flex-col">
            <a href={`mailto:${PROFILE.email}`} className="hover:underline">{PROFILE.email}</a>
            <span>{PROFILE.phone}</span>
            <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn</a>
            <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</a>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold uppercase border-b border-black/20 mb-2">Summary</h2>
          <p className="leading-relaxed text-sm">{PROFILE.summary}</p>
        </section>

        {/* Experience */}
        <section className="mb-6">
          <h2 className="text-xl font-bold uppercase border-b border-black/20 mb-4">Experience</h2>
          <div className="space-y-6">
            {EXPERIENCE.map((exp) => (
              <div key={exp.id} className="print:break-inside-avoid">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-base uppercase">{exp.role}</h3>
                    <p className="italic text-sm">{exp.company}</p>
                  </div>
                  <span className="text-sm font-medium">{exp.period}</span>
                </div>
                <div className="text-sm space-y-2 pl-4 border-l-2 border-transparent">
                  {exp.sections.filter(s => s.name !== 'SUMMARY').map((section, idx) => (
                    <div key={idx} className="print:break-inside-avoid">
                      {/* Skip redundant section labels in a standard resume layout to keep it clean */}
                      <span className="font-bold mr-1 block sm:inline">{section.name}:</span>
                      <span>{section.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Education */}
        <section className="mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold uppercase border-b border-black/20 mb-2">Education</h2>
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-base">{PROFILE.education.split(' - ')[0]}</h3>
              <p className="italic text-sm">{PROFILE.education.split(' - ')[1]}</p>
            </div>
            <span className="text-sm font-medium">{PROFILE.educationPeriod}</span>
          </div>
        </section>

        {/* Highlights & Achievements */}
        <section className="mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold uppercase border-b border-black/20 mb-2">Highlights & Achievements</h2>
          <ul className="list-disc list-outside pl-5 text-sm space-y-1">
            {PROFILE.highlights.map((h, i) => <li key={`h-${i}`}>{h}</li>)}
            {PROFILE.achievements.map((a, i) => <li key={`a-${i}`}>{a}</li>)}
          </ul>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print:hidden { display: none !important; }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </article>
  );
}
