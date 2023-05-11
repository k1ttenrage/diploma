#!/usr/bin/env bash

if npm run dev -- --https --host | egrep -o 'https?://[0-9][^ ]+/' -m1 | xargs open
then
    echo "fine"
else
    npm install --force
fi 