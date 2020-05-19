
import {CondFlags, ItemFlags,
        NavDirSourceFlags, CornerFlags,
        } from "./flags.js";
import {NavLayer, LayoutType, Dir, MouseCursor,
        InputSource, InputReadMode} from "./enums.js";
import {Vec2, Rect, Vec1, ValRef} from "./types.js";
import {GetHash, HashData} from "./hashutil.js";
import {MenuColumns} from "./widgets/menu.js";
import {Storage} from "./storage.js";
import {DrawList} from "./drawlist.js";
import {ButtonFlags} from "./widgets/button.js";
import {ArrayEx} from "./arrayex.js";

export var WindowFlags =
{
    None: 0,
    NoTitleBar: 1 << 0,   // Disable title-bar
    NoResize: 1 << 1,   // Disable user resizing with the lower-right grip
    NoMove: 1 << 2,   // Disable user moving the window
    NoScrollbar: 1 << 3,   // Disable scrollbars (window can still scroll with mouse or programmatically)
    NoScrollWithMouse: 1 << 4,   // Disable user vertically scrolling with mouse wheel. On child window, mouse wheel will be forwarded to the parent unless NoScrollbar is also set.
    NoCollapse: 1 << 5,   // Disable user collapsing window by double-clicking on it
    AlwaysAutoResize: 1 << 6,   // Resize every window to its content every frame
    NoBackground: 1 << 7,   // Disable drawing background color (WindowBg, etc.) and outside border. Similar as using SetNextWindowBgAlpha(0.0f).
    NoSavedSettings: 1 << 8,   // Never load/save settings in .ini file
    NoMouseInputs: 1 << 9,   // Disable catching mouse, hovering test with pass through.
    MenuBar: 1 << 10,  // Has a menu-bar
    HorizontalScrollbar: 1 << 11,  // Allow horizontal scrollbar to appear (off by default). You may use SetNextWindowContentSize(ImVec2(width,0.0f)); prior to calling Begin() to specify width. Read code in imgui_demo in the "Horizontal Scrolling" section.
    NoFocusOnAppearing: 1 << 12,  // Disable taking focus when transitioning from hidden to visible state
    NoBringToFrontOnFocus: 1 << 13,  // Disable bringing window to front when taking focus (e.g. clicking on it or programmatically giving it focus)
    AlwaysVerticalScrollbar: 1 << 14,  // Always show vertical scrollbar (even if ContentSize.y < Size.y)
    AlwaysHorizontalScrollbar: 1<< 15,  // Always show horizontal scrollbar (even if ContentSize.x < Size.x)
    AlwaysUseWindowPadding: 1 << 16,  // Ensure child windows without border uses style.WindowPadding (ignored by default for non-bordered child windows, because more convenient)
    NoNavInputs: 1 << 18,  // No gamepad/keyboard navigation within the window
    NoNavFocus: 1 << 19,  // No focusing toward this window with gamepad/keyboard navigation (e.g. skipped by CTRL+TAB)
    UnsavedDocument: 1 << 20,  // Append '*' to title without affecting the ID, as a convenience to avoid using the ### operator. When used in a tab/docking context, tab is selected on closure and closure is deferred by one frame to allow code to cancel the closure (with a confirmation popup, etc.) without flicker.
    LockScrollingContentSize: 1 << 21, // disallow content-size adjustment while scrolling

    // [Internal]
    NavFlattened: 1 << 23,  // [BETA] Allow gamepad/keyboard navigation to cross over parent border to this child (only use on child that have no scrolling!)
    ChildWindow: 1 << 24,  // Don't use! For internal use by BeginChild()
    Tooltip: 1 << 25,  // Don't use! For internal use by BeginTooltip()
    Popup: 1 << 26,  // Don't use! For internal use by BeginPopup()
    Modal: 1 << 27,  // Don't use! For internal use by BeginPopupModal()
    ChildMenu: 1 << 28   // Don't use! For internal use by BeginMenu()
};

// composite window flags
let f = WindowFlags;
f.NoNav = f.NoNavInputs | f.NoNavFocus;
f.NoDecoration = f.NoTitleBar | f.NoResize | f.NoScrollbar | f.NoCollapse;
f.NoInputs = f.NoMouseInputs | f.NoNavInputs | f.NoNavFocus;

// Window resizing from edges (when io.ConfigWindowsResizeFromEdges = true
// and ImGuiBackendFlags_HasMouseCursors is set in io.BackendFlags by back-end)

// Extend outside and inside windows. Affect FindHoveredWindow().
const WindowResizeFromEdge = 4; // was WindowResizeFromEdge
// Reduce visual noise by only highlighting the border after a certain time.
const WindowResizeFromEdgeTimer = .04; // was WindowResizeFromEdgeTimer

class ResizeGripDef
{
    constructor(corner, innerDir, min12, max12)
    {
        this.CornerPosN = corner;
        this.InnerDir = innerDir;
        this.AngleMin12 = min12;
        this.AngleMax12 = max12;
    }
}

export const ResizeGripDefs =
[
    new ResizeGripDef( // Lower right
        new Vec2(1,1), new Vec2(-1,-1), 0, 3,
    ),
    new ResizeGripDef( // Lower left
        new Vec2(0,1), new Vec2(+1,-1), 3, 6,
    ),
    new ResizeGripDef( // Upper left
        new Vec2(0,0), new Vec2(+1,+1), 6, 9,
    ),
    new ResizeGripDef( // Upper right
        new Vec2(1,0), new Vec2(-1,+1), 9,12,
    )
];

class ResizeBorderDef
{
    constructor(innerDir, n1, n2, ang)
    {
        this.InnerDir = innerDir;   // Vec2
        this.CornerPosN1 = n1;      // Vec2
        this.CornerPosN2 = n2;      // Vec2
        this.OuterAngle = ang;
    }
}

const s_resizeBorderDefs = [
    // Top
    new ResizeBorderDef(new Vec2(0,+1), new Vec2(0,0), new Vec2(1,0), Math.PI*1.5),
    // Right
    new ResizeBorderDef(new Vec2(-1,0), new Vec2(1,0), new Vec2(1,1), 0 ),
    // Bottom
    new ResizeBorderDef(new Vec2(0,-1), new Vec2(1,1), new Vec2(0,1), Math.PI*0.5),
    // Left
    new ResizeBorderDef(new Vec2(+1,0), new Vec2(0,1), new Vec2(0,0), Math.PI),
];

/*----------------------------------------------------------------------------*/
export class Window
{
    constructor(name, imgui)
    {
        this.imgui = imgui;
        this.Name = name;
        this.ID = GetHash(name, 0);
        this.IDStack = new ArrayEx(this.ID); // must precede GetID calls
        this.Flags = WindowFlags.None;
        this.Pos = new Vec2(0., 0.);
        this.Size = new Vec2(0, 0);
        this.SizeFull = new Vec2(0, 0);
        this.SizeFullAtLastBegin = new Vec2(0, 0);
        this.SizeContents = new Vec2(0, 0);
        this.SizeContentsExplicit = new Vec2(0,0);
        this.WindowPadding = new Vec2(0,0);
        this.WindowRounding = 0;
        this.WindowBorderSize = 0.;
        this.NameBufLen = name.length + 1; // vestigial
        this.MoveId = this.GetID("#MOVE");
        this.ChildId = 0;
        this.Scroll = new Vec2(0, 0);
        this.ScrollTarget = Vec2.MAX_VALUE();
        this.ScrollTargetCenterRatio = new Vec2(0.5, 0.5);
        this.ScrollbarSizes = new Vec2(0., 0.);
        this.ScrollbarX = false;
        this.ScrollbarY = false;
        this.Active = false;
        this.WasActive = false;
        this.WriteAccessed = false;
        this.Collapsed = false;
        this.WantCollapseToggle = false;
        this.SkipItems = false;
        this.Appearing = false;
        this.Hidden = false;
        this.HasCloseButton = false; // controlled by optional p_open, in winmgr
        this.ResizeBorderHeld = -1;
        this.BeginCount = 0;
        this.BeginOrderWithinParent = -1;
        this.BeginOrderWithinContext = -1;
        this.PopupId = 0;
        this.AutoFitFramesX = -1;
        this.AutoFitFramesY = -1;
        this.AutoFitOnlyGrows = false;
        this.AutoFitChildAxises = 0x00;
        this.AutoPosLastDirection = Dir.None;
        this.HiddenFramesCanSkipItems = 0;
        this.HiddenFramesCannotSkipItems = 0;
        this.SetWindowPosAllowFlags =
        this.SetWindowSizeAllowFlags =
        this.SetWindowCollapsedAllowFlags = CondFlags.Always | CondFlags.Once |
                                CondFlags.FirstUseEver | CondFlags.Appearing;
        this.SetWindowPosVal = Vec2.MAX_VALUE();
        this.SetWindowPosPivot = Vec2.MAX_VALUE();

        this.DC = new WindowTempData();
        // IDStack initialized above
        this.ClipRect = new Rect();
        this.OuterRectClipped = new Rect();
        this.InnerMainRect = new Rect();
        this.InnerClipRect = new Rect();
        this.ContentsRegionRect = new Rect();
        this.LastFrameActive = -1;
        this.ItemWidthDefault = 0.;
        this.MenuColumns = new MenuColumns();
        this.StateStorage = new Storage();
        this.ColumnsStorage =  new ArrayEx();
        this.FontWindowScale = 1.;
        this.SettingsIdx = -1;

        this.DrawList = new DrawList(imgui, this.Name);
        // no DrawListInst
        this.ParentWindow = null;
        this.RootWindow = null;
        this.RootWindowForTitleBarHighlight = null;
        this.RootWindowForNav = null;

        this.NavLastChildNavWindow = null;
        this.NavLastIds = new ArrayEx();
        this.NavLastIds[0] = this.NavLastIds[1] = 0;
        this.NavRectRel = new ArrayEx();
        this.NavRectRel[0] = new Rect();
        this.NavRectRel[1] = new Rect();

        this.ZIndex = 0;
    }

    destructor() // not called, here for ref
    {
        for (let i = 0; i != this.ColumnsStorage.length; i++)
            this.ColumnsStorage[i] = null;
        this.ColumnsStorage.resize(0);
    }

    PushID(id)
    {
        this.IDStack.push(this.GetIDNoKeepAlive(id));
    }

    PopID()
    {
        this.IDStack.pop();
    }

    GetID(str)
    {
        const seed = this.IDStack.back();
        const id = GetHash(str, seed);
        this.imgui.keepAliveID(id);
        return id;
    }

    GetIDNoKeepAlive(str)
    {
        const seed = this.IDStack.back();
        return GetHash(str, seed);
    }

    GetIDFromRectangle(r_abs)
    {
        const seed = this.IDStack.back();
        const r_rel = [ Math.floor(r_abs.Min.x - this.Pos.x),
                        Math.floor(r_abs.Min.y - this.Pos.y),
                        Math.floor(r_abs.Max.x - this.Pos.x),
                        Math.floor(r_abs.Max.y - this.Pos.y) ];
        const id = HashData(r_rel, seed);
        this.imgui.keepAliveID(id);
        return id;
    }

    IsActiveAndVisible()
    {
        return this.Active && !this.Hidden;
    }

    // We don't use g.FontSize because the window may be != g.CurrentWidow.
    Rect()
    {
        return Rect.FromXY(this.Pos.x, this.Pos.y,
            this.Pos.x+this.Size.x, this.Pos.y+this.Size.y);
    }

    MakeCurrent()
    {
        // Establish our font as the current font, no stacking here,
        // since each window is made current before drawing,
        // so we must call SetFont in all cases.
        if(this.Font)
            this.imgui.SetFont(this.Font);
        else
            this.imgui.SetFont(this.imgui.GetFont(null, this.FontWindowScale));
    }

    Render(layer) // layer undefined: draw layers 0, 1
    {
        this.DrawList.Render(layer);
    }

    CalcLineHeight()
    {
        return this.imgui.GetLineHeight() * this.FontWindowScale;
    }

    TitleBarHeight()
    {
        if(this.Flags & WindowFlags.NoTitleBar)
            return 0;
        else
            return this.CalcLineHeight() + this.imgui.guictx.Style.FramePadding.y * 2;
    }

    TitleBarRect()
    {
        return Rect.FromXY(this.Pos.x, this.Pos.y,
                    this.Pos.x + this.SizeFull.x,
                    this.Pos.y + this.TitleBarHeight());
    }

    MenuBarHeight()
    {
        if(this.Flags & WindowFlags.MenuBar)
        {
            return this.DC.MenuBarOffset.y + this.CalcLineHeight() +
                    this.imgui.guictx.Style.FramePadding.y * 2;
        }
        else
            return 0;
    }

    MenuBarRect()
    {
        let y1 = this.Pos.y + this.TitleBarHeight();
        let y2 = y1+this.MenuBarHeight();
        return Rect.FromXY(this.Pos.x, y1, this.Pos.x+this.SizeFull.x, y2);
    }

    UpdateWindowParentAndRootLinks(flags, parent)
    {
        this.ParentWindow = parent;
        this.RootWindow = this.RootWindowForTitleBarHighlight = this.RootWindowForNav = this;
        if (parent && (flags & WindowFlags.ChildWindow) && !(flags & WindowFlags.Tooltip))
            this.RootWindow = parent.RootWindow;
        if (parent && !(flags & WindowFlags.Modal) &&
           (flags & (WindowFlags.ChildWindow | WindowFlags.Popup)))
        {
            this.RootWindowForTitleBarHighlight = parent.RootWindowForTitleBarHighlight;
        }
        while (this.RootWindowForNav.Flags & WindowFlags.NavFlattened)
        {
            console.assert(this.RootWindowForNav.ParentWindow);
            this.RootWindowForNav = this.RootWindowForNav.ParentWindow;
        }
    }

    getResizeBorderRect(border_n, perp_padding, thickness)
    {
        let rect = this.Rect();
        if (thickness == 0) rect.Max.SubtractXY(1,1);
        if (border_n == 0) // Top
            return new Rect(rect.Min.x + perp_padding, rect.Min.y - thickness,
                        rect.Max.x - perp_padding, rect.Min.y + thickness);
        if (border_n == 1) // Right
            return new Rect(rect.Max.x - thickness, rect.Min.y + perp_padding,
                            rect.Max.x + thickness, rect.Max.y - perp_padding);
        if (border_n == 2) // Bottom
            return new Rect(rect.Min.x + perp_padding, rect.Max.y - thickness,
                            rect.Max.x - perp_padding, rect.Max.y + thickness);
        if (border_n == 3) // Left
            return new Rect(rect.Min.x - thickness, rect.Min.y + perp_padding,
                            rect.Min.x + thickness, rect.Max.y - perp_padding);
        console.assert(0);
        return new Rect();
    }

    SetWindowPos(pos, cond)
    {
        if (cond && (this.SetWindowPosAllowFlags & cond) == 0)
            return;

        this.SetWindowPosAllowFlags &= ~(CondFlags.Once|CondFlags.FirstUseEver|CondFlags.Appearing);
        this.SetWindowPosVal = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);

        // Set
        let old_pos = this.Pos;
        this.Pos = Vec2.Floor(pos);
        // As we happen to move the window while it is being appended to
        // (which is a bad idea - will smear) let's at least offset the cursor
        this.DC.CursorPos.Add(Vec2.Subtract(this.Pos, old_pos));
        // And more importantly we need to adjust this so size calculation
        // doesn't get affected.
        this.DC.CursorMaxPos.Add(Vec2.Subtract(this.Pos, old_pos));
    }

    SetWindowSize(size, cond)
    {
        // Test condition (NB: bit 0 is always true) and clear flags for next time
        if (cond && (this.SetWindowSizeAllowFlags & cond) == 0)
            return;

        this.SetWindowSizeAllowFlags &=
            ~(CondFlags.Once | CondFlags.FirstUseEver | CondFlags.Appearing);

        // Set
        if (size.x > 0.)
        {
            this.AutoFitFramesX = 0;
            this.SizeFull.x = Math.floor(size.x);
        }
        else
        {
            this.AutoFitFramesX = 2;
            this.AutoFitOnlyGrows = false;
        }
        if (size.y > 0.)
        {
            this.AutoFitFramesY = 0;
            this.SizeFull.y = Math.floor(size.y);
        }
        else
        {
            this.AutoFitFramesY = 2;
            this.AutoFitOnlyGrows = false;
        }
    }

    SetWindowCollapsed(collapsed, cond)
    {
        // Test condition (NB: bit 0 is always true) and clear flags for next time
        if (cond && (this.SetWindowCollapsedAllowFlags & cond) == 0)
            return;
        this.SetWindowCollapsedAllowFlags &=
            ~(CondFlags.Once | CondFlags.FirstUseEver |CondFlags.Appearing);
        // Set
        this.Collapsed = collapsed;
    }

    SetScrollX(x)
    {
        this.ScrollTarget.x = x;
        this.ScrollTargetCenterRatio.x = 0;
    }

    SetScrollY(y)
    {
        // title bar height canceled out when using ScrollTargetRelY
        this.ScrollTarget.y = y + this.TitleBarHeight() + this.MenuBarHeight();
        this.ScrollTargetCenterRatio.y = 0;
    }

    SetWindowScrollX(x)
    {
        // SizeContents is generally computed based on CursorMaxPos which is
        // affected by scroll position, so we need to apply our change to it.
        this.DC.CursorMaxPos.x += this.Scroll.x;
        this.Scroll.x = x;
        this.DC.CursorMaxPos.x -= this.Scroll.x;
    }

    SetWindowScrollY(y)
    {
        // SizeContents is generally computed based on CursorMaxPos which is
        // affected by scroll position, so we need to apply our change to it.
        this.DC.CursorMaxPos.y += this.Scroll.y;
        this.Scroll.y = y;
        this.DC.CursorMaxPos.y -= this.Scroll.y;
    }

    GetScrollMaxX()
    {
        return Math.max(0, this.SizeContents.x - (this.SizeFull.x - this.ScrollbarSizes.x));
    }

    GetScrollMaxY()
    {
        return Math.max(0, this.SizeContents.y - (this.SizeFull.y - this.ScrollbarSizes.y));
    }

    CalcSizeContents()
    {
        if (this.Collapsed)
        {
            if (this.AutoFitFramesX <= 0 && this.AutoFitFramesY <= 0)
                return this.SizeContents;
        }
        if (this.Hidden && this.HiddenFramesCannotSkipItems == 0
            && this.HiddenFramesCanSkipItems > 0)
        {
            return this.SizeContents;
        }
        let sz = new Vec2();
        sz.x = Math.floor((this.SizeContentsExplicit.x != 0) ?
                         this.SizeContentsExplicit.x :
                         (this.DC.CursorMaxPos.x - this.Pos.x + this.Scroll.x));
        sz.y = Math.floor((this.SizeContentsExplicit.y != 0) ?
                         this.SizeContentsExplicit.y :
                         (this.DC.CursorMaxPos.y - this.Pos.y + this.Scroll.y));
        if(sz.y == 0)
        {
            // happens on first create
            // console.log("nothing here: " + this.Name);
        }
        return Vec2.Add(sz, this.WindowPadding);
    }

    CalcSizeAutoFit(size_contents)
    {
        let g = this.imgui.guictx;
        let style = g.Style;
        if (this.Flags & WindowFlags.Tooltip)
        {
            // Tooltip always resize
            return size_contents;
        }
        else
        {
            // Maximum window size is determined by the display size
            const is_popup = (this.Flags & WindowFlags.Popup) != 0;
            const is_menu = (this.Flags & WindowFlags.ChildMenu) != 0;
            let size_min = style.WindowMinSize;
            // Popups and menus bypass style.WindowMinSize by default, but
            // we give then a non-zero minimum size to facilitate understanding
            // problematic cases (e.g. empty popups)
            if (is_popup || is_menu)
                size_min = Vec2.Min(size_min, new Vec2(4., 4.));
            let size_max = Vec2.Max(size_min,
                                    Vec2.Subtract(g.IO.DisplaySize,
                                    Vec2.Mult(style.DisplaySafeAreaPadding, 2)));
            let size_auto_fit = Vec2.Clamp(size_contents, size_min, size_max);

            // When the window cannot fit all contents (either because of
            // constraints, either because screen is too small), we are growing
            // the size on the other axis to compensate for expected scrollbar.
            // FIXME: Might turn bigger than ViewportSize-WindowPadding.
            let sz3 = this.CalcSizeAfterConstraint(size_auto_fit);
            if (sz3.x < size_contents.x &&
                !(this.Flags & WindowFlags.NoScrollbar) &&
                (this.Flags & WindowFlags.HorizontalScrollbar))
            {
                size_auto_fit.y += style.ScrollbarSize;
            }
            if (sz3.y < size_contents.y &&
               !(this.Flags & WindowFlags.NoScrollbar))
            {
                size_auto_fit.x += style.ScrollbarSize;
            }
            return size_auto_fit;
        }
    }

    CalcSizeAfterConstraint(new_size)
    {
        let g = this.imgui.guictx;
        if (g.NextWindowData.SizeConstraintCond != 0)
        {
            // Using -1,-1 on either X/Y axis to preserve the current size.
            let cr = g.NextWindowData.SizeConstraintRect;
            new_size.x = (cr.Min.x >= 0 && cr.Max.x >= 0) ?
                Vec1.Clamp(new_size.x, cr.Min.x, cr.Max.x) :
                this.SizeFull.x;
            new_size.y = (cr.Min.y >= 0 && cr.Max.y >= 0) ?
                Vec1.Clamp(new_size.y, cr.Min.y, cr.Max.y) :
                this.SizeFull.y;
            if (g.NextWindowData.SizeCallback)
            {
                let data = {};
                data.UserData = g.NextWindowData.SizeCallbackUserData;
                data.Pos = this.Pos;
                data.CurrentSize = this.SizeFull.Clone();
                data.DesiredSize = new_size.Clone();
                g.NextWindowData.SizeCallback(data);
                new_size = data.DesiredSize;
            }
        }

        // Minimum size
        if (!(this.Flags & (WindowFlags.ChildWindow | WindowFlags.AlwaysAutoResize)))
        {
            new_size = Vec2.Max(new_size, g.Style.WindowMinSize);
            // Reduce artifacts with very small windows
            new_size.y = Math.max(new_size.y,
                    this.TitleBarHeight() + this.MenuBarHeight() +
                    Math.max(0., g.Style.WindowRounding - 1.));
        }
        return new_size;
    }

    getBgColor(flag, alpha)
    {
        let key;
        if (flag & (WindowFlags.Tooltip | WindowFlags.Popup))
            key = "PopupBg";
        else
        if (flag & WindowFlags.ChildWindow)
            key = "ChildBg";
        else
            key = "WindowBg";
        return this.imgui.GetStyleColor(key, alpha);
    }

    CalcNextScrollFromScrollTargetAndClamp(snap_on_edges)
    {
        let scroll = this.Scroll;
        let g = this.imgui.guictx;
        if (this.ScrollTarget.x < Number.MAX_VALUE)
        {
            let cr_x = this.ScrollTargetCenterRatio.x;
            scroll.x = this.ScrollTarget.x -
                        cr_x * (this.SizeFull.x - this.ScrollbarSizes.x);
        }
        if (this.ScrollTarget.y < Number.MAX_VALUE)
        {
            // 'snap_on_edges' allows for a discontinuity at the edge of
            // scrolling limits to take account of WindowPadding so that
            // scrolling to make the last item visible scroll far enough to
            // see the padding.
            let cr_y = this.ScrollTargetCenterRatio.y;
            let target_y = this.ScrollTarget.y;
            if (snap_on_edges && cr_y <= 0 && target_y <= this.WindowPadding.y)
                target_y = 0;
            if (snap_on_edges && cr_y >= 1 &&
                target_y >= this.SizeContents.y - this.WindowPadding.y + g.Style.ItemSpacing.y)
            {
                target_y = this.SizeContents.y;
            }
            scroll.y = target_y - (1-cr_y) *
                (this.TitleBarHeight() + this.MenuBarHeight()) -
                cr_y * (this.SizeFull.y - this.ScrollbarSizes.y);
        }
        scroll = Vec2.Max(scroll, Vec2.Zero());
        if (!this.Collapsed && !this.SkipItems)
        {
            scroll.x = Math.min(scroll.x, this.GetScrollMaxX());
            scroll.y = Math.min(scroll.y, this.GetScrollMaxY());
        }
        this.Scroll = scroll;
        this.ScrollTarget = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);
    }

    ClampWindowRect(rect, padding)
    {
        let g = this.imgui.guictx;
        let sz;
        if(g.IO.ConfigWindowsMoveFromTitleBarOnly &&
            !(this.Flags & WindowFlags.NoTitleBar))
        {
            sz = new Vec2(this.Size.x, this.TitleBarHeight());
        }
        else
            sz = this.Size;

        this.Pos = Vec2.Min(
                    Vec2.Subtract(rect.Max, padding),
                    Vec2.Subtract(Vec2.Max(Vec2.Add(this.Pos, sz),
                                           Vec2.Add(rect.Min, padding)),
                                  sz)
                             );
    }

    calcResizePosSizeFromAnyCorner(corner_target, corner_norm, out_pos, out_size)
    {
        // Expected window upper-left
        let pos_min = Vec2.Lerp(corner_target, this.Pos, corner_norm);
        // Expected window lower-right
        let pos_max = Vec2.Lerp(Vec2.Add(this.Pos, this.Size), corner_target, corner_norm);
        let size_expected = Vec2.Subtract(pos_max, pos_min);
        let size_constrained = this.CalcSizeAfterConstraint(size_expected);
        out_pos.Copy(pos_min);
        if (corner_norm.x == 0)
            out_pos.x -= (size_constrained.x - size_expected.x);
        if (corner_norm.y == 0)
            out_pos.y -= (size_constrained.y - size_expected.y);
        out_size.Copy(size_constrained);
    }

    UpdateManualResize(autofit, borderheld, resize_grip_count, resize_grip_col)
    {
        let imgui = this.imgui;
        let g = this.imgui.guictx;
        let flags = this.Flags;
        if ((flags & WindowFlags.NoResize) || (flags & WindowFlags.AlwaysAutoResize) ||
            this.AutoFitFramesX > 0 || this.AutoFitFramesY > 0)
        {
            return;
        }
        // Early out to avoid running this code for e.g. an hidden
        // implicit/fallback Debug window.
        if (this.WasActive == false)
            return;

        const resize_border_count = g.IO.ConfigWindowsResizeFromEdges ? 4 : 0;
        const grip_draw_size = Math.floor(Math.max(g.FontSize * 1.35,
                                this.WindowRounding + 1 + g.FontSize * 0.2));
        const grip_hover_innersize = Math.floor(grip_draw_size * 0.75);
        const grip_hover_outersize = g.IO.ConfigWindowsResizeFromEdges ?
                        WindowResizeFromEdge : 0.;
        let hovered = new ValRef();
        let held = new ValRef();

        let pos_target = Vec2.MAX_VALUE().Clone();
        let size_target = Vec2.MAX_VALUE().Clone();

        // Manual resize grips
        this.PushID("#RESIZE");
        for (let resize_grip_n=0; resize_grip_n<resize_grip_count; resize_grip_n++)
        {
            const grip = ResizeGripDefs[resize_grip_n];
            const corner = Vec2.Lerp(this.Pos, Vec2.Add(this.Pos, this.Size),
                                      grip.CornerPosN);
            // Using the FlattenChilds button flag we make the resize button
            // accessible even if we are hovering over a child window
            let resize_rect = new Rect(Vec2.Subtract(corner,
                                        Vec2.Mult(grip.InnerDir, grip_hover_outersize)),
                                   Vec2.Add(corner,
                                        Vec2.Mult(grip.InnerDir, grip_hover_innersize)));
            if (resize_rect.Min.x > resize_rect.Max.x)
            {
                // swap
                let tmp = resize_rect.Min.x;
                resize_rect.Min.x = resize_rect.Max.x;
                resize_rect.Max.x = tmp;
            }
            if (resize_rect.Min.y > resize_rect.Max.y)
            {
                // swap
                let tmp = resize_rect.Min.y;
                resize_rect.Min.y = resize_rect.Max.y;
                resize_rect.Max.y = tmp;
            }
            imgui.ButtonBehavior(resize_rect, this.GetID(resize_grip_n),
                        hovered, held,
                        ButtonFlags.FlattenChildren | ButtonFlags.NoNavFocus);
            //GetForegroundDrawList(this)->AddRect(resize_rect.Min,
            // resize_rect.Max, IM_COL32(255, 255, 0, 255));
            if (hovered.get() || held.get())
            {
                g.MouseCursor = (resize_grip_n & 1) ?
                    MouseCursor.ResizeNESW : MouseCursor.ResizeNWSE;
            }

            if (held.get() && g.IO.MouseDoubleClicked[0] && resize_grip_n == 0)
            {
                // Manual auto-fit when double-clicking
                size_target = this.CalcSizeAfterConstraint(autofit);
                imgui.clearActiveID();
            }
            else
            if (held.get())
            {
                // Resize from any of the four corners
                // We don't use an incremental MouseDelta but rather compute an
                // absolute target size based on mouse position
                let corner_target = Vec2.Subtract(g.IO.MousePos, g.ActiveIdClickOffset);
                corner_target.Add(Vec2.Lerp(
                                    Vec2.Mult(grip.InnerDir, grip_hover_outersize),
                                    Vec2.Mult(grip.InnerDir, -grip_hover_outersize),
                                    grip.CornerPosN));
                this.calcResizePosSizeFromAnyCorner(corner_target, grip.CornerPosN,
                                    pos_target/*output*/, size_target/*output*/);
            }
            if (resize_grip_n == 0 || held.get() || hovered.get())
            {
                let col = g.Style.GetColor(held.get() ? "ResizeGripActive" :
                                         hovered.get() ? "ResizeGripHovered" :
                                         "ResizeGrip");
                resize_grip_col[resize_grip_n] = col;
            }
        }
        for (let border_n=0; border_n<resize_border_count; border_n++)
        {
            let border_rect = this.getResizeBorderRect(border_n,
                                grip_hover_innersize,
                                WindowResizeFromEdge);
            imgui.ButtonBehavior(border_rect, this.GetID(border_n + 4), hovered, held,
                            ButtonFlags.FlattenChildren);
            if ((hovered.get() && g.HoveredIdTimer > WindowResizeFromEdgeTimer)
                || held.get())
            {
                g.MouseCursor = (border_n & 1) ? MouseCursor.ResizeEW : MouseCursor.ResizeNS;
                if (held.get())
                    borderheld.set(border_n);
            }
            if (held.get())
            {
                let border_target = this.Pos.Clone();
                let border_posn = new Vec2();
                if (border_n == 0)  // Top
                {
                    border_posn = Vec2.Zero();
                    border_target.y = (g.IO.MousePos.y - g.ActiveIdClickOffset.y
                                + WindowResizeFromEdge);
                }
                if (border_n == 1) // Right
                {
                    border_posn = new Vec2(1, 0);
                    border_target.x = (g.IO.MousePos.x - g.ActiveIdClickOffset.x
                                + WindowResizeFromEdge);
                }
                if (border_n == 2) // Bottom
                {
                    border_posn = new Vec2(0, 1);
                    border_target.y = (g.IO.MousePos.y - g.ActiveIdClickOffset.y
                                + WindowResizeFromEdge);
                }
                if (border_n == 3) // Left
                {
                    border_posn = Vec2.Zero();
                    border_target.x = (g.IO.MousePos.x - g.ActiveIdClickOffset.x
                                + WindowResizeFromEdge);
                }
                this.calcResizePosSizeFromAnyCorner(border_target,
                        border_posn, pos_target/*output*/, size_target/*output*/);
            }
        }
        imgui.PopID();

        // Navigation resize (keyboard/gamepad)
        if (g.NavWindowingTarget && g.NavWindowingTarget.RootWindow == this)
        {
            let nav_resize_delta; // Vec2
            if (g.NavInputSource == InputSource.NavKeyboard && g.IO.KeyShift)
                nav_resize_delta = imgui.getNavInputAmount2d(
                                                NavDirSourceFlags.Keyboard,
                                                InputReadMode.Down);
            if (g.NavInputSource == InputSource.NavGamepad)
                nav_resize_delta = imgui.getNavInputAmount2d(
                                                NavDirSourceFlags.PadDPad,
                                                InputReadMode.Down);
            if (nav_resize_delta &&
                (nav_resize_delta.x != 0 || nav_resize_delta.y != 0))
            {
                const NAV_RESIZE_SPEED = 600;
                nav_resize_delta.Mult(Math.floor(NAV_RESIZE_SPEED*g.IO.DeltaTime *
                                        Math.min(g.IO.DisplayFramebufferScale.x,
                                                g.IO.DisplayFramebufferScale.y)));
                g.NavWindowingToggleLayer = false;
                g.NavDisableMouseHover = true;
                resize_grip_col[0] = g.Style.GetColor("ResizeGripActive");
                // FIXME-NAV: Should store and accumulate into a separate size
                // buffer to handle sizing constraints properly, right now a
                // constraint will make us stuck.
                size_target = this.CalcSizeAfterConstraint(
                                Vec2.Add(this.SizeFull, nav_resize_delta));
            }
        }

        // Apply back modified position/size to window
        if (size_target.x != Number.MAX_VALUE)
        {
            this.SizeFull = size_target;
            imgui.MarkIniSettingsDirty(this);
        }
        if (pos_target.x != Number.MAX_VALUE)
        {
            this.Pos = pos_target.Floor();
            imgui.MarkIniSettingsDirty(this);
        }
        this.Size = this.SizeFull;
    } // UpdateManualResize

    SetWindowConditionAllowFlags(flags, enabled)
    {
        if(enabled)
        {
            this.SetWindowPosAllowFlags = this.SetWindowPosAllowFlags | flags;
            this.SetWindowSizeAllowFlags = this.SetWindowSizeAllowFlags | flags;
            this.SetWindowCollapsedAllowFlags = this.SetWindowCollapsedAllowFlags | flags;
        }
        else
        {
            this.SetWindowPosAllowFlags = this.SetWindowPosAllowFlags & ~flags;
            this.SetWindowSizeAllowFlags = this.SetWindowSizeAllowFlags & ~flags;
            this.SetWindowCollapsedAllowFlags = this.SetWindowCollapsedAllowFlags & ~flags;
        }
    }

    RenderOuterBorders()
    {
        let imgui = this.imgui;
        let g = this.imgui.guictx;
        let rounding = this.WindowRounding;
        let border_size = this.WindowBorderSize;
        if (border_size > 0. && !(this.Flags & WindowFlags.NoBackground))
        {
            // the outer border of all windows
            this.DrawList.AddRect(this.Pos,
                            Vec2.Add(this.Pos, this.Size),
                            imgui.GetStyleColor("Border"),
                            rounding, CornerFlags.All, border_size);
        }

        const border_held = this.ResizeBorderHeld;
        if (border_held != -1)
        {
            const half = new Vec2(.5, .5);
            const def = s_resizeBorderDefs[border_held];
            const border_r = this.getResizeBorderRect(border_held, rounding, 0.);
            let p0 = Vec2.Lerp(border_r.Min, border_r.Max, def.CornerPosN1);
            this.DrawList.PathArcTo(
                Vec2.Add(Vec2.Add(p0, half),
                         Vec2.Mult(def.InnerDir, rounding)),
                rounding, def.OuterAngle - Math.PI*0.25, def.OuterAngle);
            p0 = Vec2.Lerp(border_r.Min, border_r.Max, def.CornerPosN2);
            this.DrawList.PathArcTo(
                Vec2.Add(Vec2.Add(p0, half),
                        Vec2.Mult(def.InnerDir, rounding)),
                rounding, def.OuterAngle, def.OuterAngle + Math.PI*0.25);
            this.DrawList.PathStroke(imgui.GetStyleColor("SeparatorActive"),
                false, Math.max(2.0, border_size)); // Thicker than usual
        }
        if (g.Style.FrameBorderSize > 0 &&
              !(this.Flags & WindowFlags.NoTitleBar))
        {
            let y = this.Pos.y + this.TitleBarHeight() - 1;
            this.DrawList.AddLine(
                new Vec2(this.Pos.x + border_size, y),
                new Vec2(this.Pos.x + this.Size.x - border_size, y),
                imgui.GetStyleColor("Border"),
                g.Style.FrameBorderSize);
        }
    }

    RenderResizeGrips(resize_grip_col, resize_grip_count, grip_draw_size,
                      window_border_size, window_rounding)
    {
        for (let resize_grip_n = 0; resize_grip_n < resize_grip_count;
                resize_grip_n++)
        {
            let col = resize_grip_col[resize_grip_n];
            if(col == null) continue;
            const grip = ResizeGripDefs[resize_grip_n];
            const corner = Vec2.Lerp(this.Pos,
                            Vec2.Add(this.Pos, this.Size),
                            grip.CornerPosN);
            let offset = ((resize_grip_n & 1) ?
                new Vec2(window_border_size, grip_draw_size) :
                new Vec2(grip_draw_size, window_border_size));
            this.DrawList.PathLineTo(
                Vec2.Add(corner, Vec2.Mult(offset, grip.InnerDir)));
            offset = (resize_grip_n & 1) ?
                new Vec2(grip_draw_size, window_border_size) :
                new Vec2(window_border_size, grip_draw_size);
            this.DrawList.PathLineTo(
                Vec2.Add(corner, Vec2.Mult(offset, grip.InnerDir)));

            this.DrawList.PathArcToFast(
                new Vec2(corner.x + grip.InnerDir.x * (window_rounding + window_border_size),
                            corner.y + grip.InnerDir.y * (window_rounding + window_border_size)),
                window_rounding, grip.AngleMin12, grip.AngleMax12);
            this.DrawList.PathFillConvex(col);
        }
    }

}

export class NextWindowData
{
    constructor()
    {
        this.Clear();
        this.PosVal = new Vec2(0, 0);
        this.PosPivotVal = new Vec2(0,0);
        this.SizeVal = new Vec2(0,0);
        this.ContentSizeVal = new Vec2(0,0);
        this.CollapsedVal = false;
        this.SizeConstraintRect = new Rect();
        this.SizeCallback = null;
        this.SizeCallbackUserData = null;
        this.BgAlphaVal = Number.MAX_VALUE;
        this.ZIndex = 0;
        // This is not exposed publicly, so we don't clear it.
        this.MenuBarOffsetMinVal = new Vec2(0,0);
    }

    Clear()
    {
        this.PosCond = CondFlags.None;
        this.SizeCond = CondFlags.None;
        this.ContentSizeCond = CondFlags.None;
        this.CollapsedCond = CondFlags.None;
        this.SizeConstraintCond = CondFlags.None;
        this.FocusCond = CondFlags.None;
        this.BgAlphaCond = CondFlags.None;
        this.ZIndexCond = CondFlags.None;
    }
}

export class GroupData
{
    constructor(win, guictx)
    {
        this.BackupCursorPos = win.DC.CursorPos.Clone(); // Vec2
        this.BackupCursorMaxPos = win.DC.CursorMaxPos.Clone(); // Vec2
        this.BackupIndent = win.DC.Indent.Clone(); // Vec1
        this.BackupGroupOffset = win.DC.GroupOffset.Clone(); // Vec1
        this.BackupCurrentLineHeight = win.DC.CurrentLineHeight;
        this.BackupCurrentLineHeightMax = win.DC.CurrentLineHeightMax;
        this.BackupCurrentLineTextBaseOffset = win.DC.CurrentLineTextBaseOffset;
        this.BackupActiveIdIsAlive = guictx.ActiveIdIsAlive;
        this.BackupActiveIdPreviousFrameIsAlive = guictx.ActiveIdPreviousFrameIsAlive;
        this.AdvanceCursor = true;
    }
}

export class WindowTempData
{
    constructor()
    {
        let DC = this;
        DC.CursorPos = new Vec2(0,0);
        DC.CursorPosPrevLine = new Vec2(0,0);
        // Initial position in client area with padding
        DC.CursorStartPos = new Vec2(0,0);
        // Used to implicitly calculate the size of our contents, always
        // growing during the frame. Turned into window.SizeContents at the
        // beginning of next frame
        DC.CursorMaxPos = new Vec2(0,0);
        DC.CurrentLineHeight = 0;
        DC.CurrentLineHeightMax = 0;
        DC.PrevLineHeight = 0;
        DC.PrevLineHeightMax = 0;
        DC.CurrentLineTextBaseOffset = 0.;
        DC.PrevLineTextBaseOffset = 0.;
        DC.TreeDepth = 0;
        // Store a copy of !g.NavIdIsAlive for TreeDepth 0..31
        DC.TreeDepthMayJumpToParentOnPop = 0;
        DC.LastItemId = 0;
        DC.LastItemStatusFlags = 0;
        // Interaction rect
        DC.LastItemRect = new Rect();
        // End-user display rect (only valid if
        // LastItemStatusFlags & ItemStatusFlags.HasDisplayRect)
        DC.LastItemDisplayRect = new Rect();
        // Current layer, 0..31 (we currently only use 0..1)
        DC.NavLayerCurrent = NavLayer.Main;
        // = (1 << NavLayerCurrent) used by ItemAdd prior to clipping.
        DC.NavLayerCurrentMask = (1 << NavLayer.Main);
        // Which layer have been written to (result from previous frame)
        DC.NavLayerActiveMask = 0;
        // Which layer have been written to (buffer for current frame)
        DC.NavLayerActiveMaskNext = 0;
        DC.NavHideHighlightOneFrame = false;
        // Set when scrolling can be used (ScrollMax > 0.0f)
        DC.NavHasScroll = false;
        DC.MenuBarAppending = false; // FIXME: Remove this
        // MenuBarOffset.x is sort of equivalent of a per-layer CursorPos.x,
        // saved/restored as we switch to the menu bar. The only situation when
        // MenuBarOffset.y is > 0 if when (SafeAreaPadding.y > FramePadding.y),
        // often used on TVs.
        DC.MenuBarOffset = new Vec2(0,0);
        DC.ChildWindows = new ArrayEx();
        DC.StateStorage = null;
        DC.LayoutType = LayoutType.Vertical;
        // Layout type of parent window at the time of Begin()
        DC.ParentLayoutType = LayoutType.Vertical;
        // Counter for focus/tabbing system. Start at -1 and increase as
        // assigned via FocusableItemRegister() (FIXME-NAV: Needs redesign)
        DC.FocusCounterAll = -1;
        // (same, but only count widgets which you can Tab through)
        DC.FocusCounterTab = -1;

        // We store the current settings outside of the vectors to increase
        // memory locality (reduce cache misses). The vectors are rarely
        // modified. Also it allows us to not heap allocate for short-lived
        // windows which are not using those settings.
        // == ItemFlagsStack.back() [empty == ItemFlags_Default]
        DC.ItemFlags = ItemFlags.Default;
        // == ItemWidthStack.back(). 0.0: default, >0.0: width in pixels,
        // <0.0: align xx pixels to the right of window
        DC.ItemWidth = 0.;
        DC.NextItemWidth = Number.MAX_VALUE; // == ItemWidthStack.back()
        DC.TextWrapPos = -1.;  // == TextWrapPosStack.back() [empty == -1.0f]
        DC.ItemFlagsStack = new ArrayEx();
        DC.ItemWidthStack = new ArrayEx();
        DC.TextWrapPosStack = new ArrayEx();
        DC.GroupStack = new ArrayEx();
        DC.StackSizesBackup = {}; // Store size of various stacks for asserting

        // Indentation / start position from left of window (increased by
        // TreePush/TreePop, etc.)
        DC.Indent = new Vec1(0);
        DC.GroupOffset = new Vec1(0);
        // Offset to the current column (if ColumnsCurrent > 0).
        // FIXME: This and the above should be a stack to allow use cases
        // like Tree->Column->Tree. Need revamp columns API.
        DC.ColumnsOffset = new Vec1(0);
        DC.CurrentColumns = null;// Current Columns
    }
}