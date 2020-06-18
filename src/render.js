import {Dir, MouseCursor} from "./enums.js";
import { CornerFlags, NavHighlightFlags} from "./flags.js";
import {Rect, Vec2, Vec1} from  "./types.js";
import {Color} from "./color.js";

let _i = 0;
export var RenderIcons =
{
    None: _i++,
    Square: _i++,
    Stop: _i++,
    Play: _i++,
    Pause: _i++,
    RightArrow: _i++,
    LeftArrow: _i++,
    UpArrow: _i++,
    DownArrow: _i++,
};

export var ImguiRenderMixin =
{
    // --- render helpers ----
    // (internal-use only)
    // NB: All position are in absolute pixels coordinates (we are never
    // using window coordinates internally)
    renderText(pos, text, hide_text_after_hash=true)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        if (hide_text_after_hash)
            text = text.split("##")[0];
        window.DrawList.AddText(text, pos, g.Font, g.FontLineHeight,
                            g.Style.GetColor("Text"));
        if (g.LogEnabled)
            this.logRenderedText(pos, text);
    },

    renderTextWrapped(pos, text, wrap_width)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        window.DrawList.AddText(text, pos, g.Font, g.FontLineHeight,
                                g.Style.GetColor("Text"), wrap_width);
        if (g.LogEnabled)
            this.logRenderedText(pos, text);
    },

    renderTextClipped(posMin, posMax, text, text_size_if_known=null,
                    align=null, clipRect=null)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        this.renderTextClippedEx(window.DrawList, posMin, posMax, text,
                            text_size_if_known, align, clipRect);
    },

    renderTextClippedEx(draw_list, pos_min, pos_max, text,
                        text_size_if_known=null,
                        align=null, clip_rect=null)
    {
        // Perform CPU side clipping for single clipped element to avoid using
        // scissor state
        let g = this.guictx;
        let pos = pos_min;
        let text_size = text_size_if_known ? text_size_if_known :
                        this.CalcTextSize(text, false, 0);

        const clip_min = clip_rect ? clip_rect.Min : pos_min;
        const clip_max = clip_rect ? clip_rect.Max : pos_max;
        let need_clipping = (pos.x + text_size.x >= clip_max.x) ||
                            (pos.y + text_size.y >= clip_max.y);
        if (clip_rect) // If we had no explicit clipping rectangle then pos==clip_min
            need_clipping |= (pos.x < clip_min.x) || (pos.y < clip_min.y);

        // Align whole block. We should defer that to the better rendering
        // function when we'll have support for individual line alignment.
        if(align)
        {
            if (align.x > 0)
                pos.x  = Math.max(pos.x, pos.x + (pos_max.x - pos.x - text_size.x) * align.x);
            if (align.y > 0)
                pos.y = Math.max(pos.y, pos.y + (pos_max.y - pos.y - text_size.y) * align.y);
        }

        // Render
        if (need_clipping)
        {
            let fine_clip_rect = Rect.FromXY(clip_min.x, clip_min.y,
                                            clip_max.x, clip_max.y);
            draw_list.AddText(text, pos, g.Font, g.FontLineHeight,
                    g.Style.GetColor("Text"), 0, /* wrapwidth*/ fine_clip_rect);
        }
        else
        {
            draw_list.AddText(text, pos, g.Font, g.FontLineHeight,
                    g.Style.GetColor("Text"), 0, null);
        }
    },

    // Render a rectangle shaped with optional rounding and borders
    renderFrame(p_min, p_max, fill_col, border=true, rounding=0)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        window.DrawList.AddRectFilled(p_min, p_max, fill_col, rounding);
        if(border)
            this.renderFrameBorder(p_min, p_max, rounding);
    },

    renderFrameBorder(p_min, p_max, rounding, size=0)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        const border_size = size == 0 ? g.Style.FrameBorderSize : size;
        if (border_size > 0)
        {
            window.DrawList.AddRect(Vec2.AddXY(p_min,1,1),
                                    Vec2.AddXY(p_max, 1, 1),
                                    g.Style.GetColor("BorderShadow"),
                                    rounding, CornerFlags.All, border_size);
            window.DrawList.AddRect(p_min, p_max,
                                    g.Style.GetColor("Border"),
                                    rounding, CornerFlags.All, border_size);
        }
    },

    // Helper for ColorPicker4()
    // NB: This is rather brittle and will show artifact when rounding
    // this enabled if rounded corners overlap multiple cells. Caller
    // currently responsible for avoiding that. I spent a non reasonable
    // amount of time trying to getting this right for ColorButton with
    // rounding+anti-aliasing+ImGuiColorEditFlags_HalfAlphaPreview flag +
    // various grid sizes and offsets, and eventually gave up... probably
    // more reasonable to disable rounding alltogether.
    renderColorRectWithAlphaCheckerboard(p_min, p_max, fill_col,
        grid_step, grid_off, rounding, rounding_corners_flags=~0)
    {
        let win = this.getCurrentWindow();
        let g = this.guictx;
        const style = g.Style;
        let on = style.GetColor("CheckerOff");
        let off = style.GetColor("CheckerOn");
        if(fill_col.a > 0)
        {
            on = Color.Blend(on, fill_col);
            off = Color.Blend(off, fill_col);
        }
        if(on.Equals(off))
        {
            win.DrawList.AddRectFilled(p_min, p_max, on, rounding,
                                        rounding_corners_flags);
        }
        else
        {
            // first one big rect representing bg/off
            win.DrawList.AddRectFilled(p_min, p_max, off, rounding,
                                        rounding_corners_flags);
            // next little rects representing fg/on
            let yi = 0;
            let p1 = new Vec2(), p2 = new Vec2();
            for (let y= p_min.y + grid_off.y; y < p_max.y; y += grid_step, yi++)
            {
                p1.y = Vec1.Clamp(y, p_min.y, p_max.y);
                p2.y = Math.min(y + grid_step, p_max.y);
                if (p2.y <= p1.y)
                    continue;
                for (let x = p_min.x + grid_off.x + (yi & 1) * grid_step;
                     x < p_max.x; x += grid_step * 2)
                {
                    p1.x = Vec1.Clamp(x, p_min.x, p_max.x);
                    p2.x = Math.min(x + grid_step, p_max.x);
                    if (p2.x <= p1.x)
                        continue;
                    let rounding_corners_flags_cell = 0;
                    if (p1.y <= p_min.y)
                    {
                        if (p1.x <= p_min.x)
                            rounding_corners_flags_cell |= CornerFlags.TopLeft;
                        if (p2.x >= p_max.x)
                            rounding_corners_flags_cell |= CornerFlags.TopRight;
                    }
                    if (p2.y >= p_max.y)
                    {
                        if (p1.x <= p_min.x)
                            rounding_corners_flags_cell |= CornerFlags.BotLeft;
                        if (p2.x >= p_max.x)
                            rounding_corners_flags_cell |= CornerFlags.BotRight;
                    }
                    rounding_corners_flags_cell &= rounding_corners_flags;
                    win.DrawList.AddRectFilled(p1, p2, on,
                                rounding_corners_flags_cell ? rounding : 0,
                                    rounding_corners_flags_cell);
                }
            }
        }
    },

    // simple/common icons that we draw manually.  For more complex
    // icons we recommend using an icon font.
    renderIcon(icon, p_min, scale=1)
    {
        let g = this.guictx;
        switch(icon)
        {
        case RenderIcons.Play:
        case RenderIcons.Arrow:
        case RenderIcons.RightArrow:
            this.renderArrow(p_min, Dir.Right, scale);
            break;
        case RenderIcons.LeftArrow:
            this.renderArrow(p_min, Dir.Left, scale);
            break;
        case RenderIcons.UpArrow:
            this.renderArrow(p_min, Dir.Up, scale);
            break;
        case RenderIcons.DownArrow:
            this.renderArrow(p_min, Dir.Down, scale);
            break;
        case RenderIcons.Stop:
        case RenderIcons.Square:
            {
                const h = g.FontSize;
                let col = g.Style.GetColor("Text");
                let r = h * 0.3 * scale;
                let center = Vec2.AddXY(p_min, h*0.5, h*0.5*scale);
                let p0 = Vec2.AddXY(center, -r, -r);
                let p1 = Vec2.AddXY(center, r, r);
                g.CurrentWindow.DrawList.AddRectFilled(p0, p1, col, 0.);
            }
            break;
        case RenderIcons.Pause:
            {
                /* implementme */
            }
            break;
        }
    },

    renderArrow(p_min, dir, scale=1, disabled=false)
    {
        let g = this.guictx;
        const h = g.FontSize;
        let r = h * 0.4 * scale;
        let center = Vec2.AddXY(p_min, h*0.5, h*0.5*scale);

        let a, b, c;
        switch (dir)
        {
        case Dir.Up:
        case Dir.Down:
            if (dir == Dir.Up) r = -r;
            a = new Vec2( 0.0, 0.75*r);
            b = new Vec2(-0.866*r, -0.75*r);
            c = new Vec2( 0.866*r, -0.75*r);
            break;
        case Dir.Left:
        case Dir.Right:
            if (dir == Dir.Left) r = -r;
            a = new Vec2( 0.750*r, 0.);
            b = new Vec2(-0.750*r, 0.866*r);
            c = new Vec2(-0.750*r,-0.866*r);
            break;
        case Dir.None:
        case Dir.COUNT:
            console.assert(0);
            break;
        }

        g.CurrentWindow.DrawList.AddTriangleFilled(
            Vec2.Add(center, a), Vec2.Add(center, b), Vec2.Add(center, c),
            disabled ? g.Style.GetColor("TextDisabled") : g.Style.GetColor("Text")
        );
    },

    renderBullet(pos)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        window.DrawList.AddCircleFilled(pos, g.FontSize*0.2,
                                        g.Style.GetColor("Text"), 9);
    },

    renderCheckMark(pos, col, sz)
    {
        let g = this.guictx;
        let window = g.CurrentWindow;
        let thickness = Math.max(sz / 5., 1);
        sz -= thickness*0.5;
        pos = Vec2.AddXY(pos, thickness*0.25, thickness*0.25);
        let third = sz / 3;
        let bx = pos.x + third;
        let by = pos.y + sz - third*0.5;
        window.DrawList.PathLineTo(new Vec2(bx - third, by - third));
        window.DrawList.PathLineTo(new Vec2(bx, by));
        window.DrawList.PathLineTo(new Vec2(bx + third*2, by - third*2));
        window.DrawList.PathStroke(col, false, thickness);
    },

    renderNavHighlight(bb, id, flags=NavHighlightFlags.TypeDefault)
    {
        let g = this.guictx;
        if (id != g.NavId)
            return;
        if (g.NavDisableHighlight && !(flags & NavHighlightFlags.AlwaysDraw))
            return;
        let window = g.CurrentWindow;
        if (window.DC.NavHideHighlightOneFrame)
            return;

        let rounding = (flags & NavHighlightFlags.NoRounding) ? 0: g.Style.FrameRounding;
        let display_rect = bb.Clone().ClipWith(window.ClipRect);
        if (flags & NavHighlightFlags.TypeDefault)
        {
            const thickness = 2.;
            const distance = 3. + thickness * 0.5;
            display_rect.Expand(distance);
            let fully_visible = window.ClipRect.Contains(display_rect);
            if (!fully_visible)
                window.DrawList.PushClipRect(display_rect.Min, display_rect.Max);
            window.DrawList.AddRect(Vec2.Add(display_rect.Min,thickness*0.5),
                                    Vec2.Subtract(display_rect.Max,thickness*.5),
                                    g.Style.GetColor("NavHighlight"),
                                    rounding, CornerFlags.All, thickness);
            if (!fully_visible)
                window.DrawList.PopClipRect();
        }
        if (flags & NavHighlightFlags.TypeThin)
        {
            window.DrawList.AddRect(display_rect.Min, display_rect.Max,
                            this.Style.GetColor("NavHighlight"),
                            rounding, ~0, 1);
        }
    },

    logRenderedText(ref_pos, text)
    {},

    // Render an arrow. 'pos' is position of the arrow tip. half_sz.x is length
    /// from base to tip. half_sz.y is length on each side.
    renderArrowPointingAt(draw_list, pos, half_sz, direction, col)
    {
        switch (direction)
        {
        case Dir.Left:
            draw_list.AddTriangleFilled(
                        new Vec2(pos.x + half_sz.x, pos.y - half_sz.y),
                        new Vec2(pos.x + half_sz.x, pos.y + half_sz.y),
                        pos, col);
            return;
        case Dir.Right:
            draw_list.AddTriangleFilled(
                        new Vec2(pos.x - half_sz.x, pos.y + half_sz.y),
                        new Vec2(pos.x - half_sz.x, pos.y - half_sz.y),
                        pos, col);
            return;
        case Dir.Up:
            draw_list.AddTriangleFilled(
                        new Vec2(pos.x + half_sz.x, pos.y + half_sz.y),
                        new Vec2(pos.x - half_sz.x, pos.y + half_sz.y),
                        pos, col);
            return;
        case Dir.Down:
            draw_list.AddTriangleFilled(
                        new Vec2(pos.x - half_sz.x, pos.y - half_sz.y),
                        new Vec2(pos.x + half_sz.x, pos.y - half_sz.y),
                        pos, col);
            return;
        case Dir.None:
        case Dir.COUNT:
            break; // Fix warnings
        }
    },

    // fill a horizontal portion of a rect (progress bar)
    // move to DrawList?
    renderRectFilledRangeH(draw_list, rect, col, x_start_norm, x_end_norm, rounding)
    {
        const half_pi = Math.PI * 0.5;
        let acos01 = function(x)
        {
            if(x <= 0) return half_pi;
            if(x >= 1) return 0;
            return Math.acos(x);
        };

        if (x_end_norm == x_start_norm)
            return;
        if (x_start_norm > x_end_norm)
        {
            // swap
            let x = x_end_norm;
            x_end_norm = x_start_norm;
            x_start_norm = x;
        }

        let p0 = new Vec2(Vec1.Lerp(rect.Min.x, rect.Max.x, x_start_norm), rect.Min.y);
        let p1 = new Vec2(Vec1.Lerp(rect.Min.x, rect.Max.x, x_end_norm), rect.Max.y);
        if (rounding == 0)
        {
            draw_list.AddRectFilled(p0, p1, col, 0.);
            return;
        }

        rounding = Vec1.Clamp(Math.min((rect.Max.x - rect.Min.x) * 0.5,
                                    (rect.Max.y - rect.Min.y) * 0.5) - 1.,
                                0, rounding);
        const inv_rounding = 1. / rounding;
        const arc0_b = acos01(1. - (p0.x - rect.Min.x) * inv_rounding);
        const arc0_e = acos01(1 - (p1.x - rect.Min.x) * inv_rounding);
        const x0 = Math.max(p0.x, rect.Min.x + rounding);
        if (arc0_b == arc0_e)
        {
            draw_list.PathLineTo(new Vec2(x0, p1.y));
            draw_list.PathLineTo(new Vec2(x0, p0.y));
        }
        else
        if (arc0_b == 0 && arc0_e == half_pi)
        {
            draw_list.PathArcToFast(new Vec2(x0, p1.y - rounding), rounding, 3, 6); // BL
            draw_list.PathArcToFast(new Vec2(x0, p0.y + rounding), rounding, 6, 9); // TR
        }
        else
        {
            draw_list.PathArcTo(new Vec2(x0, p1.y - rounding), rounding,
                    Math.PI - arc0_e, Math.PI - arc0_b, 3); // BL
            draw_list.PathArcTo(new Vec2(x0, p0.y + rounding), rounding,
                    Math.PI + arc0_b, Math.PI + arc0_e, 3); // TR
        }
        if (p1.x > rect.Min.x + rounding)
        {
            const arc1_b = acos01(1 - (rect.Max.x - p1.x) * inv_rounding);
            const arc1_e = acos01(1 - (rect.Max.x - p0.x) * inv_rounding);
            const x1 = Math.min(p1.x, rect.Max.x - rounding);
            if (arc1_b == arc1_e)
            {
                draw_list.PathLineTo(new Vec2(x1, p0.y));
                draw_list.PathLineTo(new Vec2(x1, p1.y));
            }
            else
            if (arc1_b == 0 && arc1_e == half_pi)
            {
                draw_list.PathArcToFast(new Vec2(x1, p0.y + rounding), rounding, 9, 12); // TR
                draw_list.PathArcToFast(new Vec2(x1, p1.y - rounding), rounding, 0, 3);  // BR
            }
            else
            {
                draw_list.PathArcTo(new Vec2(x1, p0.y + rounding), rounding, -arc1_e, -arc1_b, 3); // TR
                draw_list.PathArcTo(new Vec2(x1, p1.y - rounding), rounding, +arc1_b, +arc1_e, 3); // BR
            }
        }
        draw_list.PathFillConvex(col);
    },

    renderPixelEllipsis(draw_list, pos, count, col)
    {
        // should be able to output font "..."
        console.assert(0, "ellipsis");
    },
}; // end mixin