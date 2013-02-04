var Snix = {};

(function(){

  var toJSON = function(){
    var v = this();
    return (v && v.toJSON) ? v.toJSON() : v;
  };

  var get = function(){
    return this.value;
  };

  var convert = function(val){
    return val;
  };

  var set = function(newValue){
    if(this.value !== newValue){
      var oldValue = this.value;
      this.value = newValue;
      Snix.Event.trigger(this, "change", [newValue, oldValue]);
    }
  };

  var proto = {
    toJSON: toJSON,
    get: get,
    set: set,
    convert: convert
  };

  Snix.val = function(initial){
    var f = function(){
      if(arguments.length > 0){
        var newValue = f.convert(arguments[0]);
        f.set(newValue);
        return f;
      } else{
        return f.get();
      }
    };

    Snix.Event.events(f, "change");

    f.value = (arguments.length > 0 ? initial : null);

    _.extend(f, proto);
    
    f.__snix__ = true;
    return f;
  };  

})();

Snix.invoke = function(){
  var fun = arguments[0];
  var bind = arguments[1];
  for(var i=2; i < arguments.length; i++){
    arguments[i].on("change", function(){
      fun.apply(bind);
    });
  }
  fun.apply(bind);
  
  return bind;
};