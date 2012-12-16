#!/bin/bash

set +x
set +e

PROJECT="snix"
START_FILE="${PROJECT}.js"
DIST_FILE=./dist/${PROJECT}.js
DIST_MIN_FILE=./dist/${PROJECT}.min.js

[ -d ./dist ] || mkdir ./dist
[ -f ${DIST_FILE} ] && rm ${DIST_FILE}

cat lib/${START_FILE} >> ${DIST_FILE}

for file in `find lib -type f -name *.js | grep -v lib/${START_FILE}`; do
  echo -e "\n(function(){\n" >> ${DIST_FILE}
  cat ${file} >> ${DIST_FILE}
  echo -e "\n}());\n" >> ${DIST_FILE}
done

uglifyjs ${DIST_FILE} > ${DIST_MIN_FILE}