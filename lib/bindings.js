(function(){
  Snix.Bindings = {};

  Snix.Bindings["loop"] = {
    init: function(el, accessor){    
      $(el).attr("data-loop", $(el).html()).empty();
    },
    update: function(el, accessor){
      $(el).empty();

      var opts = accessor();
      var entries = Snix.unwrap(opts.entries);

      _.each(entries, function(e){
        $($(el).attr("data-loop")).attr("data-id", Snix.idOf(e)).appendTo(el);
      });

      var self = this;

      $(el).children().each(function(idx, child){
        var entry = _.detect(entries, function(e){ return Snix.idOf(e) == $(child).attr("data-id"); });

        var newVars = _.extend({}, self.vars);
        newVars[opts.as] = entry;
        newVars[opts.as+"Idx"] = idx;
        newVars[opts.as+"No"] = idx+1;

        Snix.bind(child, self.context, newVars);
      });

    }
  };

  Snix.Bindings["text"] = {
    update: function(el, accessor){
      $(el).text(Snix.unwrap(accessor()));
    }
  };

  Snix.Bindings["log"] = {
    update: function(el, accessor){
      console.info("log: ", accessor());
      this.bindChildren();
    }
  };

  Snix.Bindings["on"] = {
    init: function(el, accessor, refreshFun){
      var opts = Snix.unwrap(accessor());

      for(var key in opts){
        $(el).on(key, function(e){
          return refreshFun(function(){
            e.preventDefault();
            opts[key]();
            return false;
          }, this)
        });
      }
    },
    update: function(el, accessor){
      this.bindChildren();
    }
  };

  Snix.Bindings["click"] = {
    init: function(el, accessor, refreshFun){
      $(el).on("click", function(e){
        return refreshFun(function(){
          e.preventDefault();
          accessor();

          return false;
        }, this);
      });
    }
  };

  Snix.Bindings["check"] = {
    init: function(el, accessor, refreshFun){
      $(el).on("change", function(){
        return refreshFun(function(){
          accessor($(el).is(":checked"));
        }, this);
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
    init: function(el, accessor, refreshFun){
      var opts = accessor();
      $(el).on("change", function(){
        refreshFun(function(){
          var opts = accessor();
          var selectedId = $(this).attr("data-id");
          opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
        }, this);
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
    init: function(el, accessor, refreshFun){
      var opts = accessor();

      if(opts.multiple)
        $(el).attr("multiple", "multiple");

      $(el).on("change", function(){
        refreshFun(function(){
          var opts = accessor();

          if(opts.multiple){
            var selectedIds = _.map($("option:selected", el).toArray(), function(e){ return $(e).attr("value"); });

            if(selectedIds.length == 0)   opts.selected([]);
            else                          opts.selected(_.select(Snix.unwrap(opts.entries), function(e){ return _.include(selectedIds, Snix.idOf(e)); }));
          }else{
            var selectedId = $("option:selected", el).attr("value");

            if(selectedId == "-1")  opts.selected(null);
            else                    opts.selected(_.detect(Snix.unwrap(opts.entries), function(e){ return Snix.idOf(e) == selectedId; }));
          }
        }, this);
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

  Snix.Bindings["hidden"] = {
    update: function(el, accessor){
      var hidden = Snix.unwrap(accessor()) == true;
      $(el).toggle(!hidden);

      if(!hidden)
        this.bindChildren();
    }
  };

  Snix.Bindings["radioset"] = {
    init: function(el, accessor, refreshFun){
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
      // var start = new Date().getTime();

      var opts = accessor();
      $(el).empty()

      var child = $($(el).attr("data-radioset"));
      child.appendTo(el);

      var newVars = _.extend({}, this.vars);
      newVars["entries"] = opts.entries;
      newVars["selected"] = opts.selected;
      // var end1 = new Date().getTime();

      Snix.bind(child, this.context, newVars);
      // var end2 = new Date().getTime();
      // console.info("radioset "+(end1-start)+" ms, "+(end2-start)+" ms");
    }
  };

  Snix.Bindings["date"] = {
    init: function(el, accessor, refreshFun){
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
          var opts = Snix.unwrap(accessor());

          var year = parseInt($("select.year option:selected", el).val(), 10);
          var month = parseInt($("select.month option:selected", el).val(), 10);
          var day = parseInt($("select.day option:selected", el).val(), 10);

          if(year != -1 && month != -1 && day != -1){
            refreshFun(function(){
              opts.moment(moment(new Date(year, month-1, day)).startOf('day'));
            }, this);
          }else{
            if(Snix.unwrap(opts.moment)){
              refreshFun(function(){
                $("select option[value='-1']", el).attr("selected", "selected");
                opts.moment(null);
              }, this);
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
    init: function(el, accessor, refreshFun){
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

          var opts = Snix.unwrap(accessor());

          var year = parseInt($("select.year option:selected", el).val(), 10);
          var month = parseInt($("select.month option:selected", el).val(), 10);
          var day = parseInt($("select.day option:selected", el).val(), 10);
          var hour = parseInt($("select.hour option:selected", el).val(), 10);
          var minute = parseInt($("select.minute option:selected", el).val(), 10);

          if(year != -1 && month != -1 && day != -1 && hour != -1 && minute != -1){
            refreshFun(function(){
              opts.moment(moment(new Date(year, month-1, day, hour, minute)));
            }, this);
          }else{
            if(Snix.unwrap(opts.moment)){
              refreshFun(function(){
                $("select option[value='-1']", el).attr("selected", "selected");
                opts.moment(null);
              }, this);
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

  Snix.Bindings["attr"] = {
    update: function(el, accessor){
      var opts = Snix.unwrap(accessor());

      for(var key in opts){
        if(Snix.unwrap(opts[key]))  $(el).attr(key, Snix.unwrap(opts[key]));
        else                        $(el).removeAttr(key);
      }
      this.bindChildren();
    }
  };

  Snix.Bindings["value"] = {
    init: function(el, accessor, refreshFun){
      $(el).on("change", function(){
        refreshFun(function(){
          accessor($(this).val());
        }, this);
      });
    },
    update: function(el, accessor){
      $(el).val(Snix.unwrap(accessor()));
    }
  };
})();
