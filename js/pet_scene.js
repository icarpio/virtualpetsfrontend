export default class PetScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PetScene' });

        // Estado inicial
        this.petImage = null;
        this.petImageUrl = '';
        this.petId = '';
        this.hunger = 0;
        this.energy = 0;
        this.happiness = 0;
        this.flipEvent = null;
    }

    init() {
        const container = document.getElementById("game-container");
        this.petId = container.getAttribute("data-pet-id");
        this.petImageUrl = container.getAttribute("data-pet-image");
        this.hunger = parseInt(container.getAttribute("data-hunger")) || 0;
        this.energy = parseInt(container.getAttribute("data-energy")) || 0;
        this.happiness = parseInt(container.getAttribute("data-happiness")) || 0;
        this.isSleeping = container.getAttribute("data-is-sleeping") === 'true';
        /*
        console.log('Pet Scene initialized:', {
            petId: this.petId,
            petImageUrl: this.petImageUrl,
            hunger: this.hunger,
            energy: this.energy,
            happiness: this.happiness,
            isSleeping: this.isSleeping
        });
        */
    }

    preload() {
        this.load.image('background', 'images/part1.png');

        // Cargar imagen de sleeping desde el frontend SIEMPRE
        this.load.image('sleeping', 'images/sleeping.png');

        // Si la mascota está durmiendo, no cargar su imagen normal aún
        if (this.isSleeping) {
            // Solo necesitamos la imagen de sleeping
            console.log('Pet is sleeping, loading sleeping image only');
        } else {
            // Cargar imagen de la mascota usando proxy para URLs externas
            let petUrl;
            if (this.petImageUrl.startsWith('/static/')) {
                // URL del backend Django
                petUrl = `${window.API_URL}${this.petImageUrl}`;
            } else if (this.petImageUrl.startsWith('images/')) {
                // URL local del frontend
                petUrl = this.petImageUrl;
            } else {
                // URL externa - usar proxy
                petUrl = `${window.API_URL}/pets/api/image-proxy/${encodeURIComponent(this.petImageUrl)}/`;
            }
            
            this.load.image('pet', petUrl);
        }

        // Cargar botones
        this.load.image('sleepButton', 'images/sleeping2.png');
        this.load.image('hungerButton', 'images/b1.png');
        this.load.image('energyButton', 'images/b2.png');
        this.load.image('happinessButton', 'images/b3.png');
        this.load.image('wakeupButton', 'images/alarm.png');

        // Cargar iconos
        this.load.image('hungerIcon', 'images/food.png');
        this.load.image('energyIcon', 'images/ray.png');
        this.load.image('happinessIcon', 'images/smile.png');

        // Botón de minijuego
        this.load.image('minigameButton', 'images/game.png');
         // Botón de minijuego
        this.load.image('minigameButton2', 'images/game2.png');
    }

    create() {
        // Fondo
        this.add.image(400, 300, 'background').setScale(1.5);
        
        // Crear imagen de la mascota
        if (this.isSleeping) {
            // Si está durmiendo, usar textura sleeping
            this.petImage = this.add.image(430, 240, 'sleeping');
            this.petImage.setScale(1.8);
        } else {
            // Si está despierta, usar su textura normal
            this.petImage = this.add.image(430, 240, 'pet');
            this.petImage.setScale(this.petImageUrl.startsWith('/static/') ? 1.8 : 1.7);
        }

        // Animación de flip solo si NO está durmiendo
        if (!this.isSleeping) {
            this.flipEvent = this.time.addEvent({
                delay: 1000,
                callback: () => this.petImage.toggleFlipX(),
                loop: true
            });
        }

        // Iconos de stats
        this.add.image(50, 40, 'hungerIcon').setScale(0.3);
        this.add.image(300, 40, 'energyIcon').setScale(0.3);
        this.add.image(600, 40, 'happinessIcon').setScale(0.3);

        // Textos de stats
        this.hungerText = this.add.text(90, 30, `Hambre: ${this.hunger}`, { 
            font: '20px Arial', 
            fill: '#fff' 
        });
        this.energyText = this.add.text(340, 30, `Energía: ${this.energy}`, { 
            font: '20px Arial', 
            fill: '#fff' 
        });
        this.happinessText = this.add.text(640, 30, `Felicidad: ${this.happiness}`, { 
            font: '20px Arial', 
            fill: '#fff' 
        });

        // Botones de acción
        const sleepButton = this.add.image(80, 520, 'sleepButton')
            .setInteractive()
            .setScale(0.62)
            .on('pointerdown', () => this.sleepPet());

        const hungerButton = this.add.image(240, 520, 'hungerButton')
            .setInteractive()
            .setScale(0.60)
            .on('pointerdown', () => this.increaseParam('hunger'));

        const energyButton = this.add.image(400, 520, 'energyButton')
            .setInteractive()
            .setScale(0.90)
            .on('pointerdown', () => this.increaseParam('energy'));

        const happinessButton = this.add.image(570, 520, 'happinessButton')
            .setInteractive()
            .setScale(0.60)
            .on('pointerdown', () => this.increaseParam('happiness'));

        const wakeupButton = this.add.image(720, 520, 'wakeupButton')
            .setInteractive()
            .setScale(0.62)
            .on('pointerdown', () => this.wakePet());

        // Botón de minijuego
        const minigameButton = this.add.image(720, 400, 'minigameButton')
            .setInteractive()
            .setScale(0.6);
        
        minigameButton.on('pointerdown', () => {
            this.scene.start('MinigameScene', {
                petImageUrl: this.petImageUrl,
                petId: this.petId
            });
        });

        // Botón de minijuego
        const minigameButton2 = this.add.image(80, 400, 'minigameButton2')
            .setInteractive()
            .setScale(0.6);
        
        minigameButton2.on('pointerdown', () => {
            this.scene.start('PlatformGameScene', {
                petImageUrl: this.petImageUrl,
                petId: this.petId
            });
        });

       
        }

    update() {
        this.hungerText.setText(`Hambre: ${this.hunger}`);
        this.energyText.setText(`Energía: ${this.energy}`);
        this.happinessText.setText(`Felicidad: ${this.happiness}`);
    }

    // Aumentar parámetros (hunger, energy, happiness)
    async increaseParam(param) {
        const urlMap = {
            hunger: `${window.API_URL}/pets/api/pets/${this.petId}/increase-hunger/`,
            energy: `${window.API_URL}/pets/api/pets/${this.petId}/increase-energy/`,
            happiness: `${window.API_URL}/pets/api/pets/${this.petId}/increase-happiness/`
        };

        try {
            const response = await fetch(urlMap[param], {
                method: 'POST',
                headers: window.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error al aumentar ${param}`);
            }

            const data = await response.json();
            
            // Actualizar el valor local
            this[param] = data[param];
            
            // Actualizar imagen si evolucionó
            if (data.current_image && data.current_image !== this.petImageUrl) {
                this.updatePetImage(data.current_image);
            }

            // Mostrar mensaje de evolución si existe
            if (data.message) {
                console.log('Evolution message:', data.message);
                this.showMessage(data.message);
            }

            // Actualizar datos globales
            if (window.petData) {
                window.petData[param] = data[param];
            }

        } catch (error) {
            console.error(`Error al aumentar ${param}:`, error);
        }
    }

    // Actualizar imagen de la mascota
    updatePetImage(newUrl) {
        const key = 'pet_' + Date.now();
        const game = this;

        let finalUrl;
        
        // Si la URL empieza con /static/, es del backend Django
        if (newUrl.startsWith('/static/')) {
            finalUrl = `${window.API_URL}${newUrl}`;
        }
        // Si es una ruta relativa a images/ (frontend local)
        else if (newUrl.startsWith('images/')) {
            finalUrl = newUrl;
        }
        // Si la URL ya incluye el dominio completo (http:// o https://) - USAR PROXY
        else if (newUrl.startsWith('http://') || newUrl.startsWith('https://')) {
            finalUrl = `${window.API_URL}/pets/api/image-proxy/${encodeURIComponent(newUrl)}/`;
        }
        // URLs externas sin protocolo - usar proxy
        else {
            finalUrl = `${window.API_URL}/pets/api/image-proxy/${encodeURIComponent(newUrl)}/`;
        }

        // Agregar timestamp para evitar cache (solo si no es proxy que ya tiene parámetros)
        if (!finalUrl.includes('/image-proxy/')) {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl += `${separator}nocache=${Date.now()}`;
        }

        // Remover textura anterior si existe
        if (this.textures.exists(key)) {
            this.textures.remove(key);
        }

        console.log('Updating pet image to:', finalUrl);

        // Cargar nueva textura
        this.load.image(key, finalUrl);

        this.load.once('complete', () => {
            game.petImage.setTexture(key);
            // Determinar escala basándose en si es imagen estática local
            const isLocalStatic = newUrl.includes('/static/') || newUrl.startsWith('images/');
            game.petImage.setScale(isLocalStatic ? 1.8 : 1.7);
            game.petImageUrl = newUrl;
            
            // Actualizar datos globales
            if (window.petData) {
                window.petData.current_image = newUrl;
            }
        });

        this.load.start();
    }

    // Dormir mascota
    async sleepPet() {
        try {
            const response = await fetch(`${window.API_URL}/pets/api/pets/${this.petId}/sleep/`, {
                method: 'POST',
                headers: window.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al dormir la mascota');
            }

            const data = await response.json();
            
            console.log('Pet is sleeping:', data.message);
            
            // Marcar como durmiendo
            this.isSleeping = true;
            
            // Usar la textura 'sleeping' pre-cargada desde el frontend
            this.petImage.setTexture('sleeping');
            this.petImage.setScale(1.8);

            // Detener animación de flip
            if (this.flipEvent) {
                this.flipEvent.remove();
                this.flipEvent = null;
            }

            // Actualizar energía si viene en la respuesta
            if (data.energy !== undefined) {
                this.energy = data.energy;
                if (window.petData) {
                    window.petData.energy = data.energy;
                }
            }

            this.showMessage(data.message || 'La mascota está descansando');

        } catch (error) {
            console.error('Error al dormir la mascota:', error);
        }
    }

    // Despertar mascota
    async wakePet() {
        try {
            const response = await fetch(`${window.API_URL}/pets/api/pets/${this.petId}/wake-up/`, {
                method: 'POST',
                headers: window.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al despertar la mascota');
            }

            const data = await response.json();
            
            console.log('Pet woke up:', data.message);
            
            // Marcar como despierta
            this.isSleeping = false;
            
            // Actualizar imagen
            if (data.new_pet_image_url) {
                this.updatePetImage(data.new_pet_image_url);
            }

            // Reiniciar animación de flip
            if (!this.flipEvent) {
                this.flipEvent = this.time.addEvent({
                    delay: 1000,
                    callback: () => this.petImage.toggleFlipX(),
                    loop: true
                });
            }

            // Actualizar energía si viene en la respuesta
            if (data.energy !== undefined) {
                this.energy = data.energy;
                if (window.petData) {
                    window.petData.energy = data.energy;
                }
            }

            this.showMessage(data.message || 'La mascota ha despertado');

        } catch (error) {
            console.error('Error al despertar la mascota:', error);
        }
    }

    // Mostrar mensaje temporal
    showMessage(message) {
        const messageText = this.add.text(400, 500, message, {
            font: '24px Arial',
            fill: '#ffcc03',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        
        messageText.setOrigin(0.5);

        this.time.delayedCall(3000, () => {
            messageText.destroy();
        });
    }
}