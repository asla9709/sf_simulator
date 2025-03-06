import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Core engine classes and functionality
const CHARACTER_STATES = {
    IDLE: 'idle',
    TALKING: 'talking'
};

class InteractableObject extends THREE.Mesh {
    constructor(geometry, material, interactionText) {
        super(geometry, material);
        this.userData.interactable = true;
        this.userData.interactionText = interactionText;
    }

    interact() {
        // Base interaction method - override in subclasses
    }
}

class Character extends InteractableObject {
    constructor(characterConfig) {
        // Create texture loader
        const textureLoader = new THREE.TextureLoader();
        
        // Load textures
        const textures = {
            idle: textureLoader.load(characterConfig.sprites.idle),
            talking: characterConfig.sprites.talking.map(spritePath => 
                textureLoader.load(spritePath)
            )
        };

        // Create materials
        const materials = {
            idle: new THREE.MeshBasicMaterial({ 
                map: textures.idle,
                transparent: true,
                side: THREE.DoubleSide
            }),
            talking: textures.talking.map(texture => 
                new THREE.MeshBasicMaterial({ 
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide
                })
            )
        };

        // Create geometry (standard size, can be adjusted in config if needed)
        const geometry = new THREE.PlaneGeometry(
            characterConfig.width || 1.5, 
            characterConfig.height || 3
        );

        // Initialize with idle material
        super(geometry, materials.idle, "Press F to talk");
        
        this.name = characterConfig.name;
        this.dialogueBlocks = characterConfig.dialogue;
        this.currentBlock = 0;
        this.currentLine = 0;
        this.state = CHARACTER_STATES.IDLE;
        this.talkingFrame = 0;
        this.dialogueBox = document.querySelector('.dialogue-box');
        
        this.dialoguePrompt = document.createElement('div');
        this.dialoguePrompt.className = 'dialogue-prompt';
        this.dialogueBox.appendChild(this.dialoguePrompt);
        
        // Store the materials object directly
        this.materials = {
            [CHARACTER_STATES.IDLE]: materials.idle,
            [CHARACTER_STATES.TALKING]: materials.talking
        };
        this.talkingMaterialIndex = 0;

        // Add audio properties for speech
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.oscillator = null;
        this.gainNode = null;
        
        // Speaking trill (ascending)
        this.speakingNotes = [440, 523.25, 659.25]; // A4, C5, E5
        // Dialogue end sound (descending)
        this.endingNotes = [659.25, 523.25, 440]; // E5, C5, A4
    }

    update(delta) {
        // Update character animation state
        if (this.state === CHARACTER_STATES.TALKING) {
            this.material = this.materials[CHARACTER_STATES.TALKING][this.talkingMaterialIndex];
            
            // Check distance to player using the game's interaction manager distance
            const cameraPosition = this.parent.worldToLocal(window.game.camera.position.clone());
            const distanceToPlayer = this.position.distanceTo(cameraPosition);
            
            // If player is too far, end dialogue
            if (distanceToPlayer > window.game.interactionManager.maxDistance) {
                this.endDialogue();
            }
        }

        // Make character face the camera
        const cameraPosition = this.parent.worldToLocal(window.game.camera.position.clone());
        const directionToCamera = new THREE.Vector3();
        directionToCamera.subVectors(cameraPosition, this.position);
        directionToCamera.y = 0; // Keep the character upright by ignoring vertical difference
        
        // Calculate the angle to face the camera
        const angle = Math.atan2(directionToCamera.x, directionToCamera.z);
        this.rotation.y = angle;
    }

    interact() {
        if (this.state === CHARACTER_STATES.IDLE) {
            // Start dialogue
            this.state = CHARACTER_STATES.TALKING;
            this.showDialogue();
        } else if (this.state === CHARACTER_STATES.TALKING) {
            // Advance dialogue
            this.advanceDialogue();
        }
    }

    playTrill(notes, duration = 0.08) {
        let time = this.audioContext.currentTime;
        
        // Create new oscillator and gain node
        this.oscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();

        // Configure oscillator
        this.oscillator.type = 'square';
        
        // Configure gain (volume)
        this.gainNode.gain.setValueAtTime(0, time);
        
        // Connect nodes
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Play each note in sequence
        notes.forEach((note, index) => {
            // Set frequency for this note
            this.oscillator.frequency.setValueAtTime(note, time);
            
            // Fade in
            this.gainNode.gain.linearRampToValueAtTime(0.1, time + 0.01);
            // Fade out
            this.gainNode.gain.linearRampToValueAtTime(0, time + duration);
            
            time += duration;
        });

        // Play sound
        this.oscillator.start();
        this.oscillator.stop(time);
    }

    showDialogue() {
        if (this.dialogueBlocks.length > 0) {
            const currentText = this.dialogueBlocks[this.currentBlock][this.currentLine];
            this.dialogueBox.textContent = currentText;
            this.dialogueBox.style.display = 'block';
            this.dialoguePrompt.textContent = '▼';
            
            // Play speaking trill (ascending)
            this.playTrill(this.speakingNotes);
            
            // Toggle between all available talking materials
            const numTalkingMaterials = this.materials[CHARACTER_STATES.TALKING].length;
            this.talkingMaterialIndex = (this.talkingMaterialIndex + 1) % numTalkingMaterials;
        }
    }

    advanceDialogue() {
        const currentBlock = this.dialogueBlocks[this.currentBlock];
        
        if (this.currentLine < currentBlock.length - 1) {
            // Move to next line in current block
            this.currentLine++;
            this.showDialogue();
        } else {
            // Move to next block and end dialogue
            if (this.currentBlock < this.dialogueBlocks.length - 1) {
                this.currentBlock++;
            } 
            this.endDialogue();
        }
    }

    endDialogue() {
        this.state = CHARACTER_STATES.IDLE;
        this.material = this.materials[CHARACTER_STATES.IDLE];
        this.dialogueBox.style.display = 'none';
        this.currentLine = 0;
        
        // Play ending trill (descending)
        this.playTrill(this.endingNotes);
        
        // Clean up previous audio after a short delay
        setTimeout(() => {
            if (this.oscillator) {
                this.oscillator.disconnect();
            }
            if (this.gainNode) {
                this.gainNode.disconnect();
            }
        }, 500);
    }

    static async loadFromJson(jsonPath) {
        try {
            // Fetch and parse the JSON file
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to load character JSON: ${response.statusText}`);
            }
            const characterData = await response.json();

            // Get the base path from the JSON file path
            const basePath = jsonPath.substring(0, jsonPath.lastIndexOf('/') + 1);
            
            // Create a helper function using closure to handle relative paths
            const relpath = (path) => new URL(path, window.location.href + basePath).href;

            // Create new character with the loaded data, resolving sprite paths
            return new Character({
                name: characterData.name,
                sprites: {
                    idle: relpath(characterData.sprites.idle),
                    talking: characterData.sprites.talking.map(relpath)
                },
                dialogue: characterData.dialogue,
                width: characterData.width,
                height: characterData.height
            });
        } catch (error) {
            console.error('Error loading character:', error);
            throw error;
        }
    }
}

class InteractionManager {
    constructor(camera, scene, maxDistance = 5) {
        this.camera = camera;
        this.scene = scene;
        this.maxDistance = maxDistance;
        this.raycaster = new THREE.Raycaster();
        this.currentInteractable = null;
        this.tooltipSprite = this.createTooltipSprite();
        this.scene.add(this.tooltipSprite);
        this.tooltipOpacity = 0;
        this.targetOpacity = 0;
    }

    createTooltipSprite() {
        // Create a texture loader
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./assets/textures/tooltip.png');
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0,
            sizeAttenuation: true
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Set a reasonable default scale - adjust these values as needed
        sprite.scale.set(1, 0.5, 1);
        sprite.visible = false;

        return sprite;
    }

    updateTooltipOpacity(delta) {
        // Smoothly interpolate opacity
        const fadeSpeed = 5;
        this.tooltipOpacity += (this.targetOpacity - this.tooltipOpacity) * fadeSpeed * delta;
        if (this.tooltipSprite && this.tooltipSprite.material) {
            this.tooltipSprite.material.opacity = this.tooltipOpacity;
        }
    }

    checkInteractions(objects) {
        // Update raycaster
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
        
        // Find intersections
        const intersects = this.raycaster.intersectObjects(objects);
        
        // Check if we're looking at an interactable object
        const interactable = intersects.find(intersect => 
            intersect.object.userData.interactable && 
            intersect.distance <= this.maxDistance
        );

        if (interactable) {
            this.currentInteractable = interactable.object;
            
            // Position tooltip above the object
            const objectPosition = new THREE.Vector3();
            interactable.object.getWorldPosition(objectPosition);
            
            // Add offset above the object
            this.tooltipSprite.position.copy(objectPosition);
            this.tooltipSprite.position.y += 1.9; // Adjust this value to change height
            
            // Make tooltip face camera
            const tooltipDirection = new THREE.Vector3();
            tooltipDirection.subVectors(this.camera.position, this.tooltipSprite.position);
            this.tooltipSprite.quaternion.copy(this.camera.quaternion);
            
            this.tooltipSprite.visible = true;
            this.targetOpacity = 1;
        } else {
            this.currentInteractable = null;
            this.targetOpacity = 0;
            if (this.tooltipOpacity <= 0.01) {
                this.tooltipSprite.visible = false;
            }
        }
    }
}

class GameEngine {
    constructor(config = {}) {
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.objects = [];
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();
        this.interactionManager = null;
        
        // Merge default config with provided config
        this.config = {
            movementSpeed: 100.0,
            mouseSensitivity: 0.002,
            maxInteractionDistance: 5,
            ...config
        };

        // Add these new properties
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ'); // YXZ order is important for FPS controls
        this.rotationX = 0;
        this.rotationY = 0;

        // Add audio properties
        this.footstepSounds = [];
        this.lastStepTime = 0;
        this.stepInterval = 0.5;
        this.isWalking = false;

        // Add starting position
        this.startPosition = new THREE.Vector3(0, 1.6, 0);
        this.startRotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Add these properties to the GameEngine constructor after line 279
        this.isMobile = window.innerWidth / window.innerHeight < 4/3;
        this.joystick = null;
        this.touchRotation = {
            active: false,
            lastX: 0,
            lastY: 0
        };
    }

    init() {
        // Initialize Three.js scene, camera, and renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Initialize interaction manager
        this.interactionManager = new InteractionManager(this.camera, this.scene, this.config.maxInteractionDistance);

        // Set up event listeners
        this.setupEventListeners();
        this.setupMobileControls();

        // Initialize audio
        this.initAudio();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
    }

    setupMobileControls() {
        if (!this.isMobile) return;

        // Handle movement buttons
        const forwardButton = document.querySelector('.forward-button');
        const backwardButton = document.querySelector('.backward-button');

        // Forward button
        forwardButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.moveForward = true;
        });

        forwardButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.moveForward = false;
        });

        // Backward button
        backwardButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.moveBackward = true;
        });

        backwardButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.moveBackward = false;
        });

        // Handle interaction button
        const interactButton = document.querySelector('.interact-button');
        interactButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.interactionManager.currentInteractable) {
                this.interactionManager.currentInteractable.interact();
            }
        });

        // Handle touch for camera rotation (only outside of controls)
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.movement-buttons') || 
                e.target.closest('.interact-button')) return;
                
            this.touchRotation.active = true;
            this.touchRotation.lastX = e.touches[0].clientX;
            this.touchRotation.lastY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.touchRotation.active) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const movementX = touchX - this.touchRotation.lastX;
            const movementY = touchY - this.touchRotation.lastY;
            
            this.rotationY -= movementX * this.config.mouseSensitivity;
            this.rotationX -= movementY * this.config.mouseSensitivity;
            
            this.rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotationX));
            
            this.euler.x = this.rotationX;
            this.euler.y = this.rotationY;
            this.camera.quaternion.setFromEuler(this.euler);
            
            this.touchRotation.lastX = touchX;
            this.touchRotation.lastY = touchY;
        });

        document.addEventListener('touchend', () => {
            this.touchRotation.active = false;
        });
    }

    onKeyDown(event) {
        if (this.isMobile || !document.pointerLockElement) return;
        
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'KeyF':
                if (this.interactionManager.currentInteractable) {
                    this.interactionManager.currentInteractable.interact();
                }
                break;
            case 'KeyT':
                // Teleport to starting position
                this.camera.position.copy(this.startPosition);
                this.rotationX = this.startRotation.x;
                this.rotationY = this.startRotation.y;
                this.euler.copy(this.startRotation);
                this.camera.quaternion.setFromEuler(this.euler);
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    onMouseMove(event) {
        if (this.isMobile) return;
        if (document.pointerLockElement === this.renderer.domElement) {
            // Update rotation values based on mouse movement
            this.rotationY -= event.movementX * this.config.mouseSensitivity;
            this.rotationX -= event.movementY * this.config.mouseSensitivity;
            
            // Clamp vertical rotation to prevent over-rotation
            this.rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotationX));
            
            // Set euler angles
            this.euler.x = this.rotationX;
            this.euler.y = this.rotationY;
            
            // Apply rotation to camera
            this.camera.quaternion.setFromEuler(this.euler);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addObject(object) {
        this.scene.add(object);
        this.objects.push(object);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        this.updateMovement(delta);
        this.interactionManager.checkInteractions(this.objects);
        this.interactionManager.updateTooltipOpacity(delta);
        
        // Update characters
        this.objects.forEach(obj => {
            if (obj instanceof Character) {
                obj.update(delta);
            }
        });

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }

    updateMovement(delta) {
        // Check if we should update movement
        if (!this.isMobile && !document.pointerLockElement) return;

        this.velocity.x -= this.velocity.x * 20.0 * delta;
        this.velocity.z -= this.velocity.z * 20.0 * delta;

        this.direction.z = Number(this.moveBackward) - Number(this.moveForward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        const speed = this.isMobile ? this.config.movementSpeed * 0.7 : this.config.movementSpeed;

        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * speed * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * speed * delta;
        }

        this.isWalking = (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight);

        if (this.isWalking && this.footstepSounds.length > 0) {
            const currentTime = performance.now() / 1000;
            if (currentTime - this.lastStepTime >= this.stepInterval) {
                this.playRandomFootstep();
                this.lastStepTime = currentTime;
            }
        }

        this.camera.translateX(-this.velocity.x * delta);
        this.camera.translateZ(-this.velocity.z * delta);
        this.camera.position.y = 1.6;
    }

    initAudio() {
        // Create an audio listener
        const listener = new THREE.AudioListener();
        this.camera.add(listener);

        // Load multiple footstep sounds
        const audioLoader = new THREE.AudioLoader();
        const footstepFiles = ['./assets/audio/footsteps/step1.mp3', './assets/audio/footsteps/step2.mp3', './assets/audio/footsteps/step3.mp3'];
        
        footstepFiles.forEach(file => {
            const sound = new THREE.Audio(listener);
            audioLoader.load(file, 
                (buffer) => {
                    sound.setBuffer(buffer);
                    sound.setVolume(0.5);
                    this.footstepSounds.push(sound);
                },
                undefined,
                (error) => console.warn(`Failed to load ${file}:`, error)
            );
        });
    }

    playRandomFootstep() {
        if (this.footstepSounds.length === 0) return;
        
        // Pick random sound
        const randomIndex = Math.floor(Math.random() * this.footstepSounds.length);
        const sound = this.footstepSounds[randomIndex];
        
        // Vary volume between 0.3 and 0.7
        const randomVolume = 0.5 + (Math.random() * 0.4 - 0.2);
        sound.setVolume(randomVolume);
        
        if (!sound.isPlaying) {
            sound.play();
        }
    }

    start() {
        this.animate();
    }
}

export { GameEngine, InteractableObject, Character }; 