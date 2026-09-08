@echo off
REM Run the Flask API with the main venv (NOT deepface_env).
REM deepface_env is only used internally for embedding subprocesses.
cd /d "%~dp0"
"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\venv\Scripts\python.exe" api.py
pause
