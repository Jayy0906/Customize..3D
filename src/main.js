import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";

// Function for loading models
function loadModels() {
  const modelPaths = [
    "models/Wall.glb",
    "models/Floor.glb",
    "models/Carpet.glb",
    "models/Frame.glb",
    "models/Plant.glb",
    "models/Floor_Lamp.glb",
    "models/Coffee_Table.glb",
    "models/Window.glb",
    "models/Sofa.glb",
  ];

  let currentModelIndex = 0;

  function loadNextModel() {
    if (currentModelIndex < modelPaths.length) {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      const ktx2Loader = new KTX2Loader();

      ktx2Loader.setTranscoderPath("/basis/");
      ktx2Loader.detectSupport(renderer);

      dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.4.2/"
      );

      loader.setDRACOLoader(dracoLoader);
      loader.setKTX2Loader(ktx2Loader);

      loader.load(modelPaths[currentModelIndex], (gltf) => {
        const loadedModel = gltf.scene;

        if (modelPaths[currentModelIndex] === "models/Sofa.glb") {
          loadedSofa = loadedModel;
          storeOriginalMaterials(loadedSofa);
        }

        else if (modelPaths[currentModelIndex] === "models/Floor.glb") {
          loadedFloor = loadedModel;
          storeOriginalMaterials(loadedFloor);
        }

        else if (modelPaths[currentModelIndex] === "models/Window.glb") {
          loadedWinow = loadedModel;
          storeOriginalMaterials(loadedWinow);
        }

        else if (modelPaths[currentModelIndex] === "models/Coffee_Table.glb") {
          loadedCoffeeTable = loadedModel;
          storeOriginalMaterials(loadedCoffeeTable);
        }

        scene.add(loadedModel);
        scene.position.set(0, -0.5, 0);

        currentModelIndex++;
        loadNextModel();

        function setupHDRI() {
          const rgbeloader = new RGBELoader();
          rgbeloader.load("hdri/gem_2.hdr", (hdri) => {
            const myhdr = hdri;
            myhdr.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = myhdr;
          });
        }

        setupHDRI();
      });
    } else {
      // After loading all models
      // You can perform additional actions here if needed
      
      addLights();
      startAnimation();
    }
  }

  loadNextModel();
}

const progressContainer = document.querySelector(".spinner-container");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set 3D scene's background color to white
const camera = new THREE.PerspectiveCamera(40,window.innerWidth / window.innerHeight,0.1,1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
const canvasContainer = document.getElementById("canvas-container");
canvasContainer.appendChild(renderer.domElement);

//Anti Aliasing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Replace the FXAA pass with SMAA pass
const smaaPass = new SMAAPass(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);
composer.addPass(smaaPass);

// SSAO pass
const ssaoPass = new SSAOPass(scene,camera,window.innerWidth,window.innerHeight);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.01;
ssaoPass.maxDistance = 0.05;
composer.addPass(ssaoPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

function createMaterialFromJSON(jsonData) {

  const diffuseMap = new THREE.TextureLoader().load(jsonData.diffuseMap);
  const glossMap = new THREE.TextureLoader().load(jsonData.glossMap);
  const normalMap = new THREE.TextureLoader().load(jsonData.normalMap);

  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;
  glossMap.wrapS = THREE.RepeatWrapping;
  glossMap.wrapT = THREE.RepeatWrapping;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  diffuseMap.repeat.set(...jsonData.diffuseMapTiling);
  glossMap.repeat.set(...jsonData.glossMapTiling);
  normalMap.repeat.set(...jsonData.normalMapTiling);

  const material = new THREE.MeshPhysicalMaterial({
    metalness: jsonData.metalness,
    roughness: 1 - jsonData.sheenGloss,
    opacity: jsonData.opacity,
    transparent: true,
    map: diffuseMap,
    roughnessMap: glossMap,
    normalMap: normalMap,
    side: jsonData.twoSidedLighting ? THREE.DoubleSide : THREE.FrontSide,
    alphaTest: jsonData.alphaTest,
    depthWrite: jsonData.depthWrite,
    depthTest: jsonData.depthTest,
    color: new THREE.Color(...jsonData.diffuse),
    emissive: new THREE.Color(...jsonData.emissive),
    emissiveIntensity: jsonData.emissiveIntensity,
    aoMap: null,
    aoMapIntensity: 1,
  });

  material.clearcoat = jsonData.clearcoat || 0;
  material.clearcoatRoughness = jsonData.clearcoatRoughness || 0;
  material.reflectivity = jsonData.reflectivity || 0.5;

  return material;
}

const loadedModelsMap = {};
let loadedSofa, loadedFloor, loadedCoffeeTable, loadedWinow; // Variable to store the loaded Sofa model
const originalMaterials = new Map(); // Map to store original materials by node name
let jsonFiles; // Variable to store JSON data

// Function for changing material variants
function changeMaterialVariant(model, materialName) {
  if (!model || !jsonFiles) {
    console.error('Model or JSON data not available');
    return;
  }

  const selectedJsonData = jsonFiles[materialName];
  if (!selectedJsonData) {
    console.error('JSON data for material not found:', materialName);
    return;
  }

  model.traverse((node) => {
    if (node.isMesh && node.material) { // Check if node has material
      const originalMaterial = originalMaterials.get(node.uuid);
      if (originalMaterial) {
        node.material.copy(originalMaterial);
      } else {
        const newMaterial = createMaterialFromJSON(selectedJsonData);
        if (newMaterial) {
          node.material = newMaterial.clone();
        } else {
          console.error('Failed to create material for node:', node);
        }
      }
    }
  });
}

function processJsonData() {
  fetch("MaterialData/Materials.json")
    .then((response) => response.json())
    .then((data) => {
      jsonFiles = data;
      const materialbutton = document.querySelectorAll(".material-thumbnail");

      Array.from(materialbutton).forEach((item) => {
        item.addEventListener("dragstart", (e) => {
          // const thumbnail = e.target;
          // const materialName = thumbnail.dataset.material;
        });

        item.addEventListener("dragend", (e) => {
          const thumbnail = e.target;
          const materialName = thumbnail.dataset.material;
          changeMaterialVariant(loadedSofa, materialName);
          changeMaterialVariant(loadedFloor, materialName);
          changeMaterialVariant(loadedCoffeeTable, materialName);
          changeMaterialVariant(loadedWinow, materialName);
        });
      });
    })
    .catch((error) => console.error("Error loading JSON file:", error));
}

function storeOriginalMaterials(model) {
  model.traverse((node) => {
    if (node.isMesh) {
      originalMaterials.set(node.name, node.material.clone());
      // originalMaterials.set(node.uuid, node.material.clone());
    }
  });
}

const dayNightToggle = document.getElementById("dayNightToggle");
let isDayMode = false; // Initial mode is day

function addLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
}

// Function to add a directional light
function addDirectionalLight() {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(10, 5, 10); // Adjust the light position
  directionalLight.castShadow = true;

  // Set up shadow parameters
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.bias = -0.005;
  directionalLight.shadow.radius = 4;

  scene.add(directionalLight);
}

// Function to remove the directional light
function removeDirectionalLight() {
  // Remove all directional lights
  const directionalLights = scene.children.filter((child) => {
    // Check if the child is a DirectionalLight before accessing isDirectionalLight
    return child.type === "DirectionalLight";
  });

  directionalLights.forEach((directionalLight) =>
    scene.remove(directionalLight)
  );
}

if (dayNightToggle) {
  dayNightToggle.addEventListener("change", () => {
    const toggleStartTime = performance.now();
    isDayMode = !isDayMode;

    // Show the spinner at the beginning
    progressContainer.style.display = "flex";
    // Use requestAnimationFrame to ensure the spinner is rendered before proceeding
    requestAnimationFrame(() => {
      if (isDayMode) {
        const modeSwitchStartTime = performance.now();
        // Switch to day mode (remove night lights, add day lights)
        addDirectionalLight(); // Add a new directional light for day mode
        renderer.toneMappingExposure = 0.7;

        // Set the background color to white
        scene.background = new THREE.Color(0xffffff);

        for (const modelName in loadedModelsMap) {
          const modelData = loadedModelsMap[modelName];
          if (modelData.scene) {
            modelData.scene.traverse(function (child) {
              if (child.isLight) {
                let l = child;
                l.power = 0;
              }
            });
          }
        }

        // Introduce a delay before logging the end time for mode switch
        setTimeout(() => {
          const modeSwitchEndTime = performance.now(); // Record the end time
          const modeSwitchDuration = modeSwitchEndTime - modeSwitchStartTime; // Calculate the duration
          console.log(
            `Day mode switch completed in ${modeSwitchDuration} milliseconds`
          );

          // Hide the spinner after a minimum duration
          setTimeout(() => {
            progressContainer.style.display = "none";
          }, 0); // Adjust the minimum duration as needed
        }, 0); // Adjust the delay time as needed
      } else {
        const modeSwitchStartTime = performance.now();
        // Switch to night mode (remove day lights, remove directional light)

        removeDirectionalLight();
        renderer.toneMappingExposure = 0.3;

        // Set the background color to black
        scene.background = new THREE.Color(0x000000);

        for (const modelName in loadedModelsMap) {
          const modelData = loadedModelsMap[modelName];
          if (modelData.scene) {
            modelData.scene.traverse(function (child) {
              if (child.isLight) {
                let l = child;
                l.power = 400;
              }
            });
          }
        }

        // Introduce a delay before logging the end time for mode switch
        setTimeout(() => {
          const modeSwitchEndTime = performance.now(); // Record the end time
          const modeSwitchDuration = modeSwitchEndTime - modeSwitchStartTime; // Calculate the duration
          console.log(
            `Night mode switch completed in ${modeSwitchDuration} milliseconds`
          );

          // Hide the spinner after a minimum duration
          setTimeout(() => {
            progressContainer.style.display = "none";
          }, 0); // Adjust the minimum duration as needed
        }, 0); // Adjust the delay time as needed
      }

      const toggleEndTime = performance.now(); // Record the end time
      const toggleDuration = toggleEndTime - toggleStartTime; // Calculate the duration
      console.log(
        `Day/Night toggle completed in ${toggleDuration} milliseconds`
      );
    });
  });
} else {
  console.error("Element with id 'dayNightToggle' not found.");
}

// const gridSize = 5; // Adjust the size of the grid
// const gridDivisions = 10; // Adjust the number of divisions in the grid

// // Initial grid color (day mode)
// let gridColor = 0x808080;

// const gridGeometry = new THREE.PlaneGeometry(
//   gridSize,
//   gridSize,
//   gridDivisions,
//   gridDivisions
// );
// const gridMaterial = new THREE.MeshBasicMaterial({
//   color: gridColor, // Set the initial grid color
//   wireframe: true, // Display the grid as wireframe
//   transparent: true,
//   opacity: 1, // Adjust the opacity of the grid
// });

// const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
// gridMesh.rotation.x = -Math.PI / 2; // Rotate the grid to be horizontal
// gridMesh.position.y = -0.51; // Adjust the Y position to be just below other objects
// scene.add(gridMesh);

function startAnimation() {
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    composer.render();
  }

  camera.position.set(-3.5, 2, 3.5);
  // camera.lookAt(0, 0.9, 0);

  animate();

  // Set controls target to the center of the scene
  controls.target.set(0, 0, 0);
}

// Assuming you call these functions somewhere in your code
processJsonData();
loadModels();