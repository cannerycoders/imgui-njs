# imgui-njs

## Intro

`imgui-njs` is a manual-port / partial-rewrite of
[dear imgui](http://github.com/orcunut/imgui), a
a popular [GUI](https://en.wikipedia.org/wiki/Graphical_user_interface)
framework used in games and production tooling development.  `dear imgui`
differs from typical GUI frameworks (like [Qt](https://www.qt.io/)) in its
*immediate* nature.  Instead of programming a GUI via a layout and separate
event-handling callbacks, the immediate-mode approach intermixes the layout,
styling and event-handling. This approach has benefits and drawbacks.
Here are some of the allures:

* it's easy to learn and get simple interfaces running quickly
* dynamic interfaces are naturally expressed. If you are building
  tools or experiences with lots of dynamic graphics it may be
  easier to do this with an immediate-mode GUI approach.

`dear-imgui` targets desktop applications development and can be used to
target applications on Mac, Windows and Linux because its built atop
the portability layers of C++, [libsdl](https://www.libsdl.org/)-like
platforms and OpenGL-like rendering. Bindings to many other programming
languages are available. During 2018-19 `dear imgui` was ported to the
the html/javascript/browser platform. [imgui-js](https://flyover.github.io/imgui-js)
achieves this through a combination of manual glue code, the webgl canvas,
and the results of the emscripten cross compiler. `imgui-njs` takes this
one step further by replacing enscripten and webgl with pure html, canvas
and natural, modern javascript. The primary advantage of this approach is that
it's more approachable for most web programmers.  No OpenGL/3D experience
is required. Pure javascript and html5 canvas all the way down. This
makes, for example, multi-font support trivial. No texture atlases
are required (or at least, this aspect of GPUs is hidden behind the
browser's canvas implementation). A significant disadvantage of this approach
is that it fundamentally breaks from the original `dear-imgui` codebase and
foists the ongoing support and improvement of the library onto the developers
of this codebase.

Now it's possible to develop immediate-mode interfaces for web applications
using the combination of javascript and imgui-njs. But, you ask, _why would
anyone want to do this_? After all, we already have a host of gui frameworks
and packages available?  Generally, the answer is you probably don't. But
if you have a graphics-intensive _and_ GUI-intensive application and require a
web-deployment model, this approach may be for you.

## How imgui-njs differs from dear-imgui

### imposed/suggested by javascript or html-canvas

* The biggest and most controversial choice was to embrace the idea
  that javascript and C are sufficiently different as to render the
  idea of minimizing code diffs unreasonable.  This is an entirely
  manual port (with some rewritten sections). While it's still a
  straightforward activity to migrate changes from dear-imgui, it's
  far from automatic. This contrasts with the cross-compilation
  approach taken by imgui-js.  Supporting legacy or c+gl-specific
  features was not the priority here.
* lower performance (speed and memory) than C++ plus OpenGL/DirectX/Vulcan/Metal.
  May not be suitable for performance-sensitive games or tools.
* integration with 3d via separate DOM elements
* pass by reference of POD doesn't work.  We rely on onChange callbacks
  and introduce ValRef and MutableString datatypes (see types.js).
* utf8 not directly supported, javascript native strings are utf-16
* float vs double not relevant, (lots of datatype distinctions irrelevant)
* method polymorphism not supported, there are a few cases where we
  inspect args to support a variety of calling styles.
* Colors are represented as objects, not float4 or u32.
* Vec2 are objects and can't be aliased to an array[2]
* Fonts aren't gl textures. We let the browser manage them in the standard
  html/canvas fashion. Text layout however isn't browser, but rather imgui.
* Images are referred to by url, not texture id.
* Drawlists are managed differently have have different interfaces.
* Text filtering uses javascript regexp
* Memory allocation is out of your hands (for better and worse)
* Since browser is portable, separable renderer/plugins aren't required.
* Persistance and Security governed by browser (and server).
* text input is re-written (but inspired by 'stb_textedit')

### stylistic choices

* code has been factored into lots of small files rather than a few
  big ones. We combine them into an imgui class via javascript mixin.
  Long lines have been shortend.  Internal methods renamed to start
  with lowercase.  Public methods & vars remain UpperCase.  'snake_case'
  is deprecated (but still prevalent).
* introduction of named styles (combining colors, fonts and windows)
* additional style configurations
    * named fonts part of style
* numerical expressions will be generalize via a number-edit widget
  atop javascript `eval`. (simple */+ operators work).

### text

* we introduce guictx.LineHeight to separate FontSize from line spacing.
  It is expressed as a percentage of FontSize.
* FontScale, FontGlobalScale, FontBaseSize are not supported since we rely
  on css-like font specs. The same effect can be achieved by selected a
  new font (which combines face and scale).
* WindowFontScale supported in the form of a per-window font.

### window management

* we introduced a per-window zIndex to enhance control over window stacking
  order. This is currently more of a proof-of-concept than a full-featured
  implemenation.

## status

See [todo.md](_todo.md) for current status.  tl;dr: there's still a lot to do!
The basic widget demos are mostly functional. Code is approximately equivalent
to dear-imgui 1.70 (WIP).
