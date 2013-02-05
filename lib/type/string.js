(function(){

  var convert = function(val){
    if(val == null)
      return null;

    return val.toString().replace(/^\s+|\s+$/g, "");
  };

  var proto = {
    convert: convert
  };

  Snix.string = function(value){
    return _.extend(Snix.val(value), proto);
  };
  
})();
