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
