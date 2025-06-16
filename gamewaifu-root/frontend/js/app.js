import { showTelegramLogin } from './auth/telegramAuth.js';

const splashScreen = document.getElementById('splash-screen');
const continueBtn = document.querySelector('.continue-btn');
const loginModal = document.getElementById('telegram-login-modal');
const closeModalBtn = document.getElementById('close-login-modal');

// Módulo del menú circular
document.addEventListener('DOMContentLoaded', () => {
  const circularMenu = document.getElementById('circular-menu');
  const menuToggle = document.getElementById('menu-toggle');

  menuToggle.addEventListener('click', event => {
    event.stopPropagation();
    circularMenu.classList.toggle('active');
    menuToggle.innerHTML = circularMenu.classList.contains('active')
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-plus"></i>';
  });

  document.addEventListener('click', event => {
    if (!circularMenu.contains(event.target)) {
      circularMenu.classList.remove('active');
      menuToggle.innerHTML = '<i class="fas fa-plus"></i>';
    }
  });
});

// Cierra modal de login Telegram
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    if (loginModal) loginModal.style.display = 'none';
  });
}

// Navegación SPA
window.navigate = function(path) {
  window.history.pushState({}, '', path);
  router();
};

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
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/user/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('No se pudo cargar el perfil');
        const data = await response.json();

        document.getElementById('profile-name').innerText       = data.username;
        document.getElementById('user-avatar').src              = data.avatarUrl || '/images/default-avatar.png';
        document.getElementById('profile-characters').innerText = data.charactersCount;
        document.getElementById('profile-love').innerText       = data.totalLove;
      } catch (err) {
        console.error(err);
      }
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
      try {
        const token = localStorage.getItem('authToken');
        const [userResp, charResp] = await Promise.all([
          fetch('/api/user/me', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/characters/active', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (!userResp.ok) throw new Error(`Error datos usuario: ${userResp.status}`);
        if (!charResp.ok) throw new Error(`Error datos personaje: ${charResp.status}`);

        const [userData, charData] = await Promise.all([userResp.json(), charResp.json()]);

        const characterData = {
          ...charData,
          image_url: charData.image_url || '/images/default-character.png'
        };

        const { default: StaticApp } = await import('./game/StaticApp.js');
        const gameApp = new StaticApp('character-container', characterData, userData.user_id);

        return new Promise(resolve => {
          (function checkInit() {
            if (gameApp.container) {
              window.addEventListener('beforeunload', e => {
                if (gameApp.sessionClicks > 0) {
                  e.preventDefault();
                  e.returnValue = '';
                  gameApp.sendPendingSession();
                }
              });
              resolve();
            } else {
              setTimeout(checkInit, 50);
            }
          })();
        });
      } catch (error) {
        console.error('Error initializing game:', error);
        throw error;
      }
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
    document.getElementById('app').innerHTML = await res.text();

    document.querySelectorAll('.menu-btn[data-route]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === path);
    });

    if (route.controller) await route.controller();
  } catch (err) {
    console.error('Error loading view:', err);
    document.getElementById('app').innerHTML = `
      <div class="error-view">
        <h1>¡Error al cargar la vista!</h1>
        <p>${err.message}</p>
        <button onclick="window.navigate('/')">Volver al inicio</button>
      </div>
    `;
  }
}

function initApp() {
  document.querySelectorAll('.menu-btn[data-route]').forEach(btn => {
    btn.addEventListener('click', () => window.navigate(btn.dataset.route));
  });

  if (continueBtn) continueBtn.addEventListener('click', showTelegramLogin);
}

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  router();

  // Si ya está autenticado, ir al juego directamente
  if (localStorage.getItem('authToken')) {
    if (splashScreen) splashScreen.style.display = 'none';
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.style.display = 'flex';
    window.navigate('/game');
  }
});
