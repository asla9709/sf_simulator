import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

export class UrbanScene {
    constructor(scene) {
        this.scene = scene;
        // Create a group to hold all scene contents
        this.sceneGroup = new THREE.Group();
        this.scene.add(this.sceneGroup);
        
        // Rotate the group 90 degrees clockwise around the Y axis
        this.sceneGroup.rotation.y = -Math.PI / 2;

        // Add skybox with adjusted mapping
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('panorama_bJawNx3P.jpg', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.repeat.set(1, 1);
            
            this.scene.background = texture;
            this.scene.environment = texture;
        });
    }

    init() {
        this.addLighting();
        this.createStreet();
        this.createBuildings();
        this.addStreetFurniture();
    }

    addLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.sceneGroup.add(ambientLight);
        
        // Add directional light to simulate sunlight
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1, 1, 1);
        this.sceneGroup.add(dirLight);
    }

    createStreet() {
        // Create street (ground plane)
        const streetGeometry = new THREE.PlaneGeometry(30, 100);
        const streetMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8
        });
        const street = new THREE.Mesh(streetGeometry, streetMaterial);
        street.rotation.x = -Math.PI / 2;
        this.sceneGroup.add(street);

        // Create sidewalk
        const sidewalkGeometry = new THREE.BoxGeometry(5, 0.2, 100);
        const sidewalkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x999999,
            roughness: 0.9
        });
        const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        sidewalk.position.set(-7.5, 0.1, 0);
        this.sceneGroup.add(sidewalk);
    }

    createBuildings() {
        // Orientation is in radians, Math.PI/2 means facing the road
        this.createClassicalBuilding(-12, 0, -20, 0xE8E8E8, Math.PI/2); // White/beige building
        this.createModernBuilding(-12, 0, -5, 0xFFFFFF, Math.PI/2);     // White/red commercial
        this.createBrickBuilding(-12, 0, 10, 0x8B4513, Math.PI/2);      // Brown brick building
    }

    createClassicalBuilding(x, y, z, color, orientation) {
        const building = new THREE.Group();
        
        // Main structure
        const geometry = new THREE.BoxGeometry(10, 12, 10);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7
        });
        const mainStructure = new THREE.Mesh(geometry, material);
        
        // Door at front
        const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x4A3C2A });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -5.75, 5);
        
        // Windows at front
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEEB });
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const window = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1.5, 0.1),
                    windowMaterial
                );
                window.position.set(i * 3 - 1.5, j * 3 - 2, 5.1);
                building.add(window);
            }
        }
        
        // Cornice
        const corniceGeometry = new THREE.BoxGeometry(10.5, 0.5, 10.5);
        const cornice = new THREE.Mesh(corniceGeometry, material);
        cornice.position.y = 6;
        
        building.add(mainStructure, cornice, door);
        building.position.set(x, y + 6, z);
        building.rotation.y = orientation;
        this.sceneGroup.add(building);
    }

    createModernBuilding(x, y, z, color, orientation) {
        const building = new THREE.Group();
        
        // Main structure
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.5,
            envMapIntensity: 1.0,
            metalness: 0.2
        });
        const mainStructure = new THREE.Mesh(geometry, material);
        
        // Door at front
        const doorGeometry = new THREE.BoxGeometry(2, 3, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -4.75, 5);
        
        // Large modern windows at front
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEEB });
        for (let i = 0; i < 2; i++) {
            const window = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 2, 0.1),
                windowMaterial
            );
            window.position.set(2, i * 3 - 1, 5.1);
            building.add(window);
        }
        
        // Red trim
        const trimGeometry = new THREE.BoxGeometry(10.2, 0.5, 10.2);
        const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        const trim = new THREE.Mesh(trimGeometry, trimMaterial);
        trim.position.y = 5;
        
        building.add(mainStructure, trim, door);
        building.position.set(x, y + 5, z);
        building.rotation.y = orientation;
        this.sceneGroup.add(building);
    }

    createBrickBuilding(x, y, z, color, orientation) {
        const building = new THREE.Group();
        
        // Main structure
        const geometry = new THREE.BoxGeometry(10, 14, 10);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.9
        });
        const mainStructure = new THREE.Mesh(geometry, material);
        
        // Door at front
        const doorGeometry = new THREE.BoxGeometry(1.8, 2.8, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -6.75, 5);
        
        // Windows at front
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEEB });
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const window = new THREE.Mesh(
                    new THREE.BoxGeometry(1.2, 1.8, 0.1),
                    windowMaterial
                );
                window.position.set(j * 3 - 1.5, i * 3 - 3, 5.1);
                building.add(window);
            }
        }
        
        // Fire escape at front
        const fireEscape = this.createFireEscape();
        fireEscape.position.set(0, 0, 5);
        
        building.add(mainStructure, fireEscape, door);
        building.position.set(x, y + 7, z);
        building.rotation.y = orientation;
        this.sceneGroup.add(building);
    }

    createFireEscape() {
        const fireEscape = new THREE.Group();
        
        // Create platforms and railings
        for (let i = 0; i < 4; i++) {
            const platform = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.2, 3),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            platform.position.y = i * 4;
            fireEscape.add(platform);
            
            // Add simple railings
            const railing = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            railing.position.y = i * 4 + 0.5;
            railing.position.z = 1.5;
            fireEscape.add(railing);
        }
        
        return fireEscape;
    }

    addStreetFurniture() {
        // Add street lamps
        this.createStreetLamp(-7, 0, 0);
        this.createStreetLamp(-7, 0, -20);
        this.createStreetLamp(-7, 0, 20);

        // Add trees
        this.createTree(-7, 0, -11);
        this.createTree(-7, 0, 5);
    }

    createStreetLamp(x, y, z) {
        const lamp = new THREE.Group();
        
        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 6);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x202020 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        
        // Light fixture
        const fixtureGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const fixtureMaterial = new THREE.MeshStandardMaterial({ color: 0x404040 });
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.position.y = 3;
        
        // Add light
        const light = new THREE.PointLight(0xFFFFAA, 0.8, 10);
        light.position.y = 3;
        
        lamp.add(pole, fixture, light);
        lamp.position.set(x, y + 3, z);
        this.sceneGroup.add(lamp);
    }

    createTree(x, y, z) {
        const tree = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4A3C2A });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Foliage
        const foliageGeometry = new THREE.SphereGeometry(2, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2D5A27 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 2;
        
        tree.add(trunk, foliage);
        tree.position.set(x, y + 1, z);
        this.sceneGroup.add(tree);
    }
} 