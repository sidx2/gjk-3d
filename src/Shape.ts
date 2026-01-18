import { Vec3 } from "./Vec";

export class Shape {
    position: Vec3;
    vertices: Vec3[];
    scale: number = 1;
    transform: Vec3;

    constructor(position: Vec3, vertices: Vec3[] = []) {
        this.position = position;
        this.vertices = vertices;
        this.setPosition(this.position);
    }

    setScale(s: number) {
        this.scale = s;
    }

    setPosition(p: Vec3) {
        this.vertices = this.vertices.map(v => v.add(p));
    }

    farthestPoint(d: Vec3): Vec3 {
        let prevDot = -Infinity;
        let result: Vec3 = Vec3.UP;
        this.vertices.forEach((v) => {
            const currDot = d.dot(v);
            if (currDot > prevDot) {
                prevDot = currDot;
                result = v;
            }
        });

        return result;
    }
}