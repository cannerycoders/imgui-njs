import {TextFilter} from "../widgets/text.js";
import {CornerFlags, CondFlags} from "../flags.js";
import {WindowFlags} from "../window.js";
import {TabBarFlags} from "../widgets/tab.js";
import {ColorEditFlags} from "../widgets/coloredit.js";
import {Vec2} from "../types.js";

export default class StyleEditorWindow
{
    constructor(imgui)
    {
        this.styleEditor = null;
    }

    Show(imgui, winname, isOpen)
    {
        if(!isOpen.get()) return;
        imgui.SetNextWindowPos(new Vec2(40, 40), CondFlags.FirstUseEver);
        imgui.SetNextWindowSize(new Vec2(500, 700), CondFlags.FirstUseEver);
        let winflags = 0;
        if(imgui.Begin(winname, isOpen, winflags))
        {
            if(!this.styleEditor)
                this.styleEditor = new StyleEditor(imgui);
            this.styleEditor.Show();
        }
        imgui.End();
    }
}

export class StyleEditor
{
    constructor(imgui)
    {
        this.imgui = imgui;
        this.colorTextFilter = new TextFilter(imgui);
        this.outputTarget = 0;
        this.outputModifiedOnly = false;
        this.colorAlphaFlags = 0;
        this.refStyle = imgui.guictx.Style.Clone();
    }

    // You can pass in a reference style to compare to, revert
    // to and save to (else it compares to an internally stored
    // reference)
    Show()
    {
        let imgui = this.imgui;
        let style = imgui.GetStyle();
        let dirty = false;

        imgui.PushItemWidth(imgui.GetWindowWidth() * 0.5);

        if (this.showStyleSelector("Colors##Selector"))
        {
            this.refStyle = style.Clone();
            // new: style embodies colors scheme, plus font and other params
        }
        let ref = this.refStyle;

        // Simplified Settings
        if (imgui.SliderFloat("FrameRounding", style.FrameRounding, 0.0, 12.0,
            "%.0f", 1, (v) => style.FrameRounding = v))
        {
            style.GrabRounding = style.FrameRounding; // Make GrabRounding always the same value as FrameRounding
            dirty = true;
        }
        let window_border = (style.WindowBorderSize > 0);
        if (imgui.Checkbox("WindowBorder", window_border))
        {
            style.WindowBorderSize = window_border ? 0 : 1; // toggle
            dirty = true;
        }
        imgui.SameLine();
        let frame_border = (style.FrameBorderSize > 0);
        if (imgui.Checkbox("FrameBorder", frame_border))
        {
            style.FrameBorderSize = frame_border ? 0 : 1; // toggle
            dirty = true;
        }
        imgui.SameLine();
        let popup_border = style.PopupBorderSize > 0;
        if (imgui.Checkbox("PopupBorder", popup_border))
        {
            style.PopupBorderSize = popup_border ? 0 : 1; // toggle
            dirty = true;
        }

        // Save/Revert button
        if (imgui.Button("Save Ref"))
        {
            this.refStyle = style.Clone();
            ref = this.refStyle;
        }
        imgui.SameLine();
        if (imgui.Button("Revert Ref"))
        {
            this.guictx.Style = this.refStyle.Clone();
            dirty = true;
        }

        imgui.Separator(); // -------------------------------------
        if (imgui.BeginTabBar("##tabs", TabBarFlags.None))
        {
            if (imgui.BeginTabItem("Sizes"))
            {
                imgui.Text("Fonts");

                for(let fs in style.FontSizes)
                {
                    imgui.SliderInt(fs, style.FontSizes[fs], 8, 32, null, (newval) => 
                    {
                        style.FontSizes[fs] = newval;
                        dirty = true;
                    });
                }

                imgui.Text("Main");
                imgui.SliderFloat("TextLineHeightPct", style.TextLineHeightPct,
                                .4, 2, "%.2f", 1,
                                (newval)=>style.TextLineHeightPct=newval);
                imgui.SliderInt2("WindowPadding", style.WindowPadding, 0, 20);
                imgui.SliderInt2("FramePadding", style.FramePadding, 0, 20);
                imgui.SliderInt2("ItemSpacing", style.ItemSpacing, 0, 20);
                imgui.SliderInt2("ItemInnerSpacing", style.ItemInnerSpacing, 0, 20);
                imgui.SliderInt2("TouchExtraPadding", style.TouchExtraPadding, 0, 10);
                imgui.SliderInt("IndentSpacing", style.IndentSpacing, 0, 30, null,
                                        (newval)=> style.IndentSpacing = newval);
                imgui.SliderInt("ScrollbarSize", style.ScrollbarSize, 1., 20., null,
                                        (newval)=> style.ScrollbarSize = newval);
                imgui.SliderInt("GrabMinSize", style.GrabMinSize, 1, 20, null,
                                        (newval)=> style.GrabMinSize = newval);
                imgui.Text("Borders");
                imgui.SliderFloat("WindowBorderSize", style.WindowBorderSize, 0., 1., "%.0f", 1,
                                        (newval) => style.WindowBorderSize = newval);
                imgui.SliderFloat("ChildBorderSize", style.ChildBorderSize, 0., 1., "%.0f", 1,
                                        (newval) => style.ChildBorderSize = newval);
                imgui.SliderFloat("PopupBorderSize", style.PopupBorderSize, 0., 1., "%.0f", 1,
                                        (newval) => style.PopupBorderSize = newval);
                imgui.SliderFloat("FrameBorderSize", style.FrameBorderSize, 0., 1., "%.0f", 1,
                                        (newval) => style.FrameBorderSize = newval);
                imgui.SliderFloat("TabBorderSize", style.TabBorderSize, 0., 1., "%.0f", 1,
                                        (newval) => style.TabBorderSize = newval);
                imgui.Text("Rounding");
                imgui.SliderFloat("WindowRounding", style.WindowRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.WindowRounding = newval);
                imgui.SliderFloat("ChildRounding", style.ChildRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.ChildRounding = newval);
                imgui.SliderFloat("FrameRounding", style.FrameRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.FrameRounding = newval);
                imgui.SliderFloat("PopupRounding", style.PopupRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.PopupRounding = newval);
                imgui.SliderFloat("ScrollbarRounding", style.ScrollbarRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.ScrollbarRounding = newval);
                imgui.SliderFloat("GrabRounding", style.GrabRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.GrabRounding = newval);
                imgui.SliderFloat("TabRounding", style.TabRounding, 0., 12., "%.0f", 1,
                                        (newval) => style.TabRounding = newval);
                imgui.Text("Alignment");
                imgui.SliderFloat2("WindowTitleAlign", style.WindowTitleAlign, 0., 1., "%.2f");
                imgui.SliderFloat2("ButtonTextAlign", style.ButtonTextAlign, 0., 1., "%.2f");
                imgui.Tooltip("Alignment applies when a button is larger than its text content.");
                imgui.SliderFloat2("SelectableTextAlign", style.SelectableTextAlign, 0, 1, "%.2f");
                imgui.Tooltip("Alignment applies when a selectable is larger than its text content.");
                imgui.Text("Safe Area Padding");
                imgui.Tooltip("Adjust if you cannot see the edges of your screen (e.g. on a TV where scaling has not been configured).");
                imgui.SliderFloat2("DisplaySafeAreaPadding", style.DisplaySafeAreaPadding, 0., 30., "%.0f");
                imgui.EndTabItem();
            }
            if (imgui.BeginTabItem("Colors"))
            {
                // static int output_dest = 0;
                // static bool output_only_modified = true;
                if (imgui.Button("Export Unsaved"))
                {
                    if (this.outputTarget == 0)
                        imgui.LogToClipboard();
                    else
                        imgui.LogToTTY();
                    imgui.LogText("{\nstyle.Colors: {");
                    for (let key in style.Colors)
                    {
                        let c = ref.Colors[key];
                        if(!this.outputModifiedOnly || style.Colors[key] != c)
                        {
                            let value = c.AsStr();
                            imgui.LogText(`${key}: ${value}\n`);
                        }
                    }
                    imgui.LogText("\n}\n}");
                    imgui.LogFinish();
                }
                imgui.SameLine();
                imgui.PushItemWidth(120);
                imgui.Combo("##output_type", this.outputTarget, ["To Clipboard", "To TTY"]);
                imgui.PopItemWidth();
                imgui.SameLine();
                if(imgui.Checkbox("Only Modified Colors", this.outputModifiedOnly))
                    this.outputModifiedOnly = !this.outputModifiedOnly;

                this.colorTextFilter.Draw("Filter colors", imgui.GetFontSize() * 16);

                if(imgui.RadioButton("Opaque", this.colorAlphaFlags==0))
                    this.colorAlphaFlags = 0;
                imgui.SameLine();
                if(imgui.RadioButton("Alpha", this.colorAlphaFlags==ColorEditFlags.AlphaPreview))
                    this.colorAlphaFlags = ColorEditFlags.AlphaPreview;
                imgui.SameLine();
                if(imgui.RadioButton("Both", this.colorAlphaFlags==ColorEditFlags.AlphaPreviewHalf))
                    this.colorAlphaFlags = ColorEditFlags.AlphaPreviewHalf;

                imgui.Tooltip("In the color list:\n\nLeft-click on colored square to open color picker,\n\nRight-click to open edit options menu.");

                imgui.BeginChild("##colors", Vec2.Zero(), true,
                                WindowFlags.AlwaysVerticalScrollbar|
                                WindowFlags.AlwaysHorizontalScrollbar|
                                WindowFlags.NavFlattened);
                imgui.PushItemWidth(-160);
                for (let key of style.GetSchemeColorNames())
                {
                    if (!this.colorTextFilter.PassFilter(key))
                        continue;
                    imgui.PushID(key);
                    imgui.ColorEdit4("##color", style.Colors[key],
                                    ColorEditFlags.AlphaBar|this.colorAlphaFlags);
                    if (!style.Colors[key].Equals(ref.Colors[key]))
                    {
                        // Tips: in a real user application, you may want to merge
                        // and use an icon font into the main font, so instead of
                        // "Save"/"Revert" you'd use icons. Read the FAQ and
                        // misc/fonts/README.txt about using icon fonts. It's
                        // really easy and super convenient!
                        imgui.SameLine(0., style.ItemInnerSpacing.x);
                        if (imgui.Button("Save"))
                            ref.Colors[key].Copy(style.Colors[key]);
                        imgui.SameLine(0., style.ItemInnerSpacing.x);
                        if (imgui.Button("Revert"))
                            style.Colors[key].Copy(ref.Colors[key]);
                    }
                    imgui.SameLine(0., style.ItemInnerSpacing.x);
                    imgui.TextUnformatted(key);
                    imgui.PopID();
                }
                imgui.PopItemWidth();
                imgui.EndChild();
                imgui.EndTabItem();
            } // end colors tab

            if (imgui.BeginTabItem("Fonts"))
            {
                let io = imgui.GetIO();
                let fontlist = io.Fonts.EnumerateFonts();
                imgui.PushItemWidth(120);
                for (let i=0; i<fontlist.length; i++)
                {
                    let fontname = fontlist[i];
                    imgui.PushID(fontname);
                    let fontDetailsOpen = imgui.TreeNode(fontname);
                    imgui.SameLine();
                    
                    let fsz = style.GetFontSize("Std");
                    let font = io.Fonts.GetFont(fontname, fsz);
                    if (imgui.SmallButton("Set as default"))
                        style.SetFont("Default", font);

                    if (fontDetailsOpen)
                    {
                        if(this._fontvscale == undefined)
                            this._fontvscale = 1;
                        imgui.SliderFloat("Scale", this._fontvscale, 0.2, 5,
                            "%.1f", 1, (v) => this._fontvscale = v);
                        let bigfont = io.Fonts.GetFont(fontname, 56);
                        let visfont = io.Fonts.GetFont(fontname, fsz*this._fontvscale);
                        imgui.PushFont(visfont);
                        imgui.Text("The quick brown fox jumps over the lazy dog");
                        imgui.PopFont();
                        // imgui.InputFloat("Font offset", font.DisplayOffset.y, 1, 1, "%.0f");
                        imgui.Text(`Ascent: ${visfont.Ascent.toFixed(1)}, ` +
                                 `Descent: ${visfont.Descent.toFixed(1)}, ` +
                                `Baseline: ${visfont.Baseline.toFixed(1)}, ` +
                                `Height: ${(visfont.Descent-font.Ascent).toFixed(1)}`);
                        // Display all glyphs of the fonts in separate pages of 256 characters
                        // TODO: determine fallback character.
                        let cell_p1 = new Vec2();
                        let cell_p2 = new Vec2();
                        let txtcol = imgui.GetStyleColor("Text");
                        let rcol = imgui.GetStyleColor("TextDisabled");
                        let codes = font.GetKnownCodes();
                        const glyphsPerBlock = 256;
                        const cell_size = visfont.Size; // tight packing, no LineHeightPct
                        const cell_spacing = style.ItemSpacing.y;
                        const dl = imgui.GetWindowDrawList();
                        for (let g=0; g<codes.length; g+=glyphsPerBlock)
                        {
                            if (imgui.TreeNode(`Glyphs${Math.floor(g/glyphsPerBlock)}`))
                            {
                                const base_pos = imgui.GetCursorScreenPos();
                                for (let n=0; n<glyphsPerBlock; n++)
                                {
                                    cell_p1.x = base_pos.x + (n % 16) * (cell_size + cell_spacing);
                                    cell_p1.y = base_pos.y + Math.floor(n / 16) * (cell_size + cell_spacing);
                                    cell_p2.x = cell_p1.x + cell_size;
                                    cell_p2.y = cell_p1.y + cell_size;
                                    dl.AddRect(cell_p1, cell_p2, rcol,
                                            0., CornerFlags.All, .5);
                                    let code = codes[g+n];
                                    if(code != undefined)
                                    {
                                        let char = String.fromCharCode(code);
                                        dl.AddText(char, cell_p1, visfont, font.Size, txtcol);
                                        if (imgui.IsMouseHoveringRect(cell_p1, cell_p2))
                                        {
                                            imgui.BeginTooltip();
                                            imgui.Text("code: " + code.toString(16));
                                            let nm = visfont.GetCodeName(code);
                                            if(nm) imgui.Text("name: " + nm);
                                            imgui.Separator();
                                            imgui.PushFont(bigfont);
                                            imgui.Text(char);
                                            imgui.PopFont();
                                            imgui.EndTooltip();
                                        }
                                    }
                                }
                                imgui.Dummy(new Vec2((cell_size + cell_spacing) * 16,
                                                    (cell_size + cell_spacing) * 16));
                                imgui.TreePop();
                            }
                        }
                        imgui.TreePop();
                    } // end fontdetails node open
                    imgui.PopID();
                } // end font tree node iterator
                // no atlas texture

                let window_scale = 1.;
                if (imgui.DragFloat("this window scale", window_scale, 0.005, 0.3, 2., "%.2f"))   // scale only this window
                    imgui.SetWindowFontScale(window_scale);
                if(imgui.DragFloat("global scale", io.FontGlobalScale, 0.005, 0.3, 2., "%.2f"))      // scale everything
                    imgui.SetWindowFontScale(io.FontGlobalScale);
                imgui.PopItemWidth();

                imgui.EndTabItem();
            } // end fonts tab
            if (imgui.BeginTabItem("Rendering"))
            {
                // Not exposing zero here so user doesn't "lose" the UI (zero alpha clips all widgets).
                // But application code could have a toggle to switch between zero and non-zero.
                imgui.DragFloat("Global Alpha", style.Alpha, 0.005, 0.2, 1., "%.2f");
                imgui.PopItemWidth();
                imgui.EndTabItem();
            }
            imgui.EndTabBar();
        } // end tab bar
        imgui.PopItemWidth();
    }

    showStyleSelector(label)
    {
    }

    showFontSelector(label)
    {
    }

}