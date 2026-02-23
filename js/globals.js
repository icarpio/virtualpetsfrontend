// globals.js - Variables globales compartidas entre escenas

export const GameState = {
    score: 0,
    lives: 3,
    reset() {
        this.score = 0;
        this.lives = 3;
    }
};

// Variables para controles táctiles móviles
export const MobileControls = {
    left: false,
    right: false,
    jump: false,
    shoot: false
};

// Inicializar controles táctiles
export function initMobileControls() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');
    const btnShoot = document.getElementById('btn-shoot');

    if (btnLeft) {
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            MobileControls.left = true;
        });
        btnLeft.addEventListener('touchend', (e) => {
            e.preventDefault();
            MobileControls.left = false;
        });
    }

    if (btnRight) {
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            MobileControls.right = true;
        });
        btnRight.addEventListener('touchend', (e) => {
            e.preventDefault();
            MobileControls.right = false;
        });
    }

    if (btnJump) {
        btnJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            MobileControls.jump = true;
        });
        btnJump.addEventListener('touchend', (e) => {
            e.preventDefault();
            MobileControls.jump = false;
        });
    }

    if (btnShoot) {
        btnShoot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            MobileControls.shoot = true;
            setTimeout(() => {
                MobileControls.shoot = false;
            }, 100);
        });
    }
}