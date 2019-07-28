import {CondFlags} from "../flags.js";
import {WindowFlags} from "../window.js";
import {TabBarFlags} from "../widgets/tab.js";
import {Vec2} from "../types.js";

// Demonstrate create a window with multiple child windows.
let selected = 0;
export function DemoSimpleLayout(imgui, p_open)
{
    imgui.SetNextWindowSize(new Vec2(500, 440), CondFlags.FirstUseEver);
    if (imgui.Begin("Example: Simple layout", p_open, WindowFlags.MenuBar))
    {
        if (imgui.BeginMenuBar())
        {
            if (imgui.BeginMenu("File"))
            {
                if (imgui.MenuItem("Close"))
                    p_open.set(false);
                imgui.EndMenu();
            }
            imgui.EndMenuBar();
        }

        // left
        imgui.BeginChild("left pane", new Vec2(150, 0), true);
        for (let i = 0; i < 100; i++)
        {
            if (imgui.Selectable("MyObject " + i, selected == i))
                selected = i;
        }
        imgui.EndChild();
        imgui.SameLine();

        // right
        imgui.BeginGroup();
            // Leave room for 1 line below us
            imgui.BeginChild("item view", new Vec2(0,
                            -imgui.GetFrameHeightWithSpacing()));
                imgui.Text("MyObject: %d", selected);
                imgui.Separator();
                if (imgui.BeginTabBar("##Tabs", TabBarFlags.None))
                {
                    if (imgui.BeginTabItem("Description"))
                    {
                        imgui.TextWrapped("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ");
                        imgui.EndTabItem();
                    }
                    if (imgui.BeginTabItem("Details"))
                    {
                        imgui.Text("ID: 0123456789");
                        imgui.EndTabItem();
                    }
                    imgui.EndTabBar();
                }
            imgui.EndChild();
            if (imgui.Button("Revert"))
            {
                // pass
            }
            imgui.SameLine();
            if (imgui.Button("Save"))
            {
                // pass
            }
        imgui.EndGroup();
    }
    imgui.End();
}