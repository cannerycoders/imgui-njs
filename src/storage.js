export class Storage
{
    constructor()
    {
        this.Clear();
    }

    Clear()
    {
        this.intMap = {};
        this.floatMap = {};
        this.boolMap = {};
        this.voidPtrMap = {};
    }

    GetInt(key, defaultVal=0)
    {
        let v = this.intMap[key];
        if(v === undefined)
            return defaultVal;
        else
            return v;
    }

    SetInt(key, val)
    {
        this.intMap[key] = val;
    }

    GetBool(key, defaultVal=false)
    {
        let v = this.boolMap[key];
        if(v === undefined)
            return defaultVal;
        else
            return v;
    }

    SetBool(key, val)
    {
        this.boolMap[key] = val;
    }

    GetFloat(key, defaultVal=0.)
    {
        let v = this.floatMap[key];
        if(v === undefined)
            return defaultVal;
        else
            return v;
    }

    SetFloat(key, val)
    {
        this.floatMap[key] = val;
    }

    GetVoidPtr(key)
    {
        let v = this.voidPtrMap[key];
        if(v === undefined)
            return null;
        else
            return v;
    }

    SetVoidPtr(key, val)
    {
        this.voidPtrMap[key] = val;
    }

    // - Get***Ref() functions finds pair, insert on demand if missing,
    // return pointer. Useful if you intend to do Get+Set.
    // - References are only valid until a new value is added to the storage.
    // Calling a Set***() function or a Get***Ref() function invalidates the pointer.
    // - A typical use case where this is convenient for quick hacking (e.g.
    // add storage during a live Edit&Continue session if you can't modify existing struct)
    //   float* pvar = ImGui::GetFloatRef(key);
    //   ImGui::SliderFloat("var", pvar, 0, 100.0f);
    //    some_var += *pvar;


}