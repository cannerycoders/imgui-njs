import {Rect, Vec2, ValRef} from "../types.js";
import {InputTextFlags} from "../widgets/inputtext.js";
import {TabBarFlags} from "../widgets/tab.js";
import {WindowFlags} from "../window.js";
import {Color, Colors} from "../color.js";
import {ExampleFileMenu} from "./demoMenus.js";

export class DemoLayout
{
    constructor(imgui)
    {
        this.imgui = imgui;
    }

    Show()
    {
        let imgui = this.imgui;
        if (!imgui.CollapsingHeader("Layout"))
            return;

        if (imgui.TreeNode("Child windows"))
        {
            imgui.Tooltip("Use child windows to begin into a self-contained independent scrolling/clipping regions within a host window.");
            if(this.CW_disable_mouse_wheel == undefined)
            {
                this.CW_disable_mouse_wheel = false;
                this.CW_disable_menu = false;
                this.CW_line = 50;
            }
            if(imgui.Checkbox("Disable Mouse Wheel", this.CW_disable_mouse_wheel))
                this.CW_disable_mouse_wheel ^= 1;
            if(imgui.Checkbox("Disable Menu", this.CW_disable_menu))
                this.CW_disable_menu ^= 1;

            let goto_line = imgui.Button("Goto");
            imgui.SameLine();
            imgui.SetNextItemWidth(100);
            goto_line |= imgui.InputInt("##Line", this.CW_line, 0, 0,
                                    InputTextFlags.EnterReturnsTrue,
                                    (newval)=>this.CW_line = newval);

            // Child 1: no border, enable horizontal scrollbar
            let window_flags = WindowFlags.HorizontalScrollbar |
                    (this.CW_disable_mouse_wheel ? WindowFlags.NoScrollWithMouse : 0);
            imgui.BeginChild("Child1", new Vec2(imgui.GetWindowContentRegionWidth() * 0.5, 260),
                            false, window_flags);
            for (let i=0; i < 100; i++)
            {
                imgui.Text("%4d: scrollable region", i);
                if (goto_line && this.CW_line == i)
                    imgui.SetScrollHereY();
            }
            if (goto_line && this.CW_line >= 100)
                imgui.SetScrollHereY();
            imgui.EndChild();

            imgui.SameLine();

            // Child 2: rounded border
            window_flags = (this.CW_disable_mouse_wheel ? WindowFlags.NoScrollWithMouse : 0) |
                            (this.CW_disable_menu ? 0 : WindowFlags.MenuBar);
            imgui.PushStyleVar("ChildRounding", 5);
            imgui.BeginChild("Child2", new Vec2(0, 260), true, window_flags);
            if (!this.CW_disable_menu && imgui.BeginMenuBar())
            {
                if (imgui.BeginMenu("Menu"))
                {
                    ExampleFileMenu(imgui);
                    imgui.EndMenu();
                }
                imgui.EndMenuBar();
            }
            imgui.Columns(2);
            for (let i = 0; i < 100; i++)
            {
                imgui.Button(("000"+i).slice(-3), new Vec2(-1., 0.));
                imgui.NextColumn();
            }
            imgui.EndChild();
            imgui.PopStyleVar();

            imgui.Separator();

            // Demonstrate a few extra things
            // - Changing ChildBg (which is transparent black in default styles)
            // - Using SetCursorPos() to position the child window (because
            //   the child window is an item from the POV of the parent window)
            //   You can also call SetNextWindowPos() to position the child
            //   window. The parent window will effectively layout from this
            //   position.
            // - Using imgui.GetItemRectMin/Max() to query the "item" state
            //   (because the child window is an item from the POV of the parent
            //   window) See "Widgets" -> "Querying Status (Active/Focused/Hovered
            //   etc.)" section for more details about this.
            imgui.SetCursorPosX(50);
            imgui.PushStyleColor("ChildBg", Color.rgbai(255, 0, 0, 100));
            imgui.BeginChild("blah", new Vec2(200, 100), true, WindowFlags.None);
            for (let n = 0; n < 50; n++)
                imgui.Text("Some test %d", n);
            imgui.EndChild();
            let child_rect_min = imgui.GetItemRectMin();
            let child_rect_max = imgui.GetItemRectMax();
            imgui.PopStyleColor();
            imgui.Text("Rect of child window is: (%d,%d) (%d,%d)",
                child_rect_min.x, child_rect_min.y,
                child_rect_max.x, child_rect_max.y);

            imgui.TreePop();
        }
        if (imgui.TreeNode("Widgets Width"))
        {
            // Use SetNextItemWidth() to set the width of a single upcoming item.
            // Use PushItemWidth()/PopItemWidth() to set the width of a group of items.
            if(this.WW_f == undefined)
                this.WW_f = 0;
            imgui.Text("SetNextItemWidth/PushItemWidth(100)");
            imgui.SameLine();
            imgui.Tooltip("Fixed width.");
            imgui.SetNextItemWidth(100);
            imgui.DragFloat("float##1",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);

            imgui.Text("SetNextItemWidth/PushItemWidth(GetWindowWidth() * 0.5f)");
            imgui.SameLine();
            imgui.Tooltip("Half of window width.");
            imgui.SetNextItemWidth(imgui.GetWindowWidth() * 0.5);
            imgui.DragFloat("float##2",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);

            imgui.Text("SetNextItemWidth/PushItemWidth(GetContentRegionAvailWidth() * 0.5f)");
            imgui.SameLine();
            imgui.Tooltip("Half of available width.\n(~ right-cursor_pos)\n(works within a column set)");
            imgui.SetNextItemWidth(imgui.GetContentRegionAvailWidth() * 0.5);
            imgui.DragFloat("float##3",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);

            imgui.Text("SetNextItemWidth/PushItemWidth(-100)");
            imgui.SameLine();
            imgui.Tooltip("Align to right edge minus 100");
            imgui.SetNextItemWidth(-100);
            imgui.DragFloat("float##4",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);

            // Demonstrate using PushItemWidth to surround three items.
            // Calling SetNextItemWidth() before each of them would have
            // the same effect.
            imgui.Text("SetNextItemWidth/PushItemWidth(-1)");
            imgui.SameLine();
            imgui.Tooltip("Align to right edge");
            imgui.PushItemWidth(-1);
            imgui.DragFloat("float##5a",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);
            imgui.DragFloat("float##5b",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);
            imgui.DragFloat("float##5c",
                this.WW_f, 1, 0, 0, null, 1, (newval) => this.WW_f = newval);
            imgui.PopItemWidth();

            imgui.TreePop();
        }

        if (imgui.TreeNode("Basic Horizontal Layout"))
        {
            imgui.TextWrapped("(Use imgui.SameLine() to keep adding items to the right of the preceding item)");

            // Text
            imgui.Text("Two items: Hello");
            imgui.SameLine();
            imgui.TextColored(Color.rgba(1,1,0,1), "Sailor");

            // Adjust spacing
            imgui.Text("More spacing: Hello");
            imgui.SameLine(0, 20);
            imgui.TextColored(Color.rgba(1,1,0,1), "Sailor");

            // Button
            imgui.AlignTextToFramePadding();
            imgui.Text("Normal buttons");
            imgui.SameLine();
            imgui.Button("Banana");
            imgui.SameLine();
            imgui.Button("Apple");
            imgui.SameLine();
            imgui.Button("Corniflower");

            // Button
            imgui.Text("Small buttons");
            imgui.SameLine();
            imgui.SmallButton("Like this one");
            imgui.SameLine();
            imgui.Text("can fit within a text block.");

            // Aligned to arbitrary position. Easy/cheap column.
            imgui.Text("Aligned");
            imgui.SameLine(150);
            imgui.Text("x=150");
            imgui.SameLine(300);
            imgui.Text("x=300");
            imgui.Text("Aligned");
            imgui.SameLine(150);
            imgui.SmallButton("x=150");
            imgui.SameLine(300);
            imgui.SmallButton("x=300");

            // Checkbox
            if(this.HL_c1 == undefined)
            {
                this.HL_c1 = false;
                this.HL_c2 = false;
                this.HL_c3 = false;
                this.HL_c4 = false;
            }
            if(imgui.Checkbox("My", this.HL_c1))
                this.HL_c1 ^= 1;
            imgui.SameLine();
            if(imgui.Checkbox("Tailor", this.HL_c2))
                this.HL_c2 ^= 1;
            imgui.SameLine();
            if(imgui.Checkbox("Is", this.HL_c3))
                this.HL_c3 ^= 1;
            imgui.SameLine();
            if(imgui.Checkbox("Rich", this.HL_c4))
                this.HL_c4 ^= 1;

            // Various
            if(this.HL_f0 == undefined)
            {
                this.HL_f0 = 1.;
                this.HL_f1 = 2;
                this.HL_f2 = 3.;
                this.HL_items = [ "AAAA", "BBBB", "CCCC", "DDDD" ];
                this.HL_item = -1;
                this.HL_selection = [0, 1, 2, 3];
            }
            imgui.PushItemWidth(80);
            imgui.Combo("Combo", this.HL_item, this.HL_items,
                        (newval) => this.HL_item = newval);
            imgui.SameLine();
            imgui.SliderFloat("X", this.HL_f0,
                        0.0, 5.0, null, 1, (newval) => this.HL_f0 = newval);
            imgui.SameLine();
            imgui.SliderFloat("Y", this.HL_f1,
                        0.0, 5.0, null, 1, (newval) => this.HL_f1 = newval);
            imgui.SameLine();
            imgui.SliderFloat("Z", this.HL_f2,
                        0.0, 5.0, null, 1, (newval) => this.HL_f2 = newval);
            imgui.PopItemWidth();

            imgui.PushItemWidth(80);
            imgui.Text("Lists:");
            for (let i = 0; i < 4; i++)
            {
                if (i > 0) imgui.SameLine();
                imgui.PushID(i);
                imgui.ListBox("", this.HL_selection[i], this.HL_items);
                imgui.PopID();
                //if (imgui.IsItemHovered())
                    //imgui.SetTooltip("ListBox %d hovered", i);
            }
            imgui.PopItemWidth();

            // Dummy
            let button_sz = new Vec2(40, 40);
            imgui.Button("A", button_sz);
            imgui.SameLine();
            imgui.Dummy(button_sz);
            imgui.SameLine();
            imgui.Button("B", button_sz);

            // Manually wrapping (we should eventually provide this as an automatic layout feature, but for now you can do it manually)
            imgui.Text("Manually wrapping:");
            let style = imgui.GetStyle();
            let buttons_count = 20;
            let window_visible_x2 = imgui.GetWindowPos().x +
                                    imgui.GetWindowContentRegionMax().x;
            for (let n = 0; n < buttons_count; n++)
            {
                imgui.PushID(n);
                imgui.Button("Box", button_sz);
                let last_button_x2 = imgui.GetItemRectMax().x;
                let next_button_x2 = last_button_x2 + style.ItemSpacing.x + button_sz.x; // Expected position if next button was on same line
                if (n + 1 < buttons_count && next_button_x2 < window_visible_x2)
                    imgui.SameLine();
                imgui.PopID();
            }

            imgui.TreePop();
        }

        if (imgui.TreeNode("Tabs"))
        {
            if (imgui.TreeNode("Basic"))
            {
                let tab_bar_flags = TabBarFlags.None;
                if (imgui.BeginTabBar("MyTabBar", tab_bar_flags))
                {
                    if (imgui.BeginTabItem("Avocado"))
                    {
                        imgui.Text("This is the Avocado tab!\nblah blah blah blah blah");
                        imgui.EndTabItem();
                    }
                    if (imgui.BeginTabItem("Broccoli"))
                    {
                        imgui.Text("This is the Broccoli tab!\nblah blah blah blah blah");
                        imgui.EndTabItem();
                    }
                    if (imgui.BeginTabItem("Cucumber"))
                    {
                        imgui.Text("This is the Cucumber tab!\nblah blah blah blah blah");
                        imgui.EndTabItem();
                    }
                    imgui.EndTabBar();
                }
                imgui.Separator();
                imgui.TreePop();
            }

            if (imgui.TreeNode("Advanced & Close Button"))
            {
                // Expose a couple of the available flags. In most cases you
                // may just call BeginTabBar() with no flags (0).
                if(this.T_tab_bar_flags == undefined)
                    this.T_tab_bar_flags = TabBarFlags.Reorderable;
                imgui.CheckboxFlags("TabBarFlags.Reorderable",
                        this.T_tab_bar_flags, TabBarFlags.Reorderable,
                        (newval)=>this.T_tab_bar_flags = newval);
                imgui.CheckboxFlags("TabBarFlags.AutoSelectNewTabs",
                        this.T_tab_bar_flags, TabBarFlags.AutoSelectNewTabs,
                        (newval)=>this.T_tab_bar_flags = newval);
                imgui.CheckboxFlags("TabBarFlags.TabListPopupButton",
                        this.T_tab_bar_flags, TabBarFlags.TabListPopupButton,
                        (newval)=>this.T_tab_bar_flags = newval);
                imgui.CheckboxFlags("TabBarFlags.NoCloseWithMiddleMouseButton",
                        this.T_tab_bar_flags, TabBarFlags.NoCloseWithMiddleMouseButton,
                        (newval)=>this.T_tab_bar_flags = newval);

                // make sure we have a fitting policy (Scroll vs Resize)
                if ((this.T_tab_bar_flags & TabBarFlags.FittingPolicyMask_) == 0)
                    this.T_tab_bar_flags |= TabBarFlags.FittingPolicyDefault_;

                if(imgui.CheckboxFlags("TabBarFlags.FittingPolicyResizeDown",
                    this.T_tab_bar_flags, TabBarFlags.FittingPolicyResizeDown,
                    (newval) => this.T_tab_bar_flags = newval))
                {
                    // make sure scroll is not enabled
                    this.T_tab_bar_flags &=
                        ~(TabBarFlags.FittingPolicyMask_ ^ TabBarFlags.FittingPolicyResizeDown);
                }
                if(imgui.CheckboxFlags("TabBarFlags.FittingPolicyScroll",
                    this.T_tab_bar_flags, TabBarFlags.FittingPolicyScroll,
                    (newval) => this.T_tab_bar_flags = newval))
                {
                    // make sure resize down is not enabled
                    this.T_tab_bar_flags &=
                        ~(TabBarFlags.FittingPolicyMask_ ^ TabBarFlags.FittingPolicyScroll);
                }

                // Tab Bar
                if(this.T_names == undefined)
                {
                    // Persistent user state
                    this.T_names = [ "Artichoke", "Beetroot", "Celery", "Daikon" ];
                    this.T_opened = [ new ValRef(true), new ValRef(true),
                                      new ValRef(true), new ValRef(true) ];
                }
                for (let n = 0; n < this.T_opened.length; n++)
                {
                    if (n > 0) { imgui.SameLine(); }
                    imgui.Checkbox(this.T_names[n], this.T_opened[n]);
                }

                // Passing a bool* to BeginTabItem() is similar to passing one
                // to Begin(): the underlying bool will be set to false when
                // the tab is closed.
                if (imgui.BeginTabBar("MyTabBar", this.T_tab_bar_flags))
                {
                    for (let n = 0; n < this.T_opened.length; n++)
                    {
                        if (this.T_opened[n].get() &&
                            imgui.BeginTabItem(this.T_names[n], this.T_opened[n]))
                        {
                            imgui.Text("This is the %s tab!", this.T_names[n]);
                            if (n & 1)
                                imgui.Text("I am an odd tab.");
                            imgui.EndTabItem();
                        }
                    }
                    imgui.EndTabBar();
                }
                imgui.Separator();
                imgui.TreePop();
            }
            imgui.TreePop();
        }

        if (imgui.TreeNode("Groups"))
        {
            imgui.Tooltip("Using imgui.BeginGroup()/EndGroup() to layout items. BeginGroup() basically locks the horizontal position. EndGroup() bundles the whole group so that you can use functions such as IsItemHovered() on it.");
            imgui.BeginGroup();
            {
                imgui.BeginGroup();
                imgui.Button("AAA");
                imgui.SameLine();
                imgui.Button("BBB");
                imgui.SameLine();
                imgui.BeginGroup();
                imgui.Button("CCC");
                imgui.Button("DDD");
                imgui.EndGroup();
                imgui.SameLine();
                imgui.Button("EEE");
                imgui.EndGroup();
                if (imgui.IsItemHovered())
                    imgui.SetTooltip("First group hovered");
            }
            // Capture the group size and create widgets using the same size
            if(this.G_values == undefined)
            {
                this.G_values = [ 0.5, 0.20, 0.80, 0.60, 0.25];
            }
            let size = imgui.GetItemRectSize();
            let bwidth = (size.x - imgui.GetStyle().ItemSpacing.x)*0.5;
            imgui.PlotHistogram("##values", this.G_values, 0, null, 0., 1., size);

            imgui.Button("ACTION", new Vec2(bwidth, size.y));
            imgui.SameLine();
            imgui.Button("REACTION", new Vec2(bwidth, size.y));
            imgui.EndGroup();
            imgui.SameLine();

            imgui.Button("LEVERAGE\nBUZZWORD", size);
            imgui.SameLine();

            if (imgui.ListBoxHeader("List", size))
            {
                imgui.Selectable("Selected", true);
                imgui.Selectable("Not Selected", false);
                imgui.ListBoxFooter();
            }

            imgui.TreePop();
        }

        if (imgui.TreeNode("Text Baseline Alignment"))
        {
            imgui.Tooltip("This is testing the vertical alignment that gets applied on text to keep it aligned with widgets. Lines only composed of text or \"small\" widgets fit in less vertical spaces than lines with normal widgets.");

            imgui.Text("One\nTwo\nThree"); imgui.SameLine();
            imgui.Text("Hello\nWorld"); imgui.SameLine();
            imgui.Text("Banana");

            imgui.Text("Banana"); imgui.SameLine();
            imgui.Text("Hello\nWorld"); imgui.SameLine();
            imgui.Text("One\nTwo\nThree");

            imgui.Button("HOP##1"); imgui.SameLine();
            imgui.Text("Banana"); imgui.SameLine();
            imgui.Text("Hello\nWorld"); imgui.SameLine();
            imgui.Text("Banana");

            imgui.Button("HOP##2"); imgui.SameLine();
            imgui.Text("Hello\nWorld"); imgui.SameLine();
            imgui.Text("Banana");

            imgui.Button("TEST##1"); imgui.SameLine();
            imgui.Text("TEST"); imgui.SameLine();
            imgui.SmallButton("TEST##2");

            imgui.AlignTextToFramePadding(); // If your line starts with text, call this to align it to upcoming widgets.
            imgui.Text("Text aligned to Widget"); imgui.SameLine();
            imgui.Button("Widget##1"); imgui.SameLine();
            imgui.Text("Widget"); imgui.SameLine();
            imgui.SmallButton("Widget##2"); imgui.SameLine();
            imgui.Button("Widget##3");

            // Tree
            const spacing = imgui.GetStyle().ItemInnerSpacing.x;
            imgui.Button("Button##1");
            imgui.SameLine(0, spacing);
            if (imgui.TreeNode("Node##1"))
            {
                // Dummy tree data
                for (let i = 0; i < 6; i++)
                    imgui.BulletText("Item %d..", i);
                imgui.TreePop();
            }

            imgui.AlignTextToFramePadding();
                // Vertically align text node a bit lower so it'll be
                // vertically centered with upcoming widget. Otherwise you
                // can use SmallButton (smaller fit).
            let node_open = imgui.TreeNode("Node##2");
                // Common mistake to avoid: if we want to SameLine after
                // TreeNode we need to do it before we add child content.
            imgui.SameLine(0, spacing);
            imgui.Button("Button##2");
            if (node_open)
            {
               // Dummy tree data
                for (let i = 0; i < 6; i++)
                    imgui.BulletText("Item %d..", i);
                imgui.TreePop();
            }

            // Bullet
            imgui.Button("Button##3");
            imgui.SameLine(0, spacing);
            imgui.BulletText("Bullet text");

            imgui.AlignTextToFramePadding();
            imgui.BulletText("Node");
            imgui.SameLine(0, spacing);
            imgui.Button("Button##4");

            imgui.TreePop();
        }

        if (imgui.TreeNode("Scrolling"))
        {
            imgui.Tooltip("Use SetScrollHereY() or SetScrollFromPosY() to scroll to a given position.");

            if(this.S_track == undefined)
            {
                this.S_track = true;
                this.S_track_line = 50;
                this.S_scroll_to_px = 200;
            }

            if(imgui.Checkbox("Track", this.S_track))
                this.S_track ^= 1;
            imgui.PushItemWidth(100);
            imgui.SameLine(130);
            this.S_track |= imgui.DragInt("##line", this.S_track_line, 0.25, 0, 99,
                                "Line = %d", (newval)=>this.S_track_line = newval);
            let scroll_to = imgui.Button("Scroll To Pos");
            imgui.SameLine(130);
            scroll_to |= imgui.DragInt("##pos_y", this.S_scroll_to_px, 1., 0, 9999,
                                "Y = %d px", (newval)=>this.S_scroll_to_px=newval);
            imgui.PopItemWidth();
            if (scroll_to)
                this.S_track = false;

            for (let i = 0; i < 5; i++)
            {
                if (i > 0)
                    imgui.SameLine();
                imgui.BeginGroup();
                imgui.Text("%s", ["Top", "25%", "Center", "75%", "Bottom"][i]);
                imgui.BeginChild(`chd${i}`,
                        new Vec2(imgui.GetWindowWidth() * 0.17, 200),
                        true);
                if (scroll_to)
                {
                    imgui.SetScrollFromPosY(
                            imgui.GetCursorStartPos().y + this.S_scroll_to_px,
                            i * 0.25);
                }
                for (let line = 0; line < 100; line++)
                {
                    if (this.S_track && line == this.S_track_line)
                    {
                        imgui.TextColored(Colors.yellow, "Line %d", line);
                        imgui.SetScrollHereY(i * 0.25);
                        // 0.0f:top, 0.5f:center, 1.0f:bottom
                    }
                    else
                    {
                        imgui.Text("Line %d", line);
                    }
                }
                let scroll_y = imgui.GetScrollY(), scroll_max_y = imgui.GetScrollMaxY();
                imgui.EndChild();
                imgui.Text("%d/%d", scroll_y, scroll_max_y);
                imgui.EndGroup();
            }
            imgui.TreePop();
        }

        if (imgui.TreeNode("Horizontal Scrolling"))
        {
            imgui.Tooltip("Horizontal scrolling for a window has to be enabled explicitly via the WindowFlags.HorizontalScrollbar flag.\n\nYou may want to explicitly specify content width by calling SetNextWindowContentWidth() before Begin().");
            if(this.H_lines == undefined)
                this.H_lines = 7;
            imgui.SliderInt("Lines", this.H_lines, 1, 15, null,
                            (newval)=>this.H_lines=newval);
            imgui.PushStyleVar("FrameRounding", 3);
            imgui.PushStyleVar("FramePadding", new Vec2(2, 1));
            imgui.BeginChild("scrolling",
                new Vec2(0, imgui.GetFrameHeightWithSpacing() * 7 + 30),
                true, WindowFlags.HorizontalScrollbar);
            for (let line = 0; line < this.H_lines; line++)
            {
                // Display random stuff (for the sake of this trivial demo we are using basic Button+SameLine. If you want to create your own time line for a real application you may be better off
                // manipulating the cursor position yourself, aka using SetCursorPos/SetCursorScreenPos to position the widgets yourself. You may also want to use the lower-level ImDrawList API)
                let num_buttons = 10 + ((line & 1) ? line * 9 : line * 3);
                for (let n = 0; n < num_buttons; n++)
                {
                    if (n > 0) imgui.SameLine();
                    imgui.PushID("b"+(n + line * 1000));
                    let label = (!(n%15)) ? "FizzBuzz" :
                                (!(n%3)) ? "Fizz" :
                                (!(n%5)) ? "Buzz" :
                                n.toString();
                    let hue = n*0.05;
                    imgui.PushStyleColor("Button", Color.hsv(hue, 0.6, 0.6));
                    imgui.PushStyleColor("ButtonHovered", Color.hsv(hue, 0.7, 0.7));
                    imgui.PushStyleColor("ButtonActive", Color.hsv(hue, 0.8, 0.8));
                    // each button has a different width
                    let w = 40 + 20*Math.sin(line + n);
                    imgui.Button(label, new Vec2(w, 0));
                    imgui.PopStyleColor(3);
                    imgui.PopID();
                }
            }
            let scroll_x = imgui.GetScrollX();
            let scroll_max_x = imgui.GetScrollMaxX();
            imgui.EndChild();
            imgui.PopStyleVar(2);
            let scroll_x_delta = 0.;
            imgui.SmallButton("<<");
            if (imgui.IsItemActive())
            {
                scroll_x_delta = -imgui.GetIO().DeltaTime * 1000;
            }
            imgui.SameLine();
            imgui.Text("Scroll from code");
            imgui.SameLine();
            imgui.SmallButton(">>");
            if (imgui.IsItemActive())
            {
                scroll_x_delta = +imgui.GetIO().DeltaTime * 1000;
            }
            imgui.SameLine();
            imgui.Text("%d/%d", scroll_x, scroll_max_x);
            if (scroll_x_delta != 0)
            {
                // Demonstrate a trick: you can use Begin to set yourself in
                // the context of another window (here we are already out of
                // your child window)
                imgui.BeginChild("scrolling");
                imgui.SetScrollX(imgui.GetScrollX() + scroll_x_delta);
                imgui.EndChild();
            }
            imgui.TreePop();
        }
        if (imgui.TreeNode("Clipping"))
        {
            let dl = imgui.GetWindowDrawList();
            let bg = Colors.gray;
            let fg = Colors.white;
            let txt = "Line 1 hello\nLine 2 clip me!";
            let fontScale = 2;
            let bigfont = imgui.GetFont(null, fontScale);
            if(this.C_size == null)
            {
                this.C_size = new Vec2(100, 100);
                this.C_offset = new Vec2(50, 20);
            }
            imgui.TextWrapped("On a per-widget basis we are occasionally clipping text CPU-side if it won't fit in its frame. Otherwise we are doing coarser clipping + passing a scissor rectangle to the renderer. The system is designed to try minimizing both execution and CPU/GPU rendering cost.");
            imgui.DragVec2("size", this.C_size, 0.5, 1., 200., "%d");
            imgui.TextWrapped("(Click and drag)");
            const pos = imgui.GetCursorScreenPos();
            let clip_rect = new Rect(pos.x, pos.y,
                                    pos.x + this.C_size.x,
                                    pos.y + this.C_size.y);
            imgui.InvisibleButton("##dummy", this.C_size);
            if (imgui.IsItemActive() && imgui.IsMouseDragging())
            {
                this.C_offset.x += imgui.GetIO().MouseDelta.x;
                this.C_offset.y += imgui.GetIO().MouseDelta.y;
            }
            dl.AddRectFilled(pos,
                            new Vec2(pos.x + this.C_size.x,
                                     pos.y + this.C_size.y),
                            bg);
            dl.AddText(txt, new Vec2(pos.x + this.C_offset.x,
                                    pos.y + this.C_offset.y),
                        bigfont, imgui.GetLineHeight()*fontScale,
                        fg, 0.0, clip_rect);
            imgui.TreePop();
        }
    } // end Show()
}
