import { mat3, mat4 } from "gl-matrix";
import { Mesh3D } from "./Mesh3D";
import { vertexShaderSource, fragmentShaderSource } from "./Shaders";

export enum DrawMode {
    Arrays = "Arrays",
    Elements = "Elements",
}
export interface Mesh {
    vao: WebGLVertexArrayObject;
    verticesCount?: number;
    elementsCount?: number;
    drawMode: DrawMode;
    uMat?: mat4
}

export interface Mesh3DRaw {
    vertices: Float32Array;
    textures: Float32Array;
    normals: Float32Array;
}

export type DrawType = WebGL2RenderingContext["STREAM_DRAW"] | WebGL2RenderingContext["STATIC_DRAW"] | WebGL2RenderingContext["DYNAMIC_DRAW"]

export type MeshHandle = number;

export class Renderer3D {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;

    private program: WebGLProgram;

    private meshes: Mesh[] = [];

    private MeshHandles: Record<number, Mesh> = {};

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        const gl = canvas.getContext("webgl2");
        if (!gl) throw "No WEBGL2 for ya' Sadge :(";
        this.gl = gl;

        this._initializeProgram();

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    private _initializeProgram() {
        this.program = this.gl.createProgram();

        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (vertexShader) {
            this.gl.shaderSource(vertexShader, vertexShaderSource);
            this.gl.compileShader(vertexShader);
            this.gl.attachShader(this.program, vertexShader);
        }

        const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (fragmentShader) {
            this.gl.shaderSource(fragmentShader, fragmentShaderSource);
            this.gl.compileShader(fragmentShader);
            this.gl.attachShader(this.program, fragmentShader);
        }

        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);
    }

    addMesh(mesh: Mesh3D, drawType: DrawType = this.gl.STATIC_DRAW): MeshHandle {
        const vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.meshDataFlat.vertices), drawType);

        const vertexCount = mesh.meshDataFlat.vertices.length;

        const defaultNormalBuffer = new Float32Array([...Array(vertexCount * 3).fill(0).map((_itm, idx) => (idx+1)%3 == 0 ? -1 : 0)]);
        const normalsArray = mesh.meshDataFlat.normals.length > 0 ? mesh.meshDataFlat.normals : defaultNormalBuffer;
        
        {
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, normalsArray, drawType);
            
            const normalLocation = this.gl.getAttribLocation(this.program, "normal");
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.enableVertexAttribArray(normalLocation);
            this.gl.vertexAttribPointer(normalLocation, 3, this.gl.FLOAT, false, 0, 0);
        }

        if (mesh.meshDataFlat.indices) {
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.meshDataFlat.indices), drawType);
        }

        const positionLocation = this.gl.getAttribLocation(this.program, "position");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        let identity = mat4.create();

        // const uMatLocation = this.gl.getUniformLocation(this.program, "uMat");
        // this.gl.uniformMatrix4fv(uMatLocation, false, new Float32Array(mesh.transform ?? identity))

        this.gl.bindVertexArray(null);

        // ------------------------------------------------

        const createdMesh: Mesh = {
            vao,
            verticesCount: mesh.meshDataFlat.vertices.length/3,
            elementsCount: mesh.meshDataFlat.indices.length,
            drawMode: mesh.meshDataFlat.indices.length > 0 ? DrawMode.Elements : DrawMode.Arrays,
        }
        this.meshes.push(createdMesh);

        const meshHandle = parseInt(Math.random().toString().split(".")[1]);

        this.MeshHandles[meshHandle] = createdMesh;

        return meshHandle;
    }

    addRaw(mesh: Mesh3DRaw, drawType: DrawType = this.gl.STATIC_DRAW): MeshHandle {
        const vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), drawType);

        const vertexCount = mesh.vertices.length;

        const defaultNormalBuffer = new Float32Array([...Array(vertexCount * 3).fill(0).map((_itm, idx) => (idx+1)%3 == 0 ? -1 : 0)]);
        const normalsArray = mesh.normals.length > 0 ? mesh.normals : defaultNormalBuffer;
        
        {
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, normalsArray, drawType);
            
            const normalLocation = this.gl.getAttribLocation(this.program, "normal");
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.enableVertexAttribArray(normalLocation);
            this.gl.vertexAttribPointer(normalLocation, 3, this.gl.FLOAT, false, 0, 0);
        }


        const positionLocation = this.gl.getAttribLocation(this.program, "position");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        let identity = mat4.create();

        // const uMatLocation = this.gl.getUniformLocation(this.program, "uMat");
        // this.gl.uniformMatrix4fv(uMatLocation, false, new Float32Array(mesh.transform ?? identity))

        this.gl.bindVertexArray(null);

        // ------------------------------------------------

        const createdMesh: Mesh = {
            vao,
            verticesCount: mesh.vertices.length/3,
            drawMode: DrawMode.Arrays,
        }

        this.meshes.push(createdMesh);

        const meshHandle = parseInt(Math.random().toString().split(".")[1]);

        this.MeshHandles[meshHandle] = createdMesh;

        return meshHandle;
    }

    renderAllMeshes() {
        this.meshes.forEach(mesh => {
            this.gl.bindVertexArray(mesh.vao);
            switch(mesh.drawMode) {
                case DrawMode.Arrays:
                    this.gl.drawArrays(this.gl.TRIANGLES, 0, mesh.verticesCount);
                    break;
                
                case DrawMode.Elements:
                    this.gl.drawElements(this.gl.TRIANGLES, mesh.elementsCount, this.gl.UNSIGNED_INT, 0)
                    break;
            }
        })
    }

    renderMesh(meshHandle: MeshHandle, model: mat4 = mat4.create(), persp: mat4 = mat4.create(), isColliding = false) {
        const mesh = this.MeshHandles[meshHandle];

        if (!mesh) {
            console.error(`No mesh found with meshHandle: ${meshHandle}`)
            return;
        }

        this.gl.bindVertexArray(mesh.vao);

        const uMat = this.gl.getUniformLocation(this.program, "uMat");
        this.gl.uniformMatrix4fv(uMat, false, new Float32Array(model));

        const uPersp = this.gl.getUniformLocation(this.program, "uPersp");
        this.gl.uniformMatrix4fv(uPersp, false, new Float32Array(persp));

        const uColour = this.gl.getUniformLocation(this.program, "uColour");
        const [r,g,b] = isColliding ? [255, 23, 68] : [0, 230, 118];
        this.gl.uniform3f(uColour, r/255, g/255, b/255);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, model);

        const uNormalMatrix = this.gl.getUniformLocation(this.program, "uNormalMatrix");
        this.gl.uniformMatrix3fv(uNormalMatrix, false, new Float32Array(normalMatrix));

        switch(mesh.drawMode) {
            case DrawMode.Arrays:
                this.gl.drawArrays(this.gl.TRIANGLES, 0, mesh.verticesCount);
                break;
            
            case DrawMode.Elements:
                this.gl.drawElements(this.gl.TRIANGLES, mesh.elementsCount, this.gl.UNSIGNED_INT, 0)
                break;
        }
    }
}