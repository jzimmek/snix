// --------------------------------
// Snix.Binding
// --------------------------------


Snix.Binding = {};


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
      if(window.console)
        window.console.error(e, expr, context, vars);
      throw "expr: " + expr + ", err: " + e;
    }
  };
};

Snix.Binding.binden = function(context, el, vars){
  vars = _.extend({}, window, arguments.length > 2 ? vars : {});

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
            return null;
          }, this);

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

Snix.Bindings["style"] = {
  update: function(el, accessor){
    var opts = Snix.unwrap(accessor());

    for(var key in opts){
      if(opts[key]) $(el).css(key, opts[key]);
      else          $(el).css(key, "");
    }
  }
};

Snix.Bindings["error"] = {
  update: function(el, accessor){
    var field = Snix.unwrap(accessor());
    if(field.isInvalid())   $(el).addClass("error");
    else                    $(el).removeClass("error");
  }
};

(function(){

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

  Snix.Bindings["datetime"] = {
    init: function(el, accessor){
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

})();



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
      if(!_.include(elIds, id)){
        // create dom elements
        var entry = _.detect(entries, function(e){ return Snix.idOf(e) == id; });

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

Snix.Bindings["radioset"] = {
  init: function(el, accessor){
    var opts = accessor();

    $(el).addClass("snix").addClass("radioset");

    this.tpl = "<ul>";
    var name = "snix_"+_.uniqueId();

    _.each(opts.entries(), function(e){
      this.tpl += "<li>";
      this.tpl += "<input type='radio' name='"+name+"' data-bind=\"radio: {entries: entries(), selected: selected, entry: entries('"+e.toString()+"')}\" />";
      this.tpl += "<label>"+e.toString()+"</label>";
      this.tpl += "</li>";
    }, this);

    this.tpl += "</ul>";
  },
  update: function(el, accessor){
    var opts = accessor();
    $(el).empty()

    var child = $(this.tpl);
    child.appendTo(el);

    var newVars = _.defaults({}, this.vars);
    newVars["entries"] = opts.entries;
    newVars["selected"] = opts.selected;

    Snix.call(function(){
      Snix.Binding.binden(this.context, child, newVars);
    }, null, this);    
  }
};

//##Select##
//
// The Select-binding manages the select element, creates the appropriate option elements for the data model, an empty "please choose" option which is selected by default and when the user chooses an option, this will be set in the data model.
//
//###Example###
//
// var app = {<br/>
// todos: Snix.array([<br/>
// &nbsp;&nbsp;{id: 1, name: 'todo1'},<br/>
// &nbsp;&nbsp;{id: 2, name: 'todo2'},<br/>
// &nbsp;&nbsp;{id: 3, name: 'todo3'}<br/>
// ]),<br/>
// selectedTodo: Snix.val(null)<br/>
// };
//
// &lt;select data-bind="select: {entries: @todos, label: 'name', caption: 'Please choose a todo', selected: @selectedTodo}"&gt;&lt;/select&gt;
Snix.Bindings["select"] = {
  init: function(el, accessor){
    var opts = accessor();

    if(opts.multiple)
      $(el).attr("multiple", "multiple");

    $(el).on("change", function(){
      // var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

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

//##Text##
//
// The Text-binding sets the text attribute of the element to the underlying value of the data model.
//
//###Example###
//
// var app = {name: Snix.val("joe")};
//
// &lt;span data-bind="text: @name"&gt;&lt;/span&gt;
Snix.Bindings["text"] = {
  update: function(el, accessor){
    $(el).text(Snix.unwrap(accessor()));
  }
};

Snix.Bindings["html"] = {
  update: function(el, accessor){
    $(el).html(Snix.unwrap(accessor()));
  }
};

Snix.Bindings["on"] = {
  init: function(el, accessor){
    var events = accessor();
    var self = this;

    for(var key in events){
      $(el).on(key, function(){
        events[key].apply(self.context, [this]);
      });
    }
  }
};

//##Toggle##
//
// The Toggle-binding will toggle the element. Shows it if the value in data model is truthy, hides it otherwise. On hide the children of the element will be removed and recreated on show.
//
//###Example###
//
// var app = {complete: Snix.boolean(true)};
//
// &lt;div data-bind="toggle: @complete() == true"&gt;&lt;span&gt;hello from snix&lt;/span&gt;&lt;/div&gt;
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
        Snix.Binding.binden(this.context, child, newVars);
      }, null, this);
    }else{
      $(el).hide().empty();
    }
  }
};

Snix.Bindings["visible"] = {
  update: function(el, accessor){
    $(el).toggle(Snix.unwrap(accessor()) == true);
  }
};

Snix.Bindings["upload"] = {
  init: function(el, accessor){
    var opts = accessor();

    $(el)
      .attr("name", "file")
      .attr("data-url", Snix.unwrap(opts.url))
      .fileupload({
        dataType: "json",
        done: (opts.done || (function(){}))
      });
  }
};

//##Value##
//
// The Value-binding sets the value attribute of the element to the underlying value of the data model. Changing the elements value will update the data model as well.
//
//###Example###
//
// var app = {name: Snix.val("joe")};
//
// &lt;input type="text" data-bind="value: @name"/&gt;
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