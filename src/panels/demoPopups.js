import {ExampleFileMenu} from "./demoMenus.js";
import {ValRef, Vec2, MutableString} from "../types.js";
import {WindowFlags} from "../window.js";
import {Color} from "../color.js";

export class DemoPopups
{
    constructor(imgui)
    {
        this.imgui = imgui;
    }

    Show()
    {
        let imgui = this.imgui;
        if(!imgui.CollapsingHeader("Popups & Modal windows"))
            return;
        // The properties of popups windows are:
        // - They block normal mouse hovering detection outside them. (*)
        // - Unless modal, they can be closed by clicking anywhere outside them,
        //   or by pressing ESCAPE.
        // - Their visibility state (~bool) is held internally by imgui instead
        //   of being held by the programmer as we are used to with regular
        //   Begin() calls. User can manipulate the visibility state by calling
        //   OpenPopup().
        // (*) One can use IsItemHovered(HoveredFlags.AllowWhenBlockedByPopup)
        //   to bypass it and detect hovering even when normally blocked by a
        //   popup. Those three properties are connected. The library needs to
        //  hold their visibility state because it can close popups at any time.

        // Typical use for regular windows:
        //
        //   bool my_tool_is_active = false;
        //   if (imgui.Button("Open"))
        //      my_tool_is_active = true;
        //      [...]
        //      if (my_tool_is_active)
        //          Begin("My Tool", &my_tool_is_active)
        //              { [...] }
        //          End();
        //
        // Typical use for popups:
        //
        //   if (imgui.Button("Open"))
        //      imgui.OpenPopup("MyPopup");
        //   if (imgui.BeginPopup("MyPopup")
        //   {
        //      [...]
        //      EndPopup();
        //   }

        // With popups we have to go through a library call (here OpenPopup) to
        // manipulate the visibility state. This may be a bit confusing at first
        // but it should quickly make sense. Follow on the examples below.

        if(imgui.TreeNode("Popups"))
        {
            if(this._P == undefined)
            {
                this._P = {};
                this._P.selected_fish = -1;
                this._P.names = ["Bream", "Haddock", "Mackerel", "Pollock", "Tilefish" ];
                this._P.toggles = [ true, false, false, false, false ];
            }
            imgui.TextWrapped("When a popup is active, it inhibits interacting with windows that are behind the popup. Clicking outside the popup closes it.");

            // Simple selection popup
            // (If you want to show the current selection inside the Button
            // itself, you may want to build a string using the "###" operator
            // to preserve a constant ID with a variable label)
            if (imgui.Button("Select.."))
                imgui.OpenPopup("my_select_popup");
            imgui.SameLine();
            imgui.TextUnformatted(this._P.selected_fish == -1 ? "<None>" :
                                 this._P.names[this._P.selected_fish]);
            if (imgui.BeginPopup("my_select_popup"))
            {
                imgui.Text("Aquarium");
                imgui.Separator();
                for (let i = 0; i < this._P.names.length; i++)
                {
                    if (imgui.Selectable(this._P.names[i]))
                        this._P.selected_fish = i;
                }
                imgui.EndPopup();
            }

            // Showing a menu with toggles
            if (imgui.Button("Toggle.."))
                imgui.OpenPopup("my_toggle_popup");
            if (imgui.BeginPopup("my_toggle_popup"))
            {
                for (let i = 0; i < this._P.names.length; i++)
                {
                    if(imgui.MenuItem(this._P.names[i], "", this._P.toggles[i]))
                        this._P.toggles[i] = !this._P.toggles[i];
                }
                if (imgui.BeginMenu("Sub-menu"))
                {
                    imgui.MenuItem("Click me");
                    imgui.EndMenu();
                }

                imgui.Separator();
                imgui.Text("Tooltip here");
                if (imgui.IsItemHovered())
                    imgui.SetTooltip("I am a tooltip over a popup");

                if (imgui.Button("Stacked Popup"))
                    imgui.OpenPopup("another popup");
                if (imgui.BeginPopup("another popup"))
                {
                    for (let i = 0; i < this._P.names.length; i++)
                        imgui.MenuItem(this._P.names[i], "", this._P.toggles[i]);
                    if (imgui.BeginMenu("Sub-menu"))
                    {
                        imgui.MenuItem("Click me");
                        imgui.EndMenu();
                    }
                    imgui.EndPopup();
                }
                imgui.EndPopup();
            }

            // Call the more complete ExampleFileMenu which we use in
            // various places of this demo
            if (imgui.Button("File Menu.."))
                imgui.OpenPopup("my_file_popup");
            if (imgui.BeginPopup("my_file_popup"))
            {
                ExampleFileMenu(imgui);
                imgui.EndPopup();
            }

            imgui.TreePop();
        }
        if(imgui.TreeNode("Context Menus"))
        {
            // BeginPopupContextItem() is a helper to provide common/simple
            // popup behavior of essentially doing:
            //    if (IsItemHovered() && IsMouseReleased(0))
            //       OpenPopup(id);
            //    return BeginPopup(id);
            // For more advanced uses you may want to replicate and customize
            // this code. This the comments inside BeginPopupContextItem()
            // implementation.
            if(this._C == undefined)
            {
                this._C = {};
                this._C.value = .5;
                this._C.name = new MutableString("Label1");
            }
            imgui.Text("Value = %.3f (<-- right-click here)", this._C.value);
            if (imgui.BeginPopupContextItem("item context menu"))
            {
                if (imgui.Selectable("Set to zero"))
                    this._C.value = 0.;
                if (imgui.Selectable("Set to PI"))
                    this._C.value = 3.1415;
                imgui.SetNextItemWidth(-1);
                imgui.DragFloat("##Value", this._C.value, 0.1, 0.0, 0.0, null, 1,
                        (newval) => this.C_value = newval);
                imgui.EndPopup();
            }

            // We can also use OpenPopupOnItemClick() which is the same as
            // BeginPopupContextItem() but without the Begin call. So here we
            // will make it that clicking on the text field with the right
            // mouse button (1) will toggle the visibility of the popup above.
            imgui.Text("(You can also right-click me to open the same popup as above.)");
            imgui.OpenPopupOnItemClick("item context menu", 1);

            // When used after an item that has an ID (here the Button), we can skip providing an ID to BeginPopupContextItem().
            // BeginPopupContextItem() will use the last item ID as the popup ID.
            // In addition here, we want to include your editable label inside the button label. We use the ### operator to override the ID (read FAQ about ID for details)
            imgui.Button(this._C.name+"###Button");
            if (imgui.BeginPopupContextItem())
            {
                imgui.Text("Edit name:");
                imgui.InputText("##edit", this._C.name);
                if (imgui.Button("Close"))
                    imgui.CloseCurrentPopup();
                imgui.EndPopup();
            }
            imgui.SameLine(); imgui.Text("(<-- right-click here)");

            imgui.TreePop();
        }
        if(imgui.TreeNode("Modals"))
        {
            if(this._M == undefined)
            {
                this._M = {};
                this._M.dont_ask_me_next_time = new ValRef(false);
                this._M.item = 1;
                this._M.color = Color.rgba(0.4,0.7,0.0,0.5);
                this._M.dummy_open = new ValRef(true);
            }
            imgui.TextWrapped("Modal windows are like popups but the user cannot close them by clicking outside the window.");

            if (imgui.Button("Delete.."))
                imgui.OpenPopup("Delete?");

            if (imgui.BeginPopupModal("Delete?", null, WindowFlags.AlwaysAutoResize))
            {
                imgui.Text("All those beautiful files will be deleted.\nThis operation cannot be undone!\n\n");
                imgui.Separator();

                //static int dummy_i = 0;
                //imgui.Combo("Combo", &dummy_i, "Delete\0Delete harder\0");

                imgui.PushStyleVar("FramePadding", Vec2.Zero(false));
                imgui.Checkbox("Don't ask me next time", this._M.dont_ask_me_next_time);
                imgui.PopStyleVar();

                if (imgui.Button("OK", new Vec2(120, 0))) { imgui.CloseCurrentPopup(); }
                imgui.SetItemDefaultFocus();
                imgui.SameLine();
                if (imgui.Button("Cancel", new Vec2(120, 0))) { imgui.CloseCurrentPopup(); }
                imgui.EndPopup();
            }

            if (imgui.Button("Stacked modals.."))
                imgui.OpenPopup("Stacked 1");
            if (imgui.BeginPopupModal("Stacked 1", null, WindowFlags.MenuBar))
            {
                if (imgui.BeginMenuBar())
                {
                    if (imgui.BeginMenu("File"))
                    {
                        if (imgui.MenuItem("Dummy menu item")) {/*empty*/}
                        imgui.EndMenu();
                    }
                    imgui.EndMenuBar();
                }
                imgui.Text("Hello from Stacked The First\nUsing style.Colors.ModalWindowDimBg behind it.");

                // Testing behavior of widgets stacking their own regular popups over the modal.
                imgui.Combo("Combo", this._M.item,
                        ["aaaa", "bbbb", "cccc", "dddd", "eeee"],
                        (newval) => this._M.item = newval);
                imgui.ColorEdit4("color", this._M.color);

                if (imgui.Button("Add another modal.."))
                    imgui.OpenPopup("Stacked 2");

                // Also demonstrate passing a bool* to BeginPopupModal(), this will create a regular close button which will close the popup.
                // Note that the visibility state of popups is owned by imgui, so the input value of the bool actually doesn't matter here.
                if (imgui.BeginPopupModal("Stacked 2", this._M.dummy_open))
                {
                    imgui.Text("Hello from Stacked The Second!");
                    if (imgui.Button("Close"))
                        imgui.CloseCurrentPopup();
                    imgui.EndPopup();
                }

                if (imgui.Button("Close"))
                    imgui.CloseCurrentPopup();
                imgui.EndPopup();
            }
            imgui.TreePop();
        }
        if(imgui.TreeNode("Menus inside a regular window"))
        {
            imgui.TextWrapped("Below we are testing adding menu items to a regular window. It's rather unusual but should work!");
            imgui.Separator();
            // NB: As a quirk in this very specific example, we want to
            // differentiate the parent of this menu from the parent of the
            // various popup menus above. To do so we are encloding the items
            // in a PushID()/PopID() block to make them two different menusets.
            // If we don't, opening any popup above and hovering our menu here
            // would open it. This is because once a menu is active, we allow
            // to switch to a sibling menu by just hovering on it, which is the
            // desired behavior for regular menus.
            imgui.PushID("foo");
            imgui.MenuItem("Menu item", "CTRL+M");
            if (imgui.BeginMenu("Menu inside a regular window"))
            {
                ExampleFileMenu(imgui);
                imgui.EndMenu();
            }
            imgui.PopID();
            imgui.Separator();
            imgui.TreePop();
        }
    } // end Show
}