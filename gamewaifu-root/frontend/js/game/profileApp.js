export class ProfileApp {
  constructor() {
    this.currentView = 'profile';
    this.container = document.getElementById('view-container');
    this.toggleBtn = document.querySelector('.toggle-view-button');
    
    if (!this.container || !this.toggleBtn) {
      console.error('Elementos del perfil no encontrados');
      return;
    }
    
    this.toggleBtn.addEventListener('click', this.toggleView.bind(this));
    this.initProfile();
  }
  
  initProfile() {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    this.toggleBtn.innerHTML = '<i class="fa-solid fa-mug-saucer"></i>';
    this.toggleBtn.style.backgroundColor = 'black';
    this.toggleBtn.style.color = 'white';
    this.loadProfile();
  }
  
  toggleView() {
    const isProfile = this.currentView === 'profile';
    const targetView = isProfile ? 'missions' : 'profile';
    const overlayColor = isProfile ? 'black' : 'white';

    const rect = this.toggleBtn.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const overlay = document.createElement('div');
    overlay.classList.add('transition-circle');
    overlay.style.backgroundColor = overlayColor;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.left = `${startX - rect.width / 2}px`;
    overlay.style.top = `${startY - rect.height / 2}px`;
    overlay.style.zIndex = '50'; // Detrás del contenido
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
        this.loadMissions();
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        this.toggleBtn.innerHTML = '<i class="fa-solid fa-explosion"></i>';
        this.toggleBtn.style.backgroundColor = 'white';
        this.toggleBtn.style.color = 'black';
      } else {
        this.loadProfile();
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        this.toggleBtn.innerHTML = '<i class="fa-solid fa-mug-saucer"></i>';
        this.toggleBtn.style.backgroundColor = 'black';
        this.toggleBtn.style.color = 'white';
      }
      this.currentView = targetView;
      overlay.remove();
      
      // Forzar repintado del contenido
      this.container.style.display = 'none';
      this.container.offsetHeight; // Trigger reflow
      this.container.style.display = 'block';
    }, 600);
  }
  
  async loadProfile() {
    this.container.innerHTML = `
      <div class="profile-stats-card">
        <div class="profile-main">
          <div class="avatar">
            <img id="user-avatar" src="/images/default-avatar.png" alt="Avatar">
          </div>
          <div class="profile-stats">
            <h2 id="profile-name">Usuario</h2>
            <p>Nivel: <span id="profile-level">1</span></p>
            <p>Waifus: <span id="profile-characters">0</span></p>
            <p>Total Love: <span id="profile-love">0</span> <i class="fas fa-heart"></i></p>
          </div>
        </div>
      </div>
      <div class="profile-achievements-card">
        <h3>Logros</h3>
        <ul id="achievements-list"></ul>
      </div>
    `;

    // Intentar cargar datos de usuario
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const userRes = await fetch('/api/user/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          document.getElementById('profile-name').innerText = userData.username || 'Usuario';
          document.getElementById('user-avatar').src = userData.avatarUrl || '/images/default-avatar.png';
          document.getElementById('profile-characters').innerText = userData.charactersCount || '0';
          document.getElementById('profile-love').innerText = userData.totalLove || '0';
        }
      }
    } catch (err) {
      console.error('Error cargando datos de usuario:', err);
    }

    // Intentar cargar logros
    const list = document.getElementById('achievements-list');
    try {
      const achievementsRes = await fetch('/api/profile/achievements');
      if (achievementsRes.ok) {
        const achievements = await achievementsRes.json();
        list.innerHTML = '';
        achievements.forEach(a => {
          const li = document.createElement('li');
          li.innerHTML = `
            <img src="${a.icon_url || '/images/default-icon.png'}" alt="${a.name}" width="32" height="32">
            <strong>${a.name}</strong> – ${a.description}
            ${a.unlocked_at ? `<em>(${new Date(a.unlocked_at).toLocaleDateString()})</em>` : ''}
          `;
          list.appendChild(li);
        });
      } else {
        throw new Error(`HTTP error! status: ${achievementsRes.status}`);
      }
    } catch (err) {
      console.error('Error cargando logros:', err);
      list.innerHTML = '<li>No se pudieron cargar los logros en este momento</li>';
    }
  }
  
  async loadMissions() {
    this.container.innerHTML = `
      <div class="missions-section">
        <h3>Misiones Diarias</h3>
        <ul id="missions-list"></ul>
      </div>
    `;

    const list = document.getElementById('missions-list');
    try {
      const res = await fetch('/api/profile/missions');
      if (res.ok) {
        const missions = await res.json();
        list.innerHTML = '';
        missions.forEach(m => {
          const li = document.createElement('li');
          li.innerHTML = `
            <strong>${m.name}</strong> – ${m.description}  
            <progress max="${m.goal}" value="${m.progress}"></progress>
            ${m.is_completed ? '<span>✔️ Completada</span>' : ''}
          `;
          list.appendChild(li);
        });
      } else {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (err) {
      console.error('Error cargando misiones:', err);
      list.innerHTML = '<li>No se pudieron cargar las misiones en este momento</li>';
    }
  }
}