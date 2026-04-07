@echo off
echo Stopping container...
docker stop pm-container

echo Removing container...
docker rm pm-container

echo App stopped.