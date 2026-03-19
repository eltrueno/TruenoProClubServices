<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, render } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box3, Vector3 } from 'three';



const containerRef = ref(null);
let renderer: THREE.WebGLRenderer | null = null;
let animationId: number | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let boxSize
let distance

const loaded = ref(false)

const props = defineProps({
  kit: String
});


function animate() {
  animationId = requestAnimationFrame(animate);
  // actualiza cámara/controles si tienes y renderiza
  controls?.update();
  renderer?.render(scene, camera);
}
function init() {
    if (!containerRef.value) return;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.value.appendChild(renderer.domElement);


    const canvas = containerRef.value;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 2;

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    // Luz ambiental más intensa
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Luz hemisférica más potente
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    scene.add(hemisphereLight);

    // Luz direccional potente (como el sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 15, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Luz puntual para detalles desde otro lado
    const pointLight1 = new THREE.PointLight(0xffffff, 0.8);
    pointLight1.position.set(-5, 10, -5);
    scene.add(pointLight1);

    // Luz puntual extra para relleno suave
    const pointLight2 = new THREE.PointLight(0xffffff, 0.8);
    pointLight2.position.set(0, 5, -10);
    scene.add(pointLight2);

    const loader = new GLTFLoader();
    loader.load(`/models/jerseys/${props.kit}.glb`, (gltf) => {
        scene!.add(gltf.scene);

        // Calculamos el bounding box
        const box = new Box3().setFromObject(gltf.scene);
        const center = new Vector3();
        box.getCenter(center);

        // Centramos el modelo en el origen
        gltf.scene.position.x += (gltf.scene.position.x - center.x);
        gltf.scene.position.y += (gltf.scene.position.y - center.y);
        gltf.scene.position.z += (gltf.scene.position.z - center.z);

        // Ponemos la cámara para verlo
        boxSize = box.getSize(new Vector3());
        const size = boxSize.length()
        distance = size * 1.5;

        camera!.position.set(0, size / 8, distance/2.2);
        camera!.lookAt(0, size / 8, 0);


        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;

        controls.enablePan = false

        controls.maxDistance = boxSize.y * 1.2
        controls.minDistance = boxSize.y * 0.5

        controls.minPolarAngle = Math.atan2(boxSize.y * 0.8, boxSize.z)
        controls.maxPolarAngle = Math.atan2(boxSize.y * 5, boxSize.z)

        loaded.value = true


    }, undefined, (error) => {
        console.error('Error loading model:', error);
    });

    animate()

    window.addEventListener('resize', onResize);

}

function onResize() {
  if (!containerRef.value || !camera || !renderer) return;
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
}

function dispose() {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
    renderer = null;
  }
  scene = null;
  camera = null;
  controls = null;
  window.removeEventListener('resize', onResize);
  loaded.value = false
}

let observer: IntersectionObserver | null = null;

onMounted(() => {

    observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!renderer) init();
      } else {
        dispose();
      }
    });
  }, { threshold: 0.1 });

  if (containerRef.value) {
    observer.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  dispose();
  if (observer && containerRef.value) {
    observer.unobserve(containerRef.value);
  }
});

</script>

<template>
  <div ref="containerRef" style="width: 100%; height: 500px;">
    <div class="skeleton dark:bg-base-100 w-full h-[500px] skeletondark" v-if="!loaded"></div>
  </div>
</template>
