import { CornerFlags, DrawListFlags } from "./flags.js";
import { Rect, Vec2 } from "./types.js";

let PathType = {
    Line: 0,
    Rect: 1,
    Arc: 2,
    Bezier: 3,
};

let Angles = [];
for(let i=0;i<13;i++)
    Angles.push(2*Math.PI*i/12);

/**
 * Deferred rendering machinery to support different window sort order.
 * Our goal is to 'capture' a lightweight representation of our public
 * method calls.
 */
 /*
 * NB: we must take care to capture low-level data and not references since
 * these are likely to change throughout frame description. Rules of thumb:
 *    * use javascript closure magic, but only for atomic datatypes (POD).
 *    * produce as light-weight capture as possible since data lifetime
 *      is frame and memory usage ~nwindows*widgets/window (plus additional
 *      global DrawLists for foreground and background).
 */
export class DrawList
{
    constructor(imgui, owner)
    {
        this.imgui = imgui;
        this.canvas = imgui.canvas;
        this.canvasCtx = this.canvas.getContext("2d");
        this.owner = owner;
        this.flags = DrawListFlags.None;
        this.Clear();
    }

    Clear(layer=undefined)
    {
        if(layer == undefined)
            this.drawLayers = [[]]; // array of arrays
        else
            this.drawLayers[layer] = [];
        this.path = [];
        this.clipRectStack = [];
        this.LayerStack = [this.drawLayers[0]];
        this.currentLayer = this.drawLayers[0];
    }

    BeginLayer(i)
    {
        let layer = this.drawLayers[i];
        if(layer == undefined)
        {
            layer = [];
            this.drawLayers[i] = layer;
        }
        this.LayerStack.push(layer);
        this.currentLayer = layer;
    }

    EndLayer()
    {
        this.LayerStack.pop();
        this.currentLayer = this.LayerStack[this.LayerStack.length-1];
        console.assert(this.currentLayer != undefined);
    }

    Render(layer) // undefined means render all
    {
        if(layer == undefined)
        {
            for(let layer of this.drawLayers) // layer 0 under layer 1, etc
            {
                for(let i=0;i<layer.length;i++)
                    this.layer[i]();
            }
        }
        else
        {
            let drawlayer = this.drawLayers[layer];
            if(drawlayer != undefined)
            {
                for(let i=0;i<drawlayer.length;i++)
                    drawlayer[i]();
            }
        }
        this.Clear(layer);
    }

    // Render-level scissoring. This is passed down to your render function
    // but not used for CPU-side coarse clipping. Prefer using higher-level
    // ImGui::PushClipRect() to affect logic (hit-testing and widget culling)
    PushClipRect(min, max, intersect_with_current_clip_rect=false)
    {
        let cr = new Rect(min, max);
        if (intersect_with_current_clip_rect && this.clipRectStack.length > 0)
        {
            let current = this.clipRectStack[this.clipRectStack.length-1];
            cr.ClipWith(current);
        }
        this.clipRectStack.push(cr);
    }

    PushClipRectFullScreen()
    {
        this.clipRectStack.push(null); // no clipping
        //this.PushClipRect(Vec2.Zero(false),
         //               new Vec2(this.canvas.width, this.canvas.height));
    }

    UpdateClipRect()
    {
        // intentionally left blank (for now)
    }

    PopClipRect()
    {
        this.clipRectStack.pop();
    }

    GetClipRect()
    {
        return this.clipRectStack[this.clipRectStack.length-1];
    }

    // Primitives
    AddLine(a, b, col, thickness=1.)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawLine.bind(this, a.x, a.y, b.x, b.y,
                                                col, thickness,
                                                this.getClipRect()));
    }

    // Lines assumed to be an array of [Vec2, Vec2, colorstr]
    AddLines(lines, thickness)
    {
        this.currentLayer.push(this.drawLines.bind(this, lines, thickness,
                                                this.getClipRect()));
    }

    // a: upper-left, b: lower-right,
    AddRect(a, b, col, rounding=0., corners=CornerFlags.All, thickness=1)
    {
        let w = b.x - a.x;
        let h = b.y - a.y;
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawRect.bind(this, a.x, a.y, w, h, col,
                                                rounding, corners, thickness,
                                                false, this.getClipRect()));
    }

    AddRectRamp(a, b, ramp, ttob) // ttob ? top-to-bottom : left-to-right
    {
        let w = b.x - a.x;
        let h = b.y - a.y;
        // XXX: do we need to "pickle" ramp?
        this.currentLayer.push(this.drawRectRamp.bind(this, a.x, a.y, w, h,
                                ramp, ttob, this.getClipRect()));
    }

    AddRectFilled(a, b, col, rounding=0, corners=CornerFlags.All)
    {
        let w = b.x - a.x;
        let h = b.y - a.y;
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawRect.bind(this, a.x, a.y, w, h,
                                col, rounding, corners, 0,
                                true, this.getClipRect()));
    }

    AddRectFilled4(x, y, w, h, fillstyle, rounding=0, corners=CornerFlags.All)
    {
        this.currentLayer.push(this.drawRect.bind(this, x, y, w, h,
                                fillstyle, rounding, corners, 0,
                                true, this.getClipRect()));
    }

    // NB: the entrypoint requires/assumes that the rects will remain
    // valid til the frame-draw is completed.
    //      Rects is an array of [x, y, w, h]
    AddRectsFilled(fill, rects, rounding=0)
    {
        this.currentLayer.push(this.drawRectsFilled.bind(this, fill,
                                rects, rounding, this.getClipRect()));
    }

    // a: upper-left, b: lower-right
    // currently we don't support bilinear interp, rather we expect
    // a vertical or horizontal only ramp which allows us to use
    // linear gradients.
    AddRectFilledMultiColor(a, b, uleftCol, urightCol, brightCol, bleftCol)
    {
        console.assert(uleftCol.Equals(urightCol) ||
                       uleftCol.Equals(bleftCol),
                      "linear gradients only");
        let w = b.x - a.x;
        let h = b.y - a.y;
        let c0 = uleftCol.AsStr();
        let c1;
        let ttob;
        if(uleftCol == urightCol) // top to bottom
        {
            c1 = bleftCol.AsStr();
            ttob = true;
        }
        else
        {
            c1 = urightCol.AsStr(); // left to right
            ttob = false;
        }
        this.currentLayer.push(this.drawRectRamp.bind(this, a.x, a.y, w, h,
                                                    [c0, c1], ttob,
                                                    this.getClipRect()));
    }

    AddQuad(a, b, c, d, col, thickness=1)
    {
        console.log("AddQuad is unimplemented");
    }

    AddQuadFilled(a, b, c, d, col)
    {
        console.log("AddQuad is unimplemented");
    }

    AddTriangle(a, b, c, col, thickness=1.)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawTriangle.bind(this,
                                a.x, a.y, b.x, b.y, c.x, c.y, col,
                                false, this.getClipRect()));
    }

    AddTriangleFilled(a, b, c, col)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawTriangle.bind(this,
                                a.x, a.y, b.x, b.y, c.x, c.y, col,
                                true, this.getClipRect()));
    }

    AddCircle(org, radius, col, thickness=1)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawCircle.bind(this, org.x, org.y,
                                    radius, col, false, thickness,
                                    this.getClipRect()));
    }

    AddCircleFilled(org, radius, col)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawCircle.bind(this, org.x, org.y,
                                    radius, col, true, 0,
                                    this.getClipRect()));
    }

    AddText(text, pos, font, lineHeight, col, wrap_width=0., clipRect=null)
    {
        let clip;
        if(typeof(col) != "string")
            col = col.AsStr();
        if(clipRect!=null)
        {
            /* need to clip the clipRect against the current clipRect */
            clipRect.ClipWith(this.GetClipRect());
            clip = [clipRect.Min.x, clipRect.Min.y,
                    clipRect.GetWidth(), clipRect.GetHeight()];
        }
        else
            clip = this.getClipRect();
        this.currentLayer.push(
            this.drawText.bind(this, text, font, lineHeight, pos.x, pos.y,
                                col, clip, wrap_width));
    }

    FillText(txt, x, y, fillStyle, baseline, align, font=null)
    {
        let clip = this.getClipRect();
        this.currentLayer.push(
            this.fillText.bind(this, txt, x, y, fillStyle, baseline, align,
                               font, clip));
    }

    // attrs is array of [fontstr,fillStyle,textBaseline,textAlign]
    // NB: attrs must persist 'til end of frame
    AddTexts(attrs, tarray)
    {
        let clip = this.getClipRect();
        this.currentLayer.push(
            this.fillTexts.bind(this, attrs, tarray, clip));
    }

    // rect is the target rect and may not be related to the img size.
    // actual image size can be obtained via the width & height properties.
    AddImage(img, rect, uv_a=null, uv_b=null, col=null)
    {
        let clip = this.getClipRect();
        let size = rect.GetSize();
        let cstr = col ? col.AsStr() : null;
        if(uv_a == null || uv_b == null)
        {
            this.currentLayer.push(
                this.drawImage.bind(this, img,
                                rect.Min.x, rect.Min.y,
                                size.x, size.y,
                                cstr, clip));
        }
        else
        {
            // in the 8 param case, dx is the target posision
            let srcPos = new Vec2(img.width*uv_a.x, img.height*uv_a.y);
            let srcSz = new Vec2(img.width * (uv_b.x - uv_a.x),
                                 img.height * (uv_b.x - uv_a.x));
            let dstPos = rect.Min;
            let dstSz = rect.GetSize();

            this.currentLayer.push(
                this.drawSubImage.bind(this, img,
                                srcPos.x, srcPos.y,
                                srcSz.x, srcSz.y,
                                dstPos.x, dstPos.y,
                                dstSz.x, dstSz.y,
                                cstr, clip));

        }
    }

    AddImageQuad(user_texture_id, a, b, c, d,
            uv_a=null, uv_b=null, uv_c=null, uv_d=null, col=null)
    {}

    AddImageRounded(user_texture_id, a, b, uv_a, uv_b, col,
                rounding, rounding_corners=CornerFlags.All)
    {}

    AddPolyline(points, col, closed, thickness)
    {}

    AddConvexPolyFilled(points, num_points, col)
    {}

    // Note: Anti-aliased filling requires points to be in clockwise order.
    AddBezierCurve(pos0, cp0, cp1, pos1, col, thickness, num_segments=0)
    {}

    // Stateful path API, add points then finish with PathFillConvex() or PathStroke()
    PathClear()
    {
        this.path.length = 0;
    }

    PathLineTo(pos)
    {
        this.path.push([PathType.Line, pos]);
    }

    PathLineToMergeDuplicate(pos)
    {
        let lastpt = this.path[this.path.length-1][0];
        if(lastpt == undefined || lastpt.x != pos.x || lastpt.y != pos.y)
            this.path.push([PathType.Line, pos]);
    }

    PathArcTo(org, radius, a_min, a_max, num_segments=10)
    {
        this.path.push([PathType.Arc, org, radius, a_min, a_max]);
    }

    PathArcToFast(org, radius, a_min_of_12, a_max_of_12)
    {
        // Use precomputed angles for a 12 steps circle
        this.path.push([PathType.Arc, org, radius,
                    Angles[a_min_of_12], Angles[a_max_of_12]]);
    }

    PathBezierCurveTo(p1, p2, p3, num_segments=0)
    {
        this.path.push([PathType.Bezier, p1, p2, p3]);
    }

    PathRect(a, b, rounding=0, corners_flags = CornerFlags.All)
    {
        if(rounding == 0 || corners_flags == 0)
        {
            this.PathLineTo(a);
            this.PathLineTo(new Vec2(b.x, a.y));
            this.PathLineTo(b);
            this.PathLineTo(new Vec2(a.x, b.y));
        }
        else
        {
            this.path.push([PathType.Rect, a, b, rounding, corners_flags]);
        }
    }

    PathFillConvex(col)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawPath.bind(this, this.path, col,
                                                "fillConvex"));
        this.path = [];
    }

    PathStroke(col, closed, thickness=1.)
    {
        if(typeof(col) != "string")
            col = col.AsStr();
        this.currentLayer.push(this.drawPath.bind(this, this.path, col,
                                                "stroke", closed, thickness));
        this.path = [];
    }

    // Channels
    // - Use to simulate layers. By switching channels to can render
    //   out-of-order (e.g. submit foreground primitives before background
    //   primitives)
    // - Use to minimize draw calls (e.g. if going back-and-forth between
    //   multiple non-overlapping clipping rectangles, prefer to append into
    //   separate channels then merge at the end)
    ChannelsSplit(channels_count)
    {}

    ChannelsMerge()
    {}

    ChannelsSetCurrent(channel_index)
    {}

    UpdateTextureID()
    {}

    /*-------------------------------------------------------------*/
    getClipRect()
    {
        let cr = this.GetClipRect();
        if(cr)
        {
            return [cr.Min.x, cr.Min.y, cr.GetWidth(), cr.GetHeight()];
        }
        else
            return [];
    }

    doClip(ctx, clip)
    {
        // clip is x,y,sizex,sizey
        ctx.beginPath();
        ctx.rect(clip[0], clip[1], clip[2], clip[3]);
        // ctx.fillStyle = "red";
        // ctx.fill();
        ctx.clip();
    }

    drawLine(ax, ay, bx, by, col, thickness, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
    }

    drawLines(lines, thickness, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.lineWidth = thickness;
        for(let i=0;i<lines.length;i++)
        {
            let line = lines[i];
            ctx.strokeStyle = line[2];
            ctx.beginPath();
            ctx.moveTo(line[0].x, line[0].y);
            ctx.lineTo(line[1].x, line[1].y);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawImage(img, x0, y0, xsize, ysize, tint, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.drawImage(img, x0, y0, xsize, ysize);
        ctx.restore();
    }

    drawSubImage(img, srcPosX, srcPosY, srcSizeX, srcSizeY,
                      dstPosX, dstPosY, dstSizeX, dstSizeY,
                      tint, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.drawImage(img, srcPosX, srcPosY, srcSizeX, srcSizeY,
                        dstPosX, dstPosY, dstSizeX, dstSizeY);
        ctx.restore();
    }

    drawTriangle(ax, ay, bx, by, cx, cy, col, fill, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        if(fill)
            ctx.fillStyle = col;
        else
            ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        if(fill)
            ctx.fill();
        else
            ctx.stroke();
        ctx.restore();
    }

    // Rect -----------------------------------------------------------------
    drawRectsFilled(fill, rects, rounding, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.fillStyle = fill;
        if(rounding == 0)
        {
            for(let r of rects)
                ctx.fillRect(r[0], r[1], r[2], r[3]);
        }
        else
        {
            for(let r of rects)
            {
                this.roundRect(r[0], r[1], r[2], r[3], rounding,
                               CornerFlags.All, false, true);
            }
        }
        ctx.restore();
    }

    drawRect(x, y, w, h, col, rounding, corners, thickness, fill, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        if(fill)
            ctx.fillStyle = col;
        else
        {
            ctx.lineWidth = thickness;
            ctx.strokeStyle = col;
        }
        if(rounding == 0)
        {
            if(fill)
                ctx.fillRect(x, y, w, h);
            else
            {
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.stroke();
            }
        }
        else
        {
            this.roundRect(x, y, w, h, rounding, corners, !fill, fill);
        }
        ctx.restore();
    }

    drawRectRamp(x, y, w, h, stops, ttob, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        let grd;
        if(ttob)
            grd = ctx.createLinearGradient(x, y, x, y+h);
        else
            grd = ctx.createLinearGradient(x, y, x+w, y);
        let t = 0, dt = 1 / (stops.length-1);
        for(let c of stops)
        {
            grd.addColorStop(t, c);
            t += dt;
        }
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    roundRect(x, y, width, height, radius, corners, stroke=true, fill=true)
    {
        let ctx = this.canvasCtx;
        if(radius == 0)
            ctx.rect(x, y, width, height);
        else
        {
            //    c1---a---------------b----c2
            //     |                         |
            //     h                         c
            //     |                         |
            //     |                         |
            //     g                         d
            //     |                         |
            //    c4---f---------------e----c3
            ctx.beginPath();
            if(corners&CornerFlags.TopLeft)
                ctx.moveTo(x + radius, y); // a
            else
                ctx.moveTo(x, y); // c1
            ctx.lineTo(x + width - radius, y); // b
            if(corners&CornerFlags.TopRight)
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius); // c
            else
                ctx.lineTo(x + width, y); // c2

            ctx.lineTo(x + width, y + height - radius); // d
            if(corners&CornerFlags.BotRight)
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); // e
            else
                ctx.lineTo(x+width, y+height); // c3

            ctx.lineTo(x + radius, y + height); // f
            if(corners&CornerFlags.BotLeft)
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius); // g
            else
                ctx.lineTo(x, y+height); // c4
            if(corners&CornerFlags.TopLeft)
            {
                ctx.lineTo(x, y + radius); // h
                ctx.quadraticCurveTo(x, y, x + radius, y); // a
            }
            ctx.closePath();
        }
        if (stroke)
            ctx.stroke();
        if (fill)
            ctx.fill();
    }

    drawCircle(orgX, orgY, radius, col, fill, thickness, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.beginPath();
        if(fill)
        {
            ctx.fillStyle = col;
            ctx.lineWidth = 0;
        }
        else
        {
            ctx.strokeStyle = col;
            ctx.lineWidth = thickness;
        }
        ctx.arc(orgX, orgY, radius, 0, 2*Math.PI);
        if(fill)
            ctx.fill();
        else
            ctx.stroke();
        ctx.restore();
    }

    drawPath(path, style, op, closed, thickness, clip)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.beginPath();
        for(let i=0;i<path.length;i++)
        {
            let el = path[i];
            switch(el[0])
            {
            case PathType.Line:
                {
                    let p = el[1];
                    if(i == 0)
                        ctx.moveTo(p.x, p.y);
                    else
                        ctx.lineTo(p.x, p.y);
                }
                break;
            case PathType.Arc:
                {
                    let org = el[1];
                    let rad = el[2];
                    let amin = el[3];
                    let amax = el[4];
                    ctx.arc(org.x, org.y, rad, amin, amax);
                }
                break;
            case PathType.Bezier:
                {
                    let p1 = el[1];
                    let p2 = el[2];
                    let p3 = el[2];
                    console.assert(i != 0, "bezier move to");
                    if(i != 0)
                        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                }
                break;
            case PathType.Rect:
                {
                    let min = el[1];
                    let max = el[2];
                    let rounding = el[3];
                    let corners = el[4];
                    this.roundRect(min.x, min.y,
                                    max.x - min.x, max.y - min.y,
                                    rounding, corners,
                                    false, false);
                }
                break;
            }
        }
        if(op == "stroke")
        {
            ctx.lineWidth = thickness;
            ctx.strokeStyle = style;
            ctx.stroke();
        }
        else
        {
            ctx.fillStyle = style;
            ctx.fill();
        }
        ctx.restore();
    }

    // Text ---------------------------------------------------------------
    // basic ideas:
    //    - lineHeight is intra-line spacing.
    //    - (lineHeight - font.Size)/2 + font.Baseline is a reasonable offet
    // see also: https://smad.jmu.edu/shen/webtype/index.html
    drawText(text, font, lineHeight, x, y, col, clip, wrapWidth)
    {
        let ctx = this.canvasCtx;
        let sz = Vec2.Zero();

        ctx.save();
        ctx.font = font.AsStr();
        if(clip) this.doClip(ctx, clip);
        ctx.fillStyle = col;

        let lines = font.MeasureText(text, wrapWidth, lineHeight, sz);
        let i = 0;
        let offset = y + (lineHeight - font.Size) / 2 + font.Baseline;
        for(let line of lines)
        {
            if(line.length > 0)
            {
                /*if(line.charCodeAt(0) <= 32)
                    console.log(`'${line}'`);*/
                ctx.fillText(line, x, offset + (lineHeight*i));
            }
            i++;
        }
        ctx.restore();
    }

    // simple version of drawText, with overridable font
    fillText(txt, x, y, fillStyle, baseline, align, font=null, clip=null)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        if(font)
        {
            if(font.AsStr)
                ctx.font = font.AsStr();
            else
                ctx.font = font;
        }
        ctx.fillStyle = fillStyle;
        ctx.textBaseline = baseline;
        ctx.textAlign = align;
        ctx.fillText(txt, x, y);
        ctx.restore();
    }

    // array of texts that share the same attributes
    // attrs is: [font,fillstyle,baseline,align]
    // tarray is array of [txt, x, y]
    fillTexts(attrs, tarray, clip=null)
    {
        let ctx = this.canvasCtx;
        ctx.save();
        if(clip) this.doClip(ctx, clip);
        ctx.font = attrs[0];
        ctx.fillStyle = attrs[1];
        ctx.textBaseline = attrs[2];
        ctx.textAlign = attrs[3];
        for(let i=0;i<tarray.length;i++)
        {
            let t = tarray[i];
            ctx.fillText(t[0], t[1], t[2]);
        }
        ctx.restore();
    }

}
