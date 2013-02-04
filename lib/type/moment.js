(function(){

  var convert = function(val){
    return moment(val);
  };

  var format = function(pattern){
    var mom = this();
    return (mom == null) ? null : mom.format(pattern);
  };

  var toJSON = function(){
    var val = this();
    if(val == null) return null;
    
    val = val.toDate();
    return (val && val.toJSON) ? val.toJSON() : val;
  };

  var proto = {
    convert: convert,
    format: format,
    toJSON: toJSON
  };

  Snix.moment = function(value){
    return _.extend(Snix.val(value), proto);
  };
    
})();