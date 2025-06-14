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
        // Ir directamente al juego
        window.navigate('/game');
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
    window.navigate('/game');
    return;
  }
  
  fetch('/api/avatars')
  .then(response => response.json())
  .then(avatars => {
    const container = document.getElementById('avatar-container');
    if (!container) {
      window.navigate('/game');
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
  .catch(() => window.navigate('/game'));
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
      window.navigate('/game');
    }
  })
  .catch(() => window.navigate('/game'));
}