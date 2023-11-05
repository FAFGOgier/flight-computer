# MSFS 2020 Analog Flight Computer

The idea is to provide a flight computer usable in VR.

It's still a projet in its infancy (a first iteration will probably be form-based).
The goal, however, is to provide an analog computer.

First, for Wind correction, and then (perhaps) for other computations.


The base is provided by https://github.com/bymaximus/msfs2020-toolbar-window-template



As I wasn't able to figure out a reasonable workflow in MSFS, the folder RAWHTML
contains a simple HTML/JS version of the system, which can be edited without even starting MSFS.


To build the SPB if you have changed UI panel template definition run `build.bat` or manually

`SDK\Tools\bin\fspackagetool.exe maximus-ingamepanels-custom\Build\maximus-ingamepanels-custom.xml -nomirroring`

It will generate the SPB at `maximus-ingamepanels-custom\Build\Packages\maximus-ingamepanels-custom\Build` copy the SPB to `maximus-ingamepanels-custom\InGamePanels`.

Copy the package to community folder BUT DO NOT COPY the `maximus-ingamepanels-custom\Build` directory.

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