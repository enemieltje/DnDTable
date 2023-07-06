#!/bin/bash

# this gets the name of the current directory
BASEDIR=$(dirname "$0")

# check if node_modules exists in current dir
if [ -d "$BASEDIR/data" ]
then
	# just start without "npm install" and build
	echo "Not your first rodeo? starting!"
	npm run prod
else

	# the node modules need to be loaded for first time!
	echo "this seems like first time? creating and starting!"
	npm run prod:firsttime
fi

read -n 1 -s -r -p "Press any key to exit..."
echo
