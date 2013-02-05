Snix.Validator = function(){
  this.entries = Snix.val({});
};

Snix.Validator.prototype.clear = function(){
  this.entries({});
};

Snix.Validator.prototype.validate = function(rules, context){
  var entries = {};
  for(var key in rules){
    if(!rules[key].apply(context, [key]))
      entries[key] = true;
  }
  this.entries(entries);

  return this.isEmpty();
};

Snix.Validator.prototype.field = function(key){
  var self = this;
  return {
    isInvalid: function(){
      return self.isInvalid(key);
    }
  };
};

Snix.Validator.prototype.isInvalid = function(key){
  return this.entries()[key] == true;
};

Snix.Validator.prototype.isEmpty = function(){
  return _.size(this.entries()) == 0;
};