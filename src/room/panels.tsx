import { PERSON, type Content } from '../content/profile';
import type { HotspotContent, ProjectId } from './hotspots';

/** Title of the panel for a hotspot, taken from the existing section titles. */
export function panelTitle(content: Content, what: HotspotContent): string {
  switch (what.kind) {
    case 'experience':
      return content.experience.title;
    case 'projects':
      return content.projects.title;
    case 'skills':
      return content.skills.title;
    case 'project':
      return content.projects.items.find((p) => p.id === what.project)?.name ?? content.projects.title;
    case 'contact':
      return content.contact.title;
    case 'education':
      return content.education.title;
  }
}

export function ExperienceBody({ content }: { content: Content }) {
  return (
    <>
      {content.experience.jobs.map((job) => (
        <article key={job.id} className="room-entry">
          <h3>{job.role}</h3>
          <p className="room-meta">
            {job.company} · {job.place} ·{' '}
            <time dateTime={job.start}>{job.period}</time>
          </p>
          <p>{job.summary}</p>
          <ul className="room-list">
            {job.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </article>
      ))}
    </>
  );
}

function ProjectBody({ content, id }: { content: Content; id: ProjectId }) {
  const project = content.projects.items.find((p) => p.id === id);
  if (!project) return null;
  return (
    <article className="room-entry">
      <h3>{project.name}</h3>
      <p>{project.summary}</p>
      <ul className="room-list">
        {project.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <p className="room-meta">{project.stack.join(', ')}</p>
      {project.link && (
        <p>
          <a href={project.link.href}>{project.link.label}</a>
        </p>
      )}
    </article>
  );
}

interface BodyProps {
  content: Content;
  what: HotspotContent;
  book: ProjectId;
  onBook: (id: ProjectId) => void;
}

export function PanelBody({ content, what, book, onBook }: BodyProps) {
  switch (what.kind) {
    case 'experience':
      return <ExperienceBody content={content} />;
    case 'projects': {
      const selected = what.projects.includes(book) ? book : what.projects[0]!;
      return (
        <>
          <p className="room-lede">{content.projects.intro}</p>
          <div className="room-books" role="group" aria-label={content.projects.title}>
            {what.projects.map((id) => (
              <button
                key={id}
                type="button"
                className="room-chip"
                aria-pressed={id === selected}
                onClick={() => onBook(id)}
              >
                {content.projects.items.find((p) => p.id === id)?.name}
              </button>
            ))}
          </div>
          <ProjectBody content={content} id={selected} />
        </>
      );
    }
    case 'skills':
      return (
        <dl className="room-skills">
          {content.skills.groups.map((g) => (
            <div key={g.id}>
              <dt>{g.name}</dt>
              <dd>{g.items.join(', ')}</dd>
            </div>
          ))}
        </dl>
      );
    case 'project':
      return <ProjectBody content={content} id={what.project} />;
    case 'contact':
      return (
        <>
          <p>{content.contact.intro}</p>
          <p>
            <a href={`mailto:${PERSON.email}`}>{content.contact.emailLabel}</a>
          </p>
          <ul className="room-links">
            {content.contact.links.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
          <p>
            <a className="room-cta" href={content.ui.cvHref} download type="application/pdf">
              {content.ui.downloadCv}
            </a>
          </p>
        </>
      );
    case 'education':
      return (
        <article className="room-entry">
          <h3>{content.education.degree}</h3>
          <p className="room-meta">
            {content.education.school} · {content.education.period}
          </p>
          <p>{content.education.thesis}</p>
          <p>{content.education.languages}</p>
        </article>
      );
  }
}
