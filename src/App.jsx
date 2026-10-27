import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  claimDemoRestaurant,
  cancelBookingByToken,
  createLocalDemoSession,
  createRestaurant,
  defaultHours,
  getBookingByToken,
  getDemoProfile,
  getDemoQrId,
  getOwnedRestaurant,
  getPublicReview,
  getPublicQueueSummary,
  getRestaurantByQr,
  getSession,
  isDemoMode,
  joinQueue,
  listBookings,
  listQueueActivity,
  removeBooking,
  saveProfile,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  submitPublicReview,
  subscribeToAuth,
  subscribeToBookings,
  updateBookingStatus,
  updateRestaurant,
  uploadRestaurantImage,
} from './data'

const adminNavigation = [
  { id: 'dashboard', label: 'Overview', icon: 'home' },
  { id: 'queue', label: 'Live queue', icon: 'people' },
  { id: 'qr', label: 'Your QR code', icon: 'qr' },
  { id: 'history', label: 'Bookings', icon: 'clock' },
  { id: 'analytics', label: 'Reports', icon: 'chart' },
  { id: 'settings', label: 'Restaurant settings', icon: 'settings' },
]

const statusLabels = { waiting: 'Waiting', notified: 'Called', seated: 'Seated', completed: 'Completed', cancelled: 'Cancelled' }

function Icon({ name, size = 20, className = '' }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Zm13-13a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 4v1h-3" /></>,
    qr: <><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 14v2m-2 3h4v2h-4z" /><path d="M6 6h1m10 0h1M6 17h1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6" /><path d="M16 7h4v4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z" transform="translate(-1 -1)" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c2-5 6-9 12-12" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M7 3H5a2 2 0 0 0-2 2c0 8.8 7.2 16 16 16a2 2 0 0 0 2-2v-2l-5-2-2 3a14 14 0 0 1-7-7l3-2-3-5Z" />,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>,
    arrow: <><path d="M5 12h14m-7-7 7 7-7 7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.7 6.8-4.4m-6.8 7 6.8 4.4" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    back: <path d="m15 18-6-6 6-6" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    table: <><path d="M3 8h18v3H3zM5 11v9m14-9v9M8 20h8M8 8V4h8v4" /><path d="M9 14h6" /></>,
    utensils: <><path d="M4 4v7m4-7v7M6 11v9M4 4v4h4V4m8 16V4m0 0c2 2 3 4 3 7h-3" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  }
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.check}</svg>
}

function Brand({ compact = false }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`}><span className="brand-symbol"><Icon name="leaf" size={20} /></span><span>GuestPass</span></span>
}

function Button({ children, variant = 'secondary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

function Notice({ children, type = 'error', onClose }) {
  if (!children) return null
  return <div className={`notice notice-${type}`} role={type === 'error' ? 'alert' : 'status'}><span>{children}</span>{onClose && <button onClick={onClose} aria-label="Dismiss message"><Icon name="close" size={16} /></button>}</div>
}

function RestaurantImage({ restaurant, className = '' }) {
  const style = restaurant?.cover_url ? { backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(5, 30, 23, .55)), url("${restaurant.cover_url}")` } : undefined
  return <div className={`restaurant-image ${className}`} style={style} role="img" aria-label={`${restaurant?.name || 'Restaurant'} dining room`} />
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function GuestLanding({ restaurant, queueCount, onJoin, onPortal, error }) {
  const isOpen = restaurant?.is_open ?? false
  return (
    <div className="guest-site">
      <header className="public-header">
        <a className="brand-link" href="/" aria-label="GuestPass home"><Brand /></a>
        <div className="public-header-right">{restaurant && <span className={`open-pill ${isOpen ? 'is-open' : 'is-closed'}`}><i />{isOpen ? 'Open now' : 'Queue paused'}</span>}<span className="language-button" aria-label="Current language: English"><Icon name="globe" size={18} /> EN</span><Button onClick={onPortal}>Restaurant portal</Button></div>
      </header>
      <main>
        {error && <div className="public-notice"><Notice>{error}</Notice></div>}
        {restaurant ? <>
          <section className="public-hero">
            <RestaurantImage restaurant={restaurant} className="public-hero-image" />
            <div className="hero-overlay" />
            {restaurant.logo_url && <img className="hero-logo-image" src={restaurant.logo_url} alt={`${restaurant.name} logo`} />}
            <div className="public-hero-copy"><span className="hero-kicker"><span className="brand-symbol"><Icon name="leaf" size={18} /></span> YOUR TABLE, WITHOUT THE WAIT</span><h1>{restaurant.name}</h1><p>{restaurant.description || 'Good food, great company, and a better way to wait.'}</p><div className="hero-address"><Icon name="pin" size={16} />{restaurant.address || 'Visit us for a memorable meal'}</div></div>
          </section>
          <section className="guest-content">
            <div className="queue-summary"><span className="summary-icon"><Icon name="people" size={24} /></span><span><strong>{queueCount} {queueCount === 1 ? 'group' : 'groups'} currently in queue</strong><small>{isOpen ? `Estimated wait: ${estimateRange(queueCount, restaurant.avg_service_minutes)} min` : 'The waitlist is currently paused'}</small></span><span className="summary-live"><i /> LIVE</span></div>
            <Button variant="primary" className="join-cta" disabled={!isOpen} onClick={onJoin}><Icon name="qr" size={24} />{isOpen ? 'Join Queue' : 'Queue Paused'}<Icon name="arrow" size={19} /></Button>
            <p className="no-app-note">Scan our QR code at the entrance or tap above to join the queue.<br /> No app. No account. Just you.</p>
            <div className="benefit-grid"><Benefit icon="ϟ" title="Fast & Easy" detail="Join in seconds" /><Benefit icon={<Icon name="clock" size={25} />} title="Live Updates" detail="Know your status" /><Benefit icon={<Icon name="bell" size={24} />} title="Table Ready" detail="Get notified" /><Benefit icon="♡" title="Better Experience" detail="Less waiting, more dining" /></div>
            <article className="dining-card"><div className="dining-photo" /><div className="dining-description"><span className="tag">A GREAT PLACE TO DINE</span><h2>Fresh ingredients.<br />Memorable moments.</h2><p>Modern cuisine, warm atmosphere, perfect for any occasion.</p></div><Icon name="arrow" className="dining-arrow" size={20} /></article>
            <a className="location-card" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.name, restaurant.address].filter(Boolean).join(' '))}`} target="_blank" rel="noreferrer"><span className="location-pin"><Icon name="pin" size={19} /></span><span><strong>{restaurant.name}</strong><small>{restaurant.address || 'Contact the restaurant for directions'}</small></span><Icon name="arrow" size={19} /></a>
          </section>
        </> : <section className="empty-restaurant"><span className="empty-icon"><Icon name="qr" size={32} /></span><p className="eyebrow">GUESTPASS</p><h1>Find your next table</h1><p>Scan a restaurant’s GuestPass QR code to join their waitlist and follow your place in line.</p><Button variant="primary" onClick={onPortal}>Restaurant portal</Button></section>}
      </main>
      <footer className="public-footer"><Brand compact /><span>Less waiting. More great food.</span><button onClick={onPortal}>Restaurant owner? Get started <Icon name="arrow" size={15} /></button></footer>
    </div>
  )
}

function Benefit({ icon, title, detail }) {
  return <div className="benefit"><span className="benefit-icon">{typeof icon === 'string' ? icon : icon}</span><strong>{title}</strong><small>{detail}</small></div>
}

function estimateRange(queueCount, serviceMinutes = 5) {
  const low = Math.max(0, Math.round(queueCount * (Number(serviceMinutes) || 5) * 0.75))
  const high = Math.max(low, Math.round(queueCount * (Number(serviceMinutes) || 5) * 1.5))
  return low === high ? `${low}` : `${low}–${high}`
}

function RestaurantSummary({ restaurant }) {
  return <div className="restaurant-summary"><RestaurantImage restaurant={restaurant} /><div className="restaurant-summary-text"><span className="eyebrow">YOU’RE JOINING</span><h2>{restaurant.name}</h2><p>{restaurant.description || 'Good food and great company.'}</p><small><Icon name="pin" size={14} />{restaurant.address || 'Address not provided'}</small></div></div>
}

function QueueJoinPage({ restaurant, onBack, onJoined }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [partySizeInput, setPartySizeInput] = useState('5')
  const [requestId] = useState(() => crypto.randomUUID())
  const [preference, setPreference] = useState('any')
  const [whatsapp, setWhatsapp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) { setError('Please enter your name to join the queue.'); return }
    if (name.trim().length > 100) { setError('Please keep your name under 100 characters.'); return }
    if (phone && !/^[+()\d\s-]{7,20}$/.test(phone)) { setError('Enter a valid phone number or leave it blank.'); return }
    if (whatsapp && !phone.trim()) { setError('Add a WhatsApp number to receive WhatsApp updates.'); return }
    setBusy(true)
    setError('')
    try {
      const booking = await joinQueue(restaurant.qr_id, { name, phone, partySize, preference, whatsapp, requestId })
      onJoined(booking)
    } catch (caught) {
      setError(caught.message || 'We could not join the queue. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="guest-flow"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> Back to restaurant</button><RestaurantSummary restaurant={restaurant} />
    <div className="form-panel">
      <div className="steps"><span className="step active"><i>1</i> Details</span><span className="step-line" /><span className="step"><i>2</i> Confirm</span><span className="step-line" /><span className="step"><i>3</i> Join queue</span></div>
      <div className="form-heading"><span className="section-icon"><Icon name="people" size={24} /></span><div><h1>Join the Queue</h1><p>Tell us a few details and we’ll add you to the queue. It only takes a moment.</p></div></div>
      <Notice>{error}</Notice>
      <form onSubmit={submit} className="join-form">
        <label className="form-field"><span>Your name <b>*</b></span><input autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Rahul, Sarah, etc." required /></label>
        <fieldset className="form-field party-field"><legend>Party size</legend><small>How many people are you with?</small><div className="party-options">{[1, 2, 3, 4, 5].map((size) => <button type="button" key={size} onClick={() => { setPartySize(size); if (size === 5) setPartySizeInput('5') }} className={partySize === size || (size === 5 && partySize > 5) ? 'selected' : ''}>{size === 5 ? '5+' : size}</button>)}</div>{partySize >= 5 && <label className="party-size-detail">Party size<input type="number" min="5" max="20" value={partySizeInput} onChange={(event) => { const value = event.target.value; setPartySizeInput(value); if (Number(value) >= 5) setPartySize(Math.min(20, Number(value))) }} onBlur={() => { const size = Math.min(20, Math.max(5, Number(partySizeInput) || 5)); setPartySize(size); setPartySizeInput(String(size)) }} aria-label="Party size, five to twenty people" /></label>}</fieldset>
        <fieldset className="form-field preference-field"><legend>Table preference</legend><small>Choose your preferred table. Subject to availability.</small><div className="preference-options">{[['any', 'people', 'Any table'], ['indoor', 'home', 'Indoor'], ['outdoor', 'leaf', 'Outdoor'], ['window', 'chart', 'Window seat']].map(([value, icon, label]) => <button type="button" key={value} onClick={() => setPreference(value)} className={preference === value ? 'selected' : ''}><Icon name={icon} size={20} /><span>{label}</span>{preference === value && <i><Icon name="check" size={12} /></i>}</button>)}</div></fieldset>
        <label className="form-field phone-field"><span>WhatsApp number <small>(Optional)</small></span><small>Get table-ready updates on WhatsApp</small><input autoComplete="tel" inputMode="tel" maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
        <label className="whatsapp-option"><input type="checkbox" checked={whatsapp} onChange={(event) => setWhatsapp(event.target.checked)} /><span>Send my queue updates via WhatsApp when available</span></label>
        <div className="privacy-note"><span className="privacy-lock">✓</span><span><strong>No account required</strong><small>Just a quick form. No app, no sign up.</small></span><Icon name="check" size={19} /></div>
        <Button type="submit" variant="primary" className="submit-join" disabled={busy}>{busy ? <><span className="spinner" /> Joining queue…</> : <><Icon name="arrow" size={21} /> Confirm &amp; Join Queue</>}</Button>
      </form>
      <div className="trust-row"><Benefit icon="ϟ" title="Fast & Easy" detail="In seconds" /><Benefit icon={<Icon name="check" size={21} />} title="Secure" detail="Your data is safe" /><Benefit icon={<Icon name="qr" size={21} />} title="No App Needed" detail="Just a QR scan" /></div>
    </div>
  </main>
}

function GuestBookingPage({ booking: initialBooking, onBack, onRefresh }) {
  const [booking, setBooking] = useState(initialBooking)
  const [error, setError] = useState('')
  const [cancelBusy, setCancelBusy] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())

  useEffect(() => {
    if (!booking?.guest_access_token) return undefined
    let active = true
    const refresh = async () => {
      try {
        const current = await getBookingByToken(booking.guest_access_token)
        if (current && active) { setBooking(current); onRefresh(current); setLastUpdated(new Date()); setError('') }
      } catch (caught) {
        if (active) setError(caught.message || 'Queue updates are temporarily unavailable.')
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [booking?.guest_access_token, onRefresh])

  useEffect(() => {
    if (!booking?.guest_access_token || !['seated', 'completed'].includes(booking.status)) return undefined
    let active = true
    getPublicReview(booking.guest_access_token)
      .then((review) => {
        if (active && review) {
          setRating(review.rating)
          setReviewSaved(true)
        }
      })
      .catch((caught) => {
        if (active) setError(caught.message || 'Your previous rating could not be loaded.')
      })
    return () => { active = false }
  }, [booking?.guest_access_token, booking?.status])

  if (!booking) return <main className="guest-flow"><EmptyState title="Booking not found" text="This queue link may have expired. Scan the restaurant QR code to join again." action="Back to restaurant" onAction={onBack} /></main>

  const statusCopy = {
    waiting: { title: 'You’re in the queue!', detail: 'Thanks for joining. Keep this page open to follow your place in line.', icon: 'check' },
    notified: { title: 'Your table is ready!', detail: 'Great news! Your table is ready. Please make your way to the restaurant and take your seat.', icon: 'table' },
    seated: { title: 'You’re Seated!', detail: 'Enjoy your meal! Thank you for choosing us. We hope you have a great dining experience.', icon: 'check' },
    completed: { title: 'Thanks for visiting!', detail: 'We hope you had a wonderful time.', icon: 'check' },
    cancelled: { title: 'Queue entry cancelled', detail: 'This queue entry is no longer active.', icon: 'close' },
  }[booking.status]
  const waiting = booking.status === 'waiting'
  const partiesAhead = waiting ? Math.max((booking.position || 1) - 1, 0) : 0
  const joinedAt = booking.joined_at ? new Date(booking.joined_at) : null
  const joinedTime = joinedAt && !Number.isNaN(joinedAt.getTime())
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(joinedAt)
    : '—'
  const readyAt = booking.called_at ? new Date(booking.called_at) : null
  const readyTime = readyAt && !Number.isNaN(readyAt.getTime())
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(readyAt)
    : '—'
  const seatedAt = booking.seated_at ? new Date(booking.seated_at) : null
  const seatedTime = seatedAt && !Number.isNaN(seatedAt.getTime())
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(seatedAt)
    : '—'
  const arrivalAgo = seatedAt && !Number.isNaN(seatedAt.getTime())
    ? Math.max(0, Math.floor((Date.now() - seatedAt.getTime()) / 60000))
    : null
  const arrivalAgoLabel = arrivalAgo === null ? '' : arrivalAgo < 1 ? 'just now' : `${arrivalAgo} min ago`
  const steps = [
    { status: 'waiting', label: 'Waiting', icon: 'people' },
    { status: 'notified', label: 'Table ready', icon: 'bell' },
    { status: 'seated', label: 'Seated', icon: 'table' },
    { status: 'completed', label: 'Complete', icon: 'check' },
  ]
  const activeStep = steps.findIndex((step) => step.status === booking.status)
  const restaurant = {
    name: booking.restaurant_name || 'Restaurant',
    address: booking.restaurant_address || '',
    description: booking.restaurant_description || 'Good food · Great company',
    logo_url: booking.restaurant_logo_url || '',
    cover_url: booking.restaurant_cover_url || '',
    whatsapp: booking.restaurant_whatsapp || '',
    menu_url: booking.restaurant_menu_url || '',
  }
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.name, restaurant.address].filter(Boolean).join(' '))}`
  const menuUrl = safeExternalUrl(restaurant.menu_url)
  const whatsappNumber = restaurant.whatsapp.replace(/\D/g, '')
  const whatsappUrl = whatsappNumber.length >= 7
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(booking.status === 'seated'
      ? `Hi ${restaurant.name}, I’m checked in at table ${booking.table_number || '—'}. My queue token is ${booking.booking_code}.`
      : `Hi ${restaurant.name}, I’m on my way. My queue token is ${booking.booking_code}.`)}`
    : ''

  async function cancel() {
    if (!window.confirm('Leave this restaurant queue?')) return
    setCancelBusy(true)
    setError('')
    try {
      const updated = await cancelBookingByToken(booking.guest_access_token)
      const cancelledBooking = { ...booking, ...updated }
      setBooking(cancelledBooking)
      onRefresh(cancelledBooking)
    } catch (caught) { setError(caught.message || 'We could not cancel this queue entry.') }
    finally { setCancelBusy(false) }
  }

  async function submitRating() {
    if (!rating) return
    setReviewBusy(true)
    setError('')
    try {
      await submitPublicReview(booking.guest_access_token, rating)
      setReviewSaved(true)
      setReviewOpen(false)
    } catch (caught) {
      setError(caught.message || 'Your rating could not be saved. Please try again.')
    } finally {
      setReviewBusy(false)
    }
  }

  return <main className="guest-flow status-flow">
    <header className="queue-page-header"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> Restaurant</button><Brand compact /><span className="queue-live-indicator"><i /> Queue status</span></header>
    <section className="queue-restaurant-card">
      <RestaurantImage restaurant={restaurant} className="queue-restaurant-cover" />
      <div className="queue-restaurant-info">
        <span className="queue-restaurant-logo">{restaurant.logo_url ? <img src={restaurant.logo_url} alt="" /> : <span className="brand-symbol"><Icon name="leaf" size={21} /></span>}</span>
        <div><h2>{restaurant.name}</h2><p>{restaurant.description}</p><small><Icon name="pin" size={14} />{restaurant.address || 'Restaurant address not provided'}</small></div>
      </div>
    </section>
    <Notice>{error}</Notice>
    <section className={`queue-status-card${booking.status === 'notified' ? ' queue-ready-card' : ''}${['seated', 'completed'].includes(booking.status) ? ' queue-seated-card' : ''}`}>
      <div className={`booking-status status-${booking.status}`}>
        <span className={`status-art status-${booking.status}`}><Icon name={statusCopy.icon} size={booking.status === 'notified' ? 42 : 34} /></span>
        <h1>{statusCopy.title}</h1><p>{booking.status === 'seated' ? `Enjoy your meal! Thank you for choosing ${restaurant.name}. We hope you have a great dining experience.` : statusCopy.detail}</p>
      </div>
      <div className={`booking-ticket${booking.status === 'notified' ? ' booking-ticket-ready' : ''}${['seated', 'completed'].includes(booking.status) ? ' booking-ticket-seated' : ''}`}>
        <div><small>QUEUE TOKEN</small><strong>{booking.booking_code}</strong></div>
        {booking.status === 'notified' ? <>
          <div><span className="detail-icon"><Icon name="people" size={20} /></span><small>PARTY SIZE</small><strong>{booking.party_size}</strong></div>
          <div><span className="detail-icon"><Icon name="table" size={20} /></span><small>TABLE NUMBER</small><strong>{booking.table_number || 'Ask host'}</strong></div>
          <div><span className="detail-icon"><Icon name="clock" size={20} /></span><small>TIME READY</small><strong>{readyTime}</strong></div>
        </> : ['seated', 'completed'].includes(booking.status) ? <>
          <div><span className="detail-icon"><Icon name="people" size={20} /></span><small>PARTY SIZE</small><strong>{booking.party_size}</strong></div>
          <div><span className="detail-icon"><Icon name="table" size={20} /></span><small>TABLE NUMBER</small><strong>{booking.table_number || 'Ask host'}</strong></div>
          <div><span className="detail-icon"><Icon name="clock" size={20} /></span><small>SEATED AT</small><strong>{seatedTime}</strong><span className="ticket-note">{booking.status === 'seated' ? arrivalAgoLabel : ''}</span></div>
        </> : <>
          <div><small>PARTIES AHEAD</small><strong>{waiting ? partiesAhead : '—'}</strong><span className="ticket-note">{waiting ? 'approx.' : 'queue position'}</span></div>
          <div><small>EST. WAIT TIME</small><strong>{waiting ? `${booking.estimated_wait_minutes || 0} min` : '—'}</strong><span className="ticket-note">{waiting ? 'approx.' : 'estimate'}</span></div>
        </>}
      </div>
      {booking.status !== 'notified' && booking.status !== 'seated' && booking.status !== 'completed' && <div className="booking-details">
        <div><span className="detail-icon"><Icon name="table" size={20} /></span><span><small>TABLE</small><strong>{booking.table_number || (waiting ? 'When ready' : '—')}</strong></span></div>
        <div><span className="detail-icon"><Icon name="people" size={20} /></span><span><small>PARTY SIZE</small><strong>{booking.party_size} {booking.party_size === 1 ? 'person' : 'people'}</strong></span></div>
        <div><span className="detail-icon"><Icon name="clock" size={20} /></span><span><small>JOINED AT</small><strong>{joinedTime}</strong></span></div>
      </div>}
      {booking.status === 'notified' ? <>
        {directionsUrl && <a className="queue-coming-button" href={directionsUrl} target="_blank" rel="noreferrer"><Icon name="send" size={20} /> I’m Coming</a>}
        {booking.restaurant_phone && <a className="queue-call-button queue-call-secondary" href={`tel:${booking.restaurant_phone}`}><Icon name="phone" size={18} /> Call restaurant</a>}
        <p className="arrival-note"><Icon name="clock" size={17} /> Please arrive within 10 minutes.</p>
      </> : <div className="queue-actions">
        {booking.restaurant_phone && <a className="queue-call-button" href={`tel:${booking.restaurant_phone}`}><Icon name="phone" size={18} /> Call restaurant</a>}
        {waiting && <Button className="cancel-booking" onClick={cancel} disabled={cancelBusy}>{cancelBusy ? 'Leaving queue…' : 'Leave queue'}</Button>}
      </div>}
    </section>
    {['seated', 'completed'].includes(booking.status) && <section className="queue-seated-location">
      <div className="seated-place-card"><span className="detail-icon"><Icon name="pin" size={21} /></span><span><small>RESTAURANT LOCATION</small><strong>{restaurant.address || 'Ask a team member for directions.'}</strong></span></div>
      <div className="seated-table-info"><span className="eyebrow">YOUR TABLE</span><strong>{booking.table_number || 'See host'}</strong>{restaurant.address && <a href={directionsUrl} target="_blank" rel="noreferrer"><Icon name="pin" size={16} /> View map</a>}</div>
    </section>}
    {['seated', 'completed'].includes(booking.status) && <section className="queue-thanks-card"><span><Icon name="check" size={22} /></span><div><strong>Thanks for visiting!</strong><small>We look forward to seeing you again soon.</small></div></section>}
    {['seated', 'completed'].includes(booking.status) && <section className="queue-review-card">
      <div className="review-visual"><Icon name="star" size={28} /></div>
      <div className="review-content"><strong>How was your experience?</strong><small>Your feedback helps us serve you better.</small>
        {reviewSaved ? <p className="review-thanks" role="status">Thank you for your {rating}-star rating!</p> : reviewOpen ? <div className="review-form">
          <div className="review-stars" role="group" aria-label="Rate your restaurant experience">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={rating === value} className={value <= rating ? 'selected' : ''} onClick={() => setRating(value)}><Icon name="star" size={21} /></button>)}</div>
          <Button variant="primary" disabled={!rating || reviewBusy} onClick={submitRating}>{reviewBusy ? 'Saving…' : 'Submit rating'}</Button>
        </div> : <div className="review-actions"><div className="review-stars" role="group" aria-label="Rate your restaurant experience">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`} onClick={() => { setRating(value); setReviewOpen(true) }}><Icon name="star" size={20} /></button>)}</div><Button onClick={() => setReviewOpen(true)}><Icon name="star" size={15} /> Rate restaurant</Button></div>}
      </div>
    </section>}
    {['seated', 'completed'].includes(booking.status) && <button type="button" className="queue-visit-again" onClick={onBack}><span className="detail-icon"><Icon name="leaf" size={20} /></span><span><strong>Visit again</strong><small>We’d love to welcome you back!</small></span><Icon name="arrow" size={18} /></button>}
    {['seated', 'completed'].includes(booking.status) && menuUrl && <a className="seated-menu-button" href={menuUrl} target="_blank" rel="noreferrer"><Icon name="utensils" size={18} /> View restaurant menu <Icon name="arrow" size={17} /></a>}
    {['seated', 'completed'].includes(booking.status) && <Button variant="primary" className="queue-home-button" onClick={onBack}><Icon name="home" size={19} /> Back to Home</Button>}
    {booking.status !== 'cancelled' && booking.status !== 'notified' && booking.status !== 'seated' ? <section className="queue-progress-card">
      <div className="queue-progress-heading"><div><h2>Live queue tracking</h2><p>We’ll update your status as your turn gets closer.</p></div><span><i /> Updated {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(lastUpdated)}</span></div>
      <div className="queue-progress-steps">{steps.map((step, index) => {
        const complete = activeStep >= 0 && index < activeStep
        const current = index === activeStep
        const detail = current ? (waiting ? (partiesAhead === 0 ? 'Next up' : `${partiesAhead} ahead`) : statusLabels[booking.status]) : complete ? 'Complete' : 'Not yet'
        return <div key={step.status} className={`queue-progress-step${complete ? ' complete' : ''}${current ? ' current' : ''}`} aria-current={current ? 'step' : undefined}>
          <span className="queue-step-icon"><Icon name={step.icon} size={21} /></span><strong>{step.label}</strong><small>{detail}</small>
        </div>
      })}</div>
      {waiting && <p className="queue-refresh-note"><span className="live-dot" /> This page refreshes automatically every 10 seconds.</p>}
    </section> : booking.status === 'cancelled' ? <section className="queue-progress-card queue-cancelled-card"><h2>Queue tracking ended</h2><p>This booking is cancelled. You can return to the restaurant page to join again.</p></section> : null}
    {['notified', 'seated'].includes(booking.status) && whatsappUrl && <section className="queue-help-card"><span className="queue-help-icon"><Icon name="phone" size={19} /></span><span><strong>{booking.status === 'seated' ? 'Need anything?' : 'Need help?'}</strong><small>Chat with the restaurant on WhatsApp.</small></span><a href={whatsappUrl} target="_blank" rel="noreferrer"><Icon name="send" size={16} /> Chat now</a></section>}
    {booking.status !== 'notified' && booking.status !== 'seated' && directionsUrl && <a className="queue-directions-card" href={directionsUrl} target="_blank" rel="noreferrer"><span className="detail-icon"><Icon name="pin" size={20} /></span><span><strong>Find the restaurant</strong><small>Open directions in Google Maps</small></span><Icon name="arrow" size={18} /></a>}
  </main>
}

function EmptyState({ title, text, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="people" size={28} /></span><h2>{title}</h2><p>{text}</p>{action && <Button onClick={onAction}>{action}</Button>}</div>
}

function AuthPage({ onAuthenticated, onBack, onDemo }) {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submitPassword(event) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signup') {
        const { user, session } = await signUpWithPassword(email, password, name)
        if (session) await onAuthenticated(user)
        else {
          setMode('signin')
          setNotice('Your account was created. Check your email to confirm your address, then sign in.')
        }
      } else {
        const user = await signInWithPassword(email, password)
        await onAuthenticated(user)
      }
    }
    catch (caught) { setError(caught.message || 'Unable to authenticate. Please try again.') }
    finally { setBusy(false) }
  }

  async function continueWithGoogle() {
    setBusy(true); setError('')
    try { await signInWithGoogle() }
    catch (caught) { setError(caught.message || 'Google sign-in could not be started.') }
    finally { setBusy(false) }
  }

  const isSignup = mode === 'signup'
  return <main className="auth-layout"><div className="auth-showcase"><Brand /><div className="auth-showcase-copy"><span className="eyebrow">RESTAURANT OPERATIONS, MADE SIMPLE</span><h1>Give every guest a better wait.</h1><p>Bring your waitlist, guest updates, and service insights together in one calm, easy-to-use workspace.</p><div className="auth-showcase-stats"><span><strong>Live</strong> queue visibility</span><span><strong>QR</strong> guest check-ins</span><span><strong>Simple</strong> service analytics</span></div></div><span className="showcase-orbit orbit-one" /><span className="showcase-orbit orbit-two" /></div>
    <section className="auth-card"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> Guest view</button><span className="eyebrow">{isDemoMode ? 'BROWSER DEMO' : 'RESTAURANT PORTAL'}</span><h2>{isSignup ? 'Create your account' : 'Welcome to GuestPass'}</h2><p>{isSignup ? 'Create an account to set up your restaurant workspace.' : 'Sign in to manage your restaurant and guest queue.'}</p><Notice type="success">{notice}</Notice><Notice>{error}</Notice>
      <form onSubmit={submitPassword} className="auth-form">
        {isSignup && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Restaurant owner" autoComplete="name" maxLength={120} required /></label>}
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@restaurant.com" autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 6 characters' : 'Your password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required /></label>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? <><span className="spinner" /> Please wait…</> : isSignup ? 'Create restaurant account' : 'Sign in'}</Button>
      </form>
      <div className="auth-divider"><span>or continue with</span></div><Button className="google-login" onClick={continueWithGoogle} disabled={busy}><GoogleMark /> Continue with Google</Button>
      <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to GuestPass?'} <button type="button" onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setNotice('') }}>{isSignup ? 'Sign in' : 'Create an account'}</button></p>
      {isDemoMode && <div className="demo-login"><div><strong>Try the dashboard</strong><p>Demo changes are saved only in this browser.</p></div><Button onClick={onDemo}>Explore demo workspace <Icon name="arrow" size={16} /></Button></div>}
      {!isDemoMode && <p className="auth-security"><Icon name="check" size={15} /> Your account is securely managed by Supabase.</p>}
    </section>
  </main>
}

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.73 6C44.43 38.05 46.98 31.95 46.98 24.55Z" /><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" /></svg>
}

function SetupRestaurantPage({ user, onCreated, onBack }) {
  const [fields, setFields] = useState({ name: '', address: '', description: '', phone: '', whatsapp: '' })
  const [logo, setLogo] = useState(null)
  const [cover, setCover] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      let logoUrl = ''
      let coverUrl = ''
      if (logo) logoUrl = await uploadRestaurantImage(logo, user.id, 'logo')
      if (cover) coverUrl = await uploadRestaurantImage(cover, user.id, 'cover')
      await saveProfile(user.id, { name: user.user_metadata?.name || fields.name, role: 'restaurant', phone: fields.phone })
      const restaurant = await createRestaurant(user.id, { ...fields, logo_url: logoUrl, cover_url: coverUrl })
      onCreated(restaurant)
    } catch (caught) { setError(caught.message || 'We could not save your restaurant profile.') }
    finally { setBusy(false) }
  }

  return <main className="setup-layout"><div className="setup-card"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> Back</button><span className="eyebrow">RESTAURANT SETUP</span><h1>Make it yours.</h1><p className="page-intro">Add the details guests will see when they scan your permanent GuestPass QR code.</p><Notice>{error}</Notice><form className="setup-form" onSubmit={submit}><label>Restaurant name *<input required maxLength={120} value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} placeholder="The Green Leaf Bistro" /></label><label>Address *<input required maxLength={240} value={fields.address} onChange={(event) => setFields({ ...fields, address: event.target.value })} placeholder="Street, city, postal code" /></label><div className="form-two-col"><label>Contact phone *<input required maxLength={30} type="tel" value={fields.phone} onChange={(event) => setFields({ ...fields, phone: event.target.value })} placeholder="+1 555 123 4567" /></label><label>WhatsApp number<input maxLength={30} type="tel" value={fields.whatsapp} onChange={(event) => setFields({ ...fields, whatsapp: event.target.value })} placeholder="Optional" /></label></div><label>About the restaurant<textarea maxLength={500} rows={3} value={fields.description} onChange={(event) => setFields({ ...fields, description: event.target.value })} placeholder="Tell guests what makes your restaurant special" /></label><div className="form-two-col"><label>Restaurant logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} /><small>PNG, JPG or WebP. Max 4 MB.</small></label><label>Cover image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCover(event.target.files?.[0] || null)} /><small>PNG, JPG or WebP. Max 4 MB.</small></label></div><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving profile…' : 'Create restaurant workspace'}</Button></form></div></main>
}

function AdminShell({ restaurant, page, onNavigate, onGuestView, onSignOut, children }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  return <div className="admin-app"><header className="admin-topbar"><button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation" aria-expanded={mobileMenu}><Icon name="menu" /></button><button className="brand-link" onClick={() => onNavigate('dashboard')}><Brand /></button><div className="topbar-spacer" /><span className="topbar-restaurant"><span className="status-dot" />{restaurant.name}</span><Button onClick={onGuestView}>Guest view</Button><button className="account-button" title="Sign out" onClick={onSignOut}><Icon name="logout" size={18} /></button></header>
    <div className="admin-body"><aside className={`admin-sidebar ${mobileMenu ? 'menu-open' : ''}`}><div className="sidebar-heading"><span>WORKSPACE</span><small>{restaurant.name}</small></div><nav>{adminNavigation.map((item) => <button key={item.id} className={`sidebar-link ${page === item.id ? 'selected' : ''}`} onClick={() => { onNavigate(item.id); setMobileMenu(false) }}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.id === 'queue' && <span className="sidebar-live"><i />LIVE</span>}</button>)}</nav><div className="sidebar-footer"><span className={`open-pill ${restaurant.is_open ? 'is-open' : 'is-closed'}`}><i />{restaurant.is_open ? 'Accepting guests' : 'Queue paused'}</span><small>GuestPass restaurant workspace</small></div></aside><main className="admin-main"><div className="demo-banner"><span><strong>{isDemoMode ? 'Demo workspace' : 'Live Supabase workspace'}</strong>{isDemoMode ? 'Your changes stay in this browser. Configure Supabase for multi-user hosting.' : 'Queue changes sync live with connected guest pages.'}</span>{isDemoMode && <button onClick={() => onNavigate('settings')}>Open restaurant settings</button>}</div>{children}</main></div><nav className="mobile-bottom-nav" aria-label="Workspace navigation">{[['dashboard', 'home', 'Home'], ['queue', 'people', 'Queue'], ['qr', 'qr', 'QR']].map(([id, icon, label]) => <button key={id} className={page === id ? 'selected' : ''} onClick={() => { onNavigate(id); setMobileMenu(false) }} aria-current={page === id ? 'page' : undefined}><Icon name={icon} size={19} /><span>{label}</span></button>)}<button className={mobileMenu ? 'selected' : ''} onClick={() => setMobileMenu(!mobileMenu)} aria-expanded={mobileMenu}><Icon name="menu" size={19} /><span>More</span></button></nav></div>
}

function PageTitle({ eyebrow, title, description, actions }) {
  return <div className="page-title-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-title-actions">{actions}</div>}</div>
}

function StatCard({ label, value, note, icon, tone = 'green' }) {
  return <article className="stat-card"><span className={`dashboard-stat-icon tone-${tone}`}><Icon name={icon} size={21} /></span><span className="stat-card-label">{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function AdminDashboard({ restaurant, bookings, onNavigate }) {
  const today = bookings.filter((booking) => sameDay(booking.joined_at))
  const active = bookings.filter((booking) => ['waiting', 'notified'].includes(booking.status))
  const seated = today.filter((booking) => ['seated', 'completed'].includes(booking.status)).length
  const completedWaits = today.map((booking) => {
    const calledAt = booking.called_at || booking.seated_at || booking.completed_at
    return calledAt ? Math.max(0, new Date(calledAt) - new Date(booking.joined_at)) / 60000 : null
  }).filter((minutes) => minutes !== null)
  const avgWait = completedWaits.length ? Math.round(completedWaits.reduce((sum, minutes) => sum + minutes, 0) / completedWaits.length) : 0
  return <><PageTitle eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()} title="Welcome back" description={`Here’s what’s happening at ${restaurant.name} today.`} actions={<Button variant="primary" onClick={() => onNavigate('queue')}><Icon name="people" size={17} /> Open live queue</Button>} />
    <Notice type="success">{restaurant.is_open ? 'Your restaurant is open and accepting queue entries.' : 'Your queue is paused. Guests can still view your restaurant but cannot join.'}</Notice>
    <section className="stats-grid"><StatCard label="Guests in queue" value={active.length} note={`Capacity ${restaurant.queue_capacity} groups`} icon="people" /><StatCard label="Bookings today" value={today.length} note="Since opening today" icon="qr" tone="blue" /><StatCard label="Guests seated" value={seated} note="Seated or completed" icon="check" tone="purple" /><StatCard label="Average wait" value={`${avgWait} min`} note="Time from joining to call" icon="clock" tone="amber" /></section>
    <div className="dashboard-columns"><section className="panel recent-panel"><div className="panel-heading"><div><h2>Live queue</h2><p>Latest guest check-ins</p></div><button className="text-link" onClick={() => onNavigate('queue')}>Manage queue <Icon name="arrow" size={15} /></button></div>{active.length ? <BookingList bookings={active.slice(0, 5)} compact /> : <EmptyState title="The queue is clear" text="New guest bookings will appear here as soon as they scan your QR code." action="Open live queue" onAction={() => onNavigate('queue')} />}</section>
      <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick setup</h2><p>Make GuestPass work for your team</p></div></div><QuickLink icon="qr" title="Print your QR code" detail="Let guests join from their own phones" onClick={() => onNavigate('qr')} /><QuickLink icon="settings" title="Update restaurant settings" detail="Hours, wait estimates and capacity" onClick={() => onNavigate('settings')} /><QuickLink icon="chart" title="Review today’s activity" detail="Bookings and service insights" onClick={() => onNavigate('analytics')} /></section></div>
  </>
}

function sameDay(timestamp) { return new Date(timestamp).toDateString() === new Date().toDateString() }

function QuickLink({ icon, title, detail, onClick }) {
  return <button className="quick-link" onClick={onClick}><span><Icon name={icon} size={18} /></span><span><strong>{title}</strong><small>{detail}</small></span><Icon name="arrow" size={17} /></button>
}

function BookingList({ bookings, onAction, busyId, compact = false }) {
  return <div className={`booking-list ${compact ? 'booking-list-compact' : ''}`}>{bookings.map((booking) => <BookingRow key={booking.id} booking={booking} onAction={onAction} busy={busyId === booking.id} compact={compact} />)}</div>
}

function BookingRow({ booking, onAction, busy, compact }) {
  const time = new Date(booking.joined_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return <article className="booking-row"><div className="booking-time">{time}</div><span className="guest-avatar">{initials(booking.guest_name)}</span><div className="booking-guest"><strong>{booking.guest_name}</strong><small>{booking.booking_code} · Party of {booking.party_size}{booking.table_preference !== 'any' ? ` · ${booking.table_preference}` : ''}</small></div><span className={`booking-status status-chip status-chip-${booking.status}`}>{statusLabels[booking.status]}</span><div className="booking-wait">{booking.status === 'waiting' ? `~${booking.estimated_wait_minutes || 0} min` : booking.table_number || '—'}</div>{!compact && <div className="booking-actions">{booking.status === 'waiting' && <Button variant="primary" className="small-button" disabled={busy} onClick={() => onAction(booking, 'notified')}><Icon name="bell" size={15} /> Call</Button>}{booking.status === 'notified' && <Button variant="primary" className="small-button" disabled={busy} onClick={() => onAction(booking, 'seated')}><Icon name="check" size={15} /> Seat</Button>}{booking.status === 'seated' && <Button className="small-button" disabled={busy} onClick={() => onAction(booking, 'completed')}><Icon name="check" size={15} /> Complete</Button>}{['waiting', 'notified'].includes(booking.status) && <Button className="small-button danger-button" disabled={busy} onClick={() => onAction(booking, 'cancelled')}><Icon name="close" size={15} /> Cancel</Button>}{['cancelled', 'completed'].includes(booking.status) && <Button className="small-button danger-button" disabled={busy} onClick={() => onAction(booking, 'remove')}><Icon name="close" size={15} /> Remove</Button>}</div>}</article>
}

function initials(name) { return (name || 'Guest').split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') }

function QueueManagement({ restaurant, bookings, onAction, busyId, onCallNext }) {
  const [filter, setFilter] = useState('active')
  const [query, setQuery] = useState('')
  const active = bookings.filter((booking) => ['waiting', 'notified'].includes(booking.status))
  const filtered = bookings.filter((booking) => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? ['waiting', 'notified'].includes(booking.status) : booking.status === filter)
    const search = query.toLowerCase()
    return matchesFilter && (!search || `${booking.guest_name} ${booking.booking_code} ${booking.phone || ''}`.toLowerCase().includes(search))
  })
  return <><PageTitle eyebrow="SERVICE FLOOR" title="Live queue" description={`${active.length} ${active.length === 1 ? 'group' : 'groups'} waiting · ${restaurant.is_open ? 'Queue is open' : 'Queue is paused'}`} actions={<Button variant="primary" disabled={!active.some((item) => item.status === 'waiting')} onClick={onCallNext}><Icon name="bell" size={17} /> Call next guest</Button>} />
    <section className="queue-toolbar"><div className="filter-tabs">{[['active', 'Active'], ['waiting', 'Waiting'], ['notified', 'Called'], ['all', 'All entries']].map(([value, label]) => <button key={value} className={filter === value ? 'current' : ''} onClick={() => setFilter(value)}>{label}{value === 'active' && <span>{active.length}</span>}</button>)}</div><label className="search-input"><Icon name="filter" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests" /></label></section>
    <section className="panel queue-table-panel"><div className="queue-table-heading"><span>GUEST</span><span>STATUS</span><span>WAIT / TABLE</span><span>ACTIONS</span></div>{filtered.length ? <BookingList bookings={filtered} onAction={onAction} busyId={busyId} /> : <EmptyState title={query ? 'No guests match your search' : 'No guests in this view'} text={query ? 'Try a different name or queue token.' : 'Guests joining through your QR code will appear here.'} action={query ? 'Clear search' : undefined} onAction={() => setQuery('')} />}</section>
  </>
}

function QrManager({ restaurant, onError }) {
  const [notice, setNotice] = useState('')
  const link = `${window.location.origin}/?restaurant=${restaurant.qr_id}`
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setNotice('Your permanent restaurant link was copied.') }
    catch { onError('Clipboard access is unavailable. Select and copy the link below.') }
  }
  async function shareLink() {
    try {
      if (navigator.share) await navigator.share({ title: `${restaurant.name} on GuestPass`, text: 'Join our restaurant queue with GuestPass.', url: link })
      else await copyLink()
    } catch (caught) {
      if (caught.name !== 'AbortError') onError(caught.message || 'Could not share this link.')
    }
  }
  function downloadQr() {
    const svg = document.querySelector('#restaurant-qr svg')
    if (!svg) { onError('The QR code is not ready to download.'); return }
    const source = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${restaurant.slug || 'guestpass-qr'}.svg`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('QR code downloaded as an SVG image.')
  }
  return <><PageTitle eyebrow="GUEST CHECK-IN" title="Your restaurant QR code" description="One permanent QR code for every guest check-in. Download it, print it, or share your link." actions={<Button onClick={() => window.print()}><Icon name="download" size={17} /> Print QR</Button>} />
    <Notice type="success">{notice}</Notice><div className="qr-layout"><section className="panel qr-preview-panel"><div className="qr-preview-brand"><Brand compact /><span className="open-pill is-open"><i /> JOIN THE QUEUE</span></div><div id="restaurant-qr" className="qr-code-frame"><QRCodeSVG value={link} size={220} level="H" includeMargin bgColor="#ffffff" fgColor="#075c48" title={`Permanent GuestPass QR code for ${restaurant.name}`} /></div><h2>{restaurant.name}</h2><p>Scan to view the restaurant and join the queue.</p></section><section className="qr-details"><div className="panel"><h2>Permanent check-in link</h2><p>Share this URL in your bio, on social media, or in guest messages.</p><div className="copy-field"><input readOnly value={link} onFocus={(event) => event.target.select()} aria-label="Permanent restaurant check-in link" /><Button onClick={copyLink}><Icon name="copy" size={16} /> Copy</Button></div><div className="qr-actions"><Button variant="primary" onClick={downloadQr}><Icon name="download" size={17} /> Download QR</Button><Button onClick={shareLink}><Icon name="share" size={17} /> Share link</Button><Button onClick={() => window.print()}>Print</Button></div></div><div className="qr-tip"><span><Icon name="check" size={18} /></span><div><strong>Use your QR anywhere</strong><p>The code is permanent. Guests can scan it from a table tent, entrance sign, menu, or your website.</p></div></div></section></div>
  </>
}

function HistoryPage({ bookings, activity, onAction, busyId }) {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const filtered = bookings.filter((booking) => {
    const matchesStatus = status === 'all' || booking.status === status
    const matchesPeriod = period === 'all' || sameDay(booking.joined_at)
    const matchesSearch = !search || `${booking.guest_name} ${booking.booking_code}`.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesPeriod && matchesSearch
  })
  return <><PageTitle eyebrow="GUEST RECORDS" title="Booking history" description="Review guest check-ins and completed service." actions={<Button onClick={() => downloadCsv(filtered)}><Icon name="download" size={17} /> Export CSV</Button>} /><div className="history-toolbar"><label className="search-input"><Icon name="filter" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or token" /></label><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter bookings by date"><option value="all">All dates</option><option value="today">Today</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter bookings by status"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><section className="panel history-panel"><div className="queue-table-heading"><span>GUEST</span><span>STATUS</span><span>WAIT / TABLE</span><span>ACTIONS</span></div>{filtered.length ? <BookingList bookings={filtered} onAction={onAction} busyId={busyId} /> : <EmptyState title="No matching bookings" text="Try adjusting your filters. New guest bookings will appear here." />}</section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Queue activity</h2><p>Recent guest arrivals and service updates</p></div></div>{activity.length ? <ol className="activity-list">{activity.map((entry) => <li key={entry.id}><span className={`activity-marker activity-${entry.event_type}`}><Icon name={entry.event_type === 'joined' ? 'plus' : entry.event_type === 'called' ? 'bell' : entry.event_type === 'removed' || entry.event_type === 'cancelled' ? 'close' : 'check'} size={16} /></span><span className="activity-copy"><strong>{entry.message}</strong><small>{new Date(entry.created_at).toLocaleString()}</small></span></li>)}</ol> : <EmptyState title="No queue activity yet" text="Guest check-ins and service changes will appear here." />}</section></>
}

function downloadCsv(bookings) {
  const columns = ['booking_code', 'guest_name', 'phone', 'party_size', 'table_preference', 'status', 'joined_at']
  const csv = [columns.join(','), ...bookings.map((booking) => columns.map((column) => `"${String(booking[column] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `guestpass-bookings-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function AnalyticsPage({ bookings, restaurant }) {
  const today = bookings.filter((booking) => sameDay(booking.joined_at))
  const completed = bookings.filter((booking) => booking.status === 'completed')
  const seated = today.filter((booking) => ['seated', 'completed'].includes(booking.status)).length
  const cancelled = today.filter((booking) => booking.status === 'cancelled').length
  const averageParty = today.length ? (today.reduce((total, booking) => total + booking.party_size, 0) / today.length).toFixed(1) : '0'
  const hours = Array.from({ length: 8 }, (_, index) => {
    const hour = index + 11
    const count = today.filter((booking) => new Date(booking.joined_at).getHours() === hour).length
    return { hour, count }
  })
  const peak = Math.max(...hours.map((item) => item.count), 1)
  return <><PageTitle eyebrow="SERVICE INSIGHTS" title="Reports & analytics" description="A clear picture of guest flow and service performance." actions={<Button onClick={() => downloadCsv(bookings)}><Icon name="download" size={17} /> Export report</Button>} /><section className="stats-grid analytics-stats"><StatCard label="Bookings today" value={today.length} note="Guest parties joined" icon="people" /><StatCard label="Guests seated" value={seated} note="Seated or completed today" icon="check" tone="blue" /><StatCard label="Average party" value={averageParty} note="Guests per booking" icon="chart" tone="purple" /><StatCard label="Cancelled today" value={cancelled} note={`${completed.length} all-time completed`} icon="close" tone="amber" /></section><section className="panel chart-panel"><div className="panel-heading"><div><h2>Today’s guest check-ins</h2><p>Hourly bookings · {restaurant.name}</p></div><span className="chart-total">{today.length} bookings</span></div><div className="bar-chart" role="img" aria-label="Bar chart of today's hourly check-ins">{hours.map(({ hour, count }) => <div className="chart-column" key={hour}><span className="chart-count">{count || ''}</span><span className={`chart-bar ${count ? 'has-value' : ''}`} style={{ height: `${Math.max(5, count / peak * 135)}px` }} /><small>{hour > 12 ? `${hour - 12}p` : `${hour}a`}</small></div>)}</div></section><p className="report-footnote">Reports are calculated from queue entries stored in this workspace. Export a CSV to analyze bookings in your spreadsheet.</p></>
}

function SettingsPage({ restaurant, onSave, userId }) {
  const [fields, setFields] = useState(() => ({ name: restaurant.name || '', description: restaurant.description || '', address: restaurant.address || '', phone: restaurant.phone || '', whatsapp: restaurant.whatsapp || '', menu_url: restaurant.menu_url || '', queue_capacity: restaurant.queue_capacity || 40, avg_service_minutes: restaurant.avg_service_minutes || 5, is_open: restaurant.is_open ?? true, opening_hours: restaurant.opening_hours || defaultHours, logo_url: restaurant.logo_url || '', cover_url: restaurant.cover_url || '' }))
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function chooseImage(event, kind) {
    const file = event.target.files?.[0]
    if (!file) return
    setImageBusy(kind); setError('')
    try {
      const url = await uploadRestaurantImage(file, userId, kind)
      setFields((current) => ({ ...current, [`${kind}_url`]: url }))
    } catch (caught) { setError(caught.message || 'The image could not be uploaded.') }
    finally { setImageBusy(''); event.target.value = '' }
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    try {
      const updated = await onSave({ ...fields, queue_capacity: Number(fields.queue_capacity), avg_service_minutes: Number(fields.avg_service_minutes) })
      setFields((current) => ({ ...current, ...updated }))
      setSaved(true)
    } catch (caught) { setError(caught.message || 'Settings could not be saved.') }
    finally { setBusy(false) }
  }

  return <><PageTitle eyebrow="WORKSPACE PREFERENCES" title="Restaurant settings" description="Manage your public profile, hours, and waitlist capacity." /><Notice>{error}</Notice>{saved && <Notice type="success">Restaurant settings saved successfully.</Notice>}<form className="settings-form" onSubmit={submit}>    <section className="panel settings-section"><div className="panel-heading"><div><h2>Restaurant profile</h2><p>Details guests see when they scan your QR code.</p></div></div><label>Restaurant name<input required maxLength={120} value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} /></label><label>About your restaurant<textarea rows={3} maxLength={500} value={fields.description} onChange={(event) => setFields({ ...fields, description: event.target.value })} /></label><label>Address<input required maxLength={240} value={fields.address} onChange={(event) => setFields({ ...fields, address: event.target.value })} /></label><div className="form-two-col"><label>Phone<input required maxLength={30} type="tel" value={fields.phone} onChange={(event) => setFields({ ...fields, phone: event.target.value })} /></label><label>WhatsApp<input maxLength={30} type="tel" value={fields.whatsapp} onChange={(event) => setFields({ ...fields, whatsapp: event.target.value })} /></label></div><label>Restaurant menu URL<input type="url" maxLength={2048} placeholder="https://example.com/menu" value={fields.menu_url} onChange={(event) => setFields({ ...fields, menu_url: event.target.value })} /><small>Add a public menu link to show guests after they are seated.</small></label><div className="form-two-col image-upload-fields"><label>Logo image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseImage(event, 'logo')} />{imageBusy === 'logo' && <small>Uploading…</small>}{fields.logo_url && <img className="logo-preview" src={fields.logo_url} alt="Restaurant logo preview" />}</label><label>Cover image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseImage(event, 'cover')} />{imageBusy === 'cover' && <small>Uploading…</small>}{fields.cover_url && <span className="cover-preview" style={{ backgroundImage: `url("${fields.cover_url}")` }} />}</label></div></section>
    <section className="panel settings-section"><div className="panel-heading"><div><h2>Queue settings</h2><p>Set capacity and the approximate service pace.</p></div></div><label className="setting-toggle"><span><strong>Accept new queue entries</strong><small>Pause the public waitlist without affecting guests already waiting.</small></span><input type="checkbox" checked={fields.is_open} onChange={(event) => setFields({ ...fields, is_open: event.target.checked })} /></label><div className="form-two-col"><label>Maximum active groups<input type="number" min="1" max="500" value={fields.queue_capacity} onChange={(event) => setFields({ ...fields, queue_capacity: event.target.value })} required /></label><label>Average service time per group (minutes)<input type="number" min="1" max="240" value={fields.avg_service_minutes} onChange={(event) => setFields({ ...fields, avg_service_minutes: event.target.value })} required /></label></div></section>
    <section className="panel settings-section"><div className="panel-heading"><div><h2>Opening hours</h2><p>Keep your hours up to date for guests.</p></div></div><div className="hours-table">{Object.entries(fields.opening_hours).map(([day, hours]) => <div className="hours-row" key={day}><strong>{day[0].toUpperCase() + day.slice(1)}</strong><label className="hours-closed"><input type="checkbox" checked={hours.closed} onChange={(event) => setFields({ ...fields, opening_hours: { ...fields.opening_hours, [day]: { ...hours, closed: event.target.checked } } })} /> Closed</label><input aria-label={`${day} opening time`} type="time" disabled={hours.closed} value={hours.open} onChange={(event) => setFields({ ...fields, opening_hours: { ...fields.opening_hours, [day]: { ...hours, open: event.target.value } } })} /><span>to</span><input aria-label={`${day} closing time`} type="time" disabled={hours.closed} value={hours.close} onChange={(event) => setFields({ ...fields, opening_hours: { ...fields.opening_hours, [day]: { ...hours, close: event.target.value } } })} /></div>)}</div></section><div className="settings-save"><Button type="submit" variant="primary" disabled={busy || Boolean(imageBusy)}>{busy ? 'Saving settings…' : 'Save restaurant settings'}</Button></div></form></>
}

function App() {
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const [route, setRoute] = useState(query.has('booking') ? 'guest-status' : query.has('restaurant') ? 'guest-home' : 'guest-home')
  const [restaurant, setRestaurant] = useState(null)
  const [guestRestaurant, setGuestRestaurant] = useState(null)
  const [booking, setBooking] = useState(null)
  const [bookings, setBookings] = useState([])
  const [activity, setActivity] = useState([])
  const [queueSummary, setQueueSummary] = useState({ queue_count: 0, avg_service_minutes: 5 })
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [busyBooking, setBusyBooking] = useState('')

  const loadBookings = useCallback(async (restaurantId) => {
    const [records, events] = await Promise.all([listBookings(restaurantId), listQueueActivity(restaurantId)])
    setBookings(records)
    setActivity(events)
    return records
  }, [])

  const navigate = useCallback((nextRoute) => {
    setPageError('')
    setRoute(nextRoute)
    if (nextRoute === 'guest-home') {
      const url = new URL(window.location.href)
      url.searchParams.delete('booking')
      window.history.replaceState({}, '', url)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const bookingToken = query.get('booking')
        const restaurantQr = query.get('restaurant') || getDemoQrId()
        const [foundRestaurant, session] = await Promise.all([
          getRestaurantByQr(restaurantQr),
          getSession(),
        ])
        if (!active) return
        setGuestRestaurant(foundRestaurant)
        if (foundRestaurant) setQueueSummary(await getPublicQueueSummary(foundRestaurant.qr_id))
        if (bookingToken) {
          const foundBooking = await getBookingByToken(bookingToken)
          if (active) { setBooking(foundBooking); setRoute('guest-status') }
        }
        if (session?.user) {
          setUser(session.user)
          const owned = await getOwnedRestaurant(session.user.id)
          if (active && owned) { setRestaurant(owned); await loadBookings(owned.id) }
          else if (active) setRoute('setup')
        } else if (isDemoMode) {
          const profile = getDemoProfile()
          if (profile) {
            setUser(profile)
            const owned = await getOwnedRestaurant(profile.id)
            if (active && owned) { setRestaurant(owned); await loadBookings(owned.id) }
            else if (active) setRoute('setup')
          }
        }
      } catch (caught) {
        if (active) setPageError(caught.message || 'GuestPass could not load this page.')
      } finally { if (active) setLoading(false) }
    }
    initialize()
    return () => { active = false }
  }, [query, loadBookings])

  useEffect(() => subscribeToAuth((session) => {
    setUser(session?.user || null)
    if (!session?.user) { setRestaurant(null); setBookings([]); setActivity([]) }
  }), [])

  useEffect(() => {
    if (!restaurant?.id) return undefined
    const refresh = () => loadBookings(restaurant.id).catch((caught) => setPageError(caught.message || 'Could not refresh the live queue.'))
    const unsubscribe = subscribeToBookings(restaurant.id, refresh)
    const timer = isDemoMode ? window.setInterval(refresh, 15000) : null
    return () => { unsubscribe(); if (timer) window.clearInterval(timer) }
  }, [restaurant?.id, loadBookings])

  useEffect(() => {
    if (!guestRestaurant?.qr_id) return undefined
    let active = true
    const refresh = async () => {
      try {
        const summary = await getPublicQueueSummary(guestRestaurant.qr_id)
        if (active) setQueueSummary(summary)
      } catch (caught) { if (active) setPageError(caught.message || 'Queue availability could not be refreshed.') }
    }
    refresh()
    const timer = window.setInterval(refresh, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [guestRestaurant?.qr_id])

  const queueCount = Number(queueSummary.queue_count) || 0

  async function authenticated(userData) {
    setUser(userData)
    const profileName = userData.user_metadata?.name || userData.user_metadata?.full_name || ''
    await saveProfile(userData.id, { name: profileName, role: 'restaurant' })
    const owned = await getOwnedRestaurant(userData.id)
    if (owned) { setRestaurant(owned); await loadBookings(owned.id); navigate('dashboard') }
    else navigate('setup')
  }

  async function exploreDemo() {
    const profile = createLocalDemoSession('demo@guestpass.app', 'Demo Restaurant Owner')
    const demoRestaurant = claimDemoRestaurant(profile.id)
    setUser(profile); setRestaurant(demoRestaurant)
    await loadBookings(demoRestaurant.id)
    navigate('dashboard')
  }

  async function handleSignOut() {
    try { await signOut(); setUser(null); setRestaurant(null); setBookings([]); setActivity([]); navigate('guest-home') }
    catch (caught) { setPageError(caught.message || 'Could not sign out.') }
  }

  async function handleJoin(bookingDetails) {
    setBooking(bookingDetails)
    setQueueSummary((current) => ({ ...current, queue_count: current.queue_count + 1 }))
    const url = new URL(window.location.href)
    url.searchParams.set('booking', bookingDetails.guest_access_token)
    window.history.replaceState({}, '', url)
    navigate('guest-status')
  }

  async function actOnBooking(item, status) {
    if (status === 'remove' && !window.confirm(`Permanently remove ${item.guest_name}'s entry from history?`)) return
    if (status === 'cancelled' && !window.confirm(`Cancel ${item.guest_name}'s queue entry?`)) return
    setBusyBooking(item.id); setPageError('')
    try {
      if (status === 'remove') await removeBooking(item.id)
      else await updateBookingStatus(item.id, status)
      await loadBookings(restaurant.id)
    } catch (caught) { setPageError(caught.message || 'Could not update this booking.') }
    finally { setBusyBooking('') }
  }

  async function callNext() {
    const next = bookings.find((item) => item.status === 'waiting')
    if (!next) { setPageError('There are no waiting guests to call.'); return }
    await actOnBooking(next, 'notified')
  }

  async function saveRestaurantSettings(updates) {
    const updated = await updateRestaurant(restaurant.id, updates)
    setRestaurant(updated)
    const publicUpdated = await getRestaurantByQr(updated.qr_id)
    setGuestRestaurant(publicUpdated)
    return updated
  }

  async function createWorkspace(restaurantData) {
    setRestaurant(restaurantData)
    setGuestRestaurant(await getRestaurantByQr(restaurantData.qr_id))
    setBookings([]); setActivity([])
    navigate('dashboard')
  }

  if (loading) return <div className="app-loading"><span className="spinner" /><span>Loading GuestPass…</span></div>

  if (route === 'guest-home') return <GuestLanding restaurant={guestRestaurant} queueCount={queueCount} onJoin={() => guestRestaurant ? navigate('join') : navigate('portal')} onPortal={() => navigate(user && restaurant ? 'dashboard' : 'portal')} error={pageError} />
  if (route === 'join' && guestRestaurant) return <QueueJoinPage restaurant={guestRestaurant} onBack={() => navigate('guest-home')} onJoined={handleJoin} />
  if (route === 'guest-status') return <GuestBookingPage booking={booking} onBack={() => navigate('guest-home')} onRefresh={setBooking} />
  if (route === 'portal') return <AuthPage onAuthenticated={authenticated} onBack={() => navigate('guest-home')} onDemo={exploreDemo} />
  if (route === 'setup' && user) return <SetupRestaurantPage user={user} onCreated={createWorkspace} onBack={() => navigate('portal')} />

  if (adminNavigation.some((item) => item.id === route)) {
    if (!user || !restaurant) return <AuthPage onAuthenticated={authenticated} onBack={() => navigate('guest-home')} onDemo={exploreDemo} />
    return <AdminShell restaurant={restaurant} page={route} onNavigate={navigate} onGuestView={() => navigate('guest-home')} onSignOut={handleSignOut}>
      <Notice>{pageError}</Notice>
      {route === 'dashboard' && <AdminDashboard restaurant={restaurant} bookings={bookings} onNavigate={navigate} />}
      {route === 'queue' && <QueueManagement restaurant={restaurant} bookings={bookings} onAction={actOnBooking} busyId={busyBooking} onCallNext={callNext} />}
      {route === 'qr' && <QrManager restaurant={restaurant} onError={setPageError} />}
      {route === 'history' && <HistoryPage bookings={bookings} activity={activity} onAction={actOnBooking} busyId={busyBooking} />}
      {route === 'analytics' && <AnalyticsPage bookings={bookings} restaurant={restaurant} />}
      {route === 'settings' && <SettingsPage restaurant={restaurant} onSave={saveRestaurantSettings} userId={user.id} />}
    </AdminShell>
  }
  return <GuestLanding restaurant={guestRestaurant} queueCount={queueCount} onJoin={() => navigate('join')} onPortal={() => navigate('portal')} error={pageError} />
}

export default App
