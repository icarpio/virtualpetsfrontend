export default class MinigameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MinigameScene' });
    }

    init(data) {
        this.petImageUrl = data.petImageUrl;
        this.petId = data.petId;
        this.isSpinning = false;
        this.flipEvent = null;
        
        console.log('Minigame initialized with:', {
            petId: this.petId,
            petImageUrl: this.petImageUrl
        });
    }

    preload() {
        const staticImages = {
            minigameBg: 'images/part3.png',
            energy: 'images/b2.png',
            hunger: 'images/food.png',
            happiness: 'images/smile.png',
            cherry: 'images/cherries.png',
            diamond: 'images/diamond.png',
        };

        // Cargar imágenes estáticas
        Object.entries(staticImages).forEach(([key, path]) => {
            this.load.image(key, path);
        });
        
        // Cargar imagen de la mascota usando proxy para URLs externas
        let petUrl;
        if (this.petImageUrl.startsWith('/static/') || this.petImageUrl.startsWith('images/')) {
            petUrl = this.petImageUrl;
        } else {
            // Usar proxy para URLs externas - URL CORREGIDA
            petUrl = `${window.API_URL}/pets/api/image-proxy/${encodeURIComponent(this.petImageUrl)}/`;
        }
        
        console.log('Loading minigame pet image from:', petUrl);
        // Cargar con la clave 'petMinigame'
        this.load.image('petMinigame', petUrl);
    }

    create() {
        // Fondo
        this.add.image(400, 300, 'minigameBg').setScale(1.5);
        
        // Mascota - usar 'petMinigame' en lugar de this.petKey
        this.pet = this.add.image(400, 340, 'petMinigame').setScale(0.9);

        // Título
        this.add.text(310, 80, '¡PET SLOT!', {
            font: '32px Arial',
            fill: '#ffffff'
        });

        // Botón Volver
        this.createButton('Volver', 350, 550, '#00ffcc', () => {
            // Volver a PetScene
            this.scene.start('PetScene');
        });

        // Símbolos disponibles para el minijuego
        this.symbols = ['energy', 'hunger', 'happiness', 'cherry', 'diamond'];

        // Crear slots iniciales
        this.slots = [];
        const iconSize = 0.8;
        const spacing = 120;
        
        for (let i = 0; i < 3; i++) {
            const slot = this.add.image(280 + i * spacing, 200, 'cherry').setScale(iconSize);
            this.slots.push(slot);
        }

        // Botón Girar
        this.createButton('Spin🎰', 340, 470, '#ffffff', () => this.spinSlots(), '#00cc99', 28);
    }

    createButton(text, x, y, fill, callback, bgColor = '#000', fontSize = 24) {
        this.add.text(x, y, text, {
            font: `${fontSize}px Arial`,
            fill,
            backgroundColor: bgColor,
            padding: { x: 15, y: 10 }
        }).setInteractive().on('pointerdown', callback);
    }
    
    spinSlots() {
        if (this.isSpinning) return;
        this.isSpinning = true;
    
        const spinDuration = 1500;
        const spinInterval = 100;
        const results = [];
        let completed = 0;
    
        // Inicia la animación de flip de la mascota
        this.flipEvent = this.time.addEvent({
            delay: 400,
            callback: () => this.pet.toggleFlipX(),
            loop: true
        });
    
        this.slots.forEach((slot, index) => {
            const spinTime = spinDuration + index * 300;
    
            this.time.addEvent({
                delay: spinInterval,
                callback: () => {
                    const randomSymbol = Phaser.Utils.Array.GetRandom(this.symbols);
                    slot.setTexture(randomSymbol);
                },
                repeat: Math.floor(spinTime / spinInterval)
            });
    
            // Finaliza el spin y selecciona el símbolo real
            this.time.delayedCall(spinTime + spinInterval, () => {
                const finalSymbol = Phaser.Utils.Array.GetRandom(this.symbols);
                slot.setTexture(finalSymbol);
                results[index] = finalSymbol;
    
                completed++;
    
                if (completed === this.slots.length) {
                    // Detener el flip de la mascota
                    if (this.flipEvent) {
                        this.flipEvent.remove();
                        this.flipEvent = null;
                    }
    
                    this.time.delayedCall(300, () => {
                        this.evaluateResults(results);
                        this.isSpinning = false;
                    });
                }
            });
        });
    }

    async evaluateResults(results) {
        console.log('Símbolos obtenidos:', results);
        
        const allEqual = results.every(symbol => symbol === results[0]);
    
        if (allEqual) {
            const symbol = results[0].trim().toLowerCase();
    
            if (symbol === 'cherry') {
                console.log('Cherry detectado. Incrementando los tres parámetros');
                
                // Aumentar los tres parámetros uno por uno
                const params = ['energy', 'hunger', 'happiness'];
                for (const param of params) {
                    await this.increaseParameter(param);
                }
    
                // Mostrar mensaje visual
                const bonusText = this.add.text(250, 470, `¡CHERRY BONUS +9+9+9!`, {
                    font: '24px Arial',
                    fill: '#ff66ff',
                    backgroundColor: '#000',
                    padding: { x: 10, y: 5 }
                });
                this.time.delayedCall(2000, () => bonusText.destroy());
    
            } else if (symbol === 'diamond') {
                console.log('Diamond detectado. Triple bonus!');
                
                // Aumentar cada parámetro 3 veces (27 puntos total)
                const params = ['energy', 'hunger', 'happiness'];
                for (const param of params) {
                    await this.increaseParameter(param);
                    await this.increaseParameter(param);
                    await this.increaseParameter(param);
                }
    
                const bonusText = this.add.text(220, 470, `¡DIAMOND BONUS x3 +27+27+27!`, {
                    font: '24px Arial',
                    fill: '#00ffff',
                    backgroundColor: '#000',
                    padding: { x: 10, y: 5 }
                });
                this.time.delayedCall(2500, () => bonusText.destroy());
    
            } else {
                // Símbolos normales: energy, hunger, happiness
                const validParams = ['energy', 'hunger', 'happiness'];
                if (validParams.includes(symbol)) {
                    await this.increaseParameter(symbol);
                    
                    const bonusText = this.add.text(300, 470, `¡${symbol.toUpperCase()} +9!`, {
                        font: '24px Arial',
                        fill: '#ffff00',
                        backgroundColor: '#000',
                        padding: { x: 10, y: 5 }
                    });
                    this.time.delayedCall(2000, () => bonusText.destroy());
                } else {
                    console.log(`Tres iguales de ${symbol}, sin efecto.`);
                }
            }
        } else {
            console.log('No hay tres símbolos iguales. No se otorga bono.');
        }
    }
    
    // Aumentar parámetro usando la API REST
    async increaseParameter(param) {
        const urlMap = {
            energy: `${window.API_URL}/pets/api/pets/${this.petId}/increase-energy/`,
            hunger: `${window.API_URL}/pets/api/pets/${this.petId}/increase-hunger/`,
            happiness: `${window.API_URL}/pets/api/pets/${this.petId}/increase-happiness/`
        };

        const url = urlMap[param];
        
        if (!url) {
            console.error(`Parámetro inválido: ${param}`);
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: window.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error al aumentar ${param}`);
            }

            const data = await response.json();
            console.log(`${param} actualizado:`, data[param]);

            // Actualizar datos globales si existen
            if (window.petData) {
                window.petData[param] = data[param];
                
                // Si la mascota evolucionó, actualizar imagen
                if (data.current_image && data.current_image !== window.petData.current_image) {
                    window.petData.current_image = data.current_image;
                    console.log('¡La mascota ha evolucionado!', data.message);
                }
            }

            return data;

        } catch (error) {
            console.error(`Error al aumentar ${param}:`, error);
            throw error;
        }
    }
}