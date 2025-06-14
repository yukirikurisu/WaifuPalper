class StaticApp {
  constructor(containerId, characterData, userId) {
    this.containerId = containerId || 'character-container';
    this.characterData = characterData || {};
    this.userId = userId || '';
    this.sessionClicks = 0;
    this.sessionTimer = null;
    this.inactivityTimer = null;
    this.sessionDelay = 10000; // 10s de inactividad
    this.maxSessionTime = 60000; // 60s máximo por sesión
    this.sessionStartTime = 0;
    
    if (document.readyState === 'complete') {
      this.init();
    } else {
      document.addEventListener('DOMContentLoaded', this.init.bind(this));
    }
  }
  
  init() {
    this.container = document.getElementById(this.containerId);
    
    if (!this.container) {
      console.error(`Contenedor '${this.containerId}' no encontrado`);
      return;
    }
    
    // Configurar contador
    this.setupCounter();
    
    // Crear estructura de imagen
    this.createImageContainer();
    
    // Cargar imagen del personaje
    this.loadCharacterImage();
    
    // Configurar interacción de clic
    this.setupClickInteraction();
    
    // Configurar temporizador de sesión máxima
    this.resetMaxSessionTimer();
  }
  
  setupCounter() {
    this.counterElement = document.getElementById('total-counter');
    if (this.counterElement) {
      this.counterElement.textContent = this.characterData.current_love || '0';
    }
  }
  
  createImageContainer() {
    this.imageContainer = document.createElement('div');
    this.imageContainer.id = 'character-image-container';
    this.imageContainer.style.position = 'absolute';
    this.imageContainer.style.top = '0';
    this.imageContainer.style.left = '0';
    this.imageContainer.style.width = '100%';
    this.imageContainer.style.height = '100%';
    this.imageContainer.style.overflow = 'hidden';
    this.imageContainer.style.zIndex = '1';
    this.container.appendChild(this.imageContainer);
  }
  
  loadCharacterImage() {
    this.characterImage = document.createElement('img');
    this.characterImage.id = 'character-static-image';
    this.characterImage.style.width = '100%';
    this.characterImage.style.height = '100%';
    this.characterImage.style.objectFit = 'cover';
    this.characterImage.style.objectPosition = 'center';
    this.characterImage.style.transition = 'transform 0.2s ease';
    this.characterImage.style.opacity = '0';
    this.characterImage.src = this.characterData.image_url || '/images/default-character.png';
    this.imageContainer.appendChild(this.characterImage);
    
    this.characterImage.onload = () => {
      if (window.innerWidth <= 768) {
        this.characterImage.style.objectFit = 'contain';
        this.characterImage.style.transform = 'scale(1.2)';
      }
      setTimeout(() => {
        this.characterImage.style.transition = 'opacity 0.5s ease';
        this.characterImage.style.opacity = '1';
      }, 50);
    };
  }
  
  setupClickInteraction() {
    const leftArea = document.querySelector('.click-area.left');
    const rightArea = document.querySelector('.click-area.right');
    
    if (!leftArea || !rightArea) {
      console.error('Áreas de clic no encontradas');
      return;
    }
    
    // Último tiempo de clic para prevenir dobles registros
    this.lastClickTime = 0;
    const minClickInterval = 200; // 200ms entre clics
    
    const handleClick = () => {
      const now = Date.now();
      
      // Prevenir clics demasiado rápidos
      if (now - this.lastClickTime < minClickInterval) {
        return;
      }
      
      this.lastClickTime = now;
      
      // Incrementar contador
      this.sessionClicks++;
      
      // Actualizar contador provisional
      if (this.counterElement) {
        this.counterElement.textContent = parseInt(this.characterData.current_love) + this.sessionClicks;
      }
      
      // Reiniciar temporizadores
      this.resetInactivityTimer();
      this.resetMaxSessionTimer();
    };
    
    leftArea.addEventListener('click', handleClick);
    rightArea.addEventListener('click', handleClick);
  }
  
  resetInactivityTimer() {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = setTimeout(() => {
      if (this.sessionClicks > 0) this.sendClickSession();
    }, this.sessionDelay);
  }
  
  resetMaxSessionTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.sessionStartTime = Date.now();
    this.inactivityTimer = setTimeout(() => {
      if (this.sessionClicks > 0) this.sendClickSession();
    }, this.maxSessionTime);
  }
  
  sendClickSession() {
    if (this.sessionClicks === 0) return;
    
    const sessionData = {
      userId: this.userId,
      characterId: this.characterData.user_character_id,
      clickCount: this.sessionClicks
    };
    
    fetch('/api/clicks/sessions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(sessionData)
    })
    .then(response => {
      if (!response.ok) throw new Error('Error en la respuesta del servidor');
      return response.json();
    })
    .then(data => {
      // Actualizar amor
      this.characterData.current_love = data.newLove;
      if (this.counterElement) {
        this.counterElement.textContent = data.newLove;
      }
      
      // Mostrar advertencia si está resentido
      if (data.isResentful) {
        this.showResentmentWarning();
      }
      
      // Reiniciar contador de sesión
      this.sessionClicks = 0;
      
      // Reiniciar temporizador de sesión máxima
      this.resetMaxSessionTimer();
    })
    .catch(error => {
      console.error('Error sending click session:', error);
      // Reintentar después de 2 segundos
      setTimeout(() => this.sendClickSession(), 2000);
    });
  }
  
  showResentmentWarning() {
    console.warn('¡Personaje resentido! El amor ganado se reduce al 10%');
    // Podrías añadir aquí una notificación visual al usuario
    const warning = document.createElement('div');
    warning.textContent = '¡Personaje resentido! Amor reducido';
    warning.style.position = 'absolute';
    warning.style.bottom = '120px';
    warning.style.left = '0';
    warning.style.width = '100%';
    warning.style.textAlign = 'center';
    warning.style.color = '#ff6b6b';
    warning.style.fontWeight = 'bold';
    warning.style.zIndex = '30';
    document.querySelector('.game-container').appendChild(warning);
    
    setTimeout(() => {
      warning.remove();
    }, 3000);
  }
  
  // Método para enviar sesión pendiente al salir
  sendPendingSession() {
    if (this.sessionClicks > 0) {
      this.sendClickSession();
    }
  }
}
export default StaticApp;