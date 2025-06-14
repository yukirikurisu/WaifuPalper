// Elements
const splashScreen = document.getElementById('splash-screen');
const continueBtn = document.querySelector('.continue-btn');
const loginModal = document.getElementById('telegram-login-modal');
const closeModalBtn = document.getElementById('close-login-modal');

// Cerrar modal
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
  });
}


const routes = {
  '/': {
    view: 'home',
    controller: null 
  },
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
      const module = await import('./StaticApp.js');
      return new module.gameService();
    }
  },
  '404': {
    view: '404',
    controller: null
  }
};

async function router() {
  const path = window.location.pathname;
  const route = routes[path] || routes['404'];
  
  try {
    // Cargar la vista HTML
    const res = await fetch(`/frontend/views/${route.view}.html`);
    const html = await res.text();
    document.getElementById('app').innerHTML = html;
    
    // Inicializar el controlador si existe
    if (route.controller) {
      await route.controller();
    }
  } catch (err) {
    console.error('Error loading view:', err);
    document.getElementById('app').innerHTML = '<h1>Error loading view</h1>';
  }
}


// Función para navegar
function navigate(path) {
  window.history.pushState({}, '', path);
  router();
}

// Inicializar menú y eventos
function initApp() {
  // Menú inferior
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      if (route) {
        // Actualizar botón activo
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Navegar a la ruta
        navigate(route);
      }
    });

    // Botón continuar
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        showTelegramLogin();
      });
    }
  }
}


// Eventos globales
window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', () => {
  router();
  initApp();
});

// Si ya está autenticado, ocultar splash screen
if (localStorage.getItem('authToken')) {
  splashScreen.style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';
  navigate('/game');
}