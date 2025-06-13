import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class ThreeApp {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Contenedor con ID '${containerId}' no encontrado`);
            return;
        }
        
        // Crear canvas dinámicamente
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        this.container.appendChild(this.canvas);
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true, 
            alpha: true 
        });
           
    init() {
        // Configurar renderizador
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Configurar cámara
        this.camera.position.z = 5;
        
        // Configurar iluminación
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Cargar personaje
        this.loadCharacter();
        
        // Manejar redimensionamiento
        window.addEventListener('resize', () => this.onResize());
        
        // Iniciar animación
        this.animate();
    }
    
    async loadCharacter() {
        const loader = new GLTFLoader();
        
        try {
            // Obtener modelo desde el backend
            const response = await fetch('/api/user/active-character');
            const data = await response.json();
            
            // Cargar modelo GLB
            const gltf = await loader.loadAsync(data.glbModelUrl);
            
            this.character = gltf.scene;
            this.scene.add(this.character);
            
            // Configurar animaciones
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.character);
                const action = this.mixer.clipAction(gltf.animations[0]);
                action.play();
            }
            
            // Posicionar personaje
            this.character.position.y = -1;
            this.character.scale.set(0.5, 0.5, 0.5);
            
        } catch (error) {
            console.error('Error loading character:', error);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Actualizar animaciones
        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    // Interacción de clic (para acumular amor)
    setupClickInteraction() {
        this.container.addEventListener('click', (event) => {
            // Calcular posición del clic en coordenadas normalizadas
            const rect = this.container.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            
            // Raycaster para detectar clics en el personaje
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            
            const intersects = raycaster.intersectObject(this.character, true);
            
            if (intersects.length > 0) {
                // Animación de reacción
                this.character.rotation.y += 0.1;
                
                // Enviar clic al backend
                fetch('/api/game/click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ characterId: this.character.userData.id })
                });
            }
        });
    }
}

export default ThreeApp;