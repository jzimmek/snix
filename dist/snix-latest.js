"use strict";

// **Snix** is JavaScript library that helps you to create ambitious web applications. It is built around the "Reactive programming" paradigm and is heavily influenced by frameworks like Backbone, Knockout and Ember.
//
//### Features
// * **Declarative bindings** - easily connect your UI with your data model
// * **Dependency tracking** - automatically propagate changes in your data model and updates relevant parts in your UI
//
//### Modules
// * **Types** - commonly used data types (int, float, array, etc.)
// * **Bindings** - bunch of ready to use UI-bindings
// * **Binding API** - simply create your own UI-bindings

if(typeof(window) == "undefined")
  var _ = require("underscore")._;

var Snix = {};

//### Integration
// Snix uses JQuery, Underscore and Moment internally.

(function(){
  if(typeof(jQuery) != "undefined"){
    var oldClean = jQuery.cleanData;

    jQuery.cleanData = function(elems){
      for(var i=0, elem; (elem = elems[i]) !== undefined; i++ ){
        jQuery(elem).triggerHandler("destroyed");
      }
      oldClean(elems);
    };  
  }
})();

// --------------------------------
// Snix.Util
// --------------------------------

Snix.idOf = function(any){
  return ((typeof(any) == "string" || typeof(any) == "number") ? any : Snix.unwrap(any.id)).toString();
};

Snix.call = function(fun, caller, context){
  var prevCaller = Snix.__caller__;
  Snix.__caller__ = caller;
  fun.apply(context);
  Snix.__caller__ = prevCaller;
};
Snix.__caller__ = null;

Snix.unwrap = function(any){
  return any && any.__snix__ ? this.unwrap(any()) : any;
};

(function(){
  var rename = function(any, fun, visited){
    visited = visited || [];

    if(any == null || _.include(visited, any))
      return null;

    switch(typeof(any)){
      case "number":
      case "date":
      case "string":
      case "function":
      case "boolean":
        return any;
      case "object":
        visited.push(any);
        if(any instanceof Array){
          for(var i=0; i < any.length; i++){
            any[i] = rename(any[i], fun, visited);
          }
        }else{
          for(var key in any){
            var val = any[key];
            delete any[key];

            any[fun(key)] = rename(val, fun, visited);
          }
        }
        return any;
    }
  };

  Snix.toCamelCase = function(any){
    return rename(any, function(key){
      return key.replace(/(_[a-z])/g, function($1){ return $1.toUpperCase().replace("_",""); });
    });
  };

  Snix.toUnderscore = function(any){
    return rename(any, function(key){
      return key.replace(/([A-Z])/g, function($1){ return "_"+$1.toLowerCase(); });
    });
  };
  
})();


// --------------------------------
// Snix.Value
// --------------------------------

Snix.useGC = false;
Snix.logGC = false;
Snix.objectCnt = 0;

Snix.Value = function(valueProvider){

  console.info("-------- NEW");

  if(arguments.length == 0 || valueProvider === undefined)
    throw "missing valueProvider";

  var self = this;

  var runGC = function(){
    if(!self.isDisposed){
      console.info("GC ["+self.id+"]");
      var len = self.dependants.length;
      self.dependants = _.reject(self.dependants, function(dep){
        return dep.isDisposed;
      });

      if(Snix.logGC && self.dependants.length != len)
        console.info("snix gc["+self.id+"]: " + (len - self.dependants.length));

      setTimeout(runGC, 3000);
    }
  };

  if(Snix.useGC)
    setTimeout(runGC, 3000);

  // Each snix value has a unique id
  this.id = _.uniqueId();

  // Values which have this value as dependency
  this.dependants = [];
  // Has a value assigned to this
  this.isValueAssigned = false;
  // The underlying value this value object represents
  this.value = null;
  // A primitive value or function to provide a value for this
  this.valueProvider = valueProvider;

  this.isDisposed = false;

  // Stops any dependency tracking, propagation of state and release resources.
  this.dispose = function(){
    this.isDisposed = true;
    Snix.objectCnt--;

    _.each(this.dependants, function(dep){
      if(!dep.isDisposed)
        dep.dispose();
    });

    this.dependants = [];

    // if(release){
      // This value is not used by application code any more
      this.dependants = null;
      this.isValueAssigned = null;
      this.value = null;
      this.valueProvider = null;
      this.get = function(){ throw "disposed"; };
      this.set = function(){ throw "disposed"; };
    // }
  };

  // All values which depend on this value will be recomputed.
  this.triggerDependants = function(){
    var modifiedArr = [this];
    var modified = null;

    // Loop while modified values exist
    while(modified = modifiedArr.splice(0, 1)[0]){

      modified.dependants = _.reject(modified.dependants, function(e){
        return e.isDisposed == true;
      });

      // Loop for any dependant in same order as they has been added
      for(var i=0; i < modified.dependants.length; i++){
        var dep = modified.dependants[i];

        // The __caller__ depends on this - prevent "Too much recursion" errors
        if(dep == Snix.__caller__)
          continue;

        var vp = dep.valueProvider;

        // Get a new value of the dependant value
        var newValue = vp();
        if(newValue !== dep.value){
          // Update the dependants value property if the new value is not equal to the existing one
          dep.value = newValue;
          // The dependants value has changed. Add it to the list of modified values, to let the dependants of the dependant recompute as well.
          modifiedArr.push(dep);
        }
      }
    }
  };

  // Specific types (e.g. int, float, etc.) can override this method to convert the passed value as needed
  this.convert = function(value){
    return value;
  };

  // Sets the passed new value as underlying value
  this.set = function(newValue){
    // Give types a chance to convert the passed value
    newValue = this.convert(newValue);

    // Ignore new values which are equal to the existing one
    if(this.value !== newValue){
      // Update the underlying value property
      this.value = newValue;
      // A value has been assigned
      this.isValueAssigned = true;
      // Trigger all values which depends on this value
      this.triggerDependants();
    }
  };

  // Returns valueProvider as value if it is not a function, otherwise invoke valueProvider and return the result as value
  this.provideValue = function(){
    return typeof(this.valueProvider) == "function" ? this.valueProvider() : this.valueProvider;
  };

  this.trackCaller = function(){
    // Does any __caller__ exist ?
    if(Snix.__caller__){
      // __caller__ will be added to the dependants of this unless already added.
      if(!_.include(this.dependants, Snix.__caller__))      this.dependants.push(Snix.__caller__);
    }
  };

  // Returns the underlying value of this
  this.get = function(){
    // Make sure any __caller__ will be tracked 
    this.trackCaller();

    if(!this.isValueAssigned){
      // This value has not been assigned any underlying value, invoke provideValue to set one.
      this.isValueAssigned = true;
      this.set(this.provideValue());
    }

    return this.value;
  };

  this.fun = function(){
    var self = this;
    var f = function(){
      if(arguments.length == 0)   return self.get();
      else                        self.set(arguments[0]);

      return f;
    };
    f.__value__ = this;
    f.dispose = function(){
      self.dispose.apply(self, arguments);
    };
    f.__snix__ = true;
    f.toJSON = function(){
      var v = self.get();
      return (v && v.toJSON) ? v.toJSON() : v;
    };

    var subscriptions = [];

    f.subscribe = function(fun, context){
      var c = Snix.compute(function(){
        var value = self.get();
        Snix.call(function(){
          fun.apply(context, [value]);
        }, null, context);
      });
      subscriptions.push([fun, c]);
      c();
      return this;
    };

    f.unsubscribe = function(fun){
      var s = _.detect(subscriptions, function(e){
        return e[0] == fun;
      });
      s[1].dispose();
      subscriptions = _.without(subscriptions, s);
      return this;
    };

    Snix.objectCnt++;

    return f;
  };
};

//### Types

Snix.Types = {};

// **val** - use the value as is without any convert.
Snix.Types.val = function(value){
  value = arguments.length > 0 ? value : null;
  var v = new Snix.Value(value);

  return v.fun();
};

// **boolean** - converts the passed value into a boolean. true if it is true, "true" or "yes", false otherwise.
Snix.Types.boolean = function(value){
  var v = new Snix.Value(value);
  v.convert = function(val){
    return (val == null) ? null : (val == true || val == "true" || val == "yes");
  };

  return v.fun();
};

// **int** - converts the passed value into an int using parseInt.
Snix.Types.int = function(value){
  var v = new Snix.Value(value);
  v.convert = function(val){
    return (val == null) ? null : parseInt(val, 10);
  };

  return v.fun();  
};

// **float** - converts the passed value into a float using parseFloat.
Snix.Types.float = function(value){
  var v = new Snix.Value(value);
  v.convert = function(val){
    return (val == null) ? null : parseFloat(val);
  };

  return v.fun();  
};

Snix.Types.moment = function(value){
  var v = new Snix.Value(value);
  var fun = v.fun();
  
  fun.toJSON = function(){
    var val = v.get();

    if(val == null)
      return null;

    val = val.toDate();

    return (val && val.toJSON) ? val.toJSON() : val;
  };

  // v.convert = function(val){
  //   return (val == null) ? null : moment(val);
  // };

  return fun;
};

// **array** - the value will treated as an array. fails if value is not of type array. adds several array specific methods.
Snix.Types.array  = function(value){
  value = arguments.length > 0 ? value : [];

  if(!_.isArray(value))
    throw "not an array";

  var v = new Snix.Value(value);
  v.convert = function(val){
    if(!_.isArray(val))
      throw "not an array";

    return val;
  };

  var f = v.fun();

  // Adds the passed entry to the underlying array
  f.add = function(entry){
    var arr = v.get();
    arr.push(entry);

    v.triggerDependants();
  };

  // Removes the passed entry from the underlying array
  f.remove = function(entry){
    var arr = v.get();
    var newArr = _.without(arr, entry);
    v.set(newArr);
  };

  // Returns the size of the underlying array
  f.size = function(){
    return v.get().length;
  };

  // Removes all entries from the underlying array
  f.clear = function(){
    v.set([]);
  };

  // Returns true if the array contains no entries, false otherwise
  f.isEmpty = function(){
    return v.get().length == 0;
  };

  return f;
};

Snix.Types.compute = function(fun, context, opts){
  context = context || this;
  opts = _.defaults(opts || {}, {});

  var rawValueProvider = _.bind(fun, context);

  var valueProvider = function(){
    try{
      var prevCaller = Snix.__caller__;
      Snix.__caller__ = v;
      return rawValueProvider();
    }finally{
      Snix.__caller__ = prevCaller;
    }
  };

  var v = new Snix.Value(valueProvider);

  return v.fun();
};

// **enu** - a value which behaves like enumerated type in languages like java, etc. 
Snix.Types.enu = function(){
  var entries = [];

  // Loop over all arguments and create an entry (id, name) for each in this enum
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
      // Returns all entries in this enum
      return entries;
    }else{
      // Find an entry in this enum which name matches the passed argument
      var entry = _.where(entries, {name: arguments[0].toString()})[0];

      // Fails if no entry is found
      if(!entry)
        throw "unknown in enumeration: " + arguments[0].toString();

      return entry;
    }
  };

  return f;
};

Snix.Types.remote = function(urlFun, valueFun){
  var v = Snix.val(null);

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var c = Snix.compute(function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url)
      $.getJSON(url.toString()).success(function(data){
        v(valueFun(data));
      });

    return url;
  });


  c(); // trigger trackCaller

  v.reload = function(){
    v(null);
    c.__value__.isValueAssigned = false;
    c();
  };

  return v;
};

Snix.Types.remoteArray = function(urlFun, valueFun){
  var v = Snix.array();

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var c = Snix.compute(function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url)
      $.getJSON(url.toString()).success(function(data){
        v(_.map(data, valueFun));
      });

    return url;
  });

  c(); // trigger trackCaller

  // force a reload
  v.reload = function(){
    v([]);
    c.__value__.isValueAssigned = false;
    c();
  };

  return v;
};

Snix.Types.validator = function(){
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

Snix.Types.app = function(fun){
  var app = {};
  fun.apply(app, [Snix]);

  $(function(){
    Snix.Binding.binden(app, $("body")[0]);
  });

  return app;
};

Snix.Types.rest = function(url, fields){
  var fun = function(data){
    data = data || {};
    for(var key in fields){
      var arr = fields[key];
      var val = data[key] === undefined ? arr[1] : data[key];

      if(val != null && arr[2])
        val = arr[2].apply(val, [val]);

      this[key] = arr[0](val);
    }

    if(typeof(this.init) == "function")
      this.init();
  };

  var listeners = {
    "create": [],
    "save": [],
    "delete": []
  };

  fun.prototype.on = function(what, fun, context){
    listeners[what].push(_.bind(fun,context||this));
    return this;
  };

  fun.prototype.nestedUrl = function(nested){
    return url + "/" + this.id() + "/" + nested;
  };

  fun.prototype.delete = function(){
    var self = this;
    Snix.delete(url+"/"+this.id())
        .success(function(res){ 
          _.each(listeners.delete, function(e){ e.apply(this, [null, res, self]); });
        })
        .error(function(){ 
          _.each(listeners.delete, function(e){ e.apply(this, [true]); });
        });
    return this;
  };

  fun.prototype.create = function(){
    var self = this;
    Snix.post(url, _.omit(_.pick(this, _.keys(fields)), "id"))
        .success(function(res){ 
          _.each(listeners.create, function(e){ e.apply(this, [null, res, self]); });
        })
        .error(function(){ 
          _.each(listeners.create, function(e){ e.apply(this, [true]); });
        });
    return this;
  };

  fun.prototype.save = function(){
    var self = this;
    Snix.put(url+"/"+this.id(), _.omit(_.pick(this, _.keys(fields)), "id"))
        .success(function(res){ 
          _.each(listeners.save, function(e){ e.apply(this, [null, res, self]); });
        })
        .error(function(){ 
          _.each(listeners.save, function(e){ e.apply(this, [true]); });
        });
    return this;
  };

  return fun;
};

Snix.hasMany = function(obj, singular, plural, newFun){
  obj[plural] = s.array();

  var initialized = false;

  obj.id.subscribe(function(newValue){
    if(newValue != null && !initialized){
      initialized = true;

      var nestedUrl = this.nestedUrl(plural);

      var onNestedDelete = function(err, data, nested){
        if(err) return alert(singular+" - delete failed");
        this[plural].remove(nested);
      };

      var createNestedKey = "create" + singular[0].toUpperCase() + singular.substring(1);

      this[createNestedKey] = newFun(nestedUrl)
        .on("create", function(err, data, nested){
          if(err) return alert(createNestedKey+" - create failed");
          this[plural].add(newFun(nestedUrl, data).on("delete", onNestedDelete,this));
        }, this);

      s.get(nestedUrl).success(function(arr){
        this[plural](_.map(arr, function(data){
          return newFun(nestedUrl, data).on("delete", onNestedDelete, this);
        }, this));
      }, this);
    }
  }, obj);
};

Snix.Types.model = function(fields){
  return function(data){
    data = data || {};
    for(var key in fields){
      var arr = fields[key];
      var val = data[key] === undefined ? arr[1] : data[key];

      if(val != null && arr[2])
        val = arr[2].apply(val, [val]);

      this[key] = arr[0](val);
    }

    if(typeof(this.init) == "function")
      this.init();
  };
};

_.each(Snix.Types, function(fun, key){
  Snix[key] = fun;
});

if(typeof(window) == "undefined") 
  module.exports = Snix;