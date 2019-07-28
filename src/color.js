import {Vec1} from "./types.js";

export class ColorMod
{
    constructor(field, backupValue)
    {
        this.Field = field; // aka: Col (we use field name, not idx)
        this.BackupValue = backupValue;
    }
}

function _lerp(v, a, b)
{
    return a + (b - a) * v;
}

export var CSSColors = {}; // filled below
export var Colors = {}; // filled below

export class Color
{
    static RandomCss()
    {
        let keys = Object.keys(CSSColors);
        let i = Math.floor(Math.random() * keys.length);
        return Color.Css(keys[i]);
    }

    static Random(min=0, max=1)
    {
        return Color.rgb(
            _lerp(Math.random(), min, max),
            _lerp(Math.random(), min, max),
            _lerp(Math.random(), min, max),
                );
    }

    static Css(nm)
    {
        return CSSColors[nm].Clone();
    }

    static FromArray(c, alpha=true, space=undefined)
    {
        return new Color(c[0], c[1], c[2], alpha?c[3] : 1, space);
    }

    static FromCSS(cstr)
    {
        let m = /^(rgba?)\s*\(([^)]*)\)/.exec(cstr);
        let fields;
        if (m)
        {
            fields = m[2].split(",").map((x, i) => {
                    if(i < 3) return parseFloat(x)/255;
                    else return parseFloat(x);
                });
        }
        else
        if (/^#[A-Fa-f0-9]+$/.test(cstr))
        {
            var base = cstr.slice(1);
            var size = base.length;
            let parts = base.split(size <= 4 ? /(.)/ : /(..)/)
                            .filter((x)=>x!="");
            fields = parts.map(function (x) {
                    if (size <= 4)
                        return parseInt(x+"0", 16)/255;
                    else
                        return parseInt(x, 16)/255;
                });
        }
        else
            return null;

        if(fields.length == 3)
            return Color.rgb(fields[0], fields[1], fields[2]);
        else
            return Color.rgba(fields[0], fields[1], fields[2], fields[3]);
    }

    static rgbi(r, g, b)
    {
        if(r === undefined)
        {
            r = g = b = 0;
        }
        return new Color(r/255.0, g/255.0, b/255.0, 1);
    }

    static rgbai(r, g, b, a)
    {
        if(r === undefined)
        {
            r = g = b = 0;
            a = 1;
        }
        return new Color(r/255.0, g/255.0, b/255.0, a/255.0);
    }

    static rgb(r, g, b)
    {
        if(r === undefined)
        {
            r = g = b = 0;
        }
        return new Color(r, g, b, 1);
    }

    static rgba(r, g, b, a)
    {
        if(r === undefined)
        {
            r = g = b = 0;
            a = 1;
        }
        return new Color(r, g, b, a);
    }

    static hsv(h, s, v)
    {
        return new Color(h, s, v, 1, "hsv");
    }

    static hsva(h, s, v , a)
    {
        return new Color(h, s, v, a, "hsv");
    }

    static hsl(h, s, l)
    {
        return new Color(h, s, l, 1., "hsl");
    }

    static hsla(h, s, l , a)
    {
        return new Color(h, s, l, a, "hsl");
    }

    static Lerp(a, b, pct)
    {
        console.assert(a.space == b.space);
        return new Color(
            a.x + (b.x - a.x) * pct,
            a.y + (b.y - a.y) * pct,
            a.z + (b.z - a.z) * pct,
            a.a + (b.a - a.a) * pct);
    }

    static Blend(a, b) // b over a
    {
        let t = b.a;
        if(t == 1) return b;
        if(t == 0) return a;
        let under = a.AsRGB();
        let over = b.AsRGB();
        let x = Vec1.Lerp(under.x, over.x, t);
        let y = Vec1.Lerp(under.y, over.y, t);
        let z = Vec1.Lerp(under.z, over.z, t);
        return new Color(x,y,z);
    }

    static Instantiate(str)
    {
        let c = new Color();
        let fields = str.split(" ");
        console.assert(fields.length == 5);
        c.space = fields[0];
        c.x = Number(fields[1]);
        c.y = Number(fields[2]);
        c.z = Number(fields[3]);
        c.a = Number(fields[4]);
        return c;
    }

    constructor(x, y, z, a, space="rgb") // rgb, hsv, hsl
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.space = space;
        this.a = a === undefined ? 1 : a;
        this.str = null;
    }

    Encapsulate()
    {
        return `${this.space} ${this.x.toFixed(3)} ` +
              `${this.y.toFixed(3)} ${this.z.toFixed(3)} ${this.a.toFixed(3)}`;
    }

    Copy(src)
    {
        this.x = src.x;
        this.y = src.y;
        this.z = src.z;
        this.a = src.a;
        this.space = src.space;
        this.str = null;
    }

    CopyArray(src)
    {
        this.x = src[0];
        this.y = src[1];
        this.z = src[2];
        this.a = src[3];
        this.str = null;
    }

    Equals(other)
    {
        return this.AsStr() == other.AsStr();
    }

    Clone()
    {
        // don't clone str
        return new Color(this.x, this.y, this.z, this.a, this.space);
    }

    // after editing a color, clear the str rep cache.
    Dirty()
    {
        if(this.str)
            this.str = null;
    }

    Index(i)
    {
        if(i==0) return this.x;
        if(i==1) return this.y;
        if(i==2) return this.z;
        if(i==3) return this.a;
    }

    AsArray(space=null)
    {
        if(space == null || space == this.space)
            return [this.x, this.y, this.z, this.a];
        else
        {
            console.assert(0, "could do more work here.");
            return [];
        }
    }

    AsIArray()
    {
        return [ Math.round(255*this.x),
                 Math.round(255*this.y),
                 Math.round(255*this.z),
                 Math.round(255*this.a) ];
    }

    AsFloatStr(noalpha)
    {
        let x = this.x.toFixed(3);
        let y = this.y.toFixed(3);
        let z = this.z.toFixed(3);
        if(noalpha)
            return `${this.space}(${x}, ${y}, ${z})`;

        let a = this.a.toFixed(3);
        return `${this.space}a(${x}, ${y}, ${z}, ${a})`;
    }

    AsIntStr(noalpha)
    {
        let x = Math.floor(this.x*255);
        let y = Math.floor(this.y*255);
        let z = Math.floor(this.z*255);
        if(noalpha)
            return `${this.space}(${x}, ${y}, ${z})`;
        let a = Math.floor(this.a*255);
        return `${this.space}a(${x}, ${y}, ${z}, ${a})`;
    }

    AsHashStr(noalpha=false) // hash strings always in RGB
    {
        let c = this.AsRGB();
        let r = ("0" + Math.floor(c.x*255).toString(16)).slice(-2);
        let g = ("0" + Math.floor(c.y*255).toString(16)).slice(-2);
        let b = ("0" + Math.floor(c.z*255).toString(16)).slice(-2);
        if(noalpha)
            return `#${r}${g}${b}`.toUpperCase();
        else
        {
            let a = ("0" + Math.floor(c.a*255).toString(16)).slice(-2);
            return `#${r}${g}${b}${a}`.toUpperCase();
        }
    }

    AsHexStr(noalpha=false) // hex strings always in rgb (currently)
    {
        let c = this.AsRGB();
        let r = ("0" + Math.floor(c.x*255).toString(16)).slice(-2);
        let g = ("0" + Math.floor(c.y*255).toString(16)).slice(-2);
        let b = ("0" + Math.floor(c.z*255).toString(16)).slice(-2);
        if(noalpha)
            return `0x${r}${g}${b}`;
        else
        {
            let a = ("0" + Math.floor(c.a*255).toString(16)).slice(-2);
            return `0x${r}${g}${b}${a}`;
        }
    }

    // XXX: alphaMult?
    AsStr(alphaMult=1)
    {
        if(this.str) return this.str;
        let c = this.AsRGB();
        let r = (c.x * 255).toFixed(0);
        let g = (c.y * 255).toFixed(0);
        let b = (c.z * 255).toFixed(0);
        let a = c.a.toFixed(3);
        this.str = `rgba(${r},${g},${b},${a})`;
        return this.str;
    }

    AsMultiStr(noalpha=false)
    {
        switch(this.space)
        {
        case "rgb":
            {
                let hstr = this.AsHashStr(noalpha);
                let dstr = this.AsIntStr(noalpha);
                let fstr = this.AsFloatStr(noalpha);
                return `${hstr}\n${dstr}\n${fstr}`;
            }
        case "hsv":
            {
                let dstr = this.AsIntStr(noalpha);
                let fstr = this.AsFloatStr(noalpha);
                return `${dstr}\n${fstr}`;
            }
        case "hsl":
            console.assert(0, "unimplemented");
            break;
        }
    }

    AsOpaque()
    {
        if(this.a == 1) return this;
        return new Color(this.x, this.y, this.z, 1, this.space);
    }

    AsRGB(alphaMult=1, clone=false)
    {
        switch(this.space)
        {
        case "rgb":
            if(alphaMult == 1 && !clone)
                return this;
            else
                return new Color(this.x, this.y, this.z, this.a*alphaMult);
        case "hsv": // hsv to rgb
            {
                let h = this.x;
                let s = this.y;
                let v = this.z;
                let r, g, b;
                let i = Math.floor(h * 6);
                let f = h * 6 - i;
                let p = v * (1 - s);
                let q = v * (1 - f * s);
                let t = v * (1 - (1 - f) * s);

                switch (i % 6)
                {
                case 0: r = v, g = t, b = p; break;
                case 1: r = q, g = v, b = p; break;
                case 2: r = p, g = v, b = t; break;
                case 3: r = p, g = q, b = v; break;
                case 4: r = t, g = p, b = v; break;
                case 5: r = v, g = p, b = q; break;
                }
                return new Color(r, g, b, this.a*alphaMult);
            }
        case "hsl": // hsl to rgb
            {
                let r, g, b;
                let h = this.x;
                let s = this.y;
                let l = this.z;
                if (this.y == 0)
                  r = g = b = this.z; // achromatic
                else
                {
                    let hue2rgb = function(p, q, t)
                    {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3-t) * 6;
                        return p;
                    };

                    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    var p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1/3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1/3);
                }
                return new Color(r, g, b, this.a*this.alphaMult);
            }
        }
    }

    AsHSL()
    {
        switch(this.space)
        {
        case "rgb": // rgb to hsl
            {
                let r = this.x;
                let g = this.y;
                let b = this.z;
                let a = this.a;
                let max = Math.max(r, g, b);
                let min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;
                if (max == min)
                {
                    h = 0;
                    s = 0;
                }
                else
                {
                    var d = max - min;
                    s = l > 0.5 ? d / (2-max-min) : d / (max+min);
                    switch (max)
                    {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                            break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break;
                    }
                    h /= 6;
                }
                return new Color(h, s, l, a, "hsl");
            }
        case "hsl":
            return this;
        case "hsv": // to hsv to rsl
            return this.AsRGB().AsHSL();
        }
    }

    AsHSV(clone=false)
    {
        switch(this.space)
        {
        case "rgb": // rgb to hsv
            {
                let K = 0;
                let t;
                let r = this.x;
                let g = this.y;
                let b = this.z;
                if (g < b)
                {
                    t = g;
                    g = b;
                    b = t;
                    K = -1;
                }
                if (r < g)
                {
                    t = r;
                    r = g;
                    g = t;
                    K = -2 / 6 - K;
                }
                const chroma = r - (g < b ? g : b);
                let h = Math.abs(K + (g - b) / (6 * chroma + 1e-20));
                let s = chroma / (r + 1e-20);
                let v = r;
                return new Color(h, s, v, this.a, "hsv");
            }
        case "hsl": // hsl to hsv
            return this.AsRGB().AsHSV();
        case "hsv":
            if(!clone)
                return this;
            else
                return this.Clone();
        }
    }

    rgbaStr()
    {
        let c = this.AsRGB();
        return "rgba(" +
                (255*c.x).toFixed(0) + "," +
                (255*c.y).toFixed(0) + "," +
                (255*c.z).toFixed(0) + "," +
                this.a.toFixed(3) + ")";
    }

    hslaStr()
    {
        // h: [0-360], s,l: ptc "0-100%"
        let c = this.AsHSL();
        return "hsla(" +
                (360*c.x).toFixed(0) + "," +
                (100*c.y).toFixed(0) + "%," +
                (100*c.z).toFixed(0) + "%," +
                this.a.toFixed(3) + ")";
    }

}

// https://www.w3schools.com/colors/colors_names.asp
CSSColors =
{
    aliceblue:	Color.rgbi(240,248,255),
    antiquewhite:	Color.rgbi(250,235,215),
    aqua:	Color.rgbi(0,255,255),
    aquamarine:	Color.rgbi(127,255,212),
    azure:	Color.rgbi(240,255,255),
    beige:	Color.rgbi(245,245,220),
    bisque:	Color.rgbi(255,228,196),
    black:	Color.rgbi(0,0,0),
    blanchedalmond:	Color.rgbi(255,235,205),
    blue:	Color.rgbi(0,0,255),
    blueviolet:	Color.rgbi(138,43,226),
    brown:	Color.rgbi(165,42,42),
    burlywood:	Color.rgbi(222,184,135),
    cadetblue:	Color.rgbi(95,158,160),
    chartreuse:	Color.rgbi(127,255,0),
    chocolate:	Color.rgbi(210,105,30),
    coral:	Color.rgbi(255,127,80),
    cornflowerblue:	Color.rgbi(100,149,237),
    cornsilk:	Color.rgbi(255,248,220),
    crimson:	Color.rgbi(220,20,60),
    cyan:	Color.rgbi(0,255,255),
    darkblue:	Color.rgbi(0,0,139),
    darkcyan:	Color.rgbi(0,139,139),
    darkgoldenrod:	Color.rgbi(184,134,11),
    darkgray:	Color.rgbi(169,169,169),
    darkgreen:	Color.rgbi(0,100,0),
    darkgrey:	Color.rgbi(169,169,169),
    darkkhaki:	Color.rgbi(189,183,107),
    darkmagenta:	Color.rgbi(139,0,139),
    darkolivegreen:	Color.rgbi(85,107,47),
    darkorange:	Color.rgbi(255,140,0),
    darkorchid:	Color.rgbi(153,50,204),
    darkred:	Color.rgbi(139,0,0),
    darksalmon:	Color.rgbi(233,150,122),
    darkseagreen:	Color.rgbi(143,188,143),
    darkslateblue:	Color.rgbi(72,61,139),
    darkslategray:	Color.rgbi(47,79,79),
    darkslategrey:	Color.rgbi(47,79,79),
    darkturquoise:	Color.rgbi(0,206,209),
    darkviolet:	Color.rgbi(148,0,211),
    deeppink:	Color.rgbi(255,20,147),
    deepskyblue:	Color.rgbi(0,191,255),
    dimgray:	Color.rgbi(105,105,105),
    dimgrey:	Color.rgbi(105,105,105),
    dodgerblue:	Color.rgbi(30,144,255),
    firebrick:	Color.rgbi(178,34,34),
    floralwhite:	Color.rgbi(255,250,240),
    forestgreen:	Color.rgbi(34,139,34),
    fuchsia:	Color.rgbi(255,0,255),
    gainsboro:	Color.rgbi(220,220,220),
    ghostwhite:	Color.rgbi(248,248,255),
    gold:	Color.rgbi(255,215,0),
    goldenrod:	Color.rgbi(218,165,32),
    gray:	Color.rgbi(128,128,128),
    green:	Color.rgbi(0,128,0),
    greenyellow:	Color.rgbi(173,255,47),
    grey:	Color.rgbi(128,128,128),
    honeydew:	Color.rgbi(240,255,240),
    hotpink:	Color.rgbi(255,105,180),
    indianred:	Color.rgbi(205,92,92),
    indigo:	Color.rgbi(75,0,130),
    ivory:	Color.rgbi(255,255,240),
    khaki:	Color.rgbi(240,230,140),
    lavender:	Color.rgbi(230,230,250),
    lavenderblush:	Color.rgbi(255,240,245),
    lawngreen:	Color.rgbi(124,252,0),
    lemonchiffon:	Color.rgbi(255,250,205),
    lightblue:	Color.rgbi(173,216,230),
    lightcoral:	Color.rgbi(240,128,128),
    lightcyan:	Color.rgbi(224,255,255),
    lightgoldenrodyellow:	Color.rgbi(250,250,210),
    lightgray:	Color.rgbi(211,211,211),
    lightgreen:	Color.rgbi(144,238,144),
    lightgrey:	Color.rgbi(211,211,211),
    lightpink:	Color.rgbi(255,182,193),
    lightsalmon:	Color.rgbi(255,160,122),
    lightseagreen:	Color.rgbi(32,178,170),
    lightskyblue:	Color.rgbi(135,206,250),
    lightslategray:	Color.rgbi(119,136,153),
    lightslategrey:	Color.rgbi(119,136,153),
    lightsteelblue:	Color.rgbi(176,196,222),
    lightyellow:	Color.rgbi(255,255,224),
    lime:	Color.rgbi(0,255,0),
    limegreen:Color.rgbi(50,205,50),
    linen:	Color.rgbi(250,240,230),
    magenta:	Color.rgbi(255,0,255),
    maroon:	Color.rgbi(128,0,0),
    mediumaquamarine:	Color.rgbi(102,205,170),
    mediumblue:	Color.rgbi(0,0,205),
    mediumorchid:	Color.rgbi(186,85,211),
    mediumpurple:	Color.rgbi(147,112,219),
    mediumseagreen:	Color.rgbi(60,179,113),
    mediumslateblue:	Color.rgbi(123,104,238),
    mediumspringgreen:	Color.rgbi(0,250,154),
    mediumturquoise:	Color.rgbi(72,209,204),
    mediumvioletred:	Color.rgbi(199,21,133),
    midnightblue:	Color.rgbi(25,25,112),
    mintcream:	Color.rgbi(245,255,250),
    mistyrose:	Color.rgbi(255,228,225),
    moccasin:	Color.rgbi(255,228,181),
    navajowhite:	Color.rgbi(255,222,173),
    navy:	Color.rgbi(0,0,128),
    oldlace:	Color.rgbi(253,245,230),
    olive:	Color.rgbi(128,128,0),
    olivedrab:	Color.rgbi(107,142,35),
    orange:	Color.rgbi(255,165,0),
    orangered:	Color.rgbi(255,69,0),
    orchid:	Color.rgbi(218,112,214),
    palegoldenrod:	Color.rgbi(238,232,170),
    palegreen:	Color.rgbi(152,251,152),
    paleturquoise:	Color.rgbi(175,238,238),
    palevioletred:	Color.rgbi(219,112,147),
    papayawhip:	Color.rgbi(255,239,213),
    peachpuff:	Color.rgbi(255,218,185),
    peru:	Color.rgbi(205,133,63),
    pink:	Color.rgbi(255,192,203),
    plum:	Color.rgbi(221,160,221),
    powderblue:	Color.rgbi(176,224,230),
    purple:	Color.rgbi(128,0,128),
    red:	Color.rgbi(255,0,0),
    rosybrown:	Color.rgbi(188,143,143),
    royalblue:	Color.rgbi(65,105,225),
    saddlebrown:	Color.rgbi(139,69,19),
    salmon:	Color.rgbi(250,128,114),
    sandybrown:	Color.rgbi(244,164,96),
    seagreen:	Color.rgbi(46,139,87),
    seashell:	Color.rgbi(255,245,238),
    sienna:	Color.rgbi(160,82,45),
    silver:	Color.rgbi(192,192,192),
    skyblue:	Color.rgbi(135,206,235),
    slateblue:	Color.rgbi(106,90,205),
    slategray:	Color.rgbi(112,128,144),
    slategrey:	Color.rgbi(112,128,144),
    snow:	Color.rgbi(255,250,250),
    springgreen:	Color.rgbi(0,255,127),
    steelblue:	Color.rgbi(70,130,180),
    tan:	Color.rgbi(210,180,140),
    teal:	Color.rgbi(0,128,128),
    thistle:	Color.rgbi(216,191,216),
    tomato:	Color.rgbi(255,99,71),
    turquoise:	Color.rgbi(64,224,208),
    violet:	Color.rgbi(238,130,238),
    wheat:	Color.rgbi(245,222,179),
    white:	Color.rgbi(255,255,255),
    whitesmoke:	Color.rgbi(245,245,245),
    yellow:	Color.rgbi(255,255,0),
    yellowgreen:	Color.rgbi(154,205,50),
};

for(let k in CSSColors)
{
    CSSColors[k].str = k;
}

export var HueRampStr = [
    CSSColors.red.AsStr(),
    CSSColors.yellow.AsStr(),
    CSSColors.green.AsStr(),
    CSSColors.cyan.AsStr(),
    CSSColors.blue.AsStr(),
    CSSColors.magenta.AsStr(),
    CSSColors.red.AsStr(),
];

// simple, common, useful for debugging, overlaps with CSSColors
Colors =
{
    clear: Color.rgba(0,0,0,0),
    black: Color.rgb(0,0,0),
    gray:  Color.rgb(.5,.5,.5),
    white: Color.rgb(1,1,1),
    red: Color.rgb(1,0,0),
    green: Color.rgb(0,1,0),
    blue: Color.rgb(0,0,1),
    cyan: Color.rgb(0,1,1),
    yellow: Color.rgb(1,1,0),
    magenta: Color.rgb(1,0,1),

    dark1: Color.rgb(.05, .05, .08),
    dark2: Color.rgb(.08, .08, .10),
    dark3: Color.rgb(.10, .10, .15),
    mid1: Color.rgb(.4, .4, .4),
};

