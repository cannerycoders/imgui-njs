//-------------------------------------------------------------------------
// [SECTION] Data Type and Data Formatting Helpers [Internal]
//-------------------------------------------------------------------------
// - FormatValue(v, format, precision=0)
// - DataTypeFormatString()
// - DataTypeApplyOp()
// - DataTypeApplyOpFromText()
// - GetMinimumStepAtDecimalPrecision
// - RoundScalarWithFormat<>()
//-------------------------------------------------------------------------

let i = 0;
export var DataType =
{
    S8:i++,       // char
    U8:i++,       // unsigned char
    S16:i++,      // short
    U16:i++,      // unsigned short
    S32:i++,      // int
    U32:i++,      // unsigned int
    S64:i++,      // long long / __int64
    U64:i++,      // unsigned long long / unsigned __int64
    Float:i++,
    Double:i++,
    Count:i
};

// per-datatype: [size, fmt, [min, max]]
const GDataTypeInfo =
[
    [ 1, "%d", [-128, 127]],
    [ 1, "%u", [0, 255]],
    [ 2, "%d", [-32768, 32767]],
    [ 2, "%u", [0, 65535]],
    [ 4, "%d", [-2147483648, 2147483647]],
    [ 4, "%u", [0, 0xFFFFFFFF]],
    [ 8, "%lld", [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]],
    [ 8, "%llu", [0, 0xFFFFFFFFFFFFFFFF]],
    [ 4, "%f", [-Number.MAX_VALUE*.5, Number.Max_VALUE*.5]],
    [ 8, "%f",[-Number.MAX_VALUE*.5, Number.Max_VALUE*.5]],
];

const KnownFormats =/%d|%[0-9]d|%e|%[fg]|%.[0-9][fg]|%[0-9].[0-9][fg]|%s/g;
export function FormatValues(format, args)
{
    let i=0;
    return format.replace(KnownFormats, function(match, capture)
    {
        // match is the substring of format that matched,
        // capture is the string offset into format
        // console.log(`match:${match}, capture:${capture} i:${i}`);
        let arg = args[i++];
        switch(match)
        {
        case "%d":
            if(typeof(arg) == "boolean")
                return arg ? "1" : "0";
            else
            if(typeof(arg) == "number")
                return arg.toFixed();
            else
                return arg.toString();
        case "%f":
        case "%g":
            return arg.toString();
        case "%e":
            return arg.toExponential();
        case "%s":
            return arg;
        default:
            if(match[2] == "d") // %5d
            {
                let p = Number(match[1]);
                return ("     " + arg.toString()).slice(-p);
            }
            else
            if(match[1] == ".") // %.3f/g
            {
                let p = format[capture+2]; // expect 0-9 (char)
                return arg.toFixed(p);
            }
            else // %5.3f
            if(match[2] == ".")
            {
                let w = match[1]; // expect 0-9 (char)
                let p = match[3]; // expect 0-9 (char)
                if(w == 0) w = 10;
                return ("          " + arg.toFixed(p)).slice(-w);
            }
            else
                return match;
        }
    });
}

// TODO: a more javascripty formatting solution
export function FormatValue(v, format, precision=0)
{
    // fmt "R:%3d"
    let i = format.indexOf("%");
    let j, digits;
    if(i != -1)
    {
        for(j=0;j<format.length;j++)
        {
            let c = format[j];
            switch(c)
            {
            case "f": // %f, %0.3f, ..
                precision = Number(format[j-1]);
                break;
            case "d": // %d, %03d %3d
                {
                    digits = (j == (i+1)) ? 0 : Number(format[j-1]);
                    precision = 0;
                }
                break;
            case " ":
                break;
            }
        }
    }
    let vstr;
    if(typeof(v) != "number")
    {
        console.assert(0, typeof(v), v);
        vstr = v;
    }
    else
        vstr = v.toFixed(precision);
    if(digits)
        vstr = ("000" + vstr).slice(-digits);
    if(j)
        return format.slice(0, i) + vstr + format.slice(j+1);
    else
        return vstr;
}

export function DataTypeFormatString(val, data_type, format)
{
    if(format == null)
        format = GDataTypeInfo[data_type][1]; // default format
    return FormatValue(val, format);
}

function addClampOverflow(v1, v2, minmax)
{
    let x = Number(v1) + Number(v2);
    if(x < minmax[0]) return minmax[0];
    if(x > minmax[1]) return minmax[1];
    return x;
}

function subClampOverflow(v1, v2, minmax)
{
    let x = Number(v1) - Number(v2);
    if(x < minmax[0]) return minmax[0];
    if(x > minmax[1]) return minmax[1];
    return x;
}

// output is returned
export function DataTypeApplyOp(data_type, op, arg1, arg2)
{
    console.assert(op == "+" | op == "-");
    let minmax = GDataTypeInfo[data_type][2];
    if (op == "+")
        return addClampOverflow(arg1, arg2, minmax);
    else
        return subClampOverflow(arg1, arg2, minmax);
}

// User can input math operators (e.g. +100) to edit a numerical values.
// This is interpretted as an operator relative to the initial value.
export function DataTypeApplyOpFromText(buf, buforig, data_type, format, onChange=null)
{
    // warning eval isn't safe, but heck this is javascript running in
    // a browser
    let result;
    try
    {
        // option 1:
        // expression in buf could include val (val + Math.cos(2.1))
        // this would require that we disable character filtering.
        // option 2:
        //  assume that
        if("*/+".indexOf(buf[0]) != -1)
            result = eval(buforig+buf); // eg: "123"+"*2"
        else
            result = Number(buf);
        // XXX: should we apply format/clamping here?
        if(result != buforig)
        {
            if(onChange)
                onChange(result);
            return true;
        }
    }
    catch(err)
    {
        // this happens while the user is typing
        // console.error(err);
    }
    return false;  // no change
}

const MinStep = [1., 0.1, 0.01, 0.001, 0.0001, 0.00001,
                0.000001, 0.0000001, 0.00000001, 0.000000001 ];

export function GetMinStepAtFloatPrecision(precision)
{
    if (precision< 0)
        return Number.MIN_VALUE;
    return (precision)< MinStep.length ? MinStep[precision] :
                Math.pow(10, -precision);
}

export function RoundScalarToPrecision(val, precision)
{
    if(precision == 0)
        return Math.round(val);
    else
    {
        let scale = Math.pow(10, precision);
        let nv = Math.round(scale*val) / scale;
        return nv;
    }
}

export function ParseFormatPrecision(fmt)
{
    // XXX:
    if(fmt[0] != "%")
    {
        let i = fmt.indexOf("%");
        if(i != -1)
            fmt = fmt.slice(i);
    }
    switch(fmt)
    {
    case "%d":
    case "%.0f":
        return 0;
    case "%.1f":
        return 1;
    case "%.2f":
        return 2;
    case "%.3f":
    default:
        return 3;
    }
}