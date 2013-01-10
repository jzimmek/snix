#!/bin/bash

[ -d dist ] || mkdir dist

if [[ $VERSION = "" ]]; then
  VERSION="latest"
fi

[ -f ./dist/snix.all-${VERSION}.min.js ] && rm ./dist/snix.all-${VERSION}.min.js

FILES="snix snix.binding snix.ajax snix.record"

for i in $FILES; do
  [ -f ./dist/$i-${VERSION}.min.js ] && rm ./dist/$i-${VERSION}.min.js
  uglifyjs -o ./dist/$i-${VERSION}.min.js ./lib/$i.js
done

for i in $FILES; do
  cat ./dist/$i-${VERSION}.min.js >> ./dist/snix.all-${VERSION}.min.js
done