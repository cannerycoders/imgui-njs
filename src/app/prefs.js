import {SettingsHandler} from "../settings.js";

export class Prefs extends SettingsHandler
{
    constructor(nmspace)
    {
        super();

        this.nmspace = nmspace;
        this.vals = {};
    }

    GetTypeName() { return "Prefs"; }

    Clear(val=null)
    {
        if(!val)
            this.vals = {};
        else
            delete this.vals[val];
    }

    Encapsulate(imgui)
    {
        return this.vals;
    }

    Instantiate(imgui, o)
    {
        if(!this.imgui)
        {
            // console.debug("Prefs.Instantiate");
            this.imgui = imgui;
        }
        this.vals = o;
    }

    SetValue(nm, value)
    {
        if(this.vals[nm] != value)
        {
            this.vals[nm] = value;
            if(this.imgui)
                this.imgui.MarkIniSettingsDirty();
        }
    }

    GetValue(nm, fallback)
    {
        let ret = this.vals[nm]; // may be undefined
        if(ret === undefined)
            ret = fallback;
        return ret;
    }
}