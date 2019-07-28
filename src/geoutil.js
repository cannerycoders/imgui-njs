import {Vec2, Rect} from "./types.js";

export function LineClosestPoint(a, b, p)
{
    let ap = Vec2.Subtract(p, a);
    let abDir = Vec2.Subtract(b, a);
    let dot = Vec2.dot(ap, abDir);
    if(dot < 0)
        return a;
    let abLenSq = Vec2.dot(abDir, abDir);
    if(dot > abLenSq)
        return b;
    else
        return Vec2.Add(a, Vec2.Scale(abDir,dot/abLenSq));
}


export function TriangleContainsPoint(a, b, c, p) // all args are Vec2
{
    let b1 = ((p.x - b.x) * (a.y - b.y) - (p.y - b.y) * (a.x - b.x)) < 0.;
    let b2 = ((p.x - c.x) * (b.y - c.y) - (p.y - c.y) * (b.x - c.x)) < 0;
    let b3 = ((p.x - a.x) * (c.y - a.y) - (p.y - a.y) * (c.x - a.x)) < 0;
    return ((b1 == b2) && (b2 == b3));
}

// returns tuple(u,v,w)
export function TriangleBarycentricCoords(a, b, c, p)
{
    let v0 = Vec2.Subtract(b, a);
    let v1 = Vec2.Subtract(c, a);
    let v2 = Vec2.Subtrace(p, a);
    const denom = v0.x * v1.y - v1.x * v0.y;
    let out_v = (v2.x * v1.y - v1.x * v2.y) / denom;
    let out_w = (v0.x * v2.y - v2.x * v0.y) / denom;
    let out_u = 1. - out_v - out_w;
    return [out_v, out_w, out_u];
}

// return Vec2
export function TriangleClosestPoint(a, b, c, p)
{
    let proj_ab = LineClosestPoint(a, b, p);
    let proj_bc = LineClosestPoint(b, c, p);
    let proj_ca = LineClosestPoint(c, a, p);
    let dist2_ab = Vec2.LengthSqr(p, proj_ab);
    let dist2_bc = Vec2.LengthSqr(p, proj_bc);
    let dist2_ca = Vec2.LengthSqr(p, proj_ca);
    let m = Math.min(dist2_ab, dist2_bc, dist2_ca);
    if (m == dist2_ab)
        return proj_ab;
    if (m == dist2_bc)
        return proj_bc;
    return proj_ca;
}
