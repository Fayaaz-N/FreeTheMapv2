import * as THREE from "three";

export function createCardSphere(scene, players) {
    const group = new THREE.Group();
    scene.add(group);

    const texLoader = new THREE.TextureLoader();
    const cardW = 1.25;
    const cardH = 1.85;
    const geo = new THREE.PlaneGeometry(cardW, cardH, 1, 1);

    let radius = 10.5;
    const cards = [];

    function randomOnSphere(r){
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2*v - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        return new THREE.Vector3(x,y,z);
    }

    function makeCard(p){
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        const t = texLoader.load(p.img);
        t.colorSpace = THREE.SRGBColorSpace;
        mat.map = t;

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(randomOnSphere(radius));
        mesh.lookAt(0,0,0);
        mesh.rotateZ((Math.random()-0.5)*0.2);

        mesh.userData = p;
        group.add(mesh);
        cards.push(mesh);
    }

    players.forEach(makeCard);

    function shuffle(){
        cards.forEach(m=>{
            m.position.copy(randomOnSphere(radius));
            m.lookAt(0,0,0);
            m.rotateZ((Math.random()-0.5)*0.2);
        });
    }

    return { group, cards, shuffle };
}
