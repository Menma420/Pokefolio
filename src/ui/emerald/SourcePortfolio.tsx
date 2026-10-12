'use client';
import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { ClockContext } from '../kit/PixelContext';
import { FRAME_MS } from '../../core/clock';
import { settingsStore } from '../../runtime/stores';
import { isReducedMotion } from '../../runtime/motion';
import { useSourceUi, SourceSurface, nativeBox } from './SourceUi';
import {
  getSkills,
  getSkillCategories,
  getSkillProjects,
  getPortfolioProjects,
  getProjectTech,
  getProjectWriteup,
  getExperiences,
  getTrainerCard,
  OPTION_LABELS,
} from '../../content/portfolio';
import type { PortfolioView } from '../../domain/menu';
import type { ProjectDef } from '../../domain/types';
import { PortfolioArt, type PortfolioAsset } from '../portfolio/PortfolioArt';
import { BattleArtwork } from '../battle/BattleArtwork';
import type { PartyOption } from '../battle/PartyScreen';
import {
  dexListUi,
  dexDetailUi,
  dexText,
  sourceParagraph,
  partyUi,
  partyBoxes,
  optionsUi,
  trainerUi,
  confirmationUi,
  pageIndicator,
} from '../../core/emerald/portfolioUi';
import { sourceFit, type UiPainter } from '../../core/emerald/ui';
/** Pokedex UpdateDexListScroll: integer 16px BG2 movement, eight initial frames.
 * Presentation only: selection and screen-stack state remain owned by PlayerMenu. */
function useListMotion(cursor: number, category: number, enabled: boolean) {
  const ui = useSourceUi()!,
    clock = useContext(ClockContext),
    settings = useStore(settingsStore);
  const reduced = settings.animationReduced || settings.reducedMotion || isReducedMotion();
  const [motion, setMotion] = useState({ offset: 0, frame: 0 }),
    previous = useRef({ cursor, category, time: 0, speed: 0 });
  useLayoutEffect(() => {
    const old = previous.current,
      delta = cursor - old.cursor;
    const speed = clock.now() - old.time < 250 ? Math.min(12, old.speed + 1) : 0;
    previous.current = { cursor, category, time: clock.now(), speed };
    if (!enabled || reduced || category !== old.category || Math.abs(delta) !== 1) {
      const reset = clock.schedule(() => setMotion((m) => (m.offset ? { ...m, offset: 0 } : m)), 0);
      return () => reset.cancel();
    }
    const total = ui.portfolio!.dex.scrollTimers[Math.floor(speed / 4)] ?? 8;
    const tasks = Array.from({ length: total + 1 }, (_, frame) =>
      clock.schedule(
        () => setMotion((m) => ({ ...m, offset: delta * (16 - Math.floor((16 * frame) / total)) })),
        frame * FRAME_MS,
      ),
    );
    return () => tasks.forEach((task) => task.cancel());
  }, [cursor, category, clock, enabled, reduced, ui]);
  useEffect(() => {
    if (!enabled || reduced) return;
    let frame = 0;
    const next = () => {
      setMotion((m) => ({ ...m, frame: ++frame }));
      task = clock.schedule(next, FRAME_MS);
    };
    let task = clock.schedule(next, FRAME_MS);
    return () => task.cancel();
  }, [clock, enabled, reduced]);
  return reduced ? { offset: 0, frame: 0 } : motion;
}
function Shell({
  name,
  paint,
  children,
  description,
  scroll,
}: {
  scroll?: number;
  name: string;
  paint: UiPainter;
  children?: ReactNode;
  description?: string;
}) {
  return (
    <section
      aria-label={name}
      data-portfolio-screen={name}
      data-source-list-scroll={scroll}
      style={nativeBox(0, 0, 240, 160)}
    >
      <SourceSurface kind={name.toLowerCase().replaceAll(' ', '-')} paint={paint} />
      {children}
      {description && <p className="sr-only">{description}</p>}
    </section>
  );
}
function Hit({
  name,
  current,
  onClick,
  x,
  y,
  w,
  h = 16,
}: {
  name: string;
  current?: boolean;
  onClick: () => void;
  x: number;
  y: number;
  w: number;
  h?: number;
}) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
      style={{ ...nativeBox(x, y, w, h), background: 'transparent', outline: 'none' }}
    />
  );
}
function PageButtons({ change }: { change: (d: number) => void }) {
  return (
    <>
      <Hit name="Previous category or page" x={0} y={0} w={20} onClick={() => change(-1)} />
      <Hit name="Next category or page" x={220} y={0} w={20} onClick={() => change(1)} />
    </>
  );
}
function ListHits({
  names,
  cursor,
  tap,
}: {
  names: string[];
  cursor: number;
  tap: (i: number) => void;
}) {
  return (
    <>
      {names.map((name, i) => {
        const y = 72 + (i - cursor) * 16;
        return y >= 8 && y <= 136 ? (
          <Hit
            key={name}
            name={name}
            current={i === cursor}
            x={136}
            y={y}
            w={88}
            onClick={() => tap(i)}
          />
        ) : null;
      })}
    </>
  );
}
export function SourceDex({
  view,
  tap,
  category,
  related,
}: {
  view: PortfolioView;
  tap: (i: number) => void;
  category: (d: number) => void;
  related: (i: number) => void;
}) {
  const ui = useSourceUi()!,
    motion = useListMotion(view.cursor, view.category, view.screen === 'dex'),
    entries = getSkills(view.category),
    skill = entries[view.cursor]!;
  if (view.screen === 'dex-detail') {
    const { p, paragraph } = dexDetailUi(
        ui,
        'POKÉDEX / ENTRY',
        skill.name,
        skill.type,
        skill.description,
        view.page,
      ),
      links = getSkillProjects(view.category, view.cursor).slice(0, 3);
    pageIndicator(p, ui, paragraph.index, paragraph.count);
    links.forEach((project, i) => {
      dexText(
        p,
        ui,
        (view.relatedFocus && view.related === i ? '▶' : ' ') +
          sourceFit(ui, project.visual.plateName!, 110, 'small'),
        96,
        57 + i * 12,
        130,
        'small',
      );
    });
    return (
      <Shell
        name="Pokédex detail"
        paint={p}
        description={`${skill.name}. Type: ${skill.type}. ${skill.description}. Where used: ${skill.whereUsed}. A/Enter: next page. B/Backspace: back.`}
      >
        <PortfolioArt name={`skill-${skill.id}-large` as PortfolioAsset} x={32} y={40} />
        {links.map((project, i) => (
          <Hit
            key={project.id}
            name={`Related project: ${project.name}`}
            current={!!view.relatedFocus && view.related === i}
            x={96}
            y={56 + i * 12}
            w={130}
            h={12}
            onClick={() => related(i)}
          />
        ))}
      </Shell>
    );
  }
  const p = dexListUi(
    ui,
    'POKÉDEX',
    getSkillCategories()[view.category]!,
    entries.map((e) => e.name),
    view.cursor,
    skill.type,
    motion,
  );
  return (
    <Shell
      scroll={motion.offset}
      name="Pokédex"
      paint={p}
      description={`${skill.name}; Category: ${skill.type}. Left/right: category. A/Enter: detail. B: back.`}
    >
      <PortfolioArt name={`skill-${skill.id}-large` as PortfolioAsset} x={80} y={64} />
      <ListHits names={entries.map((e) => e.name)} cursor={view.cursor} tap={tap} />
      <PageButtons change={category} />
      {view.notice && (
        <span role="status" className="sr-only">
          {view.notice}
        </span>
      )}
    </Shell>
  );
}
export function SourceProjectIdentity({ project }: { project: ProjectDef }) {
  const ui = useSourceUi()!,
    { p } = dexDetailUi(
      ui,
      'PROJECT',
      project.visual.plateName!,
      project.type.replaceAll('_', ' '),
      '',
    );
  // Continue the actual info-page stripe tile below its identity frame. This
  // suppresses the unused dex description box and underlying battle plates,
  // while leaving the accepted P1 message window at y112 untouched.
  const d = ui.portfolio!.dex;
  for (let y = 96; y < 112; y += 8)
    for (let x = 0; x < 240; x += 8) p.tile(d.tiles, d.palette, d.info[2 * 32]!, x, y, false);
  for (let y = 112; y < 160; y++) p.data.fill(0, y * 240 * 4, (y + 1) * 240 * 4);
  return (
    <div style={{ ...nativeBox(0, 0, 240, 112), zIndex: 21, pointerEvents: 'none' }}>
      <SourceSurface kind="project-summary" paint={p} />
      <PortfolioArt name={`project-${project.slug}-48` as PortfolioAsset} x={24} y={32} />
    </div>
  );
}
export function SourceProjects({
  view,
  tap,
  page,
  link,
}: {
  view: PortfolioView;
  tap: (i: number) => void;
  page: (d: number) => void;
  link: (url: string, name: string) => void;
}) {
  const ui = useSourceUi()!,
    motion = useListMotion(view.cursor, 0, view.screen === 'projects'),
    projects = getPortfolioProjects(),
    project =
      projects[view.screen === 'project-detail' ? view.project : view.cursor] ?? projects[0]!;
  if (view.screen === 'project-detail') {
    const overview = [
        project.summary.pages.join(' '),
        `Role: ${project.role}.`,
        project.period !== 'Not specified' ? `Period: ${project.period}.` : '',
        project.team ? `Team: ${project.team}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
      impact =
        project.impact.join(' ') ||
        getProjectWriteup(project.id).find((e) => /impact|changed|result|proud/i.test(e.question))
          ?.text ||
        'No authored impact facts supplied.';
    const text =
        view.section === 0
          ? overview
          : `TECH: ${getProjectTech(project.id)
              .map((s) => s.name)
              .join(', ')}\n\n${impact}`,
      links = [
        project.links.primary,
        ...project.links.others,
        { label: 'FULL WRITE-UP', url: `/projects/${project.slug}` },
      ];
    const { p, paragraph } = dexDetailUi(
      ui,
      ['PROJECT / OVERVIEW', 'PROJECT / TECH & IMPACT', 'PROJECT / LINKS'][view.section]!,
      project.visual.plateName!,
      project.type.replaceAll('_', ' '),
      view.section === 2 ? '' : text,
      view.page,
    );
    if (view.section === 2)
      links.forEach((item, i) =>
        dexText(
          p,
          ui,
          (view.cursor === i ? '▶' : ' ') + sourceFit(ui, item.label.toUpperCase(), 204),
          12,
          95 + i * 16,
          216,
        ),
      );
    else pageIndicator(p, ui, paragraph.index, paragraph.count);
    return (
      <Shell
        name="Project detail"
        paint={p}
        description={`${project.name}; role ${project.role}; period ${project.period}; ${project.team ?? ''}. ${view.section === 2 ? (view.notice ?? 'A: open link. B: back.') : text}`}
      >
        <PortfolioArt name={`project-${project.slug}-48` as PortfolioAsset} x={24} y={32} />
        <PageButtons change={page} />
        {view.section === 2
          ? links.map((item, i) => (
              <Hit
                key={item.url}
                name={item.label}
                current={view.cursor === i}
                x={8}
                y={94 + i * 16}
                w={224}
                onClick={() => tap(i)}
              />
            ))
          : view.section === 0 && (
              <button
                className="sr-only"
                onClick={() => link(`/projects/${project.slug}`, 'FULL WRITE-UP')}
              >
                Open full project write-up
              </button>
            )}
      </Shell>
    );
  }
  const p = dexListUi(
    ui,
    'PROJECTS',
    'CATALOGUE',
    projects.map((p) => p.visual.shortName!),
    view.cursor,
    project.type.replaceAll('_', ' '),
    motion,
  );
  return (
    <Shell
      scroll={motion.offset}
      name="Projects catalogue"
      paint={p}
      description={`${project.name}. ${project.visual.tagline}. A: open. B: back.`}
    >
      <PortfolioArt name={`project-${project.slug}-48` as PortfolioAsset} x={72} y={56} />
      <ListHits names={projects.map((p) => p.name)} cursor={view.cursor} tap={tap} />
    </Shell>
  );
}
export function SourceExperience({
  view,
  tap,
  section,
}: {
  view: PortfolioView;
  tap: (i: number) => void;
  section: (d: number) => void;
}) {
  const ui = useSourceUi()!,
    roles = getExperiences(),
    role = roles[view.cursor]!,
    selected = role.sections[view.section]!;
  if (view.screen === 'experience-detail') {
    const { p, paragraph } = dexDetailUi(
      ui,
      `EXPERIENCE / ${selected.name}`,
      role.company,
      role.role,
      selected.text,
      view.page,
    );
    dexText(p, ui, sourceFit(ui, role.period, 126, 'small'), 100, 57, 126, 'small');
    pageIndicator(p, ui, paragraph.index, paragraph.count);
    return (
      <Shell
        name="Experience detail"
        paint={p}
        description={`${role.company}; ${role.role}; ${role.period}. ${selected.name}. ${selected.text}`}
      >
        <PortfolioArt name="profile-large" x={32} y={40} />
        <Hit name="Previous experience section" x={0} y={0} w={20} onClick={() => section(-1)} />
        <Hit name="Next experience section" x={220} y={0} w={20} onClick={() => section(1)} />
      </Shell>
    );
  }
  const p = optionsUi(
    ui,
    roles.map((r) => r.company),
    roles.map((r) => r.shortPeriod),
    view.cursor,
    'EXPERIENCE',
  );
  const paragraph = sourceParagraph(ui, role.role, 192, 2, 0);
  p.text(ui, paragraph.text, 24, 89, 'normal', ui.portfolio!.options.palette, 2, 3, 192);
  p.text(ui, 'A: READ    B: BACK', 24, 137, 'small', ui.portfolio!.options.palette, 2, 3, 192);
  return (
    <Shell
      name="Experience"
      paint={p}
      description={`${role.company}; ${role.role}; ${role.period}. ${role.sections[0]!.text}`}
    >
      {roles.map((r, i) => (
        <Hit
          key={r.id}
          name={r.company}
          current={i === view.cursor}
          x={16}
          y={40 + i * 16}
          w={208}
          onClick={() => tap(i)}
        />
      ))}
    </Shell>
  );
}
export function SourceTrainerCard({ notice }: { notice?: string | null }) {
  const ui = useSourceUi()!,
    profile = getTrainerCard(),
    p = trainerUi(
      ui,
      [profile.name, profile.role, profile.focus, profile.school, profile.qualification],
      notice ?? profile.achievements[0]!,
    );
  return (
    <Shell
      name="Trainer Card"
      paint={p}
      description={`${profile.name}. ${profile.positioning}. ${profile.role}. ${profile.education}. ${profile.highlights.join(' ')}. ${profile.achievements.join(' ')}`}
    >
      <PortfolioArt name="trainer-portrait" x={164} y={48} label="Original portrait of Uttkarsh" />
    </Shell>
  );
}
export function SourceOptions({
  view,
  values,
  tap,
}: {
  view: PortfolioView;
  values: string[];
  tap: (i: number) => void;
}) {
  const ui = useSourceUi()!;
  return (
    <Shell
      name="Options"
      paint={optionsUi(ui, OPTION_LABELS, values, view.cursor, 'OPTION', view.notice ?? '')}
      description={view.notice ?? 'Left/right: change setting. Enter: activate. B: back.'}
    >
      {OPTION_LABELS.map((label, i) => (
        <Hit
          key={label}
          name={label}
          current={i === view.cursor}
          x={16}
          y={40 + i * 16}
          w={208}
          onClick={() => tap(i)}
        />
      ))}
      <span className="sr-only">
        {OPTION_LABELS.map((label, i) => `${label}: ${values[i] ?? ''}`).join('. ')}
      </span>
    </Shell>
  );
}
export function SourceControls() {
  const ui = useSourceUi()!,
    p = optionsUi(ui, [], [], 0, 'CONTROLS'),
    rows = [
      'ARROWS: MOVE / NAVIGATE',
      'ENTER / A: CONFIRM / INTERACT',
      'BACKSPACE / B: BACK',
      'X: PLAYER MENU',
      'Y: BAG',
      'TOUCH D-PAD: MOVE / NAVIGATE',
      'TOUCH A / B: CONFIRM / BACK',
      'TOUCH X / Y: MENU / BAG',
      'CONTROLLER: AUTO',
    ];
  rows.forEach((text, i) =>
    p.text(ui, text, 24, 41 + i * 12, 'small', ui.portfolio!.options.palette, 2, 3, 192),
  );
  return <Shell name="Controls" paint={p} description={rows.join('. ')} />;
}
export function SourceExit({ cursor, tap }: { cursor: number; tap: (i: number) => void }) {
  const ui = useSourceUi()!;
  return (
    <div role="group" aria-label="Exit confirmation" style={nativeBox(0, 0, 240, 160)}>
      <SourceSurface kind="exit-confirmation" paint={confirmationUi(ui, cursor)} />
      {['YES', 'NO'].map((label, i) => (
        <Hit
          key={label}
          name={label}
          current={i === cursor}
          x={168}
          y={72 + i * 16}
          w={40}
          onClick={() => tap(i)}
        />
      ))}
      <span className="sr-only">EXIT? Return to the portfolio?</span>
    </div>
  );
}
export function SourceParty({
  projects,
  cursor,
  active,
  onTap,
  onCancel,
  description,
}: {
  projects: PartyOption[];
  cursor: number;
  active: number;
  onTap: (i: number) => void;
  onCancel: () => void;
  description: string;
}) {
  const ui = useSourceUi()!;
  return (
    <Shell
      name="Choose a project"
      paint={partyUi(
        ui,
        projects.map((p) => p.visual?.shortName ?? p.name),
        projects.map((p) => p.type?.replaceAll('_', ' ') ?? ''),
        cursor,
        active,
        description,
      )}
      description={description}
    >
      {projects.map((project, i) => {
        const [x, y, w, h] = partyBoxes[i]!;
        return (
          <div key={project.id}>
            <button
              type="button"
              aria-label={project.name}
              aria-current={i === cursor ? 'true' : undefined}
              aria-pressed={i === active}
              onClick={() => onTap(i)}
              style={{ ...nativeBox(x, y, w, h), background: 'transparent' }}
            >
              {project.visual && (
                <BattleArtwork name={`thumb-${project.visual.artKey}`} x={0} y={i === 0 ? 8 : 2} />
              )}
            </button>
          </div>
        );
      })}
      <Hit name="BACK" x={184} y={136} w={56} onClick={onCancel} />
    </Shell>
  );
}
