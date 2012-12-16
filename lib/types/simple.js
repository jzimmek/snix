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