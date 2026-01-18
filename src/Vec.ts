const { sqrt } = Math;

export class Vec2 {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    dot(that: Vec2): number {
        return this.x * that.x + this.y * that.y;
    }

    length() {
        return sqrt(this.x * this.x + this.y * this.y)
    }

    normalized() {
        const lengthInverse = 1/this.length();
        return new Vec2(this.x*lengthInverse, this.y*lengthInverse);
    }

    add(that: Vec2) {
        return new Vec2(this.x + that.x, this.y + that.y);
    }

    sub(that: Vec2) {
        return new Vec2(this.x - that.x, this.y - that.y);
    }

    negated(): Vec2 {
        return new Vec2(-this.x, -this.y);
    }

    toVec3(): Vec3 {
        return new Vec3(this.x, this.y, 0);
    }
}

export class Vec3 {
    x: number;
    y: number;
    z: number;

    static UP = new Vec3(0, 1, 0);

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    cross(that: Vec3) {
        return new Vec3(
            this.y * that.z - this.z * that.y,
            this.z * that.x - this.x * that.z,
            this.x * that.y - this.y * that.x
        );     
    }

    static cross(a: Vec3, b: Vec3) {
        return new Vec3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    static tripleCross(a: Vec3, b: Vec3, c: Vec3): Vec3 {
        return a.cross(b).cross(c);
    }

    dot(that: Vec3): number {
        return this.x * that.x + this.y * that.y + this.z * that.z;
    }

    length() {
        return sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalized() {
        const lengthInverse = 1/this.length();
        return new Vec3(this.x*lengthInverse, this.y*lengthInverse, this.z*lengthInverse);
    }

    add(that: Vec3) {
        return new Vec3(this.x + that.x, this.y + that.y, this.z + that.z);
    }
    
    sub(that: Vec3) {
        return new Vec3(this.x - that.x, this.y - that.y, this.z - that.z);
    }

    negated(): Vec3 {
        return new Vec3(-this.x, -this.y, -this.z);
    }

}
