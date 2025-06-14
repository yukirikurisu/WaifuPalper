export default class StaticApp {
    constructor(containerId, characterData, userId) {
        this.containerId = containerId || 'character-container';
        this.characterData = characterData || {};
        this.userId = userId || '';
        this.sessionClicks = 0;
        this.sessionTimer = null;
        this.sessionDelay = 5000;
        
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
        
        // Configurar contador primero
        this.setupCounter();
        
        // Crear estructura de imagen
        this.createImageContainer();
        
        // Cargar imagen del personaje
        this.loadCharacterImage();
        
        // Configurar interacción de clic
        this.setupClickInteraction();
    }
    
    setupCounter() {
        this.counterElement = document.getElementById('total-counter');
        if (this.counterElement) {
            this.counterElement.textContent = this.characterData.current_love || '0';
        } else {
            console.error('Elemento contador no encontrado');
        }
        
        // Asegurar que el contador esté encima de la imagen
        const counterWrapper = document.getElementById('total-counter-wrapper');
        if (counterWrapper) {
            counterWrapper.style.zIndex = '20';
        }
    }
    
    createImageContainer() {
        // Crear contenedor para la imagen
        this.imageContainer = document.createElement('div');
        this.imageContainer.id = 'character-image-container';
        this.imageContainer.style.position = 'absolute';
        this.imageContainer.style.top = '0';
        this.imageContainer.style.left = '0';
        this.imageContainer.style.width = '100%';
        this.imageContainer.style.height = '100%';
        this.imageContainer.style.overflow = 'hidden';
        this.imageContainer.style.zIndex = '1';
        
        // Insertar en el contenedor del juego
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

        // Usar imagen por defecto si no hay URL
        this.characterImage.src = this.characterData.image_url || '/images/default-character.png';
        this.imageContainer.appendChild(this.characterImage);
        
        this.characterImage.onload = () => {
            // Ajustar para móviles
            if (window.innerWidth <= 768) {
                this.characterImage.style.objectFit = 'contain';
                this.characterImage.style.transform = 'scale(1.2)';
            }
            
            // Mostrar progresivamente
            setTimeout(() => {
                this.characterImage.style.transition = 'opacity 0.5s ease';
                this.characterImage.style.opacity = '1';
            }, 50);
        };

        this.characterImage.onerror = () => {
            console.error('Error cargando imagen, usando imagen por defecto');
            this.characterImage.src = '/images/default-character.png';
        };
    }
    
    setupClickInteraction() {
        const leftArea = document.querySelector('.click-area.left');
        const rightArea = document.querySelector('.click-area.right');
        
        if (!leftArea || !rightArea) {
            console.error('Áreas de clic no encontradas');
            return;
        }
        
        const handleClick = () => {
            // Animación de reacción
            this.characterImage.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.characterImage.style.transform = window.innerWidth <= 768 ? 'scale(1.2)' : 'scale(1)';
            }, 200);
            
            // Incrementar contador
            this.sessionClicks++;
            
            // Actualizar contador provisional
            if (this.counterElement) {
                this.counterElement.textContent = parseInt(this.characterData.current_love) + this.sessionClicks;
            }
            
            // Reiniciar temporizador
            this.resetSessionTimer();
        };
        
        leftArea.addEventListener('click', handleClick);
        rightArea.addEventListener('click', handleClick);
    }
    
    resetSessionTimer() {
        if (this.sessionTimer) clearTimeout(this.sessionTimer);
        this.sessionTimer = setTimeout(() => {
            if (this.sessionClicks > 0) this.sendClickSession();
        }, this.sessionDelay);
    }
    
    sendClickSession() {
        if (this.sessionClicks === 0) return;
        
        const sessionData = {
            userId: this.userId,
            characterId: this.characterData.user_character_id,
            clickCount: this.sessionClicks
        };
        
        fetch('/api/click-sessions', {
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
            
            this.sessionClicks = 0;
        })
        .catch(error => {
            console.error('Error sending click session:', error);
            this.sessionTimer = setTimeout(() => this.sendClickSession(), 2000);
        });
    }

    showResentmentWarning() {
        console.warn('¡Personaje resentido! El amor ganado se reduce al 10%');
        // Implementar UI de advertencia aquí
    }
    
    sendPendingSession() {
        if (this.sessionClicks > 0) this.sendClickSession();
    }
}