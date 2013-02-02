var Snix = {};

Snix.idOf = function(any){
  if(any == null)
    throw "illegal argument";

  return ((typeof(any) == "string" || typeof(any) == "number") ? any : Snix.unwrap(any.id)).toString();
};

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

  f.diff = function(diffFun){
    this.isDifferentValue = function(value){
      if((value === null && this.value !== null) || (value !== null && this.value === null))
        return true;

      if(value === null && this.value === null)
        return false;

      return diffFun.apply(this, value);
    };
    return this;
  };

  f.convert = function(value){
    return value;
  };

  f.converter = function(convertFun){
    this.convert = convertFun;
    return this;
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

Snix.unwrap = function(any){
  return any && any.__snix__ ? Snix.unwrap(any()) : any;
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
