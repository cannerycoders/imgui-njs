import {SettingsHandler} from "../settings.js";

export class Prefs extends SettingsHandler
{
    constructor(nmspace)
    {
        super();
        this.imgui = null;
        this.nmspace = nmspace;
        this.vals = {};
    }

    Begin(imgui)
    {
        this.imgui = imgui;
    }

    GetTypeName() { return "Prefs"; }

    Clear(val=null)
    {
        if(!val)
            this.vals = {};
        else
            delete this.vals[val];
    }

    Encapsulate() // @override 
    {
        return this.vals;
    }

    Instantiate(imgui, o) // @override of SettingsHandler
    {
        console.assert(this.imgui == imgui);
        this.vals = o;
    }

    SetValue(nm, value) // @override
    {
        if(!nm) 
        {
            console.assert(nm);
            return;
        }

        if(this.vals[nm] != value)
        {
            this.vals[nm] = value;
            if(this.imgui)
                this.imgui.MarkIniSettingsDirty();
        }
    }

    GetValue(nm, fallback) // @override
    {
        if(!nm) 
        {
            console.assert(nm);
            return fallback;
        }

        let ret = this.vals[nm]; // may be undefined
        if(ret === undefined)
            ret = fallback;
        return ret;
    }
}
