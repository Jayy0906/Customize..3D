import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import CustomRayCaster from "./raycaster";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set 3D scene's background color to white
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth * 0.8, window.innerHeight);

// Append the renderer's DOM element to the canvas-container
const canvasContainer = document.getElementById("canvas-container");
canvasContainer.appendChild(renderer.domElement);

//Anti Aliasing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// SSAO pass
const ssaoPass = new SSAOPass(
  scene,
  camera,
  window.innerWidth,
  window.innerHeight
);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.01;
ssaoPass.maxDistance = 0.05;
composer.addPass(ssaoPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

const customRayCaster = new CustomRayCaster(renderer, camera, scene);

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

function processJsonData() {
  fetch("MaterialData/Materials.json")
    .then((response) => response.json())
    .then((data) => {
      const jsonFiles = data;
      const materialbutton = document.querySelectorAll(".material-thumbnail");
      console.log(materialbutton);

      let draggedObject = null;

Array.from(materialbutton).forEach((item) => {
    item.addEventListener("dragstart", (e) => {
        const thumbnail = e.target;
        const materialName = thumbnail.dataset.material;
        // Store the target object (sofa or floor) in the variable
        draggedObject = materialName === 'Sofa' ? loadedSofa : loadedFloor;
        console.log("Dragged object:", draggedObject.name); // Add this line for debugging
    });

    item.addEventListener("dragend", (e) => {
      const thumbnail = e.target;
      const materialName = thumbnail.dataset.material;
      console.log("Target object:", draggedObject.name); // Add this line for debugging
      if (draggedObject) {
          const selectedJsonData = jsonFiles[materialName];
          const newMaterial = createMaterialFromJSON(selectedJsonData);
  
          if (draggedObject === loadedSofa) {
              console.log("Applying material to sofa model"); // Add this line for debugging
              // Apply material only to the sofa model
              loadedSofa.traverse((node) => {
                  if (node.isMesh) {
                      const originalMaterial = originalMaterials.get(node.uuid);
  
                      if (originalMaterial) {
                          node.material.copy(originalMaterial);
                      } else {
                          node.material = newMaterial.clone();
                      }
                  }
              });
          } else if (draggedObject === loadedFloor) {
              console.log("Applying material to floor model"); // Add this line for debugging
              // Apply material only to the floor model
              loadedFloor.traverse((node) => {
                  if (node.isMesh) {
                      const originalMaterial = originalMaterials.get(node.uuid);
  
                      if (originalMaterial) {
                          node.material.copy(originalMaterial);
                      } else {
                          node.material = newMaterial.clone();
                      }
                  }
              });
          }
          // Reset draggedObject after material change
          draggedObject = null;
      }
  });
  
});
      Object.keys(jsonFiles).forEach((materialName) => {
        const option = document.createElement("option");
        option.value = materialName;
        option.text = materialName;
      });

      let loadedSofa; // Variable to store the loaded Sofa model
      let loadedFloor;
      const originalMaterials = new Map(); // Map to store original materials by node name

      function storeOriginalMaterials(model) {
        model.traverse((node) => {
          if (node.isMesh) {
            originalMaterials.set(node.name, node.material.clone());
          }
        });
      }

      const modelPaths = [
        "models/Wall.glb",
        "models/Floor.glb",
        "models/Frame.glb",
        "models/Plant.glb",
        "models/Floor_Lamp.glb",
        "models/Coffee_Table.glb",
        "models/Accessories.glb",
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

            scene.add(loadedModel);
            scene.position.set(0, -0.5, 0);

            currentModelIndex++;
            loadNextModel();
          });
        } else {
          camera.position.set(-3.5, 2, 3.5);

          function setupHDRI() {
            const rgbeloader = new RGBELoader();
            rgbeloader.load("hdri/gem_2.hdr", (hdri) => {
              const myhdr = hdri;
              myhdr.mapping = THREE.EquirectangularReflectionMapping;
              scene.environment = myhdr;
            });
          }

          setupHDRI();

          const composer = new EffectComposer(renderer);
          const renderPass = new RenderPass(scene, camera);
          composer.addPass(renderPass);

          const ssaoPass = new SSAOPass(
            scene,
            camera,
            window.innerWidth,
            window.innerHeight
          );
          ssaoPass.kernelRadius = 16;
          ssaoPass.minDistance = 0.01;
          ssaoPass.maxDistance = 0.05;
          composer.addPass(ssaoPass);

          const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
          scene.add(ambientLight);

          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
          directionalLight.position.set(5, 5, 5);
          scene.add(directionalLight);

          function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
            composer.render();
          }

          animate();
        }
      }

      // Start loading the models
      loadNextModel();
    })
    .catch((error) => console.error("Error loading JSON file:", error));
}
// Assuming you call this function somewhere in your code
processJsonData();