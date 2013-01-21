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
    try{
      if(arguments.length == 0)   return new Function(_.keys(vars), "return " + expr).apply(context, _.values(vars));
      else                        return new Function(_.keys(vars).concat(["value"]), expr + "(value);").apply(context, _.values(vars).concat([arguments[0]]));
    }catch(e){
      if(window.console)
        window.console.error(e, expr, context, vars);
      throw "expr: " + expr + ", err: " + e;
    }
  };
};

Snix.Bindings = {};

Snix.Bindings["loop"] = {
  init: function(el, accessor){    
    $(el).attr("data-loop", $(el).html()).empty();
  },
  update: function(el, accessor){
    $(el).empty();

    var opts = accessor();
    var entries = Snix.unwrap(opts.entries);

    var html = _.map(entries, function(){
      return $(el).attr("data-loop");
    }).join("\n");

    $(el).html(html);

    var self = this;

    $(el).children().each(function(idx, child){
      var entry = entries[idx];
      $(child).attr("data-id", Snix.unwrap(entry.id));

      var newVars = _.defaults({}, self.vars);
      newVars[opts.as] = entry;

      Snix.bind(child, self.context, newVars);
    });

  }
};

Snix.Bindings["text"] = {
  update: function(el, accessor){
    $(el).text(Snix.unwrap(accessor()));
  }
};

Snix.Bindings["click"] = {
  init: function(el, accessor, refresh){
    $(el).on("click", function(){
      accessor();
      refresh();
    });
  }
};

Snix.Bindings["check"] = {
  init: function(el, accessor, refresh){
    $(el).on("change", function(){
      accessor($(el).is(":checked"));
      refresh();
    });
  },
  update: function(el, accessor){
    if(Snix.unwrap(accessor()))   $(el).attr("checked", "checked");
    else                          $(el).removeAttr("checked");
  }
};

Snix.Bindings["css"] = {
  update: function(el, accessor){
    var opts = Snix.unwrap(accessor());

    for(var key in opts){
      if(Snix.unwrap(opts[key]))  $(el).addClass(key);
      else                        $(el).removeClass(key);
    }

    this.bindChildren();
  }
};

Snix.Bindings["style"] = {
  update: function(el, accessor){
    var opts = Snix.unwrap(accessor());

    for(var key in opts){
      var val = Snix.unwrap(opts[key]);
      if(val)   $(el).css(key, val);
      else      $(el).css(key, "");
    }

    this.bindChildren();
  }
};

Snix.Bindings["radio"] = {
  init: function(el, accessor, refresh){
    var opts = accessor();

    $(el).on("change", function(){
      var selectedId = $(this).attr("data-id");
      opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
      refresh();
    });

    $(el).attr("data-id", Snix.idOf(opts.entry));
  },
  update: function(el, accessor){
    var opts = accessor();
    var selected = Snix.unwrap(opts.selected);

    if(selected)  $(el).parents("form").find("input[name='"+$(el).attr("name")+"'][data-id='"+Snix.idOf(selected)+"']").attr("checked", "checked");
    else          $(el).parents("form").find("input[name='"+$(el).attr("name")+"']").removeAttr("checked");
  }
};

Snix.Bindings["select"] = {
  init: function(el, accessor, refresh){
    var opts = accessor();

    if(opts.multiple)
      $(el).attr("multiple", "multiple");

    $(el).on("change", function(){

      opts = accessor();

      if(opts.multiple){
        var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

        if(selectedIds.length == 0)   opts.selected([]);
        else                          opts.selected(_.select(Snix.unwrap(opts.entries), function(e){ return _.include(selectedIds, Snix.idOf(e)); }));
      }else{
        var selectedId = $("option:selected", el).attr("value");

        if(selectedId == "-1")  opts.selected(null);
        else                    opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
      }

      refresh();
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
};

Snix.Bindings["toggle"] = {
  init: function(el, accessor){
    $(el).attr("data-toggle", $(el).html());
  },
  update: function(el, accessor){
    if(Snix.unwrap(accessor())){
      $(el).empty().show();

      var child = $($(el).attr("data-toggle"));
      child.appendTo(el);

      this.bindChildren();
    }else{
      $(el).hide().empty();
    }
  }
};

Snix.Bindings["visible"] = {
  update: function(el, accessor){
    var visible = Snix.unwrap(accessor()) == true;
    $(el).toggle(visible);

    if(visible)
      this.bindChildren();
  }
};

Snix.Bindings["radioset"] = {
  init: function(el, accessor, refresh){
    var opts = accessor();

    $(el).addClass("snix").addClass("radioset");

    var tpl = "<ul>";
    var name = "snix_"+_.uniqueId();

    _.each(opts.entries(), function(e){
      tpl += "<li>";
      tpl += "<input type='radio' name='"+name+"' data-bind=\"radio: {entries: entries(), selected: selected, entry: entries('"+e.toString()+"')}\" />";
      tpl += "<label>"+e.toString()+"</label>";
      tpl += "</li>";
    });

    tpl += "</ul>";

    $(el).attr("data-radioset", tpl);
  },
  update: function(el, accessor){
    var opts = accessor();
    $(el).empty()

    var child = $($(el).attr("data-radioset"));
    child.appendTo(el);

    var newVars = _.defaults({}, this.vars);
    newVars["entries"] = opts.entries;
    newVars["selected"] = opts.selected;

    Snix.bind(child, this.context, newVars);
  }
};

Snix.Bindings["date"] = {
  init: function(el, accessor, refresh){
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
          refresh();
        }else{
          if(Snix.unwrap(opts.moment)){
            $("select option[value='-1']", el).attr("selected", "selected");
            opts.moment(null);
            refresh();
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

Snix.Bindings["datetime"] = {
  init: function(el, accessor, refresh){
    var opts = Snix.unwrap(accessor());
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

        refresh();
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
      $("select.hour option[value='"+mom.hours()+"']", el).attr("selected", "selected");
      $("select.minute option[value='"+mom.minutes()+"']", el).attr("selected", "selected");
    }else{
      $("select option[value='-1']", el).attr("selected", "selected");
    }
  }
};

Snix.Bindings["error"] = {
  update: function(el, accessor){
    var field = Snix.unwrap(accessor());
    
    if(field.isInvalid())   $(el).addClass("error");
    else                    $(el).removeClass("error");

    this.bindChildren();
  }
};

Snix.Bindings["html"] = {
  update: function(el, accessor){
    $(el).html(Snix.unwrap(accessor()));
    this.bindChildren();
  }
};

Snix.Bindings["value"] = {
  init: function(el, accessor, refresh){
    $(el).on("change", function(){
      accessor($(this).val());
      refresh();
    });
  },
  update: function(el, accessor){
    $(el).val(Snix.unwrap(accessor()));
  }
};

// use only Snix.refresh(context) in application code.
// you should only pass a DOM element as second argument if you what you are doing.
Snix.refresh = function(context, el){
  el = arguments.length > 1 ? el : $("body")[0];
  Snix.bind(el, context);
};

Snix.bind = function(el, context, vars){
  vars = _.extend({}, _.pick(window, _.keys(window)), arguments.length > 2 ? vars : {});
  var bindingAttr = $(el).attr("data-bind");
  if(bindingAttr != null){
      var bindingsArr = Snix.parse(bindingAttr);

      var initialized = $(el).attr("data-bind-init") != null;

      var refresh = function(){
        Snix.refresh(context);
      };

      _.each(bindingsArr, function(arr){
        var bindingName = arr[0], bindingExpr = arr[1];

        var acc = Snix.accessor(bindingExpr, context, vars);
        var binding = Snix.Bindings[bindingName];

        if(!binding)
          throw "unknown binding: "+bindingName + ", " + bindingExpr;

        var bindingContext = {
          context: context, 
          vars: vars,
          bindChildren: function(){
            _.each($(el).children().toArray(), function(e){
              Snix.bind(e, this.context, this.vars);
            }, this);
          }
        };

        if(!initialized && binding.init)    binding.init.apply(bindingContext, [el, acc, refresh]);
        if(binding.update)                  binding.update.apply(bindingContext, [el, acc]);
      });

      $(el).attr("data-bind-init", "true");
  }else{
    _.each($(el).children().toArray(), function(e){
      Snix.bind(e, context, vars);
    })
  }
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

Snix.remote = function(urlFun, valueFun, context){
  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var arr = Snix.compute(function(set){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    $.getJSON(url).success(function(data){
      set(valueFun(data));
      Snix.refresh(context);
    });
  });

  return arr;
};

Snix.remoteArray = function(urlFun, valueFun, context){
  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var arr = Snix.computeArray(function(set){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    $.getJSON(url).success(function(data){
      set(_.map(data, valueFun));
      Snix.refresh(context);
    });
  });

  return arr;
};

Snix.Record = function(baseUrl, attributes){

  var r = function(context, data, parent){
    if(context == null)
      throw "missing context";

    data = data || {};

    this.id = Snix.val(data.id);
    this.validator = Snix.validator();

    this.parent = parent;
    this.context = context;
    this.attributeNames = _.keys(attributes);

    for(var key in attributes){
      var arr = attributes[key];
      var val = data[key] === undefined ? arr[1] : data[key];

      if(val != null && arr[2])
        val = arr[2].apply(val, [val]);

      this[key] = arr[0](val);
    }
  };

  r.errorFun = function(err){
    alert("error");
    if(console && console.error)
      console.error(err);
  };

  Snix.Event.events(r, "load", "save", "create", "duplicate", "destroy");

  r.prototype.canCreate = function(){
    return this.id() == null;
  };

  r.prototype.canSave = function(){
    return this.id() != null;
  };

  r.prototype.canDestroy = function(){
    return this.id() != null;
  };

  r.prototype.canDuplicate = function(){
    return this.id() != null;
  };

  r.prototype.url = function(){
    return (this.parent != null ? this.parent.url() : "") + baseUrl + "/" + this.id();
  };

  r.prototype.createUrl = function(){
    return (this.parent != null ? this.parent.url() : "") + baseUrl;
  };

  r.prototype.saveValidationRules = {};  
  r.prototype.save = function(cb){
    if(!this.canSave())
      throw "illegal state";

    this.validator.validate(this.saveValidationRules, this);

    if(!this.validator.isEmpty())
      return;

    var data = JSON.stringify(_.pick(this, this.attributeNames));
    var ajax = $.ajax({
      type: "POST", 
      url: this.url(), 
      data: {data: data, _method: "PUT"},
      dataType: "json",
      context: this
    }).success(function(data){

      if(data && data.lock_version && this.lock_version)
        this.lock_version(data.lock_version)

      Snix.Event.trigger(r, "save", [this]);

      if(cb)
        cb(this);

      Snix.refresh(this.context);
    }).error(r.errorFun);

    return this;
  };

  r.prototype.duplicate = function(cb){
    if(!this.canDuplicate())
      throw "illegal state";

    var data = JSON.stringify(_.pick(this, this.attributeNames));

    var ajax = $.ajax({
      type: "POST", 
      url: this.url()+"/duplicate", 
      data: data,
      dataType: "json",
      context: this
    }).success(function(data){ 
      if(!data || !data.id)
        throw "received no id for: "+url;

      Snix.Event.trigger(r, "duplicate", [this, data.id]);

      if(cb)
        cb(this, data.id);

      Snix.refresh(this.context);
    }).error(r.errorFun);

    return this;
  };

  r.prototype.destroy = function(cb){
    if(!this.canDestroy())
      throw "illegal state";

    var res = confirm("Delete this ?");

    if(!res)
      return this;

    var ajax = $.ajax({
      type: "POST", 
      url: this.url(), 
      data: {_method: "DELETE"},
      dataType: "json",
      context: this
    }).success(function(){ 
      Snix.Event.trigger(r, "destroy", [this]);

      if(cb)
        cb(this);

      Snix.refresh(this.context);
    }).error(r.errorFun);

    return this;
  };

  r.prototype.createValidationRules = {};
  r.prototype.create = function(cb){
    if(!this.canCreate())
      throw "illegal state";

    this.validator.validate(this.createValidationRules, this);

    if(!this.validator.isEmpty())
      return;

    var data = JSON.stringify(_.pick(this, this.attributeNames));
    var url = this.createUrl();

    var ajax = $.ajax({
      type: "POST", 
      url: url, 
      data: data,
      dataType: "json",
      context: this
    }).success(function(data){ 
      if(!data || !data.id)
        throw "received no id for: "+url;

      this.id(data.id);

      Snix.Event.trigger(r, "create", [this, data.id]);

      if(cb)
        cb(this, data.id);

      Snix.refresh(this.context);
    }).error(r.errorFun);

    return this;
  };

  r.all = function(context){
    var res = Snix.array();

    res.load = function(cb){
      $.getJSON(baseUrl).success(function(data){
        if(!data)
          throw "received no result array for: "+url;

        res(_.map(data, function(e){ return new r(context, e, null); }));

        if(cb)
          cb(res());
        
        Snix.refresh(context);
      }).error(r.errorFun);
      return this;
    };

    return res;
  };

  r.find = function(id, context){
    var res = Snix.val();

    res.load = function(cb){
      var url = baseUrl+"/"+id;
      $.getJSON(url).success(function(data){
        if(!data)
          throw "received no result object for: "+url;

        res(new r(context, data, null));

        if(cb)
          cb(res());

        Snix.refresh(context);
      }).error(r.errorFun);
      return this;
    };

    return res;
  };

  return r;
};

(function(){
  
  var baseCompute = function(v, fun, bind, context){
    var initialized = false;

    v.get = function(){
      if(!initialized){
        initialized = true;
        this.refresh();
      }
      return this.value;
    };

    var origSet = v.set;

    v.set = function(){
      throw "compute not writable";
    };

    v.refresh = function(){
      fun.apply(bind, [this.createSetter()]);
    };

    v.subscribe = function(){
      for(var i=0; i < arguments.length; i++){
        arguments[i].on("change", function(){
          this.refresh();
        }, this);
      }
      return this;
    };

    v.subscribeObject = function(obj){
      for(var i=0; i < arguments.length; i++){
        var obj = arguments[i];
        _.each(_.keys(obj), function(key){
          if(obj[key].__snix__)
            this.subscribe(obj[key]);
        }, this);
      };
      return this;
    };

    v.createSetter = function(){
      return function(newValue){
        origSet.apply(v, [newValue]);
      };
    };

    return v;
  };

  Snix.compute = function(fun, bind, context){
    return baseCompute(Snix.val(), fun, bind, context);
  };

  Snix.computeArray = function(fun, bind, context){
    return baseCompute(Snix.array(), fun, bind, context);
  };

})();


Snix.Filter = function(fields){
  this.fields = fields;
  for(var key in this.fields){
    var type = this.fields[key];

    if(type == "in")                      this[key] = Snix.array();
    else if(type == "like")               this[key] = Snix.val("");
    else if(typeof(type) == "function")   this[key] = Snix.array([]);
    else                                  throw "unsupported "+type;
  }
};
Snix.Filter.prototype.reset = function(){
  for(var key in this.fields){
    var type = this.fields[key];

    if(type == "in")                      this[key]([]);
    else if(type == "like")               this[key]("");
    else if(typeof(type) == "function")   this[key]([]);
  }
};
Snix.Filter.prototype.filter = function(arr){
  return _.select(Snix.unwrap(arr), function(e){
    var valid = true;

    for(var key in this.fields){
      var type = this.fields[key];

      if(type == "in" && this[key]().length > 0){
        var value = Snix.unwrap(e[key]);
        valid = valid && _.include(this[key](), value);
      }else if(type == "like" && this[key]().length > 0){
        var value = Snix.unwrap(e[key]);
        valid = valid && value && value.toString().toLowerCase().indexOf(this[key]().toLowerCase()) >= 0;
      }else if(typeof(type) == "function" && this[key]().length > 0){
        valid = valid && type(this[key](), Snix.unwrap(e));
      }
    }

    return valid;

  }, this);
};
