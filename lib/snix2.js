var Snix = {};

Snix.idOf = function(any){
  if(any == null)
    throw "illegal argument";

  return ((typeof(any) == "string" || typeof(any) == "number") ? any : Snix.unwrap(any.id)).toString();
};

Snix.val = function(initial){

  var listener = {
    read: [],
    change: []
  };

  var f = function(){
    if(arguments.length > 0){
      var newValue = f.convert(arguments[0]);
      if(newValue !== f.value){
        var oldValue = f.value;
        f.value = newValue;
        _.invoke(listener.change, "apply", this, [newValue, oldValue]);
      }
      return f;
    } else{
      _.invoke(listener.read, "apply", this, [f.value]);
      return f.value;
    }                     
  };

  f.value = (arguments.length > 0 ? initial : null);

  f.on = function(event, fun, context){
    listener[event].push(_.bind(fun, context||this));
    return this;
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
    var opts = accessor();
    var entries = Snix.unwrap(opts.entries);

    var ids = _.map(entries, function(e){ 
      var id = Snix.idOf(e);

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
      var entry = _.detect(entries, function(e){ return Snix.idOf(e) == id; });
      var child = null;

      if(!_.include(elIds, id)){
        // create dom elements
        child = $($(el).attr("data-loop"));
        child.attr("data-id", id);
        child.appendTo(el);
      }else{
        child = $("> [data-id='"+id+"']", el)[0];
      }

      var newVars = _.defaults({}, this.vars);
      newVars[opts.as] = entry;

      Snix.bind(child, this.context, newVars);
    }, this);
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
    $(el).toggle(Snix.unwrap(accessor()) == true);
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
  var v = Snix.val();

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var lastUrl = null;

  var load = function(url){
    lastUrl = url;
    $.getJSON(url).success(function(data){
      v(valueFun(data));
      Snix.refresh(context);
    });
  };

  v.on("read", function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url !== null && url !== lastUrl)
      load(url);
  });

  v.reload = function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url !== null)
      load(url);
  };

  return v;
};

Snix.remoteArray = function(urlFun, valueFun, context){
  var v = Snix.array();

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var lastUrl = null;

  var load = function(url){
    lastUrl = url;
    $.getJSON(url).success(function(data){
      v(_.map(data, valueFun));
      Snix.refresh(context);
    });
  };

  v.on("read", function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url !== null && url !== lastUrl)
      load(url);
  });

  v.reload = function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url !== null)
      load(url);
  };

  return v;
};


Snix.Record = function(baseUrl, attributes){
  var hasManyEntries = {};

  var RecordFun = function(data, parent){
    this.id = s.val();

    this.canCreate = function(){
      return this.id() == null;
    };

    this.canSave = function(){
      return this.id() != null;
    };

    this.canDelete = function(){
      return this.id() != null;
    };

    this.url = function(){
      return (parent != null ? parent.url() : "") + baseUrl + "/" + this.id();
    };

    this.urlCreate = function(){
      return (parent != null ? parent.url() : "") + baseUrl;
    };

    var listener = {
      create: [],
      save: [],
      destroy: []
    };  

    this.on = function(op, fun, context){
      listener[op].push(_.bind(fun, context||this));
    };

    var attributeNames = _.keys(attributes);

    this.destroy = function(){
      var ajax = $.ajax({
        type: "POST", 
        url: this.url(),
        data: {_method: "DELETE"}
      }).success(function(){ 
        _.invoke(listener["destroy"], "call", null); 
      }).error(function(err){ alert(err); });

      return this;
    };

    this.save = function(){
      var data = JSON.stringify(_.pick(this, attributeNames));
      var ajax = $.ajax({
        type: "POST", 
        url: this.url(), 
        data: {data: data, _method: "PUT"},
        dataType: "json"
      }).success(function(){ 
        _.invoke(listener["save"], "call", null); 
      }).error(function(err){ alert(err); });

      return this;
    };

    this.create = function(){
      var self = this;

      var data = JSON.stringify(_.pick(this, attributeNames));
      var ajax = $.ajax({
        type: "POST", 
        url: url, 
        data: data, 
        dataType: "json"
      }).success(function(res){ 
        self.id(res["id"]); 
        _.invoke(listener["create"], "call", null);
      }, this).error(function(err){ alert(err); });

      return this;
    };


    data = data || {};

    if(data.id)
      this.id(data.id);

    for(var key in attributes){
      var arr = attributes[key];
      var val = data[key] === undefined ? arr[1] : data[key];

      if(val != null && arr[2])
        val = arr[2].apply(val, [val]);

      this[key] = arr[0](val);
    }

    for(var key in hasManyEntries){
      var ManyRecordFun = hasManyEntries[key];

      this[key] = s.array();

      var self = this;
      this[key].load = function(){
        $.getJSON(self.url() + ManyRecordFun.baseUrl).success(function(data){
          self[key](_.map(data, function(e){ return new ManyRecordFun(e, self); }));
        }, this).error(function(err){ alert("err: " + err); });
        return this;
      };

      this[key].reload = function(){
        this([]);
        return this.load();
      };
    }
  };

  RecordFun.all = function(lazy){
    var res = s.array();

    res.load = function(){
      var self = this;
      $.getJSON(baseUrl).success(function(data){
        self(_.map(data, function(e){ return new RecordFun(e); }));
      }).error(function(err){ alert("err: " + err); });
      return this;
    };

    res.reload = function(){
      this([]);
      return this.load();
    };

    if(!lazy)
      res.load();

    return res;
  };

  RecordFun.find = function(id){
    var res = s.val();

    res.load = function(){
      var self = this;
      $.getJSON(baseUrl).success(function(data){
        self(new RecordFun(data));
      }).error(function(err){ alert("err: " + err); });
      return this;
    }

    res.reload = function(){
      this(null);
      return this.load();
    };

    res.load();

    return res;
  };

  RecordFun.hasMany = function(name, RecordFun){
    hasManyEntries[name] = RecordFun;
  };

  // RecordFun.hasOne = function(name, RecordFun){
  //   hasManyEntries[name] = RecordFun;
  // };

  RecordFun.baseUrl = baseUrl;

  return RecordFun;
};