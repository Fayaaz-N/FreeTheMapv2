export function createControls(rendererDom) {
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0;
    let rotY = 0;
    let zoom = 22;

    let isDragging = false;
    let lastX = 0, lastY = 0;

    rendererDom.addEventListener("pointerdown", (e)=>{
        isDragging = true;
        lastX = e.clientX; lastY = e.clientY;
        rendererDom.setPointerCapture(e.pointerId);
    });

    rendererDom.addEventListener("pointermove", (e)=>{
        if(!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;

        targetRotY += dx * 0.005;
        targetRotX += dy * 0.005;
        targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
    });

    rendererDom.addEventListener("pointerup", ()=>{ isDragging = false; });

    window.addEventListener("wheel", (e)=>{
        const delta = Math.sign(e.deltaY);
        targetRotY += delta * 0.18;
        zoom = Math.max(10, Math.min(34, zoom + delta * 0.9));
    }, { passive:true });

    return {
        get state() { return { targetRotX, targetRotY, rotX, rotY, zoom, isDragging }; },
        setTarget(rotXv, rotYv) { targetRotX = rotXv; targetRotY = rotYv; },
        setZoom(z) { zoom = z; },
        updateSmoothing() {
            rotX += (targetRotX - rotX) * 0.08;
            rotY += (targetRotY - rotY) * 0.08;
            return { rotX, rotY, zoom };
        },
        nudgeAutoRotate(amount) {
            targetRotY += amount;
        }
    };
}
