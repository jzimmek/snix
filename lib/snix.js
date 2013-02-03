var Snix = {};

Snix.val = function(initial, opts){
  opts = arguments.length > 1 ? opts : {};

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
  
  f.get = function(){
    return this.value;
  };

  f.set = function(newValue){
    if(this.isDifferentValue(newValue)){
      var oldValue = this.value;
      this.value = newValue;
      Snix.Event.trigger(this, "change", [newValue, oldValue]);
    }
  };

  f.isDifferentValue = function(value){
    return this.value !== value;
  };

  f.convert = function(value){
    return value;
  };

  f.toJSON = function(){
    var v = this();
    return (v && v.toJSON) ? v.toJSON() : v;
  };
  f.__snix__ = true;
  return f;
};

Snix.boolean = function(value){
  var v = Snix.val(value);
  v.convert = function(val){
    return (val == null) ? null : (val == true || val == "true" || val == "yes");
  };
  return v;
};

Snix.int = function(value){
  var v = Snix.val(value);
  v.convert = function(val){
    return (val == null) ? null : parseInt(val, 10);
  };
  return v;
};

Snix.float = function(value){
  var v = Snix.val(value);
  v.convert = function(val){
    return (val == null) ? null : parseFloat(val);
  };
  return v;
};





Snix.moment = function(value){
  var v = Snix.val(value);
  v.convert = function(val){
    return moment(val);
  };
  v.format = function(pattern){
    var mom = this();
    return (mom == null) ? null : mom.format(pattern);
  };
  v.toJSON = function(){
    var val = this();
    if(val == null) return null;
    
    val = val.toDate();
    return (val && val.toJSON) ? val.toJSON() : val;
  };
  return v;
};

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
