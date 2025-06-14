import { showTelegramLogin } from './auth/telegramAuth.js';

const splashScreen = document.getElementById('splash-screen');
const continueBtn = document.querySelector('.continue-btn');
const loginModal = document.getElementById('telegram-login-modal');
const closeModalBtn = document.getElementById('close-login-modal');

// Función global para navegación
window.navigate = function(path) {
  window.history.pushState({}, '', path);
  router();
};

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
      try {
        // Obtener datos del usuario y personaje
        const [userResponse, charResponse] = await Promise.all([
          fetch('/api/user/me', {
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
            }
          }),
          fetch('/api/characters/active', {
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
            }
          })
        ]);

        if (!userResponse.ok) throw new Error(`Error de datos de usuario: ${userResponse.status}`);
        if (!charResponse.ok) throw new Error(`Error de datos de personaje: ${charResponse.status}`);

        const [userData, charData] = await Promise.all([
          userResponse.json(),
          charResponse.json()
        ]);

        // Preparar datos para StaticApp
        const characterData = {
          ...charData,
          character_id: charData.character_id,
          current_love: charData.current_love,
          image_url: charData.image_url || '/images/default-character.png',
          name: charData.name,
          description: charData.description
        };

        // Importar e instanciar StaticApp con el nuevo ID de contenedor
        const { default: StaticApp } = await import('./game/StaticApp.js');
        const gameApp = new StaticApp('character-container', characterData, userData.user_id);
        
        // Esperar a que el juego esté inicializado
        return new Promise((resolve) => {
          const checkInitialization = () => {
            if (gameApp.container) {
              // Configurar manejo de cierre
              window.addEventListener('beforeunload', (e) => {
                if (gameApp.sessionClicks > 0) {
                  e.preventDefault();
                  e.returnValue = '';
                  gameApp.sendPendingSession();
                }
              });
              resolve();
            } else {
              setTimeout(checkInitialization, 50);
            }
          };
          checkInitialization();
        });
      } catch (error) {
        console.error('Error initializing game:', error);
        throw error;
        }
      }
    },
}

async function router() {
  const path = window.location.pathname;
  const route = routes[path] || routes['404'];
  
  try {
    // Cargar vista HTML
    const res = await fetch(`/views/${route.view}.html`);
    if (!res.ok) throw new Error('Vista no encontrada');
    
    const html = await res.text();
    document.getElementById('app').innerHTML = html;
    
    // Inicializar controlador si existe
    if (route.controller) {
      await route.controller();
    }
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
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      if (route) {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.navigate(route);
      }
    });
  });

  if (continueBtn) {
    continueBtn.addEventListener('click', showTelegramLogin);
  }
}

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  router();
});

// Si ya está autenticado, ir directamente al juego
if (localStorage.getItem('authToken')) {
  if (splashScreen) splashScreen.style.display = 'none';
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.style.display = 'flex';
  window.navigate('/game');
}