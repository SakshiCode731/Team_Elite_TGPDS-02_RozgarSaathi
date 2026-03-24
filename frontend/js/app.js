// ─── RozgarSaathi App JS ───────────────────────────────────
const API = 'http://localhost:5000/api';
let socket;
let currentUser = null;
let userRole = null;
let userLocation = { lat: 18.5204, lng: 73.8567, address: 'Pune, Maharashtra' }; // default
 
// ── SKILL METADATA ──────────────────────────────────────────
const SKILLS = {
  electrician:  { label: 'Electrician',   icon: '⚡' },
  plumber:      { label: 'Plumber',        icon: '🔧' },
  carpenter:    { label: 'Carpenter',      icon: '🪚' },
  painter:      { label: 'Painter',        icon: '🖌️' },
  mazdoor:      { label: 'Mazdoor',        icon: '👷' },
  welder:       { label: 'Welder',         icon: '🔥' },
  mason:        { label: 'Mason',          icon: '🧱' },
  ac_mechanic:  { label: 'AC Mechanic',    icon: '❄️' },
  tile_worker:  { label: 'Tile Worker',    icon: '🏗️' },
  glass_worker: { label: 'Glass Worker',   icon: '🪟' },
  lift_mechanic:{ label: 'Lift Mechanic',  icon: '🛗' },
  driver:       { label: 'Driver',         icon: '🚗' },
};
 
const PAY_TYPES = { per_day: '/day', per_hour: '/hour', fixed: ' fixed' };
const URGENCY_LABELS = { today: 'Today', tomorrow: 'Tomorrow', this_week: 'This Week', flexible: 'Flexible' };
 
// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  initSocket();
  getLocation();
  loadStats();
  renderSkillSelectors();
  navigateTo('home');
});
 
function restoreSession() {
  const token = localStorage.getItem('rs_token');
  const user  = localStorage.getItem('rs_user');
  const role  = localStorage.getItem('rs_role');
  if (token && user) {
    currentUser = JSON.parse(user);
    userRole = role;
    updateNavbar();
  }
}
 
// ── SOCKET ──────────────────────────────────────────────────
function initSocket() {
  if (typeof io === 'undefined') return;
  socket = io('http://localhost:5000');
  socket.on('newJob', job => {
    showToast(`New job posted: ${job.title}`, 'info');
    if (document.getElementById('page-jobs').classList.contains('active')) {
      loadJobs();
    }
  });
  socket.on('workerUpdated', ({ workerId, isAvailable }) => {
    const card = document.querySelector(`[data-worker-id="${workerId}"]`);
    if (card) {
      const dot = card.querySelector('.availability-dot');
      if (dot) { dot.className = `availability-dot ${isAvailable ? 'available' : 'unavailable'}`; }
    }
  });
}
 
// ── LOCATION ────────────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation.lat = pos.coords.latitude;
    userLocation.lng = pos.coords.longitude;
    userLocation.address = `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
    document.querySelectorAll('.user-location-display').forEach(el => {
      el.textContent = `📍 Near you (${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)})`;
    });
  }, () => {/* use default */});
}
 
// ── NAVIGATION ──────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
 
  // Load data for the page
  if (page === 'jobs') loadJobs();
  if (page === 'workers') loadWorkers();
  if (page === 'dashboard') loadDashboard();
}
 
// ── NAVBAR ──────────────────────────────────────────────────
function updateNavbar() {
  const navAuth = document.getElementById('nav-auth');
  const navUser = document.getElementById('nav-user');
 
  if (currentUser) {
    navAuth.style.display = 'none';
    navUser.style.display = 'flex';
    document.getElementById('nav-user-name').textContent = currentUser.name;
    const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('nav-avatar').textContent = initials;
  } else {
    navAuth.style.display = 'flex';
    navUser.style.display = 'none';
  }
}
 
function logout() {
  localStorage.removeItem('rs_token');
  localStorage.removeItem('rs_user');
  localStorage.removeItem('rs_role');
  currentUser = null; userRole = null;
  updateNavbar();
  navigateTo('home');
  showToast('Logged out successfully', 'info');
}
 
// ── STATS ────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-workers').textContent = data.data.totalWorkers;
      document.getElementById('stat-jobs').textContent = data.data.openJobs;
      document.getElementById('stat-verified').textContent = data.data.verifiedWorkers;
    }
  } catch (e) { /* ignore */ }
}
 
// ── SKILL SELECTORS (dynamic) ─────────────────────────────────
function renderSkillSelectors() {
  document.querySelectorAll('.skill-selector[data-multi]').forEach(container => {
    container.innerHTML = Object.entries(SKILLS).map(([key, val]) =>
      `<div class="skill-option" data-skill="${key}" onclick="toggleSkill(this)">
        <span>${val.icon}</span> ${val.label}
      </div>`
    ).join('');
  });
 
  document.querySelectorAll('select.skill-filter').forEach(sel => {
    const base = sel.innerHTML;
    sel.innerHTML = base + Object.entries(SKILLS).map(([key, val]) =>
      `<option value="${key}">${val.icon} ${val.label}</option>`
    ).join('');
  });
}
 
function toggleSkill(el) {
  el.classList.toggle('selected');
}
 
function getSelectedSkills(container) {
  return [...container.querySelectorAll('.skill-option.selected')].map(el => el.dataset.skill);
}
 
// ── REGISTER WORKER ──────────────────────────────────────────
async function registerWorker() {
  const name      = document.getElementById('w-name').value.trim();
  const phone     = document.getElementById('w-phone').value.trim();
  const password  = document.getElementById('w-password').value;
  const dailyRate = document.getElementById('w-rate').value;
  const experience= document.getElementById('w-experience').value;
  const bio       = document.getElementById('w-bio').value.trim();
  const whatsapp  = document.getElementById('w-whatsapp').value.trim();
  const skills    = getSelectedSkills(document.getElementById('w-skills'));
 
  if (!name || !phone || !password || !dailyRate || skills.length === 0) {
    return showToast('Please fill all required fields and select at least one skill', 'error');
  }
 
  const btn = document.getElementById('btn-register-worker');
  btn.disabled = true; btn.textContent = 'Registering...';
 
  try {
    const res = await fetch(`${API}/workers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, password, skills, dailyRate: +dailyRate,
        experience: +experience || 0, bio,
        whatsappNumber: whatsapp || phone,
        location: {
          coordinates: [userLocation.lng, userLocation.lat],
          address: userLocation.address
        }
      })
    });
 
    const data = await res.json();
    if (!data.success) throw new Error(data.message || (data.errors && data.errors[0]?.msg));
 
    localStorage.setItem('rs_token', data.token);
    localStorage.setItem('rs_user', JSON.stringify(data.data));
    localStorage.setItem('rs_role', 'worker');
    currentUser = data.data; userRole = 'worker';
    updateNavbar();
    closeModal('modal-worker-register');
    showToast(`Welcome, ${currentUser.name}! 🎉`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Register as Worker';
  }
}
 
// ── REGISTER POSTER ───────────────────────────────────────────
async function registerPoster() {
  const name     = document.getElementById('p-name').value.trim();
  const phone    = document.getElementById('p-phone').value.trim();
  const password = document.getElementById('p-password').value;
  const type     = document.getElementById('p-type').value;
 
  if (!name || !phone || !password) return showToast('Please fill all fields', 'error');
 
  const btn = document.getElementById('btn-register-poster');
  btn.disabled = true; btn.textContent = 'Registering...';
 
  try {
    const res = await fetch(`${API}/posters/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, password, posterType: type,
        location: { coordinates: [userLocation.lng, userLocation.lat], address: userLocation.address }
      })
    });
 
    const data = await res.json();
    if (!data.success) throw new Error(data.message || (data.errors && data.errors[0]?.msg));
 
    localStorage.setItem('rs_token', data.token);
    localStorage.setItem('rs_user', JSON.stringify(data.data));
    localStorage.setItem('rs_role', 'poster');
    currentUser = data.data; userRole = 'poster';
    updateNavbar();
    closeModal('modal-poster-register');
    showToast(`Welcome, ${currentUser.name}! 🎉`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Register as Job Poster';
  }
}
 
// ── LOGIN ─────────────────────────────────────────────────────
async function login(role) {
  const phone    = document.getElementById(`login-phone-${role}`).value.trim();
  const password = document.getElementById(`login-password-${role}`).value;
 
  if (!phone || !password) return showToast('Please enter phone and password', 'error');
 
  const endpoint = role === 'worker' ? '/workers/login' : '/posters/login';
  const btn = document.getElementById(`btn-login-${role}`);
  btn.disabled = true; btn.textContent = 'Logging in...';
 
  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
 
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
 
    localStorage.setItem('rs_token', data.token);
    localStorage.setItem('rs_user', JSON.stringify(data.data));
    localStorage.setItem('rs_role', role);
    currentUser = data.data; userRole = role;
    updateNavbar();
    closeModal('modal-login');
    showToast(`Welcome back, ${currentUser.name}! 👋`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Login';
  }
}
 
// ── AADHAAR VERIFY ────────────────────────────────────────────
async function verifyAadhaar() {
  const aadhaarLast4 = document.getElementById('aadhaar-last4').value.trim();
  const otp          = document.getElementById('aadhaar-otp').value.trim();
  const token        = localStorage.getItem('rs_token');
 
  if (!aadhaarLast4 || aadhaarLast4.length !== 4) return showToast('Enter last 4 digits of Aadhaar', 'error');
  if (!otp) return showToast('Enter OTP', 'error');
 
  try {
    const res = await fetch(`${API}/workers/verify-aadhaar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ aadhaarLast4, otp })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
 
    currentUser.isVerified = true;
    localStorage.setItem('rs_user', JSON.stringify(currentUser));
    closeModal('modal-aadhaar');
    showToast('Aadhaar verified! ✅ You now have a verified badge.', 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message || 'Verification failed', 'error');
  }
}
 
function sendAadhaarOTP() {
  const aadhaarLast4 = document.getElementById('aadhaar-last4').value.trim();
  if (aadhaarLast4.length !== 4) return showToast('Enter last 4 digits of Aadhaar first', 'error');
  showToast('OTP sent! Use 123456 for demo 📱', 'info');
}
 
// ── POST JOB ──────────────────────────────────────────────────
async function postJob() {
  const token = localStorage.getItem('rs_token');
  if (!token || userRole !== 'poster') {
    closeModal('modal-post-job');
    return openModal('modal-login');
  }
 
  const title    = document.getElementById('j-title').value.trim();
  const desc     = document.getElementById('j-desc').value.trim();
  const skill    = document.getElementById('j-skill').value;
  const pay      = document.getElementById('j-pay').value;
  const payType  = document.getElementById('j-paytype').value;
  const urgency  = document.getElementById('j-urgency').value;
  const workers  = document.getElementById('j-workers').value || 1;
  const whatsapp = document.getElementById('j-whatsapp').value.trim();
 
  if (!title || !desc || !skill || !pay) return showToast('Please fill all required fields', 'error');
 
  const btn = document.getElementById('btn-post-job');
  btn.disabled = true; btn.textContent = 'Posting...';
 
  try {
    const res = await fetch(`${API}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title, description: desc, skillRequired: skill,
        payAmount: +pay, payType, urgency, workersNeeded: +workers,
        whatsappContact: whatsapp,
        location: { coordinates: [userLocation.lng, userLocation.lat], address: userLocation.address }
      })
    });
 
    const data = await res.json();
    if (!data.success) throw new Error(data.message || (data.errors && data.errors[0]?.msg));
 
    closeModal('modal-post-job');
    showToast('Job posted successfully! 🎉', 'success');
    navigateTo('jobs');
  } catch (err) {
    showToast(err.message || 'Failed to post job', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Post Job';
  }
}
 
// ── LOAD JOBS ─────────────────────────────────────────────────
async function loadJobs() {
  const skill   = document.getElementById('filter-skill-jobs')?.value || 'all';
  const urgency = document.getElementById('filter-urgency-jobs')?.value || 'all';
  const radius  = document.getElementById('filter-radius-jobs')?.value || 5;
  const container = document.getElementById('jobs-list');
 
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Loading jobs...</div>`;
 
  try {
    let url = `${API}/jobs/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`;
    if (skill !== 'all') url += `&skill=${skill}`;
    if (urgency !== 'all') url += `&urgency=${urgency}`;
 
    const res = await fetch(url);
    const data = await res.json();
 
    if (!data.success || !data.data.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <h3>No jobs found nearby</h3>
          <p>Try increasing the radius or check back later</p>
        </div>`;
      return;
    }
 
    container.innerHTML = data.data.map(job => renderJobCard(job)).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Failed to load jobs</h3><p>Make sure the backend is running</p></div>`;
  }
}
 
function renderJobCard(job) {
  const skill = SKILLS[job.skillRequired] || { label: job.skillRequired, icon: '🔨' };
  const urgencyClass = `urgency-${job.urgency}`;
  const timeAgo = getTimeAgo(new Date(job.createdAt));
 
  return `<div class="job-card" onclick="showJobDetail('${job._id}')">
    <div class="job-card-header">
      <div>
        <div class="job-title">${skill.icon} ${job.title}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">${job.postedBy.name} · ${timeAgo}</div>
      </div>
      <div class="job-pay">₹${job.payAmount.toLocaleString('en-IN')}<span style="font-size:12px;font-weight:400;color:var(--muted)">${PAY_TYPES[job.payType]||'/day'}</span></div>
    </div>
    <p style="font-size:14px;color:var(--slate);margin-bottom:12px;line-height:1.5">${job.description.slice(0,100)}${job.description.length>100?'…':''}</p>
    <div class="job-meta">
      <span class="job-meta-item">📍 ${job.location.address || 'Nearby'}</span>
      <span class="job-meta-item">👷 ${job.workersNeeded} needed</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
      <span class="urgency-badge ${urgencyClass}">${URGENCY_LABELS[job.urgency]}</span>
      <span class="skill-tag">${skill.icon} ${skill.label}</span>
      ${job.distanceKm ? `<span class="distance-badge">📍 ${job.distanceKm} km away</span>` : ''}
    </div>
  </div>`;
}
 
// ── JOB DETAIL MODAL ──────────────────────────────────────────
async function showJobDetail(jobId) {
  try {
    const res = await fetch(`${API}/jobs/${jobId}`);
    const data = await res.json();
    if (!data.success) return;
    const job = data.data;
    const skill = SKILLS[job.skillRequired] || { label: job.skillRequired, icon: '🔨' };
    const waNumber = job.postedBy.whatsapp || job.postedBy.phone;
    const waMsg = encodeURIComponent(`Hello! I saw your job posting on RozgarSaathi: "${job.title}". I'm available for ₹${job.payAmount}. When can I start?`);
 
    document.getElementById('job-detail-content').innerHTML = `
      <div style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <h2 style="font-family:var(--font-display);font-size:1.3rem">${skill.icon} ${job.title}</h2>
          <div class="job-pay" style="font-size:1.4rem">₹${job.payAmount.toLocaleString('en-IN')}<span style="font-size:13px;font-weight:400;color:var(--muted)">${PAY_TYPES[job.payType]}</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <span class="urgency-badge urgency-${job.urgency}">${URGENCY_LABELS[job.urgency]}</span>
          <span class="skill-tag">${skill.icon} ${skill.label}</span>
        </div>
        <p style="color:var(--slate);line-height:1.7;margin-bottom:16px">${job.description}</p>
        <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px">
            <div><span style="color:var(--muted)">Posted by</span><br><strong>${job.postedBy.name}</strong></div>
            <div><span style="color:var(--muted)">Workers needed</span><br><strong>${job.workersNeeded}</strong></div>
            <div><span style="color:var(--muted)">Location</span><br><strong>${job.location.address || 'Nearby'}</strong></div>
            <div><span style="color:var(--muted)">Views</span><br><strong>${job.views}</strong></div>
          </div>
        </div>
        <a href="https://wa.me/91${waNumber}?text=${waMsg}" target="_blank" class="whatsapp-btn" style="text-decoration:none;display:flex">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Contact via WhatsApp
        </a>
      </div>`;
    openModal('modal-job-detail');
  } catch (err) {
    showToast('Failed to load job details', 'error');
  }
}
 
// ── LOAD WORKERS ──────────────────────────────────────────────
async function loadWorkers() {
  const skill  = document.getElementById('filter-skill-workers')?.value || 'all';
  const radius = document.getElementById('filter-radius-workers')?.value || 5;
  const container = document.getElementById('workers-list');
 
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Finding workers nearby...</div>`;
 
  try {
    let url = `${API}/workers/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`;
    if (skill !== 'all') url += `&skill=${skill}`;
 
    const res = await fetch(url);
    const data = await res.json();
 
    if (!data.success || !data.data.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">👷</div>
          <h3>No workers found nearby</h3>
          <p>Try a larger radius or different skill filter</p>
        </div>`;
      return;
    }
 
    container.innerHTML = `<div class="card-grid">${data.data.map(w => renderWorkerCard(w)).join('')}</div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Failed to load workers</h3><p>Make sure the backend is running</p></div>`;
  }
}
 
function renderWorkerCard(w) {
  const initials = w.name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0,2);
  const stars = '★'.repeat(Math.round(w.rating.average)) + '☆'.repeat(5 - Math.round(w.rating.average));
  const skills = w.skills.slice(0,3).map(s => `<span class="skill-tag">${SKILLS[s]?.icon||'🔨'} ${SKILLS[s]?.label||s}</span>`).join('');
  const waNumber = w.whatsappNumber || w.phone;
  const waMsg = encodeURIComponent(`Hello ${w.name}! I found you on RozgarSaathi. Are you available for work today?`);
 
  return `<div class="worker-card" data-worker-id="${w._id}">
    <div class="worker-card-header">
      <div class="worker-avatar">${initials}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <div class="worker-name">${w.name}</div>
          ${w.isVerified ? '<span class="verified-badge">✓ Verified</span>' : ''}
        </div>
        <div class="worker-location">
          <span class="availability-dot ${w.isAvailable ? 'available' : 'unavailable'}"></span>
          ${w.isAvailable ? 'Available now' : 'Not available'}
          ${w.distanceKm ? ` · ${w.distanceKm} km away` : ''}
        </div>
      </div>
    </div>
    <div class="skill-tags">${skills}</div>
    <div class="worker-stats">
      <div class="worker-stat"><span class="stars">${stars}</span> ${w.rating.average.toFixed(1)} (${w.rating.count})</div>
      <div class="worker-stat">💼 ${w.totalJobsCompleted} jobs</div>
      <div class="worker-stat">⏱️ ${w.experience}yr exp</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="rate-badge">₹${w.dailyRate.toLocaleString('en-IN')}/day</div>
    </div>
    <a href="https://wa.me/91${waNumber}?text=${waMsg}" target="_blank" class="whatsapp-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Contact via WhatsApp
    </a>
  </div>`;
}
 
// ── DASHBOARD ─────────────────────────────────────────────────
function loadDashboard() {
  if (!currentUser) {
    document.getElementById('page-dashboard').innerHTML = `
      <div class="container">
        <div class="empty-state" style="padding-top:80px">
          <div class="icon">🔐</div>
          <h3>Please login first</h3>
          <p style="margin-bottom:20px">Login or register to see your dashboard</p>
          <button class="btn btn-primary" style="width:auto;padding:12px 32px" onclick="openModal('modal-login')">Login / Register</button>
        </div>
      </div>`;
    return;
  }
 
  if (userRole === 'worker') renderWorkerDashboard();
  else renderPosterDashboard();
}
 
function renderWorkerDashboard() {
  const u = currentUser;
  const initials = u.name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
  const skills = (u.skills||[]).map(s => `<span class="skill-tag">${SKILLS[s]?.icon||'🔨'} ${SKILLS[s]?.label||s}</span>`).join('');
 
  document.getElementById('page-dashboard').innerHTML = `
    <div class="container">
      <div class="section">
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div class="worker-avatar" style="width:64px;height:64px;font-size:1.4rem">${initials}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
                <h2 style="font-family:var(--font-display)">${u.name}</h2>
                ${u.isVerified ? '<span class="verified-badge" style="font-size:13px">✓ Aadhaar Verified</span>' : `<button class="btn btn-secondary" style="padding:4px 12px;font-size:12px" onclick="openModal('modal-aadhaar')">Verify Aadhaar</button>`}
              </div>
              <div style="color:var(--muted);font-size:14px">📞 ${u.phone} · ₹${u.dailyRate}/day · ${u.experience} yr exp</div>
            </div>
            <div class="toggle-wrapper">
              <span style="font-size:13px;color:var(--slate);font-weight:600">Available</span>
              <button class="toggle ${u.isAvailable?'on':''}" id="availability-toggle" onclick="toggleAvailability(this)"></button>
            </div>
          </div>
          ${u.bio ? `<p style="color:var(--slate);margin-top:14px;font-size:14px;border-top:1px solid var(--border);padding-top:12px">${u.bio}</p>` : ''}
          <div class="skill-tags" style="margin-top:12px">${skills}</div>
        </div>
 
        <div class="dash-grid">
          <div class="dash-stat"><div class="dash-stat-num">${u.totalJobsCompleted}</div><div class="dash-stat-label">Jobs Completed</div></div>
          <div class="dash-stat"><div class="dash-stat-num">${u.rating?.average?.toFixed(1)||'—'}</div><div class="dash-stat-label">Avg Rating</div></div>
          <div class="dash-stat"><div class="dash-stat-num">${u.rating?.count||0}</div><div class="dash-stat-label">Reviews</div></div>
          <div class="dash-stat"><div class="dash-stat-num">${u.isVerified?'✓':'✗'}</div><div class="dash-stat-label">Aadhaar Status</div></div>
        </div>
 
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">
          <button class="btn btn-primary" style="width:auto" onclick="navigateTo('jobs')">🔍 Browse Jobs Near Me</button>
          ${!u.isVerified ? `<button class="btn btn-secondary" onclick="openModal('modal-aadhaar')">🛡️ Verify Aadhaar</button>` : ''}
        </div>
      </div>
    </div>`;
}
 
function renderPosterDashboard() {
  const u = currentUser;
  document.getElementById('page-dashboard').innerHTML = `
    <div class="container">
      <div class="section">
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div class="avatar" style="width:60px;height:60px;font-size:1.3rem;border-radius:50%;border:2px solid var(--saffron);background:var(--saffron-pale);color:var(--saffron);display:flex;align-items:center;justify-content:center;font-weight:800">${u.name.slice(0,2).toUpperCase()}</div>
            <div>
              <h2 style="font-family:var(--font-display)">${u.name}</h2>
              <div style="color:var(--muted);font-size:14px">📞 ${u.phone} · ${u.posterType||'Household'}</div>
            </div>
          </div>
        </div>
 
        <div class="dash-grid">
          <div class="dash-stat"><div class="dash-stat-num">${u.totalJobsPosted||0}</div><div class="dash-stat-label">Jobs Posted</div></div>
        </div>
 
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" style="width:auto" onclick="openModal('modal-post-job')">➕ Post New Job</button>
          <button class="btn btn-secondary" onclick="navigateTo('workers')">👷 Find Workers</button>
        </div>
      </div>
    </div>`;
}
 
async function toggleAvailability(btn) {
  const token = localStorage.getItem('rs_token');
  const isOn = btn.classList.contains('on');
  try {
    const res = await fetch(`${API}/workers/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ isAvailable: !isOn })
    });
    const data = await res.json();
    if (data.success) {
      btn.classList.toggle('on');
      currentUser.isAvailable = !isOn;
      localStorage.setItem('rs_user', JSON.stringify(currentUser));
      showToast(isOn ? 'You are now unavailable' : 'You are now available! 🟢', isOn ? 'info' : 'success');
      if (socket) socket.emit('workerStatusChange', { workerId: currentUser._id, isAvailable: !isOn });
    }
  } catch (err) {
    showToast('Failed to update availability', 'error');
  }
}
 
// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
 
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
 
// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});
 
// ── TABS ──────────────────────────────────────────────────────
function switchTab(tabGroup, tabId) {
  document.querySelectorAll(`[data-tabgroup="${tabGroup}"] .tab-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll(`[data-tabpanel="${tabGroup}"]`).forEach(panel => {
    panel.style.display = panel.dataset.tab === tabId ? 'block' : 'none';
  });
}
 
// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateX(100%)'; toast.style.transition='all 0.3s'; setTimeout(()=>toast.remove(), 300); }, 3500);
}
 
// ── UTILS ─────────────────────────────────────────────────────
function getTimeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}


