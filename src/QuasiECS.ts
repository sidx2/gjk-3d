import { mat3, mat4, quat, vec2, vec3 } from "gl-matrix";
import { parseObj } from "./parser"
import { cubeObj, ecoSphereObj } from "./data"
import { vertexShaderSource, fragmentShaderSource } from "./Shaders";
import { screenPointToRay, rayTriangleIntersection, makeGizmo, transformVertices, orientZAxisGizmo, transformRay } from "./utils"
import { gjk3d } from "./gjk";

class Input {
    mousePos: vec2;
    mouseDelta: vec2;
    mouseDown: boolean;
    keys: Set<string>

    constructor() {
        this.mousePos = vec2.create();
        this.mouseDelta = vec2.create();
        this.keys = new Set();
    }
}

type Camera = mat4;

class Geometry {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices?: Uint32Array;

    constructor(
        positions: Float32Array,
        normals?: Float32Array,
        uvs?: Float32Array,
        indices?: Uint32Array,
    ) {
        this.positions = positions;
        this.normals = normals;
        this.uvs = uvs;
        this.indices = indices;
    }
}

class Mesh {
    geometry: Geometry;
    vao: WebGLVertexArrayObject;
    indexCount: number;
    verticesCount: number;
    indexed: boolean;
}

type P = {
    position: vec3
    rotation: quat
    scale: vec3
};

class Transform {
    position: vec3 = vec3.create();
    rotation: quat = quat.create();
    scale: vec3 = vec3.fromValues(1, 1, 1);

    constructor(
        params: Partial<P> = {
            position: vec3.create(), 
            rotation: quat.create(), 
            scale: vec3.fromValues(1, 1, 1),
        }
    ) {
        this.position = params.position;
        this.rotation = params.rotation;
        this.scale = params.scale;
    }

    getMatrix(): mat4 {
        return mat4.fromRotationTranslationScale(
            mat4.create(),
            this.rotation,
            this.position,
            this.scale,
        )
    }

    clone(): Transform {
        const t = new Transform();
        vec3.copy(t.position, this.position);
        quat.copy(t.rotation, this.rotation);
        vec3.copy(t.scale, this.scale);
        return t;
    }
}

class Material {
    color: vec3;

    constructor(color: vec3 = vec3.fromValues(1, 1, 1)) {
        this.color = color;
    }
}

export class Entity {
    id: number;

    transform: Transform;
    mesh: Mesh | null;
    material: Material;
    isColliding: boolean = false;

    constructor(mesh: Mesh | null, transform: Transform, material = new Material()) {
        this.id = parseInt(Math.random().toString().split(".")[1]);

        this.mesh = mesh;
        this.transform = transform;
        this.material = material;
    }

    get geometry(): Geometry {
        return this.mesh.geometry;
    }

    clone(): Entity {
        return new Entity(
            this.mesh,               // shared GPU mesh
            this.transform.clone()   // deep copy transform
        );
    }

    cloneLinked(): Entity {
        const e = new Entity(this.mesh, this.transform.clone());
        e.material = this.material; // same reference
        return e;
    }

    // cloneDeep(renderer: Renderer): Entity {
    //     const newMesh = renderer.cloneMesh(this.mesh);
    //     return new Entity(
    //         newMesh,
    //         this.transform.clone()
    //     );
    // }
    
    
}

class Scene {
    entities: Entity[] = [];

    add(entity: Entity) {
        this.entities.push(entity);
    }
}

type Collision = {
    a: Entity;
    b: Entity;
    normal?: vec3;
    penetration?: number;
}

class CollisionSystem {
    collisions: Collision[] = [];

    constructor() {
    }

    update(entities: Entity[]) {
        this.collisions.length = 0;

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                const a = transformVertices(Array.from(entity1.geometry.positions), entity1.transform.getMatrix())
                const b = transformVertices(Array.from(entity2.geometry.positions), entity2.transform.getMatrix())

                if (gjk3d(a, b)) {
                    this.collisions.push({
                        a: entity1, b: entity2, 
                    });
                }
            }
        }
    }
}

class Selection {
    entity: Entity | null = null;
}

class TransformGizmo {
    mode: "translate" = "translate";
    axis: "x" | "y" | "z" | "free" | null = null;

    active: boolean = false;
    startPointWorld: vec3;
}

class Editor {
    selection: Selection;
    gizmo: TransformGizmo;
    scene: Scene;
    gizmoScene: Scene;
    gizmoZArmEntity: Entity;
    hovered: Entity;
    selectedEntity: Entity;

    dt = 1/30;
    constructor(scene: Scene) {
        this.scene = scene;
        this.selection = new Selection();

        this.gizmo = new TransformGizmo();
        this.gizmoScene = this._createGizmoScene();
    }

    update(input: Input, camera: Camera) { 
        if (this.selectedEntity !== null && input.mouseDown) {
            const [dx, dy] = input.mouseDelta;

            if (this.gizmo.axis !== null) {
                let addVec = vec3.create();
                const delta = (dx*this.dt + -dy*this.dt)/2;
                switch (this.gizmo.axis) {
                    case "x":
                        addVec = vec3.fromValues(delta, 0, 0);
                        break;

                    case "y":
                        addVec = vec3.fromValues(0, delta, 0);
                        break;

                    case "z":
                        addVec = vec3.fromValues(0, 0, delta);
                        break;

                }

                vec3.add(
                    this.selectedEntity.transform.position, 
                    this.selectedEntity.transform.position, 
                    addVec,
                ); 

                for (const gizmoEntity of this.gizmoScene.entities) {
                    vec3.add(
                        gizmoEntity.transform.position, 
                        gizmoEntity.transform.position, 
                        addVec
                    );
                }
            }

            vec2.set(input.mouseDelta, 0, 0);

        }
    }

    pick(screenX: number, screenY: number, camera: mat4) {
        // if (this.selectedEntity != null) {
        //     this.pickGizmoArm(screenX, screenY, camera);
        // }

        this.pickObject(screenX, screenY, camera)
    }

    pickGizmoArm(screenX: number, screenY: number, camera: mat4) {
        const ray = screenPointToRay(screenX, screenY, canvas.width, canvas.height, camera);
    }

    pickObject(screenX: number, screenY: number, camera: mat4) {
        const ray = screenPointToRay(screenX, screenY, canvas.width, canvas.height, camera);
        let closestEntity: Entity | null = null;
        let closestT = Infinity;
        let hitNormal: vec3 | null = null;

        for (const entity of scene.entities) {
            for (let i = 0; i < entity.geometry.positions.length / 9; i++) {
                let t = NaN;
                const triange = entity.geometry.positions.slice(i * 9, (i * 9) + 9);
                const hit = rayTriangleIntersection(
                    ray,
                    Array.from(triange),
                    entity.transform.getMatrix(),
                    t,
                )

                if (hit !== false) {
                    if (hit.t < closestT) {
                        closestT = hit.t;
                        hitNormal = hit.N;
                        closestEntity = entity;
                    }
                }

            }
        }

        this.selectedEntity = closestEntity;

        if (this.selectedEntity !== null) {
            for (const gizmoEntity of this.gizmoScene.entities) {
                const [x, y, z] = mat4.getTranslation(mat4.create(), this.selectedEntity.transform.getMatrix()); // this.selectedEntity.transform.position;
                vec3.set(gizmoEntity.transform.position, x, y, z);
            }
        }

        const arms = [this.gizmoScene.entities[0], this.gizmoScene.entities[1], this.gizmoScene.entities[2]];
        let hitArm = -1;

        for (let e = 0; e < 3; e++) {
            const entity = arms[e];

            for (let i = 0; i < entity.geometry.positions.length / 9; i++) {
                let t = NaN;
                const triange = entity.geometry.positions.slice(i * 9, (i * 9) + 9);
                const hit = rayTriangleIntersection(
                    ray,
                    Array.from(triange),
                    entity.transform.getMatrix(),  // mat4.getTranslation(vec3.create(), this.selectedEntity.transform.getMatrix()),
                    t,
                )

                if (hit !== false) {
                    hitArm = e;
                    break;
                }

            }
        }

        switch (hitArm) {
            case (-1): { this.gizmo.axis = null; break; }
            case (0) : { this.gizmo.axis = "x"; break; }
            case (1) : { this.gizmo.axis = "y"; break; }
            case (2) : { this.gizmo.axis = "z"; break; }
            
        }

        this.gizmo.active = this.selectedEntity !== null;
    }

    _createGizmoScene(): Scene {
        let gizmoData = makeGizmo();
        const gizmoGeometry = new Geometry(gizmoData.vertices);
        const gizmoMesh = render.createMesh(gizmoGeometry);

        const gizmoYArmEntity = new Entity(gizmoMesh, new Transform(), new Material(vec3.fromValues(0.95, 0.25, 0.25)));
        const gizmoXArmEntity = gizmoYArmEntity.clone();
        vec3.set(gizmoXArmEntity.material.color, 0.25, 0.95, 0.35);
        const gizmoZArmEntity = gizmoYArmEntity.clone();
        vec3.set(gizmoZArmEntity.material.color, 0.35, 0.45, 0.95);

        this.gizmoZArmEntity = gizmoZArmEntity;

        vec3.set(gizmoYArmEntity.transform.position, 0,0,-3);
        vec3.set(gizmoXArmEntity.transform.position, 0,0,-3);
        vec3.set(gizmoZArmEntity.transform.position, 0,0,-3);

        quat.rotateZ(gizmoYArmEntity.transform.rotation, quat.create(), -Math.PI/2);
        quat.rotateZ(gizmoZArmEntity.transform.rotation, quat.create(), Math.PI/2+Math.PI/6);
        // quat.rotateZ(gizmoZArmEntity.transform.rotation, quat.create(), -0.9);
        // vec3.scale(gizmoZArmEntity.transform.scale, gizmoZArmEntity.transform.scale, 0.75)

        const gizmoScene = new Scene();
        gizmoScene.add(gizmoYArmEntity);
        gizmoScene.add(gizmoXArmEntity);
        gizmoScene.add(gizmoZArmEntity);

        return gizmoScene;
    }
}

class Renderer {
    gl: WebGL2RenderingContext
    program: WebGLProgram;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        this._initializeProgram();

        gl.enable(gl.DEPTH_TEST);
        // gl.enable(gl.BLEND);
        // gl.depthMask(false);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    private depth(d: boolean) {
        if (d) {
            gl.enable(gl.DEPTH_TEST);
            gl.depthMask(true); 
        } else {
            gl.disable(gl.DEPTH_TEST);
            gl.depthMask(false);
        }
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

    render(scene: Scene, camera: Camera, editor: Editor, collisionSystem?: CollisionSystem) {
        this.depth(true);
        for (const entity of scene.entities) {
            const isEntityColliding = collisionSystem?.collisions.some(e => (e.a === entity || e.b === entity));
            if (entity.mesh) {
                if (isEntityColliding === true) {
                    this.drawMesh(entity, vec3.fromValues(1.00, 0.35, 0.10));
                }
                else if (entity == editor.selectedEntity) {
                    this.drawMesh(entity, vec3.fromValues(1.00, 0.90, 0.25));
                   
                } else {
                    this.drawMesh(entity, entity.material.color);
                }
            }
        }

        this.depth(false);
        if (editor.gizmo.active) {
            for (const entity of editor.gizmoScene.entities) {
                if (entity.mesh) {
                    this.drawMesh(entity, entity.material.color);
                }
            }
        }

        this.depth(true);
    }

    drawMesh(entity: Entity, color: vec3) {
        this.gl.bindVertexArray(entity.mesh.vao);
        if (!entity.mesh.indexCount) {
            this.gl.bindVertexArray(entity.mesh.vao);

            const model = entity.transform.getMatrix();

            const uMat = this.gl.getUniformLocation(this.program, "uMat");
            this.gl.uniformMatrix4fv(uMat, false, new Float32Array(model));

            const uPersp = this.gl.getUniformLocation(this.program, "uPersp");
            this.gl.uniformMatrix4fv(uPersp, false, new Float32Array(camera));

            const uColour = this.gl.getUniformLocation(this.program, "uColour");
            const [r, g, b] = color;
            this.gl.uniform3f(uColour, r, g, b);

            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, model);

            const uNormalMatrix = this.gl.getUniformLocation(this.program, "uNormalMatrix");
            this.gl.uniformMatrix3fv(uNormalMatrix, false, new Float32Array(normalMatrix));

            // switch(entity.mesh.drawMode) {
            //     case DrawMode.Arrays:
            this.gl.drawArrays(this.gl.TRIANGLES, 0, entity.mesh.verticesCount);
            //         break;

            //     case DrawMode.Elements:
            //         this.gl.drawElements(this.gl.TRIANGLES, entity.mesh.indexCount, this.gl.UNSIGNED_INT, 0)
            //         break;

            // }                
        }
    }

    createMesh(geometry: Geometry, drawType: GLenum = this.gl.STATIC_DRAW): Mesh {
        const { gl } = this;

        const vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

        const vertexCount = geometry.positions.length / 3;

        const defaultNormalBuffer = new Float32Array([...Array(vertexCount * 3).fill(0).map((_itm, idx) => (idx + 1) % 3 == 0 ? -1 : 0)]);
        const normalsArray = geometry.normals?.length ? geometry.normals : defaultNormalBuffer;

        {
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, normalsArray, drawType);

            const normalLocation = this.gl.getAttribLocation(this.program, "normal");
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.enableVertexAttribArray(normalLocation);
            this.gl.vertexAttribPointer(normalLocation, 3, this.gl.FLOAT, false, 0, 0);
        }

        if (geometry.indices?.length > 0) {
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, geometry.indices, drawType);
        }

        const positionLocation = this.gl.getAttribLocation(this.program, "position");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindVertexArray(null);

        const mesh = new Mesh();
        mesh.vao = vao;
        mesh.indexCount = 0;
        mesh.verticesCount = geometry.positions.length / 3;
        mesh.indexed = false;
        mesh.geometry = geometry;

        gl.bindVertexArray(null);
        return mesh;
    }
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.width = 16 * 80;
canvas.height = 9 * 80;
const gl = canvas.getContext('webgl2');
if (!gl) throw "No webgl2";

let ecoSphereData = parseObj(ecoSphereObj);
const ecoSphereGeometry = new Geometry(ecoSphereData.vertices, ecoSphereData.normals);

let cubeData = parseObj(cubeObj);
const cubeGeometry = new Geometry(cubeData.vertices, cubeData.normals);

const render = new Renderer(gl);

const ecoSphereMesh = render.createMesh(ecoSphereGeometry);
const cubeMesh = render.createMesh(cubeGeometry);

const ecoSphereEntity = new Entity(ecoSphereMesh, new Transform(), new Material(vec3.fromValues(0.40, 0.75, 0.95)));
const cubeEntity = new Entity(cubeMesh, new Transform(), new Material(vec3.fromValues(0.40, 0.75, 0.95)));

ecoSphereEntity.id = 69;
cubeEntity.id = 420;

vec3.set(ecoSphereEntity.transform.position, 2, 0, -4);
vec3.set(cubeEntity.transform.position, -2, 0, -4);

const scene = new Scene();

scene.add(ecoSphereEntity);
scene.add(cubeEntity);

const camera = mat4.perspective(mat4.create(), 100 / 180 * Math.PI, 16 / 9, 1e-3, 1e3);

const input = new Input();
const editor = new Editor(scene);
const collisionSystem = new CollisionSystem();

const loop = () => {
    quat.rotateY(ecoSphereEntity.transform.rotation, ecoSphereEntity.transform.rotation, 0.01);
    quat.rotateY(cubeEntity.transform.rotation, cubeEntity.transform.rotation, -0.017);

    editor.update(input, camera);

    collisionSystem.update(scene.entities);

    render.render(scene, camera, editor, collisionSystem);

    window.requestAnimationFrame(loop);
}

loop();


canvas.addEventListener("mousemove", (e) => {
    const { offsetX, offsetY, movementX, movementY } = e;
    vec2.set(input.mousePos, offsetX, offsetY);
    vec2.set(input.mouseDelta, movementX, movementY);

});

canvas.addEventListener("mousedown", (e) => {
    input.mouseDown = true;
    const { offsetX, offsetY } = e;
    editor.pick(offsetX, offsetY, camera);
});

canvas.addEventListener("mouseup", (e) => {
    input.mouseDown = false;
});
