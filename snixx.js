// var _ = require("underscore")._;

var Snix = {};

// event

(function(){
  
  Event = {};

  var attr = function(event){
    return "_"+event+"Listener";
  };

  var on = function(event, fun, bind){
    this[attr(event)].push([fun, bind]);
    return this;
  };

  var off = function(event, fun){
    this[attr(event)] = _.reject(this[attr(event)], function(e){ return e[0] == fun; });
    return this;
  };

  var one = function(event, fun, bind){
    var self = this;

    var f = function(){
      self.off(event, f);
      fun.apply(bind, arguments);
    };

    return this.on(event, f);
  };

  var trigger = function(){
    var event = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1, arguments.length);

    _.each(this[attr(event)], function(e){
      e[0].apply(e[1]||this, args);
    }, this);
  };

  var proto = {
    on: on,
    one: one,
    off: off,
    trigger: trigger
  };

  Event.register = function(){
    var obj = arguments[0];

    for(var i=1; i < arguments.length; i++){
      obj["_"+arguments[i]+"Listener"] = [];
    }

    return _.extend(obj, proto);
  };

  Snix.Event = Event;

})();

// shell

(function(){

  var toJSON = function(){
    var v = this();
    return (v && v.toJSON) ? v.toJSON() : v;
  };

  var get = function(){
    Snix.ReRun.track(this);
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
      this.trigger("change", [newValue, oldValue]);
    }
    return this;
  };

  var proto = {
    toJSON: toJSON,
    get: get,
    set: set,
    convert: convert
  };

  Snix.shell = function(initial){
    var f = function(){
      if(arguments.length > 0)  return f.set(arguments[0]);
      else                      return f.get();
    };

    this.Event.register(f, "change");

    f.value = (arguments.length > 0 ? initial : null);
    f.__unwrap__ = true;

    return _.extend(f, proto);
  };

})();

// util

(function(){
  Snix.idOf = function(any){
    if(any == null)
      throw "illegal argument";

    return ((typeof(any) == "string" || typeof(any) == "number") ? any : this.unwrap(any.id)).toString();
  };

  Snix.unwrap = function(any){
    return any && any.__unwrap__ ? this.unwrap(any()) : any;
  };    
})();

// boolean

(function(){
  
  var convert = function(val){
    return (val == null) ? null : (val == true || val == "true" || val == "yes");
  };

  var proto = {
    convert: convert
  };

  Snix.boolean = function(value){
    value = arguments.length > 0 ? value : null;
    return _.extend(this.shell(value), proto);
  };

})();

// enu

(function(){

  var Enu = function(id, name){
    this.id = id;
    this.name = name.toString();
  };
  Enu.prototype.toJSON = function(){
    return this.name;
  };
  Enu.prototype.toString = function(){
    return this.name;
  };

  Snix.enu = function(){
    var entries = [];

    for(var i=0; i < arguments.length; i++){
      entries.push(new Enu(i, arguments[i]));
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
    f.__unwrap__ = true;

    return f;
  };  
})();

// float

(function(){

  var convert = function(val){
    return (val == null) ? null : parseFloat(val);
  };

  var proto = {
    convert: convert
  };

  Snix.float = function(value){
    value = arguments.length > 0 ? value : null;
    return _.extend(this.shell(value), proto);
  };
  
})();

// int

(function(){

  var convert = function(val){
    return (val == null) ? null : parseInt(val, 10);
  };

  var proto = {
    convert: convert
  };

  Snix.int = function(value){
    value = arguments.length > 0 ? value : null;
    return _.extend(this.shell(value), proto);
  };
  
})();

// moment

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
    value = arguments.length > 0 ? value : null;
    return _.extend(this.shell(value), proto);
  };
    
})();

// string

(function(){

  var convert = function(val){
    if(val == null)
      return null;

    return val.toString().replace(/^\s+|\s+$/g, "");
  };

  var proto = {
    convert: convert
  };

  Snix.string = function(value){
    value = arguments.length > 0 ? value : null;
    return _.extend(this.shell(value), proto);
  };
  
})();

// array

(function(){

  function add(entry){
    this(_.union(this(), [entry]));
  };

  function remove(entry){
    this(_.without(this(), entry));
  };

  function size(){
    return this().length;
  };

  function clear(){
    this([]);
  };

  function computeSelect(fun, bind){
    return Snix.computeArray(function(){
      return _.select(this(), fun, bind||{});
    }, this);
  };

  function computePluck(name){
    return Snix.computeArray(function(){
      return _.map(this(), function(e){
        return Snix.unwrap(e[name]);
      });
    }, this);
  };

  function isEmpty(){
    return this.size() == 0;
  };

  function sort(attributeName){
    if(!attributeName)
      throw "missing sort attribute";

    this.sortAsc = !this.sortAsc;

    var self = this;
    this().sort(function(a,b){
      var v1 = Snix.unwrap((self.sortAsc ? a : b)[attributeName]);
      var v2 = Snix.unwrap((self.sortAsc ? b : a)[attributeName]);
      return ((v1 == v2) ? 0 : ((v1 < v2) ? -1 : 1));
    });

    this(_.clone(this()));
  };

  function convert(val){
    if(!_.isArray(val))
      throw "not an array";

    return val;
  };

  var proto = {
    add: add,
    remove: remove,
    size: size,
    clear: clear,
    isEmpty: isEmpty,
    sort: sort,
    convert: convert,
    computeSelect: computeSelect,
    computePluck: computePluck
  };

  Snix.array = function(value){
    value = arguments.length > 0 ? value : [];

    if(!_.isArray(value))
      throw "not an array";

    var v = this.shell(value);
    v.sortAsc = false;

    return _.extend(v, proto);
  };


})();

// rerun

(function(){
  var ReRun = function(fun, bind){
    this.fun = fun;
    this.bind = bind;
    this.dependencies = [];
    this.runFun = function(){
      this.run();
    };
  };
  ReRun.prototype.run = function(){
    var prev = ReRun.current;

    _.invoke(this.dependencies, "off", "change", this.runFun);
    this.dependencies = [];

    ReRun.current = this;
    try{
      return this.fun.apply(this.bind||this, [this]);
    }finally{
      ReRun.current = prev;
      this.dependencies = _.uniq(this.dependencies);
      _.invoke(this.dependencies, "on", "change", this.runFun, this);
    }
  };

  ReRun.prototype.stop = function(){
    _.invoke(this.dependencies, "off", "change", this.runFun);
    this.fun = null;
    this.bind = null;
    this.dependencies = [];
  };

  ReRun.current = null;

  ReRun.track = function(dependency){
    if(this.current)
      this.current.dependencies.push(dependency);
  };

  Snix.ReRun = ReRun;  
})();

// compute

(function(){

  var baseCompute = function(typeFun, fun, bind){
    var value = typeFun.apply(Snix);

    var initialized = false;

    var rr = new Snix.ReRun(function(){
      initialized = true;
      value(fun.apply(bind||{}));
    });

    var origGet = value.get;

    value.get = function(){
      if(!initialized)
        this.refresh();

      return origGet.apply(this);
    };

    value.refresh = function(){
      rr.run();
    };

    return value;
  };

  Snix.compute = function(fun, bind){
    return baseCompute(Snix.shell, fun, bind);
  };

  Snix.computeArray = function(fun, bind){
    return baseCompute(Snix.array, fun, bind);
  };

})();


// binder

(function(){

  if(typeof(jQuery) != "undefined"){
    var oldClean = jQuery.cleanData;

    jQuery.cleanData = function(elems){
      for (var i=0, elem; (elem = elems[i]) !== undefined; i++){
        jQuery(elem).triggerHandler("destroyed");
      }
      oldClean(elems);
    };
  }

  var parse = function(str){
    return _.map(str.split(";"), function(s){
      var idx = s.indexOf(":");

      var key = s.substring(0, idx).replace(/\s/g, "");
      var val = s.substring(idx+1,s.length).replace(/^(\s)*/g, "");

      return [key, val];
    });
  };

  Snix.accessor = function(expr, context, vars){
    expr = expr.replace(/@/g, "this.");

    var readerKeys = _.keys(vars);
    var readerExpr = "return " + expr;

    var reader = new Function(readerKeys, readerExpr);

    var writerKeys = _.keys(vars).concat(["value"]);
    var writerExpr = "(" + expr + ")(value);";

    var writer = new Function(writerKeys, writerExpr);

    return function(){
      try{
        if(arguments.length == 0) return reader.apply(context, _.values(vars));
        else                      return writer.apply(context, _.values(vars).concat([arguments[0]]));
      }catch(e){
        if(window.console)
          window.console.error(e, expr, context, vars);
        throw "expr: " + expr + ", err: " + e;
      }
    };
  };

  Snix.binder = function(el, context, vars){
    var bindingAttr = $(el).attr("data-bind");

    if(bindingAttr == null){
      $(el).children().each(function(){
        Snix.binder(this, context, vars);
      });
    }else{
      var bindingsArr = parse(bindingAttr);

      _.each(bindingsArr, function(arr){
        var bindingName     = arr[0], 
            bindingExpr     = arr[1];

        new this.Bindings[bindingName](el, bindingExpr, context, vars);
      }, this);
    }
  };

})();

// bindings

(function(){

  var Bindings = {};

  var create = function(impl, skipChildren){
    return function(el, expr, context, vars){
      var acc = Snix.accessor(expr, context, vars);

      var bind = {};

      if(impl.init)
        impl.init.apply(bind, [el, acc, vars, context]);

      if(impl.update){
        var rr = new Snix.ReRun(function(){
          impl.update.apply(bind, [el, acc, vars, context]);
        });

        $(el).on("destroyed", function(){
          rr.stop();
        });

        rr.run();        
      }

      if(!skipChildren)
        $(el).children().each(function(){
          Snix.binder(this, context, vars);
        });
    };
  };

  Bindings["text"] = create({
    update: function(el, acc){
      $(el).text(Snix.unwrap(acc()));
    }
  });

  Bindings["click"] = create({
    init: function(el, acc){
      $(el).on("click", function(e){
        e.preventDefault();
        acc();
        return false;
      });
    }
  });

  Bindings["value"] = create({
    init: function(el, acc){
      $(el).on("change", function(){
        acc($(this).val());
      });
    },
    update: function(el, acc){
      $(el).val(Snix.unwrap(acc()));
    }
  });

  Bindings["loop"] = create({
    init: function(el, acc){
      this.tpl = $(el).html();
      $(el).empty();
    },
    update: function(el, acc, vars, context){
      var opts = acc();

      var entries = Snix.unwrap(opts.entries);
      var entryIds = _.map(entries, function(e){ return Snix.idOf(e); });

      var elIds = $("> [data-id]", el).map(function(){ return $(this).attr("data-id"); }).toArray();

      if(elIds.length == entryIds.length && elIds.join(",") != entryIds.join(","))
        $(el).empty();

      $("> [data-id]", el).filter(function(e){
        var id = $(el).attr("data-id");
        return !_.include(entryIds, id);
      }).remove();

      _.each(entries, function(e, idx){
        var id = Snix.idOf(e);

        if($("> [data-id='"+id+"']", el).length == 0){
          var child = $(this.tpl).attr("data-id", id).appendTo(el);

          var newVars = _.clone(vars);
          newVars[Snix.unwrap(opts.as||"entry")] = e;
          newVars[Snix.unwrap(opts.as||"entry")+"Idx"] = idx;
          newVars[Snix.unwrap(opts.as||"entry")+"No"] = idx+1;

          Snix.binder(child, context, newVars);
        }
      }, this);
    }
  }, true);

  Bindings["on"] = create({
    init: function(el, acc){
      var opts = Snix.unwrap(accessor());

      for(var key in opts){
        $(el).on(key, function(e){
          e.preventDefault();
          opts[key]();
          return false;
        });
      }      
    }
  });

  Bindings["check"] = create({
    init: function(el, acc){
      $(el).on("change", function(){
        acc($(el).is(":checked"));
      });
    },
    update: function(el, acc){
      if(Snix.unwrap(acc()))  $(el).attr("checked", "checked");
      else                    $(el).removeAttr("checked");
    }
  });

  Bindings["css"] = create({
    update: function(el, acc){
      var opts = Snix.unwrap(acc());
      for(var key in opts){
        if(Snix.unwrap(opts[key]))  $(el).addClass(key);
        else                        $(el).removeClass(key);
      }
    }
  });

  Bindings["style"] = create({
    update: function(el, acc){
      var opts = Snix.unwrap(acc());

      for(var key in opts){
        var val = Snix.unwrap(opts[key]);
        if(val)   $(el).css(key, val);
        else      $(el).css(key, "");
      }
    }
  });

  Bindings["radio"] = create({
    init: function(el, acc){
      var opts = acc();

      $(el).on("change", function(){
        var opts = acc();
        var selectedId = $(this).attr("data-id");
        opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
      });

      $(el).attr("data-id", Snix.idOf(opts.entry));
    },
    update: function(el, acc){
      var selected = Snix.unwrap(acc().selected);
      var form = $(el).parents("form");

      if(form.length == 0)
        throw "no <form> found";

      if(selected)  form.find("input[name='"+$(el).attr("name")+"'][data-id='"+Snix.idOf(selected)+"']").attr("checked", "checked");
      else          form.find("input[name='"+$(el).attr("name")+"']").removeAttr("checked");
    }
  });

  Bindings["radioset"] = create({
    init: function(el, acc){
      var opts = acc();

      $(el).addClass("snix").addClass("radioset");

      this.tpl = "<ul>";
      var name = "snix_"+_.uniqueId();

      _.each(Snix.unwrap(opts.entries), function(e){
        this.tpl += "<li>";
        this.tpl += "<input type='radio' name='"+name+"' data-bind=\"radio: {entries: entries, selected: selected, entry: entries('"+e.toString()+"')}\" />";
        this.tpl += "<label>"+e.toString()+"</label>";
        this.tpl += "</li>";
      }, this);

      this.tpl += "</ul>";
    },
    update: function(el, acc, vars, context){
      var opts = acc();
      $(el).empty();

      var child = $(this.tpl);
      child.appendTo(el);

      var newVars = _.clone(vars);
      newVars["entries"] = opts.entries;
      newVars["selected"] = opts.selected;

      Snix.binder(child, context, newVars);
    }
  }, true);

  Bindings["toggle"] = create({
    init: function(el, acc){
      this.tpl = $(el).html();
    },
    update: function(el, acc, vars, context){
      var visible = Snix.unwrap(acc());
      if(visible){
        $(el).empty().show();

        var child = $(this.tpl);
        child.appendTo(el);

        Snix.binder(child, context, vars);
      }else{
        $(el).hide().empty();
      }
    }
  }, true);

  Bindings["visible"] = create({
    update: function(el, acc, vars, context){
      $(el).toggle(Snix.unwrap(acc()));
    }
  });

  Bindings["hidden"] = create({
    update: function(el, acc, vars, context){
      $(el).toggle(!Snix.unwrap(acc()));
    }
  });

  Bindings["error"] = create({
    update: function(el, acc){
      var field = Snix.unwrap(accessor());
      
      if(field.isInvalid())   $(el).addClass("error");
      else                    $(el).removeClass("error");
    }
  });

  Bindings["html"] = create({
    update: function(el, acc){
      $(el).html(Snix.unwrap(acc()));
    }
  });

  Bindings["date"] = create({
    init: function(el, acc){
      var opts = Snix.unwrap(acc());
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
          var opts = Snix.unwrap(acc());

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
    update: function(el, acc){
      var opts = Snix.unwrap(acc());
      var mom = Snix.unwrap(opts.moment);

      if(mom){
        $("select.year option[value='"+mom.year()+"']", el).attr("selected", "selected");
        $("select.month option[value='"+(mom.month()+1)+"']", el).attr("selected", "selected");
        $("select.day option[value='"+mom.date()+"']", el).attr("selected", "selected");
      }else{
        $("select option[value='-1']", el).attr("selected", "selected");
      }
    }
  });

  Bindings["datetime"] = create({
    init: function(el, acc){
      var opts = Snix.unwrap(acc());
      opts.caption = opts.caption || {year: "Year", month: "Month", day: "Day", hour: "hh", minute: "mm"};

      $(el).empty();

      var now = moment();
      var entries = [
        ["year", now.year() - 80, now.year() + 10, opts.caption.year], 
        ["month", 1, 12, opts.caption.month], 
        ["day", 1, 31, opts.caption.day],
        ["hour", 0, 23, opts.caption.hour],
        ["minute", 0, 59, opts.caption.minute]
      ];

      _.each(entries, function(entry){
        var select = $("<select class='"+entry[0]+"'></select>");
        select.append("<option value='-1'>"+entry[3]+"</option>");

        for(var i=entry[1]; i<=entry[2]; i++){
          var label = (i < 10) ? ("0"+i) : i;
          $("<option value="+i+">"+label+"</option>").appendTo(select);
        }
        select.appendTo(el);

        $(select).on("change", function(){

          var opts = Snix.unwrap(acc());

          var year = parseInt($("select.year option:selected", el).val(), 10);
          var month = parseInt($("select.month option:selected", el).val(), 10);
          var day = parseInt($("select.day option:selected", el).val(), 10);
          var hour = parseInt($("select.hour option:selected", el).val(), 10);
          var minute = parseInt($("select.minute option:selected", el).val(), 10);

          if(year != -1 && month != -1 && day != -1 && hour != -1 && minute != -1){
            opts.moment(moment(new Date(year, month-1, day, hour, minute)));
          }else{
            if(Snix.unwrap(opts.moment)){
              $("select option[value='-1']", el).attr("selected", "selected");
              opts.moment(null);
            }
          }
        });
      });
    },
    update: function(el, acc){
      var opts = Snix.unwrap(acc());
      var mom = Snix.unwrap(opts.moment);

      if(mom){
        $("select.year option[value='"+mom.year()+"']", el).attr("selected", "selected");
        $("select.month option[value='"+(mom.month()+1)+"']", el).attr("selected", "selected");
        $("select.day option[value='"+mom.date()+"']", el).attr("selected", "selected");
        $("select.hour option[value='"+mom.hours()+"']", el).attr("selected", "selected");
        $("select.minute option[value='"+mom.minutes()+"']", el).attr("selected", "selected");
      }else{
        $("select option[value='-1']", el).attr("selected", "selected");
      }
    }
  });

  Bindings["select"] = create({
    init: function(el, acc){
      var opts = acc();

      if(opts.multiple)
        $(el).attr("multiple", "multiple");

      $(el).on("change", function(){
        var opts = acc();

        if(opts.multiple){
          var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

          if(selectedIds.length == 0)   opts.selected([]);
          else                          opts.selected(_.select(Snix.unwrap(opts.entries), function(e){ return _.include(selectedIds, Snix.idOf(e)); }));
        }else{
          var selectedId = $("option:selected", el).attr("value");

          if(selectedId == "-1")  opts.selected(null);
          else                    opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
        }

      });
    },
    update: function(el, acc){
      var opts = acc();
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

      if(opts.multiple){ // array
        if(selected) 
          _.each(selected, function(e){
            $("option[value='"+Snix.idOf(e)+"']", el).attr("selected", "selected");
          });
      }else{ // object
        if(selected)  $("option[value='"+Snix.idOf(selected)+"']", el).attr("selected", "selected");
        else          $("option[value='-1']", el).attr("selected", "selected");
      }

    }
  });

  Snix.Bindings = Bindings;

})();

// validator

(function(){

  Validator = function(){
    this.entries = Snix.shell({});
  };

  Validator.prototype.clear = function(){
    this.entries({});
  };

  Validator.prototype.validate = function(rules, context){
    var entries = {};
    for(var key in rules){
      if(!rules[key].apply(context, [key]))
        entries[key] = true;
    }
    this.entries(entries);

    return this.isEmpty();
  };

  Validator.prototype.field = function(key){
    var self = this;
    return {
      isInvalid: function(){
        return self.isInvalid(key);
      }
    };
  };

  Validator.prototype.isInvalid = function(key){
    return this.entries()[key] == true;
  };

  Validator.prototype.isEmpty = function(){
    return _.size(this.entries()) == 0;
  };

  Snix.Validator = Validator;

})();