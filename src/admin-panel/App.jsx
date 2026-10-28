import { useEffect, useState } from 'react';
import ContractUnavailablePage from './ContractUnavailablePage';
import SignInPage from './SignInPage';
import SetupPage from './SetupPage';
import UserDetailsPage from './UserDetailsPage';
import UserManagementPage from './UserManagementPage';
import { isSuperAdmin, useAdminAuth } from './AdminAuthProvider';
import { adminDashboardApi } from './api';

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

const statKeys = [
  ['totalRestaurants', 'total_restaurants', 'total_restaurant_count'],
  ['activeRestaurants', 'active_restaurants', 'active_restaurant_count'],
  ['suspendedRestaurants', 'suspended_restaurants', 'suspended_restaurant_count'],
  ['pendingApproval', 'pending_approval', 'pending_approvals'],
  ['bookingsToday', 'bookings_today', 'today_bookings'],
  ['queueEntriesToday', 'queue_entries_today', 'today_queue_entries'],
  ['monthlyRecurringRevenue', 'monthly_recurring_revenue', 'mrr'],
  ['trialExpiring', 'trial_expiring', 'trials_expiring'],
];

function normalizeDashboardStats(payload) {
  const data = payload?.data ?? payload;
  const values = data?.stats ?? data?.metrics ?? data;
  const liveValues = Array.isArray(values)
    ? new Map(values.map((item) => [
      String(item?.key ?? item?.title ?? item?.label ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''),
      item,
    ]))
    : values && typeof values === 'object'
      ? new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]))
      : new Map();
  let matched = 0;

  const normalized = stats.map((stat, index) => {
    const aliases = statKeys[index].map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const liveValue = aliases.map((key) => liveValues.get(key)).find((value) => value !== undefined);
    if (liveValue === undefined) return stat;

    const value = liveValue && typeof liveValue === 'object'
      ? liveValue.value ?? liveValue.count ?? liveValue.total
      : liveValue;
    if (value === undefined || value === null || !['string', 'number'].includes(typeof value)) {
      return stat;
    }

    matched += 1;
    return {
      ...stat,
      value: typeof value === 'number' ? value.toLocaleString() : value,
      delta: typeof liveValue === 'object' && liveValue.delta ? liveValue.delta : 'Live',
      detail: typeof liveValue === 'object' && liveValue.detail ? liveValue.detail : 'from dashboard API',
    };
  });

  return matched > 0 ? normalized : null;
}

function App() {
  const pathname = window.location.pathname;
  const auth = useAdminAuth();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardStatsError, setDashboardStatsError] = useState('');
  const isAdminHome = pathname === '/admin' || pathname === '/admin/';
  const isPublicAdminAuthRoute = pathname === '/admin/setup' || pathname === '/admin/login';

  useEffect(() => {
    if (!isAdminHome || auth.isLoading || !auth.session) return undefined;
    const controller = new AbortController();
    setDashboardStatsError('');
    adminDashboardApi.stats({ signal: controller.signal })
      .then((payload) => {
        if (!controller.signal.aborted) setDashboardStats(normalizeDashboardStats(payload));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setDashboardStats(null);
        if (error.status !== 404) setDashboardStatsError(error.message);
      });

    return () => controller.abort();
  }, [auth.isLoading, auth.session, isAdminHome]);

  useEffect(() => {
    if (auth.isLoading) return;
    if (pathname === '/admin/setup' && auth.session) {
      window.location.replace('/admin');
    } else if (pathname === '/admin/login' && auth.session) {
      window.location.replace(getSafeReturnPath());
    } else if (!isPublicAdminAuthRoute && !auth.session) {
      const query = new URLSearchParams({ from: `${pathname}${window.location.search}` });
      window.location.replace(`/admin/login?${query}`);
    }
  }, [auth.isLoading, auth.session, isPublicAdminAuthRoute, pathname]);

  if (pathname === '/admin/setup') {
    return auth.session
      ? <main className="user-details-page"><p role="status">Opening the admin panel…</p></main>
      : <SetupPage />;
  }

  if (pathname === '/admin/login') {
    return auth.session
      ? <main className="user-details-page"><p role="status">Opening the admin panel…</p></main>
      : <SignInPage />;
  }

  if (auth.isLoading) {
    return <main className="user-details-page"><p role="status">Checking admin session…</p></main>;
  }

  if (pathname === '/admin/users' || pathname === '/admin/users/') {
    if (!auth.session) {
      return <main className="user-details-page"><p role="status">Redirecting to admin sign in…</p></main>;
    }

    return <UserManagementPage onSignOut={auth.signOut} />;
  }

  const userDetailsMatch = pathname.match(/^\/(?:admin\/)?users\/([^/]+)\/?$/);

  if (userDetailsMatch) {
    if (!auth.session) {
      return <main className="user-details-page"><p role="status">Redirecting to admin sign in…</p></main>;
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

  if (!auth.session || !isSuperAdmin(auth.user)) {
    return <main className="user-details-page"><p role="status">Redirecting to admin sign in…</p></main>;
  }

  const displayName = auth.user.fullName
    || auth.user.full_name
    || auth.user.name
    || auth.user.profile?.full_name
    || auth.user.email
    || 'Super Admin';
  const displayRole = String(auth.user.role ?? auth.user.accountType ?? auth.user.account_type)
    .replace(/[_-]+/g, ' ');

  function handleSignOut() {
    auth.signOut();
    window.location.replace('/admin/login');
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
              <div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="user-name">{displayName}</div>
                <div className="user-role">{displayRole}</div>
              </div>
              <button type="button" className="admin-signout" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </header>

        <p className="dashboard-demo-notice">
          {dashboardStats
            ? 'Dashboard metrics include live API data. Registration, queue, restaurant and activity panels remain examples.'
            : 'Overview figures and restaurant rows are static design examples, not live API data.'}
          {' '}User Management is connected to the backend.
          {dashboardStatsError && <span> Dashboard stats unavailable: {dashboardStatsError}</span>}
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
              {(dashboardStats || stats).map((stat) => (
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
  if (
    requestedPath?.startsWith('/admin/')
    && requestedPath !== '/admin/login'
    && requestedPath !== '/admin/setup'
  ) {
    return requestedPath;
  }
  return '/admin';
}

export default App;
