// https://bit.ly/2KsZkSO

// some extensions to Array to facilitate imgui porting.
// we don't extend Array directly because it may muck with
// non-imgui packages array iteration.
export class ArrayEx
{
    constructor()
    {
        var aex = Object.create(Array.prototype);
        for(let i=0;i<arguments.length;i++)
            aex.push(arguments[i]);
        ArrayEx._extendArray(aex);
        return aex;
    }

    clear()
    {
        this.length = 0;
    }

    back()
    {
        return this[this.length-1];
    }

    push_back(v)
    {
        return this.push(v);
    }

    pop_back()
    {
        return this.pop();
    }

    push_front(v)
    {
        this.unshift(v);
        // return this.splice(0, 0, v);
    }

    resize(len)
    {
        return this.length = len;
    }

    empty()
    {
        return (this.length == 0);
    }

    clone()
    {
        return this.slice();
    }

    static _extendArray(aex)
    {
        let props = Object.getOwnPropertyNames(ArrayEx.prototype);
        for (var nm of props)
            aex[nm] = ArrayEx.prototype[nm];
        return aex;
    }
}
