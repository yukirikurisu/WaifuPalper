import { showTelegramLogin } from './auth/telegramAuth.js';

const splashScreen = document.getElementById('splash-screen');
const continueBtn = document.querySelector('.continue-btn');
const loginModal = document.getElementById('telegram-login-modal');
const closeModalBtn = document.getElementById('close-login-modal');

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    if (loginModal) loginModal.style.display = 'none';
  });
}

const routes = {
  '/': { view: 'home', controller: null },
  '/battle': {
    view: 'battle',
    controller: async () => {
      const module = await import('./battle.js');
      return new module.BattleUI();
    }
  },
  '/profile': {
    view: 'profile',
    controller: async () => {
      const module = await import('./profile.js');
      return new module.profileService();
    }
  },
  '/characters': {
    view: 'characters',
    controller: async () => {
      const module = await import('./characters.js');
      return new module.charactersService();
    }
  },
  '/market': {
    view: 'market',
    controller: async () => {
      const module = await import('./market.js');
      return new module.marketService();
    }
  },
  '/pass': {
    view: 'pass',
    controller: async () => {
      const module = await import('./pass.js');
      return new module.passService();
    }
  },
  '/config': {
    view: 'config',
    controller: async () => {
      const module = await import('./config.js');
      return new module.configService();
    }
  },
  '/game': {
    view: 'game',
    controller: async () => {
      const module = await import('./game/StaticApp.js');
      return new module.default();
    }
  },
  '404': { view: '404', controller: null }
};

async function router() {
  const path = window.location.pathname;
  const route = routes[path] || routes['404'];
  
  try {
    const res = await fetch(`/views/${route.view}.html`);
    if (!res.ok) throw new Error('Vista no encontrada');
    
    const html = await res.text();
    document.getElementById('app').innerHTML = html;
    
    if (route.controller) {
      await route.controller();
    }
  } catch (err) {
    console.error('Error loading view:', err);
    document.getElementById('app').innerHTML = `
      <div class="error-view">
        <h1>¡Error al cargar la vista!</h1>
        <p>${err.message}</p>
        <button onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

function navigate(path) {
  window.history.pushState({}, '', path);
  router();
}

function initApp() {
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      if (route) {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        navigate(route);
      }
    });
  });

  if (continueBtn) {
    continueBtn.addEventListener('click', showTelegramLogin);
  }
}

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', () => {
  router();
  initApp();
});

if (localStorage.getItem('authToken')) {
  if (splashScreen) splashScreen.style.display = 'none';
  
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.style.display = 'flex';
  
  navigate('/game');
}
