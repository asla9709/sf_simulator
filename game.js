import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { GameEngine, Character } from './engine.js';
import { UrbanScene } from './UrbanScene.js';

class MyGame extends GameEngine {
    constructor() {
        super({
            movementSpeed: 150.0,
            mouseSensitivity: 0.002,
            maxInteractionDistance: 5
        });
    }

    init() {
        super.init();
        this.setupScene();
        this.setupCharacters();
        
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

    setupCharacters() {

        // Add Affan character
        const affanDialogue = [
            [
                "Hi there! I'm Affan.",
                "AI is pretty cool.",
                "Can't wait until I can talk to my computer like I talk to you!",
            ],
            [
                "Never really liked Elon but I always respected him.",
                "This DOGE stuff is pretty scary though.",
                "Call me a hater but I'm more of a Bitcoin guy myself.",
            ],
            [
                "Have you checked out the new AI models?",
                "They're kinda cute, I've been trying to rizz them up.",
                "Haven't made any progress yet though.",
                "I'm not really sure what I'm doing here.",
            ],
            [
                "Stop listening to Clairo and start listening to Kendrick Lamar.",
                "Enough with the softboy vibes. You need to turn into a hard man."
            ]
            [
                "I gotta go now, It's time for taraweeh.",
            ]
        ];

        // Create a texture loader
        const textureLoader = new THREE.TextureLoader();
        const affanTextures = {
            idle: textureLoader.load('affan2.png'),
            talking: [
                textureLoader.load('affan3.png'),
                textureLoader.load('affan1.png')
            ]
        };

        // Create materials for each state
        const affanMaterials = {
            idle: new THREE.MeshBasicMaterial({ 
                map: affanTextures.idle,
                transparent: true,
                side: THREE.DoubleSide
            }),
            talking: [
                new THREE.MeshBasicMaterial({ 
                    map: affanTextures.talking[0],
                    transparent: true,
                    side: THREE.DoubleSide
                }),
                new THREE.MeshBasicMaterial({ 
                    map: affanTextures.talking[1],
                    transparent: true,
                    side: THREE.DoubleSide
                })
            ]
        };

        // Create a plane geometry that matches the aspect ratio of the images
        const affanGeometry = new THREE.PlaneGeometry(1.5, 3);

        const affan = new Character(
            affanGeometry,
            affanMaterials,  // Pass the materials object instead of a single material
            "Affan",
            affanDialogue
        );
        
        // Position Affan in the scene
        affan.position.set(-10, 1.5, -4);
        this.addObject(affan);
    }
}

// Initialize and start the game
const game = new MyGame();
// Make the game instance globally available for the reload script
window.game = game;
game.init();
game.start(); 