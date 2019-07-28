import {Rect, Vec2, Vec1} from "../types.js";

export var PlotType =
{
    Lines: 0,
    Histogram: 1,
    Signal: 2,  // audio samples
};

export var PlotFlags =
{
    Default: 0,
    NoTip:   1,

};

export var ImguiPlotMixin =
{
    //-------------------------------------------------------------------------
    // [SECTION] Widgets: PlotLines, PlotHistogram
    //-------------------------------------------------------------------------
    // - PlotLines() (two variants)
    // - PlotHistogram() (two variants)
    // - plotEx() [Internal]
    //-------------------------------------------------------------------------
    PlotLines(label, values,
            values_offset=0, overlay_text=null,
            scale_min=Number.MAX_VALUE, scale_max=Number.MAX_VALUE,
            graph_size=Vec2.Zero(), stride=1, flags=0)
    {
        let getter = function(i)
        {
            return values[i*stride];
        };
        this.plotEx(PlotType.Lines, label, getter, values.length, values_offset,
            overlay_text, scale_min, scale_max, graph_size, flags);
    },

    PlotLinesCB(label, getter, values_count,
            values_offset=0, overlay_text=null,
            scale_min=Number.MAX_VALUE, scale_max=Number.MAX_VALUE,
            graph_size=Vec2.Zero(), roi=null, flags=0)
    {
        this.plotEx(PlotType.Lines, label, getter, values_count, values_offset,
            overlay_text, scale_min, scale_max, graph_size, roi, flags);
    },

    PlotSignal(label, values,
            values_offset=0, overlay_text=null,
            scale_min=Number.MAX_VALUE, scale_max=Number.MAX_VALUE,
            graph_size=Vec2.Zero(), roi=null, flags=0)
    {
        let getter = function(i)
        {
            return values[i];
        };
        this.plotEx(PlotType.Signal, label, getter, values.length, values_offset,
            overlay_text, scale_min, scale_max, graph_size, roi, flags);
    },

    PlotSignalCB(label, getter, values,
            values_offset=0, overlay_text=null,
            scale_min=Number.MAX_VALUE, scale_max=Number.MAX_VALUE,
            graph_size=Vec2.Zero(), roi=null, flags=0)
    {
        this.plotEx(PlotType.Signal, label, getter, values.length, values_offset,
            overlay_text, scale_min, scale_max, graph_size, roi, flags);
    },

    PlotHistogram(label, values,
            values_offset=0, overlay_text=null,
            scale_min=Number.MAX_VALUE, scale_max=Number.MAX_VALUE,
            graph_size=Vec2.Zero(), stride=1, roi=null, flags=0)
    {
        let getter = function(i)
        {
            return values[i*stride];
        };
        this.plotEx(PlotType.Histogram, label, getter, values.length, values_offset,
            overlay_text, scale_min, scale_max, graph_size, roi, flags);
    },

    PlotHistogramCB(label, getter, values_count,
            values_offset=0, overlay_text=null,
            scale_min=Number.MAX_VALUE, scale_max=Number.MAX_VALUE,
            graph_size=Vec2.Zero(), roi=null, flags=0)
    {
        this.plotEx(PlotType.Histogram, label, getter, values_count, values_offset,
            overlay_text, scale_min, scale_max, graph_size, roi, flags);
    },

    plotEx(plotType, label, getter, values_count, values_offset, overlay_text,
            scale_min, scale_max, frame_size, roi, flags)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(label);

        const label_size = this.CalcTextSize(label, true);
        if (frame_size.x == 0)
            frame_size.x = this.getNextItemWidth();
        if (frame_size.y == 0)
            frame_size.y = label_size.y + (style.FramePadding.y * 2);

        const frame_bb = new Rect(win.DC.CursorPos,
                                Vec2.Add(win.DC.CursorPos, frame_size));
        const inner_bb = new Rect(Vec2.Add(frame_bb.Min, style.FramePadding),
                                Vec2.Subtract(frame_bb.Max, style.FramePadding));
        const total_bb = new Rect(frame_bb.Min,
                                    Vec2.AddXY(frame_bb.Max,
                                      label_size.x > 0 ?
                                        style.ItemInnerSpacing.x+label_size.x : 0,
                                      0));
        this.itemSize(total_bb, style.FramePadding.y);
        if (!this.itemAdd(total_bb, 0, frame_bb))
            return;
        const hovered = this.itemHoverable(frame_bb, id);

        // Determine scale from values if not specified
        if (scale_min == Number.MAX_VALUE || scale_max == Number.MAX_VALUE)
        {
            let v_min = Number.MAX_VALUE;
            let v_max = -Number.MAX_VALUE;
            for (let i = 0; i < values_count; i++)
            {
                const v = getter(i);
                if (isNaN(v)) // Ignore NaN values
                    continue;
                v_min = Math.min(v_min, v);
                v_max = Math.max(v_max, v);
            }
            if (scale_min == Number.MAX_VALUE)
                scale_min = v_min;
            if (scale_max == Number.MAX_VALUE)
                scale_max = v_max;
        }

        this.renderFrame(frame_bb.Min, frame_bb.Max,
                        style.GetColor("PlotBg"), true, style.FrameRounding);

        const values_count_min = (plotType == PlotType.Lines) ? 2 : 1;
        if (values_count >= values_count_min)
        {
            let res_w = Math.min(Math.floor(frame_size.x), values_count) +
                        ((plotType == PlotType.Lines) ? -1 : 0);
            let item_count = values_count + ((plotType == PlotType.Lines) ? -1 : 0);
            let roiPx;
            let colHovered, col, colDimmed;
            if(roi)
                roiPx = [roi[0]*res_w, roi[1]*res_w];

            switch(plotType)
            {
            case PlotType.Lines:
                col = style.GetColor("PlotLines");
                colHovered = style.GetColor("PlotLinesHovered");
                if(roiPx)
                    colDimmed = style.GetColor("PlotLinesDimmed");
                else
                    colDimmed = col;
                break;
            case PlotType.Signal:
                col = style.GetColor("PlotSignal");
                colHovered = style.GetColor("PlotSignalHovered");
                if(roiPx)
                    colDimmed = style.GetColor("PlotSignalDimmed");
                else
                    colDimmed = col;
                break;
            case PlotType.Histogram:
                col = style.GetColor("PlotHistogram");
                colHovered = style.GetColor("PlotHistogramHovered");
                if(roiPx)
                    colDimmed = style.GetColor("PlotHistogramDimmed");
                else
                    colDimmed = col;
                break;
            }

            // Tooltip on hover
            let v_hovered = -1;
            if (!(flags&PlotFlags.NoTip) && hovered &&
                inner_bb.Contains(g.IO.MousePos))
            {
                const t = Vec1.Clamp((g.IO.MousePos.x-inner_bb.Min.x) /
                                     (inner_bb.Max.x - inner_bb.Min.x),
                                     0., 0.9999);
                const v_idx = Math.floor(t * item_count);
                console.assert(v_idx >= 0 && v_idx < values_count);

                const v0 = getter((v_idx + values_offset) % values_count);
                const v1 = getter((v_idx + 1 + values_offset) % values_count);
                switch(plotType)
                {
                case PlotType.Lines:
                    this.SetTooltip("%d: %8.4g\n%d: %8.4g", v_idx, v0, v_idx+1, v1);
                    break;
                case PlotType.Signal:
                    this.SetTooltip("%d: %8.4g", v_idx, v0);
                    break;
                case PlotType.Histogram:
                    this.SetTooltip("%d: %8.4g", v_idx, v0);
                    break;
                }
                v_hovered = v_idx;
            }

            const t_step = 1 / res_w;
            const inv_scale = (scale_min == scale_max) ? 0 :
                                    (1/(scale_max - scale_min));

            let v0 = getter((0 + values_offset) % values_count);
            let t0 = 0.0;
            // Point in the normalized space of our target rectangle
            let tp0 = new Vec2(t0, 1. - Vec1.Saturate((v0 - scale_min) * inv_scale));
            let histogram_zero_line_t = (scale_min * scale_max < 0) ?
                    (-scale_min * inv_scale) :
                    (scale_min < 0 ? 0 : 1);   // Where does the zero line stand

            let tp1 = new Vec2();
            let lines = [];
            for (let n = 0; n < res_w; n++)
            {
                const t1 = t0 + t_step;
                const v1_idx = Math.floor(t0 * item_count + 0.5);
                console.assert(v1_idx >= 0 && v1_idx < values_count);
                const v1 = getter((v1_idx + values_offset + 1) % values_count);
                tp1.x = t1;
                tp1.y = 1 - Vec1.Saturate((v1 - scale_min) * inv_scale);

                let pos0, pos1;
                let c;
                if(v_hovered == v1_idx)
                    c = colHovered;
                else
                {
                    if(roiPx && (n < roiPx[0] || n > roiPx[1]))
                        c = colDimmed;
                    else
                        c = col;
                }
                switch(plotType)
                {
                case PlotType.Lines:
                    pos0 = Vec2.Lerp(inner_bb.Min, inner_bb.Max, tp0);
                    pos1 = Vec2.Lerp(inner_bb.Min, inner_bb.Max, tp1);
                    lines.push([pos0, pos1, c.AsStr()]);
                    //win.DrawList.AddLine(pos0, pos1, c);
                    break;
                case PlotType.Signal:
                    // we can overwrite tp0, since it's stomped each loop
                    pos0 = Vec2.Lerp(inner_bb.Min, inner_bb.Max, tp0);
                    tp0.y = 1 - Vec1.Saturate((-v1 - scale_min) * inv_scale);
                    pos1 = Vec2.Lerp(inner_bb.Min, inner_bb.Max, tp0);
                    lines.push([pos0, pos1, c.AsStr()]);
                    // win.DrawList.AddLine(pos0, pos1, c);
                    break;
                case PlotType.Histogram:
                    pos0 = Vec2.Lerp(inner_bb.Min, inner_bb.Max, tp0);
                    pos1 = Vec2.Lerp(inner_bb.Min, inner_bb.Max,
                                new Vec2(tp1.x, histogram_zero_line_t));
                    if (pos1.x >= pos0.x + 2.)
                        pos1.x -= 1;
                    win.DrawList.AddRectFilled(pos0, pos1, c);
                    break;
                }
                t0 = t1;
                tp0.Copy(tp1);
            }
            if(lines.length)
                win.DrawList.AddLines(lines);
        }

        // Text overlay
        if (overlay_text)
        {
            this.renderTextClipped(
                new Vec2(frame_bb.Min.x, frame_bb.Min.y + style.FramePadding.y),
                frame_bb.Max, overlay_text, null, new Vec2(0.5,0));
        }

        if (label_size.x > 0)
        {
            this.renderText(
                new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x, inner_bb.Min.y),
                label);
        }

    }
};