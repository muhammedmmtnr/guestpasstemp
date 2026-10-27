import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
export const isDemoMode = !supabase

const DEMO_RESTAURANT_ID = '00000000-0000-4000-8000-000000000001'
const DEMO_QR_ID = '00000000-0000-4000-8000-000000000002'
const RESTAURANTS_KEY = 'guestpass.restaurants.v1'
const BOOKINGS_KEY = 'guestpass.bookings.v1'
const ACTIVITY_KEY = 'guestpass.activity.v1'
const REVIEWS_KEY = 'guestpass.reviews.v1'
const PROFILE_KEY = 'guestpass.profile.v1'

export const defaultHours = {
  monday: { open: '11:00', close: '22:00', closed: false },
  tuesday: { open: '11:00', close: '22:00', closed: false },
  wednesday: { open: '11:00', close: '22:00', closed: false },
  thursday: { open: '11:00', close: '22:00', closed: false },
  friday: { open: '11:00', close: '23:00', closed: false },
  saturday: { open: '10:00', close: '23:00', closed: false },
  sunday: { open: '10:00', close: '21:00', closed: false },
}

const demoRestaurant = {
  id: DEMO_RESTAURANT_ID,
  owner_id: null,
  name: 'The Green Leaf Bistro',
  slug: 'green-leaf-bistro',
  qr_id: DEMO_QR_ID,
  description: 'Good Food · Great Company · Always',
  address: 'MG Road, Kochi, Kerala 682016',
  phone: '+914842345678',
  whatsapp: '+914842345678',
  logo_url: '',
  cover_url: '',
  menu_url: '',
  is_open: true,
  queue_capacity: 40,
  avg_service_minutes: 5,
  opening_hours: defaultHours,
  created_at: new Date().toISOString(),
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    throw new Error('GuestPass could not read saved data in this browser.')
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error('GuestPass could not save data. Check available browser storage.')
  }
}

function getDemoRestaurants() {
  const restaurants = readStorage(RESTAURANTS_KEY, [])
  if (restaurants.length) return restaurants
  writeStorage(RESTAURANTS_KEY, [demoRestaurant])
  return [demoRestaurant]
}

function getDemoBookings() {
  return readStorage(BOOKINGS_KEY, [])
}

function addDemoActivity(booking, eventType, fromStatus, toStatus, message) {
  const activities = readStorage(ACTIVITY_KEY, [])
  activities.push({
    id: crypto.randomUUID(),
    restaurant_id: booking.restaurant_id,
    booking_id: booking.id,
    event_type: eventType,
    from_status: fromStatus,
    to_status: toStatus,
    message,
    created_at: new Date().toISOString(),
  })
  writeStorage(ACTIVITY_KEY, activities)
}

export function getDemoProfile() {
  return readStorage(PROFILE_KEY, null)
}

export function saveDemoProfile(profile) {
  writeStorage(PROFILE_KEY, profile)
}

export function claimDemoRestaurant(userId) {
  const restaurants = getDemoRestaurants()
  const restaurant = restaurants.find((item) => item.id === DEMO_RESTAURANT_ID)
  if (!restaurant) throw new Error('Demo restaurant is not available.')
  const updated = { ...restaurant, owner_id: userId }
  writeStorage(RESTAURANTS_KEY, restaurants.map((item) => item.id === DEMO_RESTAURANT_ID ? updated : item))
  return updated
}

export function clearDemoProfile() {
  localStorage.removeItem(PROFILE_KEY)
}

export function getDemoRestaurantId() {
  return DEMO_RESTAURANT_ID
}

export function getDemoQrId() {
  return DEMO_QR_ID
}

export function getSlug(name) {
  const slug = name.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || 'my-restaurant'
}

export async function getRestaurantByQr(qrId) {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_public_restaurant', { p_qr_id: qrId })
    if (error) throw error
    return Array.isArray(data) ? data[0] ?? null : data
  }
  return getDemoRestaurants().find((restaurant) => restaurant.qr_id === qrId || restaurant.slug === qrId) ?? null
}

export async function getPublicQueueSummary(qrId) {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_public_queue_summary', { p_qr_id: qrId })
    if (error) throw error
    return (Array.isArray(data) ? data[0] : data) ?? { queue_count: 0, avg_service_minutes: 5 }
  }

  const restaurant = await getRestaurantByQr(qrId)
  if (!restaurant) throw new Error('We could not find this restaurant.')
  const queueCount = getDemoBookings().filter((booking) => (
    booking.restaurant_id === restaurant.id && ['waiting', 'notified'].includes(booking.status)
  )).length
  return { queue_count: queueCount, avg_service_minutes: restaurant.avg_service_minutes }
}

export async function getOwnedRestaurant(userId) {
  if (supabase) {
    const { data, error } = await supabase.from('restaurants').select('*').eq('owner_id', userId).maybeSingle()
    if (error) throw error
    return data
  }
  return getDemoRestaurants().find((restaurant) => restaurant.owner_id === userId) ?? null
}

export async function createRestaurant(userId, fields) {
  const restaurant = {
    owner_id: userId,
    name: fields.name.trim(),
    slug: `${getSlug(fields.name)}-${crypto.randomUUID().slice(0, 6)}`,
    description: fields.description.trim(),
    address: fields.address.trim(),
    phone: fields.phone.trim(),
    whatsapp: fields.whatsapp.trim(),
    logo_url: fields.logo_url || '',
    cover_url: fields.cover_url || '',
    menu_url: fields.menu_url?.trim() || null,
    is_open: true,
    queue_capacity: 40,
    avg_service_minutes: 5,
    opening_hours: defaultHours,
  }

  if (supabase) {
    const { data, error } = await supabase.from('restaurants').insert(restaurant).select().single()
    if (error) throw error
    return data
  }

  const saved = { ...demoRestaurant, ...restaurant, id: crypto.randomUUID(), qr_id: crypto.randomUUID(), created_at: new Date().toISOString() }
  writeStorage(RESTAURANTS_KEY, [...getDemoRestaurants(), saved])
  return saved
}

export async function updateRestaurant(id, updates) {
  const normalizedUpdates = {
    ...updates,
    ...(Object.hasOwn(updates, 'menu_url') ? { menu_url: updates.menu_url?.trim() || null } : {}),
  }
  if (supabase) {
    const { data, error } = await supabase.from('restaurants').update(normalizedUpdates).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const restaurants = getDemoRestaurants()
  const updated = restaurants.map((restaurant) => restaurant.id === id ? { ...restaurant, ...normalizedUpdates, updated_at: new Date().toISOString() } : restaurant)
  const restaurant = updated.find((item) => item.id === id)
  if (!restaurant) throw new Error('Restaurant not found.')
  writeStorage(RESTAURANTS_KEY, updated)
  return restaurant
}

export async function uploadRestaurantImage(file, userId, kind) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPG, or WebP image.')
  }
  if (file.size > 4 * 1024 * 1024) throw new Error('Images must be smaller than 4 MB.')
  if (supabase) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${kind}-${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('restaurant-media').upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('restaurant-media').getPublicUrl(path)
    return data.publicUrl
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that image. Please try another file.'))
    reader.readAsDataURL(file)
  })
}

export async function listBookings(restaurantId) {
  let records
  if (supabase) {
    const { data, error } = await supabase.from('bookings').select('*').eq('restaurant_id', restaurantId).order('joined_at', { ascending: true })
    if (error) throw error
    records = data
  } else {
    records = getDemoBookings().filter((booking) => booking.restaurant_id === restaurantId).sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  }

  let position = 0
  const restaurants = isDemoMode ? getDemoRestaurants() : null
  let serviceMinutes = 5
  if (restaurants) serviceMinutes = restaurants.find((restaurant) => restaurant.id === restaurantId)?.avg_service_minutes || serviceMinutes
  else {
    const { data, error } = await supabase.from('restaurants').select('avg_service_minutes').eq('id', restaurantId).single()
    if (error) throw error
    serviceMinutes = data.avg_service_minutes
  }
  return records.map((booking) => {
    if (!['waiting', 'notified'].includes(booking.status)) return booking
    position += 1
    return { ...booking, position, estimated_wait_minutes: (position - 1) * serviceMinutes }
  })
}

export async function listQueueActivity(restaurantId) {
  if (supabase) {
    const { data, error } = await supabase.from('queue_activity')
      .select('id, booking_id, event_type, from_status, to_status, message, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  }

  return readStorage(ACTIVITY_KEY, [])
    .filter((activity) => activity.restaurant_id === restaurantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50)
}

export async function joinQueue(restaurantId, details) {
  if (supabase) {
    const { data, error } = await supabase.rpc('join_queue', {
      p_qr_id: restaurantId,
      p_guest_name: details.name.trim(),
      p_phone: details.phone.trim() || null,
      p_party_size: details.partySize,
      p_table_preference: details.preference,
      p_whatsapp: details.whatsapp,
      p_request_id: details.requestId,
    })
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }
  const restaurant = await getRestaurantByQr(restaurantId)
  if (!restaurant) throw new Error('We could not find this restaurant. Check the QR code and try again.')
  if (!restaurant.is_open) throw new Error('This restaurant has paused its waitlist. Please check with the host.')

  const bookings = getDemoBookings()
  const existing = bookings.find((booking) => (
    booking.restaurant_id === restaurant.id && booking.request_id === details.requestId
  ))
  if (existing) return existing
  const waiting = bookings.filter((booking) => booking.restaurant_id === restaurant.id && ['waiting', 'notified'].includes(booking.status))
  if (waiting.length >= restaurant.queue_capacity) throw new Error('The waitlist is currently full. Please speak with the restaurant.')

  const joinedAt = new Date().toISOString()
  const token = crypto.randomUUID()
  const booking = {
    id: crypto.randomUUID(),
    restaurant_id: restaurant.id,
    request_id: details.requestId,
    guest_access_token: token,
    booking_code: `GP-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`,
    guest_name: details.name.trim(),
    phone: details.phone.trim() || null,
    party_size: details.partySize,
    table_preference: details.preference,
    status: 'waiting',
    position: waiting.length + 1,
    estimated_wait_minutes: waiting.length * restaurant.avg_service_minutes,
    joined_at: joinedAt,
    called_at: null,
    seated_at: null,
    completed_at: null,
    restaurant_name: restaurant.name,
    restaurant_phone: restaurant.phone,
    restaurant_address: restaurant.address,
    restaurant_whatsapp: restaurant.whatsapp,
    restaurant_description: restaurant.description,
    restaurant_logo_url: restaurant.logo_url,
    restaurant_cover_url: restaurant.cover_url,
    restaurant_menu_url: restaurant.menu_url,
  }
  writeStorage(BOOKINGS_KEY, [...bookings, booking])
  addDemoActivity(booking, 'joined', null, 'waiting', `${booking.guest_name} joined the queue`)
  return booking
}

export async function getBookingByToken(token) {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_public_booking', { p_access_token: token })
    if (error) throw error
    return Array.isArray(data) ? data[0] ?? null : data
  }
  const booking = getDemoBookings().find((item) => item.guest_access_token === token)
  if (!booking) return null
  const restaurant = getDemoRestaurants().find((item) => item.id === booking.restaurant_id)
  if (!restaurant) return booking
  return {
    ...booking,
    restaurant_phone: booking.restaurant_phone || restaurant.phone,
    restaurant_whatsapp: booking.restaurant_whatsapp || restaurant.whatsapp,
    restaurant_address: booking.restaurant_address || restaurant.address,
    restaurant_description: booking.restaurant_description || restaurant.description,
    restaurant_logo_url: booking.restaurant_logo_url || restaurant.logo_url,
    restaurant_cover_url: booking.restaurant_cover_url || restaurant.cover_url,
    restaurant_menu_url: booking.restaurant_menu_url || restaurant.menu_url,
  }
}

export async function getPublicReview(token) {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_public_review', { p_access_token: token })
    if (error) throw error
    return Array.isArray(data) ? data[0] ?? null : data
  }
  const booking = getDemoBookings().find((item) => item.guest_access_token === token)
  if (!booking) return null
  return readStorage(REVIEWS_KEY, []).find((review) => review.booking_id === booking.id) ?? null
}

export async function submitPublicReview(token, rating) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Choose a rating from 1 to 5 stars.')
  }
  if (supabase) {
    const { data, error } = await supabase.rpc('submit_public_review', {
      p_access_token: token,
      p_rating: rating,
    })
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }
  const booking = getDemoBookings().find((item) => item.guest_access_token === token)
  if (!booking || !['seated', 'completed'].includes(booking.status)) {
    throw new Error('A rating is available after the restaurant seats you.')
  }
  const reviews = readStorage(REVIEWS_KEY, [])
  const review = { booking_id: booking.id, restaurant_id: booking.restaurant_id, rating, updated_at: new Date().toISOString() }
  const index = reviews.findIndex((item) => item.booking_id === booking.id)
  if (index === -1) reviews.push(review)
  else reviews[index] = review
  writeStorage(REVIEWS_KEY, reviews)
  return review
}

export async function cancelBookingByToken(token) {
  if (supabase) {
    const { data, error } = await supabase.rpc('cancel_public_booking', { p_access_token: token })
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }
  const booking = await getBookingByToken(token)
  if (!booking || booking.status !== 'waiting') throw new Error('This queue entry can no longer be cancelled.')
  return updateBookingStatus(booking.id, 'cancelled')
}

export async function updateBookingStatus(bookingId, status, tableNumber = null) {
  if (supabase) {
    const { data, error } = await supabase.rpc('transition_booking', {
      p_booking_id: bookingId,
      p_status: status,
      p_table_number: tableNumber,
    })
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }
  const bookings = getDemoBookings()
  let updatedBooking = null
  const updated = bookings.map((booking) => {
    if (booking.id !== bookingId) return booking
    updatedBooking = {
      ...booking,
      status,
      table_number: tableNumber ?? booking.table_number,
      called_at: status === 'notified' ? new Date().toISOString() : booking.called_at,
      seated_at: status === 'seated' ? new Date().toISOString() : booking.seated_at,
      completed_at: status === 'completed' ? new Date().toISOString() : booking.completed_at,
    }
    return updatedBooking
  })
  if (!updatedBooking) throw new Error('Queue entry not found.')
  writeStorage(BOOKINGS_KEY, updated)
  const previousBooking = bookings.find((booking) => booking.id === bookingId)
  addDemoActivity(
    updatedBooking,
    status === 'notified' ? 'called' : status,
    previousBooking.status,
    status,
    status === 'notified'
      ? `${updatedBooking.guest_name} was called`
      : status === 'seated'
        ? `${updatedBooking.guest_name} was seated`
        : status === 'completed'
          ? `${updatedBooking.guest_name} completed their visit`
          : `${updatedBooking.guest_name} left the queue`,
  )
  return updatedBooking
}

export async function removeBooking(bookingId) {
  if (supabase) {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
    if (error) throw error
    return
  }
  const bookings = getDemoBookings()
  const booking = bookings.find((item) => item.id === bookingId)
  if (!booking) throw new Error('Queue entry not found.')
  addDemoActivity(booking, 'removed', booking.status, 'removed', `${booking.guest_name} was removed from booking history`)
  writeStorage(BOOKINGS_KEY, bookings.filter((item) => item.id !== bookingId))
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Email and password sign-in requires Supabase configuration.')
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data.user
}

export async function signUpWithPassword(email, password, name) {
  if (!supabase) throw new Error('Restaurant registration requires Supabase configuration.')
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim(), role: 'restaurant' } },
  })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Google sign-in requires Supabase configuration.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function saveProfile(userId, profile) {
  if (supabase) {
    const { data, error } = await supabase.from('profiles').upsert({ id: userId, ...profile }).select().single()
    if (error) throw error
    return data
  }
  saveDemoProfile({ id: userId, ...profile })
  return { id: userId, ...profile }
}

export function subscribeToBookings(restaurantId, callback) {
  if (!supabase) return () => {}
  const channel = supabase.channel(`restaurant-bookings-${restaurantId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `restaurant_id=eq.${restaurantId}` }, callback)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return
  }
  clearDemoProfile()
}

export async function getSession() {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  }
  return null
}

export function subscribeToAuth(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export function createLocalDemoSession(identifier, name = 'Restaurant Owner') {
  const profile = { id: 'demo-owner', name, email: identifier.includes('@') ? identifier : null, phone: identifier.includes('@') ? null : identifier, role: 'restaurant' }
  saveDemoProfile(profile)
  return profile
}
