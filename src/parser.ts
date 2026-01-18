import { vec2, vec3 } from "gl-matrix";

export interface GPUObj {
    vertices: Float32Array;
    normals: Float32Array;
    textures: Float32Array;
}

export const parseObj = (obj: string): GPUObj => {
    // f, v, vn, vt
    const objFaces: string[][] = [];
    const objVertices: number[][] = [];
    const objNormals: number[][] = [];
    const objTextures: number[][] = [];

    const lines = obj.split("\n");

    for (const line of lines) {
        if (line.startsWith("v ")) {
            objVertices.push(extractNumsFromObjLine(line, "vec3"));
        }

        if (line.startsWith("vn")) {
            objNormals.push(extractNumsFromObjLine(line, "vec3"));
        }

        if (line.startsWith("vt")) {
            objTextures.push(extractNumsFromObjLine(line, "vec2"));
        }

        if (line.startsWith("f ")) {
            const face = line.split("").splice(2).join("").split(" ");
            objFaces.push(face);
        }
    }

    const GPUObj: GPUObj = {
        vertices: null,
        textures: null,
        normals: null,
    }

    // v1/vt1/vn1
    const _vertices: number[] = [];
    const _textures: number[] = [];
    const _normals: number[] = [];

    for (const face of objFaces) {
        for (const vertex of face) {
            const [vi, vti, vni] = vertex.split("/").map((i => parseInt(i) - 1));
            const v = objVertices[vi];
            const vt = objTextures[vti];
            const vn = objNormals[vni];

            _vertices.push(...v);
            _textures.push(...vt);
            _normals.push(...vn);
        }
    }

    GPUObj.vertices = new Float32Array(_vertices);
    GPUObj.textures = new Float32Array(_textures);
    GPUObj.normals = new Float32Array(_normals);

    return GPUObj;
}

const extractVecFromObjLine = (line: string, vec: "vec3" | "vec2"): vec3 | vec2 => {
    const [x, y, z] = line.trim().split(" ").splice(1).map(parseFloat);
    switch (vec) {
        case "vec3": {
            return vec3.fromValues(x, y, z);
            break;
        }

        case "vec2": {
            return vec2.fromValues(x, y);
            break;
        }
    }
}

const extractNumsFromObjLine = (line: string, vec: "vec3" | "vec2"): [number, number, number] | [number, number] => {
    const [x, y, z] = line.trim().split(" ").splice(1).map(parseFloat);
    switch (vec) {
        case "vec3": {
            return [x, y, z];
            break;
        }

        case "vec2": {
            return [x, y];
            break;
        }
    }
}