/*
    This file exports:
        ValRef - support for pass by reference (of POD)
        Vec1 - float utilities, container of a single float
        Vec2 - 2d vector
        Rect - rectangle
        MutableString -
 */

/**
 * used to pass by reference a simple value that can be modified by target.
 * useful for changing various visibility configs.
 */
export class ValRef
{
    constructor(val)
    {
        this.value = val;
    }

    get() { return this.value; }
    set(v) { this.value = v; }
    toggle() { this.value = !this.value; }
}

/**
 * Vec1 is an object that is comprised of a single number.
 * It is also a repository for utility functions as static methods.
 */
export class Vec1
{
    constructor(x)
    {
        this.x = x;
    }

    Clone()
    {
        return new Vec1(this.x);
    }

    static Lerp(a, b, pct)
    {
        if(typeof(a) == "number")
            return a + (b-a) * pct;
        else
            console.assert(false);
    }

    static Clamp(a, min, max)
    {
        if(a < min) return min;
        if(a > max) return max;
        return a;
    }

    static Saturate(val)
    {
        return (val < 0) ? 0 : (val > 1) ? 1 : val;
    }
}

let sZero;
let sMaxValue;
let sMaxNegValue;

export class Vec2
{
    constructor(x, y)
    {
        this.x = x === undefined ? 0 : x;
        this.y = y === undefined ? 0 : y;
    }

    Equals(other)
    {
        return this.x == other.x && this.y == other.y;
    }

    IsNaN()
    {
        return isNaN(this.x) || isNaN(this.y);
    }

    Clone()
    {
        return new Vec2(this.x, this.y);
    }

    Copy(src)
    {
        this.x = src.x;
        this.y = src.y;
    }

    CopyXY(x, y)
    {
        this.x = x;
        this.y = y;
    }

    Add(other)
    {
        if(typeof(other) == "number")
        {
            this.x += other;
            this.y += other;
        }
        else
        {
            this.x += other.x;
            this.y += other.y;
        }
        return this; // chainable
    }

    AddXY(x, y)
    {
        this.x += x;
        this.y += y;
        return this;
    }

    Subtract(other)
    {
        if(typeof(other) == "number")
        {
            this.x -= other;
            this.y -= other;
        }
        else
        {
            this.x -= other.x;
            this.y -= other.y;
        }
        return this; // chainable
    }

    SubtractXY(x, y)
    {
        this.x -= x;
        this.y -= y;
        return this; // chainable
    }

    Mult(other)
    {
        if(typeof(other) == "number")
        {
            this.x *= other;
            this.y *= other;
        }
        else
        {
            this.x *= other.x;
            this.y *= other.y;
        }
        return this; // chainable
    }

    MultXY(x, y)
    {
        this.x *= x;
        this.y *= y;
        return this;
    }

    Divide(other)
    {
        if(typeof(other) == "number")
        {
            this.x /= other;
            this.y /= other;
        }
        else
        {
            this.x /= other.x;
            this.y /= other.y;
        }
        return this; // chainable
    }

    Floor()
    {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    LengthSq()
    {
        return this.x * this.x + this.y * this.y;
    }

    static Zero(clone=true)
    {
        if(sZero == undefined)
            sZero = new Vec2(0, 0);
        return clone ? sZero.Clone() : sZero;
    }

    static MAX_VALUE(clone=true)
    {
        if(sMaxValue == undefined)
            sMaxValue = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);
        return clone ? sMaxValue.Clone() : sMaxValue;
    }

    static MAX_NEGVALUE(clone=true)
    {
        if(sMaxNegValue == undefined)
            sMaxNegValue = new Vec2(-Number.MAX_VALUE, -Number.MAX_VALUE);
        return clone ? sMaxNegValue.Clone() : sMaxNegValue;
    }

    static Add(a, b, c)
    {
        if(typeof(b) == "number")
        {
            if(c==undefined)
                c = b;
            return new Vec2(a.x + b, a.y + c);
        }
        else
            return new Vec2(a.x + b.x, a.y + b.y);
    }

    static AddXY(a, x, y)
    {
        return new Vec2(a.x + x, a.y + y);
    }

    static Subtract(a, b)
    {
        return new Vec2(a.x - b.x, a.y - b.y);
    }

    static SubtractXY(a, x, y)
    {
        return new Vec2(a.x - x, a.y - y);
    }

    static Scale(a, factor)
    {
        return Vec2.Mult(a, factor);
    }

    static Mult(a, factor)
    {
        if(typeof(factor) == "number")
            return new Vec2(a.x*factor, a.y*factor);
        else
            return new Vec2(a.x*factor.x, a.y*factor.y);
    }

    static MultXY(a, mx, my)
    {
        return new Vec2(a.x*mx, a.y*my);
    }

    static Divide(a, factor)
    {
        if(typeof(factor) == "number")
            return new Vec2(a.x/factor, a.y/factor);
        else
            return new Vec2(a.x/factor.x, a.y/factor.y);
    }

    static LengthSq(a, b)
    {
        let dp = Vec2.Subtract(a, b);
        return dp.LengthSq();
    }

    static Dot(a, b)
    {
        return a.x * b.x + a.y + b.y;
    }

    static Min(lhs, rhs)
    {
        return new Vec2(lhs.x < rhs.x ? lhs.x : rhs.x,
                        lhs.y < rhs.y ? lhs.y : rhs.y);
    }

    static Max(lhs, rhs)
    {
        return new Vec2(lhs.x >= rhs.x ? lhs.x : rhs.x,
                        lhs.y >= rhs.y ? lhs.y : rhs.y);
    }

    static Clamp(v, mn, mx)
    {
        return new Vec2((v.x < mn.x) ? mn.x : (v.x > mx.x) ? mx.x : v.x,
                        (v.y < mn.y) ? mn.y : (v.y > mx.y) ? mx.y : v.y);
    }

    static Floor(v)
    {
        return new Vec2(Math.floor(v.x), Math.floor(v.y));
    }

    static Lerp(a, b, pct)
    {
        if(typeof(pct) == "number")
            return new Vec2(a.x + (b.x - a.x) * pct,
                            a.y + (b.y - a.y) * pct);
        else
            return new Vec2(a.x + (b.x - a.x) * pct.x,
                            a.y + (b.y - a.y) * pct.y);
    }
}

export class Rect
{
    // accept no args, 2 pts, or 4 numbers
    constructor(a=null, b=null, c=null, d=null, clone=true)
    {
        if(a == null)
        {
            // default rect
            this.Min = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);
            this.Max = new Vec2(-Number.MAX_VALUE, -Number.MAX_VALUE);
        }
        else
        if(typeof(c) == "number")
        {
            // four numbers
            this.Min = new Vec2(a, b);
            this.Max = new Vec2(c, d);
        }
        else
        {
            // two points
            if(clone)
            {
                this.Min = a.Clone();
                this.Max = b.Clone();
            }
            else
            {
                this.Min = a;
                this.Max = b;
            }
        }
    }

    static Expand(r, val)
    {
        return Rect.FromRect(r).Expand(val);
    }

    static FromRect(r)
    {
        return new Rect(r.Min, r.Max);
    }

    static FromXY(x1, y1, x2, y2)
    {
        if(typeof(x1)== "number")
        {
            return new Rect(new Vec2(x1, y1), new Vec2(x2, y2), false);
        }
        else
        {
            // minpt, xmax, ymax
            console.assert(y2 == undefined);
            return new Rect(x1.Clone(), new Vec2(y1, x2));
        }
    }

    Clone()
    {
        return Rect.FromRect(this);
    }

    Copy(src)
    {
        this.Min.Copy(src.Min);
        this.Max.Copy(src.Max);
    }

    IsNaN()
    {
        return this.Min.IsNaN() || this.Max.IsNaN();
    }

    IsValid()
    {
        if(this.Min.x == Number.MAX_VALUE &&
           this.Min.y == Number.MAX_VALUE &&
           this.Max.x == -Number.MAX_VALUE &&
           this.Max.y == -Number.MAX_VALUE)
        {
           return false;
        }
        else
            return true;
    }

    GetTL()
    {
        return this.Min;
    }

    GetTR()
    {
        return new Vec2(this.Max.x, this.Min.y);
    }

    GetBR()
    {
        return this.Max;
    }

    GetBL()
    {
        return new Vec2(this.Min.x, this.Max.y);
    }

    GetMin()
    {
        return this.Min;
    }

    GetMax()
    {
        return this.Max;
    }

    GetSize()
    {
        return new Vec2(this.GetWidth(), this.GetHeight());
    }

    SetSize(sz, szy=undefined) // polymorph Vec2 or x, y
    {
        if(szy != undefined)
        {
            this.Max.x = this.Min.x + sz;
            this.Max.y = this.Min.y + szy;
        }
        else
        {
            this.Max.x = this.Min.x + sz.x;
            this.Max.y = this.Min.y + sz.y;
        }
    }

    GetWidth()
    {
        return (this.Max.x - this.Min.x);
    }

    GetHeight()
    {
        return (this.Max.y - this.Min.y);
    }

    GetCenter()
    {
        return new Vec2(this.Min.x + .5 * this.GetWidth(),
                        this.Min.y + .5 * this.GetHeight());
    }

    Contains(p)
    {
        if(p.x != undefined)
            return this.ContainsPt(p);
        else
        if(p.Min)
            return this.ContainsRect(p);
        else
            console.assert("unexpected parameter");
    }

    ContainsPt(p)
    {
        return p.x >= this.Min.x &&
               p.y >= this.Min.y &&
               p.x < this.Max.x &&
               p.y < this.Max.y;
    }

    ContainsRect(r)
    {
        return r.Min.x >= this.Min.x &&
               r.Min.y >= this.Min.y &&
               r.Max.x <= this.Max.x &&
               r.Max.y <= this.Max.y;
    }

    Overlaps(r)
    {
        return r.Min.y < this.Max.y &&
               r.Max.y > this.Min.y &&
               r.Min.x < this.Max.x &&
               r.Max.x > this.Min.x;
    }

    AddPt(p) // grow the rect to include pt
    {
        if(this.Min.x > p.x) this.Min.x = p.x;
        if(this.Min.y > p.y) this.Min.y = p.y;
        if(this.Max.x < p.x) this.Max.x = p.x;
        if(this.Max.y < p.y) this.Max.y = p.y;
    }

    AddRect(r) // grow the rect to include r
    {
        if(this.Min.x > r.Min.x) this.Min.x = r.Min.x;
        if(this.Min.y > r.Min.y) this.Min.y = r.Min.y;
        if(this.Max.x < r.Max.x) this.Max.x = r.Max.x;
        if(this.Max.y < r.Max.y) this.Max.y = r.Max.y;
    }

    Expand(val)
    {
        if(typeof(val) == "number")
            this.expandF(val);
        else
            this.expandXY(val.x, val.y);
        return this;
    }

    expandF(amount)
    {
        this.Min.x -= amount;
        this.Min.y -= amount;
        this.Max.x += amount;
        this.Max.y += amount;
    }

    expandXY(x, y)
    {
        this.Min.x -= x;
        this.Min.y -= y;
        this.Max.x += x;
        this.Max.y += y;
    }

    Translate(pt)
    {
        this.Min.x += pt.x;
        this.Min.y += pt.y;
        this.Max.x += pt.x;
        this.Max.y += pt.y;
    }

    TranslateX(dx)
    {
        this.Min.x += dx;
        this.Max.x += dx;
    }

    TranslateY(dy)
    {
        this.Min.y += dy;
        this.Max.y += dy;
    }

    ClipWith(r) // r is Rect
    {
        // Simple version, may lead to an inverted rectangle, which is fine
        // for Contains/Overlaps test but not for display.
        this.Min = Vec2.Max(this.Min, r.Min);
        this.Max = Vec2.Min(this.Max, r.Max);
        return this;
    }

    ClipWithFull(r)
    {
        // Full version, ensure both points are fully clipped.
        this.Min = Vec2.Clamp(this.Min, r.Min, r.Max);
        this.Max = Vec2.Clamp(this.Max, r.Min, r.Max);
        return this;
    }

    Floor()
    {
        this.Min.x = Math.floor(this.Min.x);
        this.Min.y = Math.floor(this.Min.y);
        this.Max.x = Math.floor(this.Max.x);
        this.Max.y = Math.floor(this.Max.y);
        return this;
    }

    IsInverted()
    {
        return this.Min.x > this.Max.x || this.Min.y > this.Max.y;
    }
}

export class MutableString
{
    constructor(str="")
    {
        this.str = str;
    }

    IsMutable() {}

    Clone()
    {
        // since str's are immutable, it's as simple as this:
        return new MutableString(this.str);
    }

    Copy(mstr)
    {
        console.assert(mstr.IsMutable);
        this.str = mstr.str;
    }

    Equals(str)
    {
        if(str.IsMutable)
            return this.str == str.str;
        else
            return this.str == str;
    }

    Get()
    {
        return this.str;
    }

    toString()
    {
        return this.str;
    }

    Set(str)
    {
        this.str = str ? str : "";
    }

    Length()
    {
        return this.str ? this.str.length : 0;
    }

    CountLines()
    {
        let linecount=1;
        for(let i=0;i<this.str.length;i++)
        {
            if(this.str.charCodeAt(i) == 10) // 0x0a
                linecount++;
        }
        return linecount;
    }

    GetChar(idx)
    {
        return this.str[idx];
    }

    // walk backward from idx, looking for newline
    FindLineBegin(idx)
    {
        for(let i=idx-1;i>=0;i--)
        {
            if(this.str.charCodeAt(i) == 10)
                return i+1;
        }
        return 0;
    }

    IsNewline(idx)
    {
        return this.str.charCodeAt(idx) == 10;
    }

    IsSeparator(idx)
    {
        return /[\s,;(){}|]/.test(this.str[idx]);
    }

    GetCharCode(idx)
    {
        return this.str.charCodeAt(idx);
    }

    GetChars(where, len)
    {
        return this.str.slice(where, where+len);
    }

    DeleteChars(where, len)
    {
        this.Splice(where, len);
    }

    InsertChars(where, chars)
    {
        this.Splice(where, 0, chars);
    }

    /**
     * The splice() method changes the content of a string by removing a range of
     * characters and/or adding new characters.
     *
     * @this {String}
     * @param {number} start Index at which to start changing the string.
     * @param {number} delCount An integer indicating the number of old chars to remove.
     * @param {string} newSubStr The String that is spliced in.
     */
    Splice(start, delCount, newSubStr)
    {
        let str = this.str;
        if(newSubStr)
            this.str = str.slice(0, start) + newSubStr + str.slice(start+delCount);
        else
            this.str = str.slice(0, start) + str.slice(start+delCount);
    }
}

export default Vec2;