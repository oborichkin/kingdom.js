// Import necessary Three.js components
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Create a scene
const scene = new THREE.Scene();

// Create a camera with a smaller near clipping plane
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000); // Adjusted near plane
camera.position.z = 5;

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbital controls with a minimum distance
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 1.01; // Set minimum distance slightly larger than sphere radius
controls.enableDamping = true; // Enable damping (inertia)
controls.dampingFactor = 0.05; // Damping factor

// Function to update rotate speed based on camera distance
function updateRotateSpeed() {
    const distance = camera.position.distanceTo(scene.position);
    const maxDistance = 10; // Define a maximum distance for scaling
    const minSpeed = 0.003; // Minimum rotate speed
    const maxSpeed = 1.0; // Maximum rotate speed

    // Calculate rotate speed based on distance, scaling between minSpeed and maxSpeed
    controls.rotateSpeed = minSpeed + (maxSpeed - minSpeed) * (distance - controls.minDistance) / (maxDistance - controls.minDistance);
    controls.rotateSpeed = Math.min(maxSpeed, Math.max(minSpeed, controls.rotateSpeed)); // Clamp the speed
}

// Class to create a planet with LOD, sprite, and text
class Planet {
    constructor(name, texturePath, position, size, color = null) {
        this.name = name;
        this.texturePath = texturePath;
        this.position = position;
        this.size = size;
        this.color = color;

        this.lod = this.createLOD();
        this.planetGroup = this.createSpriteAndText();

        scene.add(this.lod);
        scene.add(this.planetGroup);
    }

    createLOD() {
        const lod = new THREE.LOD();
        const textureLoader = new THREE.TextureLoader();
        const texture = this.texturePath ? textureLoader.load(this.texturePath) : null;

        const geometries = [
            new THREE.SphereGeometry(this.size, 128, 128),
            new THREE.SphereGeometry(this.size, 64, 64),
            new THREE.SphereGeometry(this.size, 32, 32)
        ];

        geometries.forEach((geometry, index) => {
            const distance = index * this.size * 2;
            const material = texture
                ? new THREE.MeshBasicMaterial({ map: texture })
                : new THREE.MeshBasicMaterial({ color: this.color });
            const mesh = new THREE.Mesh(geometry, material);
            lod.addLevel(mesh, distance);
        });

        lod.position.copy(this.position);
        return lod;
    }

    createSpriteAndText() {
        const group = new THREE.Object3D();

        // Create sprite
        const circleCanvas = document.createElement('canvas');
        circleCanvas.width = 128;
        circleCanvas.height = 128;
        const circleContext = circleCanvas.getContext('2d');
        circleContext.beginPath();
        circleContext.arc(64, 64, 64, 0, Math.PI * 2, false);
        circleContext.fillStyle = this.color ? this.color : 'white';
        circleContext.fill();
        const circleTexture = new THREE.CanvasTexture(circleCanvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: circleTexture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(this.size * 2, this.size * 2, 1);
        group.add(sprite);

        // Create text
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 256;
        textCanvas.height = 64;
        const textContext = textCanvas.getContext('2d');
        textContext.font = 'Bold 24px Verdana';
        textContext.fillStyle = 'white';

        const text = this.name;
        const textWidth = textContext.measureText(text).width;
        textContext.fillText(text, (textCanvas.width - textWidth) / 2, 40);
        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
        const textSprite = new THREE.Sprite(textMaterial);
        textSprite.scale.set(this.size * 10, this.size * 10 * (textCanvas.height / textCanvas.width), 1);
        textSprite.position.set(0, this.size * 1.3, 0);
        group.add(textSprite);

        group.position.copy(this.position);
        return group;
    }

    updateVisibilityAndTextSize(camera) {
        const distance = camera.position.distanceTo(this.position);
        if (distance > this.size * 20) {
            this.lod.visible = false;
            this.planetGroup.visible = true;

            const scaleFactor = distance / (this.size * 5);
            this.planetGroup.children[1].scale.set(scaleFactor, scaleFactor * (64 / 256), 1);

            const upDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
            this.planetGroup.children[1].position.copy(this.planetGroup.children[0].position).addScaledVector(upDirection, this.size * 1.5);
        } else {
            this.lod.visible = true;
            this.planetGroup.visible = false;
        }
    }
}

// Function to generate a random position within a certain range
function randomPosition(range) {
    const minDistance = range * 0.5; // Ensure a minimum distance from the center
    const randomVector = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
    ).normalize();

    const distance = minDistance + Math.random() * (range - minDistance);
    return randomVector.multiplyScalar(distance);
}

const earth = new Planet('Earth', '8k_earth_daymap.jpg', new THREE.Vector3(0, 0, 0), 1, 'blue');
let planets = [earth];
// Generate 5 random planets with different colors
const planetNames = ['Mars', 'Venus', 'Jupiter', 'Saturn', 'Neptune'];
const planetColors = ['orange', 'yellow', 'brown', 'gold', 'cyan']; // Define unique colors for each planet
const randomPlanets = planetNames.map((name, index) => {
    const size = Math.random() * 0.5 + 0.5; // Random size between 0.5 and 1
    const position = randomPosition(10); // Random position within a 10x10x10 cube
    return new Planet(name, null, position, size, planetColors[index]); // Assign color
});

// Add the random planets to the planets array
planets = planets.concat(randomPlanets);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateRotateSpeed(); // Update rotate speed based on distance
    planets.forEach(planet => planet.updateVisibilityAndTextSize(camera)); // Update visibility and text size based on distance
    controls.update();
    renderer.render(scene, camera);
}

animate();
