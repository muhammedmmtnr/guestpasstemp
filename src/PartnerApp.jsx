"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const initialRestaurants = [
  { name: "Olive & Thyme", city: "Bengaluru", address: "Indiranagar, 12th Main Road", status: "Active", plan: "Pro" },
  { name: "The Sunday Table", city: "Bengaluru", address: "Koramangala, 5th Block", status: "Active", plan: "Pro" },
  { name: "Little Juniper", city: "Mysuru", address: "Vijayanagar, 2nd Stage", status: "Pending", plan: "Basic" },
];

const plans = [
  { name: "Basic", price: 199, description: "For neighborhood favorites", features: ["1 outlet", "Essential guest tools", "Email support"] },
  { name: "Pro", price: 299, description: "For growing restaurant groups", features: ["Unlimited guest check-ins", "Guest insights & reports", "Priority support"], popular: true },
  { name: "Enterprise", price: 499, description: "For ambitious hospitality teams", features: ["Advanced team controls", "Custom integrations", "Dedicated account manager"] },
];

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    store: <><path d="M3 10v10h18V10M2 4h20l-2 6H4L2 4Z" /><path d="M9 20v-6h6v6M4 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /></>,
    card: <><rect x="2" y="5" width="20" height="15" rx="2" /><path d="M2 10h20M6 15h4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14m-7-7 7 7-7 7" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5-5 5 5m-5-5v12" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c2-5 6-9 12-12" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
}

function Brand({ inverse = false }) {
  return <span className={`gp-brand${inverse ? " gp-brand-inverse" : ""}`}><span className="gp-brand-mark"><Icon name="leaf" size={18} /></span><span>guestpass<span className="gp-brand-period">.</span></span></span>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`gp-button gp-button-${variant} ${className}`} {...props}>{children}</button>;
}

function AuthScreen({ mode, setMode, onLogin, onSignup, onBack }) {
  const [role, setRole] = useState("Partner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    setError("");
    if (mode === "signup") {
      if (password.length < 8) { setError("Choose a password with at least 8 characters."); return; }
      onSignup({ name: name.trim(), email: email.trim(), phone: phone.trim(), role });
    } else {
      onLogin(email.trim());
    }
  }
  return <main className="gp-auth">
    <section className="gp-auth-story">
      <header className="gp-auth-header"><Brand inverse /><button className="gp-auth-back" onClick={onBack}>Back to GuestPass</button></header>
      <div className="gp-auth-story-copy"><span className="gp-overline">HOSPITALITY, TOGETHER</span><h1>Make room for<br /><em>more good days.</em></h1><p>One simple place to grow every restaurant in your group. Less admin, more time for the things that matter.</p><div className="gp-story-proof"><span className="gp-proof-avatars"><i>R</i><i>A</i><i>M</i><i>+</i></span><span><strong>Made for people who love hosting</strong><small>Independent restaurants and growing groups</small></span></div></div>
      <div className="gp-auth-art" aria-hidden="true"><div className="gp-art-plate"><span /><i /><b /></div><div className="gp-art-spark gp-art-spark-one">✳</div><div className="gp-art-spark gp-art-spark-two">✳</div></div>
      <footer>© 2025 GuestPass <span>Built for better hospitality.</span></footer>
    </section>
    <section className="gp-auth-form-side"><div className="gp-auth-mobile-brand"><Brand /></div><form className="gp-auth-form" onSubmit={submit}>
      <span className="gp-overline">{mode === "signup" ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</span>
      <h2>{mode === "signup" ? "Create your account" : "Good to see you."}</h2>
      <p className="gp-auth-intro">{mode === "signup" ? "Start managing your restaurant group in one place." : "Sign in to pick up where you left off."}</p>
      {mode === "signup" && <>
        <div className="gp-role-select" aria-label="Choose account type">{["Customer", "Partner"].map((item) => <button type="button" className={role === item ? "selected" : ""} onClick={() => setRole(item)} key={item}>{item === "Partner" ? "Restaurant partner" : item}</button>)}</div>
        <label className="gp-field"><span>Full name</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>
      </>}
      <label className="gp-field"><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@restaurant.com" required /></label>
      {mode === "signup" && <label className="gp-field"><span>Phone number</span><input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" required /></label>}
      <label className="gp-field"><span>Password</span><input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"} required /></label>
      {mode === "login" && <button className="gp-forgot" type="button" onClick={() => setError("Password reset is available through your account administrator.")}>Forgot password?</button>}
      {error && <p className="gp-auth-error" role="alert">{error}</p>}
      <Button type="submit" className="gp-auth-submit">{mode === "signup" ? "Create account" : "Sign in"} <Icon name="arrow" size={18} /></Button>
      <p className="gp-auth-switch">{mode === "signup" ? "Already have an account?" : "New to GuestPass?"} <button type="button" onClick={() => { setError(""); setMode(mode === "signup" ? "login" : "signup"); }}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
      <div className="gp-auth-divider"><span />OR<span /></div>
      <button type="button" className="gp-demo-link" onClick={() => onLogin("hello@olivethyme.in")}>Explore the dashboard <Icon name="arrow" size={16} /></button>
      <p className="gp-terms">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>
    </form></section>
  </main>;
}

function Field({ label, value, onChange, placeholder, type = "text", required = true, ...props }) {
  return <label className="gp-field"><span>{label}</span><input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} {...props} /></label>;
}

function Onboarding({ onComplete, onCancel, initialName = "" }) {
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState(initialName);
  const [outlet, setOutlet] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [plan, setPlan] = useState("Pro");
  const [notice, setNotice] = useState("");
  const [locationFound, setLocationFound] = useState(false);
  const [findingLocation, setFindingLocation] = useState(false);
  async function findLocation() {
    if (!/^\d{6}$/.test(pin)) { setNotice("Enter a valid 6-digit Indian pincode."); return; }
    setFindingLocation(true);
    setNotice("");
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      if (!response.ok) throw new Error("Location service is temporarily unavailable. Please enter the city and state manually.");
      const result = await response.json();
      const postOffice = result?.[0]?.Status === "Success" ? result[0].PostOffice?.[0] : null;
      if (!postOffice) throw new Error("We couldn't find that pincode. Check it or enter the city and state manually.");
      setCity(postOffice.District || "");
      setState(postOffice.State || "");
      setNotice(`Location found: ${postOffice.District}, ${postOffice.State}.`);
      setLocationFound(true);
    } catch (error) {
      setNotice(error.message || "We couldn't look up that pincode. Please enter the city and state manually.");
    } finally {
      setFindingLocation(false);
    }
  }
  function next(event) {
    event.preventDefault();
    setNotice("");
    if (step < 3) setStep(step + 1);
    else onComplete({ name: outlet.trim(), brand: brand.trim(), city: city.trim() || "Bengaluru", address: address.trim() || [address.trim(), city.trim()].filter(Boolean).join(", ") || "Address to be updated", plan, status: "Active" });
  }
  return <main className="gp-onboard-page"><header className="gp-onboard-header"><Brand /><button className="gp-text-button" onClick={onCancel}>Save and exit</button></header><div className="gp-onboard-layout">
    <aside className="gp-onboard-aside"><span className="gp-overline">YOUR RESTAURANTS, ONE HOME</span><h1>Bring your<br />table together.</h1><p>A few small steps, then all the room you need to grow.</p><div className="gp-steps">{["Create your brand", "Add your first outlet", "Choose a plan"].map((label, index) => <div className={`gp-step ${step === index + 1 ? "active" : ""} ${step > index + 1 ? "complete" : ""}`} key={label}><span>{step > index + 1 ? <Icon name="check" size={15} /> : `0${index + 1}`}</span><div><strong>{label}</strong><small>{index === 0 ? "Tell us what to call your group" : index === 1 ? "Where guests can find you" : "Find your perfect fit"}</small></div></div>)}</div><div className="gp-onboard-note"><Icon name="leaf" size={19} /><span><strong>Made to grow with you</strong><small>Add more locations whenever you're ready.</small></span></div></aside>
    <section className="gp-onboard-main"><div className="gp-onboard-card"><div className="gp-onboard-progress"><span>STEP {step} OF 3</span><div><i style={{ width: `${step / 3 * 100}%` }} /></div></div>
      <form onSubmit={next} key={step}>
        {step === 1 && <><span className="gp-onboard-icon"><Icon name="store" size={22} /></span><span className="gp-overline">LET'S GET STARTED</span><h2>Create your first restaurant brand</h2><p className="gp-step-description">Give your restaurant group a name. You can add individual outlets next.</p><Field label="Restaurant brand name" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. The Green Table" autoFocus /><div className="gp-form-foot"><span>Step 1 of 3</span><Button type="submit">Continue <Icon name="arrow" size={17} /></Button></div></>}
        {step === 2 && <><span className="gp-onboard-icon"><Icon name="pin" size={22} /></span><span className="gp-overline">YOUR FIRST LOCATION</span><h2>Where can guests find you?</h2><p className="gp-step-description">Add the details for your first outlet. You can edit these later.</p><div className="gp-field-grid"><Field label="Outlet name" value={outlet} onChange={(event) => setOutlet(event.target.value)} placeholder={`${brand || "Your brand"} · Indiranagar`} /><Field label="Phone number" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" /></div><div className="gp-pin-row"><Field label="Pincode" inputMode="numeric" maxLength={6} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 6)); setLocationFound(false); }} placeholder="6-digit pincode" /><Button type="button" variant="outline" className="gp-find-button" disabled={findingLocation} onClick={findLocation}><Icon name="search" size={16} /> {findingLocation ? "Finding…" : "Find"}</Button></div>{locationFound && <div className="gp-location-confirm"><Icon name="check" size={15} /> {notice}</div>}{notice && !locationFound && <p className="gp-inline-note" role="alert">{notice}</p>}<div className="gp-field-grid"><Field label="City" value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Bengaluru" /><Field label="State" value={state} onChange={(event) => setState(event.target.value)} placeholder="e.g. Karnataka" /></div><Field label="Full address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Building, street, area" /><div className="gp-form-foot"><button type="button" className="gp-back-button" onClick={() => setStep(1)}>Back</button><Button type="submit">Continue <Icon name="arrow" size={17} /></Button></div></>}
        {step === 3 && <><span className="gp-onboard-icon"><Icon name="card" size={22} /></span><span className="gp-overline">A PLAN FOR EVERY TABLE</span><h2>Activate your outlet</h2><p className="gp-step-description">Choose a plan for <strong>{outlet || brand || "your first outlet"}</strong>. You can change this anytime.</p><div className="gp-plan-options">{plans.map((item) => <button type="button" className={`gp-plan-choice ${plan === item.name ? "selected" : ""} ${item.popular ? "plan-popular" : ""}`} onClick={() => setPlan(item.name)} key={item.name}>{item.popular && <span className="gp-popular-tag">MOST POPULAR</span>}<span className="gp-plan-radio" /><span className="gp-plan-name">{item.name}</span><span className="gp-plan-price">₹{item.price}<small> / outlet / mo</small></span><span className="gp-plan-desc">{item.description}</span></button>)}</div><button type="button" className="gp-custom-plan" onClick={() => setNotice("Our team will be in touch about a custom plan. You can continue with a plan for now.")}>Need something different? <strong>Talk to our team <Icon name="arrow" size={14} /></strong></button>{notice && <p className="gp-inline-note" role="status">{notice}</p>}<div className="gp-form-foot"><button type="button" className="gp-back-button" onClick={() => setStep(2)}>Back</button><Button type="submit">Proceed <Icon name="arrow" size={17} /></Button></div></>}
        {notice && step !== 3 && <p className="gp-inline-note" role="status">{notice}</p>}
      </form>
    </div><p className="gp-onboard-privacy">Your information stays private and secure.</p></section>
  </div></main>;
}

function AppShell({ children, page, setPage, onLogout, account, openOnboarding }) {
  const nav = [{ key: "overview", label: "Overview", icon: "grid" }, { key: "restaurants", label: "Restaurants", icon: "store" }, { key: "subscription", label: "Subscription", icon: "card" }, { key: "payments", label: "Payment history", icon: "file" }, { key: "invoices", label: "Invoices", icon: "file" }];
  return <div className="gp-app"><header className="gp-topbar"><button className="gp-mobile-brand" onClick={() => setPage("overview")}><Brand /></button><div className="gp-topbar-search"><Icon name="search" size={17} /><span>Search restaurants, invoices...</span><kbd>⌘ K</kbd></div><div className="gp-topbar-actions"><button className="gp-bell" aria-label="Notifications"><Icon name="bell" size={19} /><i /></button><span className="gp-topbar-divider" /><button className="gp-account-menu" onClick={onLogout} aria-label="Sign out"><span className="gp-avatar">{(account?.name || "A").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="gp-account-copy"><strong>{account?.name || "Alex Morgan"}</strong><small>Account owner</small></span><Icon name="chevron" size={15} /></button></div></header>
    <div className="gp-body"><aside className="gp-sidebar"><button className="gp-sidebar-brand" onClick={() => setPage("overview")}><Brand /></button><div className="gp-workspace"><span className="gp-workspace-icon">{(account?.name || "A").charAt(0).toUpperCase()}</span><span><strong>{account?.brand || "Olive & Thyme Group"}</strong><small>Partner workspace</small></span><Icon name="chevron" size={15} /></div><span className="gp-nav-label">WORKSPACE</span><nav>{nav.map((item) => <button className={`gp-nav-link ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)} key={item.key}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.key === "restaurants" && <small>{account?.restaurants?.length ?? initialRestaurants.length}</small>}</button>)}</nav><div className="gp-sidebar-bottom"><div className="gp-help-card"><span className="gp-help-icon"><Icon name="leaf" size={18} /></span><strong>Here when you need us.</strong><p>A question about your account? We're just a message away.</p><button onClick={() => window.alert("Our partner team is here to help at hello@guestpass.app.")}>Talk to our team <Icon name="arrow" size={14} /></button></div><button className="gp-nav-link gp-logout" onClick={onLogout}><Icon name="logout" size={18} /><span>Sign out</span></button><span className="gp-sidebar-version">GUESTPASS PARTNER · 1.0</span></div></aside><main className="gp-main">{children}</main></div>
    <button className="gp-mobile-add" onClick={openOnboarding}><Icon name="plus" size={19} /> Add restaurant</button></div>;
}

function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="gp-page-header"><div><span className="gp-overline">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="gp-header-actions">{actions}</div></div>;
}

function Overview({ restaurants, account, setPage, openOnboarding, onPayment }) {
  const active = restaurants.filter((item) => item.status === "Active").length;
  const total = restaurants.length;
  const teamPrice = Math.min(total * 299, 799);
  const standardPrice = total * 299;
  return <><PageHeader eyebrow="YOUR PARTNER WORKSPACE" title={`Good morning, ${(account?.name || "Alex").split(" ")[0]}.`} description="Here’s what’s happening across your restaurant group today." actions={<><Button variant="outline" onClick={() => document.getElementById("gp-import-input")?.click()}><Icon name="upload" size={16} /> Import sheet</Button><Button onClick={openOnboarding}><Icon name="plus" size={17} /> Add restaurant</Button></>} />
    <div className="gp-welcome-strip"><span className="gp-welcome-spark">✳</span><span><strong>Your table is growing.</strong> Everything your restaurants need, all in one place.</span><button onClick={() => setPage("restaurants")}>Explore your workspace <Icon name="arrow" size={15} /></button></div>
    <section className="gp-stats"><article className="gp-stat-card"><span className="gp-stat-icon stat-green"><Icon name="store" size={19} /></span><span className="gp-stat-label">Total restaurants</span><strong>{total.toString().padStart(2, "0")}</strong><small><span className="gp-stat-growth"><Icon name="trend" size={13} /> Growing</span> across your group</small></article><article className="gp-stat-card"><span className="gp-stat-icon stat-blue"><Icon name="check" size={19} /></span><span className="gp-stat-label">Active restaurants</span><strong>{active.toString().padStart(2, "0")}</strong><small>{total ? `${Math.round(active / total * 100)}% of your locations` : "Add your first location"}</small></article><article className="gp-stat-card"><span className="gp-stat-icon stat-gold"><Icon name="card" size={19} /></span><span className="gp-stat-label">Subscription status</span><strong className="gp-stat-word">{active ? "All good" : "Get started"}</strong><small><span className="gp-status-dot" /> Renews on 24 Aug, 2025</small></article><article className="gp-stat-card"><span className="gp-stat-icon stat-lilac"><Icon name="grid" size={19} /></span><span className="gp-stat-label">Restaurant limit</span><strong>{total}<span className="gp-limit-separator"> / </span>10</strong><small>{Math.max(10 - total, 0)} more spots to fill</small><span className="gp-limit-progress"><i style={{ width: `${Math.min(total / 10 * 100, 100)}%` }} /></span></article></section>
    <div className="gp-dashboard-grid"><section className="gp-panel gp-restaurants-panel"><div className="gp-panel-heading"><div><span className="gp-overline">YOUR PORTFOLIO</span><h2>Restaurants <span className="gp-count-pill">{total}</span></h2></div><button className="gp-link-button" onClick={() => setPage("restaurants")}>View all <Icon name="arrow" size={15} /></button></div><RestaurantTable restaurants={restaurants.slice(0, 4)} compact /><button className="gp-add-inline" onClick={openOnboarding}><span><Icon name="plus" size={15} /></span>Add a restaurant to your group</button></section>
    <div className="gp-right-column"><section className="gp-subscription-card"><div className="gp-sub-card-head"><span className="gp-overline">YOUR SUBSCRIPTION</span><span className="gp-plan-badge">PRO PLAN</span></div><h2>Good things,<br />all together.</h2><p>Simple pricing. Happy restaurants. One monthly bill.</p><div className="gp-sub-card-price"><strong>₹{teamPrice.toLocaleString("en-IN")}</strong><span> / month</span></div><div className="gp-sub-rule" /><div className="gp-sub-math"><span>{total} restaurants × ₹299</span><s>₹{standardPrice.toLocaleString("en-IN")}</s></div><div className="gp-sub-math gp-team-offer"><span><i>✳</i> Team group offer</span><strong>₹{teamPrice.toLocaleString("en-IN")}</strong></div><Button variant="light" onClick={() => onPayment(teamPrice)}>View subscription <Icon name="arrow" size={16} /></Button><small className="gp-next-bill"><Icon name="clock" size={13} /> Next payment · 24 Aug, 2025</small></section>
    <section className="gp-panel gp-activity-panel"><div className="gp-panel-heading"><div><span className="gp-overline">RECENT ACTIVITY</span><h2>All caught up</h2></div><span className="gp-live-dot" /></div><div className="gp-activity-row"><span className="gp-activity-icon"><Icon name="check" size={15} /></span><span><strong>Olive & Thyme renewed Pro</strong><small>Today, 9:42 am</small></span></div><div className="gp-activity-row"><span className="gp-activity-icon activity-warm"><Icon name="plus" size={15} /></span><span><strong>The Sunday Table was added</strong><small>Yesterday, 4:18 pm</small></span></div></section></div></div>
  </>;
}

function RestaurantTable({ restaurants, compact = false }) {
  if (!restaurants.length) return <div className="gp-empty-table"><span className="gp-empty-mark"><Icon name="store" size={21} /></span><strong>No restaurants just yet</strong><span>Add a restaurant or import your sheet to get started.</span></div>;
  return <div className={`gp-table-wrap${compact ? " gp-table-compact" : ""}`}><table className="gp-table"><thead><tr><th>RESTAURANT</th><th>LOCATION</th><th>PLAN</th><th>STATUS</th><th aria-label="Actions" /></tr></thead><tbody>{restaurants.map((restaurant, index) => <tr key={`${restaurant.name}-${index}`}><td><span className={`gp-restaurant-logo restaurant-logo-${index % 4}`}>{restaurant.name.slice(0, 1).toUpperCase()}</span><span className="gp-restaurant-name"><strong>{restaurant.name}</strong><small>{restaurant.brand || "Independent restaurant"}</small></span></td><td><span className="gp-city"><Icon name="pin" size={14} />{restaurant.city}</span></td><td><span className="gp-table-plan">{restaurant.plan || "Pro"}</span></td><td><span className={`gp-restaurant-status ${restaurant.status === "Active" ? "status-active" : "status-pending"}`}><i />{restaurant.status}</span></td><td><button className="gp-more-button" aria-label={`More options for ${restaurant.name}`} onClick={() => window.alert(`${restaurant.name} · ${restaurant.address || restaurant.city}`)}><Icon name="more" size={19} /></button></td></tr>)}</tbody></table></div>;
}

function RestaurantsPage({ restaurants, openOnboarding, onImport }) {
  const [search, setSearch] = useState("");
  const filtered = restaurants.filter((item) => `${item.name} ${item.city} ${item.brand || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="YOUR PORTFOLIO" title="Restaurants" description="Every location in your group, neatly in one place." actions={<><Button variant="outline" onClick={() => document.getElementById("gp-import-input")?.click()}><Icon name="upload" size={16} /> Import sheet</Button><Button onClick={openOnboarding}><Icon name="plus" size={17} /> Add restaurant</Button></>} /><div className="gp-list-toolbar"><label className="gp-search-input"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search restaurants..." /></label><span>{filtered.length} {filtered.length === 1 ? "restaurant" : "restaurants"}</span></div><section className="gp-panel gp-full-table"><RestaurantTable restaurants={filtered} /></section><section className="gp-import-callout"><span className="gp-import-icon"><Icon name="upload" size={20} /></span><span><strong>Bringing over a few locations?</strong><small>Upload a CSV or Excel sheet to add them all at once.</small></span><Button variant="outline" onClick={() => document.getElementById("gp-import-input")?.click()}>Import a sheet <Icon name="arrow" size={15} /></Button></section></>;
}

function SubscriptionPage({ restaurants, onPayment }) {
  const [plan, setPlan] = useState("Pro");
  const [offer, setOffer] = useState("team");
  const numberOfRestaurants = restaurants.length;
  const standard = numberOfRestaurants * 299;
  const groupOffer = Math.min(standard, 799);
  const total = offer === "team" ? groupOffer : standard;
  return <><PageHeader eyebrow="ONE PLAN. ONE BILL." title="Subscription" description="Simple group pricing that grows alongside your restaurants." /><section className="gp-subscription-hero"><div><span className="gp-overline">YOUR CURRENT PLAN</span><h2>More room to grow.</h2><p>All {numberOfRestaurants} restaurants are together on one monthly subscription.</p><span className="gp-plan-badge gp-plan-badge-light">PRO PLAN · MONTHLY</span></div><div className="gp-subscription-total"><span>YOUR MONTHLY TOTAL</span><strong>₹{total.toLocaleString("en-IN")}</strong><small>Inclusive of all restaurants</small></div></section><h2 className="gp-section-heading">Choose the plan that fits</h2><div className="gp-plans-grid">{plans.map((item) => <button key={item.name} className={`gp-plan-card ${plan === item.name ? "selected" : ""}`} onClick={() => setPlan(item.name)}><span className="gp-plan-card-top"><span className="gp-plan-name">{item.name}</span>{item.popular && <span className="gp-popular-tag">POPULAR</span>}</span><span className="gp-plan-card-price">₹{item.price}<small> / outlet / month</small></span><span className="gp-plan-desc">{item.description}</span><span className="gp-plan-features">{item.features.map((feature) => <span key={feature}><Icon name="check" size={15} />{feature}</span>)}</span><span className="gp-select-plan">{plan === item.name ? "Current selection" : `Choose ${item.name}`}</span></button>)}</div><section className="gp-panel gp-price-panel"><div className="gp-panel-heading"><div><span className="gp-overline">YOUR GROUP PRICE</span><h2>{numberOfRestaurants} restaurants, one account</h2></div></div><label className={`gp-price-option ${offer === "standard" ? "selected" : ""}`}><input type="radio" name="payment-option" checked={offer === "standard"} onChange={() => setOffer("standard")} /><span><strong>Pay standard total</strong><small>{numberOfRestaurants} restaurants × ₹299 per outlet</small></span><b>₹{standard.toLocaleString("en-IN")}<small> / month</small></b></label><label className={`gp-price-option ${offer === "team" ? "selected" : ""}`}><input type="radio" name="payment-option" checked={offer === "team"} onChange={() => setOffer("team")} /><span><strong>Team group offer <i>BEST VALUE</i></strong><small>One account price for your whole restaurant group</small></span><b>₹{groupOffer.toLocaleString("en-IN")}<small> / month</small></b></label><div className="gp-checkout-row"><span>Due today <strong>₹{total.toLocaleString("en-IN")}</strong></span><Button onClick={() => onPayment(total)}>Continue to payment <Icon name="arrow" size={16} /></Button></div></section></>;
}

function HistoryPage({ type, onPayment }) {
  const invoices = type === "invoices";
  const items = invoices ? [
    { date: "24 Jul, 2025", id: "INV-2025-0084", description: "GuestPass Pro · 3 restaurants", amount: "₹799", status: "Paid" },
    { date: "24 Jun, 2025", id: "INV-2025-0072", description: "GuestPass Pro · 3 restaurants", amount: "₹799", status: "Paid" },
    { date: "24 May, 2025", id: "INV-2025-0061", description: "GuestPass Pro · 2 restaurants", amount: "₹598", status: "Paid" },
  ] : [
    { date: "24 Jul, 2025", id: "PAY-2025-0084", description: "Monthly subscription · Pro", amount: "₹799", status: "Successful" },
    { date: "24 Jun, 2025", id: "PAY-2025-0072", description: "Monthly subscription · Pro", amount: "₹799", status: "Successful" },
    { date: "24 May, 2025", id: "PAY-2025-0061", description: "Monthly subscription · Pro", amount: "₹598", status: "Successful" },
  ];
  return <><PageHeader eyebrow={invoices ? "YOUR PAPER TRAIL" : "SECURE & SIMPLE"} title={invoices ? "Invoice history" : "Payment history"} description={invoices ? "Your restaurant group's invoices, ready whenever you need them." : "A clear record of every subscription payment."} actions={<Button variant="outline" onClick={() => window.print()}><Icon name="file" size={16} /> Export history</Button>} /><section className="gp-panel gp-history-summary"><span className="gp-history-icon"><Icon name={invoices ? "file" : "card"} size={20} /></span><span><strong>{invoices ? "Everything in one place." : "All your payments, up to date."}</strong><small>{invoices ? "Invoices are issued automatically after each successful payment." : "Your Pro subscription is active. No action needed."}</small></span><span className="gp-history-account"><i /> {invoices ? "3 invoices" : "Payment method ·•••• 4242"}</span></section><section className="gp-panel gp-history-table"><div className="gp-panel-heading"><div><span className="gp-overline">{invoices ? "YOUR INVOICES" : "RECENT TRANSACTIONS"}</span><h2>{invoices ? "All invoices" : "Recent payments"}</h2></div></div><div className="gp-table-wrap"><table className="gp-table gp-history-list"><thead><tr><th>{invoices ? "ISSUED" : "DATE"}</th><th>REFERENCE</th><th>DESCRIPTION</th><th>AMOUNT</th><th>STATUS</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.date}</td><td><strong className="gp-reference">{item.id}</strong></td><td>{item.description}</td><td><strong>{item.amount}</strong></td><td><span className="gp-restaurant-status status-active"><i />{item.status}</span></td><td><button className="gp-link-button" onClick={() => window.alert(`${item.id} is ready to view.`)}>View <Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table></div></section><div className="gp-billing-help"><span>Need help with billing?</span><button onClick={() => onPayment(0)}>Talk to our team <Icon name="arrow" size={14} /></button></div></>;
}

export default function PartnerApp() {
  const [page, setPage] = useState("overview");
  const [authMode, setAuthMode] = useState("");
  const [onboarding, setOnboarding] = useState(false);
  const [toast, setToast] = useState("");
  const [account, setAccount] = useState(null);
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const fileInput = useRef(null);
  const activePage = useMemo(() => page, [page]);
  function login(email) {
    setAccount((current) => current || { name: email === "hello@olivethyme.in" ? "Alex Morgan" : (email.split("@")[0] || "Restaurant Partner").split(/[._-]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "), email, brand: "Olive & Thyme Group" });
    setAuthMode("");
    setOnboarding(false);
  }
  function signup(details) {
    setAccount({ ...details, brand: details.role === "Partner" ? "" : "My GuestPass account" });
    setAuthMode("");
    if (details.role === "Partner") setOnboarding(true);
    else setToast("Your GuestPass account is ready.");
  }
  function finishOnboarding(details) {
    setRestaurants((current) => [...current, details]);
    setAccount((current) => ({ ...current, brand: details.brand || current?.brand }));
    setOnboarding(false);
    setPage("overview");
    setToast(`${details.name} is ready to welcome guests.`);
  }
  function importSheet(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    void file.arrayBuffer().then((buffer) => {
      const workbook = XLSX.read(buffer, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      if (!rows.length) { setToast("This sheet is empty. Add restaurant rows and try again."); return; }
      const added = rows.map((row) => {
        const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[\s_-]+/g, ""), String(value).trim()]));
        return {
          name: values.outletname || values.restaurantname || values.restaurant || values.name || "",
          brand: values.brandname || values.brand || "",
          city: values.city || "",
          address: values.fulladdress || values.address || "",
          status: "Pending",
          plan: values.plan || "Pro",
        };
      }).filter((item) => item.name);
      if (!added.length) { setToast("No restaurant names found. Include a Restaurant or Outlet Name column."); return; }
      setRestaurants((current) => [...current, ...added]);
      setPage("restaurants");
      setToast(`${added.length} restaurant${added.length === 1 ? "" : "s"} imported successfully.`);
    }).catch(() => setToast("We couldn't read this sheet. Please check the file and try again."));
  }
  function onPayment(amount) {
    if (!amount) { setToast("Our partner team is here to help at hello@guestpass.app."); return; }
    setToast(`Your ₹${amount.toLocaleString("en-IN")} payment is ready for checkout.`);
  }
  function logout() {
    setAccount(null);
    setAuthMode("login");
  }
  if (authMode) return <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={login} onSignup={signup} onBack={() => { setAuthMode(""); setPage("overview"); }} />;
  if (onboarding) return <Onboarding onComplete={finishOnboarding} onCancel={() => { setOnboarding(false); if (account && !restaurants.length) setAuthMode("login"); }} initialName={account?.brand || ""} />;
  return <><AppShell page={activePage} setPage={setPage} onLogout={logout} account={account} openOnboarding={() => setOnboarding(true)}>
    {toast && <div className="gp-toast" role="status"><Icon name="check" size={16} />{toast}<button aria-label="Dismiss" onClick={() => setToast("")}><Icon name="close" size={15} /></button></div>}
    {page === "overview" && <Overview restaurants={restaurants} account={account} setPage={setPage} openOnboarding={() => setOnboarding(true)} onPayment={onPayment} />}
    {page === "restaurants" && <RestaurantsPage restaurants={restaurants} openOnboarding={() => setOnboarding(true)} />}
    {page === "subscription" && <SubscriptionPage restaurants={restaurants} onPayment={onPayment} />}
    {(page === "payments" || page === "invoices") && <HistoryPage type={page} onPayment={onPayment} />}
    <input id="gp-import-input" ref={fileInput} className="gp-visually-hidden" type="file" accept=".csv,.xlsx,.xls" onChange={importSheet} />
  </AppShell>{!account && <button className="gp-signin-nudge" onClick={() => setAuthMode("login")}>Sign in to your account</button>}</>;
}
