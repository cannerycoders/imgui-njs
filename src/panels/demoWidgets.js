import {Vec1, Vec2, Rect, ValRef, MutableString} from "../types.js";
import {Color} from "../color.js";
import {Dir} from "../enums.js";
import {FocusedFlags, HoveredFlags} from "../flags.js";
import {TreeNodeFlags} from "../widgets/tree.js";
import {ComboFlags} from "../widgets/combo.js";
import {SelectableFlags} from "../widgets/selectable.js";
import {InputTextFlags} from "../widgets/inputtext.js";
import {ColorEditFlags} from "../widgets/coloredit.js";
import {DragDropFlags} from "../dragdrop.js";

export class DemoWidgets
{
    constructor(imgui)
    {
        this.imgui = imgui;
        this.clicked = 0;
        this.check = true;
        this.e =  0;
        this.counter = 0;
        this.arr = [ 0.6, 0.1, 1.0, 0.5, 0.92, 0.1, 0.2 ];
        this.items = [ "AAAA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG",
                    "HHHH", "IIII", "JJJJ", "KKKK", "LLLLLLL", "MMMM", "OOOOOOO" ];
        this.item_current = 0;
        this.str0 = new MutableString("Hello, world!");
        this.str1 = new MutableString("");
        this.i0 = 123;
        this.i1 = 50;
        this.i2 = 42;
        this.i3 = 0; // slider int

        this.f0 = 0.001;
        this.f1 = 1.e10;
        this.f2 = 1;
        this.f3 = .0067;
        this.f4 = .123; // slider float
        this.f5 = .0; // slider float (curve)

        this.d0 = 999999.00000001;
        this.vec4a = [ 0.10, 0.20, 0.30, 0.44 ];

        this.angle = 0;

        this.col1 = Color.rgb(1.0,0.0,0.2);
        this.col2 = Color.rgb(0.4,0.7,0.0,0.5);

        this.listbox_items = [ "Apple", "Banana", "Cherry", "Kiwi", "Mango",
                            "Orange", "Pineapple", "Strawberry", "Watermelon" ];
        this.listbox_item_current = 1;

        this.align_label_with_current_x_position = false;
        this.selection_mask = (1 << 2); // Dumb representation of what may be user-side selection state. You may carry selection state inside or outside your objects in whatever format you see fit.
        this.node_clicked = -1;                // Temporary storage of what node we have clicked to process selection at the end of the loop. May be a pointer to your own node type, etc.

        this.plot_animate = false;
        this.plot_arr = [ 0.6, 0.1, 1.0, 0.5, 0.92, 0.1, 0.2 ];


    }

    Show()
    {
        let imgui = this.imgui;
        if (!imgui.CollapsingHeader("Widgets"))
            return;

        if (imgui.TreeNode("Basic"))
        {
            if (imgui.Button("Button"))
                this.clicked++;
            if (this.clicked & 1)
            {
                imgui.SameLine();
                imgui.Text("Thanks for clicking me!");
            }

            if(imgui.Checkbox("checkbox", this.check))
                this.check = !this.check;

            if(imgui.RadioButton("radio a", this.e==0))
                this.e = 0;
            imgui.SameLine();
            if(imgui.RadioButton("radio b", this.e==1))
                this.e = 1;
            imgui.SameLine();
            if(imgui.RadioButton("radio c", this.e==2))
                this.e = 2;

            // Color buttons, demonstrate using PushID() to add unique
            // identifier in the ID stack, and changing style.
            for (let i = 0; i < 7; i++)
            {
                if (i > 0)
                    imgui.SameLine();
                imgui.PushID(i);
                imgui.PushStyleColor("Button", Color.hsv(i/7.0, 0.6, 0.6));
                imgui.PushStyleColor("ButtonHovered", Color.hsv(i/7.0, 0.7, 0.7));
                imgui.PushStyleColor("ButtonActive", Color.hsv(i/7.0, 0.8, 0.8));
                imgui.Button("Click");
                imgui.PopStyleColor(3);
                imgui.PopID();
            }

            // Use AlignTextToFramePadding() to align text baseline to the
            // baseline of framed elements (otherwise a Text+SameLine+Button
            // sequence will have the text a little too high by default)
            imgui.AlignTextToFramePadding();
            imgui.Text("Hold to repeat:");
            imgui.SameLine();

            // Arrow buttons with Repeater
            let spacing = imgui.GetStyle().ItemInnerSpacing.x;
            imgui.PushButtonRepeat(true);
            if (imgui.ArrowButton("##left", Dir.Left)) { this.counter--; }
            imgui.SameLine(0.0, spacing);
            if (imgui.ArrowButton("##right", Dir.Right)) { this.counter++; }
            imgui.PopButtonRepeat();
            imgui.SameLine();
            imgui.Text("%d", this.counter);

            imgui.Text("Hover over me");
            if (imgui.IsItemHovered())
                imgui.SetTooltip("I am a tooltip");

            imgui.SameLine();
            imgui.Text("- or me");
            if (imgui.IsItemHovered())
            {
                imgui.BeginTooltip();
                imgui.Text("I am a fancy tooltip");
                imgui.PlotLines("Curve", this.arr);
                imgui.EndTooltip();
            }

            imgui.Separator();

            imgui.LabelText("label", "Value");

            // Using the _simplified_ one-liner Combo() api here
            // See "Combo" section for examples of how to use the more
            // complete BeginCombo()/EndCombo() api.
            imgui.Combo("combo", this.item_current, this.items, -1,
                (newval) => this.item_current = newval);
            imgui.SameLine();
            imgui.Tooltip("Refer to the \"Combo\" section below for an explanation of the full BeginCombo/EndCombo API, and demonstration of various flags.\n");

            imgui.InputText("input text", this.str0);
            imgui.SameLine(); imgui.Tooltip("USER:\nHold SHIFT or use mouse to select text.\n" +
                    "CTRL+Left/Right to word jump.\n" +
                    "CTRL+A or double-click to select all.\n" +
                    "CTRL+X,CTRL+C,CTRL+V clipboard.\n" +
                    "CTRL+Z,CTRL+Y undo/redo.\n" +
                    "ESCAPE to revert.\n\nPROGRAMMER:\nYou can use the InputTextFlags.CallbackResize facility if you need to wire InputText() to a dynamic string type. See misc/cpp/imgui_stdlib.h for an example (this is not demonstrated in imgui_demo.cpp).");

            imgui.InputTextWithHint("input text (w/ hint)", "enter text here", this.str1);

            imgui.InputInt("input int", this.i0, 1, 100, 0,
                            (newval)=>this.i0=newval);
            imgui.SameLine(); imgui.Tooltip("You can apply arithmetic operators +,*,/ on numerical values.\n  e.g. [ 100 ], input '*2', result becomes [ 200 ]\nUse +- to subtract.\n");

            imgui.InputFloat("input float", this.f0, 0.01, 1.0, "%.3f", 0,
                             (newval) => this.f0 = newval);

            imgui.InputDouble("input double", this.d0, 0.01, 1.0, "%.8f", 0,
                             (newval) => this.d0 = newval);

            imgui.InputFloat("input scientific", this.f1, 0.0, 0.0, "%e", 0,
                             (newval) => this.f1 = newval);
            imgui.SameLine(); imgui.Tooltip("You can input value using the scientific notation,\n  e.g. \"1e+8\" becomes \"100000000\".\n");

            imgui.InputFloat3("input float3", this.vec4a);

            imgui.DragInt("drag int", this.i1, 1, 0, 0, "%d",
                            (newval) => this.i1 = newval);
            imgui.SameLine(); imgui.Tooltip("Click and drag to edit value.\nHold SHIFT/ALT for faster/slower edit.\nDouble-click or CTRL+click to input value.");

            imgui.DragInt("drag int 0..100", this.i2, 1, 0, 100, "%d%",
                            (newval) => this.i2 = newval);

            imgui.DragFloat("drag float", this.f2, 0.005, 0, 0, "%.3f", 1,
                            (newval) => this.f2 = newval);

            imgui.DragFloat("drag small float", this.f3, 0.0001, 0.0, 0.0,
                            "%.6f ns", 1,
                            (newval) => this.f3 = newval);

            imgui.SliderInt("slider int", this.i3, -1, 3, null,
                            (newval)=>this.i3=newval);

            imgui.SameLine(); imgui.Tooltip("CTRL+click to input value.");

            imgui.SliderFloat("slider float", this.f4, 0.0, 1.0, "ratio = %.3f", 1.0,
                                (newval)=>this.f4=newval);
            imgui.SliderFloat("slider float (curve)", this.f5, -10.0, 10.0, "%.4f", 2.0,
                                (newval)=>this.f5=newval);
            imgui.SliderAngle("slider angle", this.angle, -360, 360, "%d deg",
                                (newval)=>this.angle=newval);

            imgui.ColorEdit3("color 1", this.col1);
            imgui.SameLine(); imgui.Tooltip("Click on the colored square to open a color picker.\nClick and hold to use drag and drop.\nRight-click on the colored square to show options.\nCTRL+click on individual component to input value.\n");

            imgui.ColorEdit4("color 2", this.col2);

            // List box
            imgui.ListBox("listbox\n(single select)", this.listbox_item_current,
                          this.listbox_items, 4,
                          (newsel) => this.listbox_item_current = newsel);
            //static int listbox_item_current2 = 2;
            //imgui.SetNextItemWidth(-1);
            //imgui.ListBox("##listbox2", &listbox_item_current2, listbox_items, IM_ARRAYSIZE(listbox_items), 4);

            imgui.TreePop();
        } // end Basic

        // Testing ImGuiOnceUponAFrame helper.
        //static ImGuiOnceUponAFrame once;
        //for (int i = 0; i < 5; i++)
        //    if (once)
        //        imgui.Text("This will be displayed only once.");

        if (imgui.TreeNode("Trees"))
        {
            if (imgui.TreeNode("Basic trees"))
            {
                for (let i = 0; i < 5; i++)
                {
                    if (imgui.TreeNode("Child " + i))
                    {
                        imgui.Text("blah blah");
                        imgui.SameLine();
                        imgui.SmallButton("button");
                        imgui.TreePop();
                    }
                }
                imgui.TreePop();
            }

            if (imgui.TreeNode("Advanced, with Selectable nodes"))
            {
                imgui.Tooltip("This is a more typical looking tree with selectable nodes.\nClick to select, CTRL+Click to toggle, click on arrows or double-click to open.");
                if(imgui.Checkbox("Align label with current X position)",
                                this.align_label_with_current_x_position))
                    this.align_label_with_current_x_position = !this.align_label_with_current_x_position;
                imgui.Text("Hello!");
                if (this.align_label_with_current_x_position)
                    imgui.Unindent(imgui.GetTreeNodeToLabelSpacing());

                imgui.PushStyleVar("IndentSpacing", imgui.GetFontSize()*3); // Increase spacing to differentiate leaves from expanded contents.
                for (let i = 0; i < 6; i++)
                {
                    // Disable the default open on single-click behavior and pass
                    // in Selected flag according to our selection state.
                    let node_flags = TreeNodeFlags.OpenOnArrow | TreeNodeFlags.OpenOnDoubleClick;
                    if (this.selection_mask & (1 << i))
                        node_flags |= TreeNodeFlags.Selected;
                    if (i < 3)
                    {
                        // Items 0..2 are Tree Node
                        let node_open = imgui.TreeNodeEx("Selectable Node "+i, node_flags);
                        if (imgui.IsItemClicked())
                            this.node_clicked = i;
                        if (node_open)
                        {
                            imgui.Text("Blah blah\nBlah Blah");
                            imgui.TreePop();
                        }
                    }
                    else
                    {
                        // Items 3..5 are Tree Leaves
                        // The only reason we use TreeNode at all is to allow selection of the leaf.
                        // Otherwise we can use BulletText() or TreeAdvanceToLabelPos()+Text().
                        node_flags |= TreeNodeFlags.Leaf | TreeNodeFlags.NoTreePushOnOpen; // iTreeNodeFlags.Bullet
                        imgui.TreeNodeEx("Selectable Leaf " + i, node_flags);
                        if (imgui.IsItemClicked())
                            this.node_clicked = i;
                    }
                }
                if (this.node_clicked != -1)
                {
                    // Update selection state. Process outside of tree loop to avoid visual inconsistencies during the clicking-frame.
                    if (imgui.GetIO().KeyCtrl)
                        this.selection_mask ^= (1 << this.node_clicked);          // CTRL+click to toggle
                    else //if (!(selection_mask & (1 << node_clicked))) // Depending on selection behavior you want, this commented bit preserve selection when clicking on item that is part of the selection
                        this.selection_mask = (1 << this.node_clicked);           // Click to single-select
                }
                imgui.PopStyleVar();
                if (this.align_label_with_current_x_position)
                    imgui.Indent(imgui.GetTreeNodeToLabelSpacing());
                imgui.TreePop();
            }
            imgui.TreePop(); // Trees
        }

        if (imgui.TreeNode("Collapsing Headers"))
        {
            if(this.closable_group == undefined)
                this.closable_group = new ValRef(true);
            if(imgui.Checkbox("Show 2nd header", this.closable_group.get()))
                this.closable_group.toggle();
            if (imgui.CollapsingHeader("Header"))
            {
                imgui.Text("IsItemHovered: %s", imgui.IsItemHovered());
                for (let i = 0; i < 5; i++)
                    imgui.Text("Some content %d", i);
            }
            if (imgui.CollapsingHeaderO("Header with a close button", this.closable_group))
            {
                imgui.Text("IsItemHovered: %s", imgui.IsItemHovered());
                for (let i = 0; i < 5; i++)
                    imgui.Text("More content %d", i);
            }
            imgui.TreePop();
        }

        if (imgui.TreeNode("Bullets"))
        {
            imgui.BulletText("Bullet point 1");
            imgui.BulletText("Bullet point 2\nOn multiple lines");
            imgui.Bullet(); imgui.Text("Bullet point 3 (two calls)");
            imgui.Bullet(); imgui.SmallButton("Button");
            imgui.TreePop();
        }

        if (imgui.TreeNode("Text"))
        {
            if (imgui.TreeNode("Colored Text"))
            {
                // Using shortcut. You can use PushStyleColor()/PopStyleColor() for more flexibility.
                imgui.TextColored(Color.rgba(1.0,0.0,1.0,1.0), "Pink");
                imgui.TextColored(Color.rgba(1.0,1.0,0.0,1.0), "Yellow");
                imgui.TextDisabled("Disabled");
                imgui.SameLine(); imgui.Tooltip("The TextDisabled color is stored in ImGuiStyle.");
                imgui.TreePop();
            }

            if (imgui.TreeNode("Word Wrapping"))
            {
                // Using shortcut. You can use PushTextWrapPos()/PopTextWrapPos() for more flexibility.
                imgui.TextWrapped("This text should automatically wrap on the edge of the window. The current implementation for text wrapping follows simple rules suitable for English and possibly other languages.");
                imgui.Spacing();

                if(this.wrap_width == undefined)
                    this.wrap_width = 200.0;
                imgui.SliderFloat("Wrap width", this.wrap_width, -20, 600, "%d", 1,
                                (newval) => this.wrap_width = newval);

                imgui.Text("Test paragraph 1:");
                let pos = imgui.GetCursorScreenPos();
                imgui.GetWindowDrawList().AddRectFilled(
                                            new Vec2(pos.x + this.wrap_width, pos.y),
                                            new Vec2(pos.x + this.wrap_width + 10,
                                                    pos.y + imgui.GetTextLineHeight()),
                                            Color.rgba(1,0,1,1));
                imgui.PushTextWrapPos(imgui.GetCursorPos().x + this.wrap_width);
                imgui.Text("The lazy dog is a good dog. This paragraph is made to fit within %d pixels. Testing a 1 character word. The quick brown fox jumps over the lazy dog.",
                            this.wrap_width);
                imgui.GetWindowDrawList().AddRect(imgui.GetItemRectMin(),
                                                  imgui.GetItemRectMax(),
                                                  Color.rgba(1,1,0,1));
                imgui.PopTextWrapPos();

                imgui.Text("Test paragraph 2:");
                pos = imgui.GetCursorScreenPos();
                imgui.GetWindowDrawList().AddRectFilled(
                                            new Vec2(pos.x + this.wrap_width, pos.y),
                                            new Vec2(pos.x + this.wrap_width + 10, pos.y + imgui.GetTextLineHeight()),
                                            Color.rgba(1,0,1,1));
                imgui.PushTextWrapPos(imgui.GetCursorPos().x + this.wrap_width);
                imgui.Text("aaaaaaaa bbbbbbbb, c cccccccc,dddddddd. d eeeeeeee   ffffffff. gggggggg!hhhhhhhh");
                imgui.GetWindowDrawList().AddRect(imgui.GetItemRectMin(),
                                                  imgui.GetItemRectMax(),
                                                  Color.rgba(1,1,0,1));
                imgui.PopTextWrapPos();
                imgui.TreePop();
            }

            if (imgui.TreeNode("Unicode Text"))
            {
                // Unicode test with Japanese characters
                // (Needs a suitable font, try Noto, or Arial Unicode, or M+ fonts. Read misc/fonts/README.txt for details.)
                //  https://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
                // https://www.unicode.org/charts/PDF/U3040.pdf
                imgui.Tooltip("Japanese characters must be present in selected font");
                imgui.Text("Hiragana: " + String.fromCharCode.apply(null,
                        [0x304b, 0x304d, 0x304f, 0x3051, 0x3053]) + " (kakikukeko)");
                imgui.Text("Kanjis: " + String.fromCharCode.apply(null,
                        [0x4f0f, 0x50b0, 0x5300, 0x56e0]) + " (random)");

                // Note that characters values are preserved even by InputText() if the font cannot be displayed, so you can safely copy & paste garbled characters into another application.
                // imgui.InputText("UTF-8 input", buf, IM_ARRAYSIZE(buf));
                imgui.TreePop();
            }
            imgui.TreePop();
        }

        if (imgui.TreeNode("Images"))
        {
            let io = imgui.GetIO();
            let url = "/img/imgui-njs/logo.png";
            let imgSz = new Vec2(200, 100); // real image is larger, aspect ratio matches
            imgui.Text("Display Size: %d,%d", imgSz.x, imgSz.y);
            let pos = imgui.GetCursorScreenPos();
            imgui.Image(url, imgSz,
                        null, null, // subrect within larger one [0,1]
                        null,  // tint
                        Color.rgba(.3,.8,1.0,0.5) // border
                        );
            if (imgui.IsItemHovered())
            {
                imgui.BeginTooltip();
                let region_sz = 32.0;
                let region_x = io.MousePos.x - pos.x - region_sz * 0.5;
                region_x = Vec1.Clamp(region_x, 0, imgSz.x - region_sz);
                let region_y = io.MousePos.y - pos.y - region_sz * 0.5;
                region_y = Vec1.Clamp(region_y, 0, imgSz.y - region_sz);
                let zoom = 4.0;
                imgui.Text("Min: (%3d, %3d)", region_x, region_y);
                imgui.Text("Max: (%3d, %3d)", region_x + region_sz, region_y + region_sz);
                let uv0 = new Vec2(region_x/imgSz.x, region_y/imgSz.y);
                let uv1 = new Vec2((region_x + region_sz) / imgSz.x,
                                   (region_y + region_sz) / imgSz.y);
                imgui.Image(url,
                            new Vec2(region_sz * zoom, region_sz * zoom),
                            uv0, uv1,
                            null, Color.rgba(1.0, 1.0, 1.0, 0.5)
                            );
                imgui.EndTooltip();
            }

            imgui.TextWrapped("And now some textured buttons..");
            if(this.imgPressCount == undefined)
                this.imgPressCount = 0;
            let bsize = new Vec2(64,32);
            for (let i = 0; i < 8; i++)
            {
                imgui.PushID(i);
                let frame_padding = -1 + i;     // -1 = uses default padding
                if (imgui.ImageButton(url, bsize, null, null,
                                    frame_padding, Color.rgba(0.0,0.0,0.0,1.0)))
                    this.imgPressCount++;
                imgui.PopID();
                imgui.SameLine();
            }
            imgui.NewLine();
            imgui.Text("Pressed %d times.", this.imgPressCount);
            imgui.TreePop();
        }

        if (imgui.TreeNode("Combo"))
        {
            // Expose flags as checkbox for the demo
            if(this.comboflags == undefined)
                this.comboflags = 0;
            imgui.CheckboxFlags("ComboFlags.PopupAlignLeft",
                    this.comboflags, ComboFlags.PopupAlignLeft,
                    (newval)=>this.comboflags=newval);
            imgui.SameLine();
            imgui.Tooltip("Only makes a difference if the popup is larger than the combo");
            imgui.CheckboxFlags("ComboFlags.NoArrowButton",
                    this.comboflags, ComboFlags.NoArrowButton,
                    (newval) =>
                    {
                        // Clear the NoPreview flag, as we cannot combine both
                        this.comboflags = newval & ~ComboFlags.NoPreview;
                    });
            imgui.CheckboxFlags("ComboFlags.NoPreview",
                    this.comboflags, ComboFlags.NoPreview,
                    (newval) =>
                    {
                        // Clear the NoArrow flag, as we cannot combine both
                        this.comboflags = newval &= ~ComboFlags.NoArrowButton;
                    });

            // General BeginCombo() API, you have full control over your
            // selection data and display type. (your selection data could
            // be an index, a pointer to the object, an id for the object,
            // a flag stored in the object itself, etc.)

            // The second parameter is the label previewed before opening the combo.
            if(this.item_current_1 == undefined)
                this.item_current_1 = "";
            if (imgui.BeginCombo("combo 1", this.item_current_1, this.comboflags))
            {
                for (let n = 0; n < this.items.length; n++)
                {
                    let is_selected = (this.item_current_1 == this.items[n]);
                    if (imgui.Selectable(this.items[n], is_selected))
                        this.item_current_1 = this.items[n];
                    if (is_selected)
                        imgui.SetItemDefaultFocus();   // Set the initial focus when opening the combo (scrolling + for keyboard navigation support in the upcoming navigation branch)
                }
                imgui.EndCombo();
            }

            // Simplified one-liner Combo() API, using values packed in a
            // single constant string
            if(this.item_current_2 == undefined)
                this.item_current_2 = 0;
            imgui.Combo("combo 2 (one-liner)", this.item_current_2,
                ["aaaa", "bbbb", "cccc", "dddd", "eeee"], -1,
                (newval) => this.item_current_2 = newval);

            // Simplified one-liner Combo() using an array of const char*
            if(this.item_current_3 == undefined)
            {
                // If the selection isn't within 0..count, Combo won't display a preview
                this.item_current_3 = -1;
            }
            imgui.Combo("combo 3 (array)", this.item_current_3, this.items, -1,
                (newval) => this.item_current_3 = newval);

            // Simplified one-liner Combo() using an accessor function
            if(this.item_current_4 == undefined)
                this.item_current_4 = 0;
            let getter = function(i) { return this.items[i]; }.bind(this);
            imgui.ComboCB("combo 4 (function)", this.item_current_4, getter,
                        this.items.length, -1,
                        (newval) => this.item_current_4 = newval);
            imgui.TreePop();
        }

        if (imgui.TreeNode("Selectables"))
        {
            if(this.S_selection == undefined)
            {
                this.S_selection = [false, true, false, false, false];
                this.S_selected = -1;
                this.S_mselection = [false, false, false, false, false];
                this.S_selected2 = [ false, false, false ];
                this.S_selected3 = [];
                this.S_selected3.length = 16;
                this.S_selected3.fill(0);
                this.S_selected4 = [ true, false, false, false,
                                    false, true, false, false,
                                    false, false, true, false,
                                    false, false, false, true ];
                this.S_selected5 = [ true, false, true,
                                    false, true, false,
                                    true, false, true ];
            }
            if (imgui.TreeNode("Basic"))
            {
                if(imgui.Selectable("1. I am selectable", this.S_selection[0]))
                    this.S_selection[0] = !this.S_selection[0];
                if(imgui.Selectable("2. I am selectable", this.S_selection[1]))
                    this.S_selection[1] = !this.S_selection[1];
                imgui.Text("3. I am not selectable");
                if(imgui.Selectable("4. I am selectable", this.S_selection[3]))
                    this.S_selection[3] = !this.S_selection[3];
                if (imgui.Selectable("5. I am double clickable", this.S_selection[4],
                    SelectableFlags.AllowDoubleClick))
                {
                    if (imgui.IsMouseDoubleClicked(0))
                        this.S_selection[4] = !this.S_selection[4];
                }
                imgui.TreePop();
            }
            if (imgui.TreeNode("Selection State: Single Selection"))
            {
                for (let n = 0; n < 5; n++)
                {
                    if (imgui.Selectable("Object "+n, this.S_selected == n))
                        this.S_selected = n;
                }
                imgui.TreePop();
            }
            if (imgui.TreeNode("Selection State: Multiple Selection"))
            {
                imgui.Tooltip("Hold CTRL and click to select multiple items.");
                for (let n = 0; n < 5; n++)
                {
                    if (imgui.Selectable("Object "+n, this.S_mselection[n]))
                    {
                        // Clear selection when CTRL is not held
                        if (!imgui.GetIO().KeyCtrl)
                            this.S_mselection.fill(false);
                        this.S_mselection[n] ^= 1;
                    }
                }
                imgui.TreePop();
            }
            if (imgui.TreeNode("Rendering more text into the same line"))
            {
                if(imgui.Selectable("main.c", this.S_selected2[0]))
                    this.S_selected2[0] ^= 1;
                imgui.SameLine(300);
                imgui.Text(" 2,345 bytes");
                if(imgui.Selectable("Hello.cpp", this.S_selected2[1]))
                    this.S_selected2[1] ^= 1;
                imgui.SameLine(300);
                imgui.Text("12,345 bytes");
                if(imgui.Selectable("Hello.h", this.S_selected2[2]))
                    this.S_selected2[2] ^= 1;
                imgui.SameLine(300); imgui.Text(" 2,345 bytes");
                imgui.TreePop();
            }
            if (imgui.TreeNode("In columns"))
            {
                imgui.Columns(3, null, false);
                for (let i = 0; i < this.S_selected3.length; i++)
                {
                    if (imgui.Selectable("Item "+i, this.S_selected3[i]))
                    {
                        this.S_selected3[i] ^= 1;
                    }
                    imgui.NextColumn();
                }
                imgui.Columns(1);
                imgui.TreePop();
            }
            if (imgui.TreeNode("Grid"))
            {
                for (let i = 0; i < this.S_selected4.length; i++)
                {
                    imgui.PushID(i);
                    if (imgui.Selectable("Sailor", this.S_selected4[i], 0, new Vec2(50,50)))
                    {
                        let x = i % 4;
                        let y = i / 4;
                        if (x > 0)           { this.S_selected4[i - 1] ^= 1; }
                        if (x < 3 && i < 15) { this.S_selected4[i + 1] ^= 1; }
                        if (y > 0 && i > 3)  { this.S_selected4[i - 4] ^= 1; }
                        if (y < 3 && i < 12) { this.S_selected4[i + 4] ^= 1; }
                    }
                    if ((i % 4) < 3) imgui.SameLine();
                    imgui.PopID();
                }
                imgui.TreePop();
            }
            if (imgui.TreeNode("Alignment"))
            {
                let sz = new Vec2(80,80);
                imgui.Tooltip("Alignment applies when a selectable is larger than its text content.\nBy default, Selectables uses style.SelectableTextAlign but it can be overriden on a per-item basis using PushStyleVar().");
                for (let y = 0; y < 3; y++)
                {
                    for (let x = 0; x < 3; x++)
                    {
                        if (x > 0) imgui.SameLine();
                        let alignment = new Vec2(x/2.0, y/2.0);
                        let name = `(${alignment.x.toFixed(1)},${alignment.y.toFixed(1)})`;
                        imgui.PushStyleVar("SelectableTextAlign", alignment);
                        let j = 3*y + x;
                        if(imgui.Selectable(name, this.S_selected5[j],
                                    SelectableFlags.None, sz))
                        {
                            this.S_selected5[j] ^= 1;
                        }
                        imgui.PopStyleVar();
                    }
                }
                imgui.TreePop();
            }
            imgui.TreePop();
        }

        if (imgui.TreeNode("Text Input"))
        {
            if (imgui.TreeNode("Multi-line Text Input"))
            {
                // Note: we are using a fixed-sized buffer for simplicity here. See InputTextFlags.CallbackResize
                // and the code in misc/cpp/imgui_stdlib.h for how to setup InputText() for dynamically resizing strings.
                if(this.T_text == undefined)
                {
                    this.T_text = new MutableString(
                    "**\n"+
                    "The Pentium F00F bug, shorthand for F0 0F C7 C8,\n"+
                    "the hexadecimal encoding of one offending instruction,\n"+
                    "more formally, the invalid operand with locked CMPXCHG8B\n"+
                    "instruction bug, is a design flaw in the majority of\n"+
                    "Intel Pentium, Pentium MMX, and Pentium OverDrive\n"+
                    "processors (all in the P5 microarchitecture).\n"+
                    "**\n\n"+
                    "label:\n"+
                    "\tlock cmpxchg8b eax\n");
                    this.T_flags = InputTextFlags.AllowTabInput;
                }

                imgui.Tooltip("You can use the InputTextFlags.CallbackResize facility if you need to wire InputTextMultiline() to a dynamic string type. See misc/cpp/imgui_stdlib.h for an example. (This is not demonstrated in imgui_demo.cpp)");
                imgui.CheckboxFlags("InputTextFlags.ReadOnly",
                                this.T_flags, InputTextFlags.ReadOnly,
                                (newval) => this.T_flags = newval);
                imgui.CheckboxFlags("InputTextFlags.AllowTabInput",
                                this.T_flags, InputTextFlags.AllowTabInput,
                                (newval) => this.T_flags = newval);
                imgui.CheckboxFlags("InputTextFlags.CtrlEnterForNewLine",
                                this.T_flags, InputTextFlags.CtrlEnterForNewLine,
                                (newval) => this.T_flags = newval);
                imgui.InputTextMultiline("##source", this.T_text,
                                new Vec2(-1.0, imgui.GetTextLineHeight() * 16),
                                this.T_flags);
                imgui.TreePop();
            }

            if (imgui.TreeNode("Filtered Text Input"))
            {
                if(!this.FT_buf1)
                {
                    this.FT_buf1 = new MutableString("");
                    this.FT_buf2 = new MutableString("");
                    this.FT_buf3 = new MutableString("");
                    this.FT_buf4 = new MutableString("");
                    this.FT_buf5 = new MutableString("");
                    this.FT_buf6 = new MutableString("");
                    this.FT_customFilter = function(filterCtx)
                    {
                        return /[imgui]/.test(filterCtx.EventChar) ? 0 : 1;
                    };
                }
                imgui.InputText("default", this.FT_buf1);
                imgui.InputText("decimal", this.FT_buf2, InputTextFlags.CharsDecimal);
                imgui.InputText("hexadecimal", this.FT_buf3, InputTextFlags.CharsHexadecimal |
                                                             InputTextFlags.CharsUppercase);
                imgui.InputText("uppercase", this.FT_buf4, InputTextFlags.CharsUppercase);
                imgui.InputText("no blank", this.FT_buf5, InputTextFlags.CharsNoBlank);

                imgui.InputText("\"imgui\" letters", this.FT_buf6,
                                InputTextFlags.CallbackCharFilter,
                                this.FT_customFilter);

                /*
                imgui.Text("Password input");
                static char bufpass[64] = "password123";
                imgui.InputText("password", bufpass, 64, InputTextFlags.Password | InputTextFlags.CharsNoBlank);
                imgui.SameLine(); imgui.Tooltip("Display all characters as '*'.\nDisable clipboard cut and copy.\nDisable logging.\n");
                imgui.InputTextWithHint("password (w/ hint)", "<password>", bufpass, 64, InputTextFlags.Password | InputTextFlags.CharsNoBlank);
                imgui.InputText("password (clear)", bufpass, 64, InputTextFlags.CharsNoBlank);
                */
                imgui.TreePop();
            }

            if (imgui.TreeNode("Resize Callback"))
            {
                imgui.Text("resizable strings probably not useful in javascript?");
                // If you have a custom string type you would typically create a imgui.InputText() wrapper than takes your type as input.
                // See misc/cpp/imgui_stdlib.h and .cpp for an implementation of this using std::string.
                /*
                imgui.Tooltip("Demonstrate using InputTextFlags.CallbackResize to wire your resizable string type to InputText().\n\nSee misc/cpp/imgui_stdlib.h for an implementation of this for std::string.");
                struct Funcs
                {
                    static int MyResizeCallback(ImGuiInputTextCallbackData* data)
                    {
                        if (data->EventFlag == InputTextFlags.CallbackResize)
                        {
                            ImVector<char>* my_str = (ImVector<char>*)data->UserData;
                            IM_ASSERT(my_str->begin() == data->Buf);
                            my_str->resize(data->BufSize);  // NB: On resizing calls, generally data->BufSize == data->BufTextLen + 1
                            data->Buf = my_str->begin();
                        }
                        return 0;
                    }

                    // Tip: Because imgui. is a namespace you would typicall add your own function into the namespace in your own source files.
                    // For example, you may add a function called imgui.InputText(const char* label, MyString* my_str).
                    static bool MyInputTextMultiline(const char* label, ImVector<char>* my_str, const ImVec2& size = ImVec2(0, 0), ImGuiInputTextFlags flags = 0)
                    {
                        IM_ASSERT((flags & InputTextFlags.CallbackResize) == 0);
                        return imgui.InputTextMultiline(label, my_str->begin(), (size_t)my_str->size(), size, flags | InputTextFlags.CallbackResize, Funcs::MyResizeCallback, (void*)my_str);
                    }
                };

                // For this demo we are using ImVector as a string container.
                // Note that because we need to store a terminating zero character, our size/capacity are 1 more than usually reported by a typical string class.
                static ImVector<char> my_str;
                if (my_str.empty())
                    my_str.push_back(0);
                Funcs::MyInputTextMultiline("##MyStr", &my_str, ImVec2(-1.0, imgui.GetTextLineHeight() * 16));
                imgui.Text("Data: %p\nSize: %d\nCapacity: %d", (void*)my_str.begin(), my_str.size(), my_str.capacity());
                */
                imgui.TreePop();
            }
            imgui.TreePop(); // TextInput
        }

        if (imgui.TreeNode("Plots Widgets"))
        {
            if(imgui.Checkbox("Animate", this.plot_animate))
                this.plot_animate = !this.plot_animate;
            imgui.PlotLines("Frame Times", this.plot_arr);

            // Create a dummy array of contiguous float values to plot
            // Tip: If your float aren't contiguous but part of a structure,
            // you can pass a pointer to your first float and the sizeof() of
            // your structure in the Stride parameter.
            if(this.plot_values == undefined || this.plot_refresh_time < imgui.GetTime())
            {
                if(this.plot_values == undefined)
                {
                    this.plot_values = [];
                    this.plot_values.length = 90;
                    this.plot_values.fill(0);
                    this.plot_values_offset = 0;
                    this.plot_refresh_time = 0;
                    this.plot_phase = 0;
                }
                if (!this.plot_animate || this.plot_refresh_time == 0.0)
                    this.plot_refresh_time = imgui.GetTime();
                // Create dummy data at fixed 60 hz rate for the demo
                while (this.plot_refresh_time < imgui.GetTime())
                {
                    this.plot_values[this.plot_values_offset] = Math.cos(this.plot_phase);
                    this.plot_values_offset = (this.plot_values_offset+1) % this.plot_values.length;
                    this.plot_phase += 0.10*this.plot_values_offset;
                    this.plot_refresh_time += 1.0/60.0;
                }
            }
            let sz = new Vec2(0, 80);
            imgui.PlotLines("Lines", this.plot_values, this.plot_values_offset,
                            "avg 0.0", -1.0, 1.0, sz);
            imgui.PlotHistogram("Histogram", this.plot_arr, 0,
                            null, 0.0, 1.0, sz);
            // Use functions to generate output
            // FIXME: This is rather awkward because current plot API only
            // pass in indices. We probably want an API passing floats and
            // user provide sample rate/count.
            if(this.plot_func_type == undefined)
            {
                this.plot_func_type = 0;
                this.plot_display_count = 70;
                this.plot_funcs = [
                    function(i) { return Math.sin(i*.1); },
                    function(i) { return i&1 ? 1 : -1;},
                ];
            }
            imgui.Separator();
            imgui.SetNextItemWidth(100);
            imgui.Combo("func", this.plot_func_type, ["Sin", "Saw"], -1,
                        (newval) => this.plot_func_type = newval);
            imgui.SameLine();
            imgui.SliderInt("Sample count", this.plot_display_count, 1, 400,null,
                        (newval) => this.plot_display_count = newval);
            let func = this.plot_funcs[this.plot_func_type];
            imgui.PlotLinesCB("Lines", func, this.plot_display_count, 0,
                            null, -1.0, 1.0, sz);
            imgui.PlotHistogramCB("Histogram", func, this.plot_display_count, 0,
                            null, -1.0, 1.0, sz);
            imgui.Separator();

            // Animate a simple progress bar
            if(this.plot_progress == undefined)
            {
                this.plot_progress = 0.0;
                this.plot_progress_dir = 1.0;
            }
            if (this.plot_animate)
            {
                this.plot_progress += this.plot_progress_dir * 0.4 * imgui.GetIO().DeltaTime;
                if (this.plot_progress >= +1.1)
                {
                    this.plot_progress = +1.1;
                    this.plot_progress_dir *= -1.0;
                }
                if (this.plot_progress <= -0.1)
                {
                    this.plot_progress = -0.1;
                    this.plot_progress_dir *= -1.0;
                }
            }

            // Typically we would use Vec2(-1.0,0.0) to use all available width,
            // or Vec2(width,0.0) for a specified width. ImVec2(0.0,0.0) uses ItemWidth.
            imgui.ProgressBar(this.plot_progress, Vec2.Zero());
            imgui.SameLine(0.0, imgui.GetStyle().ItemInnerSpacing.x);
            imgui.Text("Progress Bar");

            let sat = Vec1.Saturate(this.plot_progress);
            let txt = `${Math.floor(1753*sat)}/1753`;
            imgui.ProgressBar(this.plot_progress, Vec2.Zero(), txt);
            imgui.TreePop();
        }

        if (imgui.TreeNode("Color/Picker Widgets"))
        {
            if(this.CP_color == undefined)
            {
                this.CP_color = Color.rgba(114.0/255.0, 144.0/255.0, 154.0/255.0, 200.0/255.0);
                this.CP_alpha_preview = true;
                this.CP_alpha_half_preview = false;
                this.CP_drag_and_drop = true;
                this.CP_options_menu = true;
                this.CP_hdr = false;
            }
            if(imgui.Checkbox("With Alpha Preview", this.CP_alpha_preview))
                this.CP_alpha_preview ^= 1;
            if(imgui.Checkbox("With Half Alpha Preview", this.CP_alpha_half_preview))
                this.CP_alpha_half_preview ^= 1;
            if(imgui.Checkbox("With Drag and Drop", this.CP_drag_and_drop))
                this.CP_drag_and_drop ^= 1;
            if(imgui.Checkbox("With Options Menu", this.CP_options_menu))
                this.CP_options_menu ^= 1;
            imgui.SameLine();
            imgui.Tooltip("Right-click on the individual color widget to show options.");
            if(imgui.Checkbox("With HDR", this.CP_hdr))
                this.CP_hdr ^= 1;
            imgui.SameLine();
            imgui.Tooltip("Currently all this does is to lift the 0..1 limits on dragging widgets.");

            let misc_flags = (this.CP_hdr ? ColorEditFlags.HDR : 0) |
                             (this.CP_drag_and_drop ? 0 : ColorEditFlags.NoDragDrop) |
                             (this.CP_alpha_half_preview ? ColorEditFlags.AlphaPreviewHalf :
                                (this.CP_alpha_preview ? ColorEditFlags.AlphaPreview : 0)) |
                             (this.CP_options_menu ? 0 : ColorEditFlags.NoOptions);

            imgui.Text("Color widget:");
            imgui.SameLine();
            imgui.Tooltip("Click on the colored square to open a color picker.\nCTRL+click on individual component to input value.\n");
            imgui.ColorEdit3("MyColor##1", this.CP_color, misc_flags);

            imgui.Text("Color widget HSV with Alpha:");
            imgui.ColorEdit4("MyColor##2", this.CP_color, ColorEditFlags.DisplayHSV | misc_flags);

            imgui.Text("Color widget with Float Display:");
            imgui.ColorEdit4("MyColor##2", this.CP_color, ColorEditFlags.Float | misc_flags);

            imgui.Text("Color button with Picker:");
            imgui.SameLine();
            imgui.Tooltip("With the ColorEditFlags.NoInputs flag you can hide all the slider/text inputs.\nWith the ColorEditFlags.NoLabel flag you can pass a non-empty label which will only be used for the tooltip and picker popup.");
            imgui.ColorEdit4("MyColor##3", this.CP_color,
                ColorEditFlags.NoInputs | ColorEditFlags.NoLabel | misc_flags);

            imgui.Text("Color button with Custom Picker Popup:");

            // Generate a dummy default palette. The palette will persist and can be edited.
            if(this.CP_saved_palette == undefined)
            {
                this.CP_saved_palette = [];
                this.CP_saved_palette.length = 32;
                for (let n = 0; n < this.CP_saved_palette.length; n++)
                {
                    this.CP_saved_palette[n] = Color.hsv(n/31, .8, .8);
                }
                this.CP_backup_color = Color.rgb(0,0,0);
            }
            let open_popup = imgui.ColorButton("MyColor##3b", this.CP_color, misc_flags);
            imgui.SameLine();
            open_popup |= imgui.Button("Palette");
            if (open_popup)
            {
                imgui.OpenPopup("mypicker");
                this.CP_backup_color.Copy(this.CP_color);
            }
            if (imgui.BeginPopup("mypicker"))
            {
                imgui.Text("MY CUSTOM COLOR PICKER WITH AN AMAZING PALETTE!");
                imgui.Separator();
                imgui.ColorPicker4("##picker", this.CP_color, misc_flags |
                        ColorEditFlags.NoSidePreview | ColorEditFlags.NoSmallPreview);
                imgui.SameLine();

                imgui.BeginGroup(); // Lock X position
                imgui.Text("Current");
                imgui.ColorButton("##current", this.CP_color,
                        ColorEditFlags.NoPicker | ColorEditFlags.AlphaPreviewHalf,
                        new Vec2(60,40));
                imgui.Text("Previous");
                if (imgui.ColorButton("##previous", this.CP_backup_color,
                        ColorEditFlags.NoPicker | ColorEditFlags.AlphaPreviewHalf,
                        new Vec2(60,40)))
                {
                    this.CP_color.Copy(this.CP_backup_color);
                }
                imgui.Separator();
                imgui.Text("Palette");
                for (let n = 0; n < this.CP_saved_palette.length; n++)
                {
                    imgui.PushID(n);
                    if ((n % 8) != 0)
                        imgui.SameLine(0.0, imgui.GetStyle().ItemSpacing.y);
                    if (imgui.ColorButton("##palette", this.CP_saved_palette[n],
                            ColorEditFlags.NoAlpha | ColorEditFlags.NoPicker | ColorEditFlags.NoTooltip,
                            new Vec2(20,20)))
                    {
                        let a = this.CP_color.a; // Preserve alpha
                        this.CP_color.Copy(this.CP_saved_palette[n]);
                        this.CP_color.a = a;
                    }

                    // Allow user to drop colors into each palette entry
                    // (Note that ColorButton is already a drag source by default,
                    // unless using ColorEditFlags.NoDragDrop)
                    if (imgui.BeginDragDropTarget())
                    {
                        console.log("begin dragdrop target");
                        /*
                        if (const ImGuiPayload* payload = imgui.AcceptDragDropPayload(IMGUI_PAYLOAD_TYPE_COLOR_3F))
                            memcpy((float*)&saved_palette[n], payload->Data, sizeof(float) * 3);
                        if (const ImGuiPayload* payload = imgui.AcceptDragDropPayload(IMGUI_PAYLOAD_TYPE_COLOR_4F))
                            memcpy((float*)&saved_palette[n], payload->Data, sizeof(float) * 4);
                        */
                        imgui.EndDragDropTarget();
                    }

                    imgui.PopID();
                }
                imgui.EndGroup();
                imgui.EndPopup();
            }

            imgui.Text("Color button only:");
            imgui.ColorButton("MyColor##3c", this.CP_color, misc_flags,
                              new Vec2(80,80));

            imgui.Text("Color picker:");
            if(this.CP_alpha == undefined)
            {
                this.CP_alpha = true;
                this.CP_alpha_bar = true;
                this.CP_side_preview = true;
                this.CP_ref_color = false;
                this.CP_ref_color_v = Color.rgba(1.0,0.0,1.0,0.5);
                this.CP_display_mode = 0;
                this.CP_picker_mode = 0;
            }
            if(imgui.Checkbox("With Alpha", this.CP_alpha))
                this.CP_alpha ^= 1;
            if(imgui.Checkbox("With Alpha Bar", this.CP_alpha_bar))
                this.CP_alpha_bar ^= 1;
            if(imgui.Checkbox("With Side Preview", this.CP_side_preview))
                this.CP_side_preview ^= 1;
            if (this.CP_side_preview)
            {
                imgui.SameLine();
                if(imgui.Checkbox("With Ref Color", this.CP_ref_color))
                    this.CP_ref_color ^= 1;
                if (this.CP_ref_color)
                {
                    imgui.SameLine();
                    imgui.ColorEdit4("##RefColor", this.CP_ref_color_v,
                            ColorEditFlags.NoInputs | misc_flags);
                }
            }
            imgui.Combo("Display Mode", this.CP_display_mode,
                    ["Auto/Current","None", "RGB Only", "HSV Only", "Hex Only"],
                    (newval=>this.CP_display_mode=newval));
            imgui.SameLine();
            imgui.Tooltip("ColorEdit defaults to displaying RGB inputs if you don't specify a display mode, but the user can change it with a right-click.\n\nColorPicker defaults to displaying RGB+HSV+Hex if you don't specify a display mode.\n\nYou can change the defaults using SetColorEditOptions().");
            imgui.Combo("Picker Mode", this.CP_picker_mode,
                    ["Auto/Current", "Hue bar + SV rect", "Hue wheel + SV triangle"],
                    (newval) => this.CP_picker_mode = newval);
            imgui.SameLine();
            imgui.Tooltip("User can right-click the picker to change mode.");
            let flags = misc_flags;
            // This is by default if you call ColorPicker3() instead of ColorPicker4()
            if (!this.CP_alpha)            flags |= ColorEditFlags.NoAlpha;
            if (this.CP_alpha_bar)         flags |= ColorEditFlags.AlphaBar;
            if (!this.CP_side_preview)     flags |= ColorEditFlags.NoSidePreview;
            if (this.CP_picker_mode == 1)  flags |= ColorEditFlags.PickerHueBar;
            if (this.CP_picker_mode == 2)  flags |= ColorEditFlags.PickerHueWheel;
            if (this.CP_display_mode == 1) flags |= ColorEditFlags.NoInputs;       // Disable all RGB/HSV/Hex displays
            if (this.CP_display_mode == 2) flags |= ColorEditFlags.DisplayRGB;     // Override display mode
            if (this.CP_display_mode == 3) flags |= ColorEditFlags.DisplayHSV;
            if (this.CP_display_mode == 4) flags |= ColorEditFlags.DisplayHex;
            imgui.ColorPicker4("MyColor##4", this.CP_color, flags,
                        this.CP_ref_color ? this.CP_ref_color_v : null);

            imgui.Text("Programmatically set defaults:");
            imgui.SameLine();
            imgui.Tooltip("SetColorEditOptions() is designed to allow you to set boot-time default.\nWe don't have Push/Pop functions because you can force options on a per-widget basis if needed, and the user can change non-forced ones with the options menu.\nWe don't have a getter to avoid encouraging you to persistently save values that aren't forward-compatible.");
            if (imgui.Button("Default: Uint8 + HSV + Hue Bar"))
                imgui.SetColorEditOptions(ColorEditFlags.Uint8 | ColorEditFlags.DisplayHSV | ColorEditFlags.PickerHueBar);
            if (imgui.Button("Default: Float + HDR + Hue Wheel"))
                imgui.SetColorEditOptions(ColorEditFlags.Float | ColorEditFlags.HDR | ColorEditFlags.PickerHueWheel);

            // HSV encoded support (to avoid RGB<>HSV round trips and singularities when S==0 or V==0)
            if(this.CP_color_stored_as_hsv == undefined)
            {
                this.CP_color_stored_as_hsv = Color.rgba(0.23, 1.0, 1.0, 1.0);
            }
            imgui.Spacing();
            imgui.Text("HSV encoded colors");
            imgui.SameLine();
            imgui.Tooltip("By default, colors are given to ColorEdit and ColorPicker in RGB, but ColorEditFlags.InputHSV allows you to store colors as HSV and pass them to ColorEdit and ColorPicker as HSV. This comes with the added benefit that you can manipulate hue values with the picker even when saturation or value are zero.");
            imgui.Text("Color widget with InputHSV:");
            imgui.ColorEdit4("HSV shown as HSV##1", this.CP_color_stored_as_hsv,
                ColorEditFlags.DisplayRGB | ColorEditFlags.InputHSV | ColorEditFlags.Float);
            imgui.ColorEdit4("HSV shown as RGB##1", this.CP_color_stored_as_hsv,
                ColorEditFlags.DisplayHSV | ColorEditFlags.InputHSV | ColorEditFlags.Float);
            imgui.DragFloat4("Raw HSV values", this.CP_color_stored_as_hsv, 0.01, 0.0, 1.0);
            imgui.TreePop();
        }

        if (imgui.TreeNode("Range Widgets"))
        {
            if(this.RW_begin == undefined)
            {
                this.RW_begin = 10;
                this.RW_end = 90;
                this.RW_begin_i = 100;
                this.RW_end_i = 1000;
            }
            imgui.DragFloatRange2("range", this.RW_begin, this.RW_end,
                            0.25, 0.0, 100.0, "Min: %.1f %", "Max: %.1f %", 1,
                            (min, max) => {this.RW_begin=min; this.RW_end=max;}
                            );
            imgui.DragIntRange2("range int (no bounds)",
                            this.RW_begin_i, this.RW_end_i, 5, 0, 0,
                            "Min: %d units", "Max: %d units",
                            (min, max) => {this.RW_begin_i=min; this.RW_end_i=max;}
                            );
            imgui.TreePop();
        }

        if (imgui.TreeNode("Data Types"))
        {
            imgui.Text("javascript only has one number type");
            imgui.TreePop();
        }

        if (imgui.TreeNode("Multi-component Widgets"))
        {
            if(this.MC_vec4 == undefined)
            {
                this.MC_vec4 = [ 0.10, 0.20, 0.30, 0.44 ];
                this.MC_vec4i = [ 1, 5, 100, 255 ];
            }
            imgui.Text("warning: more work needed here");
            imgui.InputFloat2("input float2", this.MC_vec4);
            imgui.DragFloat2("drag float2", this.MC_vec4, 0.01, 0.0, 1.0);
            imgui.SliderFloat2("slider float2", this.MC_vec4, 0.0, 1.0);
            imgui.InputInt2("input int2", this.MC_vec4i);
            imgui.DragInt2("drag int2", this.MC_vec4i, 1, 0, 255);
            imgui.SliderInt2("slider int2", this.MC_vec4i, 0, 255);
            imgui.Spacing();

            imgui.InputFloat3("input float3", this.MC_vec4);
            imgui.DragFloat3("drag float3", this.MC_vec4, 0.01, 0.0, 1.0);
            imgui.SliderFloat3("slider float3", this.MC_vec4, 0.0, 1.0);
            imgui.InputInt3("input int3", this.MC_vec4i);
            imgui.DragInt3("drag int3", this.MC_vec4i, 1, 0, 255);
            imgui.SliderInt3("slider int3", this.MC_vec4i, 0, 255);
            imgui.Spacing();

            imgui.InputFloat4("input float4", this.MC_vec4);
            imgui.DragFloat4("drag float4", this.MC_vec4, 0.01, 0.0, 1.0);
            imgui.SliderFloat4("slider float4", this.MC_vec4, 0.0, 1.0);
            imgui.InputInt4("input int4", this.MC_vec4i);
            imgui.DragInt4("drag int4", this.MC_vec4i, 1, 0, 255);
            imgui.SliderInt4("slider int4", this.MC_vec4i, 0, 255);
            imgui.TreePop();
        }

        if (imgui.TreeNode("Vertical Sliders"))
        {
            if(this.VS_spacing == undefined)
            {
                this.VS_spacing = 4;
                this.VS_int_value = 0;
                this.VS_values = [ 0.0, 0.60, 0.35, 0.9, 0.70, 0.20, 0.5 ];
                this.VS_values2 = [ 0.20, 0.80, 0.40, 0.25 ];
                this.VS_rows = 3;
            }
            imgui.PushStyleVar("ItemSpacing", new Vec2(this.VS_spacing, this.VS_spacing));

            imgui.VSliderInt("##int", new Vec2(18,160), this.VS_int_value, 0, 5,
                    null,  (newval) => this.VS_int_value = newval);
            imgui.SameLine();

            for (let i = 0; i < 7; i++)
            {
                if (i > 0) imgui.SameLine();
                imgui.PushID("set1" + i);
                imgui.PushStyleColor("FrameBg", Color.hsv(i/7.0, 0.5, 0.5));
                imgui.PushStyleColor("FrameBgHovered", Color.hsv(i/7.0, 0.6, 0.5));
                imgui.PushStyleColor("FrameBgActive", Color.hsv(i/7.0, 0.7, 0.5));
                imgui.PushStyleColor("SliderGrab", Color.hsv(i/7.0, 0.9, 0.9));
                imgui.VSliderFloat("##v", new Vec2(18,160), this.VS_values[i],
                            0.0, 1.0, "", 1,
                            (newval) => this.VS_values[i]=newval);
                if (imgui.IsItemActive() || imgui.IsItemHovered())
                    imgui.SetTooltip("%.3f", this.VS_values[i]);
                imgui.PopStyleColor(4);
                imgui.PopID();
            }

            imgui.SameLine();
            const small_slider_size = new Vec2(18,
                        (160.0-(this.VS_rows-1)*this.VS_spacing)/this.VS_rows);
            for (let nx = 0; nx < 4; nx++)
            {
                if (nx > 0) imgui.SameLine();
                imgui.BeginGroup();
                for (let ny = 0; ny < this.VS_rows; ny++)
                {
                    imgui.PushID("set2_" + nx*this.VS_rows+ny);
                    imgui.VSliderFloat("##v", small_slider_size, this.VS_values2[nx],
                                0.0, 1.0, "", 1,
                                (newval) => this.VS_values2[nx]=newval);
                    if (imgui.IsItemActive() || imgui.IsItemHovered())
                        imgui.SetTooltip("%.3f", this.VS_values2[nx]);
                    imgui.PopID();
                }
                imgui.EndGroup();
            }

            imgui.SameLine();
            for (let i = 0; i < 4; i++)
            {
                if (i > 0) imgui.SameLine();
                imgui.PushID("set3_"+i);
                imgui.PushStyleVar("GrabMinSize", 40);
                imgui.VSliderFloat("##v", new Vec2(40,160), this.VS_values[i],
                                    0.0, 1.0, "%.2f\nsec", 1,
                                    (newval) => this.VS_values[i] = newval);
                imgui.PopStyleVar();
                imgui.PopID();
            }
            imgui.PopStyleVar();
            imgui.TreePop();
        }

        if (imgui.TreeNode("Drag and Drop"))
        {
            if(this.DD_col1 == undefined)
            {
                this.DD_col1 = Color.rgb(1.0,0.0,0.2);
                this.DD_col2 = Color.rgba(0.4,0.7,0.0,0.5);
                this.DD_mode = "copy"; // or "move" or "swap"
                this.DD_names = ["Bobby", "Beatrice", "Betty", "Brianna",
                                "Barry", "Bernard", "Bibi", "Blaine", "Bryn"];
            }
            // ColorEdit widgets automatically act as drag source and drag target.
            // They are using standardized payload strings IMGUI_PAYLOAD_TYPE_COLOR_3F
            // and IMGUI_PAYLOAD_TYPE_COLOR_4F to allow your own widgets
            // to use colors in their drag and drop interaction. Also see
            // the demo in Color Picker -> Palette demo.
            imgui.BulletText("Drag and drop in standard widgets");
            imgui.Indent();
            imgui.ColorEdit3("color 1", this.DD_col1);
            imgui.ColorEdit4("color 2", this.DD_col2);
            imgui.Unindent();

            imgui.BulletText("Drag and drop to copy/swap items");
            imgui.Indent();
            if (imgui.RadioButton("Copy", this.DD_mode == "copy"))
            {
                this.DD_mode = "copy";
            }
            imgui.SameLine();
            if (imgui.RadioButton("Move", this.DD_mode == "move"))
            {
                this.DD_mode = "move";
            }
            imgui.SameLine();
            if (imgui.RadioButton("Swap", this.DD_mode == "swap"))
            {
                this.DD_mode = "swap";
            }
            for (let n = 0; n < this.DD_names.length; n++)
            {
                imgui.PushID(n);
                if ((n % 3) != 0)
                    imgui.SameLine();
                imgui.Button(this.DD_names[n], new Vec2(60,60));

                // Our buttons are both drag sources and drag targets here!
                if (imgui.BeginDragDropSource(DragDropFlags.None))
                {
                    // Set payload to carry the index of our item (could be anything)
                    imgui.SetDragDropPayload("DND_DEMO_CELL", n);
                    // Display preview (could be anything, e.g. when dragging
                    // an image we could decide to display the filename and a
                    // small preview of the image, etc.)
                    imgui.Text(`${this.DD_mode} ${this.DD_names[n]}`);
                    imgui.EndDragDropSource();
                }
                if (imgui.BeginDragDropTarget())
                {
                    let payload = imgui.AcceptDragDropPayload("DND_DEMO_CELL");
                    if (payload != null)
                    {
                        let payload_n = payload.Data;
                        switch(this.DD_mode)
                        {
                        case "copy":
                            this.DD_names[n] = this.DD_names[payload_n];
                            break;
                        case "move":
                            this.DD_names[n] = this.DD_names[payload_n];
                            this.DD_names[payload_n] = "";
                            break;
                        case "swap":
                            {
                                let tmp = this.DD_names[n];
                                this.DD_names[n] = this.DD_names[payload_n];
                                this.DD_names[payload_n] = tmp;
                            }
                            break;
                        }
                    }
                    imgui.EndDragDropTarget();
                }
                imgui.PopID();
            }
            imgui.Unindent();
            imgui.TreePop();
        }

        if (imgui.TreeNode("Querying Status (Active/Focused/Hovered etc.)"))
        {
            // Display the value of IsItemHovered() and other common item state functions. Note that the flags can be combined.
            // (because BulletText is an item itself and that would affect the output of IsItemHovered() we pass all state in a single call to simplify the code).
            if(this.Q_item_type == undefined)
            {
                this.Q_item_type = 1;
                this.Q_b = false;
                this.Q_col = Color.rgba(1,.2, .4, 1);
                this.Q_mstr = new MutableString();
                this.Q_sel = 0;
                this.Q_embed = false;
                this.Q_testwin = new ValRef(false);
            }
            if(imgui.RadioButton("Text ", this.Q_item_type==0))
                this.Q_item_type = 0;
            if(imgui.RadioButton("Button", this.Q_item_type==1))
                this.Q_item_type = 1;
            if(imgui.RadioButton("Checkbox", this.Q_item_type==2))
                this.Q_item_type = 2;
            if(imgui.RadioButton("SliderFloat", this.Q_item_type==3))
                this.Q_item_type = 3;
            if(imgui.RadioButton("InputText", this.Q_item_type==4))
                this.Q_item_type = 4;
            if(imgui.RadioButton("ColorEdit4", this.Q_item_type==5))
                this.Q_item_type = 5;
            if(imgui.RadioButton("MenuItem", this.Q_item_type==6))
                this.Q_item_type = 6;
            if(imgui.RadioButton("TreeNode (w/ double-click)", this.Q_item_type==7))
                this.Q_item_type = 7;
            if(imgui.RadioButton("ListBox", this.Q_item_type==8))
                this.Q_item_type = 8;
            imgui.Separator();
            let ret = false;
            switch(this.Q_item_type)
            {
            case 0: // Testing text items with no identifier/interaction
                imgui.Text("ITEM: Text");
                break;
            case 1:
                ret = imgui.Button("ITEM: Button");
                break;
            case 2:
                ret = imgui.Checkbox("ITEM: Checkbox", this.Q_b);
                break;
            case 3:
                ret = imgui.SliderFloat("ITEM: SliderFloat", this.Q_col.x,
                        0.0, 1.0, "%.3f", 1, (newval) => this.Q_col.x = newval);
                break;
            case 4:
                // Testing input text (which handles tabbing)
                ret = imgui.InputText("ITEM: InputText", this.Q_mstr);
                break;
            case 5:
                // Testing multi-component items (IsItemXXX flags are reported merged)
                ret = imgui.ColorEdit4("ITEM: ColorEdit4", this.Q_col);
                break;
            case 6:
                // Testing menu item (they use ButtonFlags.PressedOnRelease button policy)
                ret = imgui.MenuItem("ITEM: MenuItem");
                break;
            case 7:
                // Testing tree node with ButtonFlags.PressedOnDoubleClick button policy.
                ret = imgui.TreeNodeEx("ITEM: TreeNode w/ TreeNodeFlags.OpenOnDoubleClick",
                                     TreeNodeFlags.OpenOnDoubleClick |
                                     TreeNodeFlags.NoTreePushOnOpen);
                break;
            case 8:
                ret = imgui.ListBox("ITEM: ListBox", this.Q_sel,
                            [ "Apple", "Banana", "Cherry", "Kiwi"], -1,
                            (newval) => this.Q_sel = newval);
                break;
            }

            const ll = "Return value = %d\n" +
                "IsItemFocused() = %d\n" +
                "IsItemHovered() = %d\n" +
                "IsItemHovered(_AllowWhenBlockedByPopup) = %d\n" +
                "IsItemHovered(_AllowWhenBlockedByActiveItem) = %d\n" +
                "IsItemHovered(_AllowWhenOverlapped) = %d\n" +
                "IsItemHovered(_RectOnly) = %d\n" +
                "IsItemActive() = %d\n" +
                "IsItemEdited() = %d\n" +
                "IsItemActivated() = %d\n" +
                "IsItemDeactivated() = %d\n" +
                "IsItemDeactivatedAfterEdit() = %d\n" +
                "IsItemVisible() = %d\n" +
                "IsItemClicked() = %d\n" +
                "GetItemRectMin() = (%.1f, %.1f)\n" +
                "GetItemRectMax() = (%.1f, %.1f)\n" +
                "GetItemRectSize() = (%.1f, %.1f)";
            imgui.BulletText(ll, ret,
                imgui.IsItemFocused(),
                imgui.IsItemHovered(),
                imgui.IsItemHovered(HoveredFlags.AllowWhenBlockedByPopup),
                imgui.IsItemHovered(HoveredFlags.AllowWhenBlockedByActiveItem),
                imgui.IsItemHovered(HoveredFlags.AllowWhenOverlapped),
                imgui.IsItemHovered(HoveredFlags.RectOnly),
                imgui.IsItemActive(),
                imgui.IsItemEdited(),
                imgui.IsItemActivated(),
                imgui.IsItemDeactivated(),
                imgui.IsItemDeactivatedAfterEdit(),
                imgui.IsItemVisible(),
                imgui.IsItemClicked(),
                imgui.GetItemRectMin().x, imgui.GetItemRectMin().y,
                imgui.GetItemRectMax().x, imgui.GetItemRectMax().y,
                imgui.GetItemRectSize().x, imgui.GetItemRectSize().y
            );

            if(imgui.Checkbox("Embed everything inside a child window (for additional testing)", this.Q_embed))
                this.Q_embed = !this.Q_embed;
            if (this.Q_embed)
                imgui.BeginChild("outer_child", new Vec2(0, imgui.GetFontSize() * 20), true);

            // Testing IsWindowFocused() function with its various flags.
            // Note that the flags can be combined.
            imgui.BulletText(
                "IsWindowFocused() = %d\n"+
                "IsWindowFocused(ChildWindows) = %d\n"+
                "IsWindowFocused(ChildWindows|_RootWindow) = %d\n"+
                "IsWindowFocused(RootWindow) = %d\n"+
                "IsWindowFocused(AnyWindow) = %d\n",
                imgui.IsWindowFocused(),
                imgui.IsWindowFocused(FocusedFlags.ChildWindows),
                imgui.IsWindowFocused(FocusedFlags.ChildWindows | FocusedFlags.RootWindow),
                imgui.IsWindowFocused(FocusedFlags.RootWindow),
                imgui.IsWindowFocused(FocusedFlags.AnyWindow));

            // Testing IsWindowHovered() function with its various flags.
            // Note that the flags can be combined.
            imgui.BulletText(
                "IsWindowHovered() = %d\n"+
                "IsWindowHovered(AllowWhenBlockedByPopup) = %d\n"+
                "IsWindowHovered(AllowWhenBlockedByActiveItem) = %d\n"+
                "IsWindowHovered(ChildWindows) = %d\n"+
                "IsWindowHovered(ChildWindows|RootWindow) = %d\n"+
                "IsWindowHovered(ChildWindows|AllowWhenBlockedByPopup) = %d\n"+
                "IsWindowHovered(RootWindow) = %d\n"+
                "IsWindowHovered(AnyWindow) = %d\n",
                imgui.IsWindowHovered(),
                imgui.IsWindowHovered(HoveredFlags.AllowWhenBlockedByPopup),
                imgui.IsWindowHovered(HoveredFlags.AllowWhenBlockedByActiveItem),
                imgui.IsWindowHovered(HoveredFlags.ChildWindows),
                imgui.IsWindowHovered(HoveredFlags.ChildWindows | HoveredFlags.RootWindow),
                imgui.IsWindowHovered(HoveredFlags.ChildWindows | HoveredFlags.AllowWhenBlockedByPopup),
                imgui.IsWindowHovered(HoveredFlags.RootWindow),
                imgui.IsWindowHovered(HoveredFlags.AnyWindow));

            imgui.BeginChild("child", new Vec2(0, 50), true);
            imgui.Text("This is another child window for testing the ChildWindows flag.");
            imgui.EndChild();
            if (this.Q_embed)
                imgui.EndChild();

            // Calling IsItemHovered() after begin returns the hovered status of the title bar.
            // This is useful in particular if you want to create a context menu (with BeginPopupContextItem) associated to the title bar of a window.
            if(imgui.Checkbox("Hovered/Active tests after Begin() for title bar testing",
                            this.Q_testwin.get()))
                this.Q_testwin.toggle();
            if (this.Q_testwin.get())
            {
                imgui.Begin("Title bar Hovered/Active tests", this.Q_testwin);
                if (imgui.BeginPopupContextItem()) // <-- This is using IsItemHovered()
                {
                    if (imgui.MenuItem("Close"))
                        this.Q_testwin.set(false);
                    imgui.EndPopup();
                }
                imgui.Text(
                    "IsItemHovered() after begin = %d (== is title bar hovered)\n"+
                    "IsItemActive() after begin = %d (== is window being clicked/moved)\n",
                    imgui.IsItemHovered(), imgui.IsItemActive());
                imgui.End();
            }
            imgui.TreePop();
        }
    }
}
