var Snix = {};

Snix.__caller__ = null;

Snix.val = function(initial){
  return new Snix.Value(arguments.length > 0 ? initial : null).boundFun();
};

Snix.compute = function(reader, context, writer){
  var evaluated = false;
  var v = new Snix.Value(null);

  var origSet = v.set;
  var origGet = v.get;

  v.set = function(newValue){
    if(writer)  writer(newValue);
    else        throw "compute does not have a writer";
  };

  v.get = function(){
    if(!evaluated){
      evaluated = true;
      this.evalValue();
    }

    return origGet.apply(this);
  };

  v.evalValue = function(){
    if(!this.isDisposed){
      Snix.callAs(function(){
        origSet.apply(v, [reader.apply(context)]);
      }, v);
    }
  };

  return v.boundFun().tap(function(){
    this.forceEvalValue = _.bind(v.evalValue, v);
  });
};

Snix.callAs = function(fun, caller, context){
  var prevCaller = Snix.__caller__;
  Snix.__caller__ = caller;
  fun.apply(context||this);
  Snix.__caller__ = prevCaller;
};

Snix.unwrap = function(value){
  return value && value.__Snix__ ? Snix.unwrap(value()) : value;
};

Snix.idOf = function(any){
  return ((typeof(any) == "string" || typeof(any) == "number") ? any : any.id).toString();
};
(function(){

Snix.bindings = {};

Snix.parse = function(str){
  return _.map(str.split(";"), function(s){
    var idx = s.indexOf(":");

    var key = s.substring(0, idx).replace(/\s/g, "");
    var val = s.substring(idx+1,s.length).replace(/^(\s)*/g, "");

    return [key, val];
  });
};

Snix.accessor = function(expr, context, vars){
  expr = expr.replace(/@/g, "this.");
  return function(){
    var code = null;
    try{
      if(arguments.length == 0)   return new Function(_.keys(vars), "return " + expr).apply(context, _.values(vars));
      else                        return new Function(_.keys(vars).concat(["value"]), expr + "(value);").apply(context, _.values(vars).concat([arguments[0]]));
    }catch(e){
      throw "expr: " + expr + ", err: " + e;
    }
  };
};

Snix.binden = function(context, el, vars){
  vars = arguments.length > 2 ? vars : {};

  _.each($(el).toArray(), function(el){
    var bindingAttr = $(el).attr("data-bind");

    if(bindingAttr){
      var bindingsArr = Snix.parse(bindingAttr);
      _.each(bindingsArr, function(arr){
        var bindingName = arr[0], bindingExpr = arr[1];

        var acc = Snix.accessor(bindingExpr, context, vars);
        var binding = Snix.bindings[bindingName];

        if(!binding)
          throw "unknown binding: " + bindingName;

        var bindingContext = {context: context, vars: vars};

        if(binding.init)
          binding.init.apply(bindingContext, [el, acc]);

        if(binding.update){
          var compute = Snix.compute(function(){
            // console.info("updating: ", bindingName, bindingExpr);
            binding.update.apply(bindingContext, [el, acc]);
          });

          $(el).on("destroyed", function(){
            compute.dispose(true);
          });

          compute();
        }
      });
    }else{
      $(el).children().each(function(){
        Snix.binden(context, this, vars);
      });
    }
  });
};

}());


(function(){

Snix.bindings["check"] = {
  init: function(el, accessor){
    $(el).on("change", function(){
      accessor($(el).is(":checked"));
    });
  },
  update: function(el, accessor){
    if(Snix.unwrap(accessor()))   $(el).attr("checked", "checked");
    else                              $(el).removeAttr("checked");
  }
};

}());


(function(){

Snix.bindings["click"] = {
  init: function(el, accessor){
    $(el).on("click", function(e){
      e.preventDefault();
      accessor();
    });
  }
};
}());


(function(){

Snix.bindings["css"] = {
  update: function(el, accessor){
    var opts = Snix.unwrap(accessor());

    for(var key in opts){
      if(opts[key]) $(el).addClass(key);
      else          $(el).removeClass(key);
    }
  }
};
}());


(function(){

Snix.bindings["date"] = {
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
}());


(function(){

Snix.bindings["log"] = {
  update: function(el, accessor){
    if(window.console)
      window.console.log(Snix.unwrap(accessor()));
  }
};

}());


(function(){

Snix.bindings["loop"] = {
  init: function(el, accessor){
    this.tpl = $(el).html();
    $(el).empty();
  },
  update: function(el, accessor){
    var opts = accessor();

    var entries = Snix.unwrap(opts.entries);

    var ids = _.map(entries, function(e){ 
      if(!e.id)
        throw "loop expects an id attribute for each entry";

      return Snix.idOf(e); 
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
        var entry = _.detect(entries, function(e){ return Snix.idOf(e) == id; });

        var child = $(this.tpl);
        child.attr("data-id", id);
        child.appendTo(el);

        var newVars = _.defaults({}, this.vars);
        newVars[opts.as] = entry;

        Snix.callAs(function(){
          Snix.binden(this.context, child, newVars);
        }, null, this);
      }

    }, this);
  }
};

}());


(function(){

Snix.bindings["radio"] = {
  init: function(el, accessor){
    var opts = accessor();

    $(el).on("change", function(){
      var selectedId = $(this).attr("data-id");
      opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
    });

    $(el).attr("data-id", Snix.idOf(opts.entry));
  },
  update: function(el, accessor){
    var opts = accessor();
    var selected = Snix.unwrap(opts.selected);

    if(selected){
      $(el).parents("form").find("input[name='"+$(el).attr("name")+"'][data-id='"+Snix.idOf(selected)+"']").attr("checked", "checked");
    }else{
      $(el).parents("form").find("input[name='"+$(el).attr("name")+"']").removeAttr("checked");
    }
  }
};
}());


(function(){

Snix.bindings["select"] = {
  init: function(el, accessor){
    var opts = accessor();

    if(opts.multiple)
      $(el).attr("multiple", "multiple");

    $(el).on("change", function(){
      var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

      if(opts.multiple){
        var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

        if(selectedIds.length == 0)   opts.selected(null);
        else                          opts.selected(_.select(Snix.unwrap(opts.entries), function(e){ return _.include(selectedIds, Snix.idOf(e)); }));
      }else{
        var selectedId = $("option:selected", el).attr("value");
        
        if(selectedId == -1)    opts.selected(null);
        else                    opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
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
      $("<option value='"+Snix.idOf(e)+"'>"+label+"</option>").appendTo(el);
    });

    var selected = Snix.unwrap(opts.selected);

    if(opts.multiple){
      // array
      if(selected)
        _.each(selected, function(e){
          $("option[value='"+Snix.idOf(e)+"']", el).attr("selected", "selected");
        });
    }else{
      // object
      if(selected)  $("option[value='"+Snix.idOf(selected)+"']", el).attr("selected", "selected");
      else          $("option[value='-1']", el).attr("selected", "selected");
    }

  }
};
}());


(function(){

Snix.bindings["text"] = {
  update: function(el, accessor){
    $(el).text(Snix.unwrap(accessor()));
  }
};

}());


(function(){

Snix.bindings["toggle"] = {
  init: function(el, accessor){
    this.tpl = $(el).html();
  },
  update: function(el, accessor){
    if(Snix.unwrap(accessor())){
      $(el).empty().show();

      var child = $(this.tpl);
      child.appendTo(el);

      var newVars = _.defaults({}, this.vars);

      Snix.callAs(function(){
        Snix.binden(this.context, child, newVars);
      }, null, this);
    }else{
      $(el).hide().empty();
    }
  }
};
}());


(function(){

Snix.bindings["value"] = {
  init: function(el, accessor){
    $(el).on("change", function(){
      accessor($(this).val());
    });
  },
  update: function(el, accessor, context, vars){
    $(el).val(Snix.unwrap(accessor()));
  }
};

}());


(function(){

Snix.jQuery = function(){
  var oldClean = jQuery.cleanData;

  $.cleanData = function(elems){
    for(var i=0, elem; (elem = elems[i]) !== undefined; i++ ){
      jQuery(elem).triggerHandler("destroyed");
    }
    oldClean(elems);
  };
};

}());


(function(){

Snix.array = function(initial){
  var v = new Snix.Value(arguments.length > 0 ? initial : []);

  return v.boundFun().tap(function(){
    this.add = function(entry){
      v.fun(_.union(v.fun(), [entry]));
      return this;
    };

    this.remove = function(entry){
      v.fun(_.without(v.fun(), entry));
      return this;
    };

    this.clear = function(){
      v.fun([]);
      return this;
    };

    this.size = function(){
      return v.fun().length;
    };

    this.isEmpty = function(){
      return v.fun().length == 0;
    };
  });
};
}());


(function(){

Snix.enu = function(){
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

}());


(function(){

Snix.errors = function(){
  var v = new Snix.Value({});

  return v.boundFun().tap(function(){

    this.clear = function(){
      this({});
    };

    this.validate = function(rules, context){
      var entries = {};
      for(var key in rules){
        if(!rules[key].apply(context))
          entries[key] = true;
      }
      this(entries);

      return this.isEmpty();
    };

    this.isEmpty = function(){
      return _.size(this()) == 0;
    };

  });
};

}());


(function(){

Snix.remote = function(urlFun, valueFun){
  var v = Snix.val(null);

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var c = Snix.compute(function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url)
      $.getJSON(url.toString()).success(function(data){
        v(valueFun(data));
      });

    return null;
  });

  c();

  // force a reload
  v.reload = function(){
    c.forceEvalValue();
  };

  return v;
};

Snix.remoteArray = function(urlFun, valueFun){
  var v = Snix.array([]);

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var c = Snix.compute(function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url)
      $.getJSON(url.toString()).success(function(data){
        v(_.map(data, valueFun));
      });

    return null;
  });

  c();

  // force a reload
  v.reload = function(){
    c.forceEvalValue();
  };

  return v;
};
}());


(function(){

var typed = function(initial, typeFun){
  var v = new Snix.Value(arguments.length > 0 ? initial : null);
  var origSet = v.set;

  v.set = function(newValue){
    origSet.apply(v, [typeFun(newValue)]);
  };

  return v.boundFun();
};

Snix.intVal = function(initial){
  return typed(initial, function(newValue){
    return newValue == null ? null : parseInt(newValue, 10);
  });
};

Snix.floatVal = function(initial){
  return typed(initial, function(newValue){
    return newValue == null ? null : parseFloat(newValue);
  });
};

Snix.boolVal = function(initial){
  return typed(initial, function(newValue){
    return newValue == null ? null : (newValue == true || newValue == "true" || newValue == "yes");
  });
};
}());


(function(){

Snix.Value = function(initial){
  this.value = initial;
  this.dependants = [];
  this.isDisposed = false;
  this.subscriptions = [];
};
Snix.Value.prototype.get = function(){
  this.trackCaller();
  return this.value;
};
Snix.Value.prototype.set = function(newValue){
  if(this.value !== newValue){
    this.value = newValue;
    this.dependants = _.reject(this.dependants, function(e){ return e.isDisposed; });
    _.invoke(this.dependants, "evalValue");
  }
};
Snix.Value.prototype.trackCaller = function(){
  if(Snix.__caller__ != null && !_.include(this.dependants, Snix.__caller__))
    this.dependants.push(Snix.__caller__);
};
Snix.Value.prototype.fun = function(){
  if(arguments.length == 0)   return this.get();
  else                        this.set(arguments[0]);
};

Snix.Value.prototype.dispose = function(nullValue){
  this.isDisposed = true;
  if(nullValue)
    this.value = null;
};

Snix.Value.prototype.notifySubscriber = function(){
  _.each(this.subscriptions, function(arr){
    arr[0].apply(arr[1]);
  });
};

Snix.Value.prototype.subscribe = function(subscriber, context){
  this.subscriptions.push([subscriber, context||this]);
};

Snix.Value.prototype.unsubscribe = function(subscriber){
  this.subscriptions = _.reject(this.subscriptions, function(e){ return e[0] === subscriber; });
};

Snix.Value.prototype.boundFun = function(){
  var bound = _.bind(this.fun, this);
  bound.dispose = _.bind(this.dispose, this);
  bound.__Snix__ = true;
  bound.tap = _.bind(function(fun){
    fun.apply(bound);
    return bound;
  }, this);

  return bound;
};
}());

