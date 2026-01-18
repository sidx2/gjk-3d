import { mat4, vec3 } from "gl-matrix";
import { cubeObj, ecoSphereObj } from "./data"
import { Renderer3D } from "./Renderer";
import { parseObj } from "./parser";
import { gjk3d } from "./gjk";
import { transformVertices } from "./utils"

const fps = document.getElementById("fps") as HTMLDivElement;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.width = 16 * 80;
canvas.height = 9 * 80;
const gl = canvas.getContext('webgl2');
if (!gl) throw "No webgl2";

const renderer = new Renderer3D(canvas);

const cubeGPUObj = parseObj(cubeObj);
const ecoSphereGPUObj = parseObj(ecoSphereObj);

const model = mat4.create();
const cubeModel = mat4.create();

mat4.translate(model, model, vec3.fromValues(0.85, 0, -3));
mat4.translate(cubeModel, cubeModel, vec3.fromValues(-1.39, 0, -3));

mat4.scale(model, model, vec3.fromValues(1.5, 1.5, 1.5));

let persp: mat4 = mat4.create();
mat4.perspective(persp, Math.PI / 2, 16 / 9, 0.001, 1000);

// cube.transform = model;

const ecoSphereMeshHandle = renderer.addRaw(ecoSphereGPUObj);
const cubeMeshHandle = renderer.addRaw(cubeGPUObj);

let angle = 0.05;
let samples = [];
const MAX = 60;

let prev = performance.now();

const s1 = transformVertices(Array.from(ecoSphereGPUObj.vertices), model);
const s2 = transformVertices(Array.from(cubeGPUObj.vertices), cubeModel);

console.log(gjk3d(Array.from(s1), Array.from(s2)));

const loop = () => {
    const now = performance.now();
    const dt = now - prev;
    prev = now;

    samples.push(dt);
    if (samples.length > MAX) samples.shift();

    const avgDt = samples.reduce((a, b) => a + b, 0) / samples.length;
    const fpsValue = Math.round(1000 / avgDt);

    fps.innerText = `FPS: ${fpsValue}`;

    const s1 = transformVertices(Array.from(ecoSphereGPUObj.vertices), model);
    const s2 = transformVertices(Array.from(cubeGPUObj.vertices), cubeModel);

    const isColliding = gjk3d(Array.from(s1), Array.from(s2));

    // mat4.rotateY(model, model, angle);
    mat4.rotateY(cubeModel, cubeModel, angle * 0.85);
    renderer.renderMesh(ecoSphereMeshHandle, model, persp, isColliding);
    renderer.renderMesh(cubeMeshHandle, cubeModel, persp, isColliding);

    handleInputs(dt / 1000);

    window.requestAnimationFrame(loop);
}

const keys: any = {}

const handleInputs = (dt: number) => {
    if (keys['w']) {
        mat4.translate(persp, persp, vec3.fromValues(0, 0, 5 * dt));
    }

    if (keys['s']) {
        mat4.translate(persp, persp, vec3.fromValues(0, 0, -5 * dt));
    }

    if (keys['a']) {
        mat4.translate(model, model, vec3.fromValues(-5 * dt, 0, 0));
    }

    if (keys['d']) {
        mat4.translate(model, model, vec3.fromValues(5 * dt, 0, 0));
    }
}

loop();

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
})

window.addEventListener('keyup', (e) => {
    keys[e.key] = undefined;
})