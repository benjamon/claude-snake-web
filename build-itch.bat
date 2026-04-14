@echo off
cd /d "%~dp0"
echo Building for itch.io...
wsl bash -c "cd '%~dp0' && npx vite build --base '' && node scripts/inline-itch.cjs"
if exist claude-snake-web-itch.zip del claude-snake-web-itch.zip
powershell -NoProfile -Command "Compress-Archive -Path '%~dp0dist-itch\*' -DestinationPath '%~dp0claude-snake-web-itch.zip' -Force"
if exist claude-snake-web-itch.zip (
    echo Done: claude-snake-web-itch.zip
) else (
    echo Zip creation failed!
)
pause
