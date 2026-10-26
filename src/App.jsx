const navItems = ['Product', 'Features', 'How It Works', 'Pricing', 'Sign In'];

const features = [
  {
    icon: '⚡',
    title: 'Fast check-in',
    text: 'Guests join from a QR code in seconds — no install, no friction, no waiting calls.',
  },
  {
    icon: '📲',
    title: 'Live updates',
    text: 'Guests receive real-time notifications when their table is ready or they move in the queue.',
  },
  {
    icon: '📊',
    title: 'Smarter staffing',
    text: 'Track demand, seat timing, and no-shows from one clean dashboard designed for service teams.',
  },
];

const steps = [
  { title: 'Scan', text: 'Guests scan a QR code at the door or table.' },
  { title: 'Join', text: 'They add their name, size, and preferences in under 10 seconds.' },
  { title: 'Notify', text: 'Staff can mark ready and ping guests instantly when it’s time.' },
];

const pricing = [
  {
    name: 'Starter',
    price: '$29',
    desc: 'For small restaurants and cafes',
    highlight: false,
    perks: ['Unlimited queue check-ins', 'Basic notifications', 'Daily reports'],
  },
  {
    name: 'Growth',
    price: '$79',
    desc: 'For busy dining rooms and teams',
    highlight: true,
    perks: ['Everything in Starter', 'Priority messaging', 'Advanced analytics'],
  },
  {
    name: 'Premium',
    price: '$149',
    desc: 'For multi-location hospitality groups',
    highlight: false,
    perks: ['Multi-location support', 'White-label branding', 'Dedicated onboarding'],
  },
];

const faqs = [
  'Does it work without an app?',
  'Can guests join without a phone number?',
  'How fast can we launch?',
  'Does it support WhatsApp alerts?',
];

function IconBadge({ children, active = false }) {
  return <span className={`mini-icon ${active ? 'active' : ''}`}>{children}</span>;
}

function LandingPreview() {
  return (
    <div className="phone-shell large-screen">
      <div className="status-bar">
        <span>9:41</span>
        <div className="status-icons">
          <span className="dot" />
          <span className="dot" />
          <span className="bar" />
        </div>
      </div>

      <header className="phone-header">
        <button className="back-btn" aria-label="Back">‹</button>
        <div className="brand-lockup">
          <span className="brand-mark">✦</span>
          <span className="brand-name">GuestPass</span>
        </div>
        <div className="lang-pill">EN ▾</div>
      </header>

      <section className="restaurant-card soft-card">
        <div className="rest-image" />
        <div className="rest-copy">
          <div className="rest-badge">✦</div>
          <div>
            <h3>The Green Leaf Bistro</h3>
            <p>Good Food • Great Company • Always</p>
          </div>
        </div>
      </section>

      <section className="queue-banner soft-card">
        <div className="queue-illustration">
          <span className="ring" />
          <span className="table-icon">⟡</span>
        </div>
        <div className="queue-text">
          <h2>You’re in the Queue!</h2>
          <p>Thanks for joining. We’ll notify you when your table is ready.</p>
        </div>
      </section>

      <div className="stats-grid soft-card">
        <div>
          <label>Queue Token</label>
          <strong>GP-042</strong>
        </div>
        <div>
          <label>Parties Ahead</label>
          <strong>3</strong>
        </div>
        <div>
          <label>Est. Wait Time</label>
          <strong>12 min</strong>
        </div>
      </div>

      <button className="primary-action">I’m Coming</button>
      <button className="secondary-action">Call Restaurant</button>

      <div className="bottom-nav">
        <span className="nav-item active">Home</span>
        <span className="nav-item">My Queue</span>
        <span className="nav-item">QR Code</span>
        <span className="nav-item">Profile</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="logo-wrap">
          <div className="logo-mark">✦</div>
          <span>GuestPass</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <a key={item} href="#" className={item === 'Sign In' ? 'nav-signin' : ''}>
              {item}
            </a>
          ))}
        </nav>
      </header>

      <main className="landing-page">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Waitlist software for hospitality</div>
            <h1>Less waiting. More great food.</h1>
            <p>
              GuestPass helps restaurants turn front-door frustration into a premium guest journey with
              QR check-ins, live queue status, and staff-ready updates.
            </p>
            <div className="cta-row">
              <button className="cta-primary">Start Free Setup</button>
              <button className="cta-secondary">Watch Demo</button>
            </div>
            <div className="mini-trust">
              <span>Trusted by 2,400+ restaurants</span>
              <div className="stars">★★★★★</div>
            </div>
          </div>

          <div className="hero-visual">
            <LandingPreview />
            <div className="floating-card small-preview">
              <span className="small-tag">Live queue</span>
              <strong>12 guests</strong>
              <small>Avg wait: 15 min</small>
            </div>
          </div>
        </section>

        <section className="features">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card">
              <IconBadge>{feature.icon}</IconBadge>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="workflow section-block">
          <div className="section-head">
            <div className="eyebrow">How it works</div>
            <h2>Simple, seamless guest flow</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="step-card">
                <div className="step-number">0{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing section-block">
          <div className="section-head center">
            <div className="eyebrow">Flexible pricing</div>
            <h2>Simple plans that scale with service</h2>
          </div>
          <div className="pricing-grid">
            {pricing.map((plan) => (
              <article key={plan.name} className={`pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                <div className="plan-name">{plan.name}</div>
                <div className="price-row">
                  <span className="price">{plan.price}</span>
                  <span className="period">/mo</span>
                </div>
                <p>{plan.desc}</p>
                <ul>
                  {plan.perks.map((perk) => (
                    <li key={perk}>✓ {perk}</li>
                  ))}
                </ul>
                <button className={plan.highlight ? 'plan-button emphasized' : 'plan-button'}>Choose plan</button>
              </article>
            ))}
          </div>
        </section>

        <section className="faq section-block">
          <div className="section-head center">
            <div className="eyebrow">FAQ</div>
            <h2>Everything restaurants need to know</h2>
          </div>
          <div className="faq-list">
            {faqs.map((question) => (
              <div key={question} className="faq-item">
                <span>{question}</span>
                <strong>+</strong>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="logo-wrap">
          <div className="logo-mark">✦</div>
          <span>GuestPass</span>
        </div>
        <p>Premium queue management for modern restaurants.</p>
      </footer>
    </div>
  );
}

export default App;
