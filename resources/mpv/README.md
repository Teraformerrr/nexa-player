# Bundled mpv runtime

Nexa Player packages an mpv runtime so users do not need to install mpv separately

## Runtime information

-mpv version: v0.41.0-244-gaf9c81fa1
-official mpv source: https://github.com/mpv-winbuild-cmake
-Windows build source: https://github.com/shinchiro/mpv-winbuild-cmake
-FFmpeg source: https://github.com/FFmpeg/FFmpeg

## Licensing

The accompanying license and copyright files are located in the `licenses` directory:

-`copyright`
-`LICENSE.GPL`
-`LICENSE.LGPL`

Nexa Player does not claim ownership of mpv, FFmpeg, or their included components.

## Packaging

The following runtime files are required when creating a Windows installer.

-`mpv.exe`
-`d3dcompiler_43.dll`

These binaries are intentionally executed from Git because `mpv.exe` exceeds GitHub's individual file-size limit. 
They must be placed in `resources/mpv` before running the Windows packaging command.