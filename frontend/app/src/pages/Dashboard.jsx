import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme, Stat, Card, Btn, Badge, FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

export default function Dashboard() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, parameters: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getProjects()
      .then(projects => {
        setRecentProjects(projects.slice(0, 5));
        setStats({
          projects: projects.length,
          parameters: projects.reduce((s, p) => s + (p._count?.parameters || 0), 0),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const name = user?.displayName || user?.email || 'there';

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
          // dashboard
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '28px', color: T.textPrimary, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Welcome back, {name}
        </h1>
        <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary }}>
          Here's an overview of your organization.
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: '88px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', animation: 'pulse 1.4s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <Stat T={T} label="Projects" value={stats.projects} />
          <Stat T={T} label="Parameters" value={stats.parameters} />
          <Stat T={T} label="Environments" value="—" />
          <Stat T={T} label="API calls / day" value="—" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Recent projects */}
        <Card T={T} title="recent projects">
          {loading ? (
            <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>loading…</div>
          ) : recentProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: '24px', color: T.textMuted, marginBottom: '10px' }}>◈</div>
              <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, marginBottom: '14px' }}>
                No projects yet
              </p>
              <Btn T={T} variant="primary" size="sm" as={Link} to="/dashboard/projects">
                create first project
              </Btn>
            </div>
          ) : (
            <div>
              {recentProjects.map(project => (
                <Link key={project.id} to={`/dashboard/parameters?project=${project.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0', borderBottom: `1px solid ${T.border}`,
                  }}>
                    <div>
                      <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary }}>{project.name}</div>
                      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, marginTop: '2px' }}>
                        {project._count?.parameters || 0} parameters
                      </div>
                    </div>
                    <Badge T={T} variant="default">{project.organization?.name ?? '—'}</Badge>
                  </div>
                </Link>
              ))}
              <div style={{ marginTop: '12px' }}>
                <Link to="/dashboard/projects" style={{ textDecoration: 'none' }}>
                  <Btn T={T} variant="secondary" size="sm">view all →</Btn>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card T={T} title="quick actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: '+ new project',     href: '/dashboard/projects' },
              { label: '+ new parameter',   href: '/dashboard/parameters' },
              { label: '+ new environment', href: '/dashboard/environments' },
              { label: '≡ manage users',    href: '/dashboard/users' },
            ].map(({ label, href }) => (
              <Link key={href} to={href} style={{ textDecoration: 'none' }}>
                <Btn T={T} variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  {label}
                </Btn>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
