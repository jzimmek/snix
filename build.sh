#!/bin/bash

[ -d dist ] || mkdir dist

VERSION=`date +"%Y%m%d%H%M%S"`
MODULES="snix util event rest array validator filter compute record remote binding bindings"

WORK_DIR=`pwd`

FILENAME=snix-$VERSION.js
FILENAME_MIN=snix-$VERSION.min.js

FILE=$WORK_DIR/dist/$FILENAME
FILE_MIN=$WORK_DIR/dist/$FILENAME_MIN

echo -n $VERSION > ./VERSION

touch $FILE
echo "// ${VERSION}" >> $FILE

for i in $MODULES; do
  cat ./lib/$i.js >> $FILE
done

uglifyjs -o $FILE_MIN $FILE

[ -L dist/snix-latest.js ] && rm dist/snix-latest.js
[ -L dist/snix-latest.min.js ] && rm dist/snix-latest.min.js

cd dist

ln -s $FILENAME snix-latest.js
ln -s $FILENAME_MIN snix-latest.min.js

cd ..