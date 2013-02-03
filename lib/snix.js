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


Snix.enu = function(){
  var entries = [];

  for(var i=0; i < arguments.length; i++){
    var e = {id: i, name: arguments[i].toString()};
    e.toJSON = function(){
      return this.name;
    };
    e.toString = function(){
      return this.name;
    };

    entries.push(e);
  }

  var f = function(){
    if(arguments.length == 0){
      return entries;
    }else{
      if(arguments[0] === null)
        return null;

      var entry = _.where(entries, {name: arguments[0].toString()})[0];

      if(!entry)
        throw "unknown in enumeration: " + arguments[0].toString();

      return entry;
    }
  };
  f.__snix__ = true;

  return f;
};

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
