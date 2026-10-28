import { useEffect } from 'react';
import ContractUnavailablePage from './ContractUnavailablePage';
import SignInPage from './SignInPage';
import UserDetailsPage from './UserDetailsPage';
import UserManagementPage from './UserManagementPage';
import { useAuth } from './AuthProvider';
import QueueApp from './queue/QueueApp';

const sidebarItems = [
  { label: 'Overview', active: true, icon: '⌂' },
  { label: 'Restaurants', icon: '◫' },
  { label: 'Registrations & Approval', badge: '12', icon: '◌' },
  { label: 'Bookings', icon: '✓' },
  { label: 'Queue Monitor', icon: '≈' },
  { label: 'Users & Guests', icon: '◎' },
  { label: 'QR Codes', icon: '◍' },
  { label: 'Subscriptions & Plans', icon: '◐' },
  { label: 'Payments & Invoices', icon: '⟡' },
  { label: 'Analytics & Reports', icon: '◔' },
  { label: 'Notifications', badge: '3', icon: '◕' },
  { label: 'Support Tickets', badge: '2', icon: '◖' },
  { label: 'Audit Logs', icon: '◗' },
  { label: 'Roles & Permissions', icon: '◘' },
  { label: 'Settings', icon: '⚙' },
];
const SIGN_IN_PATHS = ['/sign-in', '/auth/sign-in'];
const SIGN_UP_PATHS = ['/sign-up', '/auth/sign-up'];

const stats = [
  { title: 'Total Restaurants', value: '248', delta: '+12%', detail: 'from last month', tone: 'green', icon: '▣' },
  { title: 'Active Restaurants', value: '216', delta: '+10%', detail: 'from last month', tone: 'green', icon: '✓' },
  { title: 'Suspended Restaurants', value: '8', delta: '-33%', detail: 'from last month', tone: 'red', icon: '⏱' },
  { title: 'Pending Approval', value: '12', delta: '+71%', detail: 'from last month', tone: 'yellow', icon: '◌' },
  { title: 'Bookings Today', value: '1,284', delta: '+18%', detail: 'from yesterday', tone: 'green', icon: '◫' },
  { title: 'Queue Entries Today', value: '436', delta: '+22%', detail: 'from yesterday', tone: 'green', icon: '◣' },
  { title: 'Monthly Recurring Revenue', value: '₹2.48L', delta: '+16%', detail: 'from last month', tone: 'green', icon: '◌' },
  { title: 'Trial Expiring', value: '9', delta: '+25%', detail: 'from last week', tone: 'yellow', icon: '◍' },
];

const registrations = [
  { name: 'The Spice Route', location: 'Calicut, Kerala', time: '2 hrs ago', status: 'Approve', accent: 'green' },
  { name: 'Urban Table', location: 'Trivandrum, Kerala', time: '4 hrs ago', status: 'Approve', accent: 'green' },
  { name: 'Coastal Kitchen', location: 'Kochi, Kerala', time: '6 hrs ago', status: 'Approve', accent: 'green' },
  { name: 'The Food Deck', location: 'Ernakulam, Kerala', time: '8 hrs ago', status: 'Approve', accent: 'green' },
];

const queueEntries = [
  { name: 'The Green Leaf Bistro', guests: '12 guests', wait: '15 min' },
  { name: 'Spice Route Restaurant', guests: '8 guests', wait: '20 min' },
  { name: 'Urban Table', guests: '6 guests', wait: '12 min' },
  { name: 'Coastal Kitchen', guests: '5 guests', wait: '18 min' },
];

const restaurants = [
  { id: 1, name: 'The Green Leaf Bistro', owner: 'Rahul S.', location: 'Kochi, Kerala', plan: 'Starter', qr: 'Active', joined: 'Apr 12, 2025', status: 'Active', actions: ['View', 'Edit'] },
  { id: 2, name: 'Spice Route Restaurant', owner: 'Anjali P.', location: 'Calicut, Kerala', plan: 'Growth', qr: 'Active', joined: 'Apr 8, 2025', status: 'Active', actions: ['View', 'Edit'] },
  { id: 3, name: 'Urban Table', owner: 'Sajid K.', location: 'Trivandrum, Kerala', plan: 'Trial', qr: 'Active', joined: 'Apr 5, 2025', status: 'Pending', actions: ['View', 'Edit'] },
  { id: 4, name: 'Coastal Kitchen', owner: 'Nisha S.', location: 'Kochi, Kerala', plan: 'Pro', qr: 'Active', joined: 'Mar 28, 2025', status: 'Suspended', actions: ['View', 'Edit'] },
  { id: 5, name: 'The Food Deck', owner: 'Arjun R.', location: 'Ernakulam, Kerala', plan: 'Starter', qr: 'Active', joined: 'Mar 20, 2025', status: 'Active', actions: ['View', 'Edit'] },
];

const systemHealth = [
  { name: 'API Service', status: 'Online' },
  { name: 'Database', status: 'Online' },
  { name: 'QR Service', status: 'Online' },
];

const recentActivity = [
  'Restaurant approved: The Spice Route',
  'Subscription upgraded: Urban Table (Pro)',
  'Restaurant suspended: Coastal Kitchen',
  'New user registered: admin@guestpass.com',
];

function App() {
  const pathname = window.location.pathname;
  const auth = useAuth();
  const isProtectedRoute = pathname === '/admin/users'
    || pathname === '/admin/users/'
    || /^\/(?:admin\/)?users\/[^/]+\/?$/.test(pathname);

  useEffect(() => {
    if (!auth.isConfigured || auth.isLoading) {
      return;
    }

    if (isProtectedRoute && !auth.session) {
      const query = new URLSearchParams({ from: `${pathname}${window.location.search}` });
      window.location.replace(`/sign-in?${query}`);
    } else if (SIGN_IN_PATHS.includes(pathname) && auth.session) {
      window.location.replace(getSafeReturnPath());
    }
  }, [auth.isConfigured, auth.isLoading, auth.session, isProtectedRoute, pathname]);

  if (pathname.startsWith('/r/') || pathname === '/staff' || pathname.startsWith('/staff/')) {
    return <QueueApp path={pathname} />;
  }

  if (pathname === '/admin/users' || pathname === '/admin/users/') {
    if (!auth.isConfigured) {
      return (
        <ContractUnavailablePage
          title="Configure admin authentication"
          endpoint="Supabase Auth"
          details={[
            'Set VITE_SUPABASE_URL and a Supabase publishable/anon key in .env.local.',
            'Do not use a Supabase service-role key in the browser.',
            'The backend must accept the Supabase Auth access token for this project.',
          ]}
        />
      );
    }
    if (auth.isLoading) {
      return <main className="user-details-page"><p role="status">Checking Supabase session…</p></main>;
    }
    if (!auth.session) {
      return <main className="user-details-page"><p role="status">Redirecting to sign in…</p></main>;
    }

    return <UserManagementPage onSignOut={auth.signOut} />;
  }

  if (SIGN_IN_PATHS.includes(pathname)) {
    if (auth.isConfigured && auth.isLoading) {
      return <main className="user-details-page"><p role="status">Checking Supabase session…</p></main>;
    }
    if (auth.isConfigured && auth.session) {
      return <main className="user-details-page"><p role="status">Opening the admin panel…</p></main>;
    }
    if (!auth.isConfigured) {
      return (
        <ContractUnavailablePage
          title="Configure Supabase Auth"
          endpoint="Supabase Auth signInWithPassword"
          details={[
            'Set VITE_SUPABASE_URL in .env.local.',
            'Set VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env.local.',
            'Use only a public publishable/anon key; a service-role key is rejected.',
          ]}
        />
      );
    }
    return (
      <SignInPage />
    );
  }

  if (SIGN_UP_PATHS.includes(pathname)) {
    return (
      <ContractUnavailablePage
        title="Create an account"
        endpoint="POST /auth/sign-up"
        details={[
          'Required and optional registration fields and validation rules.',
          'Supported account types and verification requirements.',
          'Success response and post-registration navigation behavior.',
        ]}
      />
    );
  }

  if (pathname === '/profile' || pathname === '/users/me/profile' || pathname === '/users/me/profile-image') {
    return (
      <ContractUnavailablePage
        title="My profile"
        endpoint="POST /users/me/profile and POST /users/me/profile-image"
        details={[
          'A verified current-user GET endpoint to load the existing profile.',
          'Editable profile fields and update semantics.',
          'Image multipart field name, accepted file types, limits, and response format.',
        ]}
      />
    );
  }

  const userDetailsMatch = pathname.match(/^\/(?:admin\/)?users\/([^/]+)\/?$/);

  if (userDetailsMatch) {
    if (!auth.isConfigured) {
      return (
        <ContractUnavailablePage
          title="Configure admin authentication"
          endpoint="Supabase Auth"
          details={['Set the Supabase URL and public anon/publishable key in .env.local to view protected user records.']}
        />
      );
    }
    if (auth.isLoading) {
      return <main className="user-details-page"><p role="status">Checking Supabase session…</p></main>;
    }
    if (!auth.session) {
      return <main className="user-details-page"><p role="status">Redirecting to sign in…</p></main>;
    }
    try {
      return <UserDetailsPage userId={decodeURIComponent(userDetailsMatch[1])} />;
    } catch {
      return (
        <ContractUnavailablePage
          title="Invalid user link"
          endpoint="GET /admin/users/:userId"
          details={['The user ID in this URL is malformed. Return to the user list and open the record again.']}
        />
      );
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">G</div>
          <div>
            <div className="brand-name">GuestPass</div>
            <div className="brand-subtitle">Restaurant Waitlist &amp; Booking</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            item.label === 'Users & Guests' ? (
              <a key={item.label} className="nav-item" href="/admin/users">
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ) : (
              <button key={item.label} className={`nav-item ${item.active ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-logo">GP</div>
          <div>
            <div className="footer-title">GuestPass Platform</div>
            <div className="footer-text">Connecting restaurants with great experiences.</div>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input placeholder="Search restaurants, owners, locations..." aria-label="Search" />
          </div>
          <div className="topbar-actions">
            <div className="date-pill">Apr 24, 2025 — Apr 30, 2025</div>
            <div className="avatar-wrap">
              <div className="avatar">S</div>
              <div>
                <div className="user-name">Super Admin</div>
                <div className="user-role">Platform Owner</div>
              </div>
            </div>
          </div>
        </header>

        <p className="dashboard-demo-notice">
          Overview figures and restaurant rows are static design examples, not live API data.
          User Management is connected to the backend.
        </p>

        <section className="dashboard-grid">
          <div className="overview-section">
            <div className="section-header-row">
              <div>
                <h1>Platform Overview</h1>
                <p>Manage every restaurant, booking and subscription from one place.</p>
              </div>
              <button className="primary-btn">+ Add Restaurant</button>
            </div>

            <div className="stats-grid">
              {stats.map((stat) => (
                <div className="stat-card" key={stat.title}>
                  <div className="stat-header">
                    <span className={`stat-icon ${stat.tone}`}>{stat.icon}</span>
                    <span className={`delta ${stat.tone}`}>{stat.delta}</span>
                  </div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-detail">{stat.title}</div>
                  <div className="stat-meta">{stat.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="side-panel">
            <div className="panel-header">
              <h3>Recent Registrations</h3>
              <button>View All →</button>
            </div>
            <div className="registration-list">
              {registrations.map((item) => (
                <div className="registration-item" key={item.name}>
                  <div className="mini-avatar">{item.name.slice(0, 1)}</div>
                  <div className="item-copy">
                    <div className="item-name">{item.name}</div>
                    <div className="item-location">{item.location}</div>
                    <div className="item-time">{item.time}</div>
                  </div>
                  <div className="actions-row">
                    <button className="approve-btn">Approve</button>
                    <button className="reject-btn">Reject</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="queue-box">
              <div className="panel-header tight">
                <h3>Live Queue</h3>
                <button>View All →</button>
              </div>
              {queueEntries.map((item) => (
                <div className="queue-item" key={item.name}>
                  <div className="queue-badge">◉</div>
                  <div className="queue-copy">
                    <div className="queue-name">{item.name}</div>
                    <div className="queue-meta">{item.guests}</div>
                  </div>
                  <div className="queue-wait">{item.wait}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="content-left">
            <div className="chart-card">
              <div className="panel-header chart-head">
                <h3>Restaurant Registrations &amp; Bookings</h3>
                <div className="pill-row">
                  <span className="pill active">Last 7 days</span>
                </div>
              </div>
              <div className="chart-placeholder">
                <div className="chart-grid-lines" />
                <div className="chart-line">
                  <span className="dot d1" />
                  <span className="dot d2" />
                  <span className="dot d3" />
                  <span className="dot d4" />
                  <span className="dot d5" />
                  <span className="dot d6" />
                </div>
              </div>
            </div>

            <div className="meta-row">
              <div className="small-card">
                <div className="panel-header tight">
                  <h3>Restaurant Status</h3>
                </div>
                <div className="status-donut">
                  <div className="donut-center">
                    <div className="donut-value">248</div>
                    <div>Total</div>
                  </div>
                </div>
                <div className="legend-list">
                  <span><i className="dot green" /> Active</span>
                  <span><i className="dot yellow" /> Pending</span>
                  <span><i className="dot teal" /> Suspended</span>
                  <span><i className="dot gray" /> Inactive</span>
                </div>
              </div>

              <div className="small-card">
                <div className="panel-header tight">
                  <h3>Subscription Plan Distribution</h3>
                </div>
                <div className="subscription-donut">
                  <div className="donut-center">
                    <div className="donut-value">248</div>
                    <div>Total</div>
                  </div>
                </div>
                <div className="legend-list split">
                  <span><i className="dot green" /> Free Trial</span>
                  <span><i className="dot blue" /> Starter</span>
                  <span><i className="dot purple" /> Growth</span>
                  <span><i className="dot orange" /> Pro</span>
                </div>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <h3>Restaurant Management</h3>
              <div className="table-actions">
                <input placeholder="Search restaurants..." aria-label="Search restaurants" />
                <span className="table-pill">Status: All</span>
                <span className="table-pill">Plan: All</span>
                <span className="table-pill">City: All</span>
                <span className="table-pill">Joined: All</span>
                <button className="export-btn">Export CSV</button>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Restaurant</th>
                  <th>Owner</th>
                  <th>Location</th>
                  <th>Plan</th>
                  <th>QR Status</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td>{restaurant.id}</td>
                    <td className="restaurant-cell">
                      <div className="restaurant-icon">{restaurant.name.slice(0, 1)}</div>
                      <div>
                        <div className="restaurant-name">{restaurant.name}</div>
                        <div className="restaurant-sub">{restaurant.location}</div>
                      </div>
                    </td>
                    <td>{restaurant.owner}</td>
                    <td>{restaurant.location}</td>
                    <td>{restaurant.plan}</td>
                    <td><span className="status-badge active">{restaurant.qr}</span></td>
                    <td>{restaurant.joined}</td>
                    <td><span className={`status-badge ${restaurant.status.toLowerCase()}`}>{restaurant.status}</span></td>
                    <td className="action-cell">
                      <button>View</button>
                      <button>Edit</button>
                      <button className="more">⋯</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="right-stack">
            <div className="system-card">
              <div className="panel-header">
                <h3>System Health</h3>
              </div>
              <div className="health-list">
                {systemHealth.map((item) => (
                  <div className="health-item" key={item.name}>
                    <span>{item.name}</span>
                    <span className="health-status online">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="activity-card">
              <div className="panel-header">
                <h3>Recent Admin Activity</h3>
                <button>View All →</button>
              </div>
              <div className="activity-list">
                {recentActivity.map((item) => (
                  <div className="activity-item" key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function getSafeReturnPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('from');
  if (requestedPath === '/admin/users' || requestedPath?.startsWith('/admin/users/')) {
    return requestedPath;
  }
  return '/admin/users';
}

export default App;
