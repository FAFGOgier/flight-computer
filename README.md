# MSFS Analog Flight Computer

A circular, E6B-style flight computer for the MSFS toolbar, built to be used with a mouse in VR.
Target: MSFS 2024 (the panel is still a classic toolbar in-game panel).

The base is provided by https://github.com/bymaximus/msfs2020-toolbar-window-template

## Faces

**Calc** - fixed outer scale, rotating inner disc, hairline cursor. The disc always obeys
`outer = inner x ratio`; the mode only picks the ratio.
- *Time*: speed / distance / time. Put the red 60 under your ground speed, read distance on the outer scale and minutes (and h:min) on the inner one.
- *Convert*: NM/SM/km, kt/mph/km/h, kg/lb, L/US gal/Imp gal, ft/m, hPa/inHg (plus a C/F stepper). Picking the units turns the disc for you.
- *TAS*: set pressure altitude and OAT; the disc turns to TAS/CAS. Exact TAS, Mach and density altitude are shown below the analog reading.

**Wind** - rotating compass ring (course under the red index) and a course-up plotting board. Drag the orange dot to set the wind; the dashed circle (radius TAS) around it cuts the track axis at the ground speed, and the blue line gives the wind correction angle.

## Controls (VR friendly)
- Drag the inner disc, the outer ring (hairline / compass ring) or the board with the mouse.
- Mouse wheel for fine adjustment, `+` / `-` buttons for every value (hold to repeat), `Coarse`/`Fine` switches the step size.
- Zoom buttons: the view follows the hairline (or the wind dot), so graduations stay readable on a small panel.
- State (discs, mode, zoom, wind) is remembered between sessions.

## Workflow
- `flight-computer-panel/` is the MSFS package. The code lives in `html_ui/InGamePanels/FlightComputerPanel/fc/`: `core.js` (pure maths), `units.js`, `scales.js`, `app.js` (shell), `face-calc.js`, `face-wind.js`.
- Test without MSFS: serve this folder over http (`python -m http.server 8765`) and open `dev/index.html` (the computer) or `dev/test.html` (maths tests, the title says PASSED or FAILED).
- `deploy.bat stage` builds `dist\flight-computer-panel` (without `Build\`, with a fresh `layout.json` from `MSFSLayoutGenerator.exe`). `deploy.bat` also copies it to the Community folder (`FC_COMMUNITY`, default `G:\FS2020\MSFS2024\Community`).
- If you change the panel definition (size, icon...), rebuild the SPB with `build.bat` (needs `MSFS_SDK`), it copies the result to `flight-computer-panel\InGamePanels`.

## Screenshots

![example](example.png)
![example2](example2.png)
![example3](example3.png)

#
## Please, if you like the source/my addons, consider making a donation to support me/keep development of this and new addons, any amount is welcome. I will buy MSFS2020 from steam since my current version is from a limited game pass access which will be ended. Thank you.
<br/>
<br/>
<div align="center">

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LZH27QQ2ST64N)

</div>
<br/>
<br/>
<br/>