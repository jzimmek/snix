"use strict";

var Snix = {};

// --------------------------------
// Snix.JQuery
// --------------------------------

(function(){
  if(jQuery){
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

// --------------------------------
// Snix.Value
// --------------------------------

Snix.Value = function(valueProvider){

  if(arguments.length == 0 || valueProvider === undefined)
    throw "missing valueProvider";

  this.id = _.uniqueId();

  this.dependants = [];
  this.dependencies = [];

  this.isValueAssigned = false;
  this.value = null;

  this.valueProvider = valueProvider;

  this.dispose = function(release){
    for(var i=0; i < this.dependencies.length; i++){
      this.dependencies[i].dependants = _.without(this.dependencies[i].dependants, this);
    }
    this.dependencies = [];

    if(release){
      this.dependants = null;
      this.dependencies = null;
      this.isValueAssigned = null;
      this.value = null;
      this.valueProvider = null;
      this.get = function(){ throw "disposed"; };
      this.set = function(){ throw "disposed"; };
    }
  };

  this.triggerDependants = function(){
    var modifiedArr = [this];
    var modified = null;

    while(modified = modifiedArr.splice(0, 1)[0]){
      for(var i=0; i < modified.dependants.length; i++){
        var dep = modified.dependants[i];
        var vp = dep.valueProvider;

        var newValue = vp();
        if(newValue !== dep.value){
          dep.value = newValue;
          modifiedArr.push(dep);
        }
      }
    }
  };

  this.convert = function(value){
    return value;
  };

  this.set = function(newValue){
    newValue = this.convert(newValue);

    if(this.value !== newValue){
      this.value = newValue;
      this.isValueAssigned = true;

      this.triggerDependants();
    }
  };

  this.provideValue = function(){
    return typeof(this.valueProvider) == "function" ? this.valueProvider() : this.valueProvider;
  };

  this.trackCaller = function(){
    if(Snix.__caller__){      
      if(!_.include(this.dependants, Snix.__caller__))      this.dependants.push(Snix.__caller__);
      if(!_.include(Snix.__caller__.dependencies, this))    Snix.__caller__.dependencies.push(this);
    }
  };

  this.get = function(){
    this.trackCaller();

    if(!this.isValueAssigned){
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
    return f;
  };
};

// --------------------------------
// Snix.Types
// --------------------------------

Snix.Types = {};

Snix.Types.val = function(value){
  value = arguments.length > 0 ? value : null;
  var v = new Snix.Value(value);
  // v.get();

  return v.fun();
};

Snix.Types.boolean = function(value){
  var v = new Snix.Value(value);
  v.convert = function(val){
    return (val == null) ? null : (val == true || val == "true" || val == "yes");
  };

  return v.fun();
};

Snix.Types.int = function(value){
  var v = new Snix.Value(value);
  v.convert = function(val){
    return (val == null) ? null : parseInt(val, 10);
  };

  return v.fun();  
};

Snix.Types.float = function(value){
  var v = new Snix.Value(value);
  v.convert = function(val){
    return (val == null) ? null : parseFloat(val);
  };

  return v.fun();  
};

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

  f.add = function(entry){
    var arr = v.get();
    arr.push(entry);

    v.triggerDependants();
  };

  f.remove = function(entry){
    var arr = v.get();
    var newArr = _.without(arr, entry);
    v.set(newArr);
  };

  f.size = function(){
    return v.get().length;
  };

  f.clear = function(){
    v.set([]);
  };

  f.isEmpty = function(){
    return v.get().length == 0;
  };

  return f;
};

Snix.Types.compute = function(fun, context, opts){
  context = context || this;
  opts = _.defaults(opts || {}, {lazy: false});

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

Snix.Types.enu = function(){
  var entries = [];
  for(var i=0; i < arguments.length; i++){
    var e = {id: i, name: arguments[i]};
    e.toString = function(){
      return this.name;
    };

    entries.push(e);
  }

  var f = function(){
    if(arguments.length == 0){
      return entries;
    }else{
      var entry = _.where(entries, {name: arguments[0]})[0];
      if(!entry)
        throw "unknown in enumeration: " + arguments[0];

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
    c.forceEvalValue();
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
    c.forceEvalValue();
  };

  return v;
};

Snix.Types.errors = function(){
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

  v.isEmpty = function(){
    return _.size(this()) == 0;
  };

  return v;
};

_.each(Snix.Types, function(fun, key){
  Snix[key] = fun;
});

// --------------------------------
// Snix.Binding
// --------------------------------


Snix.Binding = {};

Snix.Binding.idOf = function(any){
  return ((typeof(any) == "string" || typeof(any) == "number") ? any : any.id).toString();
};

Snix.Binding.parse = function(str){
  return _.map(str.split(";"), function(s){
    var idx = s.indexOf(":");

    var key = s.substring(0, idx).replace(/\s/g, "");
    var val = s.substring(idx+1,s.length).replace(/^(\s)*/g, "");

    return [key, val];
  });
};

Snix.Binding.accessor = function(expr, context, vars){
  expr = expr.replace(/@/g, "this.");
  return function(){
    try{
      if(arguments.length == 0)   return new Function(_.keys(vars), "return " + expr).apply(context, _.values(vars));
      else                        return new Function(_.keys(vars).concat(["value"]), expr + "(value);").apply(context, _.values(vars).concat([arguments[0]]));
    }catch(e){
      console.error(e, expr, context, vars);
      throw "expr: " + expr + ", err: " + e;
    }
  };
};

Snix.Binding.binden = function(context, el, vars){
  vars = arguments.length > 2 ? vars : {};

  _.each($(el).toArray(), function(el){
    var bindingAttr = $(el).attr("data-bind");

    if(bindingAttr){
      var bindingsArr = Snix.Binding.parse(bindingAttr);
      _.each(bindingsArr, function(arr){
        var bindingName = arr[0], bindingExpr = arr[1];

        var acc = Snix.Binding.accessor(bindingExpr, context, vars);
        var binding = Snix.Bindings[bindingName];

        if(!binding)
          throw "unknown binding: " + bindingName;

        var bindingContext = {context: context, vars: vars};

        if(binding.init)
          binding.init.apply(bindingContext, [el, acc]);

        if(binding.update){
          var compute = Snix.compute(function(){
            // console.info("updating: ", bindingName, bindingExpr);
            binding.update.apply(bindingContext, [el, acc]);
          }, this, {lazy: true});

          $(el).on("destroyed", function(){
            compute.dispose(true);
          });

          // var start = new Date().getTime();
          compute();
          // var end = new Date().getTime();

          // console.info(bindingName + "," + bindingExpr + " --- " + (end - start));
        }
      });
    }else{
      $(el).children().each(function(){
        Snix.Binding.binden(context, this, vars);
      });
    }
  });
};


// --------------------------------
// Snix.Bindings
// --------------------------------

Snix.Bindings = {};

Snix.Bindings["check"] = {
  init: function(el, accessor){
    $(el).on("change", function(){
      accessor($(el).is(":checked"));
    });
  },
  update: function(el, accessor){
    if(Snix.unwrap(accessor()))   $(el).attr("checked", "checked");
    else                          $(el).removeAttr("checked");
  }
};

Snix.Bindings["click"] = {
  init: function(el, accessor){
    $(el).on("click", function(e){
      e.preventDefault();
      accessor();
    });
  }
};

Snix.Bindings["css"] = {
  update: function(el, accessor){
    var opts = Snix.unwrap(accessor());

    for(var key in opts){
      if(opts[key]) $(el).addClass(key);
      else          $(el).removeClass(key);
    }
  }
};

Snix.Bindings["date"] = {
  init: function(el, accessor){
    var opts = Snix.unwrap(accessor());
    opts.caption = opts.caption || {year: "Year", month: "Month", day: "Day"};

    $(el).empty();

    var now = moment();
    var entries = [["year", now.year() - 80, now.year() + 10, opts.caption.year], ["month", 1, 12, opts.caption.month], ["day", 1, 31, opts.caption.day]];

    _.each(entries, function(entry){
      var select = $("<select class='"+entry[0]+"'></select>");
      select.append("<option value='-1'>"+entry[3]+"</option>");

      for(var i=entry[1]; i<=entry[2]; i++){
        var label = (i < 10) ? ("0"+i) : i;
        $("<option value="+i+">"+label+"</option>").appendTo(select);
      }
      select.appendTo(el);

      $(select).on("change", function(){

        var year = parseInt($("select.year option:selected", el).val(), 10);
        var month = parseInt($("select.month option:selected", el).val(), 10);
        var day = parseInt($("select.day option:selected", el).val(), 10);

        if(year != -1 && month != -1 && day != -1){
          opts.moment(moment(new Date(year, month-1, day)).startOf('day'));
        }else{
          if(Snix.unwrap(opts.moment)){
            $("select option[value='-1']", el).attr("selected", "selected");
            opts.moment(null);
          }
        }

      });
    });
  },
  update: function(el, accessor){
    var opts = Snix.unwrap(accessor());
    var mom = Snix.unwrap(opts.moment);

    if(mom){
      $("select.year option[value='"+mom.year()+"']", el).attr("selected", "selected");
      $("select.month option[value='"+(mom.month()+1)+"']", el).attr("selected", "selected");
      $("select.day option[value='"+mom.date()+"']", el).attr("selected", "selected");
    }else{
      $("select option[value='-1']", el).attr("selected", "selected");
    }
  }
};

Snix.Bindings["log"] = {
  update: function(el, accessor){
    if(window.console)
      window.console.log(Snix.unwrap(accessor()));
  }
};

Snix.Bindings["loop"] = {
  init: function(el, accessor){
    this.tpl = $(el).html();
    $(el).empty();
  },
  update: function(el, accessor){
    var opts = accessor();
    var entries = Snix.unwrap(opts.entries);

    var ids = _.map(entries, function(e){ 
      var id = Snix.Binding.idOf(e);

      if(!id)
        throw "loop expects an id attribute for each entry";

      return id;
    });
    var elIds = $("> [data-id]", el).map(function(){ return $(this).attr("data-id"); }).toArray();

    if(ids.length == elIds.length && ids.toString() != elIds.toString()){
      // same element but different sorting
      $(el).empty();
    }

    // TODO: $(el).empty(); does not refresh elIds - optimize

    if(elIds.length > 0){
      // remove dom elements bound to object which no longer exist
      var removeSelector = _(elIds).chain().difference(ids).map(function(e){ return "[data-id='"+e+"']"; }).value().join(",");
      $(removeSelector, el).remove();
    }

    _.each(ids, function(id){
      if(!_.include(elIds, id)){
        // create dom elements
        var entry = _.detect(entries, function(e){ return Snix.Binding.idOf(e) == id; });

        var child = $(this.tpl);
        child.attr("data-id", id);
        child.appendTo(el);

        var newVars = _.defaults({}, this.vars);
        newVars[opts.as] = entry;

        Snix.call(function(){
          Snix.Binding.binden(this.context, child, newVars);
        }, null, this);
      }

    }, this);
  }
};

Snix.Bindings["radio"] = {
  init: function(el, accessor){
    var opts = accessor();

    $(el).on("change", function(){
      var selectedId = $(this).attr("data-id");
      opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.Binding.idOf(e) == selectedId; }));
    });

    $(el).attr("data-id", Snix.Binding.idOf(opts.entry));
  },
  update: function(el, accessor){
    var opts = accessor();
    var selected = Snix.unwrap(opts.selected);

    if(selected){
      $(el).parents("form").find("input[name='"+$(el).attr("name")+"'][data-id='"+Snix.Binding.idOf(selected)+"']").attr("checked", "checked");
    }else{
      $(el).parents("form").find("input[name='"+$(el).attr("name")+"']").removeAttr("checked");
    }
  }
};

Snix.Bindings["select"] = {
  init: function(el, accessor){
    var opts = accessor();

    if(opts.multiple)
      $(el).attr("multiple", "multiple");

    $(el).on("change", function(){
      var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

      if(opts.multiple){
        var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

        if(selectedIds.length == 0)   opts.selected([]);
        else                          opts.selected(_.select(Snix.unwrap(opts.entries), function(e){ return _.include(selectedIds, Snix.Binding.idOf(e)); }));
      }else{
        var selectedId = $("option:selected", el).attr("value");
        
        if(selectedId == -1)    opts.selected(null);
        else                    opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.Binding.idOf(e) == selectedId; }));
      }
    });
  },
  update: function(el, accessor){
    var opts = accessor();
    $(el).empty();

    if(!opts.multiple){
      var caption = Snix.unwrap(opts.caption) || "Please Choose";
      $("<option value='-1'>"+caption+"</option>").appendTo(el);
    }

    var labelKey = Snix.unwrap(opts.label);

    _.each(Snix.unwrap(opts.entries), function(e){
      var label = (labelKey ? Snix.unwrap(e[labelKey]) : e.toString());
      $("<option value='"+Snix.Binding.idOf(e)+"'>"+label+"</option>").appendTo(el);
    });

    var selected = Snix.unwrap(opts.selected);

    if(opts.multiple){
      // array
      if(selected)
        _.each(selected, function(e){
          $("option[value='"+Snix.Binding.idOf(e)+"']", el).attr("selected", "selected");
        });
    }else{
      // object
      if(selected)  $("option[value='"+Snix.Binding.idOf(selected)+"']", el).attr("selected", "selected");
      else          $("option[value='-1']", el).attr("selected", "selected");
    }

  }
};

Snix.Bindings["text"] = {
  update: function(el, accessor){
    $(el).text(Snix.unwrap(accessor()));
  }
};

Snix.Bindings["toggle"] = {
  init: function(el, accessor){
    this.tpl = $(el).html();
  },
  update: function(el, accessor){
    if(Snix.unwrap(accessor())){
      $(el).empty().show();

      var child = $(this.tpl);
      child.appendTo(el);

      var newVars = _.defaults({}, this.vars);

      Snix.call(function(){
        Snix.binden(this.context, child, newVars);
      }, null, this);
    }else{
      $(el).hide().empty();
    }
  }
};

Snix.Bindings["value"] = {
  init: function(el, accessor){
    $(el).on("change", function(){
      accessor($(this).val());
    });
  },
  update: function(el, accessor){
    $(el).val(Snix.unwrap(accessor()));
  }
};
