import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { GameEngine, Character } from './engine/engine.js';
import { UrbanScene } from './engine/UrbanScene.js';

class MyGame extends GameEngine {
    constructor() {
        super({
            movementSpeed: 150.0,
            mouseSensitivity: 0.002,
            maxInteractionDistance: 5
        });
    }

    async init() {
        super.init();
        this.setupScene();
        await this.setupCharacters();
        
        // Restore camera state after initialization
        try {
            const savedState = JSON.parse(localStorage.getItem('gameState'));
            if (savedState?.camera) {
                // Restore position
                this.camera.position.set(
                    savedState.camera.position.x,
                    savedState.camera.position.y,
                    savedState.camera.position.z
                );
                
                // Restore rotation
                this.rotationX = savedState.camera.rotation.x;
                this.rotationY = savedState.camera.rotation.y;
                this.euler.x = this.rotationX;
                this.euler.y = this.rotationY;
                this.camera.quaternion.setFromEuler(this.euler);
            }
        } catch (error) {
            console.warn('Failed to restore camera state:', error);
        }
    }

    setupScene() {
        const urbanScene = new UrbanScene(this.scene);
        urbanScene.init();
    }

    async setupCharacters() {
        try {
            // Load Affan character from JSON
            const affan = await Character.loadFromJson('./assets/characters/affan/affan.json');
            
            // Position Affan in the scene
            affan.position.set(-10, 1.5, -4);
            this.addObject(affan);
        } catch (error) {
            console.error('Failed to setup characters:', error);
        }
    }
}

// Initialize and start the game
const game = new MyGame();
// Make the game instance globally available for the reload script
window.game = game;
game.init().then(() => {
    game.start();
}).catch(error => {
    console.error('Failed to initialize game:', error);
}); 