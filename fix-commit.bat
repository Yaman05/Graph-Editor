@echo off
cd /d "C:\Users\HP\Desktop\my-graph-app"
git rm --cached -r claude-code
echo.
echo Adding claude-code to .gitignore...
echo claude-code/ >> .gitignore
echo .claude/ >> .gitignore
git add .gitignore
echo.
echo Committing changes...
git commit -m "Design changes"
echo.
echo Done! Cleaning up...
del "%~f0"
