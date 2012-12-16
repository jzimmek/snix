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