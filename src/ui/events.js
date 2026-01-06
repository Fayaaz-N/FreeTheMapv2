import * as THREE from "three";

export function bindUI({ ui, three, cardsApi, controls }) {
    const { camera, renderer } = three;
    const { cards } = cardsApi;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;
    let autoRotate = true;

    function setTip(show, x=0, y=0, html=""){
        ui.tip.style.opacity = show ? 1 : 0;
        if(show){
            ui.tip.style.left = x + "px";
            ui.tip.style.top  = y + "px";
            ui.tip.innerHTML = html;
        }
    }

    window.addEventListener("pointermove", (e)=>{
        mouse.x = (e.clientX / innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(cards, false);

        if(hits.length){
            const hit = hits[0].object;
            if(hovered !== hit){
                if(hovered) hovered.scale.setScalar(1);
                hovered = hit;
                hovered.scale.setScalar(1.22);
            }
            const p = hit.userData;
            setTip(true, e.clientX, e.clientY, `<b>${p.name}</b><span>${p.club} • ${p.year}</span>`);
        } else {
            if(hovered) hovered.scale.setScalar(1);
            hovered = null;
            setTip(false);
        }
    });

    window.addEventListener("click", ()=>{
        if(!hovered) return;
        const p = hovered.userData;
        ui.drawer.style.display = "block";
        ui.dName.textContent = p.name;
        ui.dImg.src = p.img;
        ui.dMeta.innerHTML = `
      <div><span class="muted">Jaar:</span> ${p.year}</div>
      <div><span class="muted">Club:</span> ${p.club}</div>
      <div><span class="muted">Land:</span> ${p.country}</div>
      <div style="margin-top:8px" class="muted">Klik buiten / Close om te sluiten.</div>
    `;
    });

    ui.dClose.addEventListener("click", ()=> ui.drawer.style.display = "none");
    window.addEventListener("keydown", (e)=>{
        if(e.key === "Escape") ui.drawer.style.display = "none";
    });

    window.addEventListener("pointerdown", (e)=>{
        if(ui.drawer.style.display !== "block") return;
        const isInside = ui.drawer.contains(e.target);
        const isButton = e.target.classList && e.target.classList.contains("pill");
        if(!isInside && !isButton){
            ui.drawer.style.display = "none";
        }
    });

    ui.btnReset.addEventListener("click", ()=>{
        controls.setTarget(0, 0);
        controls.setZoom(22);
    });

    ui.btnShuffle.addEventListener("click", ()=>{
        cardsApi.shuffle();
    });

    ui.btnAuto.addEventListener("click", ()=>{
        autoRotate = !autoRotate;
        ui.btnAuto.textContent = autoRotate ? "AUTO ROTATE" : "AUTO OFF";
    });

    return {
        isAutoRotate: () => autoRotate,
        getHovered: () => hovered
    };
}
