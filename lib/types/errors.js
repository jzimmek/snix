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
