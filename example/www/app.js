import ImguiApp from "/js/imgui-njs/app/app.js";
import ImguiDemo from "/js/imgui-njs/panels/demo.js";

export var AppName = "Imgui-njs Example App";
export var AppVersion = "1.0.0";

class Application extends ImguiApp
{
    constructor()
    {
        super(AppName, AppVersion);
        this.demo = null;
    }

    Begin(onReady)
    {
        super.Begin((err) =>
        {
            if(!err)
            {
                this.demo = new ImguiDemo(this.imgui);
            }
            if(onReady)
                onReady(err);
        });
    }

    OnFrame(imgui)
    {
        // there is where cycles are distributed to your widgets
        // ImguiApp owns log and demo windows.
        if(this.demo)
            this.demo.Show(imgui);
    }
}

export var App = new Application();
