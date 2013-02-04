(function(){

  var convert = function(val){
    return (val == null) ? null : parseInt(val, 10);
  };

  var proto = {
    convert: convert
  };

  Snix.int = function(value){
    return _.extend(Snix.val(value), proto);
  };
  
})();
