(function(){
  
  var convert = function(val){
    return (val == null) ? null : (val == true || val == "true" || val == "yes");
  };

  var proto = {
    convert: convert
  };

  Snix.boolean = function(value){
    return _.extend(Snix.val(value), proto);
  };

})();
