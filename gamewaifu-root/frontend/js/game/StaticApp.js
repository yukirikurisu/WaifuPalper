// frontend/js/game/StaticApp.js

export default class StaticApp {
    constructor(containerId, characterData, userId) {
        this.container = document.getElementById(containerId);
        this.characterData = characterData;
        this.userId = userId;
        this.sessionClicks = 0;
        this.sessionTimer = null;
        this.sessionDelay = 5000; // 5 segundos para enviar sesiones
        this.init();
    }
    
    init() {
        // Crear estructura de imagen
        this.createImageContainer();
        
        // Cargar imagen del personaje
        this.loadCharacterImage();
        
        // Configurar interacción de clic
        this.setupClickInteraction();
        
        // Referenciar contador
        this.counterElement = document.getElementById('total-counter');
        this.counterElement.textContent = this.characterData.current_love;
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
        this.characterImage.style.opacity = '0'; // Inicialmente invisible
        
        this.characterImage.src = this.characterData.static_image_url;
        this.imageContainer.appendChild(this.characterImage);
        
        this.characterImage.onload = () => {
            // Ajustar zoom para móviles
            if (window.innerWidth <= 768) {
                this.characterImage.style.objectFit = 'contain';
                this.characterImage.style.transform = 'scale(1.2)';
            }
            
            // Hacer visible la imagen con transición suave
            setTimeout(() => {
                this.characterImage.style.transition = 'opacity 0.5s ease';
                this.characterImage.style.opacity = '1';
            }, 50);
        };
    }
    
    setupClickInteraction() {
        const leftArea = document.querySelector('.click-area.left');
        const rightArea = document.querySelector('.click-area.right');
        
        const handleClick = () => {
            // Animación de reacción
            this.characterImage.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.characterImage.style.transform = window.innerWidth <= 768 ? 'scale(1.2)' : 'scale(1)';
            }, 200);
            
            // Incrementar contador de sesión
            this.sessionClicks++;
            
            // Mostrar contador provisional (amor actual + clics en sesión)
            this.counterElement.textContent = parseInt(this.characterData.current_love) + this.sessionClicks;
            
            // Reiniciar el temporizador de sesión
            this.resetSessionTimer();
        };
        
        leftArea.addEventListener('click', handleClick);
        rightArea.addEventListener('click', handleClick);
    }
    
    resetSessionTimer() {
        // Cancelar temporizador existente
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // Iniciar nuevo temporizador
        this.sessionTimer = setTimeout(() => {
            if (this.sessionClicks > 0) {
                this.sendClickSession();
            }
        }, this.sessionDelay);
    }
    
    sendClickSession() {
        if (this.sessionClicks === 0) return;
        
        // Preparar datos para enviar
        const sessionData = {
            userId: this.userId,
            characterId: this.characterData.character_id,
            clickCount: this.sessionClicks
        };
        
        // Enviar sesión al backend
        fetch('/api/click-sessions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(sessionData)
        })
        .then(response => response.json())
        .then(data => {
            // Actualizar amor del personaje con la respuesta
            this.characterData.current_love += data.loveGain;
            this.counterElement.textContent = this.characterData.current_love;
            
            // Reiniciar contador de sesión
            this.sessionClicks = 0;
        })
        .catch(error => {
            console.error('Error sending click session:', error);
            // Reintentar en caso de error
            this.sessionTimer = setTimeout(() => this.sendClickSession(), 2000);
        });
    }
    
    // Enviar sesión pendiente al salir
    sendPendingSession() {
        if (this.sessionClicks > 0) {
            this.sendClickSession();
        }
    }
}