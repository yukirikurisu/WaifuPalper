export function showTelegramLogin() {
  const loginModal = document.getElementById('telegram-login-modal');
  if (!loginModal) return;
  
  loginModal.style.display = 'flex';
  
  const widgetContainer = document.getElementById('telegram-login-widget');
  widgetContainer.innerHTML = '';
  
  const script = document.createElement('script');
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?21";
  
  script.setAttribute("data-telegram-login", "WaifuPalper_bot");
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "20");
  script.setAttribute("data-userpic", "false");
  script.setAttribute("data-request-access", "write");
  script.setAttribute("data-lang", "es");
 
  script.setAttribute("data-onauth", "onTelegramAuth(user)");
  
  widgetContainer.appendChild(script);
}

window.onTelegramAuth = function(user) {
  document.getElementById('telegram-login-modal').style.display = 'none';
  
  fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('telegramUser', JSON.stringify(user));
      
      if (data.isNewUser) {
        showAvatarSelection();
      } else {
        fadeOutSplashScreen();
      }
    } else {
      alert(`Error: ${data.error}`);
      showTelegramLogin();
    }
  })
  .catch(error => {
    console.error('Auth error:', error);
    alert('Error de conexión con el servidor');
    showTelegramLogin();
  });
};

function showAvatarSelection() {
  const avatarModal = document.getElementById('avatar-selection-modal');
  if (!avatarModal) {
    fadeOutSplashScreen();
    return;
  }
  
  fetch('/api/avatars')
  .then(response => response.json())
  .then(avatars => {
    const container = document.getElementById('avatar-container');
    if (!container) {
      fadeOutSplashScreen();
      return;
    }
    
    container.innerHTML = '';
    
    avatars.forEach(avatar => {
      const img = document.createElement('img');
      img.src = avatar.url;
      img.className = 'avatar-option';
      img.dataset.id = avatar.id;
      
      img.onclick = () => {
        document.getElementById('selected-avatar').src = avatar.url;
        localStorage.setItem('selectedAvatarId', avatar.id);
      };
      
      container.appendChild(img);
    });
    
    const telegramData = JSON.parse(localStorage.getItem('telegramUser') || '{}');
    if (telegramData.first_name) {
      document.getElementById('username-display').textContent = telegramData.first_name;
    }
    
    document.getElementById('confirm-avatar-btn').onclick = () => {
      const avatarId = localStorage.getItem('selectedAvatarId');
      if (avatarId) {
        updateUserAvatar(avatarId);
      } else {
        alert('Por favor selecciona un avatar');
      }
    };
    
    avatarModal.style.display = 'flex';
  })
  .catch(() => fadeOutSplashScreen());
}

function updateUserAvatar(avatarId) {
  fetch('/api/user/avatar', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ avatar: avatarId })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.removeItem('selectedAvatarId');
      document.getElementById('avatar-selection-modal').style.display = 'none';
      fadeOutSplashScreen();
    }
  })
  .catch(() => fadeOutSplashScreen());
}

function fadeOutSplashScreen() {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = 1;
    
    const gameLoadPromise = loadGameView();
    
    const fadeOut = () => {
        splash.style.opacity = parseFloat(splash.style.opacity) - 0.02;
        
        if (parseFloat(splash.style.opacity) > 0) {
            requestAnimationFrame(fadeOut);
        } else {
            splash.style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            gameLoadPromise.then(() => {}).catch(error => {
                console.error('Error loading game view:', error);
                document.getElementById('app-container').innerHTML = `
                    <div class="error">
                        <h2>Error al cargar el juego</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">Reintentar</button>
                    </div>
                `;
            });
        }
    };
    
    fadeOut();
}

async function loadGameView() {
  try {
    const response = await fetch('views/game.html');
    if (!response.ok) throw new Error('No se pudo cargar la vista del juego');
    
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const appContainer = document.getElementById('app');
    while (appContainer.firstChild) {
      appContainer.removeChild(appContainer.firstChild);
    }

    Array.from(doc.body.childNodes).forEach(node => {
      appContainer.appendChild(node);
    });

    return initGame();
  } catch (error) {
    console.error('Error loading game view:', error);
    throw error;
  }
}

async function initGame() {
  try {
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

    if (!userResponse.ok) throw new Error(`User data error: ${userResponse.status}`);
    if (!charResponse.ok) throw new Error(`Character data error: ${charResponse.status}`);

    const [userData, charData] = await Promise.all([
      userResponse.json(),
      charResponse.json()
    ]);

    // Adaptar estructura para StaticApp
    const characterData = {
      ...charData,
      // Alias para compatibilidad con vista
      character_id: charData.character_id,
      current_love: charData.current_love,
      image_url: charData.image_url,
      // Campos específicos de StaticApp
      name: charData.name,
      description: charData.description
    };

    if (!characterData.image_url) {
      characterData.image_url = '/images/default-character.png';
    }

    const { default: StaticApp } = await import('../game/StaticApp.js');
    const gameApp = new StaticApp('game-container', characterData, userData.user_id);
    
    window.addEventListener('beforeunload', (e) => {
      if (gameApp.sessionClicks > 0) {
        e.preventDefault();
        e.returnValue = '';
        gameApp.sendPendingSession();
      }
    });
    
    return new Promise((resolve, reject) => {
      gameApp.characterImage.onload = resolve;
      gameApp.characterImage.onerror = () => {
        console.error('Error cargando imagen, usando imagen por defecto');
        gameApp.characterImage.src = '/images/default-character.png';
        gameApp.characterImage.onload = resolve;
        gameApp.characterImage.onerror = reject;
      };
      
      if (gameApp.characterImage.complete) {
        resolve();
      }
    });
    
  } catch (error) {
    console.error('Game initialization error:', error);
    throw error;
  }
}

if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  try {
    if (localStorage.getItem('authToken')) {
      fadeOutSplashScreen();
    }
  } catch (error) {
    handleCriticalError(error);
  }
}