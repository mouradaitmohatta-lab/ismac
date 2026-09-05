@echo off
title ISMAC Logistique & Decharges
echo ========================================================
echo   Lancement de l'application ISMAC Logistique...
echo ========================================================
echo.
start http://localhost:8080
python server.py
pause
