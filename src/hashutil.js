
// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
export function GetHash(val, seed=0)
{
    // NB: this isn't the same hash as ImGui which uses a crc32 lookup table
    // we'll see if this is sufficient.
    var hash = seed, i, chr;
    if(typeof(val) == "number")
    {
        if(seed)
            return hash + val;
        else
            val = "" + val;  // convert to string
    }

    if(typeof(val) == "string")
    {
        if (val.length === 0) return hash+23;
        let vals = val.split("##");
        val = vals[vals.length-1];
        for (i = 0; i < val.length; i++)
        {
            chr = val.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
        }
    }
    else
        console.assert(0, "unimplemented hash type:" + typeof(val));
    return hash;
}

export function HashData(data, seed)
{
    // NB: this isn't the same hash as ImGui which uses a crc32 lookup table
    // we'll see if this is sufficient.
    var hash = 0, i, d;
    if (data.length === 0) return hash;
    for (i = 0; i < data.length; i++)
    {
        d = data[i];
        hash = ((hash << 5) - hash) + d;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function IsPowerOfTwo(num)
{
    return num != 0 && (num & (num-1)) == 0;
}