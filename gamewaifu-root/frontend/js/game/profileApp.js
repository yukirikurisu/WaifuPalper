export class ProfileApp {
  constructor() {
    this.currentView = 'profile';
    
    // Configurar elementos del DOM
    this.container = document.getElementById('view-container');
    this.toggleBtn = document.querySelector('.toggle-view-button');
    
    if (!this.container || !this.toggleBtn) {
      console.error('Elementos del perfil no encontrados');
      return;
    }
    
    // Configurar eventos
    this.toggleBtn.addEventListener('click', this.toggleView.bind(this));
    
    // Inicializar vista
    this.initProfile();
  }
  
  initProfile() {
    document.body.style.backgroundColor = 'white';
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
        document.body.style.backgroundColor = 'black';
        this.toggleBtn.innerHTML = '<i class="fa-solid fa-explosion"></i>';
        this.toggleBtn.style.backgroundColor = 'white';
        this.toggleBtn.style.color = 'black';
      } else {
        this.loadProfile();
        document.body.style.backgroundColor = 'white';
        this.toggleBtn.innerHTML = '<i class="fa-solid fa-mug-saucer"></i>';
        this.toggleBtn.style.backgroundColor = 'black';
        this.toggleBtn.style.color = 'white';
      }
      this.currentView = targetView;
      overlay.remove();
    }, 600);
  }
  
  async loadProfile() {
    this.container.innerHTML = `
      <div class="profile-stats-card">
        <div class="profile-main">
          <div class="avatar">
            <img id="user-avatar" src="" alt="Avatar">
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
      const userRes = await fetch('/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userRes.ok) throw new Error('Error al cargar perfil');
      const userData = await userRes.json();

      document.getElementById('profile-name').innerText = userData.username;
      document.getElementById('user-avatar').src = userData.avatarUrl || '/images/default-avatar.png';
      document.getElementById('profile-characters').innerText = userData.charactersCount;
      document.getElementById('profile-love').innerText = userData.totalLove;
      
      // Cargar logros
      const achievementsRes = await fetch('/api/profile/achievements');
      const achievements = await achievementsRes.json();
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
      console.error('Error loading profile:', err);
      this.container.innerHTML = `<p>Error al cargar el perfil: ${err.message}</p>`;
    }
  }
  
  async loadMissions() {
    this.container.innerHTML = `
      <div class="missions-section">
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
      console.error('Error loading missions:', err);
      this.container.innerHTML = `<p>Error al cargar las misiones.</p>`;
    }
  }
}