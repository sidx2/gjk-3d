import { Vec3 } from "./Vec"
import { mat4 } from "gl-matrix";

export interface MeshData {
    vertices: Vec3[];
    normals?: Vec3[];
    indices?: number[];
};

export interface MeshDataFlat {
    vertices: Float32Array;
    normals?: Float32Array;
    indices?: Float32Array;
};

export class Mesh3D {
    meshData: MeshData;
    meshDataFlat: MeshDataFlat;
    transform: mat4;

    constructor(meshData: MeshData) {
        this.meshData = meshData;

        this.computeMeshDataFlat();
    }

    computeMeshDataFlat() {
        this.meshDataFlat ??= { vertices: new Float32Array() };
        this.meshDataFlat.vertices = new Float32Array(this.meshData.vertices.map(v => [v.x, v.y, v.z]).flat());
        this.meshDataFlat.normals = new Float32Array(this.meshData.normals?.map(v => [v.x, v.y, v.z]).flat() ?? []);
        this.meshDataFlat.indices = new Float32Array(this.meshData.indices ?? []);
    }
}