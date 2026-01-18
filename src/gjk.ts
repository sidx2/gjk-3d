import { vec3 } from "gl-matrix";

const { dot } = vec3;

export const gjk3d = (s1: number[], s2: number[]): boolean => {
    if (s1.length % 3 != 0 || s2.length % 3 != 0) {
        console.error("invalid vertices for s1 or s2");
        return false;
    }

    let d = vec3.fromValues(1, 0, 0);
    const S = supportPoint(s1, s2, d)
    const points = [S];

    vec3.normalize(d, vec3.negate(d, S));

    for (let i = 0; i < 64; i++) {
        const A = supportPoint(s1, s2, d);

        if (dot(A, d) < 0) {
            return false;
        }

        points.push(A);

        if (handleSimplex(points, d)) {
            return true;
        }
    }

    return false;
}

const handleSimplex = (points: vec3[], d: vec3): boolean => {

    switch (points.length) {
        case 0:
        case 1:
            console.error(`Don't know how to handle nothing or a point`);
            break;

        case 2: { // line
            const A = points[points.length - 1];
            const B = points[points.length - 2];

            const AB = newVec3(); vec3.sub(AB, B, A);
            const AO = newVec3(); vec3.negate(AO, A);

            if (dot(AB, AO) > 0) {
                const [ x, y, z ] = tripleCross(AB, AO, AB);
                setArr(points, A, B);
                vec3.set(d, x, y, z);
            } else {
                const [ x, y, z ] = Array.from(AO);
                setArr(points, A);
                vec3.set(d, x, y, z);
            }

            return false;
            break;
        }

        case 3: { // triangle
            const A = points[2];
            const B = points[1];
            const C = points[0];

            const AB = newVec3(); vec3.sub(AB, B, A);
            const AC = newVec3(); vec3.sub(AC, C, A);
            const AO = newVec3(); vec3.negate(AO, A);

            const AB_AC = newVec3(); vec3.cross(AB_AC, AB, AC);
            const ABC = AB_AC;

            const AB_Edge = cross(AB, ABC);
            const AC_Edge = cross(ABC, AC);

            const STAR = () => {
                if (dot(AB, AO) > 0) {
                    const [x, y, z] = tripleCross(AB, AO, AB);
                    setArr(points, A, B)
                    vec3.set(d, x, y, z);
                } else {
                    setArr(points, A);
                    vec3.copy(d, AO);
                }
            }

            if (dot(cross(ABC, AC), AO) > 0) {
                if (dot(AC, AO) > 0) {
                    const [x, y, z] = tripleCross(AC, AO, AC);
                    vec3.set(d, x, y, z);
                }
                else STAR();

            } else {
                if (dot(cross(AB, ABC), AO) > 0) {
                    STAR();
                } else {
                    if (dot(ABC, AO) > 0) {
                        setArr(points, A, B, C);
                        vec3.copy(d, ABC);
                    } else {
                        setArr(points, A, C, B);
                        vec3.negate(d, ABC);
                    }
                }
            }

            return false;
            break;
        }

        case 4: { // tetrahedron
            const A = points[3];
            const B = points[2];
            const C = points[1];
            const D = points[0];

            const AB = newVec3(); vec3.sub(AB, B, A);
            const AC = newVec3(); vec3.sub(AC, C, A);
            const AD = newVec3(); vec3.sub(AD, D, A);
            const AO = newVec3(); vec3.negate(AO, A);

            const ABC = cross(AB, AC);
            const ACD = cross(AC, AD);
            const ADB = cross(AD, AB);

            if (dot(ABC, AD) > 0) vec3.negate(ABC, ABC);

            if (dot(ABC, AO) > 0) {
                setArr(points, A, B, C);
                vec3.copy(d, ABC);
                return false;
            }

            const AB_vec = AB;
            if (dot(ACD, AB_vec) > 0) vec3.negate(ACD, ACD);

            if (dot(ACD, AO) > 0) {
                setArr(points, A, C, D);
                vec3.copy(d, ACD);
                return false;
            }

            const AC_vec = AC;
            if (dot(ADB, AC_vec) > 0) vec3.negate(ADB, ADB);

            if (dot(ADB, AO) > 0) {
                setArr(points, A, D, B);
                vec3.copy(d, ADB);
                return false;
            }
            
            return true;
            break;
        }

        case 5:
        case 6:
            console.error(`Don't know how to handle polygon`);
            break;
    }
    return false;
}

const setArr = <T>(arr: T[], ...args: T[]) => {
    while (arr.length > 0) arr.shift();
    arr.push(...args);
}

const tripleCross = (a: vec3, b: vec3, c: vec3) => {
    return cross(cross(a, b), c);
}

const supportPoint = (s1: number[], s2: number[], d: vec3): vec3 => {
    const fs1 = farthestPoint(s1, d);
    let dNeg = newVec3();
    vec3.negate(dNeg, d);
    const fs2 = farthestPoint(s2, dNeg);

    const res = newVec3();
    vec3.sub(res, fs1, fs2);

    return res;
}

const farthestPoint = (s: number[], d: vec3): vec3 => {
    let max = vec3.fromValues(s[0], s[1], s[2]);
    let maxdot = dot(max, d);

    for (let i = 3; i < s.length; i+=3) {
        const dot =
        s[i]   * d[0] +
        s[i+1] * d[1] +
        s[i+2] * d[2];

        if (dot > maxdot) {
            maxdot = dot;
            max[0] = s[i];
            max[1] = s[i+1];
            max[2] = s[i+2];
        }
    }

    return max;
}

const newVec3 = (): vec3 => {
    return vec3.create();
}

const cross = (a: vec3, b: vec3): vec3 => {
    const res = newVec3();
    return vec3.cross(res, a, b);
}
