Snix.Value = function(initial){
  this.value = initial;
  this.dependants = [];
  this.isDisposed = false;
  this.subscriptions = [];
};
Snix.Value.prototype.get = function(){
  this.trackCaller();
  return this.value;
};
Snix.Value.prototype.set = function(newValue){
  if(this.value !== newValue){
    this.value = newValue;
    this.dependants = _.reject(this.dependants, function(e){ return e.isDisposed; });
    _.invoke(this.dependants, "evalValue");
  }
};
Snix.Value.prototype.trackCaller = function(){
  if(Snix.__caller__ != null && !_.include(this.dependants, Snix.__caller__))
    this.dependants.push(Snix.__caller__);
};
Snix.Value.prototype.fun = function(){
  if(arguments.length == 0)   return this.get();
  else                        this.set(arguments[0]);
};

Snix.Value.prototype.dispose = function(nullValue){
  this.isDisposed = true;
  if(nullValue)
    this.value = null;
};

Snix.Value.prototype.notifySubscriber = function(){
  _.each(this.subscriptions, function(arr){
    arr[0].apply(arr[1]);
  });
};

Snix.Value.prototype.subscribe = function(subscriber, context){
  this.subscriptions.push([subscriber, context||this]);
};

Snix.Value.prototype.unsubscribe = function(subscriber){
  this.subscriptions = _.reject(this.subscriptions, function(e){ return e[0] === subscriber; });
};

Snix.Value.prototype.boundFun = function(){
  var bound = _.bind(this.fun, this);
  bound.dispose = _.bind(this.dispose, this);
  bound.__Snix__ = true;
  bound.tap = _.bind(function(fun){
    fun.apply(bound);
    return bound;
  }, this);

  return bound;
};