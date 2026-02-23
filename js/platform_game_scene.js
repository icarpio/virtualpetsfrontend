export default class PlatformGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlatformGameScene' });
    }

    init(data) {
        this.petImageUrl = data.petImageUrl;
        this.petId = data.petId;
        this.enemyImages = [];
        this.gameOver = false;
        this.levelComplete = false;
        this.score = 0;
        this.lives = 3;
        this.enemiesLoaded = false;
    }

    preload() {
        // BASE
        this.load.image('ground', 'images/mg2/wall.png');
        this.load.image('platform', 'images/mg2/wall.png');
        this.load.image('coin', 'images/mg2/coin.png');
        this.load.image('flag', 'images/mg2/flag.png');
        // Partículas para explosión
        this.load.image('explosionParticle', 'images/mg2/explosion.png');

        // PLAYER
        const playerUrl = this.petImageUrl.startsWith('/static/') || this.petImageUrl.startsWith('images/')
            ? this.petImageUrl
            : `${window.API_URL}/pets/api/image-proxy/${encodeURIComponent(this.petImageUrl)}/`;

        this.load.image('player', playerUrl);

        // ENEMIES (dinámico)
        fetch(`${window.API_URL}/pets/api/random-pet-images/`, {
            headers: window.getAuthHeaders()
        })
            .then(res => res.json())
            .then(data => {
                this.enemyImages = data.enemy_images || [];

                this.enemyImages.forEach((url, index) => {
                    const enemyUrl = url.startsWith('/static/') || url.startsWith('images/')
                        ? url
                        : `${window.API_URL}/pets/api/image-proxy/${encodeURIComponent(url)}/`;

                    this.load.image(`enemy_${index}`, enemyUrl);
                });

                this.load.start();
            });
    }

    createPlatform(x, y, length) {
        const startX = x;
        const endX = x + (length * 32);

        for (let i = 0; i < length; i++) {
            this.platforms.create(x + i * 32 + 16, y, 'platform');
        }

        return { minX: startX, maxX: endX, maxY: y };
    }

    create() {
        this.cameras.main.setBackgroundColor('#5c94fc');

        // ================= PLATAFORMAS =================
        this.platforms = this.physics.add.staticGroup();

        for (let i = 0; i < 25; i++) {
            this.platforms.create(i * 32 + 16, 584, 'ground');
        }

        // 10 plataformas organizadas en un recorrido ascendente
        this.plat1 = this.createPlatform(100, 500, 3);   // Inicio izquierda-baja
        this.plat2 = this.createPlatform(240, 460, 4);   // Sube ligeramente derecha
        this.plat3 = this.createPlatform(480, 420, 4);   // Plataforma más larga
        this.plat4 = this.createPlatform(160, 380, 4);   // Regresa a la izquierda
        this.plat5 = this.createPlatform(400, 340, 4);   // Centro-medio
        this.plat6 = this.createPlatform(600, 300, 4);   // Derecha-alto
        this.plat7 = this.createPlatform(220, 260, 4);   // Izquierda-más alto
        this.plat8 = this.createPlatform(500, 220, 3);   // Derecha-muy alto
        this.plat9 = this.createPlatform(320, 180, 4);   // Centro-casi arriba
        this.plat10 = this.createPlatform(650, 140, 4);  // Final derecha-arriba

        // ================= JUGADOR =================
        this.player = this.physics.add.sprite(50, 450, 'player');
        this.player.setBounce(0.1);
        this.player.setScale(0.18);
        this.player.setCollideWorldBounds(true);
        this.player.invulnerable = false;

        // ================= MONEDAS =================
        this.coins = this.physics.add.group();

        const coinPositions = [
            { x: 120, y: 400 },   // Cerca plat1
            { x: 350, y: 390 },   // Cerca plat2
            { x: 240, y: 300 },   // Cerca plat4
            { x: 450, y: 270 },   // Cerca plat5
            { x: 680, y: 230 },   // Cerca plat6
            { x: 310, y: 200 },   // Cerca plat7
            { x: 570, y: 160 },   // Cerca plat8
            { x: 410, y: 120 },   // Cerca plat9
            { x: 730, y: 90 }     // Cerca plat10 (extra desafío)
        ];
        

        coinPositions.forEach(pos => {
            this.coins.create(pos.x, pos.y, 'coin')
                .setBounce(0.3)
                .setScale(0.8);
        });

        // ================= ENEMIGOS =================
        this.enemies = this.physics.add.group();

        // ================= META =================
        this.flag = this.physics.add.staticSprite(750, 550, 'flag');
        this.flag.setScale(1.1);

        // ================= COLISIONES =================
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.coins, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        // IMPORTANTE: usar overlap para interacciones
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, null, this);
        this.physics.add.overlap(this.player, this.flag, this.reachFlag, null, this);

        // ================= CONTROLES =================
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // ================= UI =================
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 4
        });

        this.livesText = this.add.text(16, 48, 'Lives: 3', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 4
        });

        // Crear enemigos cuando terminen de cargar
        this.load.on('complete', () => {
            if (!this.enemiesLoaded && this.enemyImages.length > 0) {
                this.createEnemiesAfterLoad();
                this.enemiesLoaded = true;
            }
        });
         // ================= PARTICULAS EXPLOSION =================
        this.explosionParticles = this.add.particles('explosionParticle');
        this.explosionEmitter = this.explosionParticles.createEmitter({
            x: 0,
            y: 0,
            speed: { min: -300, max: 300 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 300,
            quantity: 20,
            on: false
        });

        // Dentro de PlatformGameScene.create()
        const backButton = document.querySelector('.btn-back');
        if (backButton) {
            backButton.textContent = 'Ver Mascota';
            backButton.href = '#'; // evitar recarga
            backButton.onclick = () => {
                // Redirige al detalle de la mascota que estás jugando
                window.location.href = `pet_detail.html#id=${this.petId}`;
            };
        }

        
    }

    // ================= CREAR ENEMIGOS =================
    createEnemiesAfterLoad() {
     // Suelo
    this.createEnemy(200, { minX: 0, maxX: 800, maxY: 584 }, 'normal', 0);
    this.createEnemy(600, { minX: 0, maxX: 800, maxY: 584 }, 'normal', 1);
    
    // Plataformas bajas
    this.createEnemy(180, this.plat1, 'normal', 2);
    this.createEnemy(360, this.plat2, 'normal', 3);
    
    // Plataformas medias
    this.createEnemy(560, this.plat3, 'jumper', 4);
    this.createEnemy(240, this.plat4, 'normal', 5);
    this.createEnemy(480, this.plat5, 'normal', 6);
    
    // Plataformas altas
    this.createEnemy(680, this.plat6, 'jumper', 7);
    this.createEnemy(300, this.plat7, 'normal', 8);
    this.createEnemy(580, this.plat8, 'jumper', 9);
    }

    createEnemy(x, platformLimits, type = 'normal', imageIndex = 0) {
        if (this.enemyImages.length === 0) return;

        const enemyKey = `enemy_${imageIndex % this.enemyImages.length}`;

        // Crear justo encima de la plataforma
        const enemy = this.enemies.create(x, platformLimits.maxY - 100, enemyKey);

        enemy.setScale(0.2);
        enemy.setBounce(0);
        enemy.setCollideWorldBounds(true);
        enemy.setGravityY(500);

        // Ajustar tamaño del cuerpo al sprite
        enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8);
        enemy.body.setOffset(enemy.width * 0.1, enemy.height * 0.2);

        // IA
        enemy.speed = 80;
        enemy.direction = 1;
        const halfWidth = enemy.displayWidth / 2;
        enemy.minX = platformLimits.minX + halfWidth;
        enemy.maxX = platformLimits.maxX - halfWidth;
        enemy.type = type;

        // Enemigo saltador
        if (type === 'jumper') {
            enemy.jumpTimer = this.time.addEvent({
                delay: 2000,
                loop: true,
                callback: () => {
                    if (enemy.body.blocked.down) {
                        enemy.setVelocityY(-320);
                    }
                }
            });
        }
    }

    // ================= RECOGER MONEDA =================
    collectCoin(player, coin) {
        coin.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
    }

    // ================= COLISIÓN CON ENEMIGO =================
    handleEnemyCollision(player, enemy) {
        // El jugador salta sobre el enemigo (lo aplasta)
        if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {

               // Explosión
        this.explosionEmitter.setPosition(enemy.x, enemy.y);
        this.explosionEmitter.explode(20);
            enemy.disableBody(true, true);
            player.setVelocityY(-300);
            this.score += 20;
            this.scoreText.setText('Score: ' + this.score);
            
            // Destruir el timer si era jumper
            if (enemy.jumpTimer) {
                enemy.jumpTimer.destroy();
            }
        } 
        // El jugador choca lateralmente (recibe daño)
        else if (!player.invulnerable) {
            this.hitPlayer(player);
        }
    }

    // ================= RECIBIR DAÑO =================
    hitPlayer(player) {
        this.lives--;
        this.livesText.setText('Lives: ' + this.lives);
        
        player.invulnerable = true;
        
        // Efecto visual de parpadeo
        this.tweens.add({
            targets: player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                player.alpha = 1;
                player.invulnerable = false;
            }
        });

        // Empujar al jugador hacia atrás
        if (player.x < 400) {
            player.setVelocityX(200);
        } else {
            player.setVelocityX(-200);
        }

        if (this.lives <= 0) {
            this.gameOver = true;
            this.gameOverSequence();
        }
    }

    // ================= GAME OVER =================
    gameOverSequence() {
        this.physics.pause();
        this.player.setTint(0xff0000);
        
        const gameOverText = this.add.text(400, 300, 'GAME OVER', {
            fontSize: '64px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 8
        });
        gameOverText.setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }

    // ================= LLEGAR A LA META =================
    reachFlag() {
        if (this.levelComplete) return;
        
        this.levelComplete = true;
        this.physics.pause();
        
        const winText = this.add.text(400, 300, 'LEVEL COMPLETE!', {
            fontSize: '48px',
            fill: '#0f0',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 6
        });
        winText.setOrigin(0.5);

        const finalScoreText = this.add.text(400, 360, 'Final Score: ' + this.score, {
            fontSize: '32px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 4
        });
        finalScoreText.setOrigin(0.5);
         // Aumentar felicidad al llegar a la meta
        this.increaseParam('happiness');
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

    // ================= UPDATE =================
    update() {
        if (this.gameOver || this.levelComplete) return;

        // Movimiento del jugador
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }

        // Salto
        if ((this.cursors.up.isDown || this.spaceKey.isDown) && this.player.body.blocked.down) {
            this.player.setVelocityY(-400);
        }

        // IA enemigos
        this.enemies.children.iterate((enemy) => {
            if (!enemy || !enemy.active) return;

            if (enemy.x <= enemy.minX) enemy.direction = 1;
            if (enemy.x >= enemy.maxX) enemy.direction = -1;

            enemy.setVelocityX(enemy.speed * enemy.direction);
        });
    }
}