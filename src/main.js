import "./style.css";
import { players } from "./data/players.js";
import { ui } from "./ui/elements.js";
import { createThree } from "./three/setup.js";
import { createControls } from "./three/controls.js";
import { createCardSphere } from "./three/cards.js";
import { bindUI } from "./ui/events.js";

const three = createThree(ui.app);
const controls = createControls(three.renderer.domElement);
const cardsApi = createCardSphere(three.scene, players);
const uiApi = bindUI({ ui, three, cardsApi, controls });

function animate(){
    requestAnimationFrame(animate);

    const { rotX, rotY, zoom } = controls.updateSmoothing();

    if (uiApi.isAutoRotate() && !controls.state.isDragging) {
        controls.nudgeAutoRotate(0.0035);
    }

    // camera orbit
    const r = zoom;
    const x = r * Math.sin(rotY) * Math.cos(rotX);
    const y = r * Math.sin(rotX);
    const z = r * Math.cos(rotY) * Math.cos(rotX);

    three.camera.position.set(x,y,z);
    three.camera.lookAt(0,0,0);

    three.renderer.render(three.scene, three.camera);
}
animate();

window.addEventListener("resize", ()=>{
    three.camera.aspect = innerWidth/innerHeight;
    three.camera.updateProjectionMatrix();
    three.renderer.setSize(innerWidth, innerHeight);
});
