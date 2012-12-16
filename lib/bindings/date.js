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