Snix.jQuery = function(){
  var oldClean = jQuery.cleanData;

  $.cleanData = function(elems){
    for(var i=0, elem; (elem = elems[i]) !== undefined; i++ ){
      jQuery(elem).triggerHandler("destroyed");
    }
    oldClean(elems);
  };
};
