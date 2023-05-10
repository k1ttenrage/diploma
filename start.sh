#!/usr/bin/env bash

npm install firebase
npm run dev -- --https | egrep -o 'https?://[0-9][^ ]+/' &> url.txt &
sleep 5
output=$(head -n 5 /tmp/url.txt)
rm url.txt
open -n $output
