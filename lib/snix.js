var Snix = {};

Snix.idOf = function(any){
  if(any == null)
    throw "illegal argument";

  return ((typeof(any) == "string" || typeof(any) == "number") ? any : Snix.unwrap(any.id)).toString();
};

Snix.Event = {};

Snix.Event.events = function(){
  var obj = arguments[0];
  for(var i=1; i < arguments.length; i++){
    obj[arguments[i]+"Listener"] = [];
  }
  if(!obj.on){
    obj.on = function(event, fun, bind){
      Snix.Event.on(this, event, fun, bind);
      return this;
    };
  }
  if(!obj.one){
    obj.one = function(event, fun, bind){
      Snix.Event.one(this, event, fun, bind);
      return this;
    };
  }
};

Snix.Event.trigger = function(obj, event, args){
  args = args || [];
  _.invoke(obj[event+"Listener"], "apply", obj, args);
};

Snix.Event.on = function(obj, event, fun, bind){
  obj[event+"Listener"].push(_.bind(fun, bind||obj));
  return obj;
};

Snix.Event.one = function(obj, event, fun, bind){
  var f = function(){
    obj[event+"Listener"] = _.without(obj[event+"Listener"], f);
    fun.apply(bind||obj, arguments);
  };
  obj[event+"Listener"].push(f);
  return obj;
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



Snix.validator = function(){
  var v = Snix.val({});

  v.clear = function(){
    this({});
  };

  v.validate = function(rules, context){
    var entries = {};
    for(var key in rules){
      if(!rules[key].apply(context))
        entries[key] = true;
    }
    this(entries);

    return this.isEmpty();
  };

  v.field = function(key){
    var self = this;
    return {
      isInvalid: function(){
        return self.isInvalid(key);
      }
    };
  };

  v.isInvalid = function(key){
    return this()[key] == true;
  };

  v.isEmpty = function(){
    return _.size(this()) == 0;
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

Snix.array = function(value){
  value = arguments.length > 0 ? value : [];

  if(!_.isArray(value))
    throw "not an array";

  var v = Snix.val(value);

  v.convert = function(val){
    if(!_.isArray(val))
      throw "not an array";

    return val;
  };

  v.add = function(entry){
    this().push(entry);
  };

  v.remove = function(entry){
    this(_.without(this(), entry));
  };

  v.size = function(){
    return this().length;
  };

  v.clear = function(){
    this([]);
  };

  var asc = false;
  v.sort = function(attributeName){
    if(!attributeName)
      throw "missing sort attribute";

    asc = !asc;

    this().sort(function(a,b){
      var v1 = Snix.unwrap((asc ? a : b)[attributeName]);
      var v2 = Snix.unwrap((asc ? b : a)[attributeName]);
      return ((v1 == v2) ? 0 : ((v1 < v2) ? -1 : 1));
    });

    Snix.Event.trigger(this, "change", [this(), this()]);
  };

  v.isEmpty = function(){
    return this.size() == 0;
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