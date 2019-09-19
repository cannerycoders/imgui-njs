import {Vec2} from "./types.js";
import {FontMetrics} from "./fontmetrics.js";
import {FontIJMap} from "./fontijmap.js";

// exports:
//   Font
//   FontAtlas

const StandardCharCodes = Array.from({length: 512}, (x, i) => i);

export class Font
{
    constructor(canvctx, metrics, str)
    {
        this.Metrics = metrics;
        this.Family = metrics.fontFamily;
        this.Size = metrics.fontSize;
        this.Weight = metrics.fontWeight;
        // Metrics currently place top at 0 with +y down
        this.Ascent = this.Metrics.ascent;
        this.Baseline = this.Metrics.baseline;
        this.Descent = this.Metrics.descent;
        this.str = str;
        this.measuring = 0;
        this.ctx = canvctx;
        this.ijmap = FontIJMap[this.Family]; // often undefined, used for icons
    }

    IsLoaded() { return true; }

    // 'maxWidth' stops rendering after a certain width (could be turned into
    // a 2d size). Number.MAX_VALUE to disable. 'wrapWidth' enable automatic
    // word-wrapping across multiple lines to fit into given width. <= 0 to disable.
    CalcTextSizeA(max_width, wrap_width, text, lineHeight)
    {
        // more todo!
        let sz = Vec2.Zero();
        this.MeasureText(text, wrap_width, lineHeight, sz);
        return sz;
    }

    MeasureBegin()
    {
        if(this.measuring == 0)
        {
            this.ctx.save();
            this.ctx.font = this.AsStr();
        }
        this.measuring++;
    }

    MeasureWidth(char)
    {
        if(this.measuring == 0)
        {
            this.ctx.save();
            this.ctx.font = this.AsStr();
        }
        let w =  this.ctx.measureText(char).width; // canvas measure method
        if(this.measuring == 0)
        {
            this.ctx.restore();
        }
        return w;
    }

    MeasureEnd()
    {
        this.measuring--;
        if(this.measuring == 0)
            this.ctx.restore();
        if(this.measuring < 0)
        {
            console.assert(0, "measure block botch");
        }
    }

    // returns a list of lines, wrapWidth<0 to disable, fills in sz
    // used, for example, for tooltip layout
    MeasureText(text, wrapWidth, lineHeight, sz)
    {
        let lines = [];
        if(!text) text = "";
        if(this.measuring == 0)
        {
            this.ctx.save();
            this.ctx.font = this.AsStr();
        }
        if(wrapWidth <= 0)
        {
            lines = text.split("\n");  // >=2 spaces or newlines
            for(let l of lines)
            {
                sz.x = Math.max(sz.x, this.ctx.measureText(l).width);
            }
            sz.y = lines.length * lineHeight;
        }
        else
        {
            for(let line of text.split("\n"))
            {
                let currentLine = "";
                for (let word of line.split(/ +/))
                {
                    let potentialLine = currentLine.length ? currentLine + " " + word : word;
                    let width = this.ctx.measureText(potentialLine).width;
                    if (width < wrapWidth)
                    {
                        currentLine = potentialLine;
                        sz.x = Math.max(sz.x, width);
                    }
                    else
                    {
                        // wrap word
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);
            }
            sz.y = lines.length * lineHeight;
        }
        if(this.measuring == 0)
            this.ctx.restore();
        return lines;
    }

    RenderChar(draw_list, size, pos, col, c)
    {
        console.assert(0, "RenderChar");
    }

    RenderText(draw_list, size, pos, col, clip_rect, text, wrapwidth=0)
    {
        console.assert(0, "RenderText");
    }

    AsStr()
    {
        return this.str;
    }

    // icon support -------------------------------
    GetKnownCodes()
    {
        if(!this.ijmap)
            return StandardCharCodes;
        else
            return this.ijmap.knownCodes;
    }

    GetCodeName(code)
    {
        if(!this.ijmap) return null;
        return this.ijmap.icons[code.toString(16)].name;
    }

    GetCodeFor(name)
    {
        if(!this.ijmap) return null;
        return this.ijmap.namesToCode[name];
    }

    GetCharFor(name)
    {
        if(!this.ijmap) return null;
        return String.fromCharCode(this.ijmap.namesToCode[name]);
    }

}

export class FontAtlas
{
    // Porting construct, we don't currently have need of a font atlas
    // so this can go away.
    constructor(imgui)
    {
        this.Locked = false;
        this.Flags = 0;
        this.canvasCtx = imgui.canvas.getContext("2d");
        this.fontsInUse = {};
        this.fontMetrics = new FontMetrics();
        this.defaultFontFamily = "Verdana";
        this.defaultFontSize = 12;
        this.defaultFontWeight = "normal";
        this.defaultFontStyle = "normal"; // italic, oblique
        this.availableFonts = [
            // icons/special
            "Material Icons",

            // sans-serif
            "Arial",
            "Arial Black",
            "Arial Narrow",
            "Exo",
            "Gill Sans",
            "Helvetica",
            "Impact",
            "Verdana",
            "Noto Sans",
            "Open Sans",
            "Optima",
            "Roboto",
            "Trebuchet MS",

            // serif
            "American Typewriter",
            "Bookman",
            "Didot",
            "Georgia",
            "New Century Schoolbook",
            "Palatino",
            "Times",
            "Times New Roman",
            "Ultra",

            // monospace
            "Andale Mono",
            "Courier New",
            "Courier",
            "FreeMono",
            "Lucida Console",
            "Roboto Mono",
            "SourceCodePro",

            // handwriting (sans-serif)
            "Comic Sans MS",
       ];
    }

    fontToStr(family, size, weight, style)
    {
        return `${style} ${weight} ${size}px ${family}`;
    }

    FontLoaded(family, size=null, weight=null, style=null)
    {
        if(!family || family == "default")
            family = this.defaultFontFamily;
        if(!size)
            size = this.defaultFontSize;
        if(!weight)
            weight = this.defaultFontWeight;
        if(!style)
            style = this.defaultFontStyle;
        let str = this.fontToStr(family, size, weight, style);
        return this.fontsInUse[str]; // may be undefined
    }

    EnumerateFonts()
    {
        return this.availableFonts;
    }

    // family may include a size: Arial 12
    GetFont(family, size=null, weight=null, style=null)
    {
        if(!family || family == "default")
            family = this.defaultFontFamily;
        if(!size)
            size = this.defaultFontSize;
        if(!weight)
            weight = this.defaultFontWeight;
        if(!style)
            style = this.defaultFontStyle;

        let f = this.FontLoaded(family, size, weight, style);
        if(f == undefined)
        {
            let str = this.fontToStr(family, size, weight, style);
            let bypass = (str.indexOf("Icon") == -1) ? false : true;
            let metrics = this.fontMetrics.MeasureFont(family, size, weight,
                                                        style, bypass);
            f = new Font(this.canvasCtx, metrics, str);
            this.fontsInUse[str] = f;
        }
        return f;
    }

    Size()
    {
        return Object.keys(this.fontsInUse).length;
    }

    ClearFonts()
    {
        this.fontsInUse = {};
    }

    Clear()
    {}

}

