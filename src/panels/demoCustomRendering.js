import {Vec2} from "../types.js";
import {CondFlags, CornerFlags} from "../flags.js";
import {Color, Colors} from "../color.js";
import {ArrayEx} from "../arrayex.js";

export class DemoCustomRendering
{
    constructor(imgui)
    {
        this.imgui = imgui;
    }

    Show(p_open=null)
    {
        let imgui = this.imgui;
        imgui.SetNextWindowSize(new Vec2(350, 560), CondFlags.FirstUseEver);
        if (!imgui.Begin("Example: Custom rendering", p_open))
        {
            imgui.End();
            return;
        }

        // Tip: If you do a lot of custom rendering, you probably want to use
        // your own geometrical types and benefit of overloaded operators, etc.
        // ImGui defines overloaded operators but they are internal to imgui.cpp
        // and not exposed outside (to avoid messing with your types)
        // In this example we are not using the maths operators!
        let drawlist = imgui.GetWindowDrawList();
        if (imgui.BeginTabBar("##TabBar"))
        {
            // Primitives
            if(this._sz == undefined)
            {
                this._sz = 36;
                this._thickness = 4;
                this._col = Color.rgba(1., 1., 0.4, 1.);
                this._points = new ArrayEx();
                this._addingLine = false;
            }
            if (imgui.BeginTabItem("Primitives"))
            {
                imgui.DragFloat("Size", this._sz, 0.2, 2., 100., "%f",1,
                                (newval)=>this._sz=newval);
                imgui.DragFloat("Thickness", this._thickness, 0.05, 1., 8, "%.2f", 1,
                                (newval)=>this._thickness=newval);
                imgui.ColorEdit4("Color", this._col);
                const p = imgui.GetCursorScreenPos();
                let x = p.x + 4;
                let y = p.y + 4;
                let spacing = 8;
                let sz = this._sz;
                for (let n = 0; n < 2; n++)
                {
                    // First line uses a thickness of 1.0, second line uses the
                    // configurable thickness
                    let th = (n == 0) ? 1 : this._thickness;
                    drawlist.AddCircle(new Vec2(x + sz*.5, y + sz*.5),
                                        sz*0.5, this._col, th);
                    x += sz + spacing;
                    drawlist.AddCircle(new Vec2(x + sz*.5, y + sz*.5),
                                        sz*0.5, this._col, th);
                    x += sz + spacing;  // Circle
                    drawlist.AddRect(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                    this._col, 0,  CornerFlags.All, th);
                    x += sz + spacing;
                    drawlist.AddRect(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                    this._col, 10, CornerFlags.All, th);
                    x += sz + spacing;
                    drawlist.AddRect(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                    this._col, 10, CornerFlags.TopLeft |
                                                    CornerFlags.BotRight, th);
                    x += sz + spacing;
                    drawlist.AddTriangle(new Vec2(x + sz*.5, y),
                                         new Vec2(x + sz, y + sz - .5),
                                         new Vec2(x, y + sz - .5),
                                         this._col, th);
                    x += sz + spacing;
                    drawlist.AddLine(new Vec2(x, y), new Vec2(x + sz, y),
                                    this._col, th);
                    x += sz + spacing; // Horizontal line (note: drawing a filled rectangle will be faster!)
                    drawlist.AddLine(new Vec2(x, y), new Vec2(x, y + sz),
                                     this._col, th);
                    x += spacing; // Vertical line (note: drawing a filled rectangle will be faster!)
                    drawlist.AddLine(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                    this._col, th);
                    x += sz + spacing;             // Diagonal line
                    drawlist.AddBezierCurve(new Vec2(x, y),
                                new Vec2(x + sz*1.3, y + sz*0.3),
                                new Vec2(x + sz - sz*1.3,
                                y + sz - sz*0.3),
                                new Vec2(x + sz, y + sz),
                                this._col, th);
                    x = p.x + 4;
                    y += sz + spacing;
                }
                drawlist.AddCircleFilled(new Vec2(x + sz*0.5, y + sz*0.5), sz*0.5,
                                        this._col, 6);
                x += sz + spacing;     // Hexagon
                drawlist.AddCircleFilled(new Vec2(x + sz*0.5, y + sz*0.5), sz*0.5,
                                        this._col, 32);
                x += sz + spacing;    // Circle
                drawlist.AddRectFilled(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                        this._col);
                x += sz + spacing;
                drawlist.AddRectFilled(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                        this._col, 10.);
                x += sz + spacing;
                drawlist.AddRectFilled(new Vec2(x, y), new Vec2(x + sz, y + sz),
                                        this._col, 10,
                                        CornerFlags.TopLeft | CornerFlags.BotRight);
                x += sz + spacing;
                drawlist.AddTriangleFilled(new Vec2(x + sz*.5, y),
                                           new Vec2(x + sz, y + sz - .5),
                                           new Vec2(x, y + sz - .5),
                                           this._col);
                x += sz + spacing;
                drawlist.AddRectFilled(new Vec2(x, y),
                                       new Vec2(x + sz, y + this._thickness),
                                       this._col);
                x += sz + spacing; // Horizontal line (faster than AddLine, but only handle integer thickness)
                drawlist.AddRectFilled(new Vec2(x, y),
                                        new Vec2(x + this._thickness, y + sz),
                                        this._col);
                x += spacing + spacing;   // Vertical line (faster than AddLine, but only handle integer thickness)
                drawlist.AddRectFilled(new Vec2(x, y), new Vec2(x + 1, y + 1),
                                        this._col);
                x += sz;                  // Pixel (faster than AddLine)
                drawlist.AddRectFilledMultiColor(new Vec2(x, y), new Vec2(x + sz, y + sz),
                            Color.rgbi(0, 0, 0),
                            Color.rgbi(255, 0, 0),
                            Color.rgbi(255, 0, 0),
                            Color.rgbi(0, 0, 0));
                imgui.Dummy(new Vec2((sz + spacing) * 9.5, (sz + spacing) * 3));
                imgui.EndTabItem();
            }

            if (imgui.BeginTabItem("Canvas"))
            {
                if (imgui.Button("Clear"))
                    this._points.clear();
                if (this._points.length >= 2)
                {
                    imgui.SameLine();
                    if (imgui.Button("Undo"))
                    {
                        this._points.pop_back();
                        this._points.pop_back();
                    }
                }
                imgui.Text("Left-click and drag to add lines,\nRight-click to undo");

                // Here we are using InvisibleButton() as a convenience to
                //  1) advance the cursor and
                //  2) allows us to use IsItemHovered()
                // But you can also draw directly and poll mouse/keyboard by
                // yourself. You can manipulate the cursor using GetCursorPos()
                // and SetCursorPos().
                // If you only use the ImDrawList API, you can notify the
                // owner window of its extends by using SetCursorPos(max).
                // ImDrawList API uses screen coordinates!
                const canvas_pos = imgui.GetCursorScreenPos();
                // Resize canvas to what's available
                let canvas_size = imgui.GetContentRegionAvail().Clone();
                if (canvas_size.x < 50) canvas_size.x = 50;
                if (canvas_size.y < 50) canvas_size.y = 50;
                drawlist.AddRectFilledMultiColor(canvas_pos,
                        new Vec2(canvas_pos.x + canvas_size.x,
                                 canvas_pos.y + canvas_size.y),
                        Color.rgbi(50, 50, 50),
                        Color.rgbi(50, 50, 50),
                        Color.rgbi(60, 60, 80),
                        Color.rgbi(60, 60, 80));
                drawlist.AddRect(canvas_pos,
                        new Vec2(canvas_pos.x + canvas_size.x,
                                 canvas_pos.y + canvas_size.y),
                                 Colors.gray);
                let adding_preview = false;
                imgui.InvisibleButton("canvas", canvas_size);
                let mouse_pos_in_canvas = new Vec2(imgui.GetIO().MousePos.x - canvas_pos.x,
                                                   imgui.GetIO().MousePos.y - canvas_pos.y);
                if (this._addingLine)
                {
                    adding_preview = true;
                    this._points.push_back(mouse_pos_in_canvas);
                    if (!imgui.IsMouseDown(0))
                        this._addingLine = adding_preview = false;
                }
                if (imgui.IsItemHovered())
                {
                    if (!this._addingLine && imgui.IsMouseClicked(0))
                    {
                        this._points.push_back(mouse_pos_in_canvas);
                        this._addingLine = true;
                    }
                    if (imgui.IsMouseClicked(1) && !this._points.empty())
                    {
                        this._addingLine = adding_preview = false;
                        this._points.pop_back();
                        this._points.pop_back();
                    }
                }
                // clip lines within the canvas (if we resize it, etc.)
                drawlist.PushClipRect(canvas_pos,
                            new Vec2(canvas_pos.x + canvas_size.x,
                                     canvas_pos.y + canvas_size.y),
                                     true);
                for (let i = 0; i < this._points.length - 1; i += 2)
                {
                    drawlist.AddLine(new Vec2(canvas_pos.x + this._points[i].x,
                                              canvas_pos.y + this._points[i].y),
                                    new Vec2(canvas_pos.x + this._points[i + 1].x,
                                             canvas_pos.y + this._points[i + 1].y),
                                    this._col, this._thickness);
                }
                drawlist.PopClipRect();
                if (adding_preview)
                    this._points.pop_back();
                imgui.EndTabItem();
            }

            if (imgui.BeginTabItem("BG/FG draw lists"))
            {
                imgui.Text("currently unimplemented");
                /*
                static bool draw_bg = true;
                static bool draw_fg = true;
                imgui.Checkbox("Draw in Background draw list", &draw_bg);
                imgui.Checkbox("Draw in Foreground draw list", &draw_fg);
                ImVec2 window_pos = imgui.GetWindowPos();
                ImVec2 window_size = imgui.GetWindowSize();
                ImVec2 window_center = ImVec2(window_pos.x + window_size.x * 0.5f, window_pos.y + window_size.y * 0.5f);
                if (draw_bg)
                    imgui.GetBackgroundDrawList()->AddCircle(window_center, window_size.x * 0.6f, IM_COL32(255, 0, 0, 200), 32, 10+4);
                if (draw_fg)
                    imgui.GetForegroundDrawList()->AddCircle(window_center, window_size.y * 0.6f, IM_COL32(0, 255, 0, 200), 32, 10);
                */
                imgui.EndTabItem();
            }

            imgui.EndTabBar();
        }

        imgui.End();
    } // end Show
}