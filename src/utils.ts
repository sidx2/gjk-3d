import { vec3, vec4, mat4 } from "gl-matrix";

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
