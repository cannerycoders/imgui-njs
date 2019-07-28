
export function ExampleFileMenu(imgui)
{
    let done = false;
    imgui.MenuItem("(dummy menu)", null, false, false);
    if (imgui.MenuItem("New"))
    {
        // pass
    }
    if (imgui.MenuItem("Open", "Ctrl+O"))
    {
        // pass
    }
    if (imgui.BeginMenu("Open Recent"))
    {
        imgui.MenuItem("fish_hat.c");
        imgui.MenuItem("fish_hat.inl");
        imgui.MenuItem("fish_hat.h");
        if (imgui.BeginMenu("More.."))
        {
            imgui.MenuItem("Hello");
            imgui.MenuItem("Sailor");
            if (imgui.BeginMenu("Recurse.."))
            {
                ExampleFileMenu(imgui);
                imgui.EndMenu();
            }
            imgui.EndMenu();
        }
        imgui.EndMenu();
    }
    if (imgui.MenuItem("Save", "Ctrl+S"))
    {
        // pass
    }
    if (imgui.MenuItem("Save As.."))
    {
        // pass
    }
    imgui.Separator();
    if (imgui.BeginMenu("Disabled", false)) // Disabled
        console.assert(0);
    if (imgui.MenuItem("Checked", null, true))
    {
        // pass
    }
    if (imgui.MenuItem("Quit", "Alt+F4"))
    {
        done = true;
    }
    return done;
}