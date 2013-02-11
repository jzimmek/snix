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
    var newValue = this.convert(newValue);
    if(this.value !== newValue){
      var oldValue = this.value;
      this.value = newValue;
      Snix.Event.trigger(this, "change", [newValue, oldValue]);
    }
    return this;
  };

  var proto = {
    toJSON: toJSON,
    get: get,
    set: set,
    convert: convert
  };

  Snix.val = function(initial){
    var f = function(){
      // if(Snix.accessedGuids)
      //   Snix.accessedGuids.push(f.__guid__);

      if(arguments.length > 0)  return f.set(arguments[0]);
      else                      return f.get();
    };
    f.__guid__ = _.uniqueId().toString();

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