import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**-------------------------This is a Shader section 1 ------------------------------- */
// // Load the vertex and fragment shaders
// async function loadShaders() {
//     const vertexShader = await fetch('./shader/vertex.glsl').then(res => res.text());
//     const fragmentShader = await fetch('./shader/fragment.glsl').then(res => res.text());
//     return { vertexShader, fragmentShader };
// }
// // Main function to create the God Rays effect
// async function createGodRaysEffect() {
//     // Load the shaders
//     const shaders = await loadShaders();

//     // Create shader material for the God Rays effect
//     const godRaysMaterial = new THREE.ShaderMaterial({
//         vertexShader: shaders.vertexShader,
//         fragmentShader: shaders.fragmentShader,
//         uniforms: {
//             tDiffuse: { value: null },  // Scene texture
//             lightPosition: { value: new THREE.Vector3(0.5, 0.5, 0.5) },  // Position of the light source
//             density: { value: 0.96 },
//             decay: { value: 0.93 },
//             weight: { value: 0.4 },
//             exposure: { value: 0.6 }
//         }
//     });

//     return godRaysMaterial;
// }
/**-------------------------This is a Shader section 1 ------------------------------- */

// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

//Mouse capture
const mouse = {
    x: 0,
    y: 0
};

window.addEventListener('mousemove', (event) => {
    // Normalize mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // -1 to 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // -1 to 1
});

// Initialize particle system variables
const particlesGeometry = new THREE.BufferGeometry();
const vertices = [];

/** ----------Flow particle initialization section------------ */
// Flow field particle system variables

const flowParticlesGeometry = new THREE.BufferGeometry();
const flowVertices = [];

// Flow field size and particle count
const flowFieldSize = 20;
const flowFieldParticleCount = 20000;

/** ----------Flow particle initialization section ends-------- */

/**
 * Models
 */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let mixer = null;
let dolphin;
let scrollPercent = 0;
let scrollSpeed = 0.7; // You can adjust this value to change the speed

// Initialize the texture loader
const textureLoader = new THREE.TextureLoader();

// Load the new textures for Dolphin2
const bodyBaseColor = textureLoader.load('/models/Dolphin2/textures/Dolphin_Body_baseColor.png');
const bodyNormal = textureLoader.load('/models/Dolphin2/textures/Dolphin_Body_normal.png');

// Define a curve path for the dolphin to follow
const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(2, 1, -1),
    new THREE.Vector3(4, 1.5, 0),
    new THREE.Vector3(6, 2, 2)
]);

// Create a visible line representing the curve
const curvePoints = curve.getPoints(50);  // Increase the number of points for a smoother curve
const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
const curveMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
const curveObject = new THREE.Line(curveGeometry, curveMaterial);
scene.add(curveObject);  // Add the curve to the scene

// Hide the curve object
curveObject.visible = false; // Set visibility to false

// Load the Dolphin2 model
gltfLoader.load(
    '/models/Dolphin2/scene.gltf',
    (gltf) => {
        dolphin = gltf.scene; // Store the dolphin reference
        dolphin.traverse((child) => {
            if (child.isMesh) {
                console.log('Material name:', child.material.name); // Check material names
                if (child.material.name === 'Dolphin_Body_Material') { // Replace with actual material name
                    child.material.map = bodyBaseColor;
                    child.material.normalMap = bodyNormal;
                    child.material.needsUpdate = true;
                }
            }
        });

        // Set the scale of the model
        dolphin.scale.set(1.2, 1.2, 1.2);

        // Start with no tilt
        dolphin.rotation.x = 0; // Adjust as needed for correct alignment
        dolphin.rotation.y = 0; // Adjust as needed
        dolphin.rotation.z = 0; // Keep Z rotation at 0 initially

        // Add an AxesHelper to the dolphin to visualize its local axes
        // const axesHelper = new THREE.AxesHelper(1); // 1 unit long axis lines
        // dolphin.add(axesHelper);

        // Initially position the dolphin at the start of the curve (scroll = 0)
        const initialPosition = curve.getPointAt(0); // Start point on the path
        dolphin.position.copy(initialPosition);

        // Get the initial tangent (direction) of the curve
        const initialTangent = curve.getTangentAt(0);
        dolphin.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), // Default forward direction
            initialTangent.normalize()
        );
        

        // Add the dolphin to the scene
        scene.add(dolphin);

        // Animation Mixer
        mixer = new THREE.AnimationMixer(dolphin);
        if (gltf.animations.length > 0) {
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }

        // GUI controls for texture scaling and rotation
        const textureFolder = gui.addFolder('Texture Transform');
        const bodyTextureControls = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0
        };
        textureFolder.add(bodyTextureControls, 'scaleX', 0.1, 5).onChange(() => {
            bodyBaseColor.repeat.x = bodyTextureControls.scaleX;
        });
        textureFolder.add(bodyTextureControls, 'scaleY', 0.1, 5).onChange(() => {
            bodyBaseColor.repeat.y = bodyTextureControls.scaleY;
        });
        textureFolder.add(bodyTextureControls, 'rotation', 0, Math.PI * 2).onChange(() => {
            bodyBaseColor.rotation = bodyTextureControls.rotation;
        });
        textureFolder.open();
    }
);


// Load the particle textures (replace with your texture paths)
const sprite1 = textureLoader.load('./textures/spec1.png');
const sprite2 = textureLoader.load('./textures/dust2.png');
const sprite3 = textureLoader.load('./textures/dust3.png');
const sprite4 = textureLoader.load('./textures/spec2.png');
const sprite5 = textureLoader.load('./textures/dust4.png');
const sprite6 = textureLoader.load('./textures/dust2.png');
const sprite7 = textureLoader.load('./textures/spec1.png');

// Generate particles' positions
for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 2000 - 200;
    const y = Math.random() * 2000 - 200;
    const z = Math.random() * 2000 - 200;
    vertices.push(x, y, z);
}
particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

// Define parameters for particle materials
const parameters = [
    [[1.0, 0.2, 0.5], sprite2, 20],
    [[0.95, 0.1, 0.5], sprite3, 15],
    [[0.90, 0.05, 0.5], sprite1, 10],
    [[0.85, 0, 0.5], sprite5, 8],
    [[0.80, 0, 0.5], sprite4, 5],
    [[0.75, 0.1, 0.5], sprite6, 12],
    [[0.70, 0.2, 0.5], sprite7, 18] 
];

const particleMaterials = [];
for (let i = 0; i < parameters.length; i++) {
    const color = parameters[i][0];
    const sprite = parameters[i][1];
    const size = parameters[i][7];

    const material = new THREE.PointsMaterial({
        size: size,
        map: sprite,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        opacity: 0.4
    });
    material.color.setHSL(color[0], color[1], color[2]);
    particleMaterials.push(material);

    const particles = new THREE.Points(particlesGeometry, material);
    particles.rotation.x = Math.random() * 6;
    particles.rotation.y = Math.random() * 6;
    particles.rotation.z = Math.random() * 6;
    scene.add(particles); // Add particles to the existing scene
}

// Update the particle effect in your animation loop
const particleTick = () => {
    const time = Date.now() * 0.00005;

    for (let i = 0; i < scene.children.length; i++) {
        const object = scene.children[i];
        if (object instanceof THREE.Points) {
            object.rotation.y = time * 0.1 * (i < 4 ? i + 1 : -(i + 1)); // Slows down rotation by 10x

        }
    }

    for (let i = 0; i < particleMaterials.length; i++) {
        const color = parameters[i][0];
        const h = (360 * (color[0] + time) % 360) / 360;
        particleMaterials[i].color.setHSL(h, color[1], color[2]);
    }
};


/** ----------Flow particle generation system section------------ */

// Generate random positions for flow field particles
for (let i = 0; i < flowFieldParticleCount; i++) {
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 100 - 50;
    const z = Math.random() * 100 - 50;
    flowVertices.push(x, y, z);
}
flowParticlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(flowVertices, 3));

// NEW CODE: Generate random sizes for particles
const psizes = new Float32Array(flowFieldParticleCount);
const minSize = 0;  // Minimum particle size
const maxSize = 0.1;  // Maximum particle size

for (let i = 0; i < flowFieldParticleCount; i++) {
    psizes[i] = Math.random() * (maxSize - minSize) + minSize;  // Random psizes within the range
}

// Add the size attribute to the flowParticlesGeometry
flowParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(psizes, 1));

// Create a flow field material (adjust size, opacity as needed)
const flowParticleMaterial = new THREE.PointsMaterial({
    color: 0x67b7da,
    transparent: true,
    opacity: 0.5,
    size: 0.05,
    sizeAttenuation: true  // Enables scaling based on perspective
    // No need to define size here, we'll use the sizes from the attribute
});

// Flow field particle system
const flowFieldParticles = new THREE.Points(flowParticlesGeometry, flowParticleMaterial);
scene.add(flowFieldParticles);

// Flow field definition (3D array of vectors)
const flowField = [];
for (let x = 0; x < flowFieldSize; x++) {
    flowField[x] = [];
    for (let y = 0; y < flowFieldSize; y++) {
        flowField[x][y] = [];
        for (let z = 0; z < flowFieldSize; z++) {
            // Bias the flow upwards (positive Y direction)
            const angle = Math.random() * Math.PI * 2;
            const strength = Math.random() * 0.5 + 0.5;  // Scale strength

            flowField[x][y][z] = new THREE.Vector3(
                Math.cos(angle) * 0.1,  // Smaller sideways motion (x)
                Math.random() * 1.0 + 0.5,  // Stronger upward motion (y)
                Math.sin(angle) * 0.1   // Smaller sideways motion (z)
            ).normalize().multiplyScalar(strength);  // Normalize and scale
        }
    }
}

// Function to update flow field particles
const updateFlowFieldParticles = () => {
    const flowParticlePositions = flowParticlesGeometry.attributes.position.array;
    const speed = 0.02;

    for (let i = 0; i < flowFieldParticleCount; i++) {
        const x = flowParticlePositions[i * 3];
        const y = flowParticlePositions[i * 3 + 1];
        const z = flowParticlePositions[i * 3 + 2];

        // Map particle position to flow field grid, and ensure the indices stay within valid bounds
        const flowX = Math.max(0, Math.min(flowFieldSize - 1, Math.floor((x + 50) / (100 / flowFieldSize))));
        const flowY = Math.max(0, Math.min(flowFieldSize - 1, Math.floor((y + 50) / (100 / flowFieldSize))));
        const flowZ = Math.max(0, Math.min(flowFieldSize - 1, Math.floor((z + 50) / (100 / flowFieldSize))));

        // Get vector from flow field
        const flowVector = flowField[flowX][flowY][flowZ];

        // Update particle position based on flow vector
        flowParticlePositions[i * 3] += flowVector.x * speed;
        flowParticlePositions[i * 3 + 1] += flowVector.y * speed;
        flowParticlePositions[i * 3 + 2] += flowVector.z * speed;

        // Wrap particles if they go out of bounds
        if (flowParticlePositions[i * 3] > 50) flowParticlePositions[i * 3] = -50;
        if (flowParticlePositions[i * 3 + 1] > 50) flowParticlePositions[i * 3 + 1] = -50;
        if (flowParticlePositions[i * 3 + 2] > 50) flowParticlePositions[i * 3 + 2] = -50;
    }

    flowParticlesGeometry.attributes.position.needsUpdate = true;
};


/** ----------Flow particle generation system section end------------ */

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0x83dde0, 2.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x3dc1d3, 2.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = - 7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = - 7;
directionalLight.position.set(- 5, 5, 0);
scene.add(directionalLight);



/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
// Set the camera position using the logged values
camera.position.set(3.791522226879063, 1.453015254400761, -0.7163140886236294);
// Set the camera rotation using the logged values
camera.rotation.set(-2.0288158511811973, 1.1670081751136139, 2.0629035910650257);
scene.add(camera);

// Controls (Disable zooming)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = false; // Disable zooming to use scroll for movement

// Capture camera position and rotation
function logCameraValues() {
    console.log("Camera Position:", camera.position);
    console.log("Camera Rotation (Euler):", camera.rotation);
}

// Call this function when you want to log the values
logCameraValues();

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Set the background color of the scene to white to avoid black background
renderer.setClearColor(0xffffff, 0);

/**
 * Scroll-based movement
 */
window.addEventListener('scroll', () => {
    // Calculate the scroll percentage based on the total scrollable height
    scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * scrollSpeed;
    
    // Log scroll percentage for debugging
    console.log("Scroll Percentage:", scrollPercent);

    // Move the dolphin on the path based on the scroll percentage
    moveDolphinOnPath(scrollPercent);
});

// Function to move the dolphin based on scroll position
function moveDolphinOnPath(percent) {
    if (dolphin) {
        // Clamp the percent between 0 and 1
        percent = Math.max(0, Math.min(1, percent));

        // Get the new position along the curve
        const position = curve.getPointAt(percent);
        dolphin.position.copy(position);

        // Get the tangent and apply the quaternion rotation without flipping
        const tangent = curve.getTangentAt(percent);
        
        // Adjust quaternion to follow the tangent direction
        const up = new THREE.Vector3(0, 0, 1); // The "up" direction, keeping the orientation stable
        const tangentNormal = tangent.clone().normalize();

        // Calculate quaternion from the up direction and tangent (rotation follows curve)
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangentNormal);
        dolphin.quaternion.copy(quaternion);

        // Apply smooth tilt along the Z-axis AFTER quaternion to avoid conflict
        const maxTiltAngle = Math.PI / 2.5; // Maximum tilt angle (30 degrees)
        let tilt = 0;
        if (percent < 0.5) {
            tilt = percent * 2 * maxTiltAngle; // Increase tilt from 0 to midway
        } else {
            tilt = (1 - percent) * 2 * maxTiltAngle; // Decrease tilt from midway to end
        }

        // Apply the tilt without affecting other axes
        dolphin.rotateZ(tilt);
    }
}

/**-------------------------This is a Shader section 2 ------------------------------- */
// // Initialize the EffectComposer for postprocessing
// const composer = new EffectComposer(renderer);

// // Create a RenderPass to render the scene normally
// const renderPass = new RenderPass(scene, camera);
// composer.addPass(renderPass);

// // Create the God Rays Shader Pass and add it to the composer
// createGodRaysEffect().then(godRaysMaterial => {
//     const godRaysPass = new ShaderPass(godRaysMaterial);
//     composer.addPass(godRaysPass);
// });
/**-------------------------This is a Shader section 2 ------------------------------- */

/**
 * Animation
 */
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // Model animation
    if (mixer) {
        mixer.update(deltaTime);
    }

    // Update the scene rotation based on mouse movement
    scene.position.y = THREE.MathUtils.lerp(scene.position.y, (mouse.y * Math.PI) / 10, 0.1);
    scene.position.z = THREE.MathUtils.lerp(scene.position.z, (mouse.x * Math.PI) / 10, 0.1);

    // Update particles
    particleTick();

     // Update flow field particles
     updateFlowFieldParticles();

    // Update controls
    controls.update();

    // Use composer to render with postprocessing (God Rays + scene)
    //composer.render();  // This replaces renderer.render() to apply postprocessing

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
};

// Start the animation loop
tick();