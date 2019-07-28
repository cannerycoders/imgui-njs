import {ExampleFileMenu} from "./demoMenus.js";
import {ValRef, Vec2, MutableString} from "../types.js";
import {WindowFlags} from "../window.js";
import {Color} from "../color.js";
import {ListClipper} from "../widgets/listbox.js";
import {SelectableFlags} from "../widgets/selectable.js";

export class DemoColumns
{
    constructor(imgui)
    {
        this.imgui = imgui;
        this.names = [ "One", "Two", "Three" ];
        this.paths = [ "/path/one", "/path/two", "/path/three" ];
        this.selected = -1;
        this.foo = -1;
        this.bar = 1;
        this.h_borders = true;
        this.v_borders = true;
    }

    Show()
    {
        let imgui = this.imgui;

        if (!imgui.CollapsingHeader("Columns"))
            return;

        imgui.PushID("Columns");

        // Basic columns
        if (imgui.TreeNode("Basic"))
        {
            imgui.Text("Without border:");
            imgui.Columns(3, "mycolumns3", false);  // 3-ways, no border
            imgui.Separator();
            for (let n = 0; n < 14; n++)
            {
                let label = "Item " + n;
                if (imgui.Selectable(label)) {/*empty*/}
                //if (imgui.Button(label, ImVec2(-1,0))) {}
                imgui.NextColumn();
            }
            imgui.Columns(1);
            imgui.Separator();

            imgui.Text("With border:");
            imgui.Columns(4, "mycolumns"); // 4-ways, with border
            imgui.Separator();
            imgui.Text("ID"); imgui.NextColumn();
            imgui.Text("Name"); imgui.NextColumn();
            imgui.Text("Path"); imgui.NextColumn();
            imgui.Text("Hovered"); imgui.NextColumn();
            imgui.Separator();
            for (let i = 0; i < 3; i++)
            {
                let label = "000" + i;
                if (imgui.Selectable(label, this.selected == i, SelectableFlags.SpanAllColumns))
                    this.selected = i;
                let hovered = imgui.IsItemHovered();
                imgui.NextColumn();
                imgui.Text(this.names[i]); imgui.NextColumn();
                imgui.Text(this.paths[i]); imgui.NextColumn();
                imgui.Text("%d", hovered); imgui.NextColumn();
            }
            imgui.Columns(1);
            imgui.Separator();
            imgui.TreePop();
        }

        // Create multiple items in a same cell before switching to next column
        if (imgui.TreeNode("Mixed items"))
        {
            imgui.Columns(3, "mixed");
            imgui.Separator();

            imgui.Text("Hello");
            imgui.Button("Banana");
            imgui.NextColumn();

            imgui.Text("ImGui");
            imgui.Button("Apple");
            imgui.InputFloat("red", this.foo, 0.05, 0, "%.3f", 1,
                            (newval) => this.foo = newval);
            imgui.Text("An extra line here.");
            imgui.NextColumn();

            imgui.Text("Sailor");
            imgui.Button("Corniflower");
            imgui.InputFloat("blue", this.bar, 0.05, 0, "%.3f", 1,
                            (newval) => this.bar = newval);
            imgui.NextColumn();

            if (imgui.CollapsingHeader("Category A"))
                imgui.Text("Blah blah blah");
            imgui.NextColumn();
            if (imgui.CollapsingHeader("Category B"))
                imgui.Text("Blah blah blah");
            imgui.NextColumn();
            if (imgui.CollapsingHeader("Category C"))
                imgui.Text("Blah blah blah");
            imgui.NextColumn();
            imgui.Columns(1);
            imgui.Separator();
            imgui.TreePop();
        }

        // Word wrapping
        if (imgui.TreeNode("Word-wrapping"))
        {
            imgui.Columns(2, "word-wrapping");
            imgui.Separator();
            imgui.TextWrapped("The quick brown fox jumps over the lazy dog.");
            imgui.TextWrapped("Hello Left");
            imgui.NextColumn();
            imgui.TextWrapped("The quick brown fox jumps over the lazy dog.");
            imgui.TextWrapped("Hello Right");
            imgui.Columns(1);
            imgui.Separator();
            imgui.TreePop();
        }

        if (imgui.TreeNode("Borders"))
        {
            // NB: Future columns API should allow automatic horizontal borders.
            if(imgui.Checkbox("horizontal", this.h_borders))
                this.h_borders = !this.h_borders;
            imgui.SameLine();
            if(imgui.Checkbox("vertical", this.v_borders))
                this.v_borders = !this.v_borders;
            imgui.Columns(4, null, this.v_borders);
            for (let i = 0; i < 4*3; i++)
            {
                if (this.h_borders && imgui.GetColumnIndex() == 0)
                    imgui.Separator();
                let t = String.fromCharCode("a".charCodeAt(0)+i);
                imgui.Text(t, t, t);
                imgui.Text("Width %.2f\nOffset %.2f",
                        imgui.GetColumnWidth(), imgui.GetColumnOffset());
                imgui.NextColumn();
            }
            imgui.Columns(1);
            if (this.h_borders)
                imgui.Separator();
            imgui.TreePop();
        }

        // Scrolling columns
        /*
        if (imgui.TreeNode("Vertical Scrolling"))
        {
            imgui.BeginChild("##header", ImVec2(0, imgui.GetTextLineHeightWithSpacing()+imgui.GetStyle().ItemSpacing.y));
            imgui.Columns(3);
            imgui.Text("ID"); imgui.NextColumn();
            imgui.Text("Name"); imgui.NextColumn();
            imgui.Text("Path"); imgui.NextColumn();
            imgui.Columns(1);
            imgui.Separator();
            imgui.EndChild();
            imgui.BeginChild("##scrollingregion", ImVec2(0, 60));
            imgui.Columns(3);
            for (int i = 0; i < 10; i++)
            {
                imgui.Text("%04d", i); imgui.NextColumn();
                imgui.Text("Foobar"); imgui.NextColumn();
                imgui.Text("/path/foobar/%04d/", i); imgui.NextColumn();
            }
            imgui.Columns(1);
            imgui.EndChild();
            imgui.TreePop();
        }
        */

        if (imgui.TreeNode("Horizontal Scrolling"))
        {
            imgui.SetNextWindowContentSize(new Vec2(1500, 0.));
            imgui.BeginChild("##ScrollingRegion", new Vec2(0, imgui.GetFontSize() * 20),
                        false, WindowFlags.HorizontalScrollbar);
            imgui.Columns(10);
            let ITEMS_COUNT = 2000;
            let clipper = new ListClipper(imgui, ITEMS_COUNT);
            // Also demonstrate using the clipper for large list
            while (clipper.Step())
            {
                for (let i = clipper.DisplayStart; i < clipper.DisplayEnd; i++)
                {
                    for (let j = 0; j < 10; j++)
                    {
                        imgui.Text("Line %d Column %d...", i, j);
                        imgui.NextColumn();
                    }
                }
            }
            imgui.Columns(1);
            imgui.EndChild();
            imgui.TreePop();
        }

        let node_open = imgui.TreeNode("Tree within single cell");
        imgui.SameLine();
        imgui.Tooltip("NB: Tree node must be poped before ending the cell. There's no storage of state per-cell.");
        if (node_open)
        {
            imgui.Columns(2, "tree items");
            imgui.Separator();
            if (imgui.TreeNode("Hello"))
            {
                imgui.BulletText("Sailor");
                imgui.TreePop();
            }
            imgui.NextColumn();
            if (imgui.TreeNode("Bonjour"))
            {
                imgui.BulletText("Marin");
                imgui.TreePop();
            }
            imgui.NextColumn();
            imgui.Columns(1);
            imgui.Separator();
            imgui.TreePop();
        }
        imgui.PopID();
    }
}