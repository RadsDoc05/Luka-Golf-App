@echo off
cd /d "%~dp0godot"
echo Opening Luka's Golf Adventure in Godot 4 Editor...
start "" "C:\Games\Godot\Godot_v4.7.2-stable_win64.exe" -e --path "%~dp0godot"
