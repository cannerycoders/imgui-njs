
// modified version of:
//   https://github.com/soulwire/FontMetrics, license: MIT
//
// see also: https://smad.jmu.edu/shen/webtype/index.html
//
const sStdMeasureChars =
{
    capHeight: "S",
    baseline: "n",
    xHeight: "x",
    descent: "p",
    ascent: "h",
    tittle: "i"
};

export class FontMetrics
{
    constructor()
    {
        this.initialized = false;
        this.padding = null;
        this.context = null;
        this.canvas = null;
    }

    initialize()
    {
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.initialized = true;
    }

    MeasureFont(family, size, weight, style, bypass)
    {
        this.SetFont(family, size, weight, style);
        return this.GetMetrics(bypass ? null : sStdMeasureChars);
    }

    SetFont(fontFamily, fontSize, fontWeight, fontStyle)
    {
        if (!this.initialized)
            this.initialize();
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.fontStyle = fontStyle;
        this.padding = fontSize * 0.5;
        this.canvas.width = fontSize * 2;
        this.canvas.height = fontSize * 2 + this.padding;
        this.context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        this.context.textBaseline = "top";
        this.context.textAlign = "center";
    }

    GetMetrics(chars=sStdMeasureChars)
    {
        // These values are measured relative to the top, (ie: all positive)
        // More commonly, fonts are measured relative to baseline. Now the
        // question is should y go up or down.
        if(chars == null)
            return {
                fontFamily: this.fontFamily,
                fontSize: this.fontSize,
                fontWeight: this.fontWeight,
                capHeight: 0,
                baseline: this.fontSize,
                xHeight: this.fontSize*.5,
                descent: this.fontSize,
                bottom: this.fontSize,
                ascent: 0,
                tittle: this.fontSize*.5,
                top: 0,
            };
        else
            return {
                fontFamily: this.fontFamily,
                fontSize: this.fontSize,
                fontWeight: this.fontWeight,
                capHeight: this.measureTop(chars.capHeight),
                baseline: this.measureBottom(chars.baseline),
                xHeight: this.measureTop(chars.xHeight),
                descent: this.measureBottom(chars.descent),
                bottom: this.computeLineHeight(),
                ascent: this.measureTop(chars.ascent),
                tittle: this.measureTop(chars.tittle),
                top: 0,
            };
    }

    setAlignment(baseline="top")
    {
        const ty = baseline === "bottom" ? this.canvas.height : 0;
        this.context.setTransform(1, 0, 0, 1, 0, ty);
        this.context.textBaseline = baseline;
    }

    updateText(text)
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillText(text, this.canvas.width/2, this.padding, this.canvas.width);
    }

    computeLineHeight()
    {
        const letter = "A";
        this.setAlignment("bottom");
        const gutter = this.canvas.height - this.measureBottom(letter);
        this.setAlignment("top");
        return this.measureBottom(letter) + gutter;
    }

    getPixels(text)
    {
        this.updateText(text);
        return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    }

    getFirstIndex(pixels)
    {
        for (let i = 3, n = pixels.length; i < n; i += 4)
        {
            if (pixels[i] > 0)
                return (i - 3) / 4;
        }
        return pixels.length;
    }

    getLastIndex(pixels)
    {
        for (let i = pixels.length - 1; i >= 3; i -= 4)
        {
            if (pixels[i] > 0)
                return i / 4;
        }
        return 0;
    }

    normalize(metrics, fontSize, origin)
    {
        const result = {};
        const offset = metrics[origin];
        for (let key in metrics)
            result[key] = (metrics[key] - offset) / fontSize;
        return result;
    }

    measureTop(text)
    {
        return Math.round(this.getFirstIndex(this.getPixels(text))/this.canvas.width)
                - this.padding;
    }

    measureBottom(text)
    {
        return Math.round(this.getLastIndex(this.getPixels(text))/this.canvas.width)
                - this.padding;
    }
}
