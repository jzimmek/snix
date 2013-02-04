(function(){

  var convert = function(val){
    return (val == null) ? null : parseFloat(val);
  };

  var proto = {
    convert: convert
  };

  Snix.float = function(value){
    return _.extend(Snix.val(value), proto);
  };
  
})();
