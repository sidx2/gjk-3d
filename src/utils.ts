import { vec3, vec4, mat4, quat2, quat } from "gl-matrix";
import { GPUObj } from "./parser";
import { Entity } from "./QuasiECS";

export const transformVertices = (vertices: number[], model: mat4): number[] => {
    const out: number[] = [];

    const v4 = vec4.create();
    const res = vec4.create();

    for (let i = 0; i < vertices.length; i += 3) {
        v4[0] = vertices[i];
        v4[1] = vertices[i + 1];
        v4[2] = vertices[i + 2];
        v4[3] = 1.0; // IMPORTANT

        vec4.transformMat4(res, v4, model);

        out.push(res[0], res[1], res[2]);
    }

    return out;
}

export function screenPointToRay(
    screenX: number,
    screenY: number,
    screenWidth: number,
    screenHeight: number,
    projection: mat4
) {
    // Screen → NDC
    const x = (2 * screenX) / screenWidth - 1;
    const y = 1 - (2 * screenY) / screenHeight;

    const invProj = mat4.invert(mat4.create(), projection);

    // Point on FAR plane in clip space
    const farClip = vec4.fromValues(x, y, 1, 1);

    // Unproject to view/world space
    vec4.transformMat4(farClip, farClip, invProj);
    vec3.scale(farClip as any, farClip as any, 1 / farClip[3]);

    const origin = vec3.fromValues(0, 0, 0);
    const direction = vec3.normalize(
        vec3.create(),
        vec3.fromValues(farClip[0], farClip[1], farClip[2])
    );

    return { O: origin, D: direction };
}


const EPSILON = 1e-6;
export const rayTriangleIntersection = (ray: { O: vec3, D: vec3 }, triangle: number[], transform: mat4, t: number = NaN): false | { N: vec3, t: number } => {

    if (triangle.length !== 9) {
        console.error("Invalid triangle");
        return false;
    }

    // const P0 = triangleTranslation;
    const L0 = ray.O;
    const L = ray.D;

    let i = 0;
    const A = vec3.fromValues(triangle[i++], triangle[i++], triangle[i++]);
    const B = vec3.fromValues(triangle[i++], triangle[i++], triangle[i++]);
    const C = vec3.fromValues(triangle[i++], triangle[i++], triangle[i++]);

    vec3.transformMat4(A, A, transform);
    vec3.transformMat4(B, B, transform);
    vec3.transformMat4(C, C, transform);

    const AB = vec3.sub(vec3.create(), B, A);
    const AC = vec3.sub(vec3.create(), C, A);

    const N = vec3.cross(vec3.create(), AB, AC);

    const denom = vec3.dot(L, N);

    if (Math.abs(denom) < EPSILON) return false;

    t = vec3.dot(vec3.sub(vec3.create(), A, L0), N) / denom;

    if (t < 0) return false; // behind triangle

    const P = vec3.scaleAndAdd(vec3.create(), ray.O, ray.D, t);
    // inside test

    let edge = vec3.sub(vec3.create(), B, A);
    let vp = vec3.sub(vec3.create(), P, A);
    if (vec3.dot(N, vec3.cross(vec3.create(), edge, vp)) < 0) return false;

    edge = vec3.sub(vec3.create(), C, B);
    vp = vec3.sub(vec3.create(), P, B);
    if (vec3.dot(N, vec3.cross(vec3.create(), edge, vp)) < 0) return false;

    edge = vec3.sub(vec3.create(), A, C);
    vp = vec3.sub(vec3.create(), P, C);
    if (vec3.dot(N, vec3.cross(vec3.create(), edge, vp)) < 0) return false;

    return { N, t };
}

export const makeGizmo = (): GPUObj => {
    const YArm = [
        // rect
        -0.05, 0, 0,
         0.05, 0, 0,
        -0.05,  1, 0,
    
        -0.05,  1, 0,
         0.05, 0, 0,
         0.05,  1, 0,
    
        // arrow head
        -0.05,  1, 0,
         0.05,  1, 0,
         0.00,  1.1, 0,
    ];
    

    return {
        vertices: new Float32Array(YArm),
        textures: null,
        normals: null,
    }
}

function remap(
    v: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
) {
    const t = (v - inMin) / (inMax - inMin);
    return outMin + t * (outMax - outMin);
}

interface Ray {
    O: vec3;
    D: vec3;
}

export function transformRay(ray: Ray, m: mat4): Ray {
    const o = vec3.transformMat4(vec3.create(), ray.O, m);

    // direction: no translation
    const d4 = vec4.fromValues(ray.D[0], ray.D[1], ray.D[2], 0);
    vec4.transformMat4(d4, d4, m);

    const d = vec3.normalize(vec3.create(), vec3.fromValues(d4[0], d4[1], d4[2]));

    return { O: o, D: d };
}



export function orientZAxisGizmo(
    gizmo: Entity,
    view: mat4,
    projection: mat4
) {
    const worldPos = vec3.create();
    mat4.getTranslation(worldPos, gizmo.transform.getMatrix());

    // clip space
    const clip = vec4.fromValues(worldPos[0], worldPos[1], worldPos[2], 1);
    vec4.transformMat4(clip, clip, view);
    vec4.transformMat4(clip, clip, projection);

    // NDC
    const ndcX = clip[0] / clip[3];
    const ndcY = clip[1] / clip[3];

    // clamp to [-1, 1]
    const x = Math.max(-1, Math.min(1, ndcX));
    const y = Math.max(-1, Math.min(1, ndcY));

    // angles in radians
    const min = Math.PI / 2;        // 90°
    const max = 130 * Math.PI / 180; // 130°

    const rotY = remap(Math.abs(x), 0, 1, max, min);
    const rotX = remap(Math.abs(y), 0, 1, max, min);

    quat.identity(gizmo.transform.rotation);

    // base Z axis
    quat.rotateX(gizmo.transform.rotation, gizmo.transform.rotation, -Math.PI / 2);

    // apply compensation
    quat.rotateY(gizmo.transform.rotation, gizmo.transform.rotation,
        x > 0 ? -rotY : rotY
    );

    quat.rotateX(gizmo.transform.rotation, gizmo.transform.rotation,
        y > 0 ? rotX : -rotX
    );
}

