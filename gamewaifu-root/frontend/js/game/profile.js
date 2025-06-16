let currentView = 'profile';

export async function loadProfile() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="profile-stats-card">
      <div class="profile-main">
        <div class="avatar">
          <img id="user-avatar" src="/images/default-avatar.png" alt="Avatar">
        </div>
        <div class="profile-stats">
          <h2 id="profile-name">Nombre</h2>
          <p>Nivel: <span id="profile-level">–</span></p>
          <p>Waifus: <span id="profile-characters">–</span></p>
          <p>Total Love: <span id="profile-love">–</span> <i class="fas fa-heart"></i></p>
        </div>
      </div>
    </div>
    <div class="profile-achievements-card">
      <h3>Logros</h3>
      <ul id="achievements-list"></ul>
    </div>
  `;

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/user/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('No se pudo cargar el perfil');
    const data = await response.json();

    document.getElementById('profile-name').innerText       = data.username;
    document.getElementById('user-avatar').src              = data.avatarUrl || '/images/default-avatar.png';
    document.getElementById('profile-level').innerText        = data.level || '–';
    document.getElementById('profile-characters').innerText   = data.charactersCount;
    document.getElementById('profile-love').innerText         = data.totalLove;
  } catch (err) {
    console.error(err);
  }

  try {
    const res = await fetch('/api/profile/achievements');
    if (!res.ok) throw new Error('No se pudieron cargar los logros');
    const achievements = await res.json();
    const list = document.getElementById('achievements-list');
    achievements.forEach(a => {
      const li = document.createElement('li');
      li.innerHTML = `
        <img src="${a.icon_url}" alt="${a.name}" width="32" height="32">
        <strong>${a.name}</strong> – ${a.description}
        <em>(${new Date(a.unlocked_at).toLocaleDateString()})</em>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

export async function loadMissions() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="missions-section" style="max-width:800px; margin:2rem auto; background:#ffb6c1; backdrop-filter: blur(8px); border-radius: 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); padding: 1.5rem;">
      <h3>Misiones Diarias</h3>
      <ul id="missions-list"></ul>
    </div>
  `;

  try {
    const res = await fetch('/api/profile/missions');
    const missions = await res.json();
    const list = document.getElementById('missions-list');
    
    missions.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${m.name}</strong> – ${m.description}  
        <progress max="${m.goal}" value="${m.progress}"></progress>
        ${m.is_completed ? '<span>✔️ Completada</span>' : ''}
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error al cargar las misiones.</p>`;
  }
}

export function toggleView() {
  const isProfile = currentView === 'profile';
  const targetView = isProfile ? 'missions' : 'profile';
  const overlayColor = isProfile ? 'black' : 'white';

  const button = document.querySelector('.toggle-view-button');
  const rect = button.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  const overlay = document.createElement('div');
  overlay.classList.add('transition-circle');
  overlay.style.backgroundColor = overlayColor;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.left = `${startX - rect.width / 2}px`;
  overlay.style.top = `${startY - rect.height / 2}px`;
  document.body.appendChild(overlay);

  const dx = Math.max(startX, window.innerWidth - startX);
  const dy = Math.max(startY, window.innerHeight - startY);
  const radius = Math.sqrt(dx * dx + dy * dy);
  const scaleFactor = radius / (rect.width / 2);

  requestAnimationFrame(() => {
    overlay.style.transform = `scale(${scaleFactor})`;
  });

  setTimeout(() => {
    if (targetView === 'missions') {
      loadMissions();
      document.body.style.backgroundColor = 'black';
      button.innerHTML = '<i class="fa-solid fa-explosion"></i>';
      button.style.backgroundColor = 'white';
      button.style.color = 'black';
    } else {
      loadProfile();
      document.body.style.backgroundColor = 'white';
      button.innerHTML = '<i class="fa-solid fa-mug-saucer"></i>';
      button.style.backgroundColor = 'black';
      button.style.color = 'white';
    }
    currentView = targetView;
    overlay.remove();
  }, 600);
}
