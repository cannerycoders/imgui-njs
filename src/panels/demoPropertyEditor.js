import {CondFlags} from "../flags.js";
import {TreeNodeFlags} from "../widgets/tree.js";
import {Vec2} from "../types.js";

// Demonstrate create a simple property editor.
let dummy_members = [0, 0, 1, 3.1416, 100, 999, 0, 0];
export function DemoPropertyEditor(imgui, p_open=null)
{
    imgui.SetNextWindowSize(new Vec2(430,450), CondFlags.FirstUseEver);
    if (!imgui.Begin("Example: Property editor", p_open))
    {
        imgui.End();
        return;
    }

    imgui.Tooltip("This example shows how you may implement a property editor "+
                "using two columns.\nAll objects/fields data are dummies here.\n"+
                "Remember that in many simple cases, you can use "+
                "imgui.SameLine(xxx) to position\nyour cursor horizontally "+
                "instead of using the Columns() API.");

    imgui.PushStyleVar("FramePadding", new Vec2(2,2));
    imgui.Columns(2);
    imgui.Separator();

    let ShowDummyObject = function(prefix, uid)
    {
        // Use object uid as identifier. Most commonly you could also use
        // the object pointer as a base ID.
        imgui.PushID(uid);

        // Text and Tree nodes are less high than regular widgets, here we
        // add vertical spacing to make the tree lines equal high.
        imgui.AlignTextToFramePadding();

        let node_open = imgui.TreeNode("Object", "%s_%u", prefix, uid);
        imgui.NextColumn();
        imgui.AlignTextToFramePadding();
        imgui.Text("my sailor is rich");
        imgui.NextColumn();
        if (node_open)
        {
            for (let i = 0; i < 8; i++)
            {
                imgui.PushID(i); // Use field index as identifier.
                if (i < 2)
                    ShowDummyObject("Child", 424242);
                else
                {
                    // Here we use a TreeNode to highlight on hover (we could
                    // use e.g. Selectable as well)
                    imgui.AlignTextToFramePadding();
                    imgui.TreeNodeEx("Field",
                                TreeNodeFlags.Leaf|
                                TreeNodeFlags.NoTreePushOnOpen|
                                TreeNodeFlags.Bullet,
                                "Field_%d", i);
                    imgui.NextColumn();
                    imgui.SetNextItemWidth(-1);
                    if (i >= 5)
                    {
                        imgui.InputFloat("##value", dummy_members[i], 1, 1, null, 0,
                             (newval) => dummy_members[i] = newval);
                    }
                    else
                    {
                        imgui.DragFloat("##value", dummy_members[i], .01, 0, 0, null, 1,
                                        (newval) => dummy_members[i] = newval);
                    }
                    imgui.NextColumn();
                }
                imgui.PopID();
            }
            imgui.TreePop();
        }
        imgui.PopID();
    };

    // Iterate dummy objects with dummy members (all the same data)
    for (let obj_i = 0; obj_i < 3; obj_i++)
        ShowDummyObject("Object", obj_i);

    imgui.Columns(1);
    imgui.Separator();
    imgui.PopStyleVar();
    imgui.End();
}