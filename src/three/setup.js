import * as THREE from "three";

export function createThree(appEl) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 200);
    camera.position.set(0, 0, 22);

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    appEl.appendChild(renderer.domElement);

    // light
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 0.35);
    dir.position.set(10, 12, 14);
    scene.add(dir);

    return { scene, camera, renderer };
}
