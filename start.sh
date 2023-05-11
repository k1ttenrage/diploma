#!/usr/bin/env bash

npm run dev -- --https --host | egrep -o 'https?://[0-9][^ ]+/' -m1 | xargs open